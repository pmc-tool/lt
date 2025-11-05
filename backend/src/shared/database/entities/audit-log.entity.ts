import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditEntityType {
  USER = 'user',
  DRAW = 'draw',
  ORDER = 'order',
  TICKET = 'ticket',
  REFUND = 'refund',
  BAN = 'ban',
  SETTINGS = 'settings',
}

@Entity('audit_logs')
@Index('idx_audit_logs_created', ['created_at'])
@Index('idx_audit_logs_actor_created', ['actor_id', 'created_at'])
@Index('idx_audit_logs_action_created', ['action_type', 'created_at'])
@Index('idx_audit_logs_entity', ['entity_type', 'entity_id'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  actor_id: string;

  @Column({ type: 'varchar', length: 100 })
  actor_role: string;

  @Column({ type: 'varchar', length: 100 })
  action_type: string;

  @Column({
    type: 'enum',
    enum: AuditEntityType,
  })
  entity_type: AuditEntityType;

  @Column({ type: 'uuid', nullable: true })
  entity_id: string | null;

  @Column({ type: 'text', nullable: true })
  diff_summary: string | null;

  @Column({ type: 'varchar', length: 64 })
  payload_hash: string;

  @Column({ type: 'varchar', length: 45 })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
