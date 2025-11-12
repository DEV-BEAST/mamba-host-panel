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
import { ServersService } from './servers.service';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { PowerActionDto } from './dto/power-action.dto';

@ApiTags('servers')
@Controller('servers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ServersController {
  constructor(private serversService: ServersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all servers for active tenant' })
  @ApiResponse({ status: 200, description: 'List of servers' })
  async findAll(@Request() req: any) {
    return this.serversService.findAll(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get server by ID' })
  @ApiResponse({ status: 200, description: 'Server details' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.serversService.findById(req.user.userId, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get server statistics' })
  @ApiResponse({ status: 200, description: 'Server stats' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  async getStats(@Request() req: any, @Param('id') id: string) {
    return this.serversService.getStats(req.user.userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new server' })
  @ApiResponse({ status: 201, description: 'Server created and install queued' })
  @ApiResponse({ status: 400, description: 'No active tenant selected' })
  @ApiResponse({ status: 404, description: 'Blueprint or node not found' })
  async create(@Request() req: any, @Body() dto: CreateServerDto) {
    return this.serversService.create(req.user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update server configuration' })
  @ApiResponse({ status: 200, description: 'Server updated' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateServerDto
  ) {
    return this.serversService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a server' })
  @ApiResponse({ status: 200, description: 'Server deletion queued' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.serversService.remove(req.user.userId, id);
  }

  @Post(':id/power')
  @ApiOperation({ summary: 'Execute power action on server' })
  @ApiResponse({ status: 200, description: 'Power action executed' })
  @ApiResponse({ status: 400, description: 'Server not fully installed' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async powerAction(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: PowerActionDto
  ) {
    return this.serversService.powerAction(req.user.userId, id, dto.action);
  }
}
