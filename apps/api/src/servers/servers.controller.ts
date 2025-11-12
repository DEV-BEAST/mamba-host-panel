import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServersService } from './servers.service';
import type { CreateServerInput, UpdateServerInput } from '@mambaPanel/types';

@ApiTags('servers')
@Controller('servers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ServersController {
  constructor(private serversService: ServersService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.serversService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.serversService.findById(id);
  }

  @Post()
  async create(@Request() req: any, @Body() createServerDto: CreateServerInput) {
    return this.serversService.create(req.user.userId, createServerDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateServerDto: UpdateServerInput) {
    return this.serversService.update(id, updateServerDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.serversService.remove(id);
  }
}
