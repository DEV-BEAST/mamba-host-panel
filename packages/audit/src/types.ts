/**
 * Audit action types
 */
export enum AuditAction {
  // Tenant actions
  TENANT_CREATED = 'tenant.created',
  TENANT_UPDATED = 'tenant.updated',
  TENANT_DELETED = 'tenant.deleted',
  TENANT_MEMBER_INVITED = 'tenant.member_invited',
  TENANT_MEMBER_REMOVED = 'tenant.member_removed',
  TENANT_MEMBER_ROLE_CHANGED = 'tenant.member_role_changed',

  // Server actions
  SERVER_CREATED = 'server.created',
  SERVER_UPDATED = 'server.updated',
  SERVER_DELETED = 'server.deleted',
  SERVER_STARTED = 'server.started',
  SERVER_STOPPED = 'server.stopped',
  SERVER_RESTARTED = 'server.restarted',
  SERVER_KILLED = 'server.killed',

  // File actions
  FILE_UPLOADED = 'file.uploaded',
  FILE_DELETED = 'file.deleted',
  FILE_MODIFIED = 'file.modified',

  // Backup actions
  BACKUP_CREATED = 'backup.created',
  BACKUP_RESTORED = 'backup.restored',
  BACKUP_DELETED = 'backup.deleted',

  // Billing actions
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELED = 'subscription.canceled',
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',

  // Node actions
  NODE_CREATED = 'node.created',
  NODE_UPDATED = 'node.updated',
  NODE_DELETED = 'node.deleted',

  // Auth actions
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_LOGIN_FAILED = 'user.login_failed',
  USER_2FA_ENABLED = 'user.2fa_enabled',
  USER_2FA_DISABLED = 'user.2fa_disabled',
}

/**
 * Resource types for audit logs
 */
export enum AuditResourceType {
  TENANT = 'tenant',
  SERVER = 'server',
  USER = 'user',
  NODE = 'node',
  BACKUP = 'backup',
  SUBSCRIPTION = 'subscription',
  FILE = 'file',
}

/**
 * Actor type (who performed the action)
 */
export enum AuditActorType {
  USER = 'user',
  SYSTEM = 'system',
  API_KEY = 'api_key',
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  tenantId: string;
  actorId: string;
  actorType: AuditActorType;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}
