import {
  Controller,
  Get,
  Post,
  Body,
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
import { BillingService } from './billing.service';

@ApiTags('billing')
@Controller('billing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Get('products')
  @ApiOperation({ summary: 'Get available products' })
  @ApiResponse({ status: 200, description: 'List of products' })
  async getProducts() {
    return this.billingService.getProducts();
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get tenant subscriptions' })
  @ApiResponse({ status: 200, description: 'List of subscriptions' })
  async getSubscriptions(@Request() req: any) {
    return this.billingService.getSubscriptions(req.user.userId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Get tenant invoices' })
  @ApiResponse({ status: 200, description: 'List of invoices' })
  async getInvoices(@Request() req: any) {
    return this.billingService.getInvoices(req.user.userId);
  }

  @Post('portal')
  @ApiOperation({ summary: 'Create billing portal session' })
  @ApiResponse({ status: 200, description: 'Portal URL' })
  async createPortalSession(@Request() req: any) {
    return this.billingService.createPortalSession(req.user.userId);
  }
}
