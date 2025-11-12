# API Contract

OpenAPI specification for the Wings daemon API.

## Overview

This package contains the OpenAPI 3.0 specification that defines the REST API interface between the panel API and Wings daemon nodes.

## Endpoints

- `GET /api/system/status` - Get system information and resource usage
- `POST /api/servers/:id/power` - Execute power actions (start, stop, restart, kill)
- `GET /api/servers/:id/logs` - Retrieve server logs
- `POST /api/servers/:id/command` - Send commands to the server
- `GET /api/servers/:id/stats` - Get server resource statistics

## Authentication

All endpoints require Bearer token authentication using JWT tokens issued by the panel API.

## Usage

### Validate Specification

```bash
pnpm validate
```

### Generate Clients

Use this specification to generate client libraries for various languages using tools like:
- openapi-generator
- swagger-codegen
- oapi-codegen (for Go)
