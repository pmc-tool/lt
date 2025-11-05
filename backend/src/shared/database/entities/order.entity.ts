import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Draw } from './draw.entity';
import { Address } from './address.entity';

export enum OrderStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  COLLECTED = 'collected',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

@Entity('orders')
@Index('idx_orders_user_created', ['user_id', 'created_at'])
@Index('idx_orders_draw_status', ['draw_id', 'status'])
@Index('idx_orders_status_expires', ['status', 'expires_at'])
@Index('idx_orders_agent_status', ['assigned_agent_id', 'status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  draw_id: string;

  @ManyToOne(() => Draw)
  @JoinColumn({ name: 'draw_id' })
  draw: Draw;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'uuid' })
  address_id: string;

  @ManyToOne(() => Address)
  @JoinColumn({ name: 'address_id' })
  address: Address;

  @Column({ type: 'uuid', nullable: true })
  assigned_agent_id: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  assigned_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  collected_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  failed_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  canceled_at: Date | null;

  @Column({ type: 'timestamp' })
  expires_at: Date;
}
