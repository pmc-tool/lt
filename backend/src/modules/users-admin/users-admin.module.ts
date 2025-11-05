import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersAdminService } from './users-admin.service';
import { UsersAdminController } from './users-admin.controller';
import { User } from '../../shared/database/entities/user.entity';
import { Ban } from '../../shared/database/entities/ban.entity';
import { Order } from '../../shared/database/entities/order.entity';
import { Ticket } from '../../shared/database/entities/ticket.entity';
import { AuditLog } from '../../shared/database/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Ban, Order, Ticket, AuditLog])],
  providers: [UsersAdminService],
  controllers: [UsersAdminController],
  exports: [UsersAdminService],
})
export class UsersAdminModule {}
