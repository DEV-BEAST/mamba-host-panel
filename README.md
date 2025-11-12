# GamePanel - Modern Game Server Management Platform

A full-stack game server management platform built with modern technologies. Similar to Pterodactyl but with a modernized stack.

## 🏗️ Architecture

This is a monorepo containing three main applications and several shared packages:

### Applications

- **Web Panel** (`apps/web`) - Next.js 15 frontend with App Router
- **API Backend** (`apps/api`) - NestJS API with Fastify adapter
- **Wings Daemon** (`apps/wings`) - Go service for managing Docker containers

### Shared Packages

- **`packages/types`** - Shared TypeScript types
- **`packages/ui`** - shadcn/ui component library
- **`packages/db`** - Drizzle ORM schema and migrations
- **`packages/config`** - Shared ESLint and TypeScript configurations
- **`packages/api-contract`** - OpenAPI specification for Wings API

## 🛠️ Tech Stack

### Frontend (apps/web)
- Next.js 15 (App Router + React Server Components)
- TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- TanStack Query v5
- Auth.js (NextAuth v5)
- tRPC client

### Backend (apps/api)
- NestJS with Fastify adapter
- TypeScript (strict mode)
- tRPC server
- REST API with OpenAPI/Swagger
- WebSocket Gateway
- Drizzle ORM
- PostgreSQL 16
- Redis 7 + BullMQ
- Pino logger
- JWT authentication

### Wings Daemon (apps/wings)
- Go 1.22
- Fiber HTTP framework
- Docker SDK for Go
- Zap structured logging
- OpenAPI client

### DevOps
- Turborepo for build orchestration
- pnpm workspaces
- Docker Compose for local development
- GitHub Actions CI/CD

## 📋 Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Go >= 1.22 (for Wings)
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd game-panel

# Install dependencies
pnpm install
```

### 2. Environment Setup

```bash
# Copy environment file
cp .env.example .env

# Edit the .env file with your configuration
# Make sure to set secure secrets in production!
```

### 3. Database Setup

```bash
# Start PostgreSQL and Redis with Docker
docker-compose up -d postgres redis

# Generate Drizzle migrations
pnpm --filter @gamePanel/db db:generate

# Run migrations
pnpm --filter @gamePanel/db db:migrate
```

### 4. Start Development Servers

#### Option A: Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up

# Or start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f
```

#### Option B: Manual Start

```bash
# Terminal 1: Start API
pnpm --filter @gamePanel/api dev

# Terminal 2: Start Web
pnpm --filter @gamePanel/web dev

# Terminal 3: Start Wings (requires Go)
cd apps/wings
make dev
```

### 5. Access the Applications

- **Web Panel**: http://localhost:3000
- **API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api-docs
- **Wings**: http://localhost:8080

## 📁 Project Structure

```
game-panel/
├── apps/
│   ├── web/              # Next.js frontend
│   ├── api/              # NestJS backend
│   └── wings/            # Go daemon
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── ui/               # UI component library
│   ├── db/               # Database schema
│   ├── config/           # Shared configs
│   └── api-contract/     # OpenAPI spec
├── .github/
│   └── workflows/        # CI/CD workflows
├── docker-compose.yml    # Docker Compose config
└── turbo.json           # Turborepo config
```

## 🧪 Development

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov
```

### Linting and Type Checking

```bash
# Lint all packages
pnpm lint

# Type check all packages
pnpm typecheck

# Format code
pnpm format
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @gamePanel/web build
pnpm --filter @gamePanel/api build

# Build Wings
cd apps/wings
make build
```

## 🗄️ Database Management

### Drizzle Studio

```bash
# Open Drizzle Studio (database GUI)
pnpm --filter @gamePanel/db db:studio
```

### Migrations

```bash
# Generate migration from schema changes
pnpm --filter @gamePanel/db db:generate

# Run migrations
pnpm --filter @gamePanel/db db:migrate

# Push schema directly (development only)
pnpm --filter @gamePanel/db db:push
```

## 🔐 Authentication

The platform supports multiple authentication methods:

- **Email/Password** - Traditional credentials
- **Discord OAuth** - Sign in with Discord
- **Google OAuth** - Sign in with Google

Configure OAuth providers in `.env`:

```env
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 🐳 Docker Deployment

### Production Build

```bash
# Build all images
docker-compose -f docker-compose.prod.yml build

# Start in production mode
docker-compose -f docker-compose.prod.yml up -d
```

### Individual Dockerfiles

Each app has its own Dockerfile:
- `apps/web/Dockerfile` - Next.js multi-stage build
- `apps/api/Dockerfile` - NestJS multi-stage build
- `apps/wings/Dockerfile` - Go multi-stage build

## 🔧 Configuration

### Environment Variables

Key environment variables to configure:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/gamepanel

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secret
JWT_SECRET=your-secret-key

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# API URL
API_URL=http://localhost:3001
WINGS_API_URL=http://localhost:8080
```

### Wings Configuration

Wings can be configured via YAML file or environment variables:

```yaml
# config.yaml
host: "0.0.0.0"
port: 8080
debug: true
token_secret: "your-secret-token"
```

Or via environment:
```bash
WINGS_HOST=0.0.0.0
WINGS_PORT=8080
WINGS_DEBUG=true
WINGS_TOKEN_SECRET=your-secret-token
```

## 📚 API Documentation

### REST API

- OpenAPI documentation available at: http://localhost:3001/api-docs
- Interactive Swagger UI for testing endpoints
- Full API specification in `packages/api-contract/openapi.yaml`

### tRPC API

- Type-safe API calls from frontend to backend
- Automatic type inference
- No code generation required

### Wings API

- Communicates with panel API via REST
- JWT authentication required
- Endpoints for container management, stats, logs, and commands

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We follow conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `refactor:` - Code refactoring
- `test:` - Test changes

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Inspired by [Pterodactyl Panel](https://pterodactyl.io/)
- Built with amazing open-source technologies

## 📞 Support

- Create an issue for bug reports or feature requests
- Join our Discord community (coming soon)
- Check the documentation wiki (coming soon)

## 🗺️ Roadmap

- [ ] User management and permissions
- [ ] Server templates and eggs
- [ ] Resource allocation and limits
- [ ] Billing integration (Stripe)
- [ ] Multi-node support
- [ ] Server backups and snapshots
- [ ] File manager
- [ ] Schedule and task automation
- [ ] Metrics and monitoring
- [ ] Audit logging

---

Built with ❤️ by the GamePanel team
