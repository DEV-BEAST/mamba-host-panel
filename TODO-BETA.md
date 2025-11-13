# Mamba Host Panel - Beta TODO List

**Last Updated**: 2025-11-13
**Status**: Pre-Beta Development
**Estimated Beta Release**: 8-12 weeks from critical items completion

---

## 📋 Overview

This document tracks all outstanding work required to reach production-ready beta status. Items are organized by priority level to guide development efforts.

### Priority Definitions

- **🔴 CRITICAL**: Blocking issues that prevent production deployment
- **🟠 HIGH**: Required for beta release and core functionality
- **🟡 MEDIUM**: Important features that improve user experience
- **🟢 LOW**: Future enhancements and optimizations

### Quick Stats

- Total Critical Items: 8
- Total High Priority Items: 8
- Total Medium Priority Items: 7
- Total Low Priority Items: 5

---

## 🔴 CRITICAL PRIORITY

### 1. Wings API Integration

**Status**: ❌ Not Implemented
**Blocking**: Core server management functionality
**Estimated Effort**: 2-3 weeks

#### Missing Implementation

- [ ] **Server Lifecycle Operations**
  - File: `apps/worker/src/jobs/servers/servers.processor.ts`
  - Lines: 154, 169, 183, 286, 298, 348, 372, 445, 459, 510
  - All Wings API calls currently simulated with `[SIMULATED]` log messages
  - Need to implement actual HTTP client for Wings daemon

- [ ] **Required Operations**
  - Server creation and provisioning
  - Server start/stop/restart/kill
  - Server deletion and cleanup
  - Server configuration updates
  - Health check implementation (currently simulated)
  - Power state management

- [ ] **Wings Client Implementation**
  - Create robust HTTP client with retry logic
  - Implement authentication/authorization with Wings
  - Add timeout and circuit breaker patterns
  - Handle Wings API errors gracefully
  - Add request/response logging

#### Acceptance Criteria

- ✅ Can create servers on Wings nodes
- ✅ Can start/stop/restart/kill servers
- ✅ Can delete servers and clean up resources
- ✅ Health checks reflect actual Wings daemon status
- ✅ Error handling for Wings API failures
- ✅ Proper timeout handling for long operations

---

### 2. Backup Storage Integration (S3/MinIO)

**Status**: ❌ Not Implemented
**Blocking**: Backup functionality
**Estimated Effort**: 1-2 weeks

#### Missing Implementation

- [ ] **Backup Storage Service**
  - File: `apps/worker/src/jobs/backups/backups.processor.ts`
  - Lines: 113, 125, 136, 270, 282, 298, 384, 415
  - All backup operations currently simulated
  - Need S3-compatible storage client (AWS S3, MinIO, DigitalOcean Spaces, etc.)

- [ ] **Required Operations**
  - Upload backup archives to S3
  - Download backup archives from S3
  - Delete backups from S3
  - List backups in bucket
  - Generate pre-signed download URLs
  - Handle multi-part uploads for large backups

- [ ] **Storage Configuration**
  - Add S3 configuration to environment variables
  - Support multiple storage providers (S3, MinIO, Spaces)
  - Implement bucket creation and management
  - Add storage quota tracking
  - Configure lifecycle policies for old backups

#### Files to Update

- `apps/worker/src/jobs/backups/backups.processor.ts` - Implement actual storage operations
- `apps/api/src/backups/backups.service.ts:119` - Implement S3 deletion
- `.env.example` - Add S3/MinIO configuration variables

#### Acceptance Criteria

- ✅ Backups uploaded to S3-compatible storage
- ✅ Backups can be downloaded and restored
- ✅ Backup deletion removes from both DB and storage
- ✅ Storage quota enforced per tenant
- ✅ Pre-signed URLs for secure downloads
- ✅ Automatic cleanup of old backups

---

### 3. Stripe Billing Integration

**Status**: ⚠️ Partially Implemented
**Blocking**: Monetization and billing
**Estimated Effort**: 1-2 weeks

#### Missing Implementation

- [ ] **Billing Portal**
  - File: `apps/api/src/billing/billing.service.ts:71-73`
  - Currently returns placeholder URL
  - Need actual Stripe portal session creation

- [ ] **Usage Reporting**
  - File: `apps/worker/src/jobs/metrics/metrics.processor.ts:293-315`
  - Stripe usage reporting API not integrated
  - Usage-based billing not functional

- [ ] **Webhook Handlers**
  - File: `apps/billing-webhooks/src/handlers/stripe.ts`
  - Lines: 159, 181, 184, 199, 267
  - Missing implementations:
    - Tenant reactivation logic
    - Notification sending
    - Tenant suspension logic
    - Usage reporting to Stripe

#### Required Tasks

- [ ] Implement Stripe billing portal session creation
- [ ] Create Stripe customer on user registration
- [ ] Sync subscription status from Stripe to database
- [ ] Report usage metrics to Stripe API
- [ ] Handle subscription lifecycle events (created, updated, canceled)
- [ ] Implement tenant suspension/reactivation on payment failure
- [ ] Send billing notifications (payment failed, subscription ending, etc.)
- [ ] Create invoice generation and viewing
- [ ] Add payment method management

#### Environment Variables Needed

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

#### Acceptance Criteria

- ✅ Users can access Stripe billing portal
- ✅ Usage metrics reported to Stripe for metered billing
- ✅ Subscriptions sync correctly from Stripe
- ✅ Failed payments trigger tenant suspension
- ✅ Payment success reactivates suspended tenants
- ✅ Users receive email notifications for billing events

---

### 4. Authentication Input Validation

**Status**: ❌ Missing Validation
**Security Risk**: High - XSS, Injection, Malformed Data
**Estimated Effort**: 1-2 days

#### Issue

Authentication DTOs lack validation decorators, allowing malformed or malicious input.

#### Files to Update

- [ ] **apps/api/src/auth/auth.controller.ts**
  - Lines 5-18: Add class-validator decorators to DTOs
  - `RegisterDto`, `LoginDto`, `RefreshDto` need validation

#### Implementation

```typescript
// Example for RegisterDto
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
```

#### Required Validation Rules

- [ ] Email: Valid email format, max length
- [ ] Password: Min 8 chars, max 128 chars, strong password rules
- [ ] Name: Optional, max length, alphanumeric + spaces
- [ ] Refresh token: Required, UUID or JWT format

#### Additional Security Hardening

- [ ] Add rate limiting to auth endpoints (5 attempts per 15 minutes)
- [ ] Sanitize all user input before database storage
- [ ] Add CAPTCHA on registration to prevent bots
- [ ] Implement account lockout after failed login attempts
- [ ] Add email verification requirement before full access

#### Acceptance Criteria

- ✅ All auth DTOs validated with class-validator
- ✅ Invalid input returns 400 with clear error messages
- ✅ Rate limiting prevents brute force attacks
- ✅ No XSS or injection vectors in auth flow

---

### 5. Secure Configuration Management

**Status**: ⚠️ Insecure Defaults
**Security Risk**: High - Production deployment with default secrets
**Estimated Effort**: 1 day

#### Issues

- [ ] **Default JWT Secret**
  - File: `apps/api/src/config/configuration.ts:10`
  - Default: `'your-secret-key'`
  - Risk: Production deployments vulnerable to token forgery

- [ ] **Default NextAuth Secret**
  - File: `.env.example:8`
  - Default: `NEXTAUTH_SECRET=your-secret-key-here-change-in-production`
  - Risk: Session hijacking in production

- [ ] **Empty Stripe Keys**
  - File: `apps/billing-webhooks/src/handlers/stripe.ts:6,31`
  - Fallback to empty strings
  - Risk: Webhook signature verification fails silently

#### Required Changes

- [ ] Remove all default secrets from code
- [ ] Throw error on startup if required secrets are missing
- [ ] Add secret validation (minimum entropy check)
- [ ] Create secure secret generation script
- [ ] Update documentation with secret management best practices
- [ ] Add warning banner in logs if using default/weak secrets

#### Secret Generation Script

```bash
# Generate secure random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Environment Variable Validation

```typescript
// Add to configuration.ts
export default () => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === 'your-secret-key') {
    throw new Error('JWT_SECRET must be set to a secure random value');
  }
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  // ... validate other secrets
};
```

#### Acceptance Criteria

- ✅ Application refuses to start with missing/weak secrets
- ✅ Clear error messages guide users to set secure values
- ✅ Documentation includes secret generation instructions
- ✅ No default secrets in code

---

### 6. Database Migrations

**Status**: ❌ Missing
**Blocking**: Production deployments and upgrades
**Estimated Effort**: 1 week

#### Issue

No database migration files found. Schema changes cannot be tracked or applied safely to production databases.

#### Required Implementation

- [ ] **Migration System Setup**
  - Choose migration tool (Drizzle Kit, node-pg-migrate, Knex, etc.)
  - Configure migration directory and settings
  - Create initial migration from current schema

- [ ] **Initial Migration**
  - Export current schema to SQL migration
  - Include all tables, indexes, constraints
  - Add seed data for default roles/permissions

- [ ] **Migration Workflow**
  - Document how to create new migrations
  - Add migration commands to package.json
  - Create CI/CD integration for automated migrations
  - Add rollback support

#### Recommended Tools

**Option 1: Drizzle Kit** (matches existing ORM)
```bash
pnpm add -D drizzle-kit
```

**Option 2: node-pg-migrate**
```bash
pnpm add -D node-pg-migrate
```

#### Directory Structure

```
packages/db/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_add_indexes.sql
│   └── 003_rbac_system.sql
├── seeds/
│   ├── 001_default_roles.sql
│   └── 002_default_blueprints.sql
└── migrate.ts
```

#### Required Scripts

```json
{
  "scripts": {
    "db:migrate": "node-pg-migrate up",
    "db:migrate:down": "node-pg-migrate down",
    "db:migrate:create": "node-pg-migrate create",
    "db:seed": "node scripts/seed.ts"
  }
}
```

#### Acceptance Criteria

- ✅ Initial migration captures complete current schema
- ✅ Migrations can be applied forward and rolled back
- ✅ CI/CD runs migrations automatically
- ✅ Documentation includes migration workflow
- ✅ Seed data for defaults (roles, blueprints, etc.)

---

### 7. RBAC Authorization Enforcement

**Status**: ⚠️ System Exists But Not Enforced
**Security Risk**: High - Unauthorized access possible
**Estimated Effort**: 1-2 weeks

#### Issue

Permission system is defined in database but not enforced at API layer. Most endpoints only check authentication, not authorization.

#### Current State

- ✅ RBAC schema exists (roles, permissions, role_bindings)
- ✅ `RequirePermissionGuard` guard exists
- ❌ Guard not applied to most controllers
- ❌ No UI for role management
- ❌ No resource-level authorization

#### Required Implementation

- [ ] **Apply Permission Guards**
  - Audit all API endpoints
  - Apply `@UseGuards(RequirePermissionGuard)` to protected routes
  - Define required permissions for each endpoint
  - Document permission requirements

- [ ] **Permission Definitions**
  - Create centralized permission constants
  - Map CRUD operations to permissions
  - Define hierarchical permissions (admin > user)
  - Add wildcard permissions for admin roles

- [ ] **Resource-Level Authorization**
  - Verify server ownership before operations
  - Check tenant membership for tenant resources
  - Validate backup ownership
  - Enforce node access restrictions

- [ ] **Admin UI for Role Management**
  - Create role management page
  - List/Create/Update/Delete roles
  - Assign permissions to roles
  - Assign roles to users
  - View effective permissions for users

#### Files to Update

- [ ] All controllers in `apps/api/src/*/\*.controller.ts`
- [ ] `packages/authz/src/index.ts` - Add permission constants
- [ ] Create `apps/web/src/app/(dashboard)/admin/roles/page.tsx`
- [ ] `apps/api/src/auth/guards/jwt-auth.guard.ts` - Enhance with tenant context

#### Permission Structure Example

```typescript
// packages/authz/src/permissions.ts
export const Permissions = {
  // Server permissions
  'servers:create': 'Create new servers',
  'servers:read': 'View servers',
  'servers:update': 'Modify server settings',
  'servers:delete': 'Delete servers',
  'servers:console': 'Access server console',
  'servers:files': 'Access server files',

  // Tenant permissions
  'tenants:admin': 'Full tenant administration',
  'tenants:billing': 'View and manage billing',
  'tenants:members': 'Manage team members',

  // ... etc
} as const;
```

#### Controller Example

```typescript
@Controller('servers')
export class ServersController {
  @Post()
  @UseGuards(JwtAuthGuard, RequirePermissionGuard)
  @RequirePermission('servers:create')
  create(@Body() dto: CreateServerDto) {
    // ...
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RequirePermissionGuard, ServerOwnershipGuard)
  @RequirePermission('servers:delete')
  delete(@Param('id') id: string) {
    // ...
  }
}
```

#### Acceptance Criteria

- ✅ All API endpoints have permission checks
- ✅ Resource ownership verified before operations
- ✅ Tenant isolation enforced at API layer
- ✅ Admin UI for role and permission management
- ✅ Audit log captures permission checks
- ✅ Clear error messages for permission denials (403)
- ✅ Documentation of all permissions and their usage

---

### 8. Comprehensive Test Coverage

**Status**: ⚠️ Minimal Coverage (<5%)
**Blocking**: Production confidence and quality assurance
**Estimated Effort**: 3-4 weeks

#### Current State

Only 2 test files exist:
- `packages/billing/src/__tests__/metering.service.test.ts`
- `packages/alloc/src/__tests__/allocator.test.ts`

0% coverage for:
- API controllers
- Services
- Worker processors
- Authentication/authorization
- Database operations
- Frontend components

#### Required Testing Strategy

##### **Unit Tests (Target: 70% coverage)**

- [ ] **Authentication & Authorization**
  - Test `AuthService` login/register/refresh/logout
  - Test JWT strategy and guards
  - Test permission checking logic
  - Test password hashing and validation

- [ ] **API Services**
  - Test all service methods in `apps/api/src/*/\*.service.ts`
  - Mock database calls
  - Test error handling
  - Test business logic

- [ ] **Worker Processors**
  - Test job processors with mocked external APIs
  - Test retry logic
  - Test error handling
  - Test state transitions

- [ ] **Shared Packages**
  - Test `@mambaPanel/authz` permission logic
  - Test `@mambaPanel/security` token generation
  - Test `@mambaPanel/billing` metering calculations (expand existing)
  - Test `@mambaPanel/alloc` resource allocation (expand existing)

##### **Integration Tests**

- [ ] **API Integration Tests**
  - Test complete request/response cycles
  - Test authentication flow
  - Test CRUD operations for each resource
  - Test error responses
  - Use test database

- [ ] **Database Tests**
  - Test Drizzle queries
  - Test transactions and rollbacks
  - Test constraints and validation
  - Test migrations

- [ ] **Worker Integration Tests**
  - Test complete job lifecycle
  - Test job dependencies
  - Test BullMQ queue operations
  - Test job failure and retry

##### **End-to-End Tests**

- [ ] **Critical User Flows**
  - User registration and login
  - Server creation and management
  - Backup creation and restore
  - Billing subscription flow
  - Team member management

- [ ] **Frontend E2E Tests** (Playwright/Cypress)
  - Test all pages load
  - Test form submissions
  - Test navigation
  - Test error states

##### **Load/Performance Tests**

- [ ] **API Load Tests**
  - Test concurrent requests
  - Test rate limiting
  - Test database connection pooling
  - Identify bottlenecks

- [ ] **Worker Load Tests**
  - Test job queue throughput
  - Test concurrent job processing
  - Test resource allocation under load

#### Testing Tools Setup

```json
{
  "devDependencies": {
    "@nestjs/testing": "^10.3.3",
    "jest": "^29.7.0",
    "supertest": "^6.3.4",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.5",
    "playwright": "^1.40.0",
    "k6": "^0.48.0"
  }
}
```

#### Test Organization

```
apps/api/
├── src/
│   └── auth/
│       ├── auth.service.ts
│       ├── auth.service.spec.ts  (unit)
│       ├── auth.controller.ts
│       └── auth.controller.spec.ts  (unit)
└── test/
    ├── integration/
    │   └── auth.e2e-spec.ts
    └── fixtures/
        └── test-data.ts

apps/worker/
├── src/
│   └── jobs/
│       └── servers/
│           ├── servers.processor.ts
│           └── servers.processor.spec.ts
└── test/
    └── integration/
        └── servers-jobs.spec.ts

apps/web/
├── src/
│   └── components/
│       └── auth/
│           ├── login-form.tsx
│           └── login-form.test.tsx
└── e2e/
    ├── auth.spec.ts
    └── servers.spec.ts
```

#### CI/CD Integration

- [ ] Run tests on every PR
- [ ] Enforce minimum coverage thresholds
- [ ] Generate coverage reports
- [ ] Block merges if tests fail
- [ ] Run E2E tests on staging deployment

#### Acceptance Criteria

- ✅ Minimum 70% unit test coverage
- ✅ All critical user flows covered by E2E tests
- ✅ Integration tests for all API endpoints
- ✅ Load tests establish performance baselines
- ✅ Tests run in CI/CD pipeline
- ✅ Coverage reports generated and tracked
- ✅ Flaky tests identified and fixed

---

## 🟠 HIGH PRIORITY

### 9. WebSocket Real-Time Updates

**Status**: ⚠️ Structure Exists, Logic Missing
**Impact**: No live console, no real-time stats
**Estimated Effort**: 1-2 weeks

#### Missing Implementation

- [ ] **Server Stats Gateway**
  - File: `apps/api/src/servers/servers.gateway.ts:21,27`
  - Subscribe/unsubscribe logic not implemented
  - Need to stream stats from Wings daemon

- [ ] **Console Gateway**
  - Not implemented
  - Need WebSocket proxy to Wings console
  - Handle authentication for console access

- [ ] **Real-Time Metrics**
  - Stream CPU, memory, network, disk stats
  - Update frequency: 1-5 seconds
  - Handle multiple subscribers per server

#### Implementation Plan

- [ ] Implement server subscription management
- [ ] Create Wings WebSocket proxy
- [ ] Add authentication/authorization checks
- [ ] Handle connection cleanup on disconnect
- [ ] Add rate limiting for WebSocket messages
- [ ] Implement console command sending
- [ ] Add console history buffer

#### Files to Create/Update

- `apps/api/src/servers/servers.gateway.ts` - Complete implementation
- `apps/api/src/console/console.gateway.ts` - New file
- `apps/api/src/common/wings/wings-websocket.service.ts` - New WebSocket client
- Frontend: `apps/web/src/hooks/useServerStats.ts` - Real-time stats hook
- Frontend: `apps/web/src/hooks/useConsole.ts` - Console WebSocket hook

#### Acceptance Criteria

- ✅ Real-time server stats update in UI
- ✅ Console displays live server output
- ✅ Commands can be sent to console
- ✅ Multiple users can view same console
- ✅ WebSocket connections properly cleaned up
- ✅ Authentication required for console access

---

### 10. Server Console & File Manager (Frontend)

**Status**: ❌ Not Implemented
**Impact**: Core features unavailable to users
**Estimated Effort**: 2 weeks

#### Missing Features

- [ ] **Server Console**
  - File: `apps/web/src/app/(dashboard)/servers/[id]/page.tsx:243`
  - Currently shows "Console feature coming soon"
  - Need terminal emulator component (xterm.js)
  - WebSocket connection to backend

- [ ] **File Manager**
  - Not implemented at all
  - Critical feature for game servers
  - Need file browser, upload, download, edit, delete
  - Code editor for config files

#### Implementation Plan

##### **Console Component**

- [ ] Install and integrate xterm.js
- [ ] Create console WebSocket hook
- [ ] Handle authentication
- [ ] Add command history
- [ ] Add terminal themes
- [ ] Handle ANSI colors and formatting
- [ ] Add copy/paste support
- [ ] Mobile-friendly terminal

##### **File Manager Component**

- [ ] Create file tree component
- [ ] Implement file operations (CRUD)
- [ ] Add bulk actions (multi-select)
- [ ] File upload with progress
- [ ] File download
- [ ] In-browser code editor (Monaco or CodeMirror)
- [ ] Syntax highlighting for config files
- [ ] File permissions display
- [ ] Search and filter files

##### **Backend API Endpoints**

- [ ] `GET /servers/:id/files` - List files
- [ ] `GET /servers/:id/files/download` - Download file
- [ ] `POST /servers/:id/files/upload` - Upload file
- [ ] `PUT /servers/:id/files` - Update file content
- [ ] `DELETE /servers/:id/files` - Delete file
- [ ] `POST /servers/:id/files/compress` - Create archive
- [ ] `POST /servers/:id/files/decompress` - Extract archive

#### Libraries to Use

```json
{
  "dependencies": {
    "xterm": "^5.3.0",
    "xterm-addon-fit": "^0.8.0",
    "xterm-addon-web-links": "^0.9.0",
    "@monaco-editor/react": "^4.6.0"
  }
}
```

#### Acceptance Criteria

- ✅ Real-time console with ANSI color support
- ✅ File browser shows directory tree
- ✅ Files can be uploaded and downloaded
- ✅ Files can be edited in browser
- ✅ Permission checks prevent unauthorized access
- ✅ Mobile-responsive design
- ✅ Keyboard shortcuts work

---

### 11. Metrics Visualization

**Status**: ❌ Not Implemented
**Impact**: Users cannot see historical performance data
**Estimated Effort**: 1 week

#### Missing Implementation

- [ ] **Chart Library Integration**
  - File: `apps/web/src/app/(dashboard)/servers/[id]/page.tsx:289`
  - Currently shows "Metrics charts coming soon"
  - Need chart library (Recharts, Chart.js, or similar)

- [ ] **Metrics Data Fetching**
  - API endpoint exists but not used
  - Need to fetch historical data
  - Display CPU, memory, network, disk over time

#### Implementation Plan

- [ ] Choose and install chart library (Recharts recommended)
- [ ] Create reusable chart components
- [ ] Fetch metrics data from API
- [ ] Add time range selector (1h, 6h, 24h, 7d, 30d)
- [ ] Add real-time updates to charts
- [ ] Add export functionality (CSV, PNG)
- [ ] Add metric alerts visualization

#### Chart Types Needed

- [ ] **CPU Usage** - Line chart, percentage over time
- [ ] **Memory Usage** - Line chart with used/available
- [ ] **Network Traffic** - Area chart, in/out bytes
- [ ] **Disk I/O** - Line chart, read/write operations
- [ ] **Combined Overview** - Multi-axis chart

#### Library Choice

**Recommended: Recharts**
```bash
pnpm add recharts
```

Pros: React-native, composable, good performance, TypeScript support

#### Example Component Structure

```tsx
// apps/web/src/components/metrics/cpu-chart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export function CpuChart({ data, timeRange }) {
  return (
    <LineChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="timestamp" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="cpu" stroke="#8884d8" />
    </LineChart>
  );
}
```

#### Acceptance Criteria

- ✅ Charts display historical metrics
- ✅ Time range selector works
- ✅ Charts update in real-time
- ✅ Tooltips show exact values
- ✅ Charts are responsive
- ✅ Export functionality works
- ✅ Performance is acceptable with large datasets

---

### 12. Enhanced Error Handling & Retry Logic

**Status**: ⚠️ Basic Error Handling Exists
**Impact**: Failed operations may lose data, poor user experience
**Estimated Effort**: 1-2 weeks

#### Issues

- [ ] **Worker Retry Logic**
  - Basic try-catch exists but limited retry logic
  - No exponential backoff
  - No dead letter queue
  - Failed jobs may be lost

- [ ] **API Error Responses**
  - Generic error messages
  - Insufficient debugging context
  - No error codes/types
  - Inconsistent format

- [ ] **Transaction Handling**
  - Some multi-step operations lack transactions
  - Partial state updates possible on failure
  - No rollback mechanisms

#### Implementation Plan

##### **Worker Error Handling**

- [ ] Configure BullMQ retry settings
```typescript
// Example configuration
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
}
```

- [ ] Implement dead letter queue for failed jobs
- [ ] Add job failure notifications
- [ ] Log job errors to monitoring system
- [ ] Create job retry dashboard

##### **API Error Standardization**

- [ ] Create error types enum
```typescript
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  // ... etc
}
```

- [ ] Create custom exception classes
- [ ] Implement global exception filter
- [ ] Return structured error responses
```json
{
  "statusCode": 400,
  "errorCode": "VALIDATION_ERROR",
  "message": "Invalid server configuration",
  "details": {
    "field": "cpuLimitMillicores",
    "reason": "Value must be between 100 and 8000"
  },
  "timestamp": "2025-11-13T18:00:00Z",
  "path": "/servers"
}
```

##### **Database Transactions**

- [ ] Wrap multi-step operations in transactions
```typescript
await this.db.transaction(async (tx) => {
  const server = await tx.insert(servers).values(...);
  await tx.insert(allocations).values(...);
  // Queue job only after successful DB commit
});
```

- [ ] Add rollback handling
- [ ] Add transaction timeout configuration
- [ ] Log transaction failures

##### **Circuit Breaker Pattern**

- [ ] Implement circuit breaker for external APIs (Wings, Stripe)
- [ ] Configure failure thresholds
- [ ] Add fallback mechanisms
- [ ] Create health check endpoint showing circuit breaker states

#### Files to Update

- [ ] `apps/worker/src/config/bullmq.config.ts` - Retry settings
- [ ] `apps/api/src/common/filters/global-exception.filter.ts` - Error handling
- [ ] `apps/api/src/common/exceptions/*.ts` - Custom exceptions
- [ ] All service files - Add transactions

#### Acceptance Criteria

- ✅ Workers retry failed jobs with exponential backoff
- ✅ Dead letter queue captures failed jobs
- ✅ API returns consistent, detailed error responses
- ✅ Multi-step operations use transactions
- ✅ Circuit breaker prevents cascade failures
- ✅ Error logs include correlation IDs for tracing
- ✅ Users receive helpful error messages

---

### 13. Performance Optimizations

**Status**: ⚠️ No Performance Tuning
**Impact**: Slow response times, inefficient resource usage
**Estimated Effort**: 1-2 weeks

#### Issues Identified

- [ ] **Database Query Optimization**
  - N+1 query issues (e.g., tenant members fetch)
  - Missing indexes on foreign keys
  - No composite indexes for common queries
  - No query result caching

- [ ] **Redis Caching Strategy**
  - Redis used only for active tenant storage
  - No caching of frequently read data:
    - Blueprints
    - Node information
    - Subscription data
    - Product catalog

- [ ] **Metrics Aggregation**
  - In-memory aggregation of large datasets
  - Could use database aggregation functions
  - No pagination on metrics queries

- [ ] **Connection Pooling**
  - Default Drizzle connection pooling
  - No tuning for high concurrency

#### Implementation Plan

##### **Database Optimization**

- [ ] Add indexes
```sql
-- Add indexes for common queries
CREATE INDEX idx_servers_tenant_id ON servers(tenant_id);
CREATE INDEX idx_servers_node_id ON servers(node_id);
CREATE INDEX idx_allocations_node_id ON allocations(node_id);
CREATE INDEX idx_metrics_server_timestamp ON metrics_samples(server_id, timestamp);
CREATE INDEX idx_refresh_tokens_user_family ON refresh_tokens(user_id, family);

-- Add composite indexes
CREATE INDEX idx_servers_tenant_status ON servers(tenant_id, status);
CREATE INDEX idx_backups_server_created ON backups(server_id, created_at DESC);
```

- [ ] Optimize N+1 queries
```typescript
// Before: N+1 query
const tenants = await db.select().from(tenants).where(...);
for (const tenant of tenants) {
  tenant.members = await db.select().from(tenantMembers).where(eq(tenantMembers.tenantId, tenant.id));
}

// After: Single query with join
const tenantsWithMembers = await db
  .select()
  .from(tenants)
  .leftJoin(tenantMembers, eq(tenants.id, tenantMembers.tenantId))
  .where(...);
```

- [ ] Add pagination to all list endpoints
```typescript
interface PaginationParams {
  page: number;
  limit: number;
}

// Add to all list methods
async findAll({ page = 1, limit = 20 }: PaginationParams) {
  const offset = (page - 1) * limit;
  return await db.select().from(table).limit(limit).offset(offset);
}
```

##### **Caching Strategy**

- [ ] Cache blueprints (rarely change)
```typescript
async getBlueprints() {
  const cached = await redis.get('blueprints');
  if (cached) return JSON.parse(cached);

  const blueprints = await db.select().from(blueprints);
  await redis.set('blueprints', JSON.stringify(blueprints), 'EX', 3600);
  return blueprints;
}
```

- [ ] Cache node information
- [ ] Cache subscription plans
- [ ] Implement cache invalidation strategy
- [ ] Add cache warming on startup

##### **Connection Pool Tuning**

```typescript
// Configure PostgreSQL pool
const pool = {
  max: 20,  // Maximum pool size
  min: 5,   // Minimum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
```

##### **API Response Optimization**

- [ ] Add ETags for conditional requests
- [ ] Enable gzip compression
- [ ] Add response caching headers
- [ ] Minimize payload size (select only needed fields)

##### **Metrics Aggregation**

- [ ] Use database aggregation
```typescript
// Use Postgres aggregation instead of in-memory
const hourlyStats = await db
  .select({
    hour: sql`date_trunc('hour', timestamp)`,
    avgCpu: sql`AVG(cpu_percent)`,
    avgMemory: sql`AVG(memory_mb)`,
  })
  .from(metricsSamples)
  .where(and(eq(metricsSamples.serverId, serverId), gte(metricsSamples.timestamp, startDate)))
  .groupBy(sql`date_trunc('hour', timestamp)`);
```

#### Acceptance Criteria

- ✅ All foreign keys have indexes
- ✅ Composite indexes for common query patterns
- ✅ N+1 queries eliminated
- ✅ Frequently accessed data cached in Redis
- ✅ Database connection pool optimized
- ✅ API response times < 200ms for simple queries
- ✅ Pagination implemented on all list endpoints
- ✅ Load tests show acceptable performance (>100 req/s)

---

### 14. Monitoring & Observability

**Status**: ❌ Not Implemented
**Impact**: Cannot detect issues, debug problems, or track performance
**Estimated Effort**: 1-2 weeks

#### Missing Infrastructure

- [ ] **Metrics Export**
  - No Prometheus metrics
  - No StatsD integration
  - No performance monitoring

- [ ] **Distributed Tracing**
  - No OpenTelemetry
  - No request correlation IDs
  - Cannot trace requests across services

- [ ] **Alerting**
  - No health check monitoring
  - No error rate alerts
  - No SLA tracking

- [ ] **Log Aggregation**
  - Logs only in stdout/stderr
  - No centralized logging
  - No log retention policy

#### Implementation Plan

##### **Prometheus Metrics**

- [ ] Install Prometheus client
```bash
pnpm add prom-client
```

- [ ] Add metrics endpoint
```typescript
// apps/api/src/metrics/prometheus.controller.ts
import { register } from 'prom-client';

@Controller('metrics')
export class PrometheusController {
  @Get()
  getMetrics() {
    return register.metrics();
  }
}
```

- [ ] Add custom metrics
  - HTTP request duration
  - HTTP request rate
  - Active WebSocket connections
  - Job queue depth
  - Job processing duration
  - Database query duration
  - Cache hit/miss rate

##### **OpenTelemetry Integration**

- [ ] Install OpenTelemetry packages
```bash
pnpm add @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

- [ ] Configure tracing
```typescript
// apps/api/src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

- [ ] Add request correlation IDs
- [ ] Trace across services (API → Worker → Wings)

##### **Health Checks**

- [ ] Implement comprehensive health checks
```typescript
// apps/api/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: this.checkDatabase(),
        redis: this.checkRedis(),
        queue: this.checkQueue(),
      }
    };
  }
}
```

- [ ] Add liveness probe (`/health/live`)
- [ ] Add readiness probe (`/health/ready`)

##### **Alerting Setup**

- [ ] Configure Alertmanager
- [ ] Define alert rules
  - API error rate > 5%
  - Database connection pool exhausted
  - Job queue depth > 1000
  - Wings node unreachable
  - Disk space < 10%

- [ ] Add notification channels (email, Slack, PagerDuty)

##### **Log Aggregation**

- [ ] Configure structured logging
- [ ] Send logs to centralized system (ELK, Loki, Datadog)
- [ ] Add log correlation with trace IDs
- [ ] Define log retention policy

#### Acceptance Criteria

- ✅ Prometheus metrics exported from all services
- ✅ Grafana dashboards created for key metrics
- ✅ Distributed tracing shows request flow across services
- ✅ Health checks distinguish between live and ready states
- ✅ Alerts configured for critical issues
- ✅ Logs aggregated and searchable
- ✅ On-call team receives alerts

---

### 15. API Documentation

**Status**: ⚠️ Swagger Decorators Exist, Not Published
**Impact**: Difficult for integrations and third-party developers
**Estimated Effort**: 1 week

#### Issues

- [ ] Swagger endpoint exists but not documented
- [ ] No example requests/responses
- [ ] No authentication documentation
- [ ] No rate limiting documentation
- [ ] No WebSocket documentation

#### Implementation Plan

- [ ] Enhance Swagger decorators with examples
- [ ] Add authentication requirements to docs
- [ ] Document all error responses
- [ ] Create Postman/Insomnia collection
- [ ] Add WebSocket event documentation
- [ ] Publish docs to public URL
- [ ] Add API versioning strategy

#### Example Enhanced Swagger

```typescript
@ApiOperation({
  summary: 'Create a new server',
  description: 'Creates a new game server with the specified configuration...',
})
@ApiResponse({
  status: 201,
  description: 'Server created successfully',
  type: ServerDto,
  example: {
    id: 'srv_123',
    name: 'My Minecraft Server',
    status: 'provisioning',
    // ...
  },
})
@ApiResponse({
  status: 400,
  description: 'Invalid input',
  example: {
    statusCode: 400,
    errorCode: 'VALIDATION_ERROR',
    message: 'Invalid CPU limit',
  },
})
@Post()
async create(@Body() dto: CreateServerDto) {
  // ...
}
```

#### Acceptance Criteria

- ✅ Swagger UI accessible at `/api-docs`
- ✅ All endpoints documented with examples
- ✅ Authentication clearly documented
- ✅ Postman collection generated
- ✅ WebSocket events documented
- ✅ API versioning strategy defined

---

### 16. Deployment Documentation

**Status**: ❌ Missing
**Impact**: Cannot deploy to production
**Estimated Effort**: 3-5 days

#### Required Documentation

- [ ] **Production Deployment Guide**
  - Infrastructure requirements
  - Docker Compose production setup
  - Kubernetes deployment (optional)
  - Environment variable reference
  - SSL/TLS certificate setup
  - Reverse proxy configuration (Nginx/Caddy)
  - Database initialization
  - Secret management

- [ ] **Scaling Guide**
  - Horizontal scaling strategies
  - Load balancing setup
  - Read replica configuration
  - Redis clustering
  - Worker scaling
  - CDN setup for static assets

- [ ] **Backup & Disaster Recovery**
  - Database backup procedures
  - Automated backup scripts
  - Restore procedures
  - Data retention policies
  - Disaster recovery runbook

- [ ] **Monitoring Setup**
  - Prometheus deployment
  - Grafana dashboard imports
  - Alertmanager configuration
  - Log aggregation setup

- [ ] **Security Hardening**
  - Firewall rules
  - Network security groups
  - Database access controls
  - Secret rotation procedures
  - Security scanning

#### Acceptance Criteria

- ✅ Can deploy to production following documentation
- ✅ Scaling procedures clearly documented
- ✅ Backup and restore procedures tested
- ✅ Security hardening checklist complete
- ✅ Monitoring setup documented

---

## 🟡 MEDIUM PRIORITY

### 17. Complete Notification System

**Status**: ⚠️ Infrastructure Exists, Limited Usage
**Estimated Effort**: 1 week

#### Current State

- Notifications table exists in database
- Minimal integration in application code
- No email delivery configured

#### Implementation Needed

- [ ] Email provider integration (Resend, Postmark, SendGrid)
- [ ] Email templates for all events
- [ ] In-app notification UI
- [ ] Notification preferences page
- [ ] Push notification support (optional)

#### Notification Types to Implement

- Server created/deleted/failed
- Backup completed/failed
- Payment succeeded/failed
- Subscription renewal reminder
- Team member added/removed
- Usage quota warnings
- Security alerts (failed login attempts)

---

### 18. Credits System

**Status**: ❌ Not Implemented
**Estimated Effort**: 1 week

#### Current State

- Credits table exists in schema
- No API endpoints
- No frontend UI
- Not integrated with billing

#### Implementation Needed

- [ ] Credits API endpoints (add, deduct, check balance)
- [ ] Credits purchase via Stripe
- [ ] Credits applied to invoices
- [ ] Credits expiration logic
- [ ] Credits transaction history
- [ ] Admin panel for credit management
- [ ] Frontend UI for credits balance and purchase

---

### 19. Blueprint Management UI

**Status**: ⚠️ API Exists, No UI
**Estimated Effort**: 3-5 days

#### Current State

- Blueprints can be created in database
- Used during server creation
- No UI for managing blueprints

#### Implementation Needed

- [ ] Admin page for blueprint management
- [ ] Create/edit/delete blueprints
- [ ] Upload blueprint images
- [ ] Preview blueprint configurations
- [ ] Import blueprints from repository
- [ ] Blueprint versioning

---

### 20. Advanced Server Features

**Status**: ❌ Not Implemented
**Estimated Effort**: 2-3 weeks

#### Missing Features

- [ ] **RCON Support**
  - Remote console access for games that support it
  - RCON command API endpoints
  - Frontend RCON console

- [ ] **Scheduled Tasks**
  - Cron-like scheduling for server tasks
  - Scheduled backups
  - Scheduled restarts
  - Scheduled commands

- [ ] **Server Templates**
  - Save server config as template
  - Create servers from templates
  - Share templates within team

- [ ] **Server Mods/Plugins Management**
  - Install/update/remove mods
  - Auto-update mods
  - Mod compatibility checking

---

### 21. Improved Admin Dashboard

**Status**: ⚠️ Basic Admin Exists
**Estimated Effort**: 1-2 weeks

#### Missing Features

- [ ] System overview dashboard
- [ ] Real-time statistics
- [ ] Job queue management UI
- [ ] Failed job retry/delete
- [ ] User management
- [ ] Tenant management
- [ ] System settings configuration
- [ ] Audit log viewer
- [ ] Node management UI

---

### 22. Enhanced Error Messages & User Feedback

**Status**: ⚠️ Basic Errors
**Estimated Effort**: 1 week

#### Improvements Needed

- [ ] User-friendly error messages
- [ ] Toast notification system
- [ ] Success confirmations
- [ ] Progress indicators for long operations
- [ ] Job status polling with notifications
- [ ] Contextual help tooltips
- [ ] Error recovery suggestions

---

### 23. Code Quality Improvements

**Status**: ⚠️ Some Issues
**Estimated Effort**: Ongoing

#### Issues to Address

- [ ] **TypeScript Type Safety**
  - Remove `any` types throughout codebase
  - Define proper interfaces for job data
  - Strict type checking

- [ ] **Magic Numbers**
  - Extract hardcoded values to constants
  - Create configuration files for limits
  - Document all default values

- [ ] **Consistent Naming**
  - Standardize camelCase vs kebab-case usage
  - Consistent DTO naming
  - Follow naming conventions document

- [ ] **Code Documentation**
  - Add JSDoc comments to public APIs
  - Document complex business logic
  - Add inline comments for non-obvious code

- [ ] **Dead Code Removal**
  - Remove legacy `wings_nodes` table
  - Remove unused imports
  - Clean up commented code

---

## 🟢 LOW PRIORITY

### 24. Additional OAuth Providers

**Status**: ⚠️ Discord & Google Configured, Not Tested
**Estimated Effort**: 3-5 days

#### Implementation Needed

- [ ] Test Discord OAuth flow
- [ ] Test Google OAuth flow
- [ ] Add GitHub OAuth
- [ ] Add Microsoft OAuth
- [ ] OAuth account linking
- [ ] OAuth error handling

---

### 25. API Keys & Service Accounts

**Status**: ❌ Not Implemented
**Estimated Effort**: 1 week

#### Implementation Needed

- [ ] API key generation
- [ ] API key permissions/scopes
- [ ] API key rotation
- [ ] Service account support
- [ ] Webhook integrations

---

### 26. Advanced RBAC Features

**Status**: ⚠️ Basic RBAC Exists
**Estimated Effort**: 1-2 weeks

#### Enhancements

- [ ] Custom role creation
- [ ] Permission inheritance
- [ ] Temporary permission grants
- [ ] IP-based restrictions
- [ ] Time-based access control

---

### 27. Internationalization (i18n)

**Status**: ❌ Not Implemented
**Estimated Effort**: 2-3 weeks

#### Implementation Needed

- [ ] i18n library integration (react-i18next)
- [ ] Extract all text to translation files
- [ ] Support multiple languages
- [ ] Language selector in UI
- [ ] RTL support for Arabic/Hebrew

---

### 28. Accessibility Improvements

**Status**: ⚠️ Basic HTML Semantics
**Estimated Effort**: 1-2 weeks

#### Improvements Needed

- [ ] Add ARIA labels throughout UI
- [ ] Improve keyboard navigation
- [ ] Screen reader testing and fixes
- [ ] Color contrast compliance (WCAG AA)
- [ ] Focus indicators
- [ ] Skip navigation links

---

## 📊 Estimated Timeline

### Phase 1: Critical Items (8-10 weeks)
**Goal**: Production-Ready Core Functionality

- Weeks 1-3: Wings API integration
- Weeks 3-5: S3 backup integration + Stripe billing completion
- Week 5: Auth validation & secure configuration
- Weeks 6-7: Database migrations + RBAC enforcement
- Weeks 8-10: Comprehensive test coverage

**Milestone**: Core platform functional and secure

---

### Phase 2: High Priority Items (4-6 weeks)
**Goal**: Feature-Complete Beta

- Weeks 11-12: WebSocket real-time updates
- Weeks 13-14: Console & file manager frontend
- Week 14: Metrics visualization
- Week 15: Error handling & retry logic
- Week 16: Performance optimizations
- Weeks 16-17: Monitoring & observability
- Week 17: API & deployment documentation

**Milestone**: Feature-complete beta ready for early adopters

---

### Phase 3: Medium Priority Items (4-6 weeks)
**Goal**: Production Polish

- Complete notification system
- Implement credits system
- Add blueprint management UI
- Enhance admin dashboard
- Improve error messages
- Code quality improvements

**Milestone**: Production-ready with excellent UX

---

### Phase 4: Low Priority Items (Ongoing)
**Goal**: Continuous Improvement

- Additional OAuth providers
- API keys & service accounts
- Advanced RBAC features
- Internationalization
- Accessibility improvements

**Milestone**: Enterprise-ready platform

---

## 🎯 Recommended Focus

### For Next Sprint (Priority Order)

1. **Wings API Integration** (Critical - 2-3 weeks)
   - Most important for core functionality
   - Blocks server management features

2. **S3 Backup Storage** (Critical - 1-2 weeks)
   - Core feature for data protection
   - Relatively quick to implement

3. **Auth Input Validation** (Critical - 1-2 days)
   - Quick security win
   - Should be done immediately

4. **Secure Configuration** (Critical - 1 day)
   - Another quick security fix
   - Prevents production issues

5. **Database Migrations** (Critical - 1 week)
   - Foundation for safe upgrades
   - Should be done early

### Quick Wins (Can be done in parallel)

- Auth validation (2 days)
- Secure configuration (1 day)
- Add delete confirmations (1 day)
- Enhance error messages (2-3 days)
- Add basic monitoring (2-3 days)

---

## 📝 Notes

- Estimates are for a single full-time developer
- Parallelization possible with team
- Testing time included in estimates
- Documentation time included in estimates
- Code review time not included

---

## 🔄 Maintenance

This TODO list should be updated:
- After completing major items
- When new issues are discovered
- After each sprint retrospective
- When priorities change

**Last Review**: 2025-11-13
