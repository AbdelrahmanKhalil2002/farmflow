# FarmFlow — Architecture

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | React | 19 |
| Frontend build tool | Vite | 8 |
| Client-side routing | React Router | v7 |
| HTTP client | Axios | 1.x |
| Backend framework | Node.js + Express | 4.x |
| Database | MongoDB + Mongoose | 8.x |
| Authentication | JWT (jsonwebtoken) | 9.x |
| Password hashing | bcryptjs | 2.x |
| File uploads | Multer | v2 |
| Input validation | express-validator | 7.x |

---

## Directory Structure

```
FarmFlow/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js            # MongoDB connection
│   │   │   └── upload.js        # Multer config (disk storage, 5 MB limit)
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── listingController.js
│   │   │   ├── orderController.js
│   │   │   ├── financeController.js
│   │   │   └── adminController.js
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT protect middleware
│   │   │   └── role.js          # authorizeRoles factory
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Listing.js
│   │   │   ├── Order.js
│   │   │   ├── Expense.js
│   │   │   └── Income.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── listings.js
│   │   │   ├── orders.js
│   │   │   ├── expenses.js      # Finance routes (expenses + income + summary)
│   │   │   └── admin.js
│   │   └── app.js               # Express app, middleware stack, route registration
│   ├── uploads/                 # Uploaded images (served as static files)
│   ├── server.js                # Entry point — connects DB then starts server
│   ├── seed.js                  # One-time seed script (creates test users)
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProtectedRoute.jsx   # Auth + role guard
│   │   │   ├── RoleRouter.jsx       # Redirects to correct dashboard by role
│   │   │   └── LoadingScreen.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # User state, login/logout, session hydration
│   │   ├── layouts/
│   │   │   ├── SellerLayout.jsx
│   │   │   ├── BuyerLayout.jsx
│   │   │   └── AdminLayout.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── seller/
│   │   │   │   ├── SellerDashboard.jsx
│   │   │   │   ├── SellerListings.jsx
│   │   │   │   ├── SellerAddListing.jsx
│   │   │   │   ├── SellerExpenses.jsx
│   │   │   │   └── SellerIncome.jsx
│   │   │   ├── buyer/
│   │   │   │   ├── BuyerBrowse.jsx
│   │   │   │   ├── BuyerListingDetail.jsx
│   │   │   │   └── BuyerOrders.jsx
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.jsx
│   │   │       ├── AdminUsers.jsx
│   │   │       ├── AdminListings.jsx
│   │   │       └── AdminOrders.jsx
│   │   ├── services/
│   │   │   ├── api.js               # Axios instance + interceptors
│   │   │   ├── authService.js
│   │   │   ├── listingService.js
│   │   │   ├── orderService.js
│   │   │   ├── financeService.js
│   │   │   └── adminService.js
│   │   ├── utils/
│   │   │   ├── token.js             # sessionStorage helpers + JWT decode
│   │   │   └── format.js            # fmt() number formatter
│   │   └── App.jsx                  # Route tree
│   ├── vite.config.js
│   └── .env
│
└── docs/
```

---

## Frontend Architecture

### Routing

React Router v7 with nested routes. Three protected sections, each with its own layout:

```
/login                    → Login (public)
/register                 → Register (public)
/dashboard                → RoleRouter (authenticated — redirects by role)
/seller/*                 → SellerLayout + seller pages (role: seller only)
/buyer/*                  → BuyerLayout + buyer pages (role: buyer only)
/admin/*                  → AdminLayout + admin pages (role: admin only)
*                         → redirect to /dashboard
```

### Auth Flow

1. On app load, `AuthProvider` reads the token from `sessionStorage`
2. If the token exists and has not expired (checked client-side against the `exp` claim), it calls `GET /api/auth/me` to hydrate the user object
3. If `getMe()` returns 401/403, the token is removed. If there is a network error, the JWT payload is decoded locally so the user is not sent to `/login` unnecessarily
4. The `loading` gate prevents any route from rendering until hydration completes
5. `ProtectedRoute` checks `isAuthenticated` and optionally `user.role` before rendering its child

### Token Storage

JWT is stored in `sessionStorage` (key: `ff_token`). It is intentionally kept out of React state to reduce exposure in React DevTools. Every Axios request reads the token fresh from sessionStorage via the request interceptor.

### API Calls

All HTTP calls go through a single Axios instance in `api.js`:
- In development: Vite proxies `/api/*` and `/uploads/*` to `http://localhost:5001`, eliminating CORS
- In production: `VITE_API_URL` env var points to the deployed backend
- A response interceptor retries on network failure (max 2 attempts, 1 s / 2 s backoff)
- Any 401 response fires the `auth:logout` custom event, which `AuthContext` listens to and clears user state

---

## Backend Architecture

### Middleware Stack (per request)

```
CORS → express.json() → express.urlencoded() → Route handler
                                                  └─ protect (JWT verify)
                                                  └─ authorizeRoles (role check)
                                                  └─ multer (if multipart)
                                                  └─ express-validator
                                                  └─ Controller
```

### Route Registration

```
/api/auth      → auth.js routes
/api/listings  → listings.js routes
/api/orders    → orders.js routes
/api/finance   → expenses.js routes (handles expenses, income, and summary)
/api/admin     → admin.js routes (all behind protect + authorizeRoles('admin'))
/uploads       → static file serving (uploaded images)
/api/health    → health check endpoint
```

### Role-Based Data Scoping

Controllers apply role-based filters at the query level — there is no separate "admin endpoint" for listings or orders:

| Endpoint | buyer | seller | admin |
|----------|-------|--------|-------|
| GET /api/listings | status=approved only | their own listings (all statuses) | all listings |
| GET /api/orders | their own orders | orders on their listings | all orders |
| GET /api/finance/expenses | — | their own | all (or filtered by sellerId) |

---

## Database

MongoDB with Mongoose ODM. Single database: `farmflow`.

Collections: `users`, `listings`, `orders`, `expenses`, `incomes`

See `database-schema.md` for full field definitions and relationships.

---

## Ports

| Service | Port |
|---------|------|
| Backend (Express) | 5001 |
| Frontend (Vite dev server) | 5173 |
| MongoDB | 27017 |

---

## System Flow Diagram

```
Browser (port 5173)
    │
    │  /api/* and /uploads/*
    │  ──────────────────────► Vite Proxy (dev only)
    │                               │
    │                               ▼
    │                    Express Server (port 5001)
    │                          │         │
    │                    MongoDB      /uploads/
    │                   (port 27017)  (static files)
    │
    │  (production: axios uses VITE_API_URL directly)
```
