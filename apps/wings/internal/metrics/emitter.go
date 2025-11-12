package metrics

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/mambapanel/wings/internal/mtls"
	"go.uber.org/zap"
)

// Sample represents a single metrics sample for a server
type Sample struct {
	ServerID        string  `json:"serverId"`
	Timestamp       string  `json:"timestamp"`
	CPUUsagePercent float64 `json:"cpuUsagePercent"`
	MemUsageMB      int64   `json:"memUsageMb"`
	DiskUsageMB     int64   `json:"diskUsageMb"`
	NetEgressBytes  int64   `json:"netEgressBytes"`
	Uptime          int64   `json:"uptimeSeconds"`
}

// BatchMetricsPayload represents a batch of metrics samples
type BatchMetricsPayload struct {
	NodeID    string   `json:"nodeId"`
	Timestamp string   `json:"timestamp"`
	Samples   []Sample `json:"samples"`
}

// Emitter collects and sends metrics to the API
type Emitter struct {
	dockerClient *client.Client
	apiClient    *mtls.APIClient
	logger       *zap.Logger
	nodeID       string

	// Buffering for offline resilience
	buffer     []Sample
	bufferLock sync.Mutex
	maxBuffer  int

	// Tracking
	lastNetworkStats map[string]uint64 // containerID -> bytes sent

	// Control
	ctx    context.Context
	cancel context.CancelFunc
}

// NewEmitter creates a new metrics emitter
func NewEmitter(dockerClient *client.Client, apiClient *mtls.APIClient, nodeID string, logger *zap.Logger) *Emitter {
	ctx, cancel := context.WithCancel(context.Background())

	return &Emitter{
		dockerClient:     dockerClient,
		apiClient:        apiClient,
		logger:           logger,
		nodeID:           nodeID,
		buffer:           make([]Sample, 0),
		maxBuffer:        1000, // Keep up to 1000 samples if API is down
		lastNetworkStats: make(map[string]uint64),
		ctx:              ctx,
		cancel:           cancel,
	}
}

// Start begins the metrics collection loop
func (e *Emitter) Start() {
	e.logger.Info("Starting metrics emitter", zap.Duration("interval", 30*time.Second))

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	// Collect immediately on start
	e.collectAndSend()

	for {
		select {
		case <-ticker.C:
			e.collectAndSend()
		case <-e.ctx.Done():
			e.logger.Info("Metrics emitter stopped")
			return
		}
	}
}

// Stop stops the metrics emitter
func (e *Emitter) Stop() {
	e.logger.Info("Stopping metrics emitter")
	e.cancel()
}

// collectAndSend collects metrics from all containers and sends to API
func (e *Emitter) collectAndSend() {
	e.logger.Debug("Collecting metrics from containers")

	// List all containers
	containers, err := e.dockerClient.ContainerList(e.ctx, types.ContainerListOptions{
		All: false, // Only running containers
	})
	if err != nil {
		e.logger.Error("Failed to list containers", zap.Error(err))
		return
	}

	if len(containers) == 0 {
		e.logger.Debug("No running containers to collect metrics from")
		return
	}

	samples := make([]Sample, 0, len(containers))

	for _, container := range containers {
		// Get server ID from container labels
		serverID, ok := container.Labels["io.mamba.server_id"]
		if !ok {
			e.logger.Debug("Container missing server_id label", zap.String("containerID", container.ID[:12]))
			continue
		}

		// Collect stats
		sample, err := e.collectContainerStats(serverID, container.ID)
		if err != nil {
			e.logger.Error("Failed to collect stats for container",
				zap.String("serverID", serverID),
				zap.String("containerID", container.ID[:12]),
				zap.Error(err))
			continue
		}

		samples = append(samples, *sample)
	}

	if len(samples) == 0 {
		e.logger.Debug("No samples collected")
		return
	}

	e.logger.Info("Collected metrics samples", zap.Int("count", len(samples)))

	// Send to API
	if err := e.sendToAPI(samples); err != nil {
		e.logger.Error("Failed to send metrics to API", zap.Error(err))

		// Buffer samples for retry
		e.bufferSamples(samples)
	} else {
		// Successfully sent, try to send buffered samples
		e.flushBuffer()
	}
}

// collectContainerStats collects stats for a single container
func (e *Emitter) collectContainerStats(serverID, containerID string) (*Sample, error) {
	// Get stats with one-shot read (no stream)
	stats, err := e.dockerClient.ContainerStats(e.ctx, containerID, false)
	if err != nil {
		return nil, fmt.Errorf("failed to get container stats: %w", err)
	}
	defer stats.Body.Close()

	// Decode stats
	var containerStats types.StatsJSON
	if err := json.NewDecoder(stats.Body).Decode(&containerStats); err != nil {
		return nil, fmt.Errorf("failed to decode stats: %w", err)
	}

	// Calculate CPU usage percentage
	cpuPercent := calculateCPUPercent(&containerStats)

	// Memory usage in MB
	memUsageMB := int64(containerStats.MemoryStats.Usage / 1024 / 1024)

	// Disk usage (approximation from container stats)
	diskUsageMB := int64(0)
	if containerStats.StorageStats.WriteSizeBytes != nil {
		diskUsageMB = int64(*containerStats.StorageStats.WriteSizeBytes / 1024 / 1024)
	}

	// Network egress (bytes sent since last sample)
	var netEgressBytes int64
	for _, netStats := range containerStats.Networks {
		currentTx := netStats.TxBytes
		lastTx, ok := e.lastNetworkStats[containerID]
		if ok {
			netEgressBytes += int64(currentTx - lastTx)
		}
		e.lastNetworkStats[containerID] = currentTx
	}

	// Container uptime (parse from started time)
	inspect, err := e.dockerClient.ContainerInspect(e.ctx, containerID)
	if err == nil && inspect.State.StartedAt != "" {
		startTime, err := time.Parse(time.RFC3339Nano, inspect.State.StartedAt)
		if err == nil {
			uptime := int64(time.Since(startTime).Seconds())
			sample := &Sample{
				ServerID:        serverID,
				Timestamp:       time.Now().UTC().Format(time.RFC3339),
				CPUUsagePercent: cpuPercent,
				MemUsageMB:      memUsageMB,
				DiskUsageMB:     diskUsageMB,
				NetEgressBytes:  netEgressBytes,
				Uptime:          uptime,
			}
			return sample, nil
		}
	}

	// Fallback without uptime
	sample := &Sample{
		ServerID:        serverID,
		Timestamp:       time.Now().UTC().Format(time.RFC3339),
		CPUUsagePercent: cpuPercent,
		MemUsageMB:      memUsageMB,
		DiskUsageMB:     diskUsageMB,
		NetEgressBytes:  netEgressBytes,
		Uptime:          0,
	}

	return sample, nil
}

// calculateCPUPercent calculates CPU usage percentage
func calculateCPUPercent(stats *types.StatsJSON) float64 {
	// Calculate CPU usage percentage based on Docker stats
	cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage - stats.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(stats.CPUStats.SystemUsage - stats.PreCPUStats.SystemUsage)

	if systemDelta > 0.0 && cpuDelta > 0.0 {
		cpuPercent := (cpuDelta / systemDelta) * float64(stats.CPUStats.OnlineCPUs) * 100.0
		return cpuPercent
	}

	return 0.0
}

// sendToAPI sends metrics samples to the API
func (e *Emitter) sendToAPI(samples []Sample) error {
	payload := BatchMetricsPayload{
		NodeID:    e.nodeID,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Samples:   samples,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Send POST request to API
	endpoint := fmt.Sprintf("/nodes/%s/metrics", e.nodeID)
	resp, err := e.apiClient.Post(endpoint, data)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	e.logger.Debug("Metrics sent to API successfully",
		zap.Int("samples", len(samples)),
		zap.Int("status", resp.StatusCode))

	return nil
}

// bufferSamples adds samples to buffer for retry
func (e *Emitter) bufferSamples(samples []Sample) {
	e.bufferLock.Lock()
	defer e.bufferLock.Unlock()

	// Add to buffer
	e.buffer = append(e.buffer, samples...)

	// Trim buffer if exceeds max
	if len(e.buffer) > e.maxBuffer {
		overflow := len(e.buffer) - e.maxBuffer
		e.buffer = e.buffer[overflow:]
		e.logger.Warn("Metrics buffer overflow, dropped oldest samples", zap.Int("dropped", overflow))
	}

	e.logger.Info("Buffered metrics samples", zap.Int("buffered", len(samples)), zap.Int("totalBuffered", len(e.buffer)))
}

// flushBuffer attempts to send buffered samples
func (e *Emitter) flushBuffer() {
	e.bufferLock.Lock()
	defer e.bufferLock.Unlock()

	if len(e.buffer) == 0 {
		return
	}

	e.logger.Info("Flushing buffered metrics", zap.Int("count", len(e.buffer)))

	// Try to send buffered samples
	if err := e.sendToAPI(e.buffer); err != nil {
		e.logger.Error("Failed to flush buffered metrics", zap.Error(err))
		return
	}

	// Clear buffer on success
	e.buffer = make([]Sample, 0)
	e.logger.Info("Buffered metrics flushed successfully")
}

// Heartbeat sends a heartbeat to the API
func (e *Emitter) Heartbeat() error {
	payload := map[string]interface{}{
		"nodeId":    e.nodeID,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"status":    "healthy",
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal heartbeat: %w", err)
	}

	endpoint := fmt.Sprintf("/nodes/%s/heartbeat", e.nodeID)
	resp, err := e.apiClient.Post(endpoint, bytes.NewReader(data).Bytes())
	if err != nil {
		return fmt.Errorf("failed to send heartbeat: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("heartbeat returned status %d", resp.StatusCode)
	}

	return nil
}
