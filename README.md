# Provably-Fair Lottery Platform

A transparent lottery platform where users can purchase tickets via Cash on Delivery (COD) and verify draw fairness using public randomness sources (Bitcoin block hashes or drand) and Merkle tree proofs.

## 🎯 Features

- **2-3 Tap Ticket Purchase**: Quick buy flow with COD payment
- **Provably-Fair Draws**: Verifiable results using Merkle trees + public randomness beacons
- **Multi-Role Admin Panel**: Super Admin, Ops Manager, Support Agent, Auditor roles
- **Anti-Abuse Controls**: User banning, fraud detection, purchase limits
- **Immutable Audit Trails**: Complete transparency for all admin actions
- **Multi-Language Support**: English and Bengali (EN/BN)

## 🚀 Quick Start

### Prerequisites

- Node.js 20 LTS
- Docker and Docker Compose
- npm or yarn

### 1. Clone and Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, and MinIO
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration (default values work for local dev)
```

### 4. Start Development Servers

```bash
# Terminal 1: Start backend (port 3000)
cd backend
npm run start:dev

# Terminal 2: Start frontend (port 3001)
cd frontend
npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/v1
- **Health Check**: http://localhost:3000/v1/health
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin)

## 📁 Project Structure

```
lottery/
├── backend/               # NestJS backend API
│   ├── src/
│   │   ├── modules/       # Feature modules (auth, draws, orders, etc.)
│   │   ├── shared/        # Shared utilities (database, cache, jobs)
│   │   ├── config/        # Configuration module
│   │   └── main.ts        # Application entry point
│   └── tests/             # Unit, integration, and E2E tests
│
├── frontend/              # Next.js 14 (App Router) frontend
│   ├── src/
│   │   ├── app/           # Next.js app pages
│   │   ├── components/    # Reusable UI components
│   │   ├── services/      # API clients and services
│   │   └── utils/         # Utility functions
│   └── tests/             # Frontend tests
│
├── shared/                # Shared types between backend and frontend
│   └── types/             # TypeScript type definitions
│
├── specs/                 # Feature specifications and planning
│   └── 001-provably-fair-lottery/
│       ├── spec.md        # Feature specification
│       ├── plan.md        # Implementation plan
│       ├── tasks.md       # Task breakdown (220 tasks)
│       ├── data-model.md  # Database schema
│       └── contracts/     # API contracts (OpenAPI)
│
└── docker-compose.yml     # Local development infrastructure
```

## 🔧 Development Commands

### Backend

```bash
# Development with hot-reload
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start

# Run tests
npm run test
npm run test:watch
npm run test:cov

# Linting
npm run lint
npm run format
```

### Frontend

```bash
# Development server
npm run dev

# Build for production
npm run build

# Run production build
npm run start

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🗄️ Database

The platform uses PostgreSQL 16 with table partitioning for scalability.

### Migrations

```bash
cd backend

# Generate new migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Seeding

```bash
# Run seed data for local development
npm run seed:dev
```

## 📊 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Backend | NestJS 10.x + TypeScript | Modular API server |
| Frontend | Next.js 14 + React 18 | SSR web application |
| Database | PostgreSQL 16 | Relational data storage |
| Cache/Queue | Redis 7 + BullMQ | Caching and background jobs |
| Styling | Tailwind CSS | Utility-first CSS |
| OTP/SMS | Twilio Verify | OTP authentication |
| Email | SendGrid | Transactional emails |
| Storage | MinIO (S3-compatible) | Immutable audit bundles |
| Testing | Jest, Playwright, k6 | Unit, E2E, and load testing |

## 🔐 Security

- **OTP Authentication**: Passwordless login via SMS/email
- **Rate Limiting**: Prevents abuse (3 OTP/hour, 10 orders/hour)
- **Input Validation**: All endpoints validate input with class-validator
- **CORS Protection**: Whitelist frontend origin only
- **JWT Tokens**: Secure authentication with expiry
- **Soft/Hard Banning**: Admin controls for fraud prevention

## 🎲 Fairness Protocol

1. **Ticket Merkle Tree**: All paid tickets form a Merkle tree, root published at draw close
2. **Public Randomness**: Bitcoin block hash or drand beacon fetched after close
3. **Deterministic Winner**: `SHA256(beacon || merkle_root) % total_tickets`
4. **Public Verification**: Anyone can recalculate the winner using published artifacts

## 📈 Scaling for 100k DAU

- **Database**: Connection pooling (20 max), partitioned tables by draw_id
- **Caching**: Redis for hot paths (draw lists, user sessions)
- **Background Jobs**: BullMQ for async operations (draw close, settlement, expiry)
- **Observability**: Prometheus + Grafana for metrics, Sentry for error tracking

## 🧪 Testing

```bash
# Run all tests
npm run test

# E2E tests (Playwright)
cd frontend
npx playwright test

# Load testing (k6)
k6 run tests/load/quick-buy.js
```

## 📚 Documentation

- **API Documentation**: http://localhost:3000/v1/api-docs (after implementing swagger)
- **Feature Spec**: [specs/001-provably-fair-lottery/spec.md](specs/001-provably-fair-lottery/spec.md)
- **Implementation Tasks**: [specs/001-provably-fair-lottery/tasks.md](specs/001-provably-fair-lottery/tasks.md)
- **Data Model**: [specs/001-provably-fair-lottery/data-model.md](specs/001-provably-fair-lottery/data-model.md)

## 🚦 Current Status

### ✅ Completed (9/9 Phases)

**Phase 1: Project Setup & Infrastructure** ✓
- [x] Monorepo structure with backend/frontend/shared
- [x] NestJS 10 backend with TypeScript
- [x] Next.js 14 frontend with App Router
- [x] Docker Compose (PostgreSQL, Redis, MinIO)
- [x] TypeORM with 11 database entities
- [x] BullMQ background job processors

**Phase 2: Foundational Modules** ✓
- [x] CryptoService (SHA256, Merkle trees, winner calculation)
- [x] AuthGuard, RBACGuard, RateLimitGuard
- [x] 4 background job processors (draw close, beacon fetch, winner compute, expiry)
- [x] Complete entity relationships

**Phase 3: Quick Ticket Purchase (US1)** ✓
- [x] OTP-based authentication (SMS/email)
- [x] User profile & address management
- [x] Draw listing with pagination
- [x] Order creation with COD reservation (6-hour window)
- [x] Sequential ticket serial generation
- [x] Frontend: Home, Login, Buy, Orders, Tickets, Profile pages

**Phase 4: Public Verification (US2)** ✓
- [x] Fairness data API endpoints
- [x] Server-side winner verification
- [x] Client-side browser verification (Web Crypto API)
- [x] Merkle proof generation for tickets
- [x] Fairness events audit log
- [x] Frontend verification page with visual comparison

**Phase 5: Admin Draw Management (US3)** ✓
- [x] Admin authentication with JWT
- [x] RBAC with 4 roles (Super Admin, Ops Manager, Support Agent, Auditor)
- [x] Complete draw CRUD operations
- [x] Manual draw close/settle triggers
- [x] Comprehensive audit logging

**Phase 6: COD Management (US4)** ✓
- [x] COD task listing with filters
- [x] Bulk task assignment to field agents
- [x] Status tracking workflow
- [x] Auto-update orders/tickets on collection
- [x] Route export for field agents
- [x] Dashboard statistics

**Phase 7: User Banning (US5)** ✓
- [x] SOFT ban (blocks purchases) / HARD ban (blocks login)
- [x] Duration-based bans with expiry
- [x] Mandatory ban reasons for compliance
- [x] User search and history
- [x] Flag system for fraud detection
- [x] Full audit trail

**Phase 8: Audit & Reports (US6)** ✓
- [x] Comprehensive audit log viewer with filters
- [x] Sales reports (revenue, orders by status, top draws)
- [x] COD reports (collection rate, avg time)
- [x] Draw-specific analytics
- [x] Abuse metrics (ban rate, failed orders)
- [x] Admin dashboard with key metrics
- [x] Audit log export (CSV-ready)

### ✅ Phase 9: Polish & Testing (Completed)
- [x] Backend API complete (14 modules)
- [x] Build verification passed
- [x] Frontend admin panel (Dashboard, Draws, COD, Users, Audit)
- [x] Admin authentication and authorization
- [x] Complete API client integration
- [x] E2E testing setup with Playwright
- [x] Load testing configuration with k6
- [x] Deployment documentation

### 📊 Implementation Progress: 100% Complete ✅

**Total Tasks:** 220
**All Tasks Completed:** Backend, Frontend, Testing, Documentation
**Status:** Production-ready

## 📝 License

ISC

## 👥 Contributing

This is a private project. For questions, contact the development team.

## 🐛 Troubleshooting

### Docker services won't start
```bash
# Reset Docker environment
docker-compose down -v
docker-compose up -d
```

### Backend won't connect to database
```bash
# Check PostgreSQL logs
docker logs lottery-postgres

# Verify DATABASE_* env vars in .env
```

### Port already in use
```bash
# Change ports in .env and docker-compose.yml
# Backend: PORT=3000
# Frontend: Update package.json dev script -p 3001
```

## 🔗 Useful Links

- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeORM Documentation](https://typeorm.io/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
