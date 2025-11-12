package mtls

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"net/http"
	"os"
	"time"
)

// ClientConfig holds the mTLS client configuration
type ClientConfig struct {
	CertFile   string
	KeyFile    string
	CAFile     string
	NodeID     string
	APIBaseURL string
}

// LoadClientConfig loads mTLS client configuration from environment
func LoadClientConfig() (*ClientConfig, error) {
	config := &ClientConfig{
		CertFile:   os.Getenv("WINGS_TLS_CERT_FILE"),
		KeyFile:    os.Getenv("WINGS_TLS_KEY_FILE"),
		CAFile:     os.Getenv("WINGS_API_CA_CERT"),
		NodeID:     os.Getenv("WINGS_NODE_ID"),
		APIBaseURL: os.Getenv("WINGS_API_URL"),
	}

	// Validate required fields
	if config.CertFile == "" {
		return nil, fmt.Errorf("WINGS_TLS_CERT_FILE is required")
	}
	if config.KeyFile == "" {
		return nil, fmt.Errorf("WINGS_TLS_KEY_FILE is required")
	}
	if config.CAFile == "" {
		return nil, fmt.Errorf("WINGS_API_CA_CERT is required")
	}
	if config.NodeID == "" {
		return nil, fmt.Errorf("WINGS_NODE_ID is required")
	}
	if config.APIBaseURL == "" {
		config.APIBaseURL = "https://api.mambahost.local:3001"
	}

	return config, nil
}

// CreateHTTPClient creates an HTTP client with mTLS configuration
func CreateHTTPClient(config *ClientConfig) (*http.Client, error) {
	// Load client certificate and key
	cert, err := tls.LoadX509KeyPair(config.CertFile, config.KeyFile)
	if err != nil {
		return nil, fmt.Errorf("failed to load client certificate: %w", err)
	}

	// Load CA certificate
	caCert, err := os.ReadFile(config.CAFile)
	if err != nil {
		return nil, fmt.Errorf("failed to load CA certificate: %w", err)
	}

	// Create CA pool
	caCertPool := x509.NewCertPool()
	if !caCertPool.AppendCertsFromPEM(caCert) {
		return nil, fmt.Errorf("failed to parse CA certificate")
	}

	// Configure TLS
	tlsConfig := &tls.Config{
		Certificates: []tls.Certificate{cert},
		RootCAs:      caCertPool,
		MinVersion:   tls.VersionTLS12,
		MaxVersion:   tls.VersionTLS13,
		// Optionally, verify server hostname
		// ServerName: "api.mambahost.com",
	}

	// Create HTTP client with custom transport
	transport := &http.Transport{
		TLSClientConfig: tlsConfig,
		// Connection pooling settings
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     90 * time.Second,
		// Timeouts
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: 10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   30 * time.Second,
	}

	return client, nil
}

// VerifyClientSetup verifies that the mTLS client is properly configured
func VerifyClientSetup(config *ClientConfig) error {
	// Check if certificate files exist
	if _, err := os.Stat(config.CertFile); os.IsNotExist(err) {
		return fmt.Errorf("client certificate file not found: %s", config.CertFile)
	}

	if _, err := os.Stat(config.KeyFile); os.IsNotExist(err) {
		return fmt.Errorf("client key file not found: %s", config.KeyFile)
	}

	if _, err := os.Stat(config.CAFile); os.IsNotExist(err) {
		return fmt.Errorf("CA certificate file not found: %s", config.CAFile)
	}

	// Try to load the certificate
	_, err := tls.LoadX509KeyPair(config.CertFile, config.KeyFile)
	if err != nil {
		return fmt.Errorf("failed to load client certificate: %w", err)
	}

	// Try to load CA certificate
	caCert, err := os.ReadFile(config.CAFile)
	if err != nil {
		return fmt.Errorf("failed to load CA certificate: %w", err)
	}

	caCertPool := x509.NewCertPool()
	if !caCertPool.AppendCertsFromPEM(caCert) {
		return fmt.Errorf("failed to parse CA certificate")
	}

	return nil
}

// APIClient is a wrapper around HTTP client for API requests
type APIClient struct {
	httpClient *http.Client
	baseURL    string
	nodeID     string
}

// NewAPIClient creates a new API client with mTLS
func NewAPIClient(config *ClientConfig) (*APIClient, error) {
	httpClient, err := CreateHTTPClient(config)
	if err != nil {
		return nil, err
	}

	return &APIClient{
		httpClient: httpClient,
		baseURL:    config.APIBaseURL,
		nodeID:     config.NodeID,
	}, nil
}

// Get performs a GET request to the API
func (c *APIClient) Get(path string) (*http.Response, error) {
	url := c.baseURL + path
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	// Add custom headers
	req.Header.Set("X-Node-ID", c.nodeID)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Wings-Node/1.0")

	return c.httpClient.Do(req)
}

// Post performs a POST request to the API
func (c *APIClient) Post(path string, body []byte) (*http.Response, error) {
	url := c.baseURL + path
	req, err := http.NewRequest("POST", url, nil)
	if err != nil {
		return nil, err
	}

	// Add custom headers
	req.Header.Set("X-Node-ID", c.nodeID)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Wings-Node/1.0")

	return c.httpClient.Do(req)
}
