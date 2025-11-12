import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BackupsService } from './backups.service';

@ApiTags('backups')
@Controller('servers/:serverId/backups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BackupsController {
  constructor(private backupsService: BackupsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all backups for a server' })
  @ApiResponse({ status: 200, description: 'List of backups' })
  async findAll(@Request() req: any, @Param('serverId') serverId: string) {
    return this.backupsService.findAll(req.user.userId, serverId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get backup by ID' })
  @ApiResponse({ status: 200, description: 'Backup details' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async findOne(
    @Request() req: any,
    @Param('serverId') serverId: string,
    @Param('id') id: string
  ) {
    return this.backupsService.findById(req.user.userId, serverId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new backup' })
  @ApiResponse({ status: 201, description: 'Backup creation queued' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  async create(@Request() req: any, @Param('serverId') serverId: string) {
    return this.backupsService.create(req.user.userId, serverId);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a backup' })
  @ApiResponse({ status: 200, description: 'Restore queued' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async restore(
    @Request() req: any,
    @Param('serverId') serverId: string,
    @Param('id') id: string
  ) {
    return this.backupsService.restore(req.user.userId, serverId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a backup' })
  @ApiResponse({ status: 200, description: 'Backup deleted' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async remove(
    @Request() req: any,
    @Param('serverId') serverId: string,
    @Param('id') id: string
  ) {
    return this.backupsService.remove(req.user.userId, serverId, id);
  }
}
