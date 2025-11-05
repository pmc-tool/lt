import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { OrdersService, CreateOrderDto } from './orders.service';
import { AuthGuard } from '../../shared/middleware/auth.guard';
import { RateLimitGuard, OrderRateLimit } from '../../shared/middleware/rate-limit.guard';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @UseGuards(RateLimitGuard)
  @OrderRateLimit()
  async createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.userId, dto);
  }

  @Get()
  async findAll(@Request() req: any, @Query() query: any) {
    return this.ordersService.findUserOrders(req.user.userId, query);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.findOne(req.user.userId, id);
  }
}
