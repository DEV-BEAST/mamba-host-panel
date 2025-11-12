# Mamba Host - Alpha Release Roadmap

**Target**: Chargeable Alpha with tenant isolation, RBAC, billing, and core game server provisioning.

**Status**: In Progress
**Definition of Done**: Tenant isolation enforced; audited actions; mTLS required for nodes; servers can be created, started, stopped, backed up, restored; metrics visible; Stripe test sub active; status page green.

---

## ✅ Phase 0: Foundation (COMPLETED)

### Infrastructure
- [x] Turborepo monorepo with pnpm workspaces
- [x] Root configuration (package.json, turbo.json, tsconfig.json)
- [x] Docker Compose for local development
- [x] GitHub Actions CI pipeline

### Packages (Initial)
- [x] packages/config (ESLint, TypeScript configs)
- [x] packages/types (shared types)
- [x] packages/ui (shadcn/ui components)
- [x] packages/db (Drizzle ORM base)
- [x] packages/api-contract (Wings OpenAPI spec)

### Applications (Base)
- [x] apps/web (Next.js 15 + Auth.js)
- [x] apps/api (NestJS + Fastify)
- [x] apps/wings (Go daemon)

---

## 🔨 Phase 1: Alpha Core Architecture (P0)

### 0. Repository Structure Additions

#### New Applications
- [ ] **apps/worker** (NestJS + BullMQ)
  - [ ] Create NestJS application with BullMQ
  - [ ] Configure BullMQ connection to Redis
  - [ ] Set up job processors structure
  - [ ] Add Pino logging
  - [ ] Wire into turbo.json
  - [ ] Add Dockerfile
  - [ ] Update docker-compose.yml

- [ ] **apps/billing-webhooks** (Fastify)
  - [ ] Create standalone Fastify app
  - [ ] Stripe webhook signature verification
  - [ ] Idempotency key handling
  - [ ] Event storage (webhook_events table)
  - [ ] Retry logic with exponential backoff
  - [ ] Wire into turbo.json
  - [ ] Add Dockerfile
  - [ ] Update docker-compose.yml

#### New Packages
- [ ] **packages/authz** (RBAC system)
  - [ ] Define permission keys enum
  - [ ] Define roles enum (OWNER, ADMIN, SUPPORT, MEMBER)
  - [ ] Create permission checking utilities
  - [ ] NestJS guards (RequirePermission, RequireTenant)
  - [ ] React hooks (usePermissions, useHasPermission)
  - [ ] Wire into turbo.json
  - [ ] Add to pnpm-workspace.yaml

- [ ] **packages/alloc** (Resource allocator)
  - [ ] Postgres-backed port allocator
  - [ ] IP pool allocator
  - [ ] Atomic reservation functions
  - [ ] Leak scanner (orphaned allocations)
  - [ ] Release by owner/server
  - [ ] Wire into turbo.json
  - [ ] Add to pnpm-workspace.yaml

- [ ] **packages/metrics-sdk** (Usage tracking)
  - [ ] Typed usage payload definitions
  - [ ] Heartbeat client for Wings
  - [ ] Metrics aggregation utilities
  - [ ] Sample validation schemas
  - [ ] Wire into turbo.json
  - [ ] Add to pnpm-workspace.yaml

- [ ] **packages/audit** (Audit logging)
  - [ ] Append-only audit log writer
  - [ ] Audit event type definitions
  - [ ] Actor/target/action schema
  - [ ] Drizzle integration
  - [ ] Query utilities (tenant-scoped)
  - [ ] Wire into turbo.json
  - [ ] Add to pnpm-workspace.yaml

- [ ] **packages/notifications** (Multi-channel notifications)
  - [ ] Email provider (Resend/Postmark)
  - [ ] Discord webhook client
  - [ ] Web push (optional for alpha)
  - [ ] Template system
  - [ ] Notification preferences
  - [ ] Wire into turbo.json
  - [ ] Add to pnpm-workspace.yaml

- [ ] **packages/blueprints** (Game templates)
  - [ ] Blueprint schema definition
  - [ ] Minecraft Vanilla template
  - [ ] Minecraft Paper template
  - [ ] Valheim template
  - [ ] Blueprint validator
  - [ ] Variable interpolation
  - [ ] Wire into turbo.json
  - [ ] Add to pnpm-workspace.yaml

#### Configuration Updates
- [ ] Update turbo.json with new packages/apps
- [ ] Update pnpm-workspace.yaml
- [ ] Update .github/workflows/ci.yml
- [ ] Update root README.md with new structure
- [ ] Update docker-compose.yml with all services

---

## 📊 Phase 2: Database Schema & Migrations (P0)

### Tenancy & RBAC Tables
- [x] **tenants table**
  - [ ] id, name, slug, plan_tier, status, created_at, updated_at
  - [ ] Unique constraint on slug
  - [ ] Indexes

- [x] **tenant_members table**
  - [ ] id, tenant_id, user_id, role, invited_by, joined_at
  - [ ] Unique constraint on (tenant_id, user_id)
  - [ ] Foreign keys with cascade
  - [ ] Indexes

- [x] **roles table**
  - [ ] id, name, description, system_role (boolean)
  - [ ] Pre-seed: OWNER, ADMIN, SUPPORT, MEMBER

- [x] **permissions table**
  - [ ] id, key, resource, action, description
  - [ ] Pre-seed all permission keys

- [x] **role_permissions table**
  - [ ] id, role_id, permission_id
  - [ ] Unique constraint on (role_id, permission_id)

- [x] **role_bindings table**
  - [ ] id, tenant_member_id, role_id
  - [ ] For custom role assignments

### Nodes & Allocation Tables
- [x] **nodes table**
  - [ ] id, name, fqdn, location, capacity_cpu_millicores, capacity_mem_mb, capacity_disk_gb
  - [ ] status, last_heartbeat, cert_fingerprint
  - [ ] created_at, updated_at
  - [ ] Indexes on status, last_heartbeat

- [x] **ip_pools table**
  - [ ] id, node_id, ip_address, is_allocated, allocated_to_server_id
  - [ ] Unique constraint on (node_id, ip_address)
  - [ ] Index on is_allocated

- [x] **port_pools table**
  - [ ] id, node_id, port, protocol, is_allocated, allocated_to_server_id
  - [ ] Unique constraint on (node_id, port, protocol)
  - [ ] Index on is_allocated

- [x] **allocations table**
  - [ ] id, server_id, node_id, ip_address, ports (jsonb)
  - [ ] status, allocated_at, released_at
  - [ ] Unique constraint on server_id

### Servers & Blueprints Tables
- [x] **Extend servers table**
  - [ ] Add tenant_id (foreign key)
  - [ ] Add node_id (foreign key)
  - [ ] Add allocation_id (foreign key)
  - [ ] Add blueprint_id (foreign key)
  - [ ] Add cpu_limit_millicores, mem_limit_mb, disk_gb
  - [ ] Add install_status, install_log
  - [ ] Indexes on tenant_id, node_id, status

- [x] **blueprints table**
  - [ ] id, game_slug, name, version, docker_image
  - [ ] startup_command, config_files (jsonb), variables (jsonb)
  - [ ] install_script, requires_allocation
  - [ ] created_at, updated_at
  - [ ] Index on game_slug

### Backups & Metrics Tables
- [x] **backups table**
  - [ ] id, server_id, tenant_id, name, size_bytes
  - [ ] status, storage_path, backup_type
  - [ ] created_at, completed_at, expires_at
  - [ ] Indexes on server_id, tenant_id, status

- [x] **metrics_hourly table**
  - [ ] id, server_id, tenant_id, node_id
  - [ ] hour_timestamp, cpu_millicore_avg, mem_mb_avg
  - [ ] disk_gb_used, egress_mb_total
  - [ ] samples_count
  - [ ] Unique constraint on (server_id, hour_timestamp)
  - [ ] Indexes on tenant_id, hour_timestamp

### Billing Tables
- [x] **products table**
  - [ ] id, stripe_product_id, name, description
  - [ ] active, created_at, updated_at

- [x] **prices table**
  - [ ] id, product_id, stripe_price_id, amount, currency
  - [ ] billing_period, metered, usage_type
  - [ ] active, created_at, updated_at

- [x] **subscriptions table**
  - [ ] id, tenant_id, stripe_subscription_id, stripe_customer_id
  - [ ] status, current_period_start, current_period_end
  - [ ] cancel_at, canceled_at
  - [ ] created_at, updated_at
  - [ ] Index on tenant_id, status

- [x] **subscription_items table**
  - [ ] id, subscription_id, stripe_subscription_item_id
  - [ ] price_id, quantity
  - [ ] created_at, updated_at

- [x] **usage_records table**
  - [ ] id, subscription_item_id, tenant_id, server_id
  - [ ] metric_type, quantity, period_start, period_end
  - [ ] stripe_usage_record_id, reported_at
  - [ ] Indexes on tenant_id, period_start

- [x] **invoices table**
  - [ ] id, tenant_id, subscription_id, stripe_invoice_id
  - [ ] amount_due, amount_paid, currency, status
  - [ ] invoice_pdf, hosted_invoice_url
  - [ ] created_at, due_date, paid_at
  - [ ] Index on tenant_id

- [x] **credits table**
  - [ ] id, tenant_id, amount, currency, description
  - [ ] expires_at, used_at
  - [ ] created_at

### Operational Tables
- [x] **audit_logs table**
  - [ ] id, tenant_id, actor_id, actor_type
  - [ ] action, resource_type, resource_id
  - [ ] metadata (jsonb), ip_address, user_agent
  - [ ] created_at
  - [ ] Indexes on tenant_id, created_at, actor_id

- [x] **webhook_events table**
  - [ ] id, provider, event_type, event_id
  - [ ] payload (jsonb), processed, processed_at
  - [ ] retry_count, last_error
  - [ ] created_at
  - [ ] Unique constraint on (provider, event_id)
  - [ ] Index on processed

- [x] **notifications table**
  - [ ] id, tenant_id, user_id, channel, template
  - [ ] subject, body, metadata (jsonb)
  - [ ] status, sent_at, read_at
  - [ ] created_at
  - [ ] Indexes on user_id, status

### Migrations & Seeds
- [x] Generate Drizzle migration
- [x] Create seed script for demo data:
  - [ ] 1 demo tenant ("Demo Corp")
  - [ ] 2 users (owner, member)
  - [ ] 2 nodes (us-east-1, us-west-1)
  - [ ] IP/port pools for nodes
  - [ ] 2 servers (1 Minecraft, 1 Valheim)
  - [ ] 1 Stripe test subscription
  - [ ] Sample hourly metrics (24h)
  - [ ] 1 backup
  - [ ] Audit log entries
- [x] Document tenant filtering strategy

---

## 🔒 Phase 3: Security Hardening (Alpha Scope) (P0)

### mTLS for API ↔ Wings
- [x] **Development CA Script**
  - [ ] Create scripts/dev:ca
  - [ ] Generate root CA certificate
  - [ ] Issue client certificates for Wings nodes
  - [ ] Certificate storage strategy
  - [ ] Auto-renewal logic

- [x] **API mTLS Configuration**
  - [ ] Configure Fastify for client cert validation
  - [ ] Extract node_id from cert CN/SAN
  - [ ] Middleware to verify cert fingerprint matches node
  - [ ] Reject requests without valid client cert

- [x] **Wings mTLS Configuration**
  - [ ] Load client certificate on startup
  - [ ] Configure TLS for API requests
  - [ ] Certificate rotation handling

### Short-Lived JWTs
- [x] Reduce JWT expiry to 15 minutes
- [x] Implement refresh token flow
- [x] Refresh token rotation
- [x] Token revocation strategy
- [x] Intent-based tokens for specific operations

### Secrets Management
- [x] **Envelope Encryption**
  - [ ] Master key from environment (KMS-ready)
  - [ ] Data encryption keys (DEK) per tenant
  - [ ] Encrypt/decrypt utilities
  - [ ] Store encrypted secrets in database
  - [ ] Key rotation strategy

- [x] **Credential Storage**
  - [ ] Wings daemon tokens (encrypted)
  - [ ] Stripe API keys (encrypted)
  - [ ] Email provider keys (encrypted)
  - [ ] Discord webhooks (encrypted)

### Authentication Enhancements
- [x] **Rate Limiting**
  - [ ] Login endpoint: 5 attempts per 15min per IP
  - [ ] Register endpoint: 3 attempts per hour per IP
  - [ ] Password reset: 3 attempts per hour per email
  - [ ] Redis-backed rate limiter

- [x] **Email Verification**
  - [ ] Generate verification token
  - [ ] Send verification email
  - [ ] Verify endpoint
  - [ ] Block unverified users from key actions
  - [ ] Resend verification email

- [x] **TOTP 2FA (Optional)**
  - [ ] Enable 2FA flow
  - [ ] Generate QR code
  - [ ] Verify TOTP code
  - [ ] Backup codes generation
  - [ ] 2FA enforcement at tenant level (optional flag)

---

## ✅ Phase 4: Allocator & Job Pipeline (COMPLETED)

### packages/alloc Implementation
- [x] **Core Functions**
  - [x] `reservePort(nodeId, protocol)` - atomic reservation
  - [x] `reserveIP(nodeId)` - atomic IP assignment
  - [x] `allocate(serverId, nodeId)` - full allocation
  - [x] `releaseByServer(serverId)` - release all resources
  - [x] `releaseByNode(nodeId)` - node decommission
  - [x] `scanLeaks()` - find orphaned allocations
  - [x] Transaction handling for atomicity

- [x] **Allocation Strategies**
  - [x] Sequential port assignment
  - [x] Random port from pool
  - [x] IP rotation
  - [x] Capacity checking

- [x] **Integration**
  - [x] Drizzle queries for allocation tables
  - [x] Export as NestJS module
  - [x] Add to apps/api and apps/worker

### Worker Job Pipeline (apps/worker)
- [x] **Job Queue Setup**
  - [x] Configure BullMQ queues (servers, backups, metrics)
  - [x] Job options (attempts, backoff, timeout)
  - [x] Dead letter queue
  - [ ] Job monitoring dashboard (Bull Board)

- [x] **InstallServer Job**
  - [x] Accept: serverId, blueprintId, nodeId, limits
  - [x] Step 1: Reserve allocation (ports/IP)
  - [x] Step 2: Fetch blueprint configuration
  - [x] Step 3: Call Wings API to create container
  - [x] Step 4: Run install script (if defined)
  - [x] Step 5: Wait for health check (retry logic)
  - [x] Step 6: Mark server as RUNNING
  - [x] Error handling: rollback allocation on failure
  - [x] Idempotency: check server status before starting

- [x] **UpdateServer Job**
  - [x] Accept: serverId, updates
  - [x] Update configuration
  - [x] Apply resource limit changes
  - [x] Restart if needed
  - [x] Idempotency key

- [x] **RestartServer Job**
  - [x] Graceful stop
  - [x] Start container
  - [x] Wait for health
  - [x] Idempotency key

- [x] **DeleteServer Job**
  - [x] Stop container
  - [x] Delete container from Wings
  - [x] Release allocation
  - [x] Archive data (optional)
  - [x] Update server status to DELETED

- [x] **BackupServer Job**
  - [x] Snapshot container volumes
  - [x] Compress backup
  - [x] Upload to MinIO/S3
  - [x] Record in backups table
  - [x] Cleanup old backups
  - [x] Notify on completion

- [x] **RestoreBackup Job**
  - [x] Download backup from storage
  - [x] Extract to volume
  - [x] Restart server
  - [x] Verify health

- [x] **AggregateMetrics Job**
  - [x] Query raw metrics samples
  - [x] Calculate hourly aggregates
  - [x] Insert into metrics_hourly
  - [x] Schedule: every hour

- [x] **ReportUsage Job**
  - [x] Query metrics_hourly for billing period
  - [x] Calculate usage per meter
  - [x] Report to Stripe
  - [x] Record in usage_records
  - [x] Schedule: daily

- [x] **Job Monitoring**
  - [x] Exponential backoff on retry
  - [x] Dead letter queue handling
  - [ ] Admin view for stuck jobs
  - [ ] Job metrics (success/fail rate)

---

## ✅ Phase 5: Wings Daemon Enhancements (COMPLETED)

### mTLS Client Configuration
- [x] Load client certificate and key
- [x] Configure TLS for outbound requests to API
- [x] Send metrics with client cert auth
- [x] Send events with client cert auth

### Console Streaming (WebSocket)
- [x] Attach to container output (stdout/stderr)
- [x] Stream logs to WebSocket clients
- [x] Handle container disconnect/reconnect
- [x] Buffer management (last 100 lines)
- [x] Multiple client support
- [x] Command execution via WebSocket

### File Manager Endpoints
- [x] **List Files**
  - [x] List directory contents with metadata
  - [x] Return file/folder listing with sizes, permissions, dates

- [x] **Read File**
  - [x] Read file contents from container
  - [x] Extract from tar archive

- [x] **Write File**
  - [x] Write/create file in container
  - [x] Create tar archive and copy to container

- [x] **Delete File/Folder**
  - [x] Recursive deletion
  - [x] Execute rm command in container

- [x] **Compress (Zip)**
  - [x] Create tar.gz archive from paths
  - [x] Execute tar command in container

- [x] **Extract (Unzip)**
  - [x] Extract tar.gz archive to path
  - [x] Execute extraction in container

- [x] **Additional Operations**
  - [x] Create directory
  - [x] Get file size

### RCON Adapter
- [x] **Minecraft RCON**
  - [x] Connect to RCON port
  - [x] Authenticate with password
  - [x] Execute command
  - [x] Return response
  - [x] Connection pooling

- [x] **Generic RCON**
  - [x] Protocol implementation (RCON packet format)
  - [x] Binary packet encoding/decoding
  - [x] Timeout handling

### Metrics Emitter
- [x] **Collection Loop**
  - [x] Collect every 30 seconds
  - [x] CPU usage percentage (calculated from Docker stats)
  - [x] Memory usage MB
  - [x] Network egress bytes (incremental)
  - [x] Disk usage MB
  - [x] Container uptime

- [x] **Send to API**
  - [x] POST /nodes/:nodeId/metrics
  - [x] Batch multiple servers in single request
  - [x] Retry on failure
  - [x] Buffer metrics during API downtime (up to 1000 samples)

### Crash Guard
- [x] Detect container crashes (monitor Docker events)
- [x] Restart with exponential backoff (2s base, 2x multiplier, 5min max)
- [x] Max restart attempts (5 attempts)
- [x] Send crash event to API with exit code
- [x] Mark server as FAILED after max attempts
- [x] Track restart state per container
- [x] Notify API on failures

---

## ✅ Phase 6: API Endpoints (NestJS) (P0) - COMPLETED

### Tenant Management
- [x] **List Tenants**
  - [x] GET /tenants
  - [x] Return user's tenants with role
  - [x] Include member counts

- [x] **Create Tenant**
  - [x] POST /tenants
  - [x] Validate slug uniqueness
  - [x] Auto-assign creator as OWNER
  - [x] Redis-based active tenant tracking

- [x] **Get Current Tenant**
  - [x] GET /tenants/current
  - [x] Based on Redis session

- [x] **Switch Tenant**
  - [x] POST /tenants/:id/switch
  - [x] Update Redis session context
  - [x] Tenant access verification

- [x] **Invite Member**
  - [x] POST /tenants/:id/members/invite
  - [x] Email-based member lookup
  - [x] Set role (ADMIN, SUPPORT, MEMBER)
  - [x] Permission check: OWNER or ADMIN

- [x] **Remove Member**
  - [x] DELETE /tenants/:id/members/:userId
  - [x] Prevent removing owner
  - [x] Permission check: OWNER or ADMIN

- [x] **Change Member Role**
  - [x] PATCH /tenants/:id/members/:userId
  - [x] Permission check: OWNER or ADMIN
  - [x] Prevent changing owner role

### Server Management
- [x] **Create Server**
  - [x] POST /servers
  - [x] Input: nodeId, blueprintId, resource limits
  - [x] Validate: tenant access, blueprint exists, node exists
  - [x] Enqueue InstallServer job
  - [x] Return server with status INSTALLING
  - [x] Tenant-scoped

- [x] **List Servers**
  - [x] GET /servers
  - [x] Tenant-scoped
  - [x] Returns all servers for active tenant

- [x] **Get Server**
  - [x] GET /servers/:id
  - [x] Tenant-scoped with access check
  - [x] Returns server details

- [x] **Update Server**
  - [x] PATCH /servers/:id
  - [x] Update limits (CPU, memory, disk)
  - [x] Enqueue UpdateServer job
  - [x] Tenant-scoped

- [x] **Delete Server**
  - [x] DELETE /servers/:id
  - [x] Enqueue DeleteServer job
  - [x] Tenant-scoped

- [x] **Server Actions**
  - [x] POST /servers/:id/power
  - [x] Actions: start, stop, restart, kill
  - [x] Enqueue server action jobs
  - [x] Validate server installation status

- [ ] **Console WebSocket** (TODO: Requires Wings proxy implementation)
  - [ ] GET /servers/:id/console/ws
  - [ ] Upgrade to WebSocket
  - [ ] Authenticate via JWT in query param
  - [ ] Proxy to Wings WebSocket
  - [ ] Send commands via WS message

- [ ] **File Operations** (TODO: Requires Wings proxy implementation)
  - [ ] GET /servers/:id/files
  - [ ] GET /servers/:id/files/content
  - [ ] PUT /servers/:id/files/content
  - [ ] POST /servers/:id/files/upload
  - [ ] DELETE /servers/:id/files
  - [ ] POST /servers/:id/files/compress
  - [ ] POST /servers/:id/files/extract
  - [ ] Proxy to Wings with auth

- [ ] **RCON** (TODO: Requires Wings proxy implementation)
  - [ ] POST /servers/:id/rcon
  - [ ] Body: { command: string }
  - [ ] Proxy to Wings RCON endpoint

- [x] **Backups**
  - [x] GET /servers/:serverId/backups
  - [x] POST /servers/:serverId/backups (create)
  - [x] POST /servers/:serverId/backups/:backupId/restore
  - [x] DELETE /servers/:serverId/backups/:backupId
  - [x] Enqueue BackupServer and RestoreBackup jobs
  - [x] Tenant-scoped via server access check

### Node Management (mTLS Only)
- [x] **Heartbeat**
  - [x] POST /nodes/heartbeat
  - [x] Update last_heartbeat timestamp in Redis & DB
  - [x] Verify client cert with MtlsAuthGuard
  - [x] Extract node_id from cert CN

- [x] **Report Metrics**
  - [x] POST /nodes/metrics
  - [x] Batch: array of { serverId, timestamp, cpu, mem, net, disk }
  - [x] Insert raw samples into raw_metrics_samples
  - [x] Verify mTLS with MtlsAuthGuard

- [x] **Report Events**
  - [x] POST /nodes/events
  - [x] Event types: crash, restart, error
  - [x] Store in audit_logs table
  - [x] Verify mTLS with MtlsAuthGuard

### Metrics
- [x] **Get Server Metrics**
  - [x] GET /metrics/servers/:serverId
  - [x] Query params: start, end (date range)
  - [x] Return hourly aggregated metrics
  - [x] Tenant-scoped via server access check
  - [x] GET /metrics/servers/:serverId/current for real-time data

### Billing
- [x] **List Products**
  - [x] GET /billing/products
  - [x] Return active products from database

- [x] **Get Subscriptions**
  - [x] GET /billing/subscriptions
  - [x] Tenant-scoped
  - [x] Return all tenant subscriptions

- [ ] **Create Subscription** (TODO: Requires Stripe integration)
  - [ ] POST /billing/subscribe
  - [ ] Input: priceIds, paymentMethodId
  - [ ] Create Stripe customer if not exists
  - [ ] Create Stripe subscription
  - [ ] Store in subscriptions table

- [ ] **Cancel Subscription** (TODO: Requires Stripe integration)
  - [ ] POST /billing/subscription/cancel
  - [ ] Cancel at period end
  - [ ] Update subscriptions table

- [x] **Billing Portal**
  - [x] POST /billing/portal
  - [x] Returns portal URL (placeholder)
  - [x] Tenant-scoped

- [x] **List Invoices**
  - [x] GET /billing/invoices
  - [x] Tenant-scoped
  - [x] Return invoices from database

### Webhooks (apps/billing-webhooks)
- [ ] **Stripe Webhook Endpoint**
  - [ ] POST /webhooks/stripe
  - [ ] Verify signature
  - [ ] Store in webhook_events table
  - [ ] Idempotency: check event_id

- [ ] **Event Handlers**
  - [ ] invoice.payment_succeeded → mark invoice as paid
  - [ ] invoice.payment_failed → send notification, suspend if needed
  - [ ] customer.subscription.created → update subscriptions table
  - [ ] customer.subscription.updated → update status
  - [ ] customer.subscription.deleted → mark canceled, suspend servers
  - [ ] invoice.finalized → report usage records

- [ ] **Usage Reporting**
  - [ ] Query usage_records for period
  - [ ] Report to Stripe Billing
  - [ ] Mark as reported

### Audit Logs
- [x] **List Audit Logs**
  - [x] GET /audit/logs
  - [x] Tenant-scoped
  - [x] Pagination (limit, offset)
  - [x] Returns audit logs from database

### Admin Endpoints (Feature-Gated)
- [x] **System Overview**
  - [x] GET /admin/system/overview
  - [x] Permission: admin role check
  - [x] Returns counts (tenants, servers, users, nodes)

- [x] **List All Tenants**
  - [x] GET /admin/tenants
  - [x] Permission: admin role check
  - [x] Returns all tenants

- [x] **List All Nodes**
  - [x] GET /admin/nodes
  - [x] Permission: admin role check
  - [x] Returns all nodes

- [ ] **List Allocations** (TODO: Optional)
  - [ ] GET /admin/allocations
  - [ ] Filter by node, status

- [ ] **Job Queue Health** (TODO: Optional)
  - [ ] GET /admin/jobs/health
  - [ ] Return queue depths, fail rates

---

## 💻 Phase 7: Web Application UI (P0)

### Tenant Switcher & Org Settings
- [ ] **Tenant Switcher Component**
  - [ ] Dropdown in header
  - [ ] List all user tenants
  - [ ] Switch tenant action
  - [ ] Refresh UI on switch

- [ ] **Org Settings Page**
  - [ ] General: name, slug, plan
  - [ ] Members list with roles
  - [ ] Invite member form
  - [ ] Change member role
  - [ ] Remove member
  - [ ] Audit log viewer

### Create Server Wizard
- [ ] **Step 1: Select Game/Blueprint**
  - [ ] Grid of game cards (Minecraft, Valheim)
  - [ ] Show available blueprints per game
  - [ ] Description and requirements

- [ ] **Step 2: Select Node & Limits**
  - [ ] Node selector (show capacity)
  - [ ] CPU slider (millicores)
  - [ ] Memory slider (MB)
  - [ ] Disk slider (GB)
  - [ ] Real-time cost estimate

- [ ] **Step 3: Review & Create**
  - [ ] Summary of selections
  - [ ] Estimated cost breakdown
  - [ ] Terms acceptance
  - [ ] Create button (calls POST /servers)

- [ ] **Creation Progress**
  - [ ] Show installation status
  - [ ] Stream install logs (WebSocket)
  - [ ] Redirect to server detail on success

### Server Detail Page
- [ ] **Server Overview Tab**
  - [ ] Server name and status badge
  - [ ] Quick stats: CPU, RAM, Disk, Uptime
  - [ ] Power controls: Start, Stop, Restart, Kill
  - [ ] Update server settings button
  - [ ] Delete server button (danger zone)

- [ ] **Console Tab**
  - [ ] Live log output (WebSocket)
  - [ ] Auto-scroll toggle
  - [ ] Command input (RCON or stdin)
  - [ ] Copy/export logs
  - [ ] Color-coded output
  - [ ] Timestamps

- [ ] **File Manager Tab**
  - [ ] Breadcrumb navigation
  - [ ] File/folder tree view
  - [ ] File list with icons, sizes, dates
  - [ ] Upload button (single/multiple)
  - [ ] Download file
  - [ ] Edit file (syntax highlighting)
  - [ ] Create folder
  - [ ] Rename/delete operations
  - [ ] Compress/extract actions
  - [ ] Context menu

- [ ] **Backups Tab**
  - [ ] List backups with size, date
  - [ ] Create backup button
  - [ ] Restore backup button
  - [ ] Download backup
  - [ ] Delete backup
  - [ ] Show backup progress
  - [ ] Scheduled backups (future)

- [ ] **Metrics Tab**
  - [ ] Time range selector (1h, 24h, 7d, 30d)
  - [ ] CPU usage chart
  - [ ] Memory usage chart
  - [ ] Network egress chart
  - [ ] Disk usage gauge
  - [ ] Export metrics data

- [ ] **Settings Tab**
  - [ ] Startup configuration
  - [ ] Environment variables
  - [ ] Resource limits (if allowed)
  - [ ] Danger zone: reinstall, delete

### Billing Page
- [ ] **Plan Picker**
  - [ ] Card layout for Starter/Pro/Premium
  - [ ] Feature comparison
  - [ ] Pricing details
  - [ ] Subscribe button

- [ ] **Payment Method**
  - [ ] Stripe Elements integration
  - [ ] Add/update card
  - [ ] Default payment method indicator

- [ ] **Current Subscription**
  - [ ] Plan name and status
  - [ ] Current period and renewal date
  - [ ] Usage this period (meters)
  - [ ] Estimated next invoice
  - [ ] Change plan button
  - [ ] Cancel subscription button

- [ ] **Invoices**
  - [ ] List past invoices
  - [ ] Amount, date, status
  - [ ] Download PDF
  - [ ] View hosted invoice

- [ ] **Billing Portal Link**
  - [ ] Redirect to Stripe portal for management

### Notifications Settings
- [ ] **Channel Toggles**
  - [ ] Email notifications (on/off per event type)
  - [ ] Discord webhook URL
  - [ ] Web push (optional)

- [ ] **Event Types**
  - [ ] Server status changes
  - [ ] Backup completion
  - [ ] Billing events
  - [ ] Security alerts

### Admin Panel (Feature-Gated)
- [ ] **System Dashboard**
  - [ ] Total tenants, servers, nodes
  - [ ] Revenue metrics
  - [ ] System health indicators

- [ ] **Nodes Management**
  - [ ] List all nodes
  - [ ] Node capacity gauges
  - [ ] Add/edit/delete node
  - [ ] Maintenance mode toggle

- [ ] **Stuck Jobs View**
  - [ ] List jobs in dead letter queue
  - [ ] Retry job button
  - [ ] View job details and errors

- [ ] **Incidents**
  - [ ] Recent errors and crashes
  - [ ] Affected servers
  - [ ] Resolution status

---

## 💰 Phase 8: Usage Metering & Billing Loop (P0)

### Meter Definitions
- [ ] **Define Meters**
  - [ ] ram_mb_hours (MB * hours)
  - [ ] cpu_millicore_hours (millicores * hours)
  - [ ] disk_gb_month (GB * days / 30)
  - [ ] egress_gb (network out in GB)

### Metrics Aggregation (apps/worker)
- [ ] **Raw Samples Collection**
  - [ ] Wings sends samples every 30s
  - [ ] Store in raw_metrics table (or buffer in Redis)

- [ ] **Hourly Aggregation Job**
  - [ ] Run every hour (cron: 0 * * * *)
  - [ ] Query raw samples for past hour
  - [ ] Calculate averages: cpu_avg, mem_avg
  - [ ] Calculate totals: egress_total
  - [ ] Insert into metrics_hourly
  - [ ] Delete or archive raw samples

- [ ] **Usage Record Creation**
  - [ ] Query metrics_hourly for billing period
  - [ ] Group by server, tenant, subscription
  - [ ] Calculate meter quantities:
    - [ ] ram_mb_hours = sum(mem_mb_avg * 1)
    - [ ] cpu_millicore_hours = sum(cpu_avg * 1)
    - [ ] disk_gb_month = sum(disk_gb * days / 30)
    - [ ] egress_gb = sum(egress_mb_total / 1024)
  - [ ] Insert into usage_records
  - [ ] Mark as pending

### Stripe Reporting
- [ ] **Report Usage to Stripe**
  - [ ] On invoice finalization webhook
  - [ ] Query pending usage_records for subscription
  - [ ] Call Stripe Usage Records API
  - [ ] Mark usage_records as reported
  - [ ] Store stripe_usage_record_id

- [ ] **Handle Usage Sync Failures**
  - [ ] Retry with exponential backoff
  - [ ] Alert admin on repeated failures

### Subscription Plans
- [ ] **Create Stripe Products**
  - [ ] Starter Plan: flat $10/mo + overage on ram_mb_hours
  - [ ] Pro Plan: flat $50/mo + better overage rates
  - [ ] Premium Plan: flat $200/mo + even better rates

- [ ] **Create Stripe Prices**
  - [ ] Flat recurring price
  - [ ] Metered price for ram_mb_hours (tiered or unit-based)
  - [ ] Sync to products/prices tables

### Suspension & Resumption
- [ ] **Suspend on past_due**
  - [ ] Webhook: customer.subscription.updated (status=past_due)
  - [ ] Mark tenant as SUSPENDED
  - [ ] Stop all servers
  - [ ] API guard: block server operations for suspended tenants
  - [ ] Send notification

- [ ] **Resume on paid**
  - [ ] Webhook: invoice.payment_succeeded
  - [ ] Mark tenant as ACTIVE
  - [ ] Allow server operations
  - [ ] Send notification

---

## 📈 Phase 9: Observability (P0)

### Prometheus & Grafana
- [ ] **Prometheus Setup**
  - [ ] Add Prometheus to docker-compose.yml
  - [ ] Configure scrape endpoints for API, worker
  - [ ] API metrics: HTTP request count, duration, error rate
  - [ ] Worker metrics: job count, duration, fail rate, queue depth

- [ ] **API Metrics Instrumentation**
  - [ ] Use prom-client for Node.js
  - [ ] Middleware for HTTP metrics
  - [ ] Custom metrics: active tenants, servers, nodes

- [ ] **Worker Metrics Instrumentation**
  - [ ] Job start/complete/fail counters
  - [ ] Job duration histogram
  - [ ] Queue depth gauge

- [ ] **Grafana Dashboards**
  - [ ] HTTP p50/p95/p99 latency
  - [ ] Error rate by endpoint
  - [ ] Queue depth by queue name
  - [ ] Job success/fail rate
  - [ ] Active servers count
  - [ ] Node capacity utilization

### Sentry Error Tracking
- [ ] **Sentry Integration**
  - [ ] Add Sentry to apps/web
  - [ ] Add Sentry to apps/api
  - [ ] Add Sentry to apps/worker
  - [ ] Configure error sampling
  - [ ] Source map upload for frontend

- [ ] **Error Context**
  - [ ] Attach user ID, tenant ID
  - [ ] Attach request ID
  - [ ] Attach breadcrumbs

### Status Page
- [ ] **Status Page (apps/web)**
  - [ ] Route: /status
  - [ ] API health check
  - [ ] Database connection status
  - [ ] Redis connection status
  - [ ] Queue depth indicators
  - [ ] Node heartbeat status
  - [ ] Recent incidents (optional)

---

## ⚖️ Phase 10: Legal & Data Export (P0)

### Legal Pages
- [ ] **Terms of Service**
  - [ ] Create /legal/terms page
  - [ ] Content: service description, user obligations, liability, termination

- [ ] **Privacy Policy**
  - [ ] Create /legal/privacy page
  - [ ] Content: data collection, usage, sharing, retention, GDPR rights

- [ ] **Refund Policy**
  - [ ] Create /legal/refund page
  - [ ] Content: refund conditions, process, timeframes

- [ ] **Acceptable Use Policy**
  - [ ] Create /legal/aup page
  - [ ] Content: prohibited activities, enforcement

- [ ] **DMCA Policy**
  - [ ] Create /legal/dmca page
  - [ ] Content: notice procedure, counter-notice, repeat infringers

### Tenant Data Export
- [ ] **Export Job (apps/worker)**
  - [ ] Query all tenant data: servers, backups, invoices, audit logs
  - [ ] Generate JSON export
  - [ ] Package backup files
  - [ ] Upload to S3 with pre-signed URL
  - [ ] Notify user with download link

- [ ] **Export Endpoint**
  - [ ] POST /tenants/:id/export
  - [ ] Enqueue export job
  - [ ] Return job ID

- [ ] **Tenant Deletion**
  - [ ] POST /tenants/:id/delete
  - [ ] Soft delete with grace period (30 days)
  - [ ] Delete all servers
  - [ ] Cancel subscription
  - [ ] Mark as DELETED
  - [ ] Schedule permanent deletion job

---

## 🛠️ Phase 11: Developer Ergonomics (P0)

### Development Scripts
- [ ] **scripts/dev:ca**
  - [ ] Generate development CA
  - [ ] Issue client certificates for local Wings
  - [ ] Trust certificates in system store
  - [ ] Document usage

- [ ] **scripts/dev:seed**
  - [ ] Run database migrations
  - [ ] Seed demo tenant
  - [ ] Seed users, nodes, servers
  - [ ] Seed Stripe test subscription
  - [ ] Seed sample metrics and backups
  - [ ] Print credentials

### Docker Compose Enhancements
- [ ] Add apps/worker service
- [ ] Add apps/billing-webhooks service
- [ ] Add MinIO service (S3-compatible storage)
- [ ] Add Prometheus service
- [ ] Add Grafana service
- [ ] Volume persistence
- [ ] Health checks
- [ ] Network configuration

### Makefile
- [ ] **make up**
  - [ ] Start all services with docker-compose

- [ ] **make seed**
  - [ ] Run seed script

- [ ] **make test**
  - [ ] Run all tests (unit, integration)

- [ ] **make db:migrate**
  - [ ] Run Drizzle migrations

- [ ] **make db:seed**
  - [ ] Run seed script

- [ ] **make clean**
  - [ ] Stop and remove containers
  - [ ] Clean volumes

---

## 🧪 Phase 12: Tests & Acceptance (P0)

### Unit Tests
- [ ] **Allocator Tests**
  - [ ] Concurrent port reservations (no conflicts)
  - [ ] IP allocation exhaust handling
  - [ ] Leak scanner finds orphans
  - [ ] Release by owner frees resources

- [ ] **RBAC Tests**
  - [ ] Permission checks: allow/deny scenarios
  - [ ] Role hierarchy enforcement
  - [ ] Tenant isolation

- [ ] **Metrics Aggregation Tests**
  - [ ] Hourly rollup calculations
  - [ ] Usage record generation
  - [ ] Edge cases: no data, partial data

### Integration Tests
- [ ] **InstallServer Flow**
  - [ ] Create server via API
  - [ ] Job enqueued
  - [ ] Allocation reserved
  - [ ] Wings receives create request
  - [ ] Server marked as RUNNING
  - [ ] Allocation recorded

- [ ] **File Operations**
  - [ ] Upload file
  - [ ] Read file contents
  - [ ] Edit file
  - [ ] Delete file
  - [ ] Compress/extract

- [ ] **Console Streaming**
  - [ ] WebSocket connection established
  - [ ] Logs streamed in real-time
  - [ ] Commands sent and executed

- [ ] **Backup & Restore**
  - [ ] Create backup
  - [ ] Upload to storage
  - [ ] Restore from backup
  - [ ] Server data intact

- [ ] **Stripe Integration**
  - [ ] Create test subscription
  - [ ] Webhook received and processed
  - [ ] Usage reported
  - [ ] Invoice generated
  - [ ] Billing portal session created

### End-to-End Tests (Playwright)
- [ ] **User Journey**
  - [ ] Sign up and verify email
  - [ ] Create organization
  - [ ] Subscribe to plan (Stripe test mode)
  - [ ] Provision Minecraft server
  - [ ] View server console and metrics
  - [ ] Create backup
  - [ ] View invoices

---

## ✅ Alpha Done Definition

All of the following must be true:

- [ ] **Tenant Isolation**: All queries are tenant-scoped; users cannot access other tenants' data
- [ ] **Audited Actions**: All critical actions logged in audit_logs table
- [ ] **mTLS Required**: Wings nodes authenticate with client certificates
- [ ] **Server Lifecycle**: Servers can be created, started, stopped, backed up, restored via UI
- [ ] **Metrics Visible**: Metrics charts display in server detail page
- [ ] **Stripe Test Sub Active**: Demo tenant has active Stripe subscription, invoices generated
- [ ] **Status Page Green**: /status page shows all services healthy
- [ ] **Tests Passing**: All unit, integration, and E2E tests pass
- [ ] **Documentation**: README updated with alpha features, setup instructions

---

## 📊 Estimated Timeline (Single Developer)

- **Phase 0**: ✅ COMPLETED
- **Phase 1**: 1 week (new apps/packages setup)
- **Phase 2**: 2 weeks (database schema & migrations)
- **Phase 3**: 1 week (security hardening)
- **Phase 4**: 2 weeks (allocator & job pipeline)
- **Phase 5**: 2 weeks (Wings enhancements)
- **Phase 6**: 3 weeks (API endpoints)
- **Phase 7**: 3 weeks (web UI)
- **Phase 8**: 1 week (billing loop)
- **Phase 9**: 1 week (observability)
- **Phase 10**: 3 days (legal & export)
- **Phase 11**: 3 days (dev ergonomics)
- **Phase 12**: 1 week (testing)

**Total**: ~17-18 weeks (4-4.5 months) for Alpha release

---

**Last Updated**: 2025-01-12
**Version**: 2.0.0 - Alpha Development
**Status**: Phases 0-5 Complete (Foundation, Architecture, Database, Security, Jobs, Wings), Phase 6 (API Endpoints) Starting

---

## 📊 Progress Summary

### Completed Phases (5/12)
- ✅ **Phase 0**: Foundation (Turborepo, Docker, CI/CD)
- ✅ **Phase 1**: Alpha Core Architecture (Packages: authz, alloc, metrics, audit, notifications, blueprints)
- ✅ **Phase 2**: Database Schema & Migrations (20+ tables, seed data)
- ✅ **Phase 3**: Security Hardening (mTLS, JWT, encryption, rate limiting)
- ✅ **Phase 4**: Allocator & Job Pipeline (BullMQ processors, allocation strategies)
- ✅ **Phase 5**: Wings Daemon Enhancements (metrics, crash guard, console, files, RCON)

### In Progress
- 🔨 **Phase 6**: API Endpoints (NestJS) - Next up

### Remaining Alpha Scope
- Phase 7: Web Application UI
- Phase 8: Usage Metering & Billing Loop
- Phase 9: Observability (Prometheus, Grafana, Sentry)
- Phase 10: Legal & Data Export
- Phase 11: Developer Ergonomics
- Phase 12: Tests & Acceptance

**Alpha Completion**: 41.7% (5/12 phases complete)
**Estimated Time to Alpha**: ~12-14 weeks remaining
