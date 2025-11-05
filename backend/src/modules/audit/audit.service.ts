import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLog, AuditEntityType } from '../../shared/database/entities/audit-log.entity';

export interface AuditLogQuery {
  actor_id?: string;
  action_type?: string;
  entity_type?: AuditEntityType;
  entity_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async listAuditLogs(query: AuditLogQuery) {
    const {
      actor_id,
      action_type,
      entity_type,
      entity_id,
      start_date,
      end_date,
      page = 1,
      limit = 100,
    } = query;

    const qb = this.auditLogRepository.createQueryBuilder('audit');

    if (actor_id) {
      qb.andWhere('audit.actor_id = :actor_id', { actor_id });
    }

    if (action_type) {
      qb.andWhere('audit.action_type = :action_type', { action_type });
    }

    if (entity_type) {
      qb.andWhere('audit.entity_type = :entity_type', { entity_type });
    }

    if (entity_id) {
      qb.andWhere('audit.entity_id = :entity_id', { entity_id });
    }

    if (start_date && end_date) {
      qb.andWhere('audit.created_at BETWEEN :start_date AND :end_date', {
        start_date: new Date(start_date),
        end_date: new Date(end_date),
      });
    }

    qb.orderBy('audit.created_at', 'DESC');
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

  async getAuditLog(id: string) {
    return this.auditLogRepository.findOne({ where: { id } });
  }

  async getAuditStats(startDate?: Date, endDate?: Date) {
    const qb = this.auditLogRepository.createQueryBuilder('audit');

    if (startDate && endDate) {
      qb.where('audit.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const [
      totalLogs,
      actionTypeCounts,
      entityTypeCounts,
      actorCounts,
    ] = await Promise.all([
      qb.getCount(),
      qb
        .select('audit.action_type', 'action_type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('audit.action_type')
        .getRawMany(),
      qb
        .select('audit.entity_type', 'entity_type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('audit.entity_type')
        .getRawMany(),
      qb
        .select('audit.actor_id', 'actor_id')
        .addSelect('COUNT(*)', 'count')
        .groupBy('audit.actor_id')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany(),
    ]);

    return {
      total_logs: totalLogs,
      by_action_type: actionTypeCounts,
      by_entity_type: entityTypeCounts,
      top_actors: actorCounts,
    };
  }

  async exportAuditLogs(query: AuditLogQuery) {
    // Remove pagination for export
    const { page, limit, ...filterQuery } = query;

    const qb = this.auditLogRepository.createQueryBuilder('audit');

    if (filterQuery.actor_id) {
      qb.andWhere('audit.actor_id = :actor_id', { actor_id: filterQuery.actor_id });
    }

    if (filterQuery.action_type) {
      qb.andWhere('audit.action_type = :action_type', { action_type: filterQuery.action_type });
    }

    if (filterQuery.entity_type) {
      qb.andWhere('audit.entity_type = :entity_type', { entity_type: filterQuery.entity_type });
    }

    if (filterQuery.start_date && filterQuery.end_date) {
      qb.andWhere('audit.created_at BETWEEN :start_date AND :end_date', {
        start_date: new Date(filterQuery.start_date),
        end_date: new Date(filterQuery.end_date),
      });
    }

    qb.orderBy('audit.created_at', 'DESC');
    qb.limit(10000); // Max export limit

    const logs = await qb.getMany();

    return logs.map((log) => ({
      id: log.id,
      actor_id: log.actor_id,
      actor_role: log.actor_role,
      action_type: log.action_type,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      diff_summary: log.diff_summary,
      payload_hash: log.payload_hash,
      ip_address: log.ip_address,
      created_at: log.created_at,
    }));
  }
}
