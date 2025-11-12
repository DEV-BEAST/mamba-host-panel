'use client';

import { useMemo } from 'react';
import { Permission, Role, getPermissions, hasPermission as checkPermission } from '../permissions';

interface UsePermissionsOptions {
  role?: Role;
}

/**
 * React hook to check user permissions
 */
export function usePermissions({ role }: UsePermissionsOptions = {}) {
  const permissions = useMemo(() => {
    if (!role) return [];
    return getPermissions(role);
  }, [role]);

  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    return checkPermission(role, permission);
  };

  const hasAnyPermission = (permissionList: Permission[]): boolean => {
    if (!role) return false;
    return permissionList.some((p) => checkPermission(role, p));
  };

  const hasAllPermissions = (permissionList: Permission[]): boolean => {
    if (!role) return false;
    return permissionList.every((p) => checkPermission(role, p));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
