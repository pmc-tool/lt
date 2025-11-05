import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Draw } from '../../shared/database/entities/draw.entity';
import { User } from '../../shared/database/entities/user.entity';
import { AuditLog } from '../../shared/database/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Draw, User, AuditLog]),
    BullModule.registerQueue({
      name: 'draw-lifecycle',
    }),
  ],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
