# Feature Specification: Provably-Fair Lottery Platform

**Feature Branch**: `001-provably-fair-lottery`
**Created**: 2025-11-05
**Status**: Draft
**Input**: User description: "PRD — Provably-Fair Lottery (No Livestream, COD Payments) - A lightweight lottery platform where users can buy tickets in 2–3 taps and verify every draw without livestreams. Fairness uses a public randomness source and a published ticket root so the result is reproducible by anyone. Payments are Cash on Delivery (COD) for now. System targets 100k users/day."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Ticket Purchase with COD (Priority: P1)

A user wants to participate in a lottery draw by purchasing tickets with minimal friction. They browse available draws, select one, choose how many tickets to buy, confirm their delivery address for cash payment, and complete their order—all in 2-3 taps.

**Why this priority**: This is the core revenue-generating flow and primary user value proposition. Without this, there is no platform. The "2-3 tap" constraint is critical for user acquisition and conversion in competitive markets.

**Independent Test**: A guest user can register via OTP, view an open draw, purchase 1-5 tickets using COD, receive ticket IDs, and see their reserved tickets with "pending COD" status. Value delivered: user has entered the lottery and knows their ticket numbers.

**Acceptance Scenarios**:

1. **Given** a user visits the platform for the first time, **When** they see an open draw and tap "Buy Ticket", **Then** they are prompted to authenticate via OTP (phone or email)
2. **Given** an authenticated user on an open draw page, **When** they tap "Buy Ticket" and confirm quantity (default: 1), **Then** they see a confirmation screen showing pre-filled address and phone for COD
3. **Given** a user on the COD confirmation screen with valid address, **When** they tap "Place Order", **Then** their tickets are reserved, a COD task is created, and they receive ticket IDs immediately
4. **Given** a user with no saved address, **When** they attempt to place an order, **Then** they are prompted to add an address before completing purchase (3rd tap)
5. **Given** a user who completed an order, **When** they view their tickets, **Then** they see ticket IDs with status "pending COD" and a countdown showing reservation expiry (default: 6 hours)

---

### User Story 2 - Public Result Verification (Priority: P2)

After a draw closes and a winner is announced, any user (participant or not) wants to independently verify that the result was fair and not manipulated. They visit a public verification page that shows the randomness source (beacon), ticket merkle root, and winner calculation formula, and can recalculate the winner in their browser.

**Why this priority**: Provable fairness is the key differentiator of this platform. Without transparent verification, user trust collapses and the product becomes indistinguishable from traditional lotteries. This must be delivered in v1 to validate the core premise.

**Independent Test**: After a draw is settled, anyone can visit the verify page, see the beacon value and merkle root, click "Recalculate Winner", and see the same winning ticket serial that was announced. Value delivered: transparent, reproducible fairness.

**Acceptance Scenarios**:

1. **Given** a draw has been settled with a published result, **When** any user visits the verify page for that draw, **Then** they see the draw ID, merkle root, beacon source link, beacon value, total tickets sold, and the announced winner
2. **Given** a user on the verification page, **When** they click "Recalculate Winner" (or it runs automatically on page load), **Then** the browser computes `hash = SHA256(beacon || merkle_root)` and `winner_index = bigint(hash) % total_tickets` and displays the winning ticket serial
3. **Given** the recalculation result matches the announced winner, **When** the user views the page, **Then** they see a visual confirmation (e.g., "Verification Successful") indicating the draw was fair
4. **Given** a user with a ticket in the draw, **When** they paste their ticket's merkle proof on the verify page, **Then** the system verifies their ticket was included in the merkle tree under the published root
5. **Given** the beacon source is a Bitcoin block, **When** the user clicks the beacon link, **Then** they are taken to a public block explorer showing the block hash at the pre-announced height

---

### User Story 3 - Admin Draw Lifecycle Management (Priority: P3)

An admin wants to create, manage, and settle lottery draws. They define draw parameters (ticket price, max tickets, start/end times, low-sales threshold, beacon source), monitor sales, manually or automatically close the draw, build and publish the merkle root, fetch the beacon value, compute the winner, and publish the result.

**Why this priority**: Without draw management, there are no draws for users to participate in. However, this is a back-office function and can be implemented after the user-facing flows are proven. Admins can tolerate less polish than end users.

**Independent Test**: An admin can create a new draw with title "Test Draw 1", price $10, max 1000 tickets, set start/end times, save it, close it (locking tickets), build/publish merkle root, fetch beacon, compute winner, and publish result. Value delivered: a complete draw lifecycle from creation to settlement.

**Acceptance Scenarios**:

1. **Given** an admin is logged into the admin panel, **When** they click "Create Draw", **Then** they see a form to enter title, start time, end time, ticket price, max tickets, low-sales threshold (%), beacon source (Bitcoin block/drand), beacon rule (pre-announced height or fallback), and terms link
2. **Given** an admin has filled out the draw form, **When** they save the draw, **Then** it is created with status "started" and appears on the user home page with a countdown to end time
3. **Given** a draw has reached its end time, **When** the auto-close job runs (or admin manually triggers close), **Then** ticket sales are locked, no new orders are accepted, and the draw status changes to "closed"
4. **Given** a draw is closed, **When** the merkle builder job runs, **Then** all paid ticket leaf hashes are collected, a merkle tree is built, the root is computed and published to the draw record
5. **Given** a draw has a published merkle root, **When** the beacon fetcher job runs, **Then** it retrieves the beacon value from the configured source (Bitcoin block at pre-announced height or drand), stores it in fairness events, computes the winner using the formula, and publishes the result
6. **Given** a draw is settled, **When** the admin views the draw details, **Then** they see the winner ticket serial, user ID, merkle root, beacon value, and a link to the public verification page
7. **Given** a draw had low sales (<30% of threshold), **When** the close logic evaluates the threshold, **Then** the draw is marked for rollover (funds roll to next draw) or auto-refund (orders canceled and COD tasks terminated), as configured

---

### User Story 4 - COD Payment Collection & Order Management (Priority: P3)

A COD agent (delivery person) is assigned orders to collect cash from users who reserved tickets. They visit users, collect payment, and mark orders as "collected". Users receive notifications when COD agents are assigned, when they visit, and when payment is received. Failed COD pickups (user not available) result in order cancellation and ticket expiry.

**Why this priority**: COD is the payment method for v1, so collection flow is mandatory. However, it can be implemented after core ticket purchase and verification flows are validated. It's operational infrastructure, not user-facing differentiation.

**Independent Test**: An admin assigns a batch of pending COD orders to an agent, exports a route list, agent marks orders as "collected" or "failed", system updates ticket status to "paid" for collected orders and "expired" for failed orders. Value delivered: cash collection and ticket validation.

**Acceptance Scenarios**:

1. **Given** an order is placed with status "pending", **When** an admin or auto-assignment logic assigns it to a COD agent, **Then** the order status changes to "assigned" and the user receives a notification (SMS/email) with agent contact and estimated visit time
2. **Given** a COD agent has assigned orders, **When** they visit a user and collect cash, **Then** they mark the order as "collected" in the system (via bulk import, scan, or manual entry)
3. **Given** an order is marked "collected", **When** the system processes the update, **Then** associated tickets change status from "reserved" to "paid", the user receives a confirmation notification, and tickets are eligible for inclusion in the draw
4. **Given** a COD agent visits a user but cannot collect (user not home), **When** the agent marks the order as "failed-no-show", **Then** the order status changes to "failed" and a retry window is opened (if draw still open)
5. **Given** a COD order remains uncollected past the reservation window (6 hours default), **When** the expiry job runs, **Then** the order is auto-canceled, tickets change to "expired", and if the draw is still open, those ticket slots are restocked for others to purchase
6. **Given** a draw has closed with uncollected COD orders, **When** the reconciliation job runs, **Then** those orders are marked "canceled", users receive refund notifications (no charge since COD), and those tickets are excluded from the merkle tree
7. **Given** an admin wants to review COD operations, **When** they open the COD management page, **Then** they see a list of assigned/visited/collected/failed tasks, can export route lists as CSV, and import status updates from field agents

---

### User Story 5 - User Banning & Anti-Abuse Controls (Priority: P4)

An admin or support agent suspects fraudulent behavior (spam orders, repeated failed COD pickups, duplicate accounts). They review the user's history (orders, tickets, device fingerprints, IP addresses, disputes), flag them for abuse, and apply a ban (soft = block purchase only, hard = block login). The ban includes a reason and optional expiry date, all logged in audit trails.

**Why this priority**: Essential for operational integrity and preventing loss from COD fraud, but not required for initial product validation. Can be added after v1 launch when abuse patterns are observed.

**Independent Test**: An admin views a user profile showing 5 failed COD orders in 2 days, applies a soft ban with reason "repeated failed pickups", sets expiry to 7 days, and the user is immediately blocked from purchasing tickets but can still log in to view past tickets. Value delivered: abuse mitigation.

**Acceptance Scenarios**:

1. **Given** an admin suspects abuse, **When** they search for a user by phone/email/ID, **Then** they see the user profile with full history: all orders, tickets, associated devices (fingerprints), IP addresses, disputes, and existing flags
2. **Given** an admin is viewing a user profile, **When** they click "Ban User", **Then** they are prompted to select ban type (soft = block purchase, hard = block login), enter a reason (required), set duration (permanent or temporary with expiry date), and confirm
3. **Given** a user has a soft ban applied, **When** they attempt to place an order, **Then** they see an error message indicating they are temporarily restricted from purchasing and should contact support, but they can still log in and view their ticket history
4. **Given** a user has a hard ban applied, **When** they attempt to log in, **Then** authentication succeeds but they are immediately redirected to a "suspended account" page with ban reason and support contact
5. **Given** an admin bans a user, **When** the ban is saved, **Then** an immutable audit log entry is created with timestamp, admin ID, user ID, ban type, reason, duration, and all details are visible to auditors
6. **Given** an admin flags a user without banning, **When** they add flags (spam, duplicate, chargeback, suspicious), **Then** the flags appear on the user profile and trigger additional checks (e.g., duplicate detection, manual COD review, purchase caps)
7. **Given** a user has repeated failed COD pickups (3+ in 1 week), **When** the fraud detection job runs, **Then** the system auto-flags the user as "COD risk" and limits their daily purchase quantity to 1 ticket until behavior improves

---

### User Story 6 - Audit Log & Fairness Reporting (Priority: P4)

An auditor (or admin with read-only role) wants to review system fairness and admin actions. They access audit logs showing every admin operation (draw creation, ticket cancellation, user ban, COD override) with timestamp, actor, entity, and payload hash. They also view fairness reports showing merkle roots, beacon fetches, winner calculations, and published verification artifacts for all draws.

**Why this priority**: Critical for regulatory compliance and trust, but not user-facing. Can be built after core flows are operational. Auditors can work with raw logs initially if needed.

**Independent Test**: An auditor logs in, views audit logs filtered by date range and action type (e.g., "user_banned"), sees 3 entries with admin IDs, user IDs, reasons, and timestamps. They also view the fairness report for Draw 001, see merkle root published at 2025-11-05 14:00, beacon fetched at 14:15, winner computed at 14:16. Value delivered: full transparency.

**Acceptance Scenarios**:

1. **Given** an auditor is logged into the admin panel with read-only access, **When** they navigate to Audit Logs, **Then** they see a paginated, filterable list of all admin actions: timestamp, actor (admin ID + role), action type, entity (user/draw/order), entity ID, diff summary, IP address
2. **Given** an auditor is viewing audit logs, **When** they filter by action type "ban_applied", **Then** they see all user bans with reasons, durations, and which admin applied them
3. **Given** an admin performs any operation (create draw, cancel order, ban user, override COD status, modify settings), **When** the operation completes, **Then** an immutable audit log entry is created with a payload hash (hash of all changed fields) to prevent tampering
4. **Given** an auditor wants to verify fairness, **When** they navigate to Fairness Reports, **Then** they see a table of all draws with columns: draw ID, status, merkle root, merkle published timestamp, beacon source, beacon value, beacon fetch timestamp, winner ticket serial, winner calculation timestamp
5. **Given** an auditor clicks on a draw in the fairness report, **When** the detail page loads, **Then** they see the full merkle tree structure (or root + sample branches), beacon explorer link, winner calculation formula with inputs/outputs, and a link to the public verification page
6. **Given** an admin action fails validation or is suspected of tampering, **When** an auditor computes the payload hash from the audit log entry, **Then** it matches the hash stored in the log, confirming integrity
7. **Given** a draw has been settled, **When** the post-settlement job runs, **Then** a JSON audit bundle (merkle root, beacon, winner, all fairness events) is exported and archived to immutable storage for long-term compliance

---

### Edge Cases

**Draw Management**:
- What happens when a draw ends with zero tickets sold? (Rollover policy applies if <30%, or draw is canceled)
- What happens when the beacon source (Bitcoin network) is temporarily unavailable at settlement time? (Fallback to next block or switch to drand per configured rule)
- What happens when a draw is manually closed before the scheduled end time? (Same merkle + settlement process, but early closure logged in audit)

**Ticket & Order Edge Cases**:
- What happens when a user purchases tickets seconds before draw closes, but COD collection takes 5 hours (still within 6-hour window)? (If draw closed, ticket is excluded from merkle unless COD collected before close; user gets refund notification)
- What happens when the same user creates multiple accounts (duplicate detection)? (Anti-abuse flags trigger based on phone, device fingerprint, IP; soft ban applied on suspected duplicates)
- What happens when a user's reservation expires (6 hours) but they later complete COD payment? (Order already canceled, payment rejected, user must re-purchase if draw still open)

**COD & Payment Edge Cases**:
- What happens when a COD agent marks an order as "collected" but the user disputes payment? (Support agent reviews dispute, can reverse COD status, refund user if warranted, log in audit)
- What happens when a field agent loses connectivity and cannot update order status in real-time? (Bulk CSV import supported for end-of-day reconciliation; late updates flagged for review)
- What happens when a user moves or provides invalid address? (COD agent marks "failed-address-invalid", order canceled, user notified to update address for future purchases)

**Fairness & Verification Edge Cases**:
- What happens when the merkle root is published but beacon fetch fails? (Draw remains in "closed" status, retries every 5 minutes until beacon available, no winner announced until beacon retrieved)
- What happens when someone claims the public verification page shows a different winner than announced? (Auditor reviews fairness events, checks payload hashes, if tampering detected, incident response triggered and results voided; if user error, education provided)
- What happens when a user requests their merkle proof but the draw data is archived? (Proofs are stored alongside merkle roots in fairness events; if archived, retrieved from immutable storage within 24 hours)

**Auth & Account Edge Cases**:
- What happens when a user requests OTP but never receives it (SMS delivery failure)? (User can resend OTP after 60s cooldown, switch to email OTP, or contact support; OTP delivery failures logged and tracked in admin dashboard)
- What happens when a user is banned but still has pending COD orders? (COD orders remain valid and collectible; if collected, tickets included in draw; if user disputes ban, support can review and lift)
- What happens when an admin account is compromised and performs unauthorized actions? (All admin actions logged with IP + timestamp; audit trail allows forensics; compromised admin disabled, affected operations reviewed and potentially reversed)

**Reporting & Analytics Edge Cases**:
- What happens when the daily reconciliation report shows mismatched COD collection totals? (Alert triggered for finance team, flagged orders reviewed individually, discrepancies investigated within 24 hours)
- What happens when verification page hits spike during a popular draw settlement? (Page served from CDN, static assets cached, recalculation runs client-side, no backend load; target 10k concurrent users per draw verification)

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & User Management**:
- **FR-001**: System MUST allow users to sign up and sign in using OTP sent via SMS or email (passwordless authentication)
- **FR-002**: System MUST generate and send OTP within 10 seconds of request
- **FR-003**: System MUST expire OTP after 10 minutes and limit OTP requests to 3 per phone/email per hour (rate limiting)
- **FR-004**: System MUST support device fingerprinting to track user sessions across multiple logins
- **FR-005**: System MUST allow users to update their profile (name, phone, email, address, language preference: EN or BN)
- **FR-006**: System MUST store user addresses for COD delivery with validation (non-empty street, city, postal code)
- **FR-007**: System MUST support user language preference (English and Bengali) and render UI accordingly

**Draw Management**:
- **FR-008**: System MUST allow admins to create draws with required fields: title, start time, end time, ticket price, max tickets, low-sales threshold (%), beacon source (Bitcoin or drand), beacon rule (pre-announced height or fallback to next), terms link
- **FR-009**: System MUST support cloning existing draws to create new ones with pre-filled parameters
- **FR-010**: System MUST automatically change draw status from "started" to "closed" when end time is reached
- **FR-011**: System MUST allow admins to manually close a draw before scheduled end time (with audit log entry)
- **FR-012**: System MUST lock ticket sales when a draw status changes to "closed" (no new orders accepted)
- **FR-013**: System MUST enforce low-sales threshold: if tickets sold <30% (or configured %), draw is marked for rollover or auto-refund
- **FR-014**: System MUST display draw details on user home page: title, ticket price, tickets remaining, countdown to end time, status (open/closed/settled)
- **FR-015**: System MUST display rollover/refund policy clearly on each draw card before purchase

**Ticket Purchase & Reservation**:
- **FR-016**: System MUST allow authenticated users to purchase 1-10 tickets per transaction (configurable limit)
- **FR-017**: System MUST reserve tickets immediately upon order placement with status "reserved"
- **FR-018**: System MUST generate unique ticket IDs (serials) sequentially per draw for each reserved ticket
- **FR-019**: System MUST create a COD task for each order with status "pending" and user address
- **FR-020**: System MUST set a reservation expiry window (default 6 hours) from order creation time
- **FR-021**: System MUST display ticket status to users: "pending COD" (reserved), "paid" (COD collected), "expired" (reservation lapsed), "entered" (included in draw)
- **FR-022**: System MUST allow users to view all their tickets grouped by draw with status and serial numbers
- **FR-023**: System MUST prevent ticket purchase when user has an active soft ban (with clear error message)

**COD Payment Flow**:
- **FR-024**: System MUST allow admins to assign pending COD orders to agents (manual or auto-assignment)
- **FR-025**: System MUST send notifications (SMS/email) to users when COD order is assigned with agent contact and estimated visit time
- **FR-026**: System MUST allow COD agents to mark orders as "collected", "failed-no-show", or "failed-address-invalid"
- **FR-027**: System MUST change ticket status from "reserved" to "paid" when COD order is marked "collected"
- **FR-028**: System MUST send confirmation notification (SMS/email) to users when COD payment is collected
- **FR-029**: System MUST auto-cancel orders and expire tickets when reservation window (6 hours) lapses without COD collection
- **FR-030**: System MUST restock ticket slots when orders are canceled (if draw still open)
- **FR-031**: System MUST support bulk COD status updates via CSV import for field agents with poor connectivity
- **FR-032**: System MUST export route lists (assigned orders by agent) as CSV for field operations
- **FR-033**: System MUST generate daily COD reconciliation report showing: assigned, collected, failed, canceled orders with totals

**Fairness Protocol (Merkle Tree + Beacon)**:
- **FR-034**: System MUST build a merkle tree from leaf hashes of all "paid" tickets when a draw is closed
- **FR-035**: System MUST compute each ticket's leaf hash as `SHA256(draw_id || ticket_serial || user_id)` (or similar deterministic function)
- **FR-036**: System MUST publish the merkle root to the draw record in fairness events with timestamp
- **FR-037**: System MUST fetch the beacon value from the configured source (Bitcoin block hash at pre-announced height, or drand randomness)
- **FR-038**: System MUST retry beacon fetch every 5 minutes if source is temporarily unavailable (up to 24 hours)
- **FR-039**: System MUST fall back to next Bitcoin block or switch to drand per configured beacon rule if primary source fails
- **FR-040**: System MUST compute winner as `hash = SHA256(beacon || merkle_root)` then `winner_index = bigint(hash) % total_paid_tickets`
- **FR-041**: System MUST publish winner ticket serial and user ID to draw record with timestamp
- **FR-042**: System MUST log all fairness events (MERKLE_PUBLISHED, BEACON_FETCHED, WINNER_COMPUTED) with payload hashes for audit
- **FR-043**: System MUST archive fairness artifacts (merkle root, beacon, winner, full event log) as JSON to immutable storage after settlement

**Public Verification**:
- **FR-044**: System MUST provide a public verification page for each draw (accessible without login) showing: draw ID, merkle root, beacon source + value with explorer link, total paid tickets, announced winner
- **FR-045**: System MUST render client-side JavaScript on verification page to recompute winner using published inputs (beacon, merkle root, total tickets)
- **FR-046**: System MUST display visual confirmation ("Verification Successful") when recalculated winner matches announced winner
- **FR-047**: System MUST allow users to paste their ticket's merkle proof on verification page and verify membership under published root (optional)
- **FR-048**: System MUST link beacon values to public explorers (e.g., blockchain.info for Bitcoin, drand.love for drand) for independent verification

**Banning & Anti-Abuse**:
- **FR-049**: System MUST allow admins to apply soft bans (block purchase only) or hard bans (block login) to users with required reason field
- **FR-050**: System MUST allow admins to set ban duration: permanent or temporary with expiry date/time
- **FR-051**: System MUST immediately prevent soft-banned users from placing orders (with error message directing to support)
- **FR-052**: System MUST redirect hard-banned users to suspension page on login with ban reason and support contact
- **FR-053**: System MUST allow admins to add flags to users: spam, duplicate, chargeback, suspicious (without banning)
- **FR-054**: System MUST auto-flag users as "COD risk" after 3+ failed COD pickups within 7 days
- **FR-055**: System MUST limit daily ticket purchases to 1 per COD-risk-flagged user until flag removed
- **FR-056**: System MUST enforce duplicate detection checks based on phone, email, device fingerprint, and IP address
- **FR-057**: System MUST throttle OTP requests per phone/IP/device (3 requests per hour max)
- **FR-058**: System MUST apply daily purchase caps per user: max 50 tickets per draw, max 100 tickets per day across all draws (configurable)

**Admin Operations**:
- **FR-059**: System MUST provide admin dashboard showing: daily sales, DAU, active draws, COD queue length, fraud flags count, recent audit logs
- **FR-060**: System MUST allow admins to search and filter orders by user, draw, status, date range
- **FR-061**: System MUST allow admins to search and filter users by phone, email, name, ban status, flags
- **FR-062**: System MUST allow admins to view full user history: all orders, tickets, devices, IPs, disputes, bans, flags
- **FR-063**: System MUST allow admins to manually refund/cancel orders with required reason field (logged in audit)
- **FR-064**: System MUST allow admins to override COD status (e.g., mark collected manually) with reason (logged in audit)
- **FR-065**: System MUST display COD management page with task list: assigned agent, status, visit/collection timestamps, fail reasons
- **FR-066**: System MUST allow admins to manage content: banners, FAQs, terms, refund policy (WYSIWYG editor or markdown)
- **FR-067**: System MUST allow admins to manage notification templates: SMS and email templates for OTP, order confirmation, COD assignment, payment received, result announcement
- **FR-068**: System MUST allow admins to generate reports: sales by draw, payment collection rates, draw sell-through %, win distribution, abuse metrics (OTP failures, ban counts)

**Audit & Compliance**:
- **FR-069**: System MUST log every admin action in immutable audit logs with fields: timestamp, actor ID, actor role, action type, entity (user/draw/order), entity ID, diff summary, payload hash, IP address
- **FR-070**: System MUST prevent deletion or modification of audit log entries (append-only)
- **FR-071**: System MUST provide audit log search and filter interface for auditors (read-only role): filter by date range, action type, actor, entity
- **FR-072**: System MUST display fairness reports showing all draws with: status, merkle root, merkle publish timestamp, beacon source/value, beacon fetch timestamp, winner serial/user, calculation timestamp
- **FR-073**: System MUST allow auditors to download fairness artifacts as JSON for external validation
- **FR-074**: System MUST compute and store payload hash for all audit log entries to detect tampering

**Notifications**:
- **FR-075**: System MUST send OTP via SMS or email within 10 seconds of request
- **FR-076**: System MUST send order confirmation notification (SMS/email) immediately after order placement with ticket IDs
- **FR-077**: System MUST send COD assignment notification (SMS/email) when order is assigned to agent with agent contact
- **FR-078**: System MUST send COD collection confirmation notification (SMS/email) when payment is collected
- **FR-079**: System MUST send draw result notification (SMS/email) to all participants when winner is announced (with link to verification page)
- **FR-080**: System MUST send winner notification (SMS/email) to winning user with claim instructions
- **FR-081**: System MUST send refund/cancellation notification (SMS/email) when order is canceled due to expiry, low sales rollover, or admin action

**Compliance & Safety**:
- **FR-082**: System MUST display age gate confirmation (18+ checkbox) before allowing user registration or ticket purchase
- **FR-083**: System MUST display odds of winning (1 in X) clearly on each draw card before purchase
- **FR-084**: System MUST display terms and conditions link on draw card and require acknowledgment before order placement
- **FR-085**: System MUST display locality disclaimer indicating applicable laws and age restrictions
- **FR-086**: System MUST display refund/rollover policy on each draw card (if sold <30%, funds rollover or refund)

**Roles & Permissions**:
- **FR-087**: System MUST support role-based access control with roles: Super Admin (full control), Ops Manager (manage draws/tickets/COD), Support Agent (view users, refunds, bans), Auditor (read-only access to logs and reports)
- **FR-088**: System MUST restrict Auditor role to read-only operations (no create, update, delete)
- **FR-089**: System MUST restrict Support Agent role from creating/modifying draws but allow user management and refunds
- **FR-090**: System MUST log role and actor ID for every admin operation in audit logs

### Key Entities

- **User**: Represents a platform participant. Attributes: unique ID, phone, email, name, status (active/banned), language preference (EN/BN), creation timestamp. Relationships: has many Orders, Tickets, Bans, Auth Sessions.

- **Auth Session**: Represents a user authentication session. Attributes: unique ID, user reference, OTP sent timestamp, device fingerprint, IP address, expiry. Relationships: belongs to User.

- **Ban**: Represents a restriction on a user. Attributes: unique ID, user reference, ban type (soft: block purchase, hard: block login), reason (required), expiry date/time (or permanent), created by admin reference, creation timestamp. Relationships: belongs to User, created by Admin.

- **Draw**: Represents a lottery draw. Attributes: unique ID, title, status (started/closed/settled), start time, end time, ticket price, max tickets, low-sales threshold (%), beacon source (Bitcoin/drand), beacon rule (pre-announced height or fallback), merkle root, total tickets sold, created by admin reference, timestamps. Relationships: has many Tickets, Orders, Fairness Events.

- **Order**: Represents a ticket purchase transaction. Attributes: unique ID, user reference, draw reference, quantity, total amount, status (pending/assigned/collected/failed/canceled), delivery address reference, assigned COD agent reference, notes, creation timestamp. Relationships: belongs to User and Draw, has many Tickets, has one COD Task.

- **Ticket**: Represents an individual lottery ticket. Attributes: unique ID, draw reference, order reference, user reference, serial number (unique per draw), status (reserved/paid/expired/entered), leaf hash (for merkle tree), creation timestamp. Relationships: belongs to Draw, Order, User.

- **COD Task**: Represents a cash-on-delivery collection task. Attributes: unique ID, order reference, assigned agent reference, status (pending/assigned/visited/collected/failed-no-show/failed-address-invalid/canceled), visit timestamp, collection timestamp, fail reason, notes. Relationships: belongs to Order.

- **Fairness Event**: Represents a milestone in the fairness protocol. Attributes: unique ID, draw reference, event type (MERKLE_PUBLISHED, BEACON_FETCHED, WINNER_COMPUTED), payload (JSON with event-specific data), payload hash, creation timestamp. Relationships: belongs to Draw.

- **Refund**: Represents a payment reversal or cancellation credit. Attributes: unique ID, order reference, amount, status (pending/completed/failed), reason, creation timestamp. Relationships: belongs to Order.

- **Audit Log**: Represents an immutable record of admin actions. Attributes: unique ID, actor ID (admin), actor role, action type (e.g., user_banned, draw_closed, order_refunded), entity type (user/draw/order), entity ID, diff summary (what changed), payload hash, IP address, timestamp. Relationships: references Admin, and entity (polymorphic: User/Draw/Order).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete ticket purchase from landing on draw page to receiving ticket IDs in under 60 seconds (target: 90% of purchases complete in <60s, measured via analytics)
- **SC-002**: Ticket purchase flow requires exactly 2 taps for users with saved address, or 3 taps for users without address (measured by click tracking)
- **SC-003**: System supports 100,000 daily active users with p95 page load time under 2.5 seconds on 4G connections (measured via CDN and application performance monitoring)
- **SC-004**: System handles peak load of 2,000-5,000 read requests per second and 200-500 write requests per second during draw close/settlement windows without errors (measured via load testing and production metrics)
- **SC-005**: OTP delivery completes within 10 seconds for 95% of requests (measured via SMS/email webhook timestamps)
- **SC-006**: Public verification page deterministically reproduces announced winner 100% of the time (verified by independent auditor on sample of 100 draws)
- **SC-007**: COD collection rate exceeds 85% within 6 hours of order placement for orders assigned to agents (measured via COD reconciliation reports)
- **SC-008**: Reservation expiry and ticket restocking occurs within 5 minutes of expiry time (measured by job execution logs)
- **SC-009**: System achieves 99.9% uptime for user-facing flows (authentication, ticket purchase, results viewing) per month (measured via uptime monitoring)
- **SC-010**: Zero fairness disputes confirmed as platform error (i.e., all disputes resolved by showing public verification reproduces announced result, measured over first 100 draws)
- **SC-011**: Merkle root published within 5 minutes of draw close, beacon fetched and winner announced within 30 minutes of beacon availability (measured by fairness event timestamps)
- **SC-012**: All admin actions appear in audit logs with <1 second delay from action completion (measured by audit log write latency)
- **SC-013**: Soft bans prevent ticket purchase immediately (within 1 second of ban application, measured via integration tests)
- **SC-014**: Duplicate account detection flags at least 80% of multi-account abusers (measured by manual review of flagged accounts vs. known abusers)
- **SC-015**: COD fraud signals (3+ failed pickups) trigger auto-flag within 1 hour of 3rd failure (measured by job execution logs)
- **SC-016**: Notification delivery rate exceeds 95% for SMS and 98% for email (measured via provider webhooks)
- **SC-017**: Draw sell-through rate (tickets sold / max tickets) averages >60% across all draws in first month (measured via sales reports)
- **SC-018**: User task completion rate for first-time purchasers exceeds 70% (i.e., 70% of users who start ticket purchase complete it, measured via funnel analytics)
- **SC-019**: Public verification page supports 10,000 concurrent users during popular draw settlement with <3 second load time (measured via CDN and load testing)
- **SC-020**: Refund/cancellation notifications sent within 10 minutes of order cancellation (measured by notification queue latency)