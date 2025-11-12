package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/mambapanel/wings/internal/api"
	"github.com/mambapanel/wings/internal/config"
	"github.com/mambapanel/wings/internal/crashguard"
	"github.com/mambapanel/wings/internal/docker"
	"github.com/mambapanel/wings/internal/metrics"
	"github.com/mambapanel/wings/internal/mtls"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

const Version = "1.0.0"

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize logger
	logger, err := initLogger(cfg.Debug)
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Sync()

	logger.Info("Starting Wings daemon", zap.String("version", Version))

	// Initialize Docker client
	dockerClient, err := docker.NewClient()
	if err != nil {
		logger.Fatal("Failed to initialize Docker client", zap.Error(err))
	}
	defer dockerClient.Close()

	logger.Info("Docker client initialized successfully")

	// Load mTLS configuration
	mtlsConfig, err := mtls.LoadClientConfig()
	if err != nil {
		logger.Warn("mTLS configuration not available, some features will be disabled", zap.Error(err))
	}

	var apiClient *mtls.APIClient
	if mtlsConfig != nil {
		// Verify mTLS setup
		if err := mtls.VerifyClientSetup(mtlsConfig); err != nil {
			logger.Warn("mTLS setup verification failed", zap.Error(err))
		} else {
			// Create API client for metrics and events
			apiClient, err = mtls.NewAPIClient(mtlsConfig)
			if err != nil {
				logger.Error("Failed to create API client", zap.Error(err))
			} else {
				logger.Info("mTLS API client initialized successfully")
			}
		}
	}

	// Initialize Phase 5 services
	var metricsEmitter *metrics.Emitter
	var crashGuard *crashguard.Guard

	if apiClient != nil && mtlsConfig != nil {
		// Start metrics emitter
		metricsEmitter = metrics.NewEmitter(dockerClient, apiClient, mtlsConfig.NodeID, logger)
		go metricsEmitter.Start()
		logger.Info("Metrics emitter started")

		// Start crash guard
		crashGuard = crashguard.NewGuard(dockerClient, apiClient, mtlsConfig.NodeID, logger)
		crashGuard.Start()
		logger.Info("Crash guard started")

		// Start heartbeat ticker
		go func() {
			ticker := time.NewTicker(60 * time.Second)
			defer ticker.Stop()

			for range ticker.C {
				if err := metricsEmitter.Heartbeat(); err != nil {
					logger.Error("Failed to send heartbeat", zap.Error(err))
				} else {
					logger.Debug("Heartbeat sent successfully")
				}
			}
		}()
	} else {
		logger.Warn("Phase 5 services disabled: mTLS API client not available")
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		DisableStartupMessage: true,
		AppName:               fmt.Sprintf("Wings v%s", Version),
	})

	// Setup API routes
	api.SetupRoutes(app, logger, dockerClient, cfg)

	// Start server in goroutine
	go func() {
		addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
		logger.Info("Starting HTTP server", zap.String("address", addr))
		if err := app.Listen(addr); err != nil {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Stop Phase 5 services
	if metricsEmitter != nil {
		metricsEmitter.Stop()
		logger.Info("Metrics emitter stopped")
	}

	if crashGuard != nil {
		crashGuard.Stop()
		logger.Info("Crash guard stopped")
	}

	// Shutdown HTTP server
	if err := app.Shutdown(); err != nil {
		logger.Error("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited")
}

func initLogger(debug bool) (*zap.Logger, error) {
	if debug {
		return zap.NewDevelopment()
	}
	return zap.NewProduction()
}
