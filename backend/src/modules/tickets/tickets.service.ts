import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from '../../shared/database/entities/ticket.entity';

export interface TicketListQuery {
  draw_id?: string;
  status?: TicketStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
  ) {}

  async findUserTickets(userId: string, query: TicketListQuery) {
    const { draw_id, status, page = 1, limit = 20 } = query;

    const qb = this.ticketRepository.createQueryBuilder('ticket');
    qb.where('ticket.user_id = :userId', { userId });

    if (draw_id) {
      qb.andWhere('ticket.draw_id = :draw_id', { draw_id });
    }

    if (status) {
      qb.andWhere('ticket.status = :status', { status });
    }

    qb.orderBy('ticket.created_at', 'DESC');
    qb.addOrderBy('ticket.serial', 'ASC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [tickets, total] = await qb.getManyAndCount();

    return {
      data: tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findTicketById(userId: string, ticketId: string) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId, user_id: userId },
      relations: ['draw', 'order'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }
}
