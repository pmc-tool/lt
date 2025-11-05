# Quickstart Guide: Provably-Fair Lottery Platform

**Date**: 2025-11-05
**Feature**: 001-provably-fair-lottery
**Purpose**: Local development environment setup and basic operations

## Prerequisites

Ensure you have the following installed:

- **Node.js** 20 LTS or later ([Download](https://nodejs.org/))
- **Docker** 24.x or later ([Download](https://www.docker.com/products/docker-desktop))
- **Docker Compose** (included with Docker Desktop)
- **Git** (for cloning repository)
- **Code Editor**: VS Code recommended with extensions:
  - ESLint
  - Prettier
  - Thunder Client (for API testing)
  - Database Client (for PostgreSQL viewing)

## Step 1: Clone Repository

```bash
git clone <repository-url>
cd lottery
```

## Step 2: Start Infrastructure (PostgreSQL + Redis)

Use Docker Compose to spin up PostgreSQL and Redis locally:

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL 16** on `localhost:5432`
  - Database: `lottery_dev`
  - User: `lottery_user`
  - Password: `lottery_pass`
- **Redis 7** on `localhost:6379`

Verify containers are running:

```bash
docker ps
```

You should see `lottery-postgres` and `lottery-redis` containers.

## Step 3: Backend Setup

Navigate to backend directory and install dependencies:

```bash
cd backend
npm install
```

### Configure Environment

Copy the example environment file and update if needed:

```bash
cp .env.example .env
```

Default `.env` for local development:

```env
# Database
DATABASE_URL=postgresql://lottery_user:lottery_pass@localhost:5432/lottery_dev
DATABASE_POOL_SIZE=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_CACHE_DB=0
REDIS_QUEUE_DB=1

# JWT
JWT_SECRET=your-local-dev-secret-change-in-production
JWT_EXPIRES_IN=7d

# OTP (use test mode for local dev)
TWILIO_ACCOUNT_SID=test_account_sid
TWILIO_AUTH_TOKEN=test_auth_token
TWILIO_VERIFY_SERVICE_SID=test_verify_service
OTP_TEST_MODE=true
OTP_TEST_CODE=123456

# SendGrid (use test mode for local dev)
SENDGRID_API_KEY=test_api_key
SENDGRID_FROM_EMAIL=noreply@lottery-local.test
EMAIL_TEST_MODE=true

# Beacon APIs
BITCOIN_API_URL=https://blockchain.info
DRAND_API_URL=https://drand.cloudflare.com

# S3 (use local MinIO or skip for dev)
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=lottery-dev
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_REGION=us-east-1

# App
NODE_ENV=development
PORT=3000
```

### Run Database Migrations

Apply schema migrations to create tables:

```bash
npm run migration:run
```

This creates all tables from `data-model.md`: users, draws, tickets, orders, cod_tasks, fairness_events, audit_logs, etc.

### Seed Test Data (Optional)

Generate sample draws, users, and tickets for testing:

```bash
npm run seed:dev
```

This creates:
- 3 test users (phone: `+8801700000001`, `+8801700000002`, `+8801700000003`)
- 2 draws: 1 "started", 1 "settled" (with winner)
- 10 tickets across draws
- Sample COD tasks and audit logs

### Start Backend Server

```bash
npm run start:dev
```

Backend API will be available at `http://localhost:3000`.

Test health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "uptime": 42
}
```

### Start Background Job Workers

In a separate terminal, start BullMQ workers for background jobs:

```bash
cd backend
npm run worker:dev
```

This starts workers for:
- **DrawCloseJob**: Auto-closes draws at `end_at`
- **BeaconFetchJob**: Fetches Bitcoin/drand beacon values
- **WinnerComputeJob**: Computes winner using merkle + beacon
- **TicketExpiryJob**: Expires COD reservations after 6 hours
- **CODReconciliationJob**: Daily COD collection reports
- **FraudDetectionJob**: Auto-flags COD risk users

View job dashboard at `http://localhost:3000/admin/queues` (if Bull Board is configured).

## Step 4: Frontend Setup

Navigate to frontend directory and install dependencies:

```bash
cd ../frontend
npm install
```

### Configure Environment

Copy example environment file:

```bash
cp .env.example .env.local
```

Default `.env.local` for local development:

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:3000/v1

# i18n
NEXT_PUBLIC_DEFAULT_LOCALE=en
NEXT_PUBLIC_SUPPORTED_LOCALES=en,bn

# Feature Flags
NEXT_PUBLIC_ENABLE_MERKLE_PROOF_VERIFICATION=true
```

### Start Frontend Dev Server

```bash
npm run dev
```

Frontend will be available at `http://localhost:3001`.

Open browser and navigate to:
- **User Home**: `http://localhost:3001/en` (or `/bn` for Bengali)
- **Public Verification**: `http://localhost:3001/en/verify/{draw_id}`
- **Admin Panel**: `http://localhost:3001/en/admin` (requires admin JWT)

## Step 5: Test API Endpoints

### 1. Request OTP (Anonymous)

```bash
curl -X POST http://localhost:3000/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "+8801700000001",
    "language": "en"
  }'
```

Response:

```json
{
  "session_id": "uuid-here",
  "expires_at": "2025-11-05T15:10:00Z",
  "message": "OTP sent to +880*******0001"
}
```

**Note**: In test mode (`OTP_TEST_MODE=true`), OTP is always `123456` and logged to console.

### 2. Verify OTP

```bash
curl -X POST http://localhost:3000/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "uuid-from-step-1",
    "otp_code": "123456"
  }'
```

Response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-uuid",
    "phone": "+8801700000001",
    "name": null,
    "status": "active",
    "language": "en"
  },
  "is_new_user": false
}
```

Save the `access_token` for subsequent requests.

### 3. List Draws

```bash
curl http://localhost:3000/v1/draws?status=started
```

Response:

```json
{
  "data": [
    {
      "id": "draw-uuid",
      "title": "Weekly Draw #1",
      "status": "started",
      "start_at": "2025-11-05T00:00:00Z",
      "end_at": "2025-11-10T00:00:00Z",
      "ticket_price": 10.00,
      "max_tickets": 1000,
      "tickets_sold": 123,
      "tickets_remaining": 877,
      "beacon_source": "bitcoin",
      "terms_url": "https://example.com/terms"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

### 4. Create Order (Quick Buy)

First, add a default address for the user:

```bash
curl -X POST http://localhost:3000/v1/users/me/addresses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "label": "Home",
    "street": "123 Main St, Apt 4B",
    "city": "Dhaka",
    "postal_code": "1205",
    "country": "BD",
    "phone": "+8801700000001",
    "is_default": true
  }'
```

Then create an order:

```bash
curl -X POST http://localhost:3000/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "draw_id": "draw-uuid-from-step-3",
    "quantity": 3,
    "address_id": "address-uuid-from-previous-step"
  }'
```

Response:

```json
{
  "id": "order-uuid",
  "user_id": "user-uuid",
  "draw_id": "draw-uuid",
  "quantity": 3,
  "total_amount": 30.00,
  "status": "pending",
  "address_id": "address-uuid",
  "created_at": "2025-11-05T10:00:00Z",
  "expires_at": "2025-11-05T16:00:00Z"
}
```

### 5. View Tickets

```bash
curl http://localhost:3000/v1/tickets?draw_id=draw-uuid \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response:

```json
{
  "data": [
    {
      "id": "ticket-uuid-1",
      "draw_id": "draw-uuid",
      "order_id": "order-uuid",
      "user_id": "user-uuid",
      "serial": 124,
      "status": "reserved",
      "created_at": "2025-11-05T10:00:00Z"
    },
    {
      "id": "ticket-uuid-2",
      "serial": 125,
      "status": "reserved"
    },
    {
      "id": "ticket-uuid-3",
      "serial": 126,
      "status": "reserved"
    }
  ]
}
```

### 6. Public Verification (No Auth Required)

For a settled draw:

```bash
curl http://localhost:3000/v1/verify/settled-draw-uuid
```

Response:

```json
{
  "draw_id": "settled-draw-uuid",
  "title": "Test Draw (Settled)",
  "status": "settled",
  "merkle_root": "a1b2c3d4e5f6...",
  "beacon_source": "bitcoin",
  "beacon_value": "00000000000000000003abc...",
  "beacon_url": "https://blockchain.info/block-height/850000",
  "total_paid_tickets": 456,
  "winner": {
    "ticket_serial": 234,
    "ticket_id": "winner-ticket-uuid",
    "user_id": "winner-user-uuid"
  },
  "formula": "hash = SHA256(beacon || merkle_root); winner_index = bigint(hash) % total_paid_tickets",
  "archive_url": "https://s3.example.com/fairness-bundles/settled-draw-uuid.json"
}
```

Client-side recalculation (JavaScript example):

```javascript
const beacon = "00000000000000000003abc...";
const merkleRoot = "a1b2c3d4e5f6...";
const totalTickets = 456;

// Compute winner
const hash = await crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(beacon + merkleRoot)
);
const hashHex = Array.from(new Uint8Array(hash))
  .map(b => b.toString(16).padStart(2, '0')).join('');
const hashBigInt = BigInt('0x' + hashHex);
const winnerIndex = Number(hashBigInt % BigInt(totalTickets));

console.log('Computed winner index:', winnerIndex); // Should match winner.ticket_serial
```

## Step 6: Admin Operations (Requires Admin JWT)

To test admin endpoints, you need an admin JWT. For local dev, seed script creates an admin user:

```bash
npm run seed:admin
```

This creates:
- Admin user with phone `+8801700000099`
- Role: `super_admin`
- Login with OTP to get admin JWT

### Admin: Close Draw

```bash
curl -X POST http://localhost:3000/v1/admin/draws/draw-uuid/close \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

This triggers:
1. Draw status → "closed"
2. Ticket sales locked
3. **DrawCloseJob** queued (builds merkle tree)

### Admin: Search Users

```bash
curl "http://localhost:3000/v1/admin/users?q=8801700000001" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### Admin: Ban User

```bash
curl -X POST http://localhost:3000/v1/admin/users/user-uuid/ban \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -d '{
    "type": "soft",
    "reason": "Repeated failed COD pickups (test ban)",
    "expires_at": "2025-11-12T00:00:00Z"
  }'
```

### Admin: View Audit Logs

```bash
curl "http://localhost:3000/v1/admin/audit?action_type=user_banned" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

## Step 7: Testing Background Jobs

### Trigger Draw Close Job Manually

For testing, you can manually trigger jobs via admin endpoint (if implemented):

```bash
curl -X POST http://localhost:3000/v1/admin/jobs/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -d '{
    "job_name": "DrawCloseJob",
    "params": {
      "draw_id": "draw-uuid"
    }
  }'
```

Or wait for draw `end_at` to pass, and the cron job will trigger automatically.

### Monitor Job Queue

If Bull Board is configured:

```bash
open http://localhost:3000/admin/queues
```

You'll see:
- Active jobs
- Completed jobs
- Failed jobs (with retry counts)
- Job logs

## Step 8: Database Inspection

Use a PostgreSQL client to inspect data:

```bash
# Via psql CLI
docker exec -it lottery-postgres psql -U lottery_user -d lottery_dev

# List tables
\dt

# View draws
SELECT id, title, status, tickets_sold, max_tickets FROM draws;

# View tickets with status
SELECT draw_id, serial, status, user_id FROM tickets LIMIT 10;

# View audit logs
SELECT action_type, entity_type, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 5;

# Exit
\q
```

## Step 9: Run Tests

### Backend Unit Tests

```bash
cd backend
npm run test
```

This runs Jest unit tests for:
- Merkle tree construction + winner calculation
- OTP generation/validation logic
- State transitions (order, ticket, draw)
- RBAC guards

### Backend Integration Tests

```bash
npm run test:integration
```

This runs Supertest integration tests for:
- Auth endpoints (OTP request/verify)
- Order creation + ticket reservation
- Admin ban enforcement
- Audit log creation

### Frontend E2E Tests

```bash
cd frontend
npm run test:e2e
```

This runs Playwright E2E tests for:
- 2-3 tap quick buy flow
- Public verification page recalculation
- Admin draw close workflow

### Load Testing (k6)

Install k6: [https://k6.io/docs/get-started/installation/](https://k6.io/docs/get-started/installation/)

Run load test script:

```bash
k6 run tests/load/quick-buy-flow.js
```

This simulates:
- 100 virtual users
- 2-5 RPS per user (order creation)
- Validates p95 < 2.5s (per SC-003)

## Step 10: Cleanup

When done with local development, stop Docker containers:

```bash
docker-compose down
```

To completely remove data volumes (reset database):

```bash
docker-compose down -v
```

## Common Issues & Troubleshooting

### 1. PostgreSQL Connection Refused

**Symptom**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
# Check if PostgreSQL container is running
docker ps | grep lottery-postgres

# Restart container if stopped
docker-compose restart postgres
```

### 2. Redis Connection Failed

**Symptom**: `Error: Redis connection to localhost:6379 failed`

**Solution**:
```bash
# Check if Redis container is running
docker ps | grep lottery-redis

# Restart container
docker-compose restart redis
```

### 3. OTP Not Sent (Twilio Error)

**Symptom**: `TwilioError: Invalid credentials`

**Solution**: Ensure `OTP_TEST_MODE=true` in `.env` for local dev. Test mode bypasses Twilio and uses hardcoded OTP `123456`.

### 4. Migration Fails (Duplicate Table)

**Symptom**: `ERROR:  relation "users" already exists`

**Solution**: Database already has tables. Either:
- Drop database and re-run migrations:
  ```bash
  npm run migration:revert
  npm run migration:run
  ```
- Or continue with existing tables if schema matches

### 5. Frontend Can't Connect to Backend

**Symptom**: `Network Error: Failed to fetch`

**Solution**:
- Ensure backend is running on `localhost:3000`
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local` matches backend URL
- Check CORS config in backend allows `localhost:3001`

### 6. Merkle Tree Calculation Mismatch

**Symptom**: Verification page shows "Verification Failed"

**Solution**: This indicates a critical bug in merkle/beacon logic. Check:
- Backend logs for `DrawCloseJob` and `WinnerComputeJob` errors
- Verify `leaf_hash` calculation matches spec: `SHA256(draw_id || serial || user_id)`
- Verify beacon value is correct (check `fairness_events` table)

## Next Steps

After local dev is working:

1. **Implement `/speckit.tasks`**: Generate detailed task breakdown for implementation
2. **Set up CI/CD**: GitHub Actions for automated tests + deployments
3. **Configure Production**: Environment variables for Twilio, SendGrid, S3, PostgreSQL (managed)
4. **Deploy Staging**: Kubernetes or serverless (AWS ECS, Google Cloud Run)
5. **Load Test Production**: k6 tests targeting 100k DAU (SC-003, SC-004)
6. **Monitor**: Set up Prometheus + Grafana dashboards for key metrics

## Useful Commands

### Backend

```bash
# Start dev server with hot reload
npm run start:dev

# Run migrations
npm run migration:run
npm run migration:revert

# Seed test data
npm run seed:dev
npm run seed:admin

# Run tests
npm run test              # Unit tests
npm run test:integration  # Integration tests
npm run test:cov          # Coverage report

# Lint & format
npm run lint
npm run format

# Build for production
npm run build
npm run start:prod
```

### Frontend

```bash
# Start dev server
npm run dev

# Build for production
npm run build
npm run start

# Lint & format
npm run lint
npm run format

# E2E tests
npm run test:e2e
```

### Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart backend

# Rebuild images (after code changes)
docker-compose build
```

## Resources

- **Spec**: [spec.md](./spec.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contract**: [contracts/api.yaml](./contracts/api.yaml)
- **Research**: [research.md](./research.md)

For questions or issues, consult the team or open a GitHub issue.
