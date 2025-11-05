# Deployment Guide

## Overview
This guide covers deploying the Provably-Fair Lottery Platform to production environments. The platform consists of a NestJS backend, Next.js frontend, PostgreSQL database, Redis cache, and MinIO object storage.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Database Setup](#database-setup)
- [Monitoring & Observability](#monitoring--observability)
- [Security Checklist](#security-checklist)
- [Scaling Guidelines](#scaling-guidelines)

## Prerequisites

### System Requirements

**Minimum (Development/Staging):**
- 2 CPU cores
- 4 GB RAM
- 20 GB storage
- Ubuntu 20.04+ or similar Linux distribution

**Recommended (Production for 100k DAU):**
- 4-8 CPU cores
- 16 GB RAM
- 100 GB SSD storage
- Load balancer
- CDN

### Software Requirements
- Docker 24.0+
- Docker Compose 2.0+
- Node.js 20 LTS
- PostgreSQL 16
- Redis 7
- Nginx (for reverse proxy)

## Architecture Overview

```
┌─────────────┐
│   Users     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│     CDN     │ (Static assets)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Nginx     │ (Reverse proxy, SSL termination)
└──────┬──────┘
       │
       ├────────────────┬────────────────┐
       ▼                ▼                ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Next.js │    │  Next.js │    │  Next.js │  (Frontend - Autoscaling)
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     └───────────────┴───────────────┘
                     │
                     ▼
             ┌──────────────┐
             │ Load Balancer│
             └──────┬───────┘
                    │
       ├────────────┼────────────┐
       ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│  NestJS  │ │  NestJS  │ │  NestJS  │  (Backend - Autoscaling)
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │
     └────────────┴────────────┘
                  │
     ├────────────┼────────────┐
     ▼            ▼            ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│PostgreSQL│ │  Redis  │ │  MinIO  │
│(Primary) │ │(Cache)  │ │(Storage)│
└─────────┘ └─────────┘ └─────────┘
     │
     ▼
┌─────────┐
│PostgreSQL│
│(Replica) │
└─────────┘
```

## Environment Configuration

### Backend Environment Variables

Create `backend/.env.production`:

```bash
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_HOST=postgres-primary.example.com
DATABASE_PORT=5432
DATABASE_USERNAME=lottery_user
DATABASE_PASSWORD=<strong-password>
DATABASE_NAME=lottery
DATABASE_SSL=true
DATABASE_POOL_SIZE=20

# Redis
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>
REDIS_TLS=true

# JWT & Security
JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_EXPIRES_IN=24h
ADMIN_JWT_EXPIRES_IN=8h

# OTP Configuration
OTP_TEST_MODE=false
TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>
TWILIO_VERIFY_SERVICE_SID=<your-verify-service-sid>

# SendGrid (Email)
SENDGRID_API_KEY=<your-sendgrid-key>
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# MinIO / S3
MINIO_ENDPOINT=s3.amazonaws.com  # or your MinIO endpoint
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=<access-key>
MINIO_SECRET_KEY=<secret-key>
MINIO_BUCKET=lottery-audit-logs

# Rate Limiting
OTP_RATE_LIMIT_MAX=3
OTP_RATE_LIMIT_WINDOW=3600
ORDER_RATE_LIMIT_MAX=10
ORDER_RATE_LIMIT_WINDOW=3600

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
LOG_LEVEL=info

# Admin Credentials (First Run Only)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<generate-strong-password>
ADMIN_NAME=System Administrator
```

### Frontend Environment Variables

Create `frontend/.env.production`:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/v1
NODE_ENV=production
```

### Generate Secrets

```bash
# JWT Secret
openssl rand -base64 32

# Strong passwords
openssl rand -base64 24
```

## Docker Deployment

### Option 1: Docker Compose (Simple Deployment)

**docker-compose.production.yml:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: lottery
      POSTGRES_USER: lottery_user
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U lottery_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
    env_file:
      - ./backend/.env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "3000:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
    env_file:
      - ./frontend/.env.production
    depends_on:
      - backend
    ports:
      - "3001:3001"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

**Deploy:**
```bash
docker-compose -f docker-compose.production.yml up -d
```

### Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public

EXPOSE 3001

CMD ["npm", "start"]
```

### Nginx Configuration

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3000;
    }

    upstream frontend {
        server frontend:3001;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=otp_limit:10m rate=3r/m;

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;

        # Redirect to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API endpoints
        location /v1 {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Rate limiting
            limit_req zone=api_limit burst=20 nodelay;
        }

        # Special rate limit for OTP
        location /v1/auth/otp {
            proxy_pass http://backend;
            limit_req zone=otp_limit burst=5 nodelay;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static assets caching
        location /_next/static {
            proxy_pass http://frontend;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }
    }
}
```

## Cloud Deployment

### AWS Deployment

#### 1. RDS PostgreSQL
```bash
# Create RDS instance
aws rds create-db-instance \
    --db-instance-identifier lottery-postgres \
    --db-instance-class db.t3.medium \
    --engine postgres \
    --engine-version 16.1 \
    --master-username lottery_user \
    --master-user-password <password> \
    --allocated-storage 100 \
    --storage-type gp3 \
    --vpc-security-group-ids sg-xxxxx \
    --multi-az \
    --backup-retention-period 7
```

#### 2. ElastiCache Redis
```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
    --cache-cluster-id lottery-redis \
    --cache-node-type cache.t3.medium \
    --engine redis \
    --num-cache-nodes 1 \
    --security-group-ids sg-xxxxx
```

#### 3. ECS Fargate (Backend)
```bash
# Create ECR repository
aws ecr create-repository --repository-name lottery-backend

# Build and push image
docker build -t lottery-backend backend/
docker tag lottery-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/lottery-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/lottery-backend:latest

# Create ECS service
aws ecs create-service \
    --cluster lottery-cluster \
    --service-name lottery-backend \
    --task-definition lottery-backend:1 \
    --desired-count 3 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}"
```

#### 4. Vercel (Frontend - Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod

# Configure environment variables in Vercel dashboard
```

### Digital Ocean Deployment

#### 1. Managed Database (PostgreSQL)
- Create through Digital Ocean control panel
- Choose PostgreSQL 16
- Select 2GB/2vCPU or higher
- Enable automated backups

#### 2. Managed Redis
- Create Redis cluster
- Select 2GB plan
- Enable SSL

#### 3. App Platform (Backend & Frontend)
```yaml
# .do/app.yaml
name: lottery-platform

services:
  - name: backend
    github:
      repo: your-org/lottery
      branch: main
      deploy_on_push: true
    source_dir: backend
    build_command: npm run build
    run_command: npm run start
    environment_slug: node-js
    instance_count: 3
    instance_size_slug: professional-xs
    envs:
      - key: DATABASE_HOST
        value: ${db.HOSTNAME}
      - key: DATABASE_PASSWORD
        value: ${db.PASSWORD}
        type: SECRET
      - key: JWT_SECRET
        value: ${JWT_SECRET}
        type: SECRET

  - name: frontend
    github:
      repo: your-org/lottery
      branch: main
      deploy_on_push: true
    source_dir: frontend
    build_command: npm run build
    run_command: npm start
    environment_slug: node-js
    instance_count: 2
    instance_size_slug: professional-xs
    envs:
      - key: NEXT_PUBLIC_API_URL
        value: https://backend.yourdomain.com/v1
```

## Database Setup

### Initial Migration
```bash
cd backend

# Run migrations
npm run migration:run

# Seed admin user
npm run seed:prod
```

### Database Optimizations

**Enable Partitioning (PostgreSQL 16):**
```sql
-- Partition tickets table by draw_id
CREATE TABLE tickets_partitioned (LIKE tickets INCLUDING ALL);

ALTER TABLE tickets_partitioned
ADD CONSTRAINT tickets_partitioned_pkey PRIMARY KEY (id, draw_id);

-- Create partitions dynamically via trigger or manually per draw
CREATE TABLE tickets_draw_001 PARTITION OF tickets_partitioned
FOR VALUES IN ('draw-id-001');
```

**Indexes:**
```sql
-- Critical indexes for performance
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);
CREATE INDEX CONCURRENTLY idx_orders_draw_id ON orders(draw_id);
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);
CREATE INDEX CONCURRENTLY idx_tickets_draw_id ON tickets(draw_id);
CREATE INDEX CONCURRENTLY idx_tickets_serial ON tickets(serial);
CREATE INDEX CONCURRENTLY idx_cod_tasks_status ON cod_tasks(status);
CREATE INDEX CONCURRENTLY idx_audit_logs_created_at ON audit_logs(created_at);
```

### Backup Strategy

**Automated Backups:**
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/lottery_$TIMESTAMP.sql.gz"

pg_dump -h postgres-host -U lottery_user lottery | gzip > $BACKUP_FILE

# Keep last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Upload to S3
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/postgres/
```

**Schedule with cron:**
```cron
0 2 * * * /usr/local/bin/backup.sh
```

## Monitoring & Observability

### Prometheus + Grafana

**docker-compose.monitoring.yml:**
```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: <admin-password>
    ports:
      - "3002:3000"
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

**prometheus.yml:**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3000']
        labels:
          service: 'lottery-backend'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Application Monitoring

**Add Sentry (Error Tracking):**
```bash
# Backend
npm install @sentry/node

# main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### Health Checks

**Backend Health Endpoint:**
Already implemented at `GET /v1/health`

**Kubernetes Liveness/Readiness:**
```yaml
livenessProbe:
  httpGet:
    path: /v1/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /v1/health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Security Checklist

### Pre-Deployment

- [ ] Change all default passwords
- [ ] Generate strong JWT secrets
- [ ] Enable SSL/TLS for all connections
- [ ] Configure firewall rules (whitelist IPs)
- [ ] Set up WAF (Web Application Firewall)
- [ ] Enable rate limiting
- [ ] Review CORS configuration
- [ ] Disable OTP test mode
- [ ] Enable database SSL connections
- [ ] Rotate access keys regularly
- [ ] Set up secret management (AWS Secrets Manager, Vault)
- [ ] Enable audit logging
- [ ] Configure backup encryption
- [ ] Review admin permissions
- [ ] Set up 2FA for admin accounts

### Post-Deployment

- [ ] Perform security scan (OWASP ZAP, Burp Suite)
- [ ] Run penetration testing
- [ ] Test DDoS protection
- [ ] Verify SSL certificate (A+ rating on SSL Labs)
- [ ] Test rate limiting effectiveness
- [ ] Review security headers
- [ ] Verify data encryption at rest
- [ ] Test backup restoration
- [ ] Audit user permissions
- [ ] Monitor for suspicious activity

## Scaling Guidelines

### Horizontal Scaling

**Backend (NestJS):**
- Scale to 3-5 instances behind load balancer
- Use session affinity for WebSocket connections (if added)
- Monitor CPU (< 70%) and memory (< 80%)

**Frontend (Next.js):**
- Scale to 2-3 instances
- Use CDN for static assets (Cloudflare, CloudFront)
- Enable Next.js ISR for dynamic content

**Database:**
- Start with 1 primary + 1 read replica
- Route read queries to replica
- Scale vertically first (increase resources)
- Consider sharding if > 100M records

**Redis:**
- Single instance sufficient for < 100k DAU
- Use Redis Cluster for > 100k DAU
- Enable persistence (AOF + RDS)

### Auto-Scaling Triggers

**Backend:**
- CPU > 70% for 5 minutes → scale up
- Memory > 80% for 5 minutes → scale up
- CPU < 30% for 15 minutes → scale down

**Frontend:**
- Request rate > 1000 RPS → scale up
- Response time > 2s (p95) → scale up

## Troubleshooting

### Common Issues

**High Database Load:**
- Check slow query log
- Add missing indexes
- Enable connection pooling
- Scale database vertically

**Redis Memory Full:**
- Increase Redis memory limit
- Check for memory leaks
- Reduce cache TTL
- Enable eviction policy (allkeys-lru)

**Backend Crashes:**
- Check memory usage (increase if needed)
- Review error logs (Sentry)
- Check for unhandled promise rejections
- Verify database connections

**Slow Response Times:**
- Enable CDN for static assets
- Check database query performance
- Increase backend instances
- Enable caching

## Rollback Procedure

```bash
# Docker Compose
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --no-deps backend

# Kubernetes
kubectl rollout undo deployment/lottery-backend

# Database migrations
npm run migration:revert
```

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error rates
- Check disk usage
- Review audit logs

**Weekly:**
- Review performance metrics
- Check backup integrity
- Update dependencies (security patches)

**Monthly:**
- Rotate access keys
- Review user permissions
- Performance optimization review
- Security audit

## Support & Documentation

- **API Docs:** `https://api.yourdomain.com/v1/api-docs`
- **Admin Guide:** See `ADMIN_GUIDE.md`
- **Runbook:** See `RUNBOOK.md`

## Next Steps

1. Set up staging environment
2. Configure CI/CD pipeline
3. Run load tests
4. Perform security audit
5. Train operations team
6. Plan disaster recovery
7. Schedule go-live
