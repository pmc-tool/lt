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

export enum BanType {
  SOFT = 'soft',
  HARD = 'hard',
}

@Entity('bans')
@Index('idx_bans_user_lifted', ['user_id', 'lifted_at'])
@Index('idx_bans_created', ['created_at'])
export class Ban {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: BanType,
  })
  type: BanType;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date | null;

  @Column({ type: 'uuid' })
  created_by: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  lifted_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  lifted_by: string | null;
}
