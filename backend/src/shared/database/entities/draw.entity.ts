import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DrawStatus {
  STARTED = 'started',
  CLOSED = 'closed',
  SETTLED = 'settled',
}

export enum BeaconSource {
  BITCOIN = 'bitcoin',
  DRAND = 'drand',
}

@Entity('draws')
@Index('idx_draws_status_end', ['status', 'end_at'])
@Index('idx_draws_created', ['created_at'])
export class Draw {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    type: 'enum',
    enum: DrawStatus,
    default: DrawStatus.STARTED,
  })
  status: DrawStatus;

  @Column({ type: 'timestamp' })
  start_at: Date;

  @Column({ type: 'timestamp' })
  end_at: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  ticket_price: number;

  @Column({ type: 'integer' })
  max_tickets: number;

  @Column({ type: 'integer', default: 0 })
  tickets_sold: number;

  @Column({ type: 'integer', default: 30 })
  low_sales_threshold_pct: number;

  @Column({
    type: 'enum',
    enum: BeaconSource,
  })
  beacon_source: BeaconSource;

  @Column({ type: 'text', nullable: true })
  beacon_rule: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  beacon_value: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  merkle_root: string | null;

  @Column({ type: 'uuid', nullable: true })
  winner_ticket_id: string | null;

  @Column({ type: 'varchar', length: 500 })
  terms_url: string;

  @Column({ type: 'uuid' })
  created_by: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  settled_at: Date | null;
}
