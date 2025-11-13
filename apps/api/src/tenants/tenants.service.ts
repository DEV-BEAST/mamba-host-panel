import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DATABASE_CONNECTION } from '../common/database/database.module';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import { tenants, tenantMembers, users } from '@mambaPanel/db';
import { eq, and, or } from '@mambaPanel/db';
import type { Database } from '@mambaPanel/db';
import type Redis from 'ioredis';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Injectable()
export class TenantsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private dbConnection: { db: Database },
    @Inject(REDIS_CLIENT)
    private redis: Redis
  ) {}

  /**
   * Get all tenants for a user
   */
  async getUserTenants(userId: string) {
    const memberships = await this.dbConnection.db
      .select({
        tenant: tenants,
        membership: tenantMembers,
      })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
      .where(eq(tenantMembers.userId, userId));

    return memberships.map((m) => ({
      ...m.tenant,
      role: m.membership.role,
      joinedAt: m.membership.joinedAt,
    }));
  }

  /**
   * Get active tenant ID from Redis
   */
  async getActiveTenantId(userId: string): Promise<string | null> {
    const activeTenantId = await this.redis.get(`user:${userId}:activeTenant`);
    return activeTenantId;
  }

  /**
   * Get current active tenant for user
   */
  async getCurrentTenant(userId: string) {
    const activeTenantId = await this.getActiveTenantId(userId);

    if (!activeTenantId) {
      // Auto-select first tenant
      const userTenants = await this.getUserTenants(userId);
      if (userTenants.length === 0) {
        return null;
      }

      await this.switchTenant(userId, userTenants[0].id);
      return userTenants[0];
    }

    const membership = await this.dbConnection.db
      .select({
        tenant: tenants,
        membership: tenantMembers,
      })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
      .where(
        and(
          eq(tenantMembers.userId, userId),
          eq(tenantMembers.tenantId, activeTenantId)
        )
      )
      .limit(1);

    if (!membership[0]) {
      throw new NotFoundException('Active tenant not found or access denied');
    }

    return {
      ...membership[0].tenant,
      role: membership[0].membership.role,
      joinedAt: membership[0].membership.joinedAt,
    };
  }

  /**
   * Create a new tenant
   */
  async createTenant(userId: string, dto: CreateTenantDto) {
    // Generate slug from name if not provided
    let slug = dto.slug;
    if (!slug) {
      slug = dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    // Check if slug is taken
    const existing = await this.dbConnection.db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('Tenant slug already exists');
    }

    // Create tenant
    const [tenant] = await this.dbConnection.db
      .insert(tenants)
      .values({
        name: dto.name,
        slug,
        planTier: dto.planTier || 'free',
        status: 'active',
      })
      .returning();

    // Add creator as owner
    await this.dbConnection.db.insert(tenantMembers).values({
      tenantId: tenant.id,
      userId,
      role: 'owner',
    });

    // Set as active tenant
    await this.switchTenant(userId, tenant.id);

    return tenant;
  }

  /**
   * Switch active tenant for user
   */
  async switchTenant(userId: string, tenantId: string) {
    // Verify user is a member of the tenant
    const [membership] = await this.dbConnection.db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.userId, userId),
          eq(tenantMembers.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!membership) {
      throw new ForbiddenException('Access denied to this tenant');
    }

    // Set active tenant in Redis (expire after 30 days)
    await this.redis.set(
      `user:${userId}:activeTenant`,
      tenantId,
      'EX',
      30 * 24 * 60 * 60
    );

    return { success: true, tenantId };
  }

  /**
   * Get tenant members
   */
  async getTenantMembers(userId: string, tenantId: string) {
    // Verify user has access to tenant
    await this.verifyTenantAccess(userId, tenantId);

    const members = await this.dbConnection.db
      .select({
        membership: tenantMembers,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          image: users.image,
        },
      })
      .from(tenantMembers)
      .innerJoin(users, eq(users.id, tenantMembers.userId))
      .where(eq(tenantMembers.tenantId, tenantId));

    return members.map((m) => ({
      id: m.membership.id,
      userId: m.user.id,
      role: m.membership.role,
      joinedAt: m.membership.joinedAt,
      user: m.user,
    }));
  }

  /**
   * Invite a member to tenant
   */
  async inviteMember(
    userId: string,
    tenantId: string,
    dto: InviteMemberDto
  ) {
    // Verify user is admin or owner
    await this.verifyTenantRole(userId, tenantId, ['owner', 'admin']);

    // Find user by email
    const [targetUser] = await this.dbConnection.db
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (!targetUser) {
      throw new NotFoundException('User with this email not found');
    }

    // Check if already a member
    const [existing] = await this.dbConnection.db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.userId, targetUser.id)
        )
      )
      .limit(1);

    if (existing) {
      throw new ConflictException('User is already a member of this tenant');
    }

    // Add member
    const [membership] = await this.dbConnection.db
      .insert(tenantMembers)
      .values({
        tenantId,
        userId: targetUser.id,
        role: dto.role,
        invitedBy: userId,
      })
      .returning();

    return membership;
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    userId: string,
    tenantId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto
  ) {
    // Verify user is owner or admin
    await this.verifyTenantRole(userId, tenantId, ['owner', 'admin']);

    // Cannot change owner role
    const [targetMember] = await this.dbConnection.db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.userId, targetUserId)
        )
      )
      .limit(1);

    if (!targetMember) {
      throw new NotFoundException('Member not found');
    }

    if (targetMember.role === 'owner') {
      throw new ForbiddenException('Cannot change owner role');
    }

    // Update role
    const [updated] = await this.dbConnection.db
      .update(tenantMembers)
      .set({ role: dto.role, updatedAt: new Date() })
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.userId, targetUserId)
        )
      )
      .returning();

    return updated;
  }

  /**
   * Remove a member from tenant
   */
  async removeMember(
    userId: string,
    tenantId: string,
    targetUserId: string
  ) {
    // Verify user is owner or admin
    await this.verifyTenantRole(userId, tenantId, ['owner', 'admin']);

    // Cannot remove owner
    const [targetMember] = await this.dbConnection.db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.userId, targetUserId)
        )
      )
      .limit(1);

    if (!targetMember) {
      throw new NotFoundException('Member not found');
    }

    if (targetMember.role === 'owner') {
      throw new ForbiddenException('Cannot remove owner from tenant');
    }

    // Remove member
    await this.dbConnection.db
      .delete(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.userId, targetUserId)
        )
      );

    return { success: true };
  }

  /**
   * Helper: Verify user has access to tenant
   */
  private async verifyTenantAccess(userId: string, tenantId: string) {
    const [membership] = await this.dbConnection.db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.userId, userId),
          eq(tenantMembers.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!membership) {
      throw new ForbiddenException('Access denied to this tenant');
    }

    return membership;
  }

  /**
   * Helper: Verify user has specific role(s) in tenant
   */
  private async verifyTenantRole(
    userId: string,
    tenantId: string,
    allowedRoles: string[]
  ) {
    const membership = await this.verifyTenantAccess(userId, tenantId);

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException(
        `Requires one of these roles: ${allowedRoles.join(', ')}`
      );
    }

    return membership;
  }
}
