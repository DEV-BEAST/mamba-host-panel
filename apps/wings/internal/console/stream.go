package console

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/gofiber/contrib/websocket"
	"go.uber.org/zap"
)

// LogEntry represents a single log line with metadata
type LogEntry struct {
	Type      string `json:"type"`      // "stdout" or "stderr"
	Line      string `json:"line"`      // Log line content
	Timestamp string `json:"timestamp"` // ISO 8601 timestamp
}

// CommandMessage represents a command sent from client
type CommandMessage struct {
	Type    string `json:"type"`    // "command"
	Command string `json:"command"` // Command to execute
}

// Stream manages a WebSocket console stream for a container
type Stream struct {
	serverID     string
	containerID  string
	dockerClient *client.Client
	logger       *zap.Logger

	// WebSocket connections
	clients     map[*websocket.Conn]bool
	clientsLock sync.RWMutex

	// Stream control
	ctx    context.Context
	cancel context.CancelFunc

	// Buffering
	buffer     []LogEntry
	bufferSize int
	bufferLock sync.RWMutex
}

// NewStream creates a new console stream
func NewStream(serverID, containerID string, dockerClient *client.Client, logger *zap.Logger) *Stream {
	ctx, cancel := context.WithCancel(context.Background())

	return &Stream{
		serverID:     serverID,
		containerID:  containerID,
		dockerClient: dockerClient,
		logger:       logger,
		clients:      make(map[*websocket.Conn]bool),
		buffer:       make([]LogEntry, 0),
		bufferSize:   100, // Keep last 100 lines
		ctx:          ctx,
		cancel:       cancel,
	}
}

// AddClient adds a WebSocket client to the stream
func (s *Stream) AddClient(conn *websocket.Conn) {
	s.clientsLock.Lock()
	defer s.clientsLock.Unlock()

	s.clients[conn] = true
	s.logger.Info("Client added to console stream",
		zap.String("serverID", s.serverID),
		zap.Int("totalClients", len(s.clients)))

	// Send buffered logs to new client
	go s.sendBufferToClient(conn)
}

// RemoveClient removes a WebSocket client from the stream
func (s *Stream) RemoveClient(conn *websocket.Conn) {
	s.clientsLock.Lock()
	defer s.clientsLock.Unlock()

	delete(s.clients, conn)
	s.logger.Info("Client removed from console stream",
		zap.String("serverID", s.serverID),
		zap.Int("totalClients", len(s.clients)))
}

// Start begins streaming container logs
func (s *Stream) Start() error {
	s.logger.Info("Starting console stream", zap.String("serverID", s.serverID))

	// Get container logs
	options := types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     true,
		Timestamps: true,
		Tail:       "100", // Start with last 100 lines
	}

	logReader, err := s.dockerClient.ContainerLogs(s.ctx, s.containerID, options)
	if err != nil {
		return fmt.Errorf("failed to attach to container logs: %w", err)
	}

	go s.streamLogs(logReader)

	return nil
}

// Stop stops the console stream
func (s *Stream) Stop() {
	s.logger.Info("Stopping console stream", zap.String("serverID", s.serverID))
	s.cancel()

	// Close all client connections
	s.clientsLock.Lock()
	defer s.clientsLock.Unlock()

	for conn := range s.clients {
		conn.Close()
	}
	s.clients = make(map[*websocket.Conn]bool)
}

// streamLogs reads from log reader and broadcasts to clients
func (s *Stream) streamLogs(reader io.ReadCloser) {
	defer reader.Close()

	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		select {
		case <-s.ctx.Done():
			return
		default:
			line := scanner.Text()
			s.processLogLine(line)
		}
	}

	if err := scanner.Err(); err != nil {
		s.logger.Error("Error reading container logs", zap.Error(err))
	}

	s.logger.Info("Log stream ended", zap.String("serverID", s.serverID))
}

// processLogLine processes and broadcasts a log line
func (s *Stream) processLogLine(line string) {
	// Docker logs format: 8-byte header + log line
	// First byte indicates stream type: 1=stdout, 2=stderr
	if len(line) < 8 {
		return
	}

	streamType := "stdout"
	if line[0] == 2 {
		streamType = "stderr"
	}

	// Extract actual log content (skip 8-byte header)
	content := line[8:]

	entry := LogEntry{
		Type:      streamType,
		Line:      content,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	// Add to buffer
	s.addToBuffer(entry)

	// Broadcast to all clients
	s.broadcast(entry)
}

// addToBuffer adds a log entry to the buffer
func (s *Stream) addToBuffer(entry LogEntry) {
	s.bufferLock.Lock()
	defer s.bufferLock.Unlock()

	s.buffer = append(s.buffer, entry)

	// Trim buffer if exceeds size
	if len(s.buffer) > s.bufferSize {
		s.buffer = s.buffer[len(s.buffer)-s.bufferSize:]
	}
}

// broadcast sends a log entry to all connected clients
func (s *Stream) broadcast(entry LogEntry) {
	s.clientsLock.RLock()
	defer s.clientsLock.RUnlock()

	if len(s.clients) == 0 {
		return
	}

	data, err := json.Marshal(entry)
	if err != nil {
		s.logger.Error("Failed to marshal log entry", zap.Error(err))
		return
	}

	// Send to all clients
	for conn := range s.clients {
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			s.logger.Error("Failed to send log to client", zap.Error(err))
			// Remove disconnected client
			go s.RemoveClient(conn)
		}
	}
}

// sendBufferToClient sends buffered logs to a new client
func (s *Stream) sendBufferToClient(conn *websocket.Conn) {
	s.bufferLock.RLock()
	defer s.bufferLock.RUnlock()

	for _, entry := range s.buffer {
		data, err := json.Marshal(entry)
		if err != nil {
			s.logger.Error("Failed to marshal buffered log", zap.Error(err))
			continue
		}

		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			s.logger.Error("Failed to send buffered log to client", zap.Error(err))
			return
		}
	}

	s.logger.Debug("Sent buffered logs to client",
		zap.String("serverID", s.serverID),
		zap.Int("lines", len(s.buffer)))
}

// HandleCommand handles a command from a WebSocket client
func (s *Stream) HandleCommand(conn *websocket.Conn, message []byte) error {
	var cmd CommandMessage
	if err := json.Unmarshal(message, &cmd); err != nil {
		return fmt.Errorf("invalid command format: %w", err)
	}

	if cmd.Type != "command" {
		return fmt.Errorf("unknown message type: %s", cmd.Type)
	}

	s.logger.Info("Executing command",
		zap.String("serverID", s.serverID),
		zap.String("command", cmd.Command))

	// Create exec instance
	execConfig := types.ExecConfig{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"/bin/sh", "-c", cmd.Command},
	}

	execID, err := s.dockerClient.ContainerExecCreate(s.ctx, s.containerID, execConfig)
	if err != nil {
		return fmt.Errorf("failed to create exec: %w", err)
	}

	// Attach to exec
	attachResp, err := s.dockerClient.ContainerExecAttach(s.ctx, execID.ID, types.ExecStartCheck{})
	if err != nil {
		return fmt.Errorf("failed to attach to exec: %w", err)
	}
	defer attachResp.Close()

	// Start exec
	if err := s.dockerClient.ContainerExecStart(s.ctx, execID.ID, types.ExecStartCheck{}); err != nil {
		return fmt.Errorf("failed to start exec: %w", err)
	}

	// Read output and send to client
	scanner := bufio.NewScanner(attachResp.Reader)
	for scanner.Scan() {
		line := scanner.Text()

		entry := LogEntry{
			Type:      "stdout",
			Line:      line,
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}

		data, err := json.Marshal(entry)
		if err != nil {
			continue
		}

		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			return fmt.Errorf("failed to send command output: %w", err)
		}
	}

	return scanner.Err()
}

// Manager manages multiple console streams
type Manager struct {
	streams     map[string]*Stream // serverID -> Stream
	streamsLock sync.RWMutex

	dockerClient *client.Client
	logger       *zap.Logger
}

// NewManager creates a new stream manager
func NewManager(dockerClient *client.Client, logger *zap.Logger) *Manager {
	return &Manager{
		streams:      make(map[string]*Stream),
		dockerClient: dockerClient,
		logger:       logger,
	}
}

// GetOrCreateStream gets an existing stream or creates a new one
func (m *Manager) GetOrCreateStream(serverID, containerID string) (*Stream, error) {
	m.streamsLock.Lock()
	defer m.streamsLock.Unlock()

	// Check if stream already exists
	if stream, exists := m.streams[serverID]; exists {
		return stream, nil
	}

	// Create new stream
	stream := NewStream(serverID, containerID, m.dockerClient, m.logger)
	if err := stream.Start(); err != nil {
		return nil, err
	}

	m.streams[serverID] = stream
	m.logger.Info("Created new console stream", zap.String("serverID", serverID))

	return stream, nil
}

// RemoveStream removes and stops a stream
func (m *Manager) RemoveStream(serverID string) {
	m.streamsLock.Lock()
	defer m.streamsLock.Unlock()

	if stream, exists := m.streams[serverID]; exists {
		stream.Stop()
		delete(m.streams, serverID)
		m.logger.Info("Removed console stream", zap.String("serverID", serverID))
	}
}

// GetStream returns an existing stream
func (m *Manager) GetStream(serverID string) (*Stream, bool) {
	m.streamsLock.RLock()
	defer m.streamsLock.RUnlock()

	stream, exists := m.streams[serverID]
	return stream, exists
}
