import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tenants for the current user' })
  @ApiResponse({ status: 200, description: 'List of user tenants' })
  async getUserTenants(@Request() req: any) {
    return this.tenantsService.getUserTenants(req.user.userId);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current active tenant' })
  @ApiResponse({ status: 200, description: 'Current active tenant' })
  @ApiResponse({ status: 404, description: 'No active tenant found' })
  async getCurrentTenant(@Request() req: any) {
    return this.tenantsService.getCurrentTenant(req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully' })
  @ApiResponse({ status: 409, description: 'Tenant slug already exists' })
  async createTenant(@Request() req: any, @Body() dto: CreateTenantDto) {
    return this.tenantsService.createTenant(req.user.userId, dto);
  }

  @Post(':id/switch')
  @ApiOperation({ summary: 'Switch to a different tenant' })
  @ApiResponse({ status: 200, description: 'Tenant switched successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to this tenant' })
  async switchTenant(@Request() req: any, @Param('id') tenantId: string) {
    return this.tenantsService.switchTenant(req.user.userId, tenantId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get all members of a tenant' })
  @ApiResponse({ status: 200, description: 'List of tenant members' })
  @ApiResponse({ status: 403, description: 'Access denied to this tenant' })
  async getTenantMembers(@Request() req: any, @Param('id') tenantId: string) {
    return this.tenantsService.getTenantMembers(req.user.userId, tenantId);
  }

  @Post(':id/members/invite')
  @ApiOperation({ summary: 'Invite a member to the tenant' })
  @ApiResponse({ status: 201, description: 'Member invited successfully' })
  @ApiResponse({ status: 403, description: 'Requires admin or owner role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  async inviteMember(
    @Request() req: any,
    @Param('id') tenantId: string,
    @Body() dto: InviteMemberDto
  ) {
    return this.tenantsService.inviteMember(req.user.userId, tenantId, dto);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Update member role' })
  @ApiResponse({ status: 200, description: 'Member role updated' })
  @ApiResponse({ status: 403, description: 'Requires admin or owner role' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async updateMemberRole(
    @Request() req: any,
    @Param('id') tenantId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto
  ) {
    return this.tenantsService.updateMemberRole(
      req.user.userId,
      tenantId,
      targetUserId,
      dto
    );
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from the tenant' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Requires admin or owner role' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async removeMember(
    @Request() req: any,
    @Param('id') tenantId: string,
    @Param('userId') targetUserId: string
  ) {
    return this.tenantsService.removeMember(
      req.user.userId,
      tenantId,
      targetUserId
    );
  }
}
