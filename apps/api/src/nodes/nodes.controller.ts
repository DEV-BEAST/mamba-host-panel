import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MtlsAuthGuard } from '../auth/guards/mtls-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NodesService } from './nodes.service';

@ApiTags('nodes')
@Controller('nodes')
export class NodesController {
  constructor(private nodesService: NodesService) {}

  // User endpoints (JWT auth)
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all nodes (admin only)' })
  @ApiResponse({ status: 200, description: 'List of nodes' })
  async findAll() {
    return this.nodesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get node by ID' })
  @ApiResponse({ status: 200, description: 'Node details' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  async findOne(@Param('id') id: string) {
    return this.nodesService.findById(id);
  }

  // Wings daemon endpoints (mTLS auth)
  @Post('heartbeat')
  @UseGuards(MtlsAuthGuard)
  @ApiSecurity('mTLS')
  @ApiOperation({ summary: 'Report node heartbeat (Wings daemon)' })
  @ApiResponse({ status: 200, description: 'Heartbeat recorded' })
  async heartbeat(@Request() req: any, @Body() data: any) {
    return this.nodesService.recordHeartbeat(req.nodeId, data);
  }

  @Post('metrics')
  @UseGuards(MtlsAuthGuard)
  @ApiSecurity('mTLS')
  @ApiOperation({ summary: 'Report server metrics (Wings daemon)' })
  @ApiResponse({ status: 200, description: 'Metrics recorded' })
  async reportMetrics(@Request() req: any, @Body() data: any) {
    return this.nodesService.recordMetrics(req.nodeId, data);
  }

  @Post('events')
  @UseGuards(MtlsAuthGuard)
  @ApiSecurity('mTLS')
  @ApiOperation({ summary: 'Report server events (Wings daemon)' })
  @ApiResponse({ status: 200, description: 'Events recorded' })
  async reportEvents(@Request() req: any, @Body() data: any) {
    return this.nodesService.recordEvents(req.nodeId, data);
  }
}
