# FarmFlow — Implemented Features

## Authentication

- **Registration** — Name, email, password, role (buyer or seller). Auto-login on success.
- **Login** — Email + password. Returns JWT valid for 7 days.
- **Session persistence** — Token stored in `sessionStorage`. Restored on page refresh via `GET /api/auth/me`.
- **Forced logout** — Any 401 response from the backend clears the session and redirects to login.
- **Client-side expiry check** — Token `exp` claim is checked before the `getMe` network call; expired tokens are discarded silently.
- **Deactivated account guard** — `getMe` returns 403 if account is inactive, terminating the session on next refresh.

---

## Seller Module

### Dashboard

- Displays four stat cards:
  - **Total Livestock** — count of all the seller's listings (all statuses)
  - **Total Income** — sum of all income records
  - **Total Expenses** — sum of all expense records
  - **Net Profit** — total income minus total expenses
- Data loaded in parallel (single render pass)

### My Livestock

- Table of all the seller's listings with: type, breed, age (months), weight (kg), price, and status
- Status values: `Pending`, `Approved`, `Rejected`, `Sold`
- Delete button per listing — asks for confirmation before calling the API
- Optimistic removal from the list on successful delete
- Link to Add Livestock page

### Add Livestock

- Form fields: type (dropdown), breed, age, weight, price, location, description, images (up to 5)
- Images uploaded as `multipart/form-data` — stored on the server under `/uploads/`
- Redirects to My Livestock on success
- Inline error messages from server validation

### Expenses

- Inline add form: category (feed / doctor / transport / other), amount, date, note
- History table with all expense records sorted by date (newest first)
- Category and date are shown per record

### Income

- Inline add form: type (sale / deposit), amount, date, note
- History table with all income records sorted by date (newest first)

---

## Buyer Module

### Browse Livestock

- CSS grid of cards showing all approved listings
- Each card shows: photo (if available), type, breed, age, weight, location, price
- Links to the full listing detail page

### Listing Detail

- Full listing information: type, breed, age, weight, price, location, description, all photos
- Seller name and phone number
- Order form with:
  - Payment type: Cash on Delivery or Deposit
  - If Deposit: deposit amount field (must be > 0 and < total price)
  - Notes field
- Client-side deposit validation before the API call
- Success message with 1.5 s redirect to My Orders

### My Orders

- Table of all the buyer's orders
- Columns: livestock type/breed, payment type, deposit amount, total, seller name, status
- Status color-coded: Pending (grey), Confirmed (blue), Completed (green), Cancelled (red)

---

## Admin Module

### Dashboard

- Four stat cards linked to relevant management pages:
  - **Total Users** → Users page
  - **Pending Listings** → Listings page
  - **Active Listings** → Listings page
  - **Total Orders** → Orders page
- All counts fetched in a single parallel query on the backend

### Users Management

- Table of all registered users: name, email, role, join date, status (Active / Inactive)
- Activate / Deactivate toggle per user
- Self-deactivation is blocked on both frontend (button hidden for current user) and backend (400 guard)
- Empty state message when no users exist

### Listings Approval

- Filter tabs: All / Pending / Approved / Rejected / Sold — with live count per status
- Defaults to **Pending** tab (most actionable view)
- Per-listing action buttons:
  - **Approve** — visible when status is pending or rejected
  - **Reject** — visible when status is pending or approved
  - Neither button shown for sold listings
- Actions update the row in-place without a full page reload

### Orders Overview

- Read-only table of all orders across all users
- Columns: listing type/breed, buyer, seller, payment type, total, status, date
- Status color-coded to match the buyer view

---

## Finance System

### Data Model

Expenses and income are stored as separate collections, both linked to the seller who owns them. Each record can optionally reference a specific listing (and income records can also reference an order).

### Expense Categories

| Category | Description |
|----------|-------------|
| feed | Animal feed and nutrition |
| doctor | Veterinary visits and medicine |
| transport | Moving animals between locations |
| other | Any other farm expense |

### Income Types

| Type | Description |
|------|-------------|
| sale | Full sale of an animal |
| deposit | Partial deposit received from a buyer |

### Summary Calculation

`GET /api/finance/summary` runs four MongoDB aggregation pipelines in parallel:
1. Sum of all income → `totalIncome`
2. Sum of all expenses → `totalExpenses`
3. `netProfit = totalIncome - totalExpenses`
4. Breakdown of income by type and expenses by category

Supports optional `from` / `to` date range query parameters for time-scoped reports.

---

## Security Features

- JWT authentication required on all state-changing endpoints
- Role-based middleware (`authorizeRoles`) on every protected route
- Sellers can only modify their own listings and see their own financial data
- Buyers cannot create listings or access financial endpoints
- Admin approval gate before listings are visible to buyers
- Password hashed with bcrypt (10 rounds) — never returned in API responses
- `select: false` on the password field in the User schema
- Token stored in `sessionStorage` (tab-isolated, cleared on tab close)
- `isActive` check in `getMe` terminates deactivated sessions on next page refresh

---

## UX Details

- All pages show a loading indicator while data is being fetched
- All pages show an inline error message if the API call fails
- All list/table pages show an empty-state message when there is no data
- Prices and amounts are formatted with thousand separators (e.g., 1,500 not 1500)
- Admin can only approve/reject — they cannot edit listing content
- A single `fmt()` utility formats all numbers consistently across the app
