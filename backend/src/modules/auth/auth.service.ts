import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { User, UserStatus, Language } from '../../shared/database/entities/user.entity';
import { AuthSession } from '../../shared/database/entities/auth-session.entity';
import { CacheService } from '../../shared/cache/cache.service';

export interface OTPRequestDto {
  identifier: string; // phone or email
  language?: Language;
}

export interface OTPVerifyDto {
  session_id: string;
  otp_code: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    phone?: string;
    email?: string;
    name: string;
    status: UserStatus;
    language: Language;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuthSession)
    private authSessionRepository: Repository<AuthSession>,
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {}

  async requestOTP(dto: OTPRequestDto, ipAddress: string, deviceFingerprint?: string): Promise<{ session_id: string; expires_at: Date }> {
    const { identifier, language = Language.EN } = dto;

    // Validate identifier format
    const isPhone = identifier.startsWith('+');
    const isEmail = identifier.includes('@');

    if (!isPhone && !isEmail) {
      throw new BadRequestException('Identifier must be a valid phone number (E.164) or email');
    }

    // Check rate limit
    const rateLimitKey = `otp:request:${identifier}`;
    const { allowed } = await this.cacheService.checkRateLimit(rateLimitKey, 3, 3600); // 3 per hour

    if (!allowed) {
      throw new BadRequestException('Too many OTP requests. Please try again in 1 hour.');
    }

    // Generate OTP
    const otpCode = this.generateOTP();
    const otpHash = await bcrypt.hash(otpCode, 10);

    const expiryMinutes = this.configService.get<number>('OTP_EXPIRY_MINUTES', 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Create auth session
    const session = this.authSessionRepository.create({
      phone_or_email: identifier,
      otp_code_hash: otpHash,
      otp_sent_at: new Date(),
      otp_expires_at: expiresAt,
      verified: false,
      device_fingerprint: deviceFingerprint || null,
      ip_address: ipAddress,
    });

    await this.authSessionRepository.save(session);

    // Send OTP (in test mode, just log it)
    if (this.configService.get<boolean>('OTP_TEST_MODE')) {
      console.log(`🔐 OTP for ${identifier}: ${otpCode}`);
    } else {
      // TODO: Send via Twilio/SendGrid
      await this.sendOTP(identifier, otpCode, language);
    }

    return {
      session_id: session.id,
      expires_at: expiresAt,
    };
  }

  async verifyOTP(dto: OTPVerifyDto): Promise<AuthResponse> {
    const { session_id, otp_code } = dto;

    // Find session
    const session = await this.authSessionRepository.findOne({
      where: { id: session_id },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    if (session.verified) {
      throw new BadRequestException('OTP already verified');
    }

    if (new Date() > session.otp_expires_at) {
      throw new UnauthorizedException('OTP expired');
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp_code, session.otp_code_hash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    // Mark session as verified
    session.verified = true;

    // Find or create user
    let user = await this.userRepository.findOne({
      where: [
        { phone: session.phone_or_email },
        { email: session.phone_or_email },
      ],
    });

    if (!user) {
      // Create new user
      const isPhone = session.phone_or_email.startsWith('+');
      user = this.userRepository.create({
        phone: isPhone ? session.phone_or_email : null,
        email: !isPhone ? session.phone_or_email : null,
        name: isPhone ? `User ${session.phone_or_email.slice(-4)}` : session.phone_or_email.split('@')[0],
        status: UserStatus.ACTIVE,
        language: Language.EN,
      });
      await this.userRepository.save(user);
    }

    // Link session to user
    session.user_id = user.id;
    await this.authSessionRepository.save(session);

    // Generate JWT
    const token = this.generateJWT(user);

    return {
      access_token: token,
      user: {
        id: user.id,
        phone: user.phone || undefined,
        email: user.email || undefined,
        name: user.name,
        status: user.status,
        language: user.language,
      },
    };
  }

  private generateOTP(): string {
    // In test mode, always return 123456
    if (this.configService.get<boolean>('OTP_TEST_MODE')) {
      return '123456';
    }

    // Generate 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateJWT(user: User): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '24h');

    const payload = {
      userId: user.id,
      phone: user.phone,
      email: user.email,
      status: user.status,
    };

    return jwt.sign(payload, secret!, { expiresIn });
  }

  private async sendOTP(identifier: string, otpCode: string, language: Language): Promise<void> {
    // TODO: Implement Twilio/SendGrid integration
    console.log(`Sending OTP ${otpCode} to ${identifier} in ${language}`);
  }
}
