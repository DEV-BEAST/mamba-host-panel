import {
  Controller,
  Get,
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
import { AuditService } from './audit.service';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Get audit logs for active tenant' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'Audit logs' })
  async getLogs(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.auditService.getLogs(
      req.user.userId,
      parseInt(limit || '50'),
      parseInt(offset || '0')
    );
  }
}
