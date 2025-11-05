import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../../shared/database/entities/order.entity';
import { Ticket, TicketStatus } from '../../shared/database/entities/ticket.entity';
import { Draw, DrawStatus } from '../../shared/database/entities/draw.entity';
import { User, UserStatus } from '../../shared/database/entities/user.entity';
import { Address } from '../../shared/database/entities/address.entity';
import { CODTask, CODTaskStatus } from '../../shared/database/entities/cod-task.entity';

export interface CreateOrderDto {
  draw_id: string;
  quantity: number;
  address_id: string;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Draw)
    private drawRepository: Repository<Draw>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
    @InjectRepository(CODTask)
    private codTaskRepository: Repository<CODTask>,
    private dataSource: DataSource,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const { draw_id, quantity, address_id } = dto;

    // Validate quantity
    if (quantity < 1 || quantity > 10) {
      throw new BadRequestException('Quantity must be between 1 and 10');
    }

    // Check user status
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === UserStatus.SOFT_BANNED || user.status === UserStatus.HARD_BANNED) {
      throw new ForbiddenException('You are temporarily restricted from purchasing tickets');
    }

    // Check draw exists and is open
    const draw = await this.drawRepository.findOne({ where: { id: draw_id } });
    if (!draw) {
      throw new NotFoundException('Draw not found');
    }

    if (draw.status !== DrawStatus.STARTED) {
      throw new BadRequestException('Draw is closed, no new tickets can be purchased');
    }

    // Check tickets available
    if (draw.tickets_sold + quantity > draw.max_tickets) {
      throw new BadRequestException(`Only ${draw.max_tickets - draw.tickets_sold} tickets remaining`);
    }

    // Check address belongs to user
    const address = await this.addressRepository.findOne({
      where: { id: address_id, user_id: userId },
    });

    if (!address) {
      throw new BadRequestException('Address not found or does not belong to user');
    }

    // Create order in transaction
    return this.dataSource.transaction(async (manager) => {
      // Get next serial numbers
      const maxSerial = await manager
        .getRepository(Ticket)
        .createQueryBuilder('ticket')
        .where('ticket.draw_id = :draw_id', { draw_id })
        .select('MAX(ticket.serial)', 'max')
        .getRawOne();

      const nextSerial = (maxSerial?.max || 0) + 1;

      // Create order
      const totalAmount = draw.ticket_price * quantity;
      const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours

      const order = manager.getRepository(Order).create({
        user_id: userId,
        draw_id,
        quantity,
        total_amount: totalAmount,
        status: OrderStatus.PENDING,
        address_id,
        expires_at: expiresAt,
      });

      await manager.save(order);

      // Create tickets
      const tickets = [];
      for (let i = 0; i < quantity; i++) {
        const ticket = manager.getRepository(Ticket).create({
          draw_id,
          order_id: order.id,
          user_id: userId,
          serial: nextSerial + i,
          status: TicketStatus.RESERVED,
        });
        tickets.push(ticket);
      }

      await manager.save(tickets);

      // Create COD task
      const codTask = manager.getRepository(CODTask).create({
        order_id: order.id,
        status: CODTaskStatus.PENDING,
      });

      await manager.save(codTask);

      // Increment tickets_sold
      await manager
        .getRepository(Draw)
        .increment({ id: draw_id }, 'tickets_sold', quantity);

      return {
        order,
        tickets,
      };
    });
  }

  async findUserOrders(userId: string, query: { draw_id?: string; status?: OrderStatus; page?: number; limit?: number }) {
    const { draw_id, status, page = 1, limit = 20 } = query;

    const qb = this.orderRepository.createQueryBuilder('order');
    qb.where('order.user_id = :userId', { userId });

    if (draw_id) {
      qb.andWhere('order.draw_id = :draw_id', { draw_id });
    }

    if (status) {
      qb.andWhere('order.status = :status', { status });
    }

    qb.orderBy('order.created_at', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [orders, total] = await qb.getManyAndCount();

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user_id: userId },
      relations: ['address'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Load tickets
    const tickets = await this.ticketRepository.find({
      where: { order_id: orderId },
      order: { serial: 'ASC' },
    });

    return {
      ...order,
      tickets,
    };
  }
}
