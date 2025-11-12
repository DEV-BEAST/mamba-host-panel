package api

import (
	"github.com/gamepanel/wings/internal/config"
	"github.com/gamepanel/wings/internal/docker"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"go.uber.org/zap"
)

func SetupRoutes(app *fiber.App, logger *zap.Logger, dockerClient *docker.Client, cfg *config.Config) {
	// Middleware
	app.Use(cors.New())
	app.Use(LoggerMiddleware(logger))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "healthy"})
	})

	// Create handlers
	handlers := NewHandlers(logger, dockerClient, cfg)

	// API routes
	api := app.Group("/api")

	// Apply auth middleware to all API routes
	api.Use(AuthMiddleware(logger, cfg))

	// System routes
	api.Get("/system/status", handlers.GetSystemStatus)

	// Server routes
	api.Post("/servers/:serverId/power", handlers.ServerPowerAction)
	api.Get("/servers/:serverId/logs", handlers.GetServerLogs)
	api.Post("/servers/:serverId/command", handlers.SendServerCommand)
	api.Get("/servers/:serverId/stats", handlers.GetServerStats)
}
