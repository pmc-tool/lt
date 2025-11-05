import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DrawsService } from './draws.service';
import { DrawsController } from './draws.controller';
import { Draw } from '../../shared/database/entities/draw.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Draw])],
  providers: [DrawsService],
  controllers: [DrawsController],
  exports: [DrawsService],
})
export class DrawsModule {}
