import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UserStatus {
  ACTIVE = 'active',
  SOFT_BANNED = 'soft_banned',
  HARD_BANNED = 'hard_banned',
}

export enum Language {
  EN = 'en',
  BN = 'bn',
}

@Entity('users')
@Index('idx_users_phone', ['phone'], { where: 'phone IS NOT NULL' })
@Index('idx_users_email', ['email'], { where: 'email IS NOT NULL' })
@Index('idx_users_status', ['status'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({
    type: 'enum',
    enum: Language,
    default: Language.EN,
  })
  language: Language;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
