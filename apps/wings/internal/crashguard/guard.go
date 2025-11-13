package crashguard

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/events"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/mambapanel/wings/internal/mtls"
	"go.uber.org/zap"
)

// RestartPolicy defines how the guard should handle crashes
type RestartPolicy struct {
	MaxAttempts      int
	BackoffBase      time.Duration
	BackoffMultiplier float64
	BackoffMax       time.Duration
}

// DefaultRestartPolicy returns the default restart policy
func DefaultRestartPolicy() RestartPolicy {
	return RestartPolicy{
		MaxAttempts:      5,
		BackoffBase:      2 * time.Second,
		BackoffMultiplier: 2.0,
		BackoffMax:       5 * time.Minute,
	}
}

// containerState tracks restart attempts for a container
type containerState struct {
	serverID       string
	attempts       int
	lastCrash      time.Time
	lastRestart    time.Time
	failed         bool
	consecutiveFails int
}

// Guard monitors containers and restarts them on crash
type Guard struct {
	dockerClient *client.Client
	apiClient    *mtls.APIClient
	logger       *zap.Logger
	nodeID       string
	policy       RestartPolicy

	// State tracking
	states     map[string]*containerState // containerID -> state
	statesLock sync.RWMutex

	// Control
	ctx    context.Context
	cancel context.CancelFunc
}

// NewGuard creates a new crash guard
func NewGuard(dockerClient *client.Client, apiClient *mtls.APIClient, nodeID string, logger *zap.Logger) *Guard {
	ctx, cancel := context.WithCancel(context.Background())

	return &Guard{
		dockerClient: dockerClient,
		apiClient:    apiClient,
		logger:       logger,
		nodeID:       nodeID,
		policy:       DefaultRestartPolicy(),
		states:       make(map[string]*containerState),
		ctx:          ctx,
		cancel:       cancel,
	}
}

// Start begins monitoring container events
func (g *Guard) Start() {
	g.logger.Info("Starting crash guard",
		zap.Int("maxAttempts", g.policy.MaxAttempts),
		zap.Duration("baseBackoff", g.policy.BackoffBase))

	go g.monitorEvents()
}

// Stop stops the crash guard
func (g *Guard) Stop() {
	g.logger.Info("Stopping crash guard")
	g.cancel()
}

// monitorEvents listens for Docker container events
func (g *Guard) monitorEvents() {
	// Create event filter for container events
	eventFilter := filters.NewArgs()
	eventFilter.Add("type", "container")
	eventFilter.Add("event", "die")
	eventFilter.Add("event", "stop")
	eventFilter.Add("event", "start")

	// Listen for events
	eventChan, errChan := g.dockerClient.Events(g.ctx, types.EventsOptions{
		Filters: eventFilter,
	})

	for {
		select {
		case event := <-eventChan:
			g.handleEvent(event)
		case err := <-errChan:
			if err != nil {
				g.logger.Error("Docker event stream error", zap.Error(err))
				// Try to reconnect after a delay
				time.Sleep(5 * time.Second)
				continue
			}
		case <-g.ctx.Done():
			g.logger.Info("Crash guard monitor stopped")
			return
		}
	}
}

// handleEvent processes a container event
func (g *Guard) handleEvent(event events.Message) {
	containerID := event.Actor.ID
	serverID, ok := event.Actor.Attributes["io.mamba.server_id"]
	if !ok {
		// Not a managed server container
		return
	}

	switch event.Action {
	case "die", "stop":
		g.handleContainerDie(containerID, serverID, event)
	case "start":
		g.handleContainerStart(containerID, serverID)
	}
}

// handleContainerDie handles container stop/crash events
func (g *Guard) handleContainerDie(containerID, serverID string, event events.Message) {
	// Check exit code
	exitCode := event.Actor.Attributes["exitCode"]

	g.logger.Info("Container stopped",
		zap.String("serverID", serverID),
		zap.String("containerID", containerID[:12]),
		zap.String("exitCode", exitCode))

	// Exit code 0 is normal shutdown, don't restart
	if exitCode == "0" {
		g.logger.Debug("Container exited normally, not restarting", zap.String("serverID", serverID))
		return
	}

	// Check if container should be restarted
	g.statesLock.Lock()
	state, exists := g.states[containerID]
	if !exists {
		state = &containerState{
			serverID: serverID,
		}
		g.states[containerID] = state
	}

	state.lastCrash = time.Now()
	state.attempts++
	state.consecutiveFails++

	// Check if max attempts exceeded
	if state.attempts >= g.policy.MaxAttempts {
		g.logger.Error("Container exceeded max restart attempts",
			zap.String("serverID", serverID),
			zap.Int("attempts", state.attempts))

		state.failed = true
		g.statesLock.Unlock()

		// Notify API that server has failed
		g.notifyServerFailed(serverID, fmt.Sprintf("Exceeded max restart attempts (%d)", g.policy.MaxAttempts))
		return
	}

	// Calculate backoff delay
	backoff := g.calculateBackoff(state.attempts)

	g.logger.Info("Scheduling container restart",
		zap.String("serverID", serverID),
		zap.Int("attempt", state.attempts),
		zap.Duration("backoff", backoff))

	g.statesLock.Unlock()

	// Wait for backoff period, then restart
	go func() {
		time.Sleep(backoff)

		if err := g.restartContainer(containerID, serverID); err != nil {
			g.logger.Error("Failed to restart container",
				zap.String("serverID", serverID),
				zap.Error(err))

			g.notifyServerFailed(serverID, fmt.Sprintf("Restart failed: %v", err))
		} else {
			g.logger.Info("Container restarted successfully",
				zap.String("serverID", serverID),
				zap.Int("attempt", state.attempts))

			state.lastRestart = time.Now()

			// Notify API of crash event
			g.notifyCrashEvent(serverID, state.attempts, exitCode)
		}
	}()
}

// handleContainerStart handles container start events
func (g *Guard) handleContainerStart(containerID, serverID string) {
	g.logger.Debug("Container started",
		zap.String("serverID", serverID),
		zap.String("containerID", containerID[:12]))

	g.statesLock.Lock()
	defer g.statesLock.Unlock()

	// Reset consecutive fails on successful start
	if state, exists := g.states[containerID]; exists {
		state.consecutiveFails = 0
	}
}

// restartContainer attempts to restart a container
func (g *Guard) restartContainer(containerID, serverID string) error {
	g.logger.Info("Restarting container",
		zap.String("serverID", serverID),
		zap.String("containerID", containerID[:12]))

	// Use Docker restart with timeout
	timeout := 30
	if err := g.dockerClient.ContainerRestart(g.ctx, containerID, container.StopOptions{Timeout: &timeout}); err != nil {
		return fmt.Errorf("failed to restart container: %w", err)
	}

	return nil
}

// calculateBackoff calculates exponential backoff delay
func (g *Guard) calculateBackoff(attempts int) time.Duration {
	backoff := float64(g.policy.BackoffBase) * float64(g.policy.BackoffMultiplier) * float64(attempts-1)
	duration := time.Duration(backoff)

	if duration > g.policy.BackoffMax {
		return g.policy.BackoffMax
	}

	return duration
}

// notifyCrashEvent notifies the API of a crash event
func (g *Guard) notifyCrashEvent(serverID string, attempts int, exitCode string) {
	payload := map[string]interface{}{
		"nodeId":    g.nodeID,
		"serverId":  serverID,
		"eventType": "crash",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"metadata": map[string]interface{}{
			"exitCode":       exitCode,
			"restartAttempt": attempts,
		},
	}

	data, err := json.Marshal(payload)
	if err != nil {
		g.logger.Error("Failed to marshal crash event", zap.Error(err))
		return
	}

	endpoint := fmt.Sprintf("/nodes/%s/events", g.nodeID)
	resp, err := g.apiClient.Post(endpoint, data)
	if err != nil {
		g.logger.Error("Failed to send crash event to API", zap.Error(err))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		g.logger.Error("API returned error for crash event", zap.Int("status", resp.StatusCode))
		return
	}

	g.logger.Debug("Crash event sent to API", zap.String("serverID", serverID))
}

// notifyServerFailed notifies the API that a server has failed
func (g *Guard) notifyServerFailed(serverID, reason string) {
	payload := map[string]interface{}{
		"nodeId":    g.nodeID,
		"serverId":  serverID,
		"eventType": "failed",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"metadata": map[string]interface{}{
			"reason": reason,
		},
	}

	data, err := json.Marshal(payload)
	if err != nil {
		g.logger.Error("Failed to marshal failed event", zap.Error(err))
		return
	}

	endpoint := fmt.Sprintf("/nodes/%s/events", g.nodeID)
	resp, err := g.apiClient.Post(endpoint, data)
	if err != nil {
		g.logger.Error("Failed to send failed event to API", zap.Error(err))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		g.logger.Error("API returned error for failed event", zap.Int("status", resp.StatusCode))
		return
	}

	g.logger.Info("Server marked as failed in API", zap.String("serverID", serverID), zap.String("reason", reason))
}

// GetContainerState returns the restart state for a container
func (g *Guard) GetContainerState(containerID string) *containerState {
	g.statesLock.RLock()
	defer g.statesLock.RUnlock()

	return g.states[containerID]
}

// ResetContainerState resets the restart state for a container
func (g *Guard) ResetContainerState(containerID string) {
	g.statesLock.Lock()
	defer g.statesLock.Unlock()

	delete(g.states, containerID)
	g.logger.Info("Container restart state reset", zap.String("containerID", containerID[:12]))
}
