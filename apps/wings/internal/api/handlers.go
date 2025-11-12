package api

import (
	"runtime"
	"time"

	"github.com/mambapanel/wings/internal/config"
	"github.com/mambapanel/wings/internal/docker"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

type Handlers struct {
	logger       *zap.Logger
	dockerClient *docker.Client
	config       *config.Config
}

func NewHandlers(logger *zap.Logger, dockerClient *docker.Client, cfg *config.Config) *Handlers {
	return &Handlers{
		logger:       logger,
		dockerClient: dockerClient,
		config:       cfg,
	}
}

// GetSystemStatus returns system information
func (h *Handlers) GetSystemStatus(c *fiber.Ctx) error {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	return c.JSON(fiber.Map{
		"version":          "1.0.0",
		"uptime":           int64(time.Since(time.Now()).Seconds()),
		"cpuCount":         runtime.NumCPU(),
		"memoryTotal":      memStats.Sys,
		"memoryAvailable":  memStats.Frees,
		"diskTotal":        0, // TODO: Implement disk stats
		"diskAvailable":    0, // TODO: Implement disk stats
	})
}

// ServerPowerAction handles power actions for servers
func (h *Handlers) ServerPowerAction(c *fiber.Ctx) error {
	serverID := c.Params("serverId")

	var body struct {
		Action string `json:"action"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	var err error
	switch body.Action {
	case "start":
		err = h.dockerClient.StartContainer(serverID)
	case "stop":
		err = h.dockerClient.StopContainer(serverID)
	case "restart":
		err = h.dockerClient.RestartContainer(serverID)
	case "kill":
		err = h.dockerClient.KillContainer(serverID)
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid action",
		})
	}

	if err != nil {
		h.logger.Error("Failed to execute power action",
			zap.String("serverId", serverID),
			zap.String("action", body.Action),
			zap.Error(err))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Power action executed successfully",
	})
}

// GetServerLogs retrieves server logs
func (h *Handlers) GetServerLogs(c *fiber.Ctx) error {
	serverID := c.Params("serverId")
	lines := c.Query("lines", "100")

	logs, err := h.dockerClient.GetContainerLogs(serverID, lines)
	if err != nil {
		h.logger.Error("Failed to get server logs",
			zap.String("serverId", serverID),
			zap.Error(err))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"logs": []string{logs},
	})
}

// SendServerCommand sends a command to a server
func (h *Handlers) SendServerCommand(c *fiber.Ctx) error {
	serverID := c.Params("serverId")

	var body struct {
		Command string `json:"command"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	// TODO: Implement command execution
	h.logger.Info("Received command",
		zap.String("serverId", serverID),
		zap.String("command", body.Command))

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Command sent successfully",
	})
}

// GetServerStats retrieves server resource statistics
func (h *Handlers) GetServerStats(c *fiber.Ctx) error {
	serverID := c.Params("serverId")

	stats, err := h.dockerClient.GetContainerStats(serverID)
	if err != nil {
		h.logger.Error("Failed to get server stats",
			zap.String("serverId", serverID),
			zap.Error(err))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   err.Error(),
		})
	}

	// TODO: Parse and format stats properly
	return c.JSON(fiber.Map{
		"cpuUsage":    0.0,
		"memoryUsage": 0,
		"diskUsage":   0,
		"networkRx":   0,
		"networkTx":   0,
		"uptime":      0,
		"_raw":        stats,
	})
}
