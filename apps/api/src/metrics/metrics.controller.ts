import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('servers/:serverId')
  @ApiOperation({ summary: 'Get server metrics' })
  @ApiQuery({ name: 'start', required: false })
  @ApiQuery({ name: 'end', required: false })
  @ApiResponse({ status: 200, description: 'Server metrics' })
  async getServerMetrics(
    @Request() req: any,
    @Param('serverId') serverId: string,
    @Query('start') start?: string,
    @Query('end') end?: string
  ) {
    return this.metricsService.getServerMetrics(
      req.user.userId,
      serverId,
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined
    );
  }

  @Get('servers/:serverId/current')
  @ApiOperation({ summary: 'Get current server metrics' })
  @ApiResponse({ status: 200, description: 'Current metrics' })
  async getCurrentMetrics(
    @Request() req: any,
    @Param('serverId') serverId: string
  ) {
    return this.metricsService.getCurrentMetrics(req.user.userId, serverId);
  }
}
