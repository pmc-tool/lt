import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FairnessService } from './fairness.service';
import { FairnessController } from './fairness.controller';
import { Draw } from '../../shared/database/entities/draw.entity';
import { Ticket } from '../../shared/database/entities/ticket.entity';
import { FairnessEvent } from '../../shared/database/entities/fairness-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Draw, Ticket, FairnessEvent])],
  providers: [FairnessService],
  controllers: [FairnessController],
  exports: [FairnessService],
})
export class FairnessModule {}
