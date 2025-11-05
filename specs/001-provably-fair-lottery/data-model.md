# Data Model: Provably-Fair Lottery Platform

**Date**: 2025-11-05
**Feature**: 001-provably-fair-lottery
**Technology**: PostgreSQL 16 (from research.md)

## Overview

This document defines the logical data model for the lottery platform. All entities are technology-agnostic but include PostgreSQL-specific notes where relevant (partitioning, indexing). Primary keys are UUIDs unless noted. Timestamps are UTC.

---

## Core Entities

### User

Represents a platform participant (buyer, winner, or banned user).

**Attributes**:
- `id` (UUID, PK): Unique user identifier
- `phone` (string, unique, indexed): Phone number for OTP auth (E.164 format, e.g., +8801712345678)
- `email` (string, unique, indexed, nullable): Email for OTP auth (optional)
- `name` (string): Display name
- `status` (enum: active, soft_banned, hard_banned): Account status
- `language` (enum: en, bn): Preferred language (default: en)
- `created_at` (timestamp): Account creation time
- `updated_at` (timestamp): Last profile update

**Relationships**:
- One-to-many: Auth Sessions, Orders, Tickets, Bans
- Many-to-many: Addresses (via user_addresses join table)

**Validation Rules** (from spec FR-001, FR-005):
- Phone XOR email required (at least one must be non-null)
- Phone must match E.164 regex if provided
- Email must match RFC 5322 if provided
- Name: 1-100 characters, non-empty

**Indexes**:
- Unique index on `phone` (WHERE phone IS NOT NULL)
- Unique index on `email` (WHERE email IS NOT NULL)
- Index on `status` (for ban queries)

**State Transitions**:
- `active` → `soft_banned` (via admin ban action, FR-049)
- `active` → `hard_banned` (via admin ban action, FR-049)
- `soft_banned` → `active` (ban lifted or expired)
- `hard_banned` → `active` (ban lifted by admin)

---

### AuthSession

Represents an OTP authentication session (ephemeral, expires after 10 minutes).

**Attributes**:
- `id` (UUID, PK): Session identifier
- `user_id` (UUID, FK → User, nullable): Linked user (null until OTP verified)
- `phone_or_email` (string, indexed): Phone or email where OTP was sent
- `otp_code` (string, hashed): OTP code (hashed with bcrypt for security)
- `otp_sent_at` (timestamp): When OTP was generated
- `otp_expires_at` (timestamp): Expiry time (otp_sent_at + 10 minutes, FR-003)
- `verified` (boolean): Whether OTP was successfully verified
- `device_fingerprint` (string, nullable): Browser fingerprint (for fraud detection)
- `ip_address` (string, indexed): Request IP (for rate limiting + audit)
- `created_at` (timestamp): Session creation time

**Relationships**:
- Many-to-one: User (nullable until verified)

**Validation Rules** (from spec FR-002, FR-003, FR-057):
- OTP code: 6 digits, numeric
- OTP expires 10 minutes after generation
- Rate limit: Max 3 OTP requests per phone/email per hour (enforced via Redis, not DB)
- Device fingerprint: Max 10 OTP requests per device per hour

**Indexes**:
- Index on `phone_or_email, otp_sent_at` (for rate limiting queries)
- Index on `ip_address, otp_sent_at` (for IP-based rate limiting)

**Cleanup**:
- Delete sessions older than 24 hours (daily cleanup job)

---

### Ban

Represents a restriction on a user (soft = block purchase, hard = block login).

**Attributes**:
- `id` (UUID, PK): Ban identifier
- `user_id` (UUID, FK → User, indexed): Banned user
- `type` (enum: soft, hard): Ban severity
- `reason` (text, required): Explanation for ban (FR-049)
- `expires_at` (timestamp, nullable): Expiry time (null = permanent)
- `created_by` (UUID, FK → Admin User): Admin who applied ban
- `created_at` (timestamp): Ban application time
- `lifted_at` (timestamp, nullable): When ban was removed (null if active)
- `lifted_by` (UUID, FK → Admin User, nullable): Admin who lifted ban

**Relationships**:
- Many-to-one: User (the banned user)
- Many-to-one: Admin User (created_by, lifted_by)

**Validation Rules** (from spec FR-049, FR-050):
- Reason: 10-500 characters, required
- If `expires_at` is set, must be > `created_at`
- Only one active ban per user (enforce unique partial index: `WHERE lifted_at IS NULL`)

**Indexes**:
- Index on `user_id, lifted_at` (to find active bans: WHERE lifted_at IS NULL)
- Index on `created_at` (for audit queries: recent bans)

**State Transitions**:
- Created with `lifted_at = null` (active)
- Lifted by admin or auto-expired: set `lifted_at = now()`, `lifted_by = admin_id`

---

### Address

Represents a delivery address for COD payments.

**Attributes**:
- `id` (UUID, PK): Address identifier
- `user_id` (UUID, FK → User, indexed): Owner user
- `label` (string, nullable): User-defined label (e.g., "Home", "Office")
- `street` (string, required): Street address
- `city` (string, required): City name
- `state` (string, nullable): State/province
- `postal_code` (string, required): Postal/ZIP code
- `country` (string, required): Country code (ISO 3166-1 alpha-2, e.g., "BD")
- `phone` (string, required): Contact phone for delivery (may differ from user.phone)
- `is_default` (boolean): Whether this is the default address for quick buy
- `created_at` (timestamp): Address creation time

**Relationships**:
- Many-to-one: User

**Validation Rules** (from spec FR-006):
- Street, city, postal_code, phone: non-empty
- Only one `is_default = true` per user (enforce via application logic or DB trigger)

**Indexes**:
- Index on `user_id, is_default` (fast lookup for quick buy flow)

---

### Draw

Represents a lottery draw with lifecycle states and fairness artifacts.

**Attributes**:
- `id` (UUID, PK): Draw identifier
- `title` (string, required): Display name (e.g., "Weekly Draw #1")
- `status` (enum: started, closed, settled): Lifecycle state
- `start_at` (timestamp, required): When ticket sales open
- `end_at` (timestamp, required): When ticket sales close (auto-close trigger)
- `ticket_price` (decimal, required): Price per ticket (positive, 2 decimal places)
- `max_tickets` (integer, required): Maximum tickets available
- `tickets_sold` (integer, default 0): Count of paid tickets (updated on COD collection)
- `low_sales_threshold_pct` (integer, default 30): If `tickets_sold / max_tickets < threshold`, trigger rollover (FR-013)
- `beacon_source` (enum: bitcoin, drand, required): Randomness source
- `beacon_rule` (text, nullable): Rule description (e.g., "Bitcoin block at height N after close; fallback: next block")
- `beacon_value` (string, nullable): Fetched beacon value (hex string)
- `merkle_root` (string, nullable): Hex-encoded merkle root of paid tickets (64 chars)
- `winner_ticket_id` (UUID, FK → Ticket, nullable): Winning ticket
- `terms_url` (string, required): Link to terms and conditions
- `created_by` (UUID, FK → Admin User): Admin who created draw
- `created_at` (timestamp): Draw creation time
- `closed_at` (timestamp, nullable): When draw was closed (auto or manual)
- `settled_at` (timestamp, nullable): When winner was announced

**Relationships**:
- One-to-many: Orders, Tickets, FairnessEvents
- Many-to-one: Admin User (creator), Ticket (winner)

**Validation Rules** (from spec FR-008, FR-013):
- `start_at` < `end_at`
- `ticket_price` > 0
- `max_tickets` > 0
- `low_sales_threshold_pct`: 0-100
- `beacon_source` in (bitcoin, drand)
- State transitions (see below)

**Indexes**:
- Index on `status, end_at` (for auto-close job: WHERE status='started' AND end_at < now())
- Index on `created_at` (for admin draw list, sorted newest first)

**State Transitions** (from spec FR-010, FR-011, FR-036, FR-041):
1. **started** → **closed**: Triggered at `end_at` (auto) or by admin (manual). Actions:
   - Lock ticket sales
   - Set `closed_at = now()`
   - Trigger DrawCloseJob (build merkle tree)

2. **closed** → **settled**: After merkle root published and beacon fetched. Actions:
   - Set `merkle_root`, `beacon_value`, `winner_ticket_id`
   - Set `settled_at = now()`
   - Trigger notifications to all participants

**Partitioning** (PostgreSQL):
- Partition `draws` by `created_at` (monthly partitions) for efficient archival

---

### Order

Represents a ticket purchase transaction (COD payment workflow).

**Attributes**:
- `id` (UUID, PK): Order identifier
- `user_id` (UUID, FK → User, indexed): Buyer
- `draw_id` (UUID, FK → Draw, indexed): Associated draw
- `quantity` (integer, required): Number of tickets purchased (1-10 per FR-016)
- `total_amount` (decimal, required): `quantity * draw.ticket_price`
- `status` (enum: pending, assigned, collected, failed, canceled): COD workflow state
- `address_id` (UUID, FK → Address, required): Delivery address
- `assigned_agent_id` (UUID, FK → Agent User, nullable): COD agent (if assigned)
- `notes` (text, nullable): Admin or agent notes
- `created_at` (timestamp): Order creation time
- `assigned_at` (timestamp, nullable): When COD agent was assigned
- `collected_at` (timestamp, nullable): When cash was collected
- `failed_at` (timestamp, nullable): When COD attempt failed
- `canceled_at` (timestamp, nullable): When order was canceled (expiry or admin action)
- `expires_at` (timestamp, required): Reservation window (created_at + 6 hours, FR-020)

**Relationships**:
- Many-to-one: User, Draw, Address
- One-to-one: CODTask
- One-to-many: Tickets

**Validation Rules** (from spec FR-016, FR-019, FR-020):
- `quantity`: 1-10
- `total_amount = quantity * draw.ticket_price`
- `expires_at = created_at + 6 hours`
- State transitions (see below)

**Indexes**:
- Index on `user_id, created_at DESC` (user order history)
- Index on `draw_id, status` (admin order search by draw)
- Index on `status, expires_at` (expiry job: WHERE status='pending' AND expires_at < now())
- Index on `assigned_agent_id, status` (agent's order queue)

**State Transitions** (from spec FR-024, FR-026, FR-027, FR-029):
1. **pending** → **assigned**: Admin assigns COD agent. Actions:
   - Set `assigned_agent_id`, `assigned_at = now()`
   - Send notification to user with agent contact (FR-025)

2. **assigned** → **collected**: Agent collects cash. Actions:
   - Set `collected_at = now()`
   - Update tickets: `status = reserved → paid` (FR-027)
   - Increment `draw.tickets_sold`
   - Send confirmation notification (FR-028)

3. **assigned** → **failed**: Agent cannot collect (user not home, invalid address). Actions:
   - Set `failed_at = now()`, `notes = fail_reason`
   - If draw still open, retry or cancel
   - If draw closed, mark canceled

4. **pending/assigned** → **canceled**: Reservation expired OR admin action OR draw low-sales rollover. Actions:
   - Set `canceled_at = now()`
   - Update tickets: `status = reserved → expired`
   - Restock tickets if draw still open (FR-030)
   - Send refund notification (FR-081)

**Partitioning** (PostgreSQL):
- Partition `orders` by `draw_id` (LIST partitioning) for efficient draw-specific queries

---

### Ticket

Represents an individual lottery ticket (one per order.quantity).

**Attributes**:
- `id` (UUID, PK): Ticket identifier
- `draw_id` (UUID, FK → Draw, indexed): Associated draw
- `order_id` (UUID, FK → Order, indexed): Purchase order
- `user_id` (UUID, FK → User, indexed): Owner
- `serial` (integer, required): Sequential ticket number within draw (1, 2, 3, ..., N)
- `status` (enum: reserved, paid, expired, entered): Ticket lifecycle state
- `leaf_hash` (string, nullable): Merkle tree leaf hash (SHA256 hex, 64 chars, computed when status=paid)
- `created_at` (timestamp): Ticket creation time
- `paid_at` (timestamp, nullable): When COD was collected (status → paid)
- `expired_at` (timestamp, nullable): When reservation expired (status → expired)

**Relationships**:
- Many-to-one: Draw, Order, User

**Validation Rules** (from spec FR-017, FR-018, FR-035):
- `serial` unique per `draw_id` (composite unique index)
- `leaf_hash = SHA256(draw_id || serial || user_id)` (computed when status=paid)
- State transitions (see below)

**Indexes**:
- **Unique** composite index on `(draw_id, serial)` (ticket serial uniqueness per draw)
- Index on `user_id, created_at DESC` (user's ticket history)
- Index on `order_id` (tickets per order)
- Index on `draw_id, status` (fast query: all paid tickets for merkle build)

**State Transitions** (from spec FR-021, FR-027, FR-029):
1. **reserved** (initial): Ticket created when order placed. Not yet included in merkle tree.
2. **reserved** → **paid**: COD collected. Actions:
   - Set `paid_at = now()`
   - Compute `leaf_hash = SHA256(draw_id || serial || user_id)`
   - Eligible for merkle tree inclusion when draw closes
3. **reserved** → **expired**: Order canceled (reservation timeout or failed COD). Actions:
   - Set `expired_at = now()`
   - Ticket excluded from merkle tree
4. **paid** → **entered**: Draw closed and ticket included in merkle tree (status update for clarity, optional)

**Partitioning** (PostgreSQL):
- Partition `tickets` by `draw_id` (LIST partitioning, same as orders) for co-located queries

---

### CODTask

Represents a cash-on-delivery collection task assigned to a field agent.

**Attributes**:
- `id` (UUID, PK): Task identifier
- `order_id` (UUID, FK → Order, unique, indexed): Associated order (one task per order)
- `agent_id` (UUID, FK → Agent User, nullable): Assigned field agent
- `status` (enum: pending, assigned, visited, collected, failed_no_show, failed_address_invalid, canceled): Task workflow state
- `visit_at` (timestamp, nullable): Scheduled visit time
- `visited_at` (timestamp, nullable): When agent visited user
- `collected_at` (timestamp, nullable): When cash was collected
- `fail_reason` (text, nullable): Reason for failure (if status=failed_*)
- `notes` (text, nullable): Agent notes
- `created_at` (timestamp): Task creation time

**Relationships**:
- One-to-one: Order (each order has exactly one COD task)
- Many-to-one: Agent User

**Validation Rules** (from spec FR-024, FR-026):
- `status` transitions match order status transitions
- If `status = collected`, `collected_at` must be set
- If `status = failed_*`, `fail_reason` must be non-empty (10-500 chars)

**Indexes**:
- Unique index on `order_id` (one task per order)
- Index on `agent_id, status` (agent's task queue)
- Index on `status, visit_at` (daily route list for agents)

**State Transitions** (from spec FR-024, FR-026):
1. **pending** → **assigned**: Admin assigns agent. Set `agent_id`, `visit_at`, `status=assigned`.
2. **assigned** → **visited**: Agent marks visit (before collection outcome known). Set `visited_at`.
3. **visited** → **collected**: Cash collected. Set `collected_at`, update order status to `collected`.
4. **visited** → **failed_no_show**: User not home. Set `fail_reason`, update order status to `failed`.
5. **visited** → **failed_address_invalid**: Address incorrect. Set `fail_reason`, update order status to `failed`.
6. **pending/assigned** → **canceled**: Order canceled (expiry or admin action). Sync with order status.

---

### FairnessEvent

Represents a milestone in the fairness protocol (merkle published, beacon fetched, winner computed).

**Attributes**:
- `id` (UUID, PK): Event identifier
- `draw_id` (UUID, FK → Draw, indexed): Associated draw
- `event_type` (enum: MERKLE_PUBLISHED, BEACON_FETCHED, WINNER_COMPUTED): Event classification
- `payload` (JSONB, required): Event-specific data (see payload schemas below)
- `payload_hash` (string, required): SHA256 hash of payload (for tamper detection, FR-042)
- `created_at` (timestamp): Event creation time

**Relationships**:
- Many-to-one: Draw

**Payload Schemas** (from spec FR-034-FR-043):

1. **MERKLE_PUBLISHED**:
   ```json
   {
     "merkle_root": "a1b2c3...", (hex, 64 chars)
     "total_paid_tickets": 1234,
     "leaf_hashes": ["hash1", "hash2", ...], (optional, for verification)
     "merkle_tree_depth": 11 (ceil(log2(total_paid_tickets)))
   }
   ```

2. **BEACON_FETCHED**:
   ```json
   {
     "beacon_source": "bitcoin", (or "drand")
     "beacon_value": "00000000000000000003abc...", (hex)
     "beacon_url": "https://blockchain.info/block-height/850000", (explorer link)
     "fetched_at": "2025-11-05T14:15:00Z"
   }
   ```

3. **WINNER_COMPUTED**:
   ```json
   {
     "hash_input": "beacon_value || merkle_root", (concatenated hex)
     "hash_output": "abcdef123456...", (SHA256 hex, 64 chars)
     "winner_index": 789, (bigint(hash_output) % total_paid_tickets)
     "winner_ticket_id": "uuid", (ticket.id)
     "winner_ticket_serial": 790, (ticket.serial)
     "winner_user_id": "uuid" (user.id)
   }
   ```

**Validation Rules** (from spec FR-042):
- `payload_hash = SHA256(JSON.stringify(payload))` (computed on insert, immutable)
- Events are append-only (no UPDATE/DELETE, enforced by DB trigger or RBAC)

**Indexes**:
- Index on `draw_id, event_type, created_at` (chronological event query per draw)
- Index on `created_at` (audit queries: recent fairness events)

**Partitioning** (PostgreSQL):
- Partition `fairness_events` by `draw_id` (LIST partitioning, co-located with tickets/orders)

---

### Refund

Represents a payment reversal or cancellation credit (COD context: no actual cash collected, but order canceled).

**Attributes**:
- `id` (UUID, PK): Refund identifier
- `order_id` (UUID, FK → Order, indexed): Refunded order
- `amount` (decimal, required): Refund amount (typically = order.total_amount)
- `status` (enum: pending, completed, failed): Refund processing state
- `reason` (text, required): Reason for refund (e.g., "COD expired", "Draw rollover", "Admin cancellation")
- `created_by` (UUID, FK → Admin User, nullable): Admin who issued refund (null if automatic)
- `created_at` (timestamp): Refund creation time
- `completed_at` (timestamp, nullable): When refund was processed

**Relationships**:
- Many-to-one: Order, Admin User (creator)

**Validation Rules** (from spec FR-063, FR-081):
- `amount <= order.total_amount` (partial refunds allowed)
- `reason`: 10-500 characters, required
- State transitions: `pending → completed` (set `completed_at`)

**Indexes**:
- Index on `order_id` (refunds per order)
- Index on `created_at` (refund reports)

**Notes**:
- In COD context, no actual funds are reversed (cash was never collected)
- Refund entity tracks order cancellation reason for audit + analytics
- If future payment methods added (card), this entity supports actual refund processing

---

### AuditLog

Represents an immutable record of all admin actions (critical for compliance and fraud detection).

**Attributes**:
- `id` (UUID, PK): Log entry identifier
- `actor_id` (UUID, FK → Admin User, indexed): Admin who performed action
- `actor_role` (string, required): Role at time of action (Super Admin, Ops Manager, Support Agent, Auditor)
- `action_type` (string, indexed, required): Action classification (e.g., "user_banned", "draw_closed", "order_refunded", "cod_status_override")
- `entity_type` (enum: user, draw, order, ticket, refund, ban, settings): Affected entity type
- `entity_id` (UUID, nullable): ID of affected entity
- `diff_summary` (text, nullable): Human-readable summary of changes (e.g., "Changed order status from pending to collected")
- `payload_hash` (string, required): SHA256 hash of full action payload (for tamper detection, FR-074)
- `ip_address` (string, indexed, required): IP address of actor
- `user_agent` (text, nullable): Browser user agent
- `created_at` (timestamp): Action timestamp

**Relationships**:
- Many-to-one: Admin User (actor)
- Polymorphic: Entity (user, draw, order, etc., via entity_type + entity_id)

**Validation Rules** (from spec FR-069, FR-070, FR-074):
- All fields required except `entity_id`, `diff_summary`, `user_agent`
- `payload_hash = SHA256(JSON.stringify({ actor_id, action_type, entity_type, entity_id, diff_summary, timestamp }))` (computed on insert)
- **Immutable**: No UPDATE/DELETE allowed (enforced by DB trigger or RBAC)
- Append-only table

**Indexes**:
- Index on `created_at DESC` (recent actions, audit timeline)
- Index on `actor_id, created_at DESC` (actions by specific admin)
- Index on `action_type, created_at DESC` (filter by action type, e.g., all bans)
- Index on `entity_type, entity_id` (audit trail for specific entity, e.g., all actions on user X)

**Partitioning** (PostgreSQL):
- Partition `audit_logs` by `created_at` (monthly partitions) for efficient archival

**Example Entries**:
```json
{
  "actor_id": "admin-uuid",
  "actor_role": "Super Admin",
  "action_type": "user_banned",
  "entity_type": "user",
  "entity_id": "user-uuid",
  "diff_summary": "Applied soft ban until 2025-11-12. Reason: Repeated failed COD pickups.",
  "payload_hash": "abc123...",
  "ip_address": "192.168.1.1",
  "created_at": "2025-11-05T10:30:00Z"
}
```

---

## Enums

### UserStatus
- `active`: Normal user, can purchase tickets
- `soft_banned`: Cannot purchase tickets, can view tickets/results
- `hard_banned`: Cannot log in

### BanType
- `soft`: Block purchase only (FR-049)
- `hard`: Block login (FR-049)

### DrawStatus
- `started`: Ticket sales open
- `closed`: Sales locked, merkle tree being built
- `settled`: Winner announced, fairness artifacts published

### BeaconSource
- `bitcoin`: Bitcoin block hash
- `drand`: Drand randomness beacon

### OrderStatus
- `pending`: Awaiting COD agent assignment
- `assigned`: COD agent assigned, awaiting visit
- `collected`: Cash collected, tickets paid
- `failed`: COD attempt failed (user not home, invalid address)
- `canceled`: Order canceled (expiry, rollover, admin action)

### TicketStatus
- `reserved`: Ticket created, COD payment pending
- `paid`: COD collected, ticket eligible for merkle tree
- `expired`: Reservation expired, ticket excluded from draw
- `entered`: Draw closed, ticket included in merkle tree (optional state)

### CODTaskStatus
- `pending`: Task created, no agent assigned
- `assigned`: Agent assigned, visit scheduled
- `visited`: Agent visited, outcome pending
- `collected`: Cash collected
- `failed_no_show`: User not home
- `failed_address_invalid`: Address incorrect
- `canceled`: Task canceled (order canceled)

### FairnessEventType
- `MERKLE_PUBLISHED`: Merkle tree root computed and stored
- `BEACON_FETCHED`: Randomness beacon retrieved
- `WINNER_COMPUTED`: Winner ticket selected

### RefundStatus
- `pending`: Refund initiated
- `completed`: Refund processed (in COD context, notification sent)
- `failed`: Refund processing failed (unlikely in COD context)

### AuditEntityType
- `user`: User entity
- `draw`: Draw entity
- `order`: Order entity
- `ticket`: Ticket entity
- `refund`: Refund entity
- `ban`: Ban entity
- `settings`: Platform settings/config

### Language
- `en`: English
- `bn`: Bengali

### AdminRole
- `super_admin`: Full control (FR-087)
- `ops_manager`: Manage draws, tickets, COD, disputes (FR-087)
- `support_agent`: View users, issue refunds, apply bans (FR-087)
- `auditor`: Read-only access to logs and reports (FR-087)

---

## Relationships Summary

```text
User 1---* AuthSession
User 1---* Order
User 1---* Ticket
User 1---* Ban
User 1---* Address

Draw 1---* Order
Draw 1---* Ticket
Draw 1---* FairnessEvent
Draw 1---1 Ticket (winner)

Order 1---1 CODTask
Order 1---* Ticket
Order 1---* Refund
Order *---1 Address

Ticket *---1 Draw
Ticket *---1 Order
Ticket *---1 User

CODTask 1---1 Order

Ban *---1 User
Ban *---1 AdminUser (creator)
Ban *---1 AdminUser (lifter, nullable)

FairnessEvent *---1 Draw

Refund *---1 Order
Refund *---1 AdminUser (creator, nullable)

AuditLog *---1 AdminUser (actor)
AuditLog *--polymorphic--> Entity (user, draw, order, etc.)
```

---

## Partitioning Strategy (PostgreSQL-specific)

To support 100k DAU and efficient archival, the following tables are partitioned:

1. **tickets** (LIST partitioning by `draw_id`):
   - Partition per draw (or per N draws if draws are frequent)
   - Rationale: Queries always filter by draw_id (user tickets, merkle build)
   - Archival: Drop old partitions after draw archived to S3

2. **orders** (LIST partitioning by `draw_id`):
   - Co-located with tickets (same partition key)
   - Rationale: Admin order queries filter by draw; COD reconciliation per draw

3. **fairness_events** (LIST partitioning by `draw_id`):
   - Co-located with tickets/orders (same partition key)
   - Rationale: Fairness events queried per draw; archived with draw

4. **audit_logs** (RANGE partitioning by `created_at`):
   - Monthly partitions (e.g., `audit_logs_2025_11`, `audit_logs_2025_12`)
   - Rationale: Audit queries filter by date range; old logs archived to cold storage
   - Retention: Keep 12 months in DB, move older to S3

5. **draws** (RANGE partitioning by `created_at`):
   - Monthly partitions
   - Rationale: Admin draw list queries filter by date; archived draws moved to cold storage

---

## Indexing Strategy

All indexes are documented per entity above. Key principles:
- **Unique indexes** for natural keys (phone, email, serial per draw)
- **Composite indexes** for common query filters (user_id + created_at, draw_id + status)
- **Partial indexes** for sparse conditions (e.g., active bans: `WHERE lifted_at IS NULL`)
- **GIN indexes** for JSONB columns (fairness_event payloads, if querying JSON fields)

---

## State Machine Summary

### Draw Lifecycle
```
started → closed → settled
        ↓
   (auto at end_at OR admin manual close)
        ↓
   (merkle build job)
        ↓
   (beacon fetch job + winner compute job)
```

### Order + Ticket Lifecycle (COD-driven)
```
Order: pending → assigned → collected (tickets: reserved → paid)
               ↘ failed → canceled (tickets: reserved → expired)
               ↘ (expires_at timeout) → canceled (tickets: expired)

Ticket: reserved → paid → entered (when draw closes and merkle built)
               ↘ expired (when order canceled)
```

### CODTask Lifecycle
```
pending → assigned → visited → collected
                            ↘ failed_no_show
                            ↘ failed_address_invalid
        ↘ canceled (if order canceled before visit)
```

### Ban Lifecycle
```
Created (active: lifted_at = null) → Lifted (lifted_at = now(), lifted_by = admin)
                                   ↘ Expired (expires_at < now(), auto-lifted)
```

---

## Data Integrity Constraints

1. **Foreign Key Constraints**: All FK relationships enforced at DB level (ON DELETE RESTRICT for critical entities: user, draw; ON DELETE SET NULL for nullable FKs: agent_id)

2. **Unique Constraints**:
   - `(draw_id, serial)` for tickets (ticket serial uniqueness per draw)
   - `phone`, `email` for users (where not null)
   - `order_id` for COD tasks (one task per order)

3. **Check Constraints**:
   - `draw.ticket_price > 0`
   - `draw.max_tickets > 0`
   - `draw.start_at < draw.end_at`
   - `order.quantity >= 1 AND order.quantity <= 10`
   - `ban.reason` length 10-500 chars

4. **Immutability** (via DB triggers or RBAC):
   - `audit_logs`: No UPDATE/DELETE
   - `fairness_events`: No UPDATE/DELETE (append-only)

5. **Cascading Actions**:
   - User soft delete: Do NOT delete orders/tickets (preserve history for audit)
   - Draw delete: RESTRICT (do not allow if tickets sold)
   - Order delete: CASCADE to tickets (if order canceled, tickets also canceled)

---

## Next Steps

1. Generate OpenAPI contract (contracts/api.yaml) based on functional requirements (FR-001-FR-090)
2. Generate quickstart.md (dev environment setup, migrations, seeding)
3. Update agent context with data model summary
4. Proceed to Phase 2: Generate tasks.md (implementation breakdown)
