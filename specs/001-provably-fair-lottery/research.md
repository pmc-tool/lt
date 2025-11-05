# Technical Research: Provably-Fair Lottery Platform

**Date**: 2025-11-05
**Feature**: 001-provably-fair-lottery
**Purpose**: Resolve NEEDS CLARIFICATION items from plan.md Technical Context

## Research Summary

This document resolves technology stack decisions for a lottery platform supporting 100k DAU, COD payments, and provably-fair draws using Merkle trees and public randomness beacons.

---

## Decision 1: Backend Language & Framework

**Context**: Need modular monolith with background jobs, partitioned database support, strong typing, and mature ecosystem for 100k DAU scale.

**Decision**: **TypeScript with NestJS**

**Rationale**:
1. **Modular Architecture**: NestJS provides native module system aligned with feature-based organization (auth, draws, tickets, fairness modules)
2. **Background Jobs**: Native integration with BullMQ (Redis-backed queue) for draw close/settlement/expiry jobs
3. **TypeScript**: Strong typing reduces runtime errors in critical fairness calculations (merkle tree, winner computation)
4. **Ecosystem**: Mature libraries for all requirements (crypto, OTP, SMS/email, database ORMs)
5. **Performance**: Handles 2k-5k RPS with clustering, proven at scale (Adidas, Roche, Capgemini)
6. **Developer Experience**: Decorators for RBAC, validation, logging reduce boilerplate

**Alternatives Considered**:
- **Python (FastAPI)**: Excellent for APIs but weaker type safety for critical crypto operations; async job ecosystem less mature than BullMQ
- **Go**: Superior performance but lacks modular framework conventions; would require custom structure for 9 feature modules
- **Java (Spring Boot)**: Enterprise-grade but heavier footprint; overkill for startup scale; slower iteration

**Version**: Node.js 20 LTS + NestJS 10.x (latest stable)

---

## Decision 2: Database & Caching

**Context**: Need relational DB with partitioning (tickets/orders/fairness_events by draw_id), ACID for financial data, and sub-second read latency for 100k DAU.

**Decision**: **PostgreSQL 16 + Redis 7**

**Rationale**:
1. **PostgreSQL**:
   - Native table partitioning (LIST/RANGE) for tickets, orders, fairness_events by draw_id or time
   - ACID transactions critical for COD status transitions (reserved → paid) and ticket inclusions
   - Mature TypeScript ORMs (TypeORM, Prisma) with migration tools
   - JSON column support for fairness event payloads (merkle branches, beacon metadata)
   - Full-text search for admin filters (user search by name/email/phone)
   - Proven at 100k+ user scale (Instagram, Spotify, Reddit)

2. **Redis**:
   - Rate limiting (OTP requests: 3/hour per phone, purchase caps: 50/draw per user)
   - Session caching (reduce DB load for authenticated requests)
   - BullMQ job queue backing (draw close/settlement/expiry jobs)
   - Countdown timers (draw end time cache for homepage)
   - Sub-millisecond read latency for hot paths (draw status checks)

**Alternatives Considered**:
- **MySQL**: Weaker partitioning pre-8.0; less mature JSON support; no compelling advantage over PostgreSQL
- **MongoDB**: No ACID across collections; inappropriate for financial data (COD amounts, ticket serials)
- **Memcached** (vs Redis): No pub/sub for job queue; no data structures (sorted sets for timers)

**Configuration**:
- PostgreSQL: Partitioned tables, read replicas for reports, connection pooling (pg-pool)
- Redis: Separate instances for cache vs queue (isolate failure domains)

---

## Decision 3: OTP & Communication Services

**Context**: OTP delivery <10s (95% of requests), SMS + email support, template management, delivery tracking.

**Decision**: **Twilio (SMS) + SendGrid (Email)**

**Rationale**:
1. **Twilio**:
   - Industry-standard SMS gateway with 190+ country support
   - Delivery webhooks for tracking OTP failures (logged to admin dashboard per FR-075)
   - <5s median delivery globally, <10s p95
   - Verify API for OTP generation + validation with built-in rate limiting
   - Pricing: ~$0.0079/SMS (Bangladesh), scalable for 100k DAU

2. **SendGrid**:
   - Template management with dynamic content (user names, ticket IDs, agent contacts)
   - Delivery webhooks for bounce/spam tracking (FR-076-FR-081)
   - 99%+ deliverability, <3s delivery p95
   - i18n support for EN/BN templates
   - Pricing: Free tier 100 emails/day, $15/month for 40k emails (covers MVP)

**Alternatives Considered**:
- **AWS SNS/SES**: Lower cost but less mature template management; requires custom OTP validation logic
- **Firebase Auth**: OTP built-in but ties auth to Firebase ecosystem; no SMS template control
- **MessageBird**: Strong in Asia/Africa but higher Bangladesh SMS costs vs Twilio

**Integration**:
- Twilio Verify API for OTP (handles generation, expiry, rate limiting)
- SendGrid Dynamic Templates for all email notifications
- Webhook endpoints for delivery status (update notification logs)

---

## Decision 4: Cryptography & Merkle Trees

**Context**: SHA256 hashing for merkle leaves + winner calc, merkle tree construction/verification, deterministic winner computation.

**Decision**: **Native Node.js crypto module + merkletreejs library**

**Rationale**:
1. **Node.js crypto module**:
   - Built-in SHA256 (`crypto.createHash('sha256')`) - no external dependency
   - FIPS-compliant, used in production blockchain applications
   - Synchronous API suitable for backend winner calculation (no async overhead)
   - Same API available in browser via `crypto.subtle` for client-side verification

2. **merkletreejs**:
   - Mature library (8k+ GitHub stars, 1M+ weekly downloads)
   - Supports proof generation (for optional ticket verification per FR-047)
   - Efficient binary tree construction (O(n log n) for n tickets)
   - JSON serialization for publishing roots + proofs to fairness_events
   - Compatible with browser crypto for public verification page

**Alternatives Considered**:
- **bcrypt/argon2**: Designed for password hashing, not cryptographic proofs; too slow for merkle trees
- **Web3.js crypto**: Overkill (includes full Ethereum stack); we only need SHA256, not smart contracts
- **Custom merkle implementation**: Risky (crypto bugs), no proof generation helpers

**Implementation Notes**:
- Ticket leaf hash: `SHA256(draw_id || ticket_serial || user_id)` per FR-035
- Winner calc: `SHA256(beacon_value || merkle_root)` then `bigint(hash) % total_tickets` per FR-040
- Merkle proof format: JSON array of `{ position: 'left'|'right', data: hash_hex }` stored in fairness_events

---

## Decision 5: Background Job Queue

**Context**: Automated jobs for draw close (merkle build), beacon fetch (retry every 5min), settlement (winner calc), ticket expiry (6hr window), COD reconciliation (daily).

**Decision**: **BullMQ (Redis-backed queue)**

**Rationale**:
1. **BullMQ Features**:
   - Native NestJS integration (`@nestjs/bull`)
   - Cron scheduling (draw close at end_time, daily reconciliation)
   - Retry with exponential backoff (beacon fetch: 5min intervals up to 24hrs per FR-038)
   - Job priorities (settlement > expiry > reconciliation)
   - Idempotency via job IDs (prevents duplicate merkle builds if job retries)
   - Dashboard (Bull Board) for monitoring job failures

2. **Redis Backing**:
   - Persistent job queue (survives app restart)
   - Distributed locks (prevent multiple workers processing same draw settlement)
   - Atomic operations (job state transitions thread-safe)

**Alternatives Considered**:
- **Celery (Python)**: Not applicable (chose TypeScript stack)
- **AWS SQS**: Higher latency (seconds vs milliseconds), no cron scheduling, no retries with exponential backoff
- **Agenda (MongoDB-backed)**: Weaker persistence guarantees vs Redis, no priority queues

**Job Types**:
- **DrawCloseJob**: Runs at `draw.end_at`, locks tickets, builds merkle tree, publishes root (FR-034-FR-036)
- **BeaconFetchJob**: Triggered after DrawCloseJob, retries every 5min until beacon available (FR-037-FR-039)
- **WinnerComputeJob**: Triggered after BeaconFetchJob, calculates winner, publishes result (FR-040-FR-041)
- **TicketExpiryJob**: Runs every 5min, finds orders with `created_at + 6hrs < now` and status=pending, cancels orders, expires tickets (FR-029)
- **CODReconciliationJob**: Runs daily at midnight, generates reconciliation report (assigned/collected/failed/canceled totals) (FR-033)
- **FraudDetectionJob**: Runs hourly, finds users with 3+ failed COD pickups in 7 days, applies "COD risk" flag (FR-054)

---

## Decision 6: Frontend Framework & UI

**Context**: Responsive web UI (mobile-optimized), 2-3 tap purchase flow, client-side fairness recalculation, admin panel with dashboards/reports, i18n (EN/BN).

**Decision**: **React 18 with Next.js 14 (App Router) + Tailwind CSS + shadcn/ui**

**Rationale**:
1. **Next.js**:
   - Server-side rendering (SSR) for public verification page (SEO + fast first load <2.5s)
   - Static generation for terms/FAQs (99.9% uptime via CDN caching)
   - API routes for BFF pattern (backend proxying reduces CORS complexity)
   - i18n routing (`/en/`, `/bn/`) built-in
   - Image optimization (draw banners, user profile pics)

2. **React 18**:
   - Concurrent rendering (smooth countdown timers on draw cards)
   - Suspense for lazy-loading admin panel chunks (reduces initial bundle)
   - Mature ecosystem for crypto (SubtleCrypto API), forms (React Hook Form), state (Zustand)

3. **Tailwind CSS + shadcn/ui**:
   - Rapid UI development (2-3 tap flow requires fast iteration)
   - Mobile-first responsive design (100k DAU, high mobile traffic assumed)
   - Accessible components (WCAG 2.1 AA for age gate, terms acknowledgment per FR-082-FR-084)
   - Dark mode support (low priority but simple to add)

**Alternatives Considered**:
- **Vue.js/Nuxt**: Less mature crypto ecosystem (SubtleCrypto wrappers), smaller talent pool
- **SvelteKit**: Excellent performance but less mature i18n, admin dashboard libraries
- **Angular**: Heavier framework, slower iteration; overkill for 2-3 tap flow

**Key Libraries**:
- **next-intl**: i18n for EN/BN translations (FR-007)
- **React Hook Form + Zod**: Form validation for quick buy, address entry (reduce taps)
- **date-fns**: Countdown timers (draw end time), reservation expiry display
- **@tanstack/react-table**: Admin tables (orders, users, audit logs) with sorting/filtering
- **recharts**: Admin dashboard charts (sales, COD collection rates per SC-007/SC-017)
- **SubtleCrypto API**: Client-side SHA256 for verification page winner recalculation (FR-045)

---

## Decision 7: Testing Strategy

**Context**: 90 functional requirements, critical financial flows (COD), deterministic fairness (zero disputes target per SC-010), 99.9% uptime requirement.

**Decision**: **Jest (unit) + Supertest (integration) + Playwright (E2E) + k6 (load testing)**

**Rationale**:
1. **Jest**:
   - Native NestJS support (`@nestjs/testing`)
   - Fast feedback (unit tests <5s for TDD workflow)
   - Coverage reports (target 80%+ for critical paths: merkle build, winner calc, COD transitions)
   - Snapshot testing for API responses (contract testing)

2. **Supertest**:
   - Integration tests for API endpoints (FR-001-FR-090)
   - Database transaction rollback (clean test state)
   - Auth/RBAC testing (verify roles: Super Admin, Ops Manager, Support Agent, Auditor)

3. **Playwright**:
   - E2E tests for user journeys (P1-P4 from spec)
   - Headless browser for CI/CD (GitHub Actions)
   - Mobile viewport testing (responsive UI verification)
   - Critical paths: 2-3 tap purchase, OTP flow, public verification page recalculation

4. **k6**:
   - Load testing for NFRs: 2k-5k read RPS, 200-500 write RPS (SC-004)
   - Spike testing for draw close window (peak load)
   - Latency profiling (p95 <2.5s page load per SC-003)

**Test Priorities** (based on spec acceptance criteria):
- **Must Test**: OTP flow (FR-001-FR-003), ticket purchase (FR-016-FR-023), COD transitions (FR-024-FR-033), merkle + beacon + winner calc (FR-034-FR-043), ban enforcement (FR-049-FR-052), audit log immutability (FR-069-FR-074)
- **Should Test**: Admin CRUD (FR-059-FR-068), notifications (FR-075-FR-081), duplicate detection (FR-056), rate limiting (FR-057)
- **Nice to Have**: UI polish, admin dashboard charts, i18n string coverage

---

## Decision 8: Beacon Source Integration

**Context**: Fetch randomness from Bitcoin block hash or drand, retry on failure, fallback per beacon rule (FR-037-FR-039).

**Decision**: **Bitcoin via blockchain.info API + drand via drand.love HTTP API**

**Rationale**:
1. **Bitcoin**:
   - Public, immutable, high-security randomness source
   - blockchain.info API: `GET https://blockchain.info/block-height/{height}?format=json` returns block hash
   - Pre-announced height (draw close timestamp → estimated block height) prevents manipulation
   - Fallback to next block if target block not yet mined at settlement time
   - Free API, 1 request per draw (low cost)

2. **drand**:
   - Distributed randomness beacon (League of Entropy consortium)
   - drand.love API: `GET https://drand.cloudflare.com/public/latest` returns beacon value + signature
   - Sub-second latency (Cloudflare CDN)
   - Cryptographic verification (BLS signatures, though not required for our trust model)
   - Fallback if Bitcoin network congestion delays block

**Implementation**:
- Admin configures beacon source per draw (Bitcoin or drand) at draw creation (FR-008)
- BeaconFetchJob:
  1. If Bitcoin: calculate block height from `draw.end_at` timestamp (10min avg block time)
  2. Fetch block hash at height, if 404 retry every 5min (FR-038)
  3. If 24hrs elapsed with no block, fallback to drand (FR-039)
  4. Store beacon value + source in fairness_events (FR-037)
- Public verification page links to block explorer (blockchain.info) or drand.love for independent verification (FR-048)

**Alternatives Considered**:
- **NIST Randomness Beacon**: US govt source but less globally trusted, no blockchain immutability
- **Chainlink VRF**: Ethereum-based, requires smart contract integration (overkill, no crypto payments)
- **Server-generated randomness**: Not publicly verifiable, defeats "provably-fair" requirement

---

## Decision 9: Deployment & Observability

**Context**: 99.9% uptime (43min downtime/month allowed), 100k DAU, immutable audit logs, error tracking for 90 FRs.

**Decision**: **Docker + Docker Compose (dev) / Kubernetes (prod) + Prometheus + Grafana + Sentry**

**Rationale**:
1. **Containerization**:
   - Docker for consistent dev/prod environments
   - Docker Compose for local dev (backend, frontend, PostgreSQL, Redis)
   - Kubernetes for prod (autoscaling: 2-10 backend pods based on RPS, 99.9% uptime via health checks)

2. **Prometheus + Grafana**:
   - Metrics: RPS, latency (p50/p95/p99), error rates, job queue length
   - Alerts: p95 >2.5s (violates SC-003), job failures (beacon fetch, merkle build)
   - Dashboards: COD collection rate (SC-007), draw sell-through (SC-017), OTP delivery (SC-005)

3. **Sentry**:
   - Error tracking for both backend (NestJS) and frontend (Next.js)
   - Breadcrumbs for debugging (user actions leading to error)
   - Release tracking (correlate errors with deployments)
   - Critical for zero fairness disputes goal (SC-010): catch merkle/winner calc bugs

**Alternatives Considered**:
- **AWS CloudWatch**: Vendor lock-in, higher cost vs self-hosted Prometheus
- **Datadog**: Excellent but expensive for 100k DAU startup scale
- **Rollbar** (vs Sentry): Less mature frontend integration, no release tracking

**Configuration**:
- Health checks: `/health` endpoint (DB + Redis connectivity, job queue status)
- Structured logging: Winston (NestJS) with JSON format for ELK stack ingestion (future)
- Audit log append-only: PostgreSQL triggers prevent UPDATE/DELETE on audit_logs table (FR-070)

---

## Decision 10: Immutable Storage for Audit Bundles

**Context**: Archive fairness artifacts (merkle root, beacon, winner, event log) post-settlement for long-term compliance (FR-043).

**Decision**: **AWS S3 (or S3-compatible: MinIO, DigitalOcean Spaces)**

**Rationale**:
1. **S3 Durability**: 99.999999999% (11 9's) durability, critical for immutable fairness proofs
2. **Versioning**: Prevent accidental overwrites of audit bundles
3. **Lifecycle Policies**: Move old draws to Glacier after 1 year (reduce cost)
4. **Public Read Access**: Verification page can link to audit bundle JSON for download (FR-073)
5. **Cost**: ~$0.023/GB/month (cheap for JSON bundles: ~10KB per draw)

**Alternatives Considered**:
- **PostgreSQL BLOB**: No immutability guarantees (admin with DB access can delete), no lifecycle policies
- **IPFS**: Decentralized but requires pinning service (cost + complexity), slower retrieval
- **Git LFS**: Version control overkill, no S3-compatible API for programmatic access

**Archive Format**:
- JSON file per draw: `fairness-bundles/{draw_id}.json`
- Contents: `{ draw_id, merkle_root, beacon_source, beacon_value, winner_ticket_serial, fairness_events[], created_at }`
- Trigger: Post-settlement job after winner published (FR-043)

---

## Open Questions (None - All Resolved)

All "NEEDS CLARIFICATION" items from Technical Context have been resolved via decisions above.

---

## Technology Stack Summary

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Backend Language | TypeScript | 5.3+ | Type safety for crypto operations |
| Backend Framework | NestJS | 10.x | Modular monolith, background jobs |
| Database | PostgreSQL | 16 | ACID, partitioning, 100k DAU scale |
| Caching | Redis | 7 | Rate limiting, sessions, job queue |
| Job Queue | BullMQ | 4.x | Background jobs (draw close, beacon fetch, expiry) |
| Frontend Framework | Next.js | 14 (App Router) | SSR, i18n, responsive UI |
| Frontend Library | React | 18 | UI components, client-side crypto |
| CSS Framework | Tailwind CSS | 3.x | Rapid UI, mobile-first |
| UI Components | shadcn/ui | latest | Accessible, customizable components |
| OTP/SMS | Twilio Verify | API v2 | OTP generation, SMS delivery <10s |
| Email | SendGrid | API v3 | Template management, delivery tracking |
| Crypto | Node.js crypto + merkletreejs | Native + 0.3.x | SHA256, merkle tree construction/proofs |
| Beacon (Bitcoin) | blockchain.info API | HTTP | Bitcoin block hash fetching |
| Beacon (drand) | drand.love API | HTTP | Distributed randomness fallback |
| Unit Testing | Jest | 29.x | Backend + frontend unit tests |
| Integration Testing | Supertest | 6.x | API endpoint testing |
| E2E Testing | Playwright | 1.40+ | User journey testing |
| Load Testing | k6 | 0.48+ | RPS, latency profiling |
| Observability | Prometheus + Grafana | 2.x + 10.x | Metrics, dashboards, alerts |
| Error Tracking | Sentry | 7.x | Backend + frontend error monitoring |
| Immutable Storage | AWS S3 | API v4 | Audit bundle archiving |
| Containers | Docker | 24.x | Dev/prod consistency |
| Orchestration | Kubernetes (prod) | 1.28+ | Autoscaling, 99.9% uptime |

---

## Next Steps

1. **Phase 1**: Generate data-model.md (entity schemas, relationships, state transitions)
2. **Phase 1**: Generate contracts/ (OpenAPI spec for backend APIs)
3. **Phase 1**: Generate quickstart.md (dev environment setup, run instructions)
4. **Phase 1**: Update agent context (add technology stack to .claude/agent.md or similar)
5. **Phase 2**: Generate tasks.md (implementation task breakdown via `/speckit.tasks`)
