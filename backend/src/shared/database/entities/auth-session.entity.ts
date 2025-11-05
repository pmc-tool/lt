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

@Entity('auth_sessions')
@Index('idx_auth_sessions_phone_sent', ['phone_or_email', 'otp_sent_at'])
@Index('idx_auth_sessions_ip_sent', ['ip_address', 'otp_sent_at'])
export class AuthSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'varchar', length: 255 })
  phone_or_email: string;

  @Column({ type: 'varchar', length: 255 })
  otp_code_hash: string;

  @Column({ type: 'timestamp' })
  otp_sent_at: Date;

  @Column({ type: 'timestamp' })
  otp_expires_at: Date;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  device_fingerprint: string | null;

  @Column({ type: 'varchar', length: 45 })
  ip_address: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
