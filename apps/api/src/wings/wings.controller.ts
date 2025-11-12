import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WingsService } from './wings.service';
import type { CreateWingsNodeInput, UpdateWingsNodeInput } from '@mambaPanel/types';

@ApiTags('wings')
@Controller('wings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WingsController {
  constructor(private wingsService: WingsService) {}

  @Get()
  async findAll() {
    return this.wingsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.wingsService.findById(id);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return this.wingsService.sendRequest(id, '/api/system/status');
  }

  @Post()
  async create(@Body() createDto: CreateWingsNodeInput & { daemonToken: string }) {
    return this.wingsService.create(createDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateWingsNodeInput) {
    return this.wingsService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.wingsService.remove(id);
  }
}
