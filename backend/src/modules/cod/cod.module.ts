import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CODService } from './cod.service';
import { CODController } from './cod.controller';
import { CODTask } from '../../shared/database/entities/cod-task.entity';
import { Order } from '../../shared/database/entities/order.entity';
import { Ticket } from '../../shared/database/entities/ticket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CODTask, Order, Ticket])],
  providers: [CODService],
  controllers: [CODController],
  exports: [CODService],
})
export class CODModule {}
