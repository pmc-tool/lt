import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Draw, DrawStatus } from '../../shared/database/entities/draw.entity';
import { Order, OrderStatus } from '../../shared/database/entities/order.entity';
import { Ticket, TicketStatus } from '../../shared/database/entities/ticket.entity';
import { CODTask, CODTaskStatus } from '../../shared/database/entities/cod-task.entity';
import { User, UserStatus } from '../../shared/database/entities/user.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Draw)
    private drawRepository: Repository<Draw>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(CODTask)
    private codTaskRepository: Repository<CODTask>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getSalesReport(startDate?: Date, endDate?: Date) {
    const qb = this.orderRepository.createQueryBuilder('order');

    if (startDate && endDate) {
      qb.where('order.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const [
      totalOrders,
      totalRevenue,
      ordersByStatus,
      ordersByDraw,
    ] = await Promise.all([
      qb.getCount(),
      qb
        .select('SUM(order.total_amount)', 'total')
        .where('order.status = :status', { status: OrderStatus.COLLECTED })
        .getRawOne(),
      qb
        .select('order.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(order.total_amount)', 'amount')
        .groupBy('order.status')
        .getRawMany(),
      qb
        .select('order.draw_id', 'draw_id')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(order.total_amount)', 'amount')
        .groupBy('order.draw_id')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany(),
    ]);

    return {
      total_orders: totalOrders,
      total_revenue: parseFloat(totalRevenue?.total || '0'),
      by_status: ordersByStatus,
      top_draws: ordersByDraw,
    };
  }

  async getCODReport(startDate?: Date, endDate?: Date) {
    const qb = this.codTaskRepository.createQueryBuilder('cod');

    if (startDate && endDate) {
      qb.where('cod.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const [
      totalTasks,
      collectionRate,
      tasksByStatus,
      avgCollectionTime,
    ] = await Promise.all([
      qb.getCount(),
      qb
        .select('COUNT(*)', 'collected')
        .where('cod.status = :status', { status: CODTaskStatus.COLLECTED })
        .getRawOne(),
      qb
        .select('cod.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('cod.status')
        .getRawMany(),
      qb
        .select('AVG(EXTRACT(EPOCH FROM (cod.collected_at - cod.created_at)) / 3600)', 'avg_hours')
        .where('cod.collected_at IS NOT NULL')
        .getRawOne(),
    ]);

    const collectionRatePct = totalTasks > 0
      ? ((parseFloat(collectionRate?.collected || '0') / totalTasks) * 100).toFixed(2)
      : '0.00';

    return {
      total_tasks: totalTasks,
      collection_rate_pct: collectionRatePct,
      by_status: tasksByStatus,
      avg_collection_hours: parseFloat(avgCollectionTime?.avg_hours || '0').toFixed(2),
    };
  }

  async getDrawReport(drawId: string) {
    const draw = await this.drawRepository.findOne({ where: { id: drawId } });

    if (!draw) {
      return null;
    }

    const [
      totalOrders,
      totalRevenue,
      ticketsByStatus,
      uniqueBuyers,
    ] = await Promise.all([
      this.orderRepository.count({ where: { draw_id: drawId } }),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.total_amount)', 'total')
        .where('order.draw_id = :drawId', { drawId })
        .andWhere('order.status = :status', { status: OrderStatus.COLLECTED })
        .getRawOne(),
      this.ticketRepository
        .createQueryBuilder('ticket')
        .select('ticket.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('ticket.draw_id = :drawId', { drawId })
        .groupBy('ticket.status')
        .getRawMany(),
      this.orderRepository
        .createQueryBuilder('order')
        .select('COUNT(DISTINCT order.user_id)', 'count')
        .where('order.draw_id = :drawId', { drawId })
        .getRawOne(),
    ]);

    const sellThroughPct = draw.max_tickets > 0
      ? ((draw.tickets_sold / draw.max_tickets) * 100).toFixed(2)
      : '0.00';

    return {
      draw,
      total_orders: totalOrders,
      total_revenue: parseFloat(totalRevenue?.total || '0'),
      sell_through_pct: sellThroughPct,
      tickets_by_status: ticketsByStatus,
      unique_buyers: parseInt(uniqueBuyers?.count || '0'),
    };
  }

  async getAbuseMetrics(startDate?: Date, endDate?: Date) {
    const qb = this.userRepository.createQueryBuilder('user');

    if (startDate && endDate) {
      qb.where('user.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const [
      totalUsers,
      bannedUsers,
      usersByStatus,
      failedOrders,
    ] = await Promise.all([
      qb.getCount(),
      qb
        .where('user.status IN (:...statuses)', {
          statuses: [UserStatus.SOFT_BANNED, UserStatus.HARD_BANNED],
        })
        .getCount(),
      qb
        .select('user.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.status')
        .getRawMany(),
      this.orderRepository
        .createQueryBuilder('order')
        .select('COUNT(*)', 'count')
        .where('order.status = :status', { status: OrderStatus.FAILED })
        .getRawOne(),
    ]);

    const banRate = totalUsers > 0
      ? ((bannedUsers / totalUsers) * 100).toFixed(2)
      : '0.00';

    return {
      total_users: totalUsers,
      banned_users: bannedUsers,
      ban_rate_pct: banRate,
      users_by_status: usersByStatus,
      failed_orders: parseInt(failedOrders?.count || '0'),
    };
  }

  async getDashboardStats() {
    const [
      totalUsers,
      activeDraws,
      pendingCOD,
      todayRevenue,
    ] = await Promise.all([
      this.userRepository.count({ where: { status: UserStatus.ACTIVE } }),
      this.drawRepository.count({ where: { status: DrawStatus.STARTED } }),
      this.codTaskRepository.count({ where: { status: CODTaskStatus.PENDING } }),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.total_amount)', 'total')
        .where('order.status = :status', { status: OrderStatus.COLLECTED })
        .andWhere('DATE(order.created_at) = CURRENT_DATE')
        .getRawOne(),
    ]);

    return {
      total_active_users: totalUsers,
      active_draws: activeDraws,
      pending_cod_tasks: pendingCOD,
      today_revenue: parseFloat(todayRevenue?.total || '0'),
    };
  }
}
