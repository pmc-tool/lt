import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Draw } from './draw.entity';

export enum FairnessEventType {
  MERKLE_PUBLISHED = 'MERKLE_PUBLISHED',
  BEACON_FETCHED = 'BEACON_FETCHED',
  WINNER_COMPUTED = 'WINNER_COMPUTED',
}

@Entity('fairness_events')
@Index('idx_fairness_events_draw_type_created', [
  'draw_id',
  'event_type',
  'created_at',
])
@Index('idx_fairness_events_created', ['created_at'])
export class FairnessEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  draw_id: string;

  @ManyToOne(() => Draw)
  @JoinColumn({ name: 'draw_id' })
  draw: Draw;

  @Column({
    type: 'enum',
    enum: FairnessEventType,
  })
  event_type: FairnessEventType;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ type: 'varchar', length: 64 })
  payload_hash: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
