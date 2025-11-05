import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../../shared/database/entities/user.entity';
import { AuthSession } from '../../shared/database/entities/auth-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, AuthSession])],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
