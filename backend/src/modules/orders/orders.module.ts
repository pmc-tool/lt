import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from '../../shared/database/entities/order.entity';
import { Ticket } from '../../shared/database/entities/ticket.entity';
import { Draw } from '../../shared/database/entities/draw.entity';
import { User } from '../../shared/database/entities/user.entity';
import { Address } from '../../shared/database/entities/address.entity';
import { CODTask } from '../../shared/database/entities/cod-task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Ticket, Draw, User, Address, CODTask])],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
