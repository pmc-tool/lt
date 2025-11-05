import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Draw, DrawStatus } from '../../shared/database/entities/draw.entity';

export interface DrawListQuery {
  status?: DrawStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class DrawsService {
  constructor(
    @InjectRepository(Draw)
    private drawRepository: Repository<Draw>,
  ) {}

  async findAll(query: DrawListQuery) {
    const { status, page = 1, limit = 20 } = query;

    const qb = this.drawRepository.createQueryBuilder('draw');

    if (status) {
      qb.where('draw.status = :status', { status });
    }

    // Calculate tickets remaining
    qb.addSelect('draw.max_tickets - draw.tickets_sold', 'tickets_remaining');

    qb.orderBy('draw.start_at', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [draws, total] = await qb.getManyAndCount();

    return {
      data: draws.map((draw) => ({
        ...draw,
        tickets_remaining: draw.max_tickets - draw.tickets_sold,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Draw> {
    const draw = await this.drawRepository.findOne({ where: { id } });

    if (!draw) {
      throw new NotFoundException('Draw not found');
    }

    return draw;
  }
}
