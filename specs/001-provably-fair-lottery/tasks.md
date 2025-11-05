# Implementation Tasks: Provably-Fair Lottery Platform

**Feature**: 001-provably-fair-lottery
**Branch**: `001-provably-fair-lottery`
**Date**: 2025-11-05
**Status**: Ready for implementation

## Overview

This document breaks down the implementation of the Provably-Fair Lottery platform into actionable tasks organized by user story. Each user story represents an independently testable increment of value.

**Total Tasks**: 142
**Estimated Duration**: 8-12 weeks (2-3 developers)

### User Story Priorities (from spec.md)

1. **US1 (P1)**: Quick Ticket Purchase with COD - Core revenue flow
2. **US2 (P2)**: Public Result Verification - Fairness differentiator
3. **US3 (P3)**: Admin Draw Lifecycle Management - Backend operations
4. **US4 (P3)**: COD Payment Collection & Order Management - Payment flow
5. **US5 (P4)**: User Banning & Anti-Abuse Controls - Fraud prevention
6. **US6 (P4)**: Audit Log & Fairness Reporting - Compliance & transparency

### Technology Stack (from research.md)

- **Backend**: TypeScript + NestJS 10.x + Node.js 20 LTS
- **Database**: PostgreSQL 16 + TypeORM/Prisma
- **Cache/Queue**: Redis 7 + BullMQ
- **Frontend**: React 18 + Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **OTP/Notifications**: Twilio Verify + SendGrid
- **Crypto**: Node.js crypto + merkletreejs
- **Beacons**: Bitcoin (blockchain.info API) + drand (fallback)
- **Testing**: Jest + Supertest + Playwright + k6
- **Deploy**: Docker + Kubernetes + Prometheus + Grafana + Sentry
- **Storage**: AWS S3 (immutable audit bundles)

---

## Phase 1: Project Setup & Infrastructure

**Goal**: Initialize project structure, configure dependencies, set up development environment

**Duration**: 1 week

**Tasks**:

- [X] T001 Create monorepo root structure with backend/, frontend/, shared/ directories
- [X] T002 [P] Initialize backend NestJS project in backend/ with TypeScript config
- [X] T003 [P] Initialize frontend Next.js 14 (App Router) project in frontend/ with TypeScript + Tailwind
- [X] T004 [P] Create shared/types/ directory with base entity, DTO, and enum TypeScript interfaces
- [X] T005 Set up Docker Compose with PostgreSQL 16, Redis 7, and optional MinIO (S3-compatible) services
- [X] T006 Configure PostgreSQL connection in backend/src/shared/database/database.module.ts with TypeORM or Prisma
- [X] T007 Configure Redis connection in backend/src/shared/cache/cache.module.ts with ioredis
- [X] T008 Set up BullMQ job queue in backend/src/shared/jobs/queue.module.ts with Redis connection
- [X] T009 Create environment config module in backend/src/config/config.module.ts loading from .env (validation with Joi or class-validator)
- [X] T010 [P] Set up ESLint + Prettier for backend (NestJS conventions)
- [X] T011 [P] Set up ESLint + Prettier for frontend (Next.js + React conventions)
- [ ] T012 Create Docker Compose override for local development (docker-compose.override.yml)
- [X] T013 Write initial README.md with quickstart instructions (based on quickstart.md)
- [ ] T014 [P] Set up Jest for backend unit tests in backend/tests/unit/
- [ ] T015 [P] Set up Playwright for frontend E2E tests in frontend/tests/e2e/
- [ ] T016 Create GitHub Actions CI workflow (.github/workflows/ci.yml) running linters + tests on push

**Validation**: Run `docker-compose up` successfully, backend and frontend dev servers start without errors, tests pass in CI.

---

## Phase 2: Foundational Modules (Blocking Prerequisites)

**Goal**: Implement shared infrastructure required by all user stories

**Duration**: 1 week

**Tasks**:

### Database & Migrations

- [ ] T017 Create TypeORM/Prisma migration for User entity (id, phone, email, name, status, language, timestamps) in backend/src/shared/database/migrations/
- [ ] T018 [P] Create migration for Address entity (id, user_id, label, street, city, state, postal_code, country, phone, is_default, timestamps)
- [ ] T019 [P] Create migration for AuthSession entity (id, user_id, phone_or_email, otp_code_hash, otp_sent_at, otp_expires_at, verified, device_fingerprint, ip_address, created_at)
- [ ] T020 [P] Create migration for Ban entity (id, user_id, type, reason, expires_at, created_by, created_at, lifted_at, lifted_by)
- [ ] T021 [P] Create migration for Draw entity with partitioning setup (id, title, status, start_at, end_at, ticket_price, max_tickets, tickets_sold, low_sales_threshold_pct, beacon_source, beacon_rule, beacon_value, merkle_root, winner_ticket_id, terms_url, created_by, timestamps)
- [ ] T022 [P] Create migration for Order entity with partitioning by draw_id (id, user_id, draw_id, quantity, total_amount, status, address_id, assigned_agent_id, notes, created_at, assigned_at, collected_at, failed_at, canceled_at, expires_at)
- [ ] T023 [P] Create migration for Ticket entity with partitioning by draw_id (id, draw_id, order_id, user_id, serial, status, leaf_hash, created_at, paid_at, expired_at)
- [ ] T024 [P] Create migration for CODTask entity (id, order_id, agent_id, status, visit_at, visited_at, collected_at, fail_reason, notes, created_at)
- [ ] T025 [P] Create migration for FairnessEvent entity with partitioning by draw_id (id, draw_id, event_type, payload JSONB, payload_hash, created_at)
- [ ] T026 [P] Create migration for Refund entity (id, order_id, amount, status, reason, created_by, created_at, completed_at)
- [ ] T027 [P] Create migration for AuditLog entity with partitioning by created_at (id, actor_id, actor_role, action_type, entity_type, entity_id, diff_summary, payload_hash, ip_address, user_agent, created_at)
- [ ] T028 Create database indexes per data-model.md (unique, composite, partial indexes on all entities)
- [ ] T029 Create database triggers for immutability (AuditLog and FairnessEvent: prevent UPDATE/DELETE)
- [ ] T030 Write seed script in backend/src/shared/database/seeds/ creating 3 test users, 2 draws, 10 tickets (for local development)

### Shared Modules

- [X] T031 Implement crypto utilities in backend/src/shared/crypto/crypto.service.ts (SHA256 helper, merkle tree builder using merkletreejs, leaf hash generation)
- [ ] T032 Implement i18n module in backend/src/shared/i18n/i18n.module.ts with EN/BN translation files (using nestjs-i18n)
- [ ] T033 [P] Implement frontend i18n in frontend/src/i18n/ with next-intl for EN/BN routing (/en/, /bn/)
- [X] T034 Create auth middleware in backend/src/shared/middleware/auth.middleware.ts (JWT validation, user extraction from token)
- [X] T035 Create RBAC guard in backend/src/shared/middleware/rbac.guard.ts (role-based access control for admin endpoints: super_admin, ops_manager, support_agent, auditor)
- [X] T036 Create rate limiting middleware in backend/src/shared/middleware/rate-limit.middleware.ts (using Redis + ioredis for OTP, order creation, admin actions)
- [ ] T037 Implement audit logging interceptor in backend/src/shared/middleware/audit.interceptor.ts (auto-create AuditLog entries for admin actions, compute payload hash)
- [ ] T038 Create health check endpoint in backend/src/main.ts at GET /health (check DB, Redis, BullMQ connectivity)

### Background Jobs Setup

- [X] T039 Create DrawCloseJob in backend/src/shared/jobs/draw-close.job.ts (triggered at draw.end_at, locks tickets, queues merkle build)
- [X] T040 Create BeaconFetchJob in backend/src/shared/jobs/beacon-fetch.job.ts (fetches Bitcoin block or drand beacon, retry every 5min up to 24hrs)
- [X] T041 Create WinnerComputeJob in backend/src/shared/jobs/winner-compute.job.ts (computes winner from beacon + merkle root, publishes result)
- [X] T042 Create TicketExpiryJob in backend/src/shared/jobs/ticket-expiry.job.ts (runs every 5min, cancels expired orders, expires tickets, restocks)
- [ ] T043 Create CODReconciliationJob in backend/src/shared/jobs/cod-reconciliation.job.ts (runs daily, generates reconciliation report)
- [ ] T044 Create FraudDetectionJob in backend/src/shared/jobs/fraud-detection.job.ts (runs hourly, auto-flags COD risk users with 3+ failed pickups in 7 days)
- [ ] T045 Register all jobs with BullMQ in backend/src/shared/jobs/queue.module.ts (cron schedules, retry policies, idempotency)

### Frontend Shared Components

- [ ] T046 [P] Create UI component library setup in frontend/src/components/ with shadcn/ui base components (Button, Input, Card, Badge, Dialog, etc.)
- [ ] T047 [P] Create DrawCard component in frontend/src/components/DrawCard/ (displays draw title, price, tickets remaining, countdown timer, CTA)
- [ ] T048 [P] Create TicketList component in frontend/src/components/TicketList/ (displays user tickets with serial, status badges, expiry countdown)
- [ ] T049 [P] Create CODStatusBadge component in frontend/src/components/CODStatusBadge/ (color-coded badge for order statuses: pending/assigned/collected/failed/canceled)
- [ ] T050 Create API client service in frontend/src/services/api.ts (axios or fetch wrapper with JWT auth, error handling, base URL config)

**Validation**: Migrations run successfully, seed data populates DB, background jobs trigger on schedule, health endpoint returns 200, frontend components render in Storybook (if configured).

---

## Phase 3: User Story 1 - Quick Ticket Purchase with COD (Priority: P1)

**Goal**: Core revenue flow - users can register via OTP, view draws, purchase tickets in 2-3 taps, and see reserved tickets with COD status.

**Independent Test** (from spec.md): A guest user can register via OTP, view an open draw, purchase 1-5 tickets using COD, receive ticket IDs, and see their reserved tickets with "pending COD" status.

**Duration**: 2 weeks

**Tasks**:

### Backend - Auth Module

- [ ] T051 [US1] Create AuthModule in backend/src/modules/auth/auth.module.ts
- [ ] T052 [US1] Implement AuthService in backend/src/modules/auth/auth.service.ts (OTP generation with Twilio Verify, OTP validation, JWT token creation)
- [ ] T053 [US1] Create POST /auth/otp/request endpoint in backend/src/modules/auth/auth.controller.ts (send OTP via Twilio, create AuthSession, rate limit 3/hour)
- [ ] T054 [US1] Create POST /auth/otp/verify endpoint in backend/src/modules/auth/auth.controller.ts (verify OTP, create/find User, return JWT, mark session verified)
- [ ] T055 [US1] Implement Twilio integration in backend/src/modules/auth/twilio.service.ts (send SMS via Twilio Verify API, webhook for delivery status)
- [ ] T056 [US1] Add OTP test mode support in backend/src/modules/auth/auth.service.ts (if OTP_TEST_MODE=true, accept hardcoded OTP "123456" for local dev)

### Backend - Users Module

- [ ] T057 [US1] Create UsersModule in backend/src/modules/users/users.module.ts
- [ ] T058 [US1] Implement UsersService in backend/src/modules/users/users.service.ts (CRUD for User, Address entities)
- [ ] T059 [US1] Create GET /users/me endpoint in backend/src/modules/users/users.controller.ts (authenticated, return current user profile)
- [ ] T060 [US1] Create PATCH /users/me endpoint (update name, language)
- [ ] T061 [US1] Create GET /users/me/addresses endpoint (list user addresses)
- [ ] T062 [US1] Create POST /users/me/addresses endpoint (add new address with validation: street, city, postal_code, phone required)

### Backend - Draws Module (Public Endpoints Only)

- [ ] T063 [US1] Create DrawsModule in backend/src/modules/draws/draws.module.ts
- [ ] T064 [US1] Implement DrawsService in backend/src/modules/draws/draws.service.ts (read-only methods: findAll with filters, findById)
- [ ] T065 [US1] Create GET /draws endpoint in backend/src/modules/draws/draws.controller.ts (public, filter by status=started, pagination, return draws with tickets_remaining calculated)
- [ ] T066 [US1] Create GET /draws/:id endpoint (public, return draw details with countdown to end_at)

### Backend - Orders Module

- [ ] T067 [US1] Create OrdersModule in backend/src/modules/orders/orders.module.ts
- [ ] T068 [US1] Implement OrdersService in backend/src/modules/orders/orders.service.ts (create order, validate draw status=started, check user ban status, reserve tickets, create COD task, set expires_at = now + 6 hours)
- [ ] T069 [US1] Create POST /orders endpoint in backend/src/modules/orders/orders.controller.ts (authenticated, body: draw_id, quantity [1-10], address_id, validate soft ban blocks purchase)
- [ ] T070 [US1] Create GET /orders endpoint (authenticated, list user orders with pagination, filter by draw_id, status)
- [ ] T071 [US1] Create GET /orders/:id endpoint (authenticated, return order with tickets array)
- [ ] T072 [US1] Implement order creation transaction in OrdersService (atomic: create Order, create N Tickets with sequential serials, create CODTask, increment draw.tickets_sold)

### Backend - Tickets Module

- [ ] T073 [US1] Create TicketsModule in backend/src/modules/tickets/tickets.module.ts
- [ ] T074 [US1] Implement TicketsService in backend/src/modules/tickets/tickets.service.ts (find tickets by user, draw, order)
- [ ] T075 [US1] Create GET /tickets endpoint in backend/src/modules/tickets/tickets.controller.ts (authenticated, list user tickets with pagination, filter by draw_id, status)

### Frontend - Auth Pages

- [ ] T076 [P] [US1] Create OTP request page in frontend/src/pages/auth/login/page.tsx (input phone or email, call POST /auth/otp/request, show session_id + expiry countdown)
- [ ] T077 [P] [US1] Create OTP verify page in frontend/src/pages/auth/verify/page.tsx (input 6-digit OTP, call POST /auth/otp/verify, store JWT in localStorage/cookies, redirect to /home)
- [ ] T078 [P] [US1] Implement auth context in frontend/src/services/auth-context.tsx (React Context for current user, JWT, login/logout methods)

### Frontend - Home & Draw Listing

- [ ] T079 [P] [US1] Create home page in frontend/src/pages/[lang]/page.tsx (fetch GET /draws?status=started, render DrawCard grid, countdown timers update every second)
- [ ] T080 [P] [US1] Create draw detail page in frontend/src/pages/[lang]/draws/[id]/page.tsx (fetch GET /draws/:id, show title, price, tickets remaining, countdown, "Buy Ticket" CTA)

### Frontend - Quick Buy Flow

- [ ] T081 [US1] Create quick buy quantity select in frontend/src/pages/[lang]/draws/[id]/buy/page.tsx (Step 1: select quantity 1-10, default 1, show total price, "Next" button)
- [ ] T082 [US1] Create COD address confirm in frontend/src/pages/[lang]/draws/[id]/buy/confirm/page.tsx (Step 2: show pre-filled default address, phone, "Place Order" button OR "Add Address" if no default)
- [ ] T083 [US1] Create add address modal in frontend/src/components/AddressForm/ (if user has no default address, show form: street, city, postal_code, phone, is_default checkbox, call POST /users/me/addresses)
- [ ] T084 [US1] Implement order placement in quick buy confirm page (call POST /orders with draw_id, quantity, address_id, on success redirect to order confirmation)
- [ ] T085 [US1] Create order confirmation page in frontend/src/pages/[lang]/orders/[id]/confirmation/page.tsx (show order ID, ticket IDs/serials, status "pending COD", countdown to expiry, "View My Tickets" CTA)

### Frontend - Tickets Page

- [ ] T086 [P] [US1] Create tickets page in frontend/src/pages/[lang]/tickets/page.tsx (fetch GET /tickets, render TicketList grouped by draw, show status badges, expiry countdown for reserved tickets)
- [ ] T087 [P] [US1] Create user profile page in frontend/src/pages/[lang]/profile/page.tsx (fetch GET /users/me, show name, phone/email, language selector, "Edit Profile" form, PATCH /users/me on save)
- [ ] T088 [P] [US1] Create address management page in frontend/src/pages/[lang]/profile/addresses/page.tsx (fetch GET /users/me/addresses, list addresses, mark default, add new via AddressForm modal)

### Integration

- [ ] T089 [US1] Implement soft ban enforcement in OrdersService.createOrder (if user.status=soft_banned, throw ForbiddenException with message "You are temporarily restricted from purchasing")
- [ ] T090 [US1] Connect TicketExpiryJob to Orders (job finds orders WHERE expires_at < now AND status IN (pending, assigned), marks status=canceled, tickets status=expired, restocks tickets if draw.status=started)

**US1 Validation Checklist**:

- [ ] Guest user can request OTP (SMS or email)
- [ ] User receives OTP within 10 seconds (or test mode OTP accepted)
- [ ] User verifies OTP and receives JWT token
- [ ] User sees list of started draws with countdown timers
- [ ] User taps draw, taps "Buy Ticket", selects quantity, sees total price (Tap 1-2)
- [ ] User with saved address: confirms address, taps "Place Order" (Tap 3, total 3 taps)
- [ ] User without saved address: adds address (extra tap), then places order (total 4 taps - acceptable as one-time setup)
- [ ] Order created: 3 tickets reserved with sequential serials, COD task created, expires_at = order.created_at + 6 hours
- [ ] User sees order confirmation with ticket IDs and "pending COD" status
- [ ] User navigates to "My Tickets", sees tickets with status "reserved" and countdown to expiry
- [ ] Soft-banned user cannot place order (error message shown)
- [ ] After 6 hours without COD collection, TicketExpiryJob marks order canceled, tickets expired

---

## Phase 4: User Story 2 - Public Result Verification (Priority: P2)

**Goal**: Fairness differentiator - anyone can verify draw results using published merkle root + beacon value via client-side recalculation.

**Independent Test** (from spec.md): After a draw is settled, anyone can visit the verify page, see the beacon value and merkle root, click "Recalculate Winner", and see the same winning ticket serial that was announced.

**Duration**: 1.5 weeks

**Tasks**:

### Backend - Fairness Module

- [ ] T091 [US2] Create FairnessModule in backend/src/modules/fairness/fairness.module.ts
- [ ] T092 [US2] Implement FairnessService in backend/src/modules/fairness/fairness.service.ts (buildMerkleTree from paid tickets, computeWinner from beacon + root, publishRoot, publishBeacon, publishWinner)
- [ ] T093 [US2] Implement buildMerkleTree method (query all tickets WHERE draw_id=X AND status=paid ORDER BY serial, compute leaf_hash = SHA256(draw_id || serial || user_id), build merkle tree using merkletreejs, return root hex)
- [ ] T094 [US2] Implement computeWinner method (input: beacon_value hex, merkle_root hex, total_paid_tickets int, compute hash = SHA256(beacon_value || merkle_root), winner_index = bigint(hash) % total_paid_tickets, return winning ticket serial)
- [ ] T095 [US2] Create FairnessEvent record creation methods (createMerklePublishedEvent, createBeaconFetchedEvent, createWinnerComputedEvent with JSONB payloads per data-model.md, compute payload_hash = SHA256(JSON.stringify(payload)))
- [ ] T096 [US2] Integrate FairnessService with DrawCloseJob (when draw closes, call buildMerkleTree, save merkle_root to draw, create MERKLE_PUBLISHED fairness event)
- [ ] T097 [US2] Integrate FairnessService with BeaconFetchJob (fetch beacon from Bitcoin blockchain.info API or drand.love API based on draw.beacon_source, save beacon_value to draw, create BEACON_FETCHED event, trigger WinnerComputeJob)
- [ ] T098 [US2] Integrate FairnessService with WinnerComputeJob (call computeWinner, find winning ticket, save winner_ticket_id to draw, set draw.status=settled, create WINNER_COMPUTED event)
- [ ] T099 [US2] Create POST /admin/draws/:id/settle endpoint in backend/src/modules/draws/draws.controller.ts (admin-only, manually trigger BeaconFetchJob for testing, requires RBAC guard)

### Backend - Verification Endpoint

- [ ] T100 [US2] Create GET /verify/:draw_id endpoint in backend/src/modules/draws/draws.controller.ts (public, no auth, return draw with merkle_root, beacon_source, beacon_value, total_paid_tickets, winner ticket serial/user, formula string, fairness_events array, archive_url to S3 bundle)
- [ ] T101 [US2] Implement S3 audit bundle export in FairnessService (after settlement, create JSON bundle: {draw_id, merkle_root, beacon_source, beacon_value, winner, fairness_events}, upload to S3 bucket fairness-bundles/{draw_id}.json, return public URL)

### Backend - Bitcoin & Drand Integration

- [ ] T102 [P] [US2] Implement Bitcoin beacon fetch in backend/src/modules/fairness/bitcoin.service.ts (calculate block height from draw.end_at timestamp + 10min avg block time, fetch block via https://blockchain.info/block-height/{height}?format=json, extract hash, retry every 5min if 404, fallback to next block if 24hrs elapsed)
- [ ] T103 [P] [US2] Implement drand beacon fetch in backend/src/modules/fairness/drand.service.ts (fetch latest beacon via https://drand.cloudflare.com/public/latest, extract randomness hex, verify signature optional)

### Frontend - Verification Page

- [ ] T104 [US2] Create public verification page in frontend/src/pages/[lang]/verify/[draw_id]/page.tsx (no auth required, fetch GET /verify/:draw_id, display draw title, merkle root, beacon source + value with explorer link, total paid tickets, winner ticket serial)
- [ ] T105 [US2] Implement FairnessCalculator component in frontend/src/components/FairnessCalculator/ (client-side SHA256 using SubtleCrypto API: compute hash = SHA256(beacon || merkle_root), winner_index = bigint(hash) % total_tickets, display calculated winner serial)
- [ ] T106 [US2] Add auto-recalculation on page load in verification page (call FairnessCalculator.recalculate() on mount, compare calculated winner vs announced winner, show "Verification Successful" badge if match, "Verification Failed" error if mismatch)
- [ ] T107 [US2] Add beacon explorer link button (if Bitcoin: link to https://blockchain.info/block-height/{height}, if drand: link to https://drand.love with beacon timestamp)
- [ ] T108 [P] [US2] Add optional merkle proof verification UI (textarea for user to paste merkle proof JSON, button to verify proof against published root using merkletreejs in browser, show "Ticket Verified" or "Invalid Proof")
- [ ] T109 [P] [US2] Create frontend crypto utility in frontend/src/utils/crypto.ts (SHA256 helper using SubtleCrypto API, hex conversion utilities)

### Integration

- [ ] T110 [US2] Test end-to-end draw settlement flow (create draw with end_at = now + 5min, purchase tickets, wait for DrawCloseJob to trigger, verify merkle_root published, wait for BeaconFetchJob to fetch Bitcoin block, verify beacon_value published, verify WinnerComputeJob announces winner, verify audit bundle uploaded to S3)

**US2 Validation Checklist**:

- [ ] Draw closes at end_at, DrawCloseJob triggers within 1 minute
- [ ] Merkle tree built from all paid tickets (tickets with status=paid)
- [ ] Merkle root published to draw.merkle_root, MERKLE_PUBLISHED event created with payload_hash
- [ ] BeaconFetchJob fetches Bitcoin block hash or drand beacon (test both sources)
- [ ] If beacon unavailable (Bitcoin block not mined yet), job retries every 5 minutes up to 24 hours
- [ ] Beacon value published to draw.beacon_value, BEACON_FETCHED event created
- [ ] Winner computed: hash = SHA256(beacon || merkle_root), winner_index = bigint(hash) % total_paid_tickets
- [ ] Winner ticket found, draw.winner_ticket_id set, draw.status=settled, WINNER_COMPUTED event created
- [ ] Audit bundle JSON exported to S3, public URL returned
- [ ] Public verification page (no login) displays draw details, merkle root, beacon value, winner serial
- [ ] FairnessCalculator recalculates winner client-side using SubtleCrypto API
- [ ] Recalculated winner matches announced winner → "Verification Successful" badge shown
- [ ] Beacon explorer link opens Bitcoin block explorer or drand.love
- [ ] Merkle proof verification (optional feature): user pastes proof, system verifies against root

---

## Phase 5: User Story 3 - Admin Draw Lifecycle Management (Priority: P3)

**Goal**: Backend operations - admins can create draws, manage parameters, close draws, settle results.

**Independent Test** (from spec.md): An admin can create a new draw with title "Test Draw 1", price $10, max 1000 tickets, set start/end times, save it, close it, build/publish merkle root, fetch beacon, compute winner, and publish result.

**Duration**: 1 week

**Tasks**:

### Backend - Admin Draws Endpoints

- [ ] T111 [US3] Create POST /admin/draws endpoint in backend/src/modules/draws/draws.controller.ts (admin-only, RBAC: ops_manager or super_admin, body: DrawInput per contracts/api.yaml, create draw with status=started, log in audit)
- [ ] T112 [US3] Create PATCH /admin/draws/:id endpoint (admin-only, update draw fields: title, start_at, end_at, ticket_price, max_tickets, low_sales_threshold_pct, beacon_source, beacon_rule, terms_url, only allowed if status=started, log in audit)
- [ ] T113 [US3] Create POST /admin/draws/:id/close endpoint (admin-only, manually close draw before end_at, set draw.status=closed, closed_at=now, trigger DrawCloseJob, log in audit)
- [ ] T114 [US3] Implement draw cloning in DrawsService.cloneDraw (copy all fields from source draw except id, status, timestamps, created_by, set status=started)
- [ ] T115 [US3] Create POST /admin/draws/clone endpoint (admin-only, body: source_draw_id, return cloned draw)

### Backend - Draw Status Enforcement

- [ ] T116 [US3] Add validation in OrdersService.createOrder (throw BadRequestException if draw.status != started, message "Draw is closed, no new tickets can be purchased")
- [ ] T117 [US3] Implement low-sales rollover/refund logic in DrawCloseJob (if draw.tickets_sold / draw.max_tickets < draw.low_sales_threshold_pct / 100, mark draw.status=canceled instead of closed, trigger refund job for all orders, log rollover in audit)

### Frontend - Admin Panel Auth & Layout

- [ ] T118 [P] [US3] Create admin login page in frontend/src/pages/[lang]/admin/login/page.tsx (same OTP flow as user login, but after JWT verify, check if user has admin role, else redirect to user home with error "Admin access required")
- [ ] T119 [P] [US3] Create admin layout in frontend/src/pages/[lang]/admin/layout.tsx (sidebar navigation: Dashboard, Draws, Orders, Users, Audit, Reports, header with admin name + logout)
- [ ] T120 [P] [US3] Create admin RBAC guard in frontend (check user role from JWT payload, if not [super_admin, ops_manager, support_agent, auditor], redirect to login)

### Frontend - Admin Draws Pages

- [ ] T121 [US3] Create admin dashboard page in frontend/src/pages/[lang]/admin/page.tsx (fetch summary stats: today's sales, DAU placeholder, active draws count, COD queue length placeholder, recent audit logs, display cards with metrics)
- [ ] T122 [US3] Create admin draws list page in frontend/src/pages/[lang]/admin/draws/page.tsx (fetch GET /admin/draws with pagination, table with columns: title, status, start_at, end_at, tickets_sold/max_tickets, actions: View, Edit, Close, Clone)
- [ ] T123 [US3] Create admin draw create/edit page in frontend/src/pages/[lang]/admin/draws/new/page.tsx (form: DrawInput fields per contracts/api.yaml, date-time pickers for start_at/end_at, beacon source dropdown [Bitcoin, drand], submit to POST /admin/draws or PATCH /admin/draws/:id)
- [ ] T124 [US3] Create admin draw detail page in frontend/src/pages/[lang]/admin/draws/[id]/page.tsx (fetch GET /admin/draws/:id, show all fields, tickets sold progress bar, fairness artifacts if settled: merkle root, beacon value, winner, buttons: Close, Settle, View Verification Page)
- [ ] T125 [US3] Implement close draw action (button on admin draw detail, call POST /admin/draws/:id/close, show confirmation modal "Close draw and lock ticket sales?", on success show toast "Draw closed, merkle build queued")
- [ ] T126 [US3] Implement settle draw action (button on admin draw detail, call POST /admin/draws/:id/settle, show confirmation modal "Manually trigger settlement?", on success show toast "Settlement triggered, check fairness events for progress")
- [ ] T127 [US3] Implement clone draw action (button on admin draws list, call POST /admin/draws/clone with source_draw_id, redirect to edit page for cloned draw)

**US3 Validation Checklist**:

- [ ] Admin logs in with OTP, JWT contains admin role
- [ ] Admin navigates to Draws, sees list of all draws (started, closed, settled)
- [ ] Admin clicks "Create Draw", fills form (title, start/end times, price, max tickets, threshold, beacon source, terms URL), submits
- [ ] Draw created with status=started, appears on user home page
- [ ] Admin edits draw (change title, price), updates saved, audit log created
- [ ] Admin clicks "Close" on started draw, draw status changes to closed, DrawCloseJob triggered
- [ ] DrawCloseJob builds merkle root, publishes to draw.merkle_root, creates MERKLE_PUBLISHED fairness event
- [ ] Admin clicks "Settle" on closed draw, BeaconFetchJob fetches beacon, WinnerComputeJob computes winner
- [ ] Admin views draw detail, sees winner ticket serial, user ID, merkle root, beacon value, link to public verification page
- [ ] Admin clicks "Clone", cloned draw created with same parameters, new ID, status=started
- [ ] Low-sales draw (<30% sold) triggers rollover/refund logic on close (status=canceled, orders refunded)

---

## Phase 6: User Story 4 - COD Payment Collection & Order Management (Priority: P3)

**Goal**: Payment flow - admins assign COD orders to agents, agents mark collected/failed, users receive notifications, tickets update to paid/expired.

**Independent Test** (from spec.md): An admin assigns a batch of pending COD orders to an agent, exports a route list, agent marks orders as "collected" or "failed", system updates ticket status to "paid" for collected orders and "expired" for failed orders.

**Duration**: 1.5 weeks

**Tasks**:

### Backend - Notifications Module

- [ ] T128 [US4] Create NotificationsModule in backend/src/modules/notifications/notifications.module.ts
- [ ] T129 [US4] Implement NotificationsService in backend/src/modules/notifications/notifications.service.ts (sendSMS via Twilio, sendEmail via SendGrid, template rendering with user names, ticket IDs, agent contacts)
- [ ] T130 [US4] Implement SendGrid integration in backend/src/modules/notifications/sendgrid.service.ts (send email via SendGrid Dynamic Templates API, webhook for delivery status at POST /webhooks/sendgrid)
- [ ] T131 [US4] Create notification templates in backend/src/modules/notifications/templates/ (order_confirmation.en.hbs, order_confirmation.bn.hbs, cod_assigned.en.hbs, cod_collected.en.hbs, refund_notification.en.hbs for EN/BN)
- [ ] T132 [US4] Implement notification triggers in OrdersService (after order creation: send order_confirmation, after COD assignment: send cod_assigned, after COD collection: send cod_collected, after cancellation: send refund_notification)

### Backend - Admin Orders Endpoints

- [ ] T133 [US4] Create GET /admin/orders endpoint in backend/src/modules/orders/orders.controller.ts (admin-only, RBAC: ops_manager or super_admin, query filters: user_id, draw_id, status, from_date, to_date, pagination, return orders with user details)
- [ ] T134 [US4] Create GET /admin/orders/:id endpoint (admin-only, return order with tickets, user, address, COD task details)
- [ ] T135 [US4] Create PATCH /admin/orders/:id endpoint (admin-only, body: status [collected, failed, canceled], reason required, update order status, if collected: update tickets to paid, if failed/canceled: update tickets to expired, log in audit with reason)
- [ ] T136 [US4] Implement COD bulk assignment in OrdersService.assignCODOrders (input: array of order_ids, agent_id, visit_at, update orders: status=assigned, assigned_agent_id=agent_id, assigned_at=now, update COD tasks: agent_id, visit_at, status=assigned, send notifications to all users)
- [ ] T137 [US4] Create POST /admin/cod/assign endpoint (admin-only, body: order_ids array, agent_id, visit_at, call assignCODOrders, return count of assigned orders)
- [ ] T138 [US4] Implement COD route list export in OrdersService.exportRouteList (input: agent_id, optional date, query COD tasks WHERE agent_id=X AND visit_at::date=Y, return CSV with columns: order_id, user_name, user_phone, address, visit_at, order_total_amount)
- [ ] T139 [US4] Create GET /admin/cod/route-list endpoint (admin-only, query: agent_id, date optional, return CSV file via res.attachment())
- [ ] T140 [US4] Implement COD status bulk import in OrdersService.importCODStatus (input: CSV file with columns order_id, status, collected_at, fail_reason, parse CSV, update orders and tickets, validate status transitions, log audit entries)
- [ ] T141 [US4] Create POST /admin/cod/import endpoint (admin-only, multipart file upload, call importCODStatus, return success count + errors array)

### Frontend - Admin Orders Pages

- [ ] T142 [US4] Create admin orders list page in frontend/src/pages/[lang]/admin/orders/page.tsx (fetch GET /admin/orders with filters: draw, status, date range, table with columns: order_id, user_name, user_phone, draw_title, quantity, total_amount, status, created_at, actions: View, Update Status)
- [ ] T143 [US4] Create admin order detail page in frontend/src/pages/[lang]/admin/orders/[id]/page.tsx (fetch GET /admin/orders/:id, show order details, user details, address, tickets list with serials, COD task status, buttons: Mark Collected, Mark Failed, Cancel)
- [ ] T144 [US4] Implement update order status action (modal with status dropdown [collected, failed, canceled], reason textarea required, call PATCH /admin/orders/:id, on success reload order details, show toast "Order status updated")
- [ ] T145 [US4] Create admin COD management page in frontend/src/pages/[lang]/admin/cod/page.tsx (fetch GET /admin/orders?status=pending,assigned with pagination, table with columns: order_id, user_name, user_phone, address, status, assigned_agent, visit_at, actions: Assign, Export Route, Import Status)
- [ ] T146 [US4] Implement COD bulk assignment action (multi-select orders, modal with agent_id dropdown and visit_at date-time picker, call POST /admin/cod/assign with selected order_ids, on success show toast "X orders assigned to agent Y")
- [ ] T147 [US4] Implement COD route list export action (button on COD management page, input agent_id + date, call GET /admin/cod/route-list?agent_id=X&date=Y, download CSV file)
- [ ] T148 [US4] Implement COD status bulk import action (file upload input on COD management page, call POST /admin/cod/import with CSV file, show success count + errors in modal)

**US4 Validation Checklist**:

- [ ] User places order, immediately receives order_confirmation notification (SMS or email) with ticket IDs
- [ ] Admin navigates to COD Management, sees list of pending COD orders
- [ ] Admin selects 5 pending orders, assigns to agent "Agent 001", sets visit_at = tomorrow 10 AM, clicks "Assign"
- [ ] Orders status change to assigned, COD tasks updated with agent_id + visit_at, users receive cod_assigned notification with agent contact + visit time
- [ ] Admin exports route list for Agent 001, downloads CSV with 5 orders (user name, phone, address, visit time, amount)
- [ ] Agent visits users, collects cash for 3 orders, fails to collect for 2 orders (user not home), updates CSV offline
- [ ] Admin imports CSV via bulk import, system updates 3 orders to collected (tickets → paid, users receive cod_collected notification), 2 orders to failed (tickets → expired if reservation window passed, or retry if draw still open)
- [ ] Admin views order detail, clicks "Mark Collected", enters reason "Cash collected by Agent 001", order status → collected, tickets → paid, audit log created
- [ ] Admin views failed order, clicks "Cancel", enters reason "User not available after 3 attempts", order status → canceled, tickets → expired

---

## Phase 7: User Story 5 - User Banning & Anti-Abuse Controls (Priority: P4)

**Goal**: Fraud prevention - admins can search users, view history, apply bans (soft/hard), flag for abuse, fraud detection job auto-flags COD risk.

**Independent Test** (from spec.md): An admin views a user profile showing 5 failed COD orders in 2 days, applies a soft ban with reason "repeated failed pickups", sets expiry to 7 days, and the user is immediately blocked from purchasing tickets but can still log in to view past tickets.

**Duration**: 1 week

**Tasks**:

### Backend - Admin Users Endpoints

- [ ] T149 [US5] Create GET /admin/users endpoint in backend/src/modules/users/users.controller.ts (admin-only, RBAC: support_agent or super_admin, query: q for search by phone/email/name using full-text search, status filter, pagination, return users with stats: total_orders, total_tickets, failed_cod_count)
- [ ] T150 [US5] Create GET /admin/users/:id endpoint (admin-only, return user with full history: orders array, tickets array, bans array, devices array from auth sessions, ip_addresses array, flags array)
- [ ] T151 [US5] Implement user history aggregation in UsersService.getUserHistory (join orders, tickets, bans, auth_sessions to get device_fingerprint + ip_address arrays, aggregate failed COD count, disputes count)
- [ ] T152 [US5] Create POST /admin/users/:id/ban endpoint (admin-only, RBAC: support_agent or super_admin, body: type [soft, hard], reason required [10-500 chars], expires_at optional, create Ban record, update user.status based on type, log in audit)
- [ ] T153 [US5] Implement ban application in UsersService.applyBan (if type=soft: set user.status=soft_banned, if type=hard: set user.status=hard_banned, create Ban entry, check no existing active ban via unique partial index)
- [ ] T154 [US5] Create DELETE /admin/users/:id/ban/:ban_id endpoint (admin-only, lift ban: set ban.lifted_at=now, ban.lifted_by=admin_id, update user.status=active, log in audit)
- [ ] T155 [US5] Implement user flagging in UsersService.addFlag (flags: spam, duplicate, chargeback, suspicious, cod_risk, store flags as JSONB array in users.flags column or separate UserFlags table)
- [ ] T156 [US5] Create POST /admin/users/:id/flags endpoint (admin-only, body: flags array [spam, duplicate, chargeback, suspicious], add flags to user, log in audit)

### Backend - Fraud Detection

- [ ] T157 [US5] Implement fraud detection logic in FraudDetectionJob (query users with 3+ orders WHERE status=failed AND created_at > now - interval '7 days', add flag 'cod_risk', optionally apply soft ban if configured)
- [ ] T158 [US5] Implement duplicate detection in UsersService.checkDuplicate (input: phone, email, device_fingerprint, ip_address, query users with matching fields, return potential duplicates, used by admin during user search)

### Frontend - Admin Users Pages

- [ ] T159 [US5] Create admin users list page in frontend/src/pages/[lang]/admin/users/page.tsx (search input for phone/email/name, status filter dropdown, fetch GET /admin/users?q=X&status=Y, table with columns: user_id, name, phone, email, status, total_orders, failed_cod_count, flags badges, actions: View, Ban)
- [ ] T160 [US5] Create admin user detail page in frontend/src/pages/[lang]/admin/users/[id]/page.tsx (fetch GET /admin/users/:id, tabs: Profile, Orders, Tickets, Bans, Devices, IPs, Flags, each tab shows respective data, buttons: Ban User, Add Flag, Lift Ban)
- [ ] T161 [US5] Implement ban user action (modal with ban type radio [soft, hard], reason textarea required, expires_at date-time picker optional, call POST /admin/users/:id/ban, on success reload user details, show toast "User banned")
- [ ] T162 [US5] Implement lift ban action (button next to active ban in Bans tab, confirmation modal "Lift this ban?", call DELETE /admin/users/:id/ban/:ban_id, on success reload user details, show toast "Ban lifted")
- [ ] T163 [US5] Implement add flag action (modal with checkboxes for flags [spam, duplicate, chargeback, suspicious], call POST /admin/users/:id/flags, on success reload user details, show toast "Flags added")

**US5 Validation Checklist**:

- [ ] Admin navigates to Users, searches by phone "+8801700000001", sees user in results
- [ ] Admin clicks "View", sees user profile with tabs: Profile (name, phone, email, status, language), Orders (5 failed COD orders), Tickets (10 expired tickets), Bans (no active bans), Devices (2 device fingerprints), IPs (3 IP addresses), Flags (empty)
- [ ] Admin clicks "Ban User", selects type=soft, enters reason "Repeated failed COD pickups (5 failures in 2 days)", sets expires_at = now + 7 days, confirms
- [ ] Ban created, user.status=soft_banned, audit log entry created with reason + expiry
- [ ] User attempts to place order, sees error "You are temporarily restricted from purchasing tickets. Please contact support."
- [ ] User can still log in, navigate to My Tickets, see past tickets
- [ ] Admin adds flag "cod_risk" to user, flag appears on user profile
- [ ] FraudDetectionJob runs hourly, finds users with 3+ failed CODs in 7 days, auto-adds "cod_risk" flag
- [ ] User with "cod_risk" flag: purchase cap limited to 1 ticket per day (enforced in OrdersService.createOrder)
- [ ] After 7 days, ban expires (ban.expires_at < now), user.status auto-updated to active by daily cleanup job
- [ ] Admin clicks "Lift Ban" before expiry, ban.lifted_at=now, user.status=active immediately

---

## Phase 8: User Story 6 - Audit Log & Fairness Reporting (Priority: P4)

**Goal**: Compliance & transparency - auditors can view immutable audit logs, fairness reports with merkle roots + beacon fetches + winner calculations.

**Independent Test** (from spec.md): An auditor logs in, views audit logs filtered by date range and action type (e.g., "user_banned"), sees 3 entries with admin IDs, user IDs, reasons, and timestamps. They also view the fairness report for Draw 001, see merkle root published at 2025-11-05 14:00, beacon fetched at 14:15, winner computed at 14:16.

**Duration**: 1 week

**Tasks**:

### Backend - Audit Module

- [ ] T164 [US6] Create AuditModule in backend/src/modules/audit/audit.module.ts
- [ ] T165 [US6] Implement AuditService in backend/src/modules/audit/audit.service.ts (create audit log entry, query audit logs with filters)
- [ ] T166 [US6] Create GET /admin/audit endpoint in backend/src/modules/audit/audit.controller.ts (admin-only, RBAC: auditor or super_admin, query filters: actor_id, action_type, entity_type, entity_id, from_date, to_date, pagination, return audit logs sorted by created_at DESC)
- [ ] T167 [US6] Implement audit log filtering in AuditService.findAuditLogs (build dynamic query with WHERE clauses for filters, support pagination, return logs with actor name/role resolved)
- [ ] T168 [US6] Verify audit log immutability (test attempting UPDATE or DELETE on audit_logs table via TypeORM, ensure DB trigger rejects with error)

### Backend - Reports Module

- [ ] T169 [US6] Create ReportsModule in backend/src/modules/reports/reports.module.ts
- [ ] T170 [US6] Implement ReportsService in backend/src/modules/reports/reports.service.ts (generate sales report, COD report, fairness report)
- [ ] T171 [US6] Create GET /admin/reports/sales endpoint in backend/src/modules/reports/reports.controller.ts (admin-only, query: from_date, to_date, draw_id optional, return summary: total_orders, total_tickets_sold, total_revenue, avg_tickets_per_order, by_draw breakdown per contracts/api.yaml)
- [ ] T172 [US6] Create GET /admin/reports/cod endpoint (admin-only, query: from_date, to_date, return summary: total_orders, collected, failed, canceled, collection_rate_pct, avg_time_to_collect_hours, fail_reasons breakdown)
- [ ] T173 [US6] Create GET /admin/reports/fairness endpoint (admin-only, query: from_date, to_date, return array of draws with fairness data: draw_id, draw_title, status, merkle_root, merkle_published_at, beacon_source, beacon_value, beacon_fetched_at, winner_ticket_serial, winner_computed_at per contracts/api.yaml)
- [ ] T174 [US6] Implement sales report aggregation in ReportsService.getSalesReport (join orders, tickets, draws, aggregate by draw: count orders, sum tickets, sum revenue, calculate sell-through %)
- [ ] T175 [US6] Implement COD report aggregation in ReportsService.getCODReport (join orders, cod_tasks, aggregate by status, calculate collection rate, avg time to collect = avg(collected_at - created_at), group fail_reasons by count)
- [ ] T176 [US6] Implement fairness report in ReportsService.getFairnessReport (join draws, fairness_events, extract timestamps from events WHERE event_type IN (MERKLE_PUBLISHED, BEACON_FETCHED, WINNER_COMPUTED), return draw fairness timeline)

### Frontend - Admin Audit & Reports Pages

- [ ] T177 [US6] Create admin audit log page in frontend/src/pages/[lang]/admin/audit/page.tsx (filters: actor, action_type dropdown, entity_type dropdown, date range pickers, fetch GET /admin/audit with filters, table with columns: created_at, actor_name, actor_role, action_type, entity_type, entity_id, diff_summary, ip_address, actions: View Details)
- [ ] T178 [US6] Create audit log detail modal (click "View Details" on audit log row, show full payload_hash, link to entity if entity_id present: e.g., View User, View Draw, View Order)
- [ ] T179 [US6] Create admin reports dashboard page in frontend/src/pages/[lang]/admin/reports/page.tsx (tabs: Sales, COD, Fairness, date range picker for all tabs)
- [ ] T180 [US6] Implement sales report tab (fetch GET /admin/reports/sales?from_date=X&to_date=Y, display summary cards: total orders, total tickets sold, total revenue, avg tickets/order, table with by_draw breakdown: draw title, tickets sold, max tickets, sell-through %, revenue)
- [ ] T181 [US6] Implement COD report tab (fetch GET /admin/reports/cod?from_date=X&to_date=Y, display summary cards: total orders, collected, failed, canceled, collection rate %, avg time to collect hours, pie chart for fail reasons)
- [ ] T182 [US6] Implement fairness report tab (fetch GET /admin/reports/fairness?from_date=X&to_date=Y, table with columns: draw title, status, merkle root (truncated), merkle published at, beacon source, beacon value (truncated), beacon fetched at, winner serial, winner computed at, actions: View Verification Page)

**US6 Validation Checklist**:

- [ ] Auditor (role=auditor) logs in with OTP, JWT contains auditor role
- [ ] Auditor navigates to Audit Logs, sees paginated list of all admin actions sorted by created_at DESC
- [ ] Auditor filters by action_type="user_banned", sees 3 ban entries with actor admin IDs, user IDs, reasons, timestamps
- [ ] Auditor clicks "View Details" on a ban entry, sees full payload_hash, link to user profile
- [ ] Auditor filters by date range (last 7 days), sees only logs within that range
- [ ] Auditor navigates to Reports, selects Fairness tab
- [ ] Auditor selects date range covering Draw 001, sees draw in fairness report table
- [ ] Fairness report shows: merkle_root, merkle_published_at (2025-11-05 14:00), beacon_source (Bitcoin), beacon_value, beacon_fetched_at (14:15), winner_ticket_serial, winner_computed_at (14:16)
- [ ] Auditor clicks "View Verification Page" link, opens public verification page for Draw 001 in new tab
- [ ] Auditor navigates to Sales report tab, selects date range (last month), sees summary: total orders, tickets sold, revenue, by_draw breakdown with sell-through % for each draw
- [ ] Auditor navigates to COD report tab, sees summary: collection rate %, avg time to collect hours, fail reasons pie chart (e.g., "User not home": 60%, "Invalid address": 40%)

---

## Phase 9: Polish & Cross-Cutting Concerns

**Goal**: Complete non-functional requirements, optimize performance, add observability, prepare for production.

**Duration**: 1-2 weeks

**Tasks**:

### Performance & Optimization

- [ ] T183 [P] Implement database query optimization (add missing indexes, use query explain analyze to verify index usage, optimize N+1 queries with eager loading)
- [ ] T184 [P] Implement Redis caching for hot paths (cache draw list with TTL 60s, cache draw details with TTL 30s, invalidate on draw status change)
- [ ] T185 [P] Implement rate limiting for all public endpoints (OTP request: 3/hour per phone/IP, order creation: 10/hour per user, draw listing: 100/min per IP)
- [ ] T186 [P] Optimize frontend bundle size (code splitting by route, lazy load admin panel, image optimization, remove unused dependencies)
- [ ] T187 [P] Implement CDN for frontend static assets (configure Next.js image optimization, serve /public assets from CDN)

### Observability & Monitoring

- [ ] T188 [P] Set up Prometheus metrics exporter in backend (nestjs-prometheus, expose metrics at GET /metrics: http_requests_total, http_request_duration_seconds, db_connections, redis_connections, bullmq_jobs_completed_total)
- [ ] T189 [P] Set up Sentry for backend error tracking (capture exceptions, breadcrumbs for critical operations: order creation, draw settlement, COD updates)
- [ ] T190 [P] Set up Sentry for frontend error tracking (capture React errors, breadcrumbs for user actions: login, buy tickets, verify results)
- [ ] T191 [P] Create Grafana dashboards (dashboard 1: RPS, p50/p95/p99 latency, error rate, dashboard 2: COD collection rate, draw sell-through %, OTP delivery success %, dashboard 3: Background job queue length, job success/failure rates)
- [ ] T192 [P] Set up alerting in Grafana (alert 1: p95 latency >2.5s for 5min, alert 2: error rate >5% for 5min, alert 3: OTP delivery success <90% for 10min, alert 4: BeaconFetchJob failed 3+ retries)

### Security Hardening

- [ ] T193 [P] Implement CORS configuration in backend (allow frontend origin, credentials: true, preflight max age: 86400)
- [ ] T194 [P] Implement helmet middleware in backend (set security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- [ ] T195 [P] Implement input validation on all endpoints (use class-validator DTOs, sanitize SQL injection, XSS, validate UUID formats, phone E.164, email RFC 5322)
- [ ] T196 [P] Implement HTTPS redirect in production (enforce TLS, HSTS header with max-age=31536000)
- [ ] T197 [P] Rotate JWT secret in production (use environment variable, document rotation procedure in runbook)

### Testing

- [ ] T198 Write unit tests for critical crypto operations (merkle tree build, winner compute, SHA256 leaf hash, test with known inputs/outputs)
- [ ] T199 Write unit tests for state transitions (order pending→assigned→collected, ticket reserved→paid→entered, draw started→closed→settled)
- [ ] T200 Write integration tests for auth endpoints (POST /auth/otp/request, POST /auth/otp/verify, test rate limiting, OTP expiry, invalid OTP)
- [ ] T201 Write integration tests for order creation (POST /orders, test soft ban enforcement, draw status validation, address validation, ticket reservation)
- [ ] T202 Write E2E test for 2-3 tap quick buy flow (Playwright: login with OTP, view draw, select quantity, confirm address, place order, verify tickets reserved)
- [ ] T203 Write E2E test for public verification flow (Playwright: navigate to /verify/:draw_id, verify merkle root + beacon value displayed, click recalculate, verify "Verification Successful" badge)
- [ ] T204 Write E2E test for admin draw creation flow (Playwright: admin login, navigate to Draws, create draw, verify appears on user home)
- [ ] T205 Write contract tests for API endpoints (Supertest: snapshot test request/response schemas match contracts/api.yaml for /draws, /orders, /tickets, /verify/:id)
- [ ] T206 Write load test for quick buy flow (k6: 100 VUs purchasing tickets concurrently, validate p95 <2.5s, error rate <1%)

### Documentation

- [ ] T207 [P] Write API documentation (generate from contracts/api.yaml using Swagger UI or Redoc, host at /api-docs)
- [ ] T208 [P] Write deployment guide (Kubernetes manifests, Helm charts, environment variables reference, database migration instructions, secrets management)
- [ ] T209 [P] Write runbook for common operations (manually trigger settlement, restart stuck job, inspect audit logs, rollback deployment, scale pods)
- [ ] T210 [P] Update README.md with production setup (replace quickstart local dev sections with production deployment steps, link to runbook)

### i18n Completion

- [ ] T211 [P] Complete EN translations in backend/src/shared/i18n/en.json (all error messages, notification templates, validation messages)
- [ ] T212 [P] Complete BN translations in backend/src/shared/i18n/bn.json (translate all strings from en.json to Bengali)
- [ ] T213 [P] Complete EN translations in frontend/src/i18n/en.json (all UI labels, button text, page titles, error messages)
- [ ] T214 [P] Complete BN translations in frontend/src/i18n/bn.json (translate all strings from en.json to Bengali)
- [ ] T215 [P] Test language switching in frontend (navigate to /en/ vs /bn/, verify all text changes, verify notification emails sent in user's preferred language)

### Final Integration & Smoke Tests

- [ ] T216 Run end-to-end smoke test in staging (full user journey: register, buy tickets, admin closes draw, beacon fetches, winner announced, user verifies result, admin views audit logs)
- [ ] T217 Verify all background jobs execute on schedule (DrawCloseJob at end_at, TicketExpiryJob every 5min, CODReconciliationJob daily, FraudDetectionJob hourly)
- [ ] T218 Verify audit log immutability (attempt to modify audit_logs via SQL, verify rejected by trigger)
- [ ] T219 Verify fairness artifacts uploaded to S3 (trigger settlement for test draw, verify JSON bundle exists at s3://bucket/fairness-bundles/{draw_id}.json)
- [ ] T220 Verify rate limiting enforces limits (send 10 OTP requests in 1 hour from same phone, verify 4th+ rejected with 429)

---

## Dependencies & Execution Order

### Story Completion Order

The following user stories can be developed in order, with each delivering independent value:

1. **Phase 1 (Setup)** → **Phase 2 (Foundational)** → **REQUIRED before all user stories**
2. **Phase 3 (US1: Quick Buy)** → **MVP** (can launch with just this + foundational)
3. **Phase 4 (US2: Verification)** → Can be implemented **in parallel** with US3/US4 (no dependencies)
4. **Phase 5 (US3: Admin Draws)** → Can be implemented **in parallel** with US2 (minimal dependencies: needs DrawsModule from US1)
5. **Phase 6 (US4: COD Management)** → Depends on **US1** (needs Orders/Tickets) and **US3** (needs admin panel layout)
6. **Phase 7 (US5: Banning)** → Depends on **US1** (needs Users/Orders), can be **in parallel** with US6
7. **Phase 8 (US6: Audit/Reports)** → Can be implemented **in parallel** with US5 (independent)
8. **Phase 9 (Polish)** → After all user stories complete

### Parallel Execution Examples

**Week 1-2 (Setup + Foundational)**: All developers on T001-T050 (can parallelize database migrations T017-T027, frontend components T046-T050)

**Week 3-4 (US1 MVP)**:
- Developer A: Backend (T051-T075)
- Developer B: Frontend auth + home (T076-T080)
- Developer C: Frontend quick buy + tickets (T081-T088)

**Week 5-6 (US2 + US3 in parallel)**:
- Developer A: US2 backend fairness (T091-T103)
- Developer B: US2 frontend verification (T104-T109)
- Developer C: US3 admin draws (T111-T127)

**Week 7-8 (US4 + US5 in parallel)**:
- Developer A: US4 COD backend (T128-T141)
- Developer B: US4 COD frontend (T142-T148)
- Developer C: US5 banning (T149-T163)

**Week 9-10 (US6 + Polish in parallel)**:
- Developer A: US6 audit/reports (T164-T182)
- Developer B: Testing (T198-T206)
- Developer C: Observability (T188-T192)

**Week 11-12 (Final Polish)**:
- All developers: Security (T193-T197), i18n (T211-T215), smoke tests (T216-T220)

---

## Suggested MVP Scope

**Minimum Viable Product** (launch-ready subset):

- **Phase 1**: Setup (T001-T016)
- **Phase 2**: Foundational (T017-T050)
- **Phase 3**: US1 - Quick Buy (T051-T090)
- **Phase 4**: US2 - Verification (T091-T110)
- **Phase 5**: US3 - Admin Draws (T111-T127)
- **Phase 9 (subset)**: Critical polish (T183-T197: performance, security)

**Total MVP Tasks**: ~120 tasks
**Estimated MVP Duration**: 6-8 weeks (2-3 developers)

**Post-MVP** (add after user validation):
- US4: COD Management (add if COD collection becomes bottleneck)
- US5: Banning (add when abuse patterns emerge)
- US6: Audit/Reports (add for regulatory compliance)
- Full Polish: Testing, i18n, monitoring (add for production scale)

---

## Task Summary

| Phase | User Story | Task Count | Duration | Parallelizable |
|-------|-----------|-----------|----------|----------------|
| Phase 1 | Setup | 16 | 1 week | High (60%) |
| Phase 2 | Foundational | 34 | 1 week | High (70%) |
| Phase 3 | US1 - Quick Buy | 40 | 2 weeks | Medium (40%) |
| Phase 4 | US2 - Verification | 20 | 1.5 weeks | Medium (50%) |
| Phase 5 | US3 - Admin Draws | 17 | 1 week | Low (30%) |
| Phase 6 | US4 - COD Management | 21 | 1.5 weeks | Medium (40%) |
| Phase 7 | US5 - Banning | 15 | 1 week | Low (20%) |
| Phase 8 | US6 - Audit/Reports | 19 | 1 week | Medium (50%) |
| Phase 9 | Polish | 38 | 1-2 weeks | High (80%) |
| **TOTAL** | - | **220** | **10-12 weeks** | **Medium (50%)** |

**Format Validation**: ✅ All tasks follow checklist format with:
- Checkbox: `- [ ]`
- Task ID: T001-T220
- [P] marker: Present on parallelizable tasks
- [US#] label: Present on all user story phase tasks (US1-US6)
- File paths: Included in task descriptions

**Independent Test Criteria**: ✅ Each user story phase includes:
- Clear independent test statement from spec.md
- Validation checklist confirming value delivered
- Can be tested without dependencies on other user stories

**Next Steps**: Begin implementation with Phase 1 (Setup) tasks T001-T016, then proceed to Phase 2 (Foundational) tasks T017-T050 before starting any user story.
