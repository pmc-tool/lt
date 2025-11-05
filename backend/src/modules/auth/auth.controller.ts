import {
  Controller,
  Post,
  Body,
  Ip,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { AuthService, OTPRequestDto, OTPVerifyDto } from './auth.service';
import { RateLimitGuard, OTPRateLimit } from '../../shared/middleware/rate-limit.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('otp/request')
  @UseGuards(RateLimitGuard)
  @OTPRateLimit()
  async requestOTP(
    @Body() dto: OTPRequestDto,
    @Ip() ip: string,
    @Headers('x-device-fingerprint') deviceFingerprint?: string,
  ) {
    return this.authService.requestOTP(dto, ip, deviceFingerprint);
  }

  @Post('otp/verify')
  async verifyOTP(@Body() dto: OTPVerifyDto) {
    return this.authService.verifyOTP(dto);
  }
}
