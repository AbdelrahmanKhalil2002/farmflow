# FarmFlow — Database Schema

**Database:** MongoDB
**ORM:** Mongoose 8
**Database name:** `farmflow`

---

## Collections Overview

| Collection | Documents represent |
|------------|-------------------|
| `users` | Platform accounts (sellers, buyers, admins) |
| `listings` | Livestock for sale |
| `orders` | Purchase orders placed by buyers |
| `expenses` | Seller expense records |
| `incomes` | Seller income records |

---

## users

Stores all platform accounts regardless of role.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | MongoDB default |
| `name` | String | yes | Trimmed |
| `email` | String | yes | Unique, lowercase, trimmed |
| `password` | String | yes | bcrypt hash (10 rounds). `select: false` — never returned in queries by default |
| `role` | String | yes | Enum: `buyer`, `seller`, `admin`. Default: `buyer` |
| `phone` | String | no | Trimmed |
| `isActive` | Boolean | yes | Default: `true`. Used to disable accounts without deleting them |
| `createdAt` | Date | auto | Mongoose timestamps |
| `updatedAt` | Date | auto | Mongoose timestamps |

**Indexes:** `email` (unique)

**Behaviour:**
- `pre('save')` hook bcrypt-hashes the password when it is modified
- `matchPassword(plain)` instance method for login comparison
- `toJSON` transform deletes `password` from all serialized output

---

## listings

A listing represents one animal or batch of animals that a seller wants to sell.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | |
| `seller` | ObjectId | yes | ref: `User` |
| `type` | String | yes | Enum: `cattle`, `sheep`, `goat`, `camel`, `horse`, `other` |
| `breed` | String | no | Trimmed |
| `age` | Number | yes | In months |
| `weight` | Number | yes | In kg |
| `price` | Number | yes | Sale price |
| `description` | String | no | Trimmed |
| `images` | [String] | no | Array of file paths (e.g. `/uploads/1700000000001-123456.jpg`). Default: `[]` |
| `status` | String | yes | Enum: `pending`, `approved`, `rejected`, `sold`. Default: `pending` |
| `location` | String | no | Trimmed |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Relationships:**
- `seller` → `users._id`

**Status lifecycle:**
```
pending  ──► approved ──► sold
         ──► rejected
approved ──► rejected  (admin can re-reject)
rejected ──► approved  (admin can re-approve)
```

---

## orders

Created when a buyer places a purchase request on an approved listing.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | |
| `buyer` | ObjectId | yes | ref: `User` |
| `seller` | ObjectId | yes | ref: `User`. Denormalized from the listing at order-creation time |
| `listing` | ObjectId | yes | ref: `Listing` |
| `paymentType` | String | yes | Enum: `deposit`, `cod` |
| `depositAmount` | Number | no | Default: `0`. Only meaningful when `paymentType = deposit` |
| `totalAmount` | Number | yes | Copied from `listing.price` at order-creation time |
| `status` | String | yes | Enum: `pending`, `confirmed`, `completed`, `cancelled`. Default: `pending` |
| `notes` | String | no | Buyer's notes. Trimmed |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Relationships:**
- `buyer` → `users._id`
- `seller` → `users._id`
- `listing` → `listings._id`

**Status transitions:**

| Actor | From | Allowed next states |
|-------|------|-------------------|
| seller | pending | confirmed, cancelled |
| seller | confirmed | completed, cancelled |
| admin | any | any |

**Side effect:** When a seller or admin sets status to `completed`, the linked listing's status is automatically updated to `sold`.

**Duplicate guard:** A buyer cannot place a second active order (pending or confirmed) on the same listing.

---

## expenses

Individual expense records for sellers. Used to calculate net profit.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | |
| `seller` | ObjectId | yes | ref: `User` |
| `listing` | ObjectId | no | ref: `Listing`. Optional — expense can be general or tied to one animal |
| `category` | String | yes | Enum: `feed`, `doctor`, `transport`, `other` |
| `amount` | Number | yes | Positive value |
| `date` | Date | yes | Default: `Date.now` |
| `note` | String | no | Trimmed |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Relationships:**
- `seller` → `users._id`
- `listing` → `listings._id` (optional)

---

## incomes

Individual income records for sellers. Used to calculate net profit.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `_id` | ObjectId | auto | |
| `seller` | ObjectId | yes | ref: `User` |
| `listing` | ObjectId | no | ref: `Listing` (optional) |
| `order` | ObjectId | no | ref: `Order` (optional) |
| `type` | String | yes | Enum: `sale`, `deposit` |
| `amount` | Number | yes | ≥ 0 |
| `date` | Date | yes | Default: `Date.now` |
| `note` | String | no | Trimmed |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Relationships:**
- `seller` → `users._id`
- `listing` → `listings._id` (optional)
- `order` → `orders._id` (optional)

---

## Entity Relationship Diagram

```
users
 │
 ├──< listings (seller)
 │      │
 │      └──< orders (listing)
 │                │
 ├──< orders (buyer)
 ├──< orders (seller)
 │
 ├──< expenses (seller)
 │      └── listing? (optional ref)
 │
 └──< incomes (seller)
        ├── listing? (optional ref)
        └── order?   (optional ref)
```

---

## Finance Aggregation

The `GET /finance/summary` endpoint runs four MongoDB aggregation pipelines in parallel against the `expenses` and `incomes` collections:

```js
// Total income
Income.aggregate([
  { $match: { seller: sellerId, date: dateFilter } },
  { $group: { _id: null, total: { $sum: '$amount' } } }
])

// Total expenses
Expense.aggregate([
  { $match: { seller: sellerId, date: dateFilter } },
  { $group: { _id: null, total: { $sum: '$amount' } } }
])

// Income breakdown by type
Income.aggregate([
  { $match: ... },
  { $group: { _id: '$type', total: { $sum: '$amount' } } }
])

// Expense breakdown by category
Expense.aggregate([
  { $match: ... },
  { $group: { _id: '$category', total: { $sum: '$amount' } } }
])
```

`netProfit = totalIncome - totalExpenses`
