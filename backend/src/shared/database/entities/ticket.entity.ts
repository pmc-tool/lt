import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Draw } from './draw.entity';
import { Order } from './order.entity';

export enum TicketStatus {
  RESERVED = 'reserved',
  PAID = 'paid',
  EXPIRED = 'expired',
  ENTERED = 'entered',
}

@Entity('tickets')
@Unique('uq_tickets_draw_serial', ['draw_id', 'serial'])
@Index('idx_tickets_user_created', ['user_id', 'created_at'])
@Index('idx_tickets_order', ['order_id'])
@Index('idx_tickets_draw_status', ['draw_id', 'status'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  draw_id: string;

  @ManyToOne(() => Draw)
  @JoinColumn({ name: 'draw_id' })
  draw: Draw;

  @Column({ type: 'uuid' })
  order_id: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'integer' })
  serial: number;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.RESERVED,
  })
  status: TicketStatus;

  @Column({ type: 'varchar', length: 64, nullable: true })
  leaf_hash: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  paid_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expired_at: Date | null;
}
