import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Draw, DrawStatus, BeaconSource } from '../../shared/database/entities/draw.entity';
import { User } from '../../shared/database/entities/user.entity';
import { AuditLog, AuditEntityType } from '../../shared/database/entities/audit-log.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AdminRole } from '../../shared/middleware/rbac.guard';

export { AdminRole };

export interface AdminLoginDto {
  email: string;
  password: string;
}

export interface CreateDrawDto {
  title: string;
  start_at: Date;
  end_at: Date;
  ticket_price: number;
  max_tickets: number;
  low_sales_threshold_pct?: number;
  beacon_source: BeaconSource;
  beacon_block_height?: number;
}

export interface UpdateDrawDto {
  title?: string;
  start_at?: Date;
  end_at?: Date;
  ticket_price?: number;
  max_tickets?: number;
  low_sales_threshold_pct?: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Draw)
    private drawRepository: Repository<Draw>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectQueue('draw-lifecycle')
    private drawQueue: Queue,
    private configService: ConfigService,
  ) {}

  async adminLogin(dto: AdminLoginDto): Promise<{ access_token: string; role: AdminRole }> {
    // Simple admin check - in production, use proper authentication
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (dto.email !== adminEmail || dto.password !== adminPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT secret not configured');
    }

    // Use the fixed admin user UUID from database
    const adminUserId = '00000000-0000-0000-0000-000000000001';

    const token = jwt.sign(
      {
        userId: adminUserId,
        role: AdminRole.SUPER_ADMIN,
        email: dto.email,
      },
      secret,
      { expiresIn: '8h' }
    );

    return {
      access_token: token,
      role: AdminRole.SUPER_ADMIN,
    };
  }

  async createDraw(adminId: string, dto: CreateDrawDto): Promise<Draw> {
    // Validate dates
    if (new Date(dto.start_at) >= new Date(dto.end_at)) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Validate ticket price and max tickets
    if (dto.ticket_price <= 0) {
      throw new BadRequestException('Ticket price must be positive');
    }

    if (dto.max_tickets <= 0 || dto.max_tickets > 1000000) {
      throw new BadRequestException('Max tickets must be between 1 and 1,000,000');
    }

    const draw = this.drawRepository.create({
      ...dto,
      status: DrawStatus.STARTED,
      tickets_sold: 0,
      low_sales_threshold_pct: dto.low_sales_threshold_pct || 30,
      created_by: adminId,
    });

    const savedDraw = await this.drawRepository.save(draw);

    // Schedule draw close job
    await this.drawQueue.add(
      'close-draw',
      { drawId: savedDraw.id },
      { delay: new Date(dto.end_at).getTime() - Date.now() }
    );

    // Audit log
    await this.createAuditLog(
      adminId,
      'DRAW_CREATED',
      AuditEntityType.DRAW,
      savedDraw.id,
      `Created draw: ${dto.title}`
    );

    return savedDraw;
  }

  async updateDraw(adminId: string, drawId: string, dto: UpdateDrawDto): Promise<Draw> {
    const draw = await this.drawRepository.findOne({ where: { id: drawId } });

    if (!draw) {
      throw new NotFoundException('Draw not found');
    }

    if (draw.status !== DrawStatus.STARTED) {
      throw new BadRequestException('Can only update draws that are in STARTED status');
    }

    Object.assign(draw, dto);
    const updated = await this.drawRepository.save(draw);

    // Audit log
    await this.createAuditLog(
      adminId,
      'DRAW_UPDATED',
      AuditEntityType.DRAW,
      drawId,
      `Updated draw: ${JSON.stringify(dto)}`
    );

    return updated;
  }

  async closeDraw(adminId: string, drawId: string): Promise<Draw> {
    const draw = await this.drawRepository.findOne({ where: { id: drawId } });

    if (!draw) {
      throw new NotFoundException('Draw not found');
    }

    if (draw.status !== DrawStatus.STARTED) {
      throw new BadRequestException('Draw is not in STARTED status');
    }

    // Trigger close job immediately
    await this.drawQueue.add('close-draw', { drawId }, { priority: 1 });

    // Audit log
    await this.createAuditLog(
      adminId,
      'DRAW_CLOSE_TRIGGERED',
      AuditEntityType.DRAW,
      drawId,
      'Triggered draw close manually'
    );

    return draw;
  }

  async settleDraw(adminId: string, drawId: string): Promise<Draw> {
    const draw = await this.drawRepository.findOne({ where: { id: drawId } });

    if (!draw) {
      throw new NotFoundException('Draw not found');
    }

    if (draw.status !== DrawStatus.CLOSED) {
      throw new BadRequestException('Draw must be CLOSED before settling');
    }

    if (!draw.merkle_root) {
      throw new BadRequestException('Draw has no merkle root (close process may have failed)');
    }

    // Trigger beacon fetch and winner computation
    await this.drawQueue.add('fetch-beacon', { drawId }, { priority: 1 });

    // Audit log
    await this.createAuditLog(
      adminId,
      'DRAW_SETTLE_TRIGGERED',
      AuditEntityType.DRAW,
      drawId,
      'Triggered draw settlement manually'
    );

    return draw;
  }

  async listDraws(query: {
    status?: DrawStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: Draw[]; pagination: any }> {
    const { status, page = 1, limit = 20 } = query;

    const qb = this.drawRepository.createQueryBuilder('draw');

    if (status) {
      qb.where('draw.status = :status', { status });
    }

    qb.orderBy('draw.created_at', 'DESC');
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

  async getDraw(drawId: string): Promise<Draw> {
    const draw = await this.drawRepository.findOne({ where: { id: drawId } });

    if (!draw) {
      throw new NotFoundException('Draw not found');
    }

    return draw;
  }

  async deleteDraw(adminId: string, drawId: string): Promise<void> {
    const draw = await this.drawRepository.findOne({ where: { id: drawId } });

    if (!draw) {
      throw new NotFoundException('Draw not found');
    }

    if (draw.tickets_sold > 0) {
      throw new BadRequestException('Cannot delete draw with sold tickets');
    }

    await this.drawRepository.remove(draw);

    // Audit log
    await this.createAuditLog(
      adminId,
      'DRAW_DELETED',
      AuditEntityType.DRAW,
      drawId,
      `Deleted draw: ${draw.title}`
    );
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
      ip_address: '0.0.0.0', // TODO: Get from request
      user_agent: null,
    });

    await this.auditLogRepository.save(auditLog);
  }
}
