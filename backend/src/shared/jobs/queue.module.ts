import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        },
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 1000, // Keep last 1000 failed jobs
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      }),
      inject: [ConfigService],
    }),
    // Register specific queues here as they're implemented
    // BullModule.registerQueue({ name: 'draw-close' }),
    // BullModule.registerQueue({ name: 'beacon-fetch' }),
    // BullModule.registerQueue({ name: 'winner-compute' }),
    // BullModule.registerQueue({ name: 'ticket-expiry' }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
