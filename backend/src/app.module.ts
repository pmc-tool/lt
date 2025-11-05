import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './shared/database/database.module';
import { CacheModule } from './shared/cache/cache.module';
import { QueueModule } from './shared/jobs/queue.module';
import { CryptoModule } from './shared/crypto/crypto.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DrawsModule } from './modules/draws/draws.module';
import { OrdersModule } from './modules/orders/orders.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { FairnessModule } from './modules/fairness/fairness.module';
import { AdminModule } from './modules/admin/admin.module';
import { CODModule } from './modules/cod/cod.module';
import { UsersAdminModule } from './modules/users-admin/users-admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CacheModule,
    QueueModule,
    CryptoModule,
    AuthModule,
    UsersModule,
    DrawsModule,
    OrdersModule,
    TicketsModule,
    FairnessModule,
    AdminModule,
    CODModule,
    UsersAdminModule,
    AuditModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
