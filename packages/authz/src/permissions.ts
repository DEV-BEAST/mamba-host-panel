/**
 * Permission keys for RBAC system
 * Format: RESOURCE:ACTION
 */
export enum Permission {
  // Tenant permissions
  TENANT_READ = 'tenant:read',
  TENANT_UPDATE = 'tenant:update',
  TENANT_DELETE = 'tenant:delete',
  TENANT_MANAGE_MEMBERS = 'tenant:manage_members',

  // Server permissions
  SERVER_CREATE = 'server:create',
  SERVER_READ = 'server:read',
  SERVER_UPDATE = 'server:update',
  SERVER_DELETE = 'server:delete',
  SERVER_POWER = 'server:power',
  SERVER_CONSOLE = 'server:console',
  SERVER_FILES = 'server:files',
  SERVER_RCON = 'server:rcon',
  SERVER_BACKUPS = 'server:backups',

  // Node permissions (admin only)
  NODE_CREATE = 'node:create',
  NODE_READ = 'node:read',
  NODE_UPDATE = 'node:update',
  NODE_DELETE = 'node:delete',

  // Billing permissions
  BILLING_READ = 'billing:read',
  BILLING_MANAGE = 'billing:manage',

  // Audit permissions
  AUDIT_READ = 'audit:read',

  // Admin permissions
  ADMIN_DASHBOARD = 'admin:dashboard',
  ADMIN_TENANTS = 'admin:tenants',
  ADMIN_NODES = 'admin:nodes',
  ADMIN_JOBS = 'admin:jobs',
}

/**
 * Role definitions with assigned permissions
 */
export enum Role {
  OWNER = 'owner',
  ADMIN = 'admin',
  SUPPORT = 'support',
  MEMBER = 'member',
  SUPERADMIN = 'superadmin',
}

/**
 * Role to permissions mapping
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.OWNER]: [
    Permission.TENANT_READ,
    Permission.TENANT_UPDATE,
    Permission.TENANT_DELETE,
    Permission.TENANT_MANAGE_MEMBERS,
    Permission.SERVER_CREATE,
    Permission.SERVER_READ,
    Permission.SERVER_UPDATE,
    Permission.SERVER_DELETE,
    Permission.SERVER_POWER,
    Permission.SERVER_CONSOLE,
    Permission.SERVER_FILES,
    Permission.SERVER_RCON,
    Permission.SERVER_BACKUPS,
    Permission.BILLING_READ,
    Permission.BILLING_MANAGE,
    Permission.AUDIT_READ,
  ],
  [Role.ADMIN]: [
    Permission.TENANT_READ,
    Permission.TENANT_MANAGE_MEMBERS,
    Permission.SERVER_CREATE,
    Permission.SERVER_READ,
    Permission.SERVER_UPDATE,
    Permission.SERVER_DELETE,
    Permission.SERVER_POWER,
    Permission.SERVER_CONSOLE,
    Permission.SERVER_FILES,
    Permission.SERVER_RCON,
    Permission.SERVER_BACKUPS,
    Permission.BILLING_READ,
    Permission.AUDIT_READ,
  ],
  [Role.SUPPORT]: [
    Permission.TENANT_READ,
    Permission.SERVER_READ,
    Permission.SERVER_POWER,
    Permission.SERVER_CONSOLE,
    Permission.SERVER_FILES,
    Permission.SERVER_BACKUPS,
    Permission.AUDIT_READ,
  ],
  [Role.MEMBER]: [
    Permission.TENANT_READ,
    Permission.SERVER_READ,
    Permission.SERVER_CONSOLE,
    Permission.SERVER_FILES,
  ],
  [Role.SUPERADMIN]: Object.values(Permission),
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
