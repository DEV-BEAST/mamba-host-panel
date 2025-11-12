import {
  Controller,
  Get,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('system/overview')
  @ApiOperation({ summary: 'Get system overview (admin only)' })
  @ApiResponse({ status: 200, description: 'System overview' })
  async getSystemOverview(@Request() req: any) {
    this.checkAdmin(req.user);
    return this.adminService.getSystemOverview();
  }

  @Get('tenants')
  @ApiOperation({ summary: 'Get all tenants (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all tenants' })
  async getAllTenants(@Request() req: any) {
    this.checkAdmin(req.user);
    return this.adminService.getAllTenants();
  }

  @Get('nodes')
  @ApiOperation({ summary: 'Get all nodes (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all nodes' })
  async getAllNodes(@Request() req: any) {
    this.checkAdmin(req.user);
    return this.adminService.getAllNodes();
  }

  private checkAdmin(user: any) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
  }
}
