import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),

        // Database
        DATABASE_HOST: Joi.string().required(),
        DATABASE_PORT: Joi.number().default(5432),
        DATABASE_USERNAME: Joi.string().required(),
        DATABASE_PASSWORD: Joi.string().required(),
        DATABASE_NAME: Joi.string().required(),

        // Redis
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().default(6379),

        // JWT
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().default('24h'),

        // OTP
        OTP_TEST_MODE: Joi.boolean().default(false),
        OTP_EXPIRY_MINUTES: Joi.number().default(10),

        // Twilio
        TWILIO_ACCOUNT_SID: Joi.string().optional(),
        TWILIO_AUTH_TOKEN: Joi.string().optional(),
        TWILIO_VERIFY_SERVICE_SID: Joi.string().optional(),

        // SendGrid
        SENDGRID_API_KEY: Joi.string().optional(),
        SENDGRID_FROM_EMAIL: Joi.string().optional(),

        // S3/MinIO
        S3_ENDPOINT: Joi.string().optional(),
        S3_ACCESS_KEY: Joi.string().optional(),
        S3_SECRET_KEY: Joi.string().optional(),
        S3_BUCKET_NAME: Joi.string().default('lottery-fairness'),

        // Frontend URL
        FRONTEND_URL: Joi.string().default('http://localhost:3001'),
      }),
    }),
  ],
})
export class ConfigModule {}
