import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Draw } from '../../shared/database/entities/draw.entity';
import { Order } from '../../shared/database/entities/order.entity';
import { Ticket } from '../../shared/database/entities/ticket.entity';
import { CODTask } from '../../shared/database/entities/cod-task.entity';
import { User } from '../../shared/database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Draw, Order, Ticket, CODTask, User])],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
