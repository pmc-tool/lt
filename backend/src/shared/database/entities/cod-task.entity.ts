import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';

export enum CODTaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  VISITED = 'visited',
  COLLECTED = 'collected',
  FAILED_NO_SHOW = 'failed_no_show',
  FAILED_ADDRESS_INVALID = 'failed_address_invalid',
  CANCELED = 'canceled',
}

@Entity('cod_tasks')
@Index('uq_cod_tasks_order', ['order_id'], { unique: true })
@Index('idx_cod_tasks_agent_status', ['agent_id', 'status'])
@Index('idx_cod_tasks_status_visit', ['status', 'visit_at'])
export class CODTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  order_id: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'uuid', nullable: true })
  agent_id: string | null;

  @Column({
    type: 'enum',
    enum: CODTaskStatus,
    default: CODTaskStatus.PENDING,
  })
  status: CODTaskStatus;

  @Column({ type: 'timestamp', nullable: true })
  visit_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  visited_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  collected_at: Date | null;

  @Column({ type: 'text', nullable: true })
  fail_reason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
