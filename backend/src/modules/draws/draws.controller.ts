import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { DrawsService, DrawListQuery } from './draws.service';
import { RateLimitGuard, DrawListRateLimit } from '../../shared/middleware/rate-limit.guard';

@Controller('draws')
export class DrawsController {
  constructor(private drawsService: DrawsService) {}

  @Get()
  @UseGuards(RateLimitGuard)
  @DrawListRateLimit()
  async findAll(@Query() query: DrawListQuery) {
    return this.drawsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.drawsService.findOne(id);
  }
}
