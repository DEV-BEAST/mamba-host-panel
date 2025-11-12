package rcon

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"net"
	"sync"
	"time"

	"go.uber.org/zap"
)

// Packet types for RCON protocol
const (
	PacketTypeAuth         int32 = 3
	PacketTypeCommand      int32 = 2
	PacketTypeResponse     int32 = 0
	PacketTypeAuthResponse int32 = 2
)

// Packet represents an RCON packet
type Packet struct {
	Size int32
	ID   int32
	Type int32
	Body string
}

// Client is an RCON client
type Client struct {
	host     string
	port     int
	password string
	conn     net.Conn
	mu       sync.Mutex
	logger   *zap.Logger
	timeout  time.Duration
}

// NewClient creates a new RCON client
func NewClient(host string, port int, password string, logger *zap.Logger) *Client {
	return &Client{
		host:     host,
		port:     port,
		password: password,
		logger:   logger,
		timeout:  10 * time.Second,
	}
}

// Connect establishes a connection and authenticates
func (c *Client) Connect() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Connect to RCON server
	addr := fmt.Sprintf("%s:%d", c.host, c.port)
	conn, err := net.DialTimeout("tcp", addr, c.timeout)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}

	c.conn = conn
	c.logger.Info("Connected to RCON server", zap.String("addr", addr))

	// Authenticate
	authPacket := &Packet{
		ID:   1,
		Type: PacketTypeAuth,
		Body: c.password,
	}

	if err := c.sendPacket(authPacket); err != nil {
		c.conn.Close()
		return fmt.Errorf("failed to send auth packet: %w", err)
	}

	// Read auth response
	response, err := c.readPacket()
	if err != nil {
		c.conn.Close()
		return fmt.Errorf("failed to read auth response: %w", err)
	}

	// Check if authentication failed (ID will be -1)
	if response.ID == -1 {
		c.conn.Close()
		return fmt.Errorf("authentication failed: invalid password")
	}

	c.logger.Info("RCON authentication successful")

	return nil
}

// Execute sends a command and returns the response
func (c *Client) Execute(command string) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn == nil {
		return "", fmt.Errorf("not connected")
	}

	c.logger.Debug("Executing RCON command", zap.String("command", command))

	// Send command packet
	cmdPacket := &Packet{
		ID:   2,
		Type: PacketTypeCommand,
		Body: command,
	}

	if err := c.sendPacket(cmdPacket); err != nil {
		return "", fmt.Errorf("failed to send command: %w", err)
	}

	// Read response
	response, err := c.readPacket()
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	return response.Body, nil
}

// Close closes the RCON connection
func (c *Client) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn != nil {
		err := c.conn.Close()
		c.conn = nil
		return err
	}

	return nil
}

// sendPacket sends an RCON packet
func (c *Client) sendPacket(packet *Packet) error {
	// Set connection deadline
	if err := c.conn.SetWriteDeadline(time.Now().Add(c.timeout)); err != nil {
		return err
	}

	// Calculate size (ID + Type + Body + 2 null terminators)
	packet.Size = int32(10 + len(packet.Body))

	// Build packet buffer
	buf := new(bytes.Buffer)

	// Write packet size
	if err := binary.Write(buf, binary.LittleEndian, packet.Size); err != nil {
		return err
	}

	// Write packet ID
	if err := binary.Write(buf, binary.LittleEndian, packet.ID); err != nil {
		return err
	}

	// Write packet type
	if err := binary.Write(buf, binary.LittleEndian, packet.Type); err != nil {
		return err
	}

	// Write body
	if _, err := buf.WriteString(packet.Body); err != nil {
		return err
	}

	// Write null terminators
	if err := buf.WriteByte(0); err != nil {
		return err
	}
	if err := buf.WriteByte(0); err != nil {
		return err
	}

	// Send packet
	_, err := c.conn.Write(buf.Bytes())
	return err
}

// readPacket reads an RCON packet
func (c *Client) readPacket() (*Packet, error) {
	// Set connection deadline
	if err := c.conn.SetReadDeadline(time.Now().Add(c.timeout)); err != nil {
		return nil, err
	}

	// Read packet size
	var size int32
	if err := binary.Read(c.conn, binary.LittleEndian, &size); err != nil {
		return nil, err
	}

	// Read packet data
	data := make([]byte, size)
	if _, err := c.conn.Read(data); err != nil {
		return nil, err
	}

	// Parse packet
	packet := &Packet{
		Size: size,
	}

	buf := bytes.NewReader(data)

	// Read ID
	if err := binary.Read(buf, binary.LittleEndian, &packet.ID); err != nil {
		return nil, err
	}

	// Read Type
	if err := binary.Read(buf, binary.LittleEndian, &packet.Type); err != nil {
		return nil, err
	}

	// Read Body (everything except last 2 null bytes)
	bodyLen := len(data) - 10
	if bodyLen > 0 {
		bodyBytes := make([]byte, bodyLen)
		if _, err := buf.Read(bodyBytes); err != nil {
			return nil, err
		}
		packet.Body = string(bodyBytes)
	}

	return packet, nil
}

// Pool manages a pool of RCON connections
type Pool struct {
	clients map[string]*Client // serverID -> Client
	mu      sync.RWMutex
	logger  *zap.Logger
}

// NewPool creates a new RCON connection pool
func NewPool(logger *zap.Logger) *Pool {
	return &Pool{
		clients: make(map[string]*Client),
		logger:  logger,
	}
}

// GetClient gets or creates an RCON client for a server
func (p *Pool) GetClient(serverID, host string, port int, password string) (*Client, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	// Check if client exists
	if client, exists := p.clients[serverID]; exists {
		return client, nil
	}

	// Create new client
	client := NewClient(host, port, password, p.logger)
	if err := client.Connect(); err != nil {
		return nil, err
	}

	p.clients[serverID] = client
	p.logger.Info("Created new RCON client", zap.String("serverID", serverID))

	return client, nil
}

// RemoveClient removes and closes an RCON client
func (p *Pool) RemoveClient(serverID string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if client, exists := p.clients[serverID]; exists {
		client.Close()
		delete(p.clients, serverID)
		p.logger.Info("Removed RCON client", zap.String("serverID", serverID))
	}
}

// CloseAll closes all RCON connections
func (p *Pool) CloseAll() {
	p.mu.Lock()
	defer p.mu.Unlock()

	for serverID, client := range p.clients {
		client.Close()
		p.logger.Info("Closed RCON client", zap.String("serverID", serverID))
	}

	p.clients = make(map[string]*Client)
}
