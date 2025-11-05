# Lottery Platform API Documentation

## Base URL
```
http://localhost:3001/v1
```

## Authentication

### User Authentication (OTP)
All user endpoints require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Admin Authentication
Admin endpoints require admin JWT token with role information.

---

## Public Endpoints

### Health Check
```http
GET /health
```
Returns API health status.

---

## User Endpoints

### Authentication

#### Request OTP
```http
POST /auth/otp/request
Content-Type: application/json

{
  "identifier": "+8801700000000",  // or email
  "language": "EN"                  // optional: EN or BN
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent"
}
```

**Rate Limit:** 3 requests per hour per identifier

---

#### Verify OTP
```http
POST /auth/otp/verify
Content-Type: application/json

{
  "identifier": "+8801700000000",
  "otp_code": "123456",
  "name": "John Doe"  // optional, for new users
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "phone": "+8801700000000",
    "status": "ACTIVE"
  }
}
```

---

### User Profile

#### Get Profile
```http
GET /users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "phone": "+8801700000000",
  "email": null,
  "status": "ACTIVE",
  "language": "EN",
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

#### Update Profile
```http
PATCH /users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "language": "BN"
}
```

---

#### Get Addresses
```http
GET /users/me/addresses
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "label": "Home",
    "street": "123 Main St",
    "city": "Dhaka",
    "postal_code": "1200",
    "country": "Bangladesh",
    "phone": "+8801700000000",
    "is_default": true
  }
]
```

---

#### Add Address
```http
POST /users/me/addresses
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Office",
  "street": "456 Work Ave",
  "city": "Dhaka",
  "state": "Dhaka Division",
  "postal_code": "1212",
  "country": "Bangladesh",
  "phone": "+8801700000000",
  "is_default": false
}
```

---

### Draws

#### List Draws
```http
GET /draws?status=STARTED&page=1&limit=20
```

**Query Parameters:**
- `status`: STARTED, CLOSED, SETTLED (optional)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Weekly Draw #1",
      "status": "STARTED",
      "start_at": "2025-01-01T00:00:00Z",
      "end_at": "2025-01-07T23:59:59Z",
      "ticket_price": 100,
      "max_tickets": 10000,
      "tickets_sold": 5234,
      "tickets_remaining": 4766
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

**Rate Limit:** 100 requests per minute

---

#### Get Single Draw
```http
GET /draws/:id
```

---

### Orders

#### Create Order (Quick Buy)
```http
POST /orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "draw_id": "uuid",
  "quantity": 5,          // 1-10 tickets
  "address_id": "uuid"
}
```

**Response:**
```json
{
  "order": {
    "id": "uuid",
    "user_id": "uuid",
    "draw_id": "uuid",
    "quantity": 5,
    "total_amount": 500,
    "status": "PENDING",
    "expires_at": "2025-01-01T06:00:00Z",
    "created_at": "2025-01-01T00:00:00Z"
  },
  "tickets": [
    {
      "id": "uuid",
      "serial": 1234,
      "status": "RESERVED"
    }
  ]
}
```

**Rate Limit:** 10 orders per hour
**Validation:**
- User must not be banned
- Draw must be STARTED
- Sufficient tickets must be available
- Address must belong to user

---

#### List My Orders
```http
GET /orders?draw_id=uuid&status=PENDING&page=1&limit=20
Authorization: Bearer <token>
```

---

#### Get Order Details
```http
GET /orders/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "quantity": 5,
  "total_amount": 500,
  "status": "PENDING",
  "expires_at": "2025-01-01T06:00:00Z",
  "address": {
    "street": "123 Main St",
    "city": "Dhaka"
  },
  "tickets": [
    { "id": "uuid", "serial": 1234, "status": "RESERVED" }
  ]
}
```

---

### Tickets

#### List My Tickets
```http
GET /tickets?draw_id=uuid&status=PAID&page=1&limit=50
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "draw_id": "uuid",
      "order_id": "uuid",
      "serial": 1234,
      "status": "PAID",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### Get Ticket Details
```http
GET /tickets/:id
Authorization: Bearer <token>
```

---

## Fairness / Verification Endpoints

### Get Verification Data
```http
GET /fairness/verify/:drawId
```

**Response:**
```json
{
  "draw_id": "uuid",
  "draw_title": "Weekly Draw #1",
  "status": "SETTLED",
  "merkle_root": "abc123...",
  "beacon_value": "00000000000000000008...",
  "beacon_source": "BITCOIN",
  "total_tickets": 5000,
  "winner_ticket_id": "uuid",
  "winner_serial": 2345,
  "verification_formula": "hash = SHA256(beacon_value + merkle_root); winner_index = bigint(hash) % total_tickets",
  "fairness_events": [
    {
      "event_type": "MERKLE_PUBLISHED",
      "payload": {...},
      "created_at": "2025-01-07T23:59:59Z"
    }
  ],
  "can_verify": true
}
```

---

### Verify Draw Result (Server-Side)
```http
GET /fairness/verify/:drawId/compute
```

**Response:**
```json
{
  "is_valid": true,
  "computed_hash": "def456...",
  "computed_winner_index": 2345,
  "expected_winner_serial": 2345,
  "actual_winner_serial": 2345,
  "matches": true
}
```

---

### Get Ticket Merkle Proof
```http
GET /fairness/ticket/:ticketId/proof
```

**Response:**
```json
{
  "ticket": {
    "id": "uuid",
    "serial": 1234,
    "leaf_hash": "abc..."
  },
  "merkle_proof": ["hash1", "hash2", "hash3"],
  "draw_merkle_root": "root_hash",
  "can_verify": true
}
```

---

## Admin Endpoints

All admin endpoints require authentication and appropriate role.

### Admin Authentication

#### Admin Login
```http
POST /admin/login
Content-Type: application/json

{
  "email": "admin@lottery.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "role": "SUPER_ADMIN"
}
```

---

### Draw Management

#### List Draws (Admin)
```http
GET /admin/draws?status=STARTED&page=1&limit=20
Authorization: Bearer <admin_token>
```
**Roles:** SUPER_ADMIN, OPS_MANAGER, AUDITOR

---

#### Create Draw
```http
POST /admin/draws
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Weekly Draw #2",
  "start_at": "2025-01-08T00:00:00Z",
  "end_at": "2025-01-14T23:59:59Z",
  "ticket_price": 100,
  "max_tickets": 10000,
  "low_sales_threshold_pct": 30,
  "beacon_source": "BITCOIN"
}
```
**Roles:** SUPER_ADMIN, OPS_MANAGER

---

#### Update Draw
```http
PATCH /admin/draws/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Weekly Draw #2 (Updated)",
  "end_at": "2025-01-15T23:59:59Z"
}
```
**Roles:** SUPER_ADMIN, OPS_MANAGER

---

#### Close Draw (Manual)
```http
POST /admin/draws/:id/close
Authorization: Bearer <admin_token>
```
Triggers immediate draw closure (builds Merkle tree, publishes root).

**Roles:** SUPER_ADMIN, OPS_MANAGER

---

#### Settle Draw (Manual)
```http
POST /admin/draws/:id/settle
Authorization: Bearer <admin_token>
```
Fetches beacon and computes winner.

**Roles:** SUPER_ADMIN, OPS_MANAGER

---

#### Delete Draw
```http
DELETE /admin/draws/:id
Authorization: Bearer <admin_token>
```
Only allowed if no tickets sold.

**Roles:** SUPER_ADMIN only

---

### COD Management

#### List COD Tasks
```http
GET /admin/cod/tasks?status=PENDING&agent=Agent1&page=1&limit=50
Authorization: Bearer <admin_token>
```
**Roles:** SUPER_ADMIN, OPS_MANAGER, SUPPORT_AGENT

---

#### Get COD Task
```http
GET /admin/cod/tasks/:id
Authorization: Bearer <admin_token>
```

---

#### Assign COD Tasks
```http
POST /admin/cod/tasks/assign
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "task_ids": ["uuid1", "uuid2"],
  "agent_name": "Agent Smith"
}
```
**Roles:** SUPER_ADMIN, OPS_MANAGER

---

#### Update COD Status
```http
PATCH /admin/cod/tasks/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "COLLECTED",
  "notes": "Payment collected successfully"
}
```
**Statuses:** PENDING, ASSIGNED, VISITED, COLLECTED, FAILED_NO_SHOW, FAILED_ADDRESS_INVALID

**Roles:** SUPER_ADMIN, OPS_MANAGER, SUPPORT_AGENT

---

#### Export COD Routes
```http
GET /admin/cod/routes/export?agent=Agent1
Authorization: Bearer <admin_token>
```
Returns CSV-ready data for field agents.

**Roles:** SUPER_ADMIN, OPS_MANAGER

---

#### COD Statistics
```http
GET /admin/cod/stats
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "pending": 45,
  "assigned": 23,
  "visited": 12,
  "collected": 156,
  "failed": 8,
  "total_collected_amount": 45600.00
}
```

---

### User Management

#### List Users
```http
GET /admin/users?search=john&status=ACTIVE&page=1&limit=50
Authorization: Bearer <admin_token>
```
**Roles:** SUPER_ADMIN, OPS_MANAGER, SUPPORT_AGENT

---

#### Get User Details
```http
GET /admin/users/:id
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "status": "ACTIVE"
  },
  "stats": {
    "total_orders": 23,
    "total_tickets": 115,
    "active_bans": 0
  },
  "bans": [],
  "recent_orders": [...]
}
```

---

#### Ban User
```http
POST /admin/users/:id/ban
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "ban_type": "SOFT",              // SOFT or HARD
  "reason": "Multiple failed COD attempts",
  "duration_hours": 168            // optional (7 days)
}
```
**Roles:** SUPER_ADMIN, SUPPORT_AGENT

---

#### Unban User
```http
POST /admin/users/:id/unban
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Ban period expired, good behavior"
}
```
**Roles:** SUPER_ADMIN, SUPPORT_AGENT

---

#### Flag User
```http
POST /admin/users/:id/flag
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "flags": ["SPAM", "DUPLICATE_ACCOUNT", "SUSPICIOUS_ACTIVITY"]
}
```
**Roles:** SUPER_ADMIN, SUPPORT_AGENT

---

#### Get User History
```http
GET /admin/users/:id/history
Authorization: Bearer <admin_token>
```
Returns audit trail for the user.

**Roles:** SUPER_ADMIN, OPS_MANAGER, AUDITOR

---

### Audit Logs

#### List Audit Logs
```http
GET /admin/audit/logs?actor_id=uuid&action_type=DRAW_CREATED&entity_type=draw&start_date=2025-01-01&end_date=2025-01-31&page=1&limit=100
Authorization: Bearer <admin_token>
```
**Roles:** SUPER_ADMIN, AUDITOR

---

#### Get Audit Log
```http
GET /admin/audit/logs/:id
Authorization: Bearer <admin_token>
```

---

#### Audit Statistics
```http
GET /admin/audit/stats?start_date=2025-01-01&end_date=2025-01-31
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "total_logs": 1234,
  "by_action_type": [
    { "action_type": "DRAW_CREATED", "count": 45 }
  ],
  "by_entity_type": [
    { "entity_type": "draw", "count": 120 }
  ],
  "top_actors": [
    { "actor_id": "uuid", "count": 234 }
  ]
}
```

---

#### Export Audit Logs
```http
GET /admin/audit/export?start_date=2025-01-01&end_date=2025-01-31
Authorization: Bearer <admin_token>
```
Returns CSV-ready audit log data (max 10,000 records).

---

### Reports

#### Dashboard Stats
```http
GET /admin/reports/dashboard
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "total_active_users": 8523,
  "active_draws": 3,
  "pending_cod_tasks": 45,
  "today_revenue": 12340.00
}
```
**Roles:** SUPER_ADMIN, OPS_MANAGER

---

#### Sales Report
```http
GET /admin/reports/sales?start_date=2025-01-01&end_date=2025-01-31
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "total_orders": 1234,
  "total_revenue": 123400.00,
  "by_status": [
    { "status": "COLLECTED", "count": 980, "amount": 98000 },
    { "status": "PENDING", "count": 234, "amount": 23400 }
  ],
  "top_draws": [
    { "draw_id": "uuid", "count": 456, "amount": 45600 }
  ]
}
```
**Roles:** SUPER_ADMIN, OPS_MANAGER, AUDITOR

---

#### COD Report
```http
GET /admin/reports/cod?start_date=2025-01-01&end_date=2025-01-31
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "total_tasks": 1234,
  "collection_rate_pct": "79.50",
  "by_status": [
    { "status": "COLLECTED", "count": 980 },
    { "status": "FAILED_NO_SHOW", "count": 123 }
  ],
  "avg_collection_hours": "18.5"
}
```
**Roles:** SUPER_ADMIN, OPS_MANAGER

---

#### Draw Report
```http
GET /admin/reports/draw/:drawId
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "draw": {...},
  "total_orders": 456,
  "total_revenue": 45600.00,
  "sell_through_pct": "45.60",
  "tickets_by_status": [
    { "status": "PAID", "count": 3456 },
    { "status": "RESERVED", "count": 234 }
  ],
  "unique_buyers": 312
}
```
**Roles:** SUPER_ADMIN, OPS_MANAGER, AUDITOR

---

#### Abuse Metrics
```http
GET /admin/reports/abuse?start_date=2025-01-01&end_date=2025-01-31
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "total_users": 8523,
  "banned_users": 45,
  "ban_rate_pct": "0.53",
  "users_by_status": [
    { "status": "ACTIVE", "count": 8478 },
    { "status": "SOFT_BANNED", "count": 30 }
  ],
  "failed_orders": 123
}
```
**Roles:** SUPER_ADMIN, SUPPORT_AGENT, AUDITOR

---

## Error Responses

All endpoints return standard error format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| OTP Request | 3 per hour per identifier |
| Order Creation | 10 per hour per user |
| Draw List | 100 per minute |
| All other endpoints | No specific limit |

Rate limit headers are returned:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1640995200
```

---

## Environment Variables

```bash
# Backend
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=lottery_user
DATABASE_PASSWORD=lottery_pass
DATABASE_NAME=lottery

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your-secret-key
OTP_TEST_MODE=true

ADMIN_EMAIL=admin@lottery.com
ADMIN_PASSWORD=admin123

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001/v1
```
