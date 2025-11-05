import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { TicketsService, TicketListQuery } from './tickets.service';
import { AuthGuard } from '../../shared/middleware/auth.guard';

@Controller('tickets')
@UseGuards(AuthGuard)
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Get()
  async findAll(@Request() req: any, @Query() query: TicketListQuery) {
    return this.ticketsService.findUserTickets(req.user.userId, query);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.ticketsService.findTicketById(req.user.userId, id);
  }
}
