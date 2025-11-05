# Implementation Plan: Provably-Fair Lottery Platform

**Branch**: `001-provably-fair-lottery` | **Date**: 2025-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-provably-fair-lottery/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

A lightweight lottery platform enabling users to purchase tickets via COD in 2-3 taps and independently verify draw fairness using public randomness sources (Bitcoin block hashes or drand) and Merkle tree proofs. The system must support 100k daily active users with <2.5s page loads, provide transparent fairness verification, manage COD payment collection workflows, enforce anti-abuse controls, and maintain immutable audit trails for all admin actions. Core differentiator is provably-fair results that anyone can reproduce using published beacon values and Merkle roots.

## Technical Context

**Language/Version**: NEEDS CLARIFICATION (backend language for modular monolith)
**Primary Dependencies**: NEEDS CLARIFICATION (web framework, OTP provider, SMS/email gateway, job queue, Merkle tree library, crypto hashing)
**Storage**: NEEDS CLARIFICATION (relational database with partitioning support, caching layer, immutable storage for audit bundles)
**Testing**: NEEDS CLARIFICATION (unit/integration/contract testing frameworks, load testing tools)
**Target Platform**: Web application (browser-based frontend + server backend) with mobile-responsive UI
**Project Type**: Web (frontend + backend)
**Performance Goals**: 2k-5k read RPS, 200-500 write RPS during peak (draw close/settlement), p95 page load <2.5s on 4G, OTP delivery <10s, merkle/beacon ops <5min
**Constraints**: 100k DAU support, 99.9% uptime, immutable audit logs, 6-hour COD reservation window, deterministic fairness verification
**Scale/Scope**: ~90 functional requirements, 10 key entities, 6 user journeys, multi-role admin panel (4 roles), 2 languages (EN/BN), background job processing

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS - No constitution defined

**Notes**: The project constitution at `.specify/memory/constitution.md` is a template and has not been customized with specific principles or constraints. Therefore, there are no constitutional gates to evaluate at this time.

**Recommendation**: Consider establishing a constitution before implementation (via `/speckit.constitution`) to define architectural principles such as:
- Testing requirements (TDD, coverage minimums)
- Deployment practices (CI/CD, rollback procedures)
- Security standards (auth, encryption, audit requirements)
- Performance SLAs (latency, throughput, availability)
- Code organization (modularity, library boundaries)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/                 # Feature modules (modular monolith)
│   │   ├── auth/                # OTP authentication, sessions
│   │   ├── users/               # User management, profiles, bans
│   │   ├── draws/               # Draw lifecycle, status transitions
│   │   ├── tickets/             # Ticket reservations, serials, status
│   │   ├── orders/              # Order management, COD tasks
│   │   ├── fairness/            # Merkle tree, beacon fetch, winner calc
│   │   ├── notifications/       # SMS/email sending, templates
│   │   ├── admin/               # Admin panel operations, RBAC
│   │   ├── audit/               # Immutable audit logs, payload hashing
│   │   └── reports/             # Sales, COD, fairness, abuse reports
│   ├── shared/                  # Cross-cutting concerns
│   │   ├── database/            # DB connection, partitioning, migrations
│   │   ├── cache/               # Caching layer, rate limiting
│   │   ├── jobs/                # Background job queue, scheduling
│   │   ├── crypto/              # SHA256, merkle tree utilities
│   │   ├── i18n/                # EN/BN translations
│   │   └── middleware/          # Auth guards, rate limiting, RBAC
│   ├── config/                  # Environment configs, feature flags
│   └── main.ts                  # Application entry point
└── tests/
    ├── unit/                    # Unit tests per module
    ├── integration/             # Cross-module integration tests
    ├── contract/                # API contract tests (OpenAPI)
    └── e2e/                     # End-to-end user flows

frontend/
├── src/
│   ├── pages/                   # User-facing pages
│   │   ├── home/                # Draw listings, countdown timers
│   │   ├── quick-buy/           # 2-3 tap purchase flow
│   │   ├── tickets/             # User ticket view, status
│   │   ├── verify/              # Public verification page (SHA256 + merkle)
│   │   └── profile/             # User profile, address management
│   ├── admin/                   # Admin panel pages
│   │   ├── dashboard/           # Sales, DAU, COD queue, fraud flags
│   │   ├── draws/               # Draw CRUD, close, settle
│   │   ├── orders/              # Order search, COD management
│   │   ├── users/               # User search, bans, history
│   │   ├── audit/               # Audit log viewer
│   │   └── reports/             # Sales, fairness, abuse reports
│   ├── components/              # Reusable UI components
│   │   ├── DrawCard/
│   │   ├── TicketList/
│   │   ├── CODStatusBadge/
│   │   └── FairnessCalculator/  # Client-side winner recalculation
│   ├── services/                # API clients, state management
│   ├── i18n/                    # EN/BN translation files
│   └── utils/                   # Crypto (SHA256), date formatting
└── tests/
    ├── unit/
    └── e2e/                     # Playwright/Cypress tests

shared/
└── types/                       # Shared TypeScript types (if TS used)
    ├── entities/                # User, Draw, Ticket, Order, etc.
    ├── dtos/                    # API request/response DTOs
    └── enums/                   # Status enums, roles, beacon sources
```

**Structure Decision**: Web application with separate backend (modular monolith) and frontend (responsive web UI). Backend organized by feature modules to support the 90 functional requirements across 9 domains (auth, users, draws, tickets, orders, fairness, notifications, admin, audit). Frontend split into user-facing pages and admin panel with shared components. Shared types directory ensures API contract consistency if TypeScript is selected.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: N/A - No constitution defined, no violations to track
