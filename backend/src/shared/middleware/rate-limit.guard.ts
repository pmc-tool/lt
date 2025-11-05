import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../cache/cache.service';

export interface RateLimitOptions {
  keyPrefix: string;
  points: number; // Maximum number of requests
  duration: number; // Time window in seconds
  keyGenerator?: (request: any) => string;
}

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const key = this.generateKey(options, request);

    const { allowed, remaining } = await this.cacheService.checkRateLimit(
      key,
      options.points,
      options.duration,
    );

    // Set rate limit headers
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', options.points);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader(
      'X-RateLimit-Reset',
      Date.now() + options.duration * 1000,
    );

    if (!allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: options.duration,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private generateKey(options: RateLimitOptions, request: any): string {
    if (options.keyGenerator) {
      return `${options.keyPrefix}:${options.keyGenerator(request)}`;
    }

    // Default: use IP address
    const ip = request.ip || request.connection.remoteAddress;
    return `${options.keyPrefix}:${ip}`;
  }
}

// Common rate limit decorators
export const OTPRateLimit = () =>
  RateLimit({
    keyPrefix: 'otp',
    points: 3,
    duration: 3600, // 3 requests per hour
    keyGenerator: (req) => req.body.identifier || req.ip,
  });

export const OrderRateLimit = () =>
  RateLimit({
    keyPrefix: 'order',
    points: 10,
    duration: 3600, // 10 orders per hour
    keyGenerator: (req) => req.user?.userId || req.ip,
  });

export const DrawListRateLimit = () =>
  RateLimit({
    keyPrefix: 'draw-list',
    points: 100,
    duration: 60, // 100 requests per minute
  });
