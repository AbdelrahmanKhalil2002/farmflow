# FarmFlow — API Reference

**Base URL (development):** `http://localhost:5001/api`

**Authentication:** All protected endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

**Role legend:**
- `public` — no token required
- `any` — valid token required, any role
- `seller` — seller role only
- `buyer` — buyer role only
- `admin` — admin role only

---

## Auth

### POST /auth/register

Register a new buyer or seller account.

**Auth:** public

**Request body:**
```json
{
  "name": "Ahmed Ali",
  "email": "ahmed@example.com",
  "password": "secret123",
  "role": "seller"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | yes | |
| email | string | yes | Must be a valid email |
| password | string | yes | Minimum 6 characters |
| role | string | no | `buyer` or `seller`. Defaults to `buyer`. `admin` is rejected. |

**Response `201`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "664a1b2c3d4e5f6789abcdef",
    "name": "Ahmed Ali",
    "email": "ahmed@example.com",
    "role": "seller",
    "isActive": true,
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Error `400`:** Email already in use, or validation failure.

---

### POST /auth/login

Log in with email and password.

**Auth:** public

**Request body:**
```json
{
  "email": "ahmed@example.com",
  "password": "secret123"
}
```

**Response `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "664a1b2c3d4e5f6789abcdef",
    "name": "Ahmed Ali",
    "email": "ahmed@example.com",
    "role": "seller",
    "isActive": true
  }
}
```

**Error `401`:** Invalid email or password.
**Error `403`:** Account is disabled.

---

### GET /auth/me

Get the currently authenticated user's profile.

**Auth:** any

**Response `200`:**
```json
{
  "_id": "664a1b2c3d4e5f6789abcdef",
  "name": "Ahmed Ali",
  "email": "ahmed@example.com",
  "role": "seller",
  "isActive": true,
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

**Error `403`:** Account has been deactivated.
**Error `404`:** User record no longer exists.

---

## Listings

### GET /listings

Get a list of livestock listings. Results are scoped by the caller's role.

**Auth:** public (optional token)

| Caller | Result |
|--------|--------|
| No token / buyer | Only `approved` listings |
| seller | Only their own listings (all statuses) |
| admin | All listings (all statuses) |

**Response `200`:**
```json
[
  {
    "_id": "664b2c3d4e5f6789abcdef01",
    "type": "sheep",
    "breed": "Najdi",
    "age": 18,
    "weight": 45.5,
    "price": 1500,
    "location": "Riyadh",
    "description": "Healthy sheep, vaccinated.",
    "images": ["/uploads/1700000000001-123456.jpg"],
    "status": "approved",
    "seller": {
      "_id": "664a1b2c3d4e5f6789abcdef",
      "name": "Ahmed Ali",
      "phone": "0501234567"
    },
    "createdAt": "2025-01-15T12:00:00.000Z"
  }
]
```

---

### GET /listings/:id

Get a single listing by ID.

**Auth:** public (optional token). Buyers and unauthenticated callers only see approved listings. Sellers can only see their own listings.

**Response `200`:** Same shape as a single item from `GET /listings`.
**Error `404`:** Listing not found or not accessible to the caller.
**Error `403`:** Seller tried to view another seller's listing.
**Error `400`:** Malformed listing ID.

---

### POST /listings

Create a new livestock listing. Accepts `multipart/form-data` for image uploads.

**Auth:** seller

**Request body (multipart/form-data):**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| type | string | yes | `cattle`, `sheep`, `goat`, `camel`, `horse`, `other` |
| age | number | yes | In months, ≥ 0 |
| weight | number | yes | In kg, ≥ 0 |
| price | number | yes | ≥ 0 |
| breed | string | no | |
| location | string | no | |
| description | string | no | |
| images | file(s) | no | Up to 5 files. JPEG, PNG, or WebP. Max 5 MB each. |

**Response `201`:** The created listing object. Status defaults to `pending`.

---

### PUT /listings/:id

Update a listing. Accepts `multipart/form-data`.

**Auth:** seller (own listing only), admin

- Sellers may update content fields only.
- Only admin may change the `status` field.
- New images are appended to the existing image array.

**Request body (multipart/form-data):** Any subset of the fields from POST /listings, plus:

| Field | Type | Notes |
|-------|------|-------|
| status | string | Admin only. `pending`, `approved`, `rejected`, `sold`. |

**Response `200`:** The updated listing object.
**Error `403`:** Seller tried to update another seller's listing.
**Error `400`:** Validation failure or malformed ID.

---

### DELETE /listings/:id

Delete a listing permanently.

**Auth:** seller (own listing only), admin

**Response `204`:** No content.
**Error `403`:** Seller tried to delete another seller's listing.
**Error `400`:** Malformed listing ID.
**Error `404`:** Listing not found.

---

## Orders

### POST /orders

Place an order on an approved listing.

**Auth:** buyer

**Request body:**
```json
{
  "listingId": "664b2c3d4e5f6789abcdef01",
  "paymentType": "deposit",
  "depositAmount": 300,
  "notes": "Please deliver to Riyadh."
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| listingId | string | yes | Must be a valid MongoID of an approved listing |
| paymentType | string | yes | `cod` (cash on delivery) or `deposit` |
| depositAmount | number | if deposit | Must be > 0 and < listing price |
| notes | string | no | |

**Response `201`:**
```json
{
  "_id": "664c3d4e5f6789abcdef0123",
  "buyer": "664a1b2c3d4e5f6789abcdef",
  "seller": { "_id": "...", "name": "Ahmed Ali", "phone": "0501234567" },
  "listing": { "_id": "...", "type": "sheep", "breed": "Najdi", "price": 1500 },
  "paymentType": "deposit",
  "depositAmount": 300,
  "totalAmount": 1500,
  "status": "pending",
  "notes": "Please deliver to Riyadh.",
  "createdAt": "2025-01-16T09:00:00.000Z"
}
```

**Error `400`:** Listing not approved, buyer is the seller, or active order already exists for this listing.

---

### GET /orders

Get orders scoped to the caller's role.

**Auth:** buyer, seller, admin

| Caller | Result |
|--------|--------|
| buyer | Their own orders |
| seller | Orders placed on their listings |
| admin | All orders |

**Response `200`:** Array of order objects (same shape as POST /orders response, fully populated).

---

### GET /orders/:id

Get a single order by ID.

**Auth:** buyer (own order), seller (their listing's order), admin

**Response `200`:** Single order object.
**Error `403`:** Caller does not own or belong to this order.
**Error `400`:** Malformed order ID.
**Error `404`:** Order not found.

---

### PUT /orders/:id/status

Update an order's status.

**Auth:** seller (own orders only, restricted transitions), admin (any transition)

**Request body:**
```json
{ "status": "confirmed" }
```

**Allowed transitions (seller):**

| From | To |
|------|----|
| pending | confirmed, cancelled |
| confirmed | completed, cancelled |

Admin may set any status without restriction.

**Side effect:** When status is set to `completed`, the associated listing's status is automatically changed to `sold`.

**Response `200`:** Updated order object.
**Error `400`:** Invalid transition for the current status.
**Error `403`:** Seller tried to update another seller's order.

---

## Finance

All finance endpoints are scoped to the authenticated seller. Admins may pass `?sellerId=<id>` to view a specific seller's data, or omit it to see all records.

**Common date filter query params (all GET endpoints):**

| Param | Type | Notes |
|-------|------|-------|
| from | ISO 8601 date | Start of date range |
| to | ISO 8601 date | End of date range |

---

### POST /finance/expenses

Record a new expense.

**Auth:** seller

**Request body:**
```json
{
  "category": "feed",
  "amount": 250.00,
  "date": "2025-01-15",
  "note": "Monthly grain purchase",
  "listing": "664b2c3d4e5f6789abcdef01"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| category | string | yes | `feed`, `doctor`, `transport`, `other` |
| amount | number | yes | > 0 |
| date | ISO 8601 | no | Defaults to current date |
| note | string | no | |
| listing | MongoID | no | Must belong to the caller |

**Response `201`:** The created expense object.

---

### GET /finance/expenses

Get expense records.

**Auth:** seller, admin

**Additional query params:**

| Param | Notes |
|-------|-------|
| category | Filter by category |
| listingId | Filter by listing |
| sellerId | Admin only — scope to a specific seller |

**Response `200`:**
```json
[
  {
    "_id": "664d4e5f6789abcdef012345",
    "category": "feed",
    "amount": 250,
    "date": "2025-01-15T00:00:00.000Z",
    "note": "Monthly grain purchase",
    "listing": { "_id": "...", "type": "sheep", "breed": "Najdi" },
    "seller": "664a1b2c3d4e5f6789abcdef",
    "createdAt": "2025-01-15T14:00:00.000Z"
  }
]
```

---

### POST /finance/income

Record a new income entry.

**Auth:** seller

**Request body:**
```json
{
  "type": "sale",
  "amount": 1500.00,
  "date": "2025-01-16",
  "note": "Sold Najdi sheep",
  "listing": "664b2c3d4e5f6789abcdef01",
  "order": "664c3d4e5f6789abcdef0123"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| type | string | yes | `sale` or `deposit` |
| amount | number | yes | > 0 |
| date | ISO 8601 | no | Defaults to current date |
| note | string | no | |
| listing | MongoID | no | Must belong to the caller |
| order | MongoID | no | Must belong to the caller |

**Response `201`:** The created income object.

---

### GET /finance/income

Get income records.

**Auth:** seller, admin

**Additional query params:**

| Param | Notes |
|-------|-------|
| type | Filter by `sale` or `deposit` |
| listingId | Filter by listing |
| sellerId | Admin only — scope to a specific seller |

**Response `200`:** Array of income objects (similar shape to expense, with `type` instead of `category`).

---

### GET /finance/summary

Get aggregated totals.

**Auth:** seller, admin

**Query params:** `from`, `to`, `sellerId` (admin only)

**Response `200`:**
```json
{
  "totalIncome": 4500,
  "totalExpenses": 1200,
  "netProfit": 3300,
  "incomeByType": {
    "sale": 4000,
    "deposit": 500
  },
  "expenseByCategory": {
    "feed": 800,
    "doctor": 200,
    "transport": 200
  }
}
```

---

## Admin

All admin endpoints require `role: admin`.

---

### GET /admin/stats

Platform-wide dashboard statistics.

**Auth:** admin

**Response `200`:**
```json
{
  "totalUsers": 42,
  "pendingListings": 7,
  "activeListings": 15,
  "totalOrders": 23
}
```

---

### GET /admin/users

List all registered users.

**Auth:** admin

**Response `200`:**
```json
[
  {
    "_id": "664a1b2c3d4e5f6789abcdef",
    "name": "Ahmed Ali",
    "email": "ahmed@example.com",
    "role": "seller",
    "isActive": true,
    "phone": "0501234567",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
]
```

---

### PATCH /admin/users/:id/toggle

Toggle a user's `isActive` status.

**Auth:** admin

**No request body required.**

**Response `200`:** Updated user object with the new `isActive` value.

**Error `400`:** Admin tried to deactivate their own account, or invalid user ID.
**Error `404`:** User not found.

---

## Health Check

### GET /health

**Auth:** public

**Response `200`:**
```json
{ "status": "ok" }
```
