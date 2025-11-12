.PHONY: help up down clean restart logs ps install dev build test lint type-check db-migrate db-seed db-reset

# Default target
help:
	@echo "Mamba Host Panel - Development Commands"
	@echo ""
	@echo "Available targets:"
	@echo "  make up             - Start all services with Docker Compose"
	@echo "  make down           - Stop all services"
	@echo "  make restart        - Restart all services"
	@echo "  make clean          - Stop and remove all containers, volumes, and networks"
	@echo "  make logs           - View logs from all services"
	@echo "  make ps             - List running containers"
	@echo ""
	@echo "  make install        - Install all dependencies (pnpm install)"
	@echo "  make dev            - Start development servers (web + api + worker)"
	@echo "  make build          - Build all packages and apps"
	@echo "  make test           - Run all tests"
	@echo "  make lint           - Run linters on all packages"
	@echo "  make type-check     - Run TypeScript type checking"
	@echo ""
	@echo "  make db-migrate     - Run database migrations"
	@echo "  make db-seed        - Seed database with demo data"
	@echo "  make db-reset       - Reset database (drop, migrate, seed)"
	@echo ""

# Docker Compose commands
up:
	docker-compose up -d
	@echo "✅ All services started"
	@echo "   Web:    http://localhost:3000"
	@echo "   API:    http://localhost:3001"
	@echo "   DB:     postgresql://localhost:5432/mamba"
	@echo "   Redis:  redis://localhost:6379"

down:
	docker-compose down
	@echo "✅ All services stopped"

restart:
	docker-compose restart
	@echo "✅ All services restarted"

clean:
	docker-compose down -v --remove-orphans
	@echo "✅ All containers, volumes, and networks removed"

logs:
	docker-compose logs -f

ps:
	docker-compose ps

# Package management
install:
	pnpm install
	@echo "✅ Dependencies installed"

# Development
dev:
	pnpm dev

build:
	pnpm build
	@echo "✅ All packages and apps built"

# Testing & Quality
test:
	pnpm test
	@echo "✅ All tests passed"

lint:
	pnpm lint
	@echo "✅ Linting complete"

type-check:
	pnpm type-check
	@echo "✅ Type checking complete"

# Database operations
db-migrate:
	cd packages/db && pnpm db:migrate
	@echo "✅ Database migrations applied"

db-seed:
	cd packages/db && pnpm db:seed
	@echo "✅ Database seeded with demo data"

db-reset:
	cd packages/db && pnpm db:reset
	@echo "✅ Database reset complete"

# Quick start
quickstart: install up db-migrate db-seed
	@echo ""
	@echo "🚀 Mamba Host Panel is ready!"
	@echo ""
	@echo "   Web UI:  http://localhost:3000"
	@echo "   API:     http://localhost:3001"
	@echo "   Status:  http://localhost:3000/status"
	@echo ""
	@echo "Run 'make dev' to start development servers"
	@echo ""
