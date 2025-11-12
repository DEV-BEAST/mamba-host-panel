import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, hasPermission } from '../permissions';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/**
 * Decorator to require specific permission
 */
export const RequirePermission = (permission: Permission) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(REQUIRE_PERMISSION_KEY, permission, descriptor.value);
    } else {
      Reflect.defineMetadata(REQUIRE_PERMISSION_KEY, permission, target);
    }
  };
};

/**
 * Guard to check if user has required permission
 */
@Injectable()
export class RequirePermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<Permission>(
      REQUIRE_PERMISSION_KEY,
      context.getHandler()
    );

    if (!requiredPermission) {
      return true; // No permission required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user's role has the required permission
    if (!hasPermission(user.role, requiredPermission)) {
      throw new ForbiddenException(
        `Permission denied: ${requiredPermission} required`
      );
    }

    return true;
  }
}
