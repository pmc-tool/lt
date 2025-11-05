import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CODTask, CODTaskStatus } from '../../shared/database/entities/cod-task.entity';
import { Order, OrderStatus } from '../../shared/database/entities/order.entity';
import { Ticket, TicketStatus } from '../../shared/database/entities/ticket.entity';

export interface CODListQuery {
  status?: CODTaskStatus;
  agent?: string;
  page?: number;
  limit?: number;
}

export interface AssignCODDto {
  task_ids: string[];
  agent_name: string;
}

export interface UpdateCODStatusDto {
  status: CODTaskStatus;
  notes?: string;
}

@Injectable()
export class CODService {
  constructor(
    @InjectRepository(CODTask)
    private codTaskRepository: Repository<CODTask>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
  ) {}

  async listCODTasks(query: CODListQuery) {
    const { status, agent, page = 1, limit = 50 } = query;

    const qb = this.codTaskRepository
      .createQueryBuilder('cod')
      .leftJoinAndSelect('cod.order', 'order')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.user', 'user');

    if (status) {
      qb.andWhere('cod.status = :status', { status });
    }

    if (agent) {
      qb.andWhere('cod.agent = :agent', { agent });
    }

    qb.orderBy('cod.created_at', 'ASC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCODTask(taskId: string) {
    const task = await this.codTaskRepository.findOne({
      where: { id: taskId },
      relations: ['order', 'order.address', 'order.user'],
    });

    if (!task) {
      throw new NotFoundException('COD task not found');
    }

    return task;
  }

  async assignCODTasks(dto: AssignCODDto) {
    const tasks = await this.codTaskRepository.find({
      where: {
        id: In(dto.task_ids),
        status: CODTaskStatus.PENDING,
      },
    });

    if (tasks.length === 0) {
      throw new BadRequestException('No eligible tasks found for assignment');
    }

    const now = new Date();
    tasks.forEach((task) => {
      task.agent_id = dto.agent_name;
      task.status = CODTaskStatus.ASSIGNED;
      task.visit_at = now;
    });

    await this.codTaskRepository.save(tasks);

    return {
      assigned: tasks.length,
      tasks,
    };
  }

  async updateCODStatus(taskId: string, dto: UpdateCODStatusDto) {
    const task = await this.codTaskRepository.findOne({
      where: { id: taskId },
      relations: ['order'],
    });

    if (!task) {
      throw new NotFoundException('COD task not found');
    }

    const oldStatus = task.status;
    task.status = dto.status;

    if (dto.notes) {
      task.notes = dto.notes;
    }

    const now = new Date();

    // Update timestamps based on status
    if (dto.status === CODTaskStatus.VISITED && !task.visited_at) {
      task.visited_at = now;
    }

    if (dto.status === CODTaskStatus.COLLECTED && !task.collected_at) {
      task.collected_at = now;
    }

    await this.codTaskRepository.save(task);

    // If COD was collected, update order and tickets
    if (dto.status === CODTaskStatus.COLLECTED && oldStatus !== CODTaskStatus.COLLECTED) {
      await this.markOrderAsCollected(task.order_id);
    }

    // If COD failed, mark order as failed
    if ((dto.status === CODTaskStatus.FAILED_NO_SHOW || dto.status === CODTaskStatus.FAILED_ADDRESS_INVALID) &&
        oldStatus !== CODTaskStatus.FAILED_NO_SHOW && oldStatus !== CODTaskStatus.FAILED_ADDRESS_INVALID) {
      await this.markOrderAsFailed(task.order_id);
    }

    return task;
  }

  private async markOrderAsCollected(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      return;
    }

    // Update order status
    order.status = OrderStatus.COLLECTED;
    await this.orderRepository.save(order);

    // Update all tickets to PAID status
    const tickets = await this.ticketRepository.find({
      where: { order_id: orderId },
    });

    tickets.forEach((ticket) => {
      if (ticket.status === TicketStatus.RESERVED) {
        ticket.status = TicketStatus.PAID;
      }
    });

    await this.ticketRepository.save(tickets);
  }

  private async markOrderAsFailed(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      return;
    }

    // Update order status
    order.status = OrderStatus.FAILED;
    await this.orderRepository.save(order);

    // Tickets will be expired by the background job
  }

  async exportCODRoutes(agentName?: string) {
    const qb = this.codTaskRepository
      .createQueryBuilder('cod')
      .leftJoinAndSelect('cod.order', 'order')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.user', 'user')
      .where('cod.status IN (:...statuses)', {
        statuses: [CODTaskStatus.PENDING, CODTaskStatus.ASSIGNED],
      });

    if (agentName) {
      qb.andWhere('cod.agent = :agent', { agent: agentName });
    }

    qb.orderBy('address.city', 'ASC');
    qb.addOrderBy('address.postal_code', 'ASC');

    const tasks = await qb.getMany();

    // Format for CSV export
    const routes = tasks.map((task) => ({
      task_id: task.id,
      agent: task.agent_id || 'Unassigned',
      order_id: task.order.id,
      customer_name: task.order.user.name,
      customer_phone: task.order.address.phone,
      address: `${task.order.address.street}, ${task.order.address.city}, ${task.order.address.postal_code}`,
      amount: task.order.total_amount,
      quantity: task.order.quantity,
      status: task.status,
      created_at: task.created_at,
    }));

    return routes;
  }

  async getCODStats() {
    const [pending, assigned, visited, collected, failed] = await Promise.all([
      this.codTaskRepository.count({ where: { status: CODTaskStatus.PENDING } }),
      this.codTaskRepository.count({ where: { status: CODTaskStatus.ASSIGNED } }),
      this.codTaskRepository.count({ where: { status: CODTaskStatus.VISITED } }),
      this.codTaskRepository.count({ where: { status: CODTaskStatus.COLLECTED } }),
      this.codTaskRepository.count({ where: { status: CODTaskStatus.FAILED_NO_SHOW } }),
    ]);

    const totalAmount = await this.codTaskRepository
      .createQueryBuilder('cod')
      .leftJoin('cod.order', 'order')
      .select('SUM(order.total_amount)', 'total')
      .where('cod.status = :status', { status: CODTaskStatus.COLLECTED })
      .getRawOne();

    return {
      pending,
      assigned,
      visited,
      collected,
      failed,
      total_collected_amount: parseFloat(totalAmount?.total || '0'),
    };
  }
}
