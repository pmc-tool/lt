import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User, UserStatus } from '../../shared/database/entities/user.entity';
import { Ban, BanType } from '../../shared/database/entities/ban.entity';
import { Order } from '../../shared/database/entities/order.entity';
import { Ticket } from '../../shared/database/entities/ticket.entity';
import { AuditLog, AuditEntityType } from '../../shared/database/entities/audit-log.entity';
import * as crypto from 'crypto';

export interface UserListQuery {
  search?: string;
  status?: UserStatus;
  page?: number;
  limit?: number;
}

export interface BanUserDto {
  ban_type: 'SOFT' | 'HARD';
  reason: string;
  duration_hours?: number;
}

@Injectable()
export class UsersAdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Ban)
    private banRepository: Repository<Ban>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async listUsers(query: UserListQuery) {
    const { search, status, page = 1, limit = 50 } = query;

    const qb = this.userRepository.createQueryBuilder('user');

    if (search) {
      qb.where('(user.name ILIKE :search OR user.phone LIKE :search OR user.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (status) {
      qb.andWhere('user.status = :status', { status });
    }

    qb.orderBy('user.created_at', 'DESC');
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

  async getUserDetails(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user statistics
    const [totalOrders, totalTickets, activeBans] = await Promise.all([
      this.orderRepository.count({ where: { user_id: userId } }),
      this.ticketRepository.count({ where: { user_id: userId } }),
      this.banRepository.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
      }),
    ]);

    // Get recent orders
    const recentOrders = await this.orderRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: 10,
    });

    return {
      user,
      stats: {
        total_orders: totalOrders,
        total_tickets: totalTickets,
        active_bans: activeBans.length,
      },
      bans: activeBans,
      recent_orders: recentOrders,
    };
  }

  async banUser(adminId: string, userId: string, dto: BanUserDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate ban expiry
    let expiresAt: Date | null = null;
    if (dto.duration_hours) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + dto.duration_hours);
    }

    // Create ban record
    const ban = this.banRepository.create({
      user_id: userId,
      type: dto.ban_type === 'SOFT' ? BanType.SOFT : BanType.HARD,
      reason: dto.reason,
      expires_at: expiresAt,
      created_by: adminId,
    });

    await this.banRepository.save(ban);

    // Update user status
    if (dto.ban_type === 'SOFT') {
      user.status = UserStatus.SOFT_BANNED;
    } else {
      user.status = UserStatus.HARD_BANNED;
    }

    await this.userRepository.save(user);

    // Create audit log
    await this.createAuditLog(
      adminId,
      'USER_BANNED',
      AuditEntityType.BAN,
      ban.id,
      `${dto.ban_type} ban: ${dto.reason}${dto.duration_hours ? ` (${dto.duration_hours}h)` : ''}`
    );

    return ban;
  }

  async unbanUser(adminId: string, userId: string, reason: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is banned
    if (user.status !== UserStatus.SOFT_BANNED && user.status !== UserStatus.HARD_BANNED) {
      throw new NotFoundException('User is not banned');
    }

    // Update user status to active
    user.status = UserStatus.ACTIVE;
    await this.userRepository.save(user);

    // Lift all active bans
    await this.banRepository
      .createQueryBuilder()
      .update(Ban)
      .set({ lifted_at: new Date(), lifted_by: adminId })
      .where('user_id = :userId', { userId })
      .andWhere('lifted_at IS NULL')
      .execute();

    // Create audit log
    await this.createAuditLog(
      adminId,
      'USER_UNBANNED',
      AuditEntityType.USER,
      userId,
      `Unbanned: ${reason}`
    );

    return { success: true, user };
  }

  async flagUser(adminId: string, userId: string, flags: string[]) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Store flags in user notes or create separate flags table
    // For now, we'll use audit log to track flags
    await this.createAuditLog(
      adminId,
      'USER_FLAGGED',
      AuditEntityType.USER,
      userId,
      `Flags: ${flags.join(', ')}`
    );

    return { success: true, flags };
  }

  async getUserHistory(userId: string) {
    const auditLogs = await this.auditLogRepository.find({
      where: { entity_id: userId },
      order: { created_at: 'DESC' },
      take: 100,
    });

    return auditLogs;
  }

  private async createAuditLog(
    actorId: string,
    actionType: string,
    entityType: AuditEntityType,
    entityId: string,
    diffSummary: string
  ): Promise<void> {
    const payload = JSON.stringify({ actionType, entityType, entityId, diffSummary, timestamp: Date.now() });
    const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');

    const auditLog = this.auditLogRepository.create({
      actor_id: actorId,
      actor_role: 'super_admin',
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      diff_summary: diffSummary,
      payload_hash: payloadHash,
      ip_address: '0.0.0.0',
      user_agent: null,
    });

    await this.auditLogRepository.save(auditLog);
  }
}
