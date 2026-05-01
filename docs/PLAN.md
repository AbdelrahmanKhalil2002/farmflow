# FarmFlow — Project Plan

> **Stack:** React (Vite) frontend · Node/Express backend · MongoDB (Mongoose)
> **Language:** Arabic default, English switchable
> **Users:** Seller (farm owner) · Buyer · Admin

---

## Status Legend

- [x] Done
- [-] Partially done (needs fixes/updates)
- [ ] Not started

---

## 1. Authentication & Registration

| # | Task | Status |
|---|------|--------|
| 1.1 | Seller registration — farm name, farm phone, personal phone, optional email, password, national ID | [x] |
| 1.2 | Buyer registration — email, phone, national ID, password | [x] |
| 1.3 | Admin login (separate /admin-login page) | [x] |
| 1.4 | JWT auth with protected routes | [x] |
| 1.5 | Role-based routing (RoleRouter → /seller, /buyer, /admin) | [x] |
| 1.6 | LangToggle on register page (Arabic/English switch) | [x] |
| 1.7 | Language switch from Settings page | [x] |
| 1.8 | National ID verification against Egyptian Civil Registry | [-] |

> **1.8 note:** Full structural validation implemented (format, date integrity, age ≥16,
> governorate code). Frontend shows ⏳/✅/❌ with extracted info (birth date, age, governorate).
> Backend has `POST /auth/verify-id` with duplicate-check + `verifyWithRegistry()` stub.
> Real EDA/Nafaz Civil Registry API call is ready to be plugged in at `backend/src/utils/egyptianId.js`
> line 114 when API credentials become available.

---

## 2. Seller — Livestock

| # | Task | Status |
|---|------|--------|
| 2.1 | SellerListings — view all own livestock with status badges | [x] |
| 2.2 | SellerAddListing — 5-step form (info, specs, documents, photos, price+delivery) | [x] |
| 2.3 | Price per kg input with auto-calculated total display | [x] |
| 2.4 | Delivery type: none / farm-handled / admin-handled | [x] |
| 2.5 | SellerEditListing — edit existing listing | [x] |
| 2.6 | Image upload (up to 5 photos, Multer) | [x] |

> **2.5 note:** Updated to use `pricePerKg` + auto-calculated total, and `deliveryType`
> enum (none/farm/admin) matching SellerAddListing.

---

## 3. Seller — Dairy Products

| # | Task | Status |
|---|------|--------|
| 3.1 | DairyProduct model (type, quantity, unit, pricePerUnit, dates, delivery, status) | [x] |
| 3.2 | Backend CRUD routes + controller for dairy | [x] |
| 3.3 | Admin approve/reject dairy endpoint | [x] |
| 3.4 | SellerDairy — list own dairy products with status/edit/delete | [x] |
| 3.5 | SellerAddDairy — form: type picker, name, qty+unit, price, dates, delivery, images | [x] |
| 3.6 | SellerEditDairy — pre-filled edit form with existing image management | [x] |

---

## 4. Seller — Expenses

| # | Task | Status |
|---|------|--------|
| 4.1 | Expense model + CRUD backend | [x] |
| 4.2 | SellerExpenses — log and view expenses | [x] |
| 4.3 | 9 expense categories: feed, doctor, transport, electricity, salary, rent, water, maintenance, other | [x] |
| 4.4 | Grouped select (livestock expenses / monthly farm expenses) | [x] |
| 4.5 | Monthly breakdown chart | [x] |
| 4.6 | Per-category total bar chart | [x] |

---

## 5. Seller — Income & Accounting Dashboard

| # | Task | Status |
|---|------|--------|
| 5.1 | Income model + CRUD backend (auto-created on order completion) | [x] |
| 5.2 | SellerIncome — list income entries | [x] |
| 5.3 | SellerDashboard — summary cards (total income, total expenses, net profit) | [x] |
| 5.4 | Full accounting dashboard: profit/loss by month, income vs expense overlay chart | [x] |
| 5.5 | Per-category expense breakdown on dashboard | [x] |
| 5.6 | Net profit trend over rolling 6 months | [x] |

> **5.3–5.6 note:** SellerDashboard already fully implements KPI cards (income, expenses,
> net profit, livestock count), dual-line income/expense chart, bar chart per category,
> period selectors, and activity feed. All accounting features were pre-built.

---

## 6. Buyer — Browse & Purchase

| # | Task | Status |
|---|------|--------|
| 6.1 | Farms-first browse (BuyerBrowse shows farm cards, not listings) | [x] |
| 6.2 | /api/sellers — list farms with listing/dairy counts and type chips | [x] |
| 6.3 | BuyerFarmDetail — farm banner, livestock + dairy tabs, order buttons | [x] |
| 6.4 | BuyerListingDetail — full listing detail page | [x] |
| 6.5 | BuyerOrders — list own orders with status | [x] |
| 6.6 | OrderModal — multi-step order placement | [x] |
| 6.7 | Payment method: Cash (COD) | [x] |
| 6.8 | Payment method: InstaPay (UI with transfer ref) | [x] |
| 6.9 | Payment method: Visa (future) | [ ] |
| 6.10 | OrderModal respects listing's deliveryType (none/farm/admin) | [x] |
| 6.11 | BuyerLayout nav label updated to Arabic "استعرض المزارع" | [x] |
| 6.12 | Order model — `deliveryLocation: { lat, lng, address }` stored on order | [x] |
| 6.13 | OrderModal step 3 — `LocationPicker` embedded under address form; pin auto-fills address field; `deliveryLocation` sent to `createOrder`; step 4 review shows GPS coordinates | [x] |

> **6.8 note:** InstaPay UI implemented — shows account number, transfer reference
> input, validates non-empty ref before submission. Real gateway integration is 9.10.
>
> **6.10 note:** Delivery options are dynamically built from `listing.deliveryType`.
> `'none'` → pickup only; `'farm'` → farm delivery with `deliveryCost`; `'admin'` →
> platform delivery. Cost stored in order notes alongside InstaPay ref.
>
> **6.12–6.13 note:** `deliveryLocation` is optional — only stored when buyer pins a
> location on the map. `orderController.createOrder` validates `lat`/`lng` before
> writing the embedded sub-document.

---

## 7. Admin Panel

| # | Task | Status |
|---|------|--------|
| 7.1 | AdminDashboard — overview stats | [x] |
| 7.2 | AdminListings — approve/reject livestock listings | [x] |
| 7.3 | AdminUsers — view/manage users | [x] |
| 7.4 | AdminOrders — view all orders | [x] |
| 7.5 | AdminDairy — approve/reject dairy products | [x] |
| 7.6 | Admin delivery management — set delivery cost for admin-handled deliveries | [x] |
| 7.7 | Admin marks admin-delivery orders as delivered | [x] |

> **7.5 note:** AdminDairy page built with tabs (all/pending/approved/rejected),
> approve button, inline reject form with reason, delete with confirmation modal.
> Backend `GET /dairy/admin/all` endpoint added to return all products regardless of status.
>
> **7.6–7.7 note:** Order model has `deliveryCost` + `deliveryStatus` (pending/in_transit/delivered).
> `PATCH /api/orders/:id/delivery` (admin-only). AdminOrders shows 📦 badge on admin-delivery
> orders and a delivery panel in the detail modal. BuyerOrders shows delivery cost and
> "قيد التسليم" progress stage when admin marks in_transit.

---

## 8. Layouts & Navigation

| # | Task | Status |
|---|------|--------|
| 8.1 | SellerLayout — collapsible sidebar with all nav links | [x] |
| 8.2 | BuyerLayout — top navbar with mobile drawer | [x] |
| 8.3 | AdminLayout — light/white sidebar (migrated from dark) | [x] |
| 8.4 | SellerLayout nav labels in Arabic | [x] |
| 8.5 | BuyerLayout "Browse Livestock" → "Browse Farms" (Arabic) | [x] |
| 8.6 | NotificationBell 🔔 with unread count badge in all three layouts | [x] |
| 8.7 | SellerLayout: كشف الحسابات nav link | [x] |
| 8.8 | BuyerLayout: المفضلة nav link | [x] |
| 8.9 | BuyerLayout: EidCountdownBanner between header and main content | [x] |
| 8.10 | SellerLayout: 🐾 إدارة القطيع nav link | [x] |

> **8.4–8.5 note:** SellerLayout now uses Arabic labels (الرئيسية, مواشيّ, إضافة إعلان,
> الألبان, المصروفات, الدخل, الإعدادات). BuyerLayout uses (استعرض المزارع, طلباتي, الإعدادات).
>
> **8.6 note:** NotificationBell component polls unread count every 30s, opens a
> dropdown panel, marks notifications read on click, and navigates to the linked page.

---

## 9. Backend Infrastructure

| # | Task | Status |
|---|------|--------|
| 9.1 | Express app + middleware (CORS, JSON, Multer) | [x] |
| 9.2 | MongoDB connection + Mongoose models (User, Listing, Expense, Income, Order, DairyProduct, Review, Notification, Animal, Supply, AppConfig) | [x] |
| 9.3 | JWT auth middleware (protect, authorizeRoles, optionalAuth) | [x] |
| 9.4 | Routes: /api/auth, /api/listings (incl. dedicated GET /my before /:id), /api/orders, /api/finance, /api/admin, /api/dairy, /api/sellers, /api/statements, /api/reviews, /api/notifications, /api/favorites, /api/market-prices, /api/eid, /api/animals, /api/supplies | [x] |
| 9.5 | express-validator on all mutation routes | [x] |
| 9.6 | Sparse unique indexes for optional-but-unique fields (email, nationalId, phones) | [x] |
| 9.7 | Image upload via Multer (local /uploads folder) | [x] |
| 9.8 | Image storage migration to cloud (S3 / Cloudinary) | [ ] |
| 9.9 | National ID verification API integration | [-] |
| 9.10 | InstaPay payment gateway integration | [ ] |

---

## 10. Frontend Infrastructure

| # | Task | Status |
|---|------|--------|
| 10.1 | Vite + React setup | [x] |
| 10.2 | React Router v6 with nested routes | [x] |
| 10.3 | AuthContext (login, logout, user state) | [x] |
| 10.4 | LangContext (useLang, t() i18n helper) with Arabic/English | [x] |
| 10.5 | Toast notification system | [x] |
| 10.6 | ProtectedRoute + RoleRouter guards | [x] |
| 10.7 | Services layer (api.js + per-domain service files) | [x] |
| 10.8 | format.js utils (fmt numbers, getImageUrl) | [x] |
| 10.9 | `LocationPicker` component — `useGoogleMaps` hook (dynamic JS API script loader), draggable pin, map click, geolocation button, reverse geocoding via Geocoder API, `onChange({lat,lng,address})` callback; no-key fallback message | [x] |
| 10.10 | `StaticMap` component — display-only Google Maps `<iframe>` embed; no API key required; accepts `lat`, `lng`, `address`, `height`, `zoom` | [x] |

---

---

## 11. Financial Statement Sheet

| # | Task | Status |
|---|------|--------|
| 11.1 | Backend `/api/statements` endpoint — monthly P&L aggregation (income + expenses by category) | [x] |
| 11.2 | SellerStatements page — monthly table with rows per category, columns per month | [x] |
| 11.3 | Year / quarter filter on statements page | [x] |
| 11.4 | Color-coded cells (green profit / red loss months) | [x] |
| 11.5 | Export to CSV (UTF-8 BOM for Arabic in Excel) | [x] |
| 11.6 | Export to PDF (print-friendly layout) | [x] |
| 11.7 | Drill-down: click cell → see individual transactions for that month/category | [x] |

---

## 12. Ratings & Reviews

| # | Task | Status |
|---|------|--------|
| 12.1 | Review model (buyer, seller, order, rating 1–5, comment, createdAt) | [x] |
| 12.2 | Backend: POST /api/reviews, GET /api/reviews/:sellerId, DELETE (admin) | [x] |
| 12.3 | Seller aggregate rating stored/updated on User model (averageRating, reviewCount) | [x] |
| 12.4 | BuyerOrders — "⭐ تقييم" button + ReviewModal after order completed | [x] |
| 12.5 | BuyerFarmDetail — reviews section + seller star badge in header | [x] |
| 12.6 | BuyerBrowse farm cards — star display + review count (from seller averageRating) | [x] |
| 12.7 | "موثوق" trusted badge on BuyerBrowse cards for sellers with avg ≥ 4.5 stars | [x] |
| 12.8 | Admin: delete flagged reviews UI | [x] |

---

## 13. Eid Al-Adha Module

| # | Task | Status |
|---|------|--------|
| 13.1 | Eid countdown banner (EidCountdownBanner) — polls /api/eid/config, shows when eidMode=true OR ≤30 days to eidDate; days:hrs:min countdown | [x] |
| 13.2 | Listing model: `eidAvailable` boolean + `slaughterService` boolean + `slaughterCost` number | [x] |
| 13.3 | SellerAddListing / SellerEditListing — Eid options in step 5 (eidAvailable + slaughterService + slaughterCost) | [x] |
| 13.4 | BuyerBrowse — 🌙 "عروض العيد" tab with EidListingCard grid; auto-activates on ?eid=1 | [x] |
| 13.5 | Pre-booking with deposit supported for Eid listings | [x] |
| 13.6 | AdminDashboard — Eid Settings card: eidMode toggle + eidDate picker, PATCH /api/eid/config | [x] |

---

## 14. Herd Management

| # | Task | Status |
|---|------|--------|
| 14.1 | Animal model — seller, tagId (sparse unique/seller), type, breed, dob, gender, color, currentWeight, healthStatus, status, notes, images | [x] |
| 14.2 | WeightEntry embedded array (date, weightKg, notes); currentWeight mirrors latest entry | [x] |
| 14.3 | VaccinationEntry embedded array (vaccine, date, nextDueDate, vet, notes) | [x] |
| 14.4 | Backend `/api/animals` CRUD + `/weight` POST/DELETE + `/vaccination` POST/DELETE + `/summary` aggregate | [x] |
| 14.5 | SellerHerd — grid of AnimalCard with search, type filter, status filter (نشط/مُباع/متوفي/الكل), shimmer skeleton | [x] |
| 14.6 | SellerAddAnimal — type picker, breed/tagId, gender toggle, DOB, weight, color, health status, photo upload | [x] |
| 14.7 | SellerAnimalDetail — tabs: 📈 النمو (SVG weight chart), 💉 التطعيمات (timeline + add form), 📋 معلومات | [x] |
| 14.8 | "عرض للبيع" button on SellerAnimalDetail → navigate to /seller/listings/add?type=&breed=&weight=; SellerAddListing reads params on init | [x] |
| 14.9 | Herd summary strip (total, avg age, avg weight, count by type) via GET /animals/summary | [x] |
| 14.10 | Vaccination due reminders widget on SellerDashboard — shows vaccinations due within 14 days | [x] |

---

## 15. Price Benchmarking

| # | Task | Status |
|---|------|--------|
| 15.1 | Backend `/api/market-prices` — avg/min/max pricePerKg grouped by animal type (last 90 days) | [x] |
| 15.2 | SellerAddListing + SellerEditListing — "متوسط السوق" hint bar in price step | [x] |
| 15.3 | BuyerListingDetail — "السعر مقارنةً بالسوق" badge (below / fair / above) | [x] |
| 15.4 | AdminDashboard — price trends chart per animal type (last 3 months) | [x] |
| 15.5 | Governorate-level price breakdown (optional `?governorate=` query param in endpoint) | [x] |

---

## 16. In-App Notifications

| # | Task | Status |
|---|------|--------|
| 16.1 | Notification model (user, type, title, message, read, link, 90-day TTL) | [x] |
| 16.2 | Backend: GET /api/notifications, unread-count, read-all, :id/read | [x] |
| 16.3 | Notification triggers: order placed → seller; confirmed/cancelled/completed → buyer | [x] |
| 16.4 | Notification triggers: listing/dairy approved or rejected → seller | [x] |
| 16.5 | Notification triggers: new pending listing/dairy → all admins | [x] |
| 16.6 | Bell icon 🔔 with unread count badge in SellerLayout, BuyerLayout, AdminLayout | [x] |
| 16.7 | Notification dropdown panel (latest 50, mark all read, per-item read + navigate) | [x] |

---

## 17. Saved Favorites & Advanced Filters

| # | Task | Status |
|---|------|--------|
| 17.1 | Backend: POST/DELETE /api/favorites/:sellerId, GET /api/favorites (buyer-only) | [x] |
| 17.2 | User model: `savedFarms` array of seller ObjectIds | [x] |
| 17.3 | BuyerBrowse — ❤️/🤍 heart icon on farm cards, toggles save/unsave | [x] |
| 17.4 | /buyer/favorites page — list of saved farms with navigate + remove | [x] |
| 17.5 | BuyerBrowse — governorate filter dropdown (all 27 Egyptian governorates) | [x] |
| 17.6 | BuyerBrowse — animal type chips filter | [x] |
| 17.7 | BuyerBrowse — price range filter (min/max ج.م/kg) | [x] |
| 17.8 | BuyerBrowse — sort: newest / highest rated / most listings | [x] |
| 17.9 | "جديد اليوم" badge on farm cards (backend returns newestListingAt) | [x] |

---

## 18. Feed & Supply Marketplace

| # | Task | Status |
|---|------|--------|
| 18.1 | Supply model (seller, name, category, description, quantity, unit, pricePerUnit, minOrderQty, location, deliveryAvailable, deliveryCost, images, status, rejectionReason) | [x] |
| 18.2 | Backend `/api/supplies` CRUD routes + admin approve/reject + role-filtered GET | [x] |
| 18.3 | SellerSupplies — list own supply listings with status badges, edit/delete | [x] |
| 18.4 | SellerAddSupply — category picker, name, qty+unit chips, price, delivery toggle, photo upload | [x] |
| 18.5 | SellerEditSupply — pre-filled edit form with kept/new image management | [x] |
| 18.6 | BuyerBrowse — 🛒 المستلزمات tab with SupplyCard grid, search + category filter, lazy-load | [x] |
| 18.7 | BuyerSupplyDetail — product detail: image gallery, price block, delivery info, seller card, contact CTA | [x] |
| 18.8 | AdminSupplies — approve/reject supply listings with tabs (pending/approved/rejected/all) and modal | [x] |
| 18.9 | SellerLayout: 🛒 مستلزماتي nav link | [x] |
| 18.10 | AdminLayout: 🛒 Supplies nav link | [x] |

---

---

## 19. Admin Panel Light Theme

| # | Task | Status |
|---|------|--------|
| 19.1 | AdminLayout — migrate S tokens to white/light palette | [x] |
| 19.2 | AdminDashboard — C tokens, AKIND, SVG chart colors, skeleton, revenue strip, box shadows | [x] |
| 19.3 | AdminListings — C tokens, shimmer, row hover, filter buttons, sort arrows | [x] |
| 19.4 | AdminUsers — C tokens, profile drawer, toggle/delete modals, shimmer, tab bars | [x] |
| 19.5 | AdminOrders — C/STATUS/PAYMENT/DELIVERY_STATUS tokens, timeline, inputs, shimmer, date pickers | [x] |
| 19.6 | AdminDairy — C tokens, STATUS, shimmer, sort arrows, filter buttons | [x] |
| 19.7 | AdminSupplies — C tokens (full rename from dark keys), skeleton, tab bar, modal | [x] |

---

## 20. Settings Page Redesign

| # | Task | Status |
|---|------|--------|
| 20.1 | Arabic-only labels throughout (removed bilingual text) | [x] |
| 20.2 | Role-aware profile fields: seller sees farm fields; buyer sees phone | [x] |
| 20.3 | 27 Egyptian governorates in region selector (replaced Saudi/Gulf) | [x] |
| 20.4 | Password strength bar (weak/medium/strong) + show/hide toggle per field | [x] |
| 20.5 | InstaPay added to payment section; Visa "قريباً" badge | [x] |
| 20.6 | User mini card in sidebar nav with role badge | [x] |
| 20.7 | Arabic-only FAQ with Egyptian context | [x] |
| 20.8 | Backend: `PUT /api/auth/profile` — role-aware field update with uniqueness checks | [x] |
| 20.9 | Backend: `PUT /api/auth/password` — verify current password before updating | [x] |

---

## 21. Livestock Management Enhancements

| # | Task | Status |
|---|------|--------|
| 21.1 | Animal model: add pregnancyStatus (none/pregnant/recently_gave_birth), pregnancyDate, expectedBirthDate, birthCount | [x] |
| 21.2 | Listing model: add qurbaniShares array (shareType: seventh/quarter/half, pricePerShare, totalShares, bookedShares) | [x] |
| 21.3 | SellerAddAnimal — pregnancy section for female animals (status chips + date inputs + birth count) | [x] |
| 21.4 | SellerAnimalDetail — pregnancy banner, "🤰 تحديث الحمل" button, inline edit panel, info tab fields | [x] |
| 21.5 | SellerHerd — pregnancy indicator chips on AnimalCard (🤰 حامل / 🐣 وضعت مؤخرًا) | [x] |
| 21.6 | SellerAddListing / SellerEditListing — Qurbani shares UI in Eid section (seventh/quarter/half, price + count per share type) | [x] |
| 21.7 | BuyerListingDetail — Qurbani shares card with progress bars and availability count before CTA | [x] |
| 21.8 | BuyerBrowse EidListingCard — share availability chips (amber available / grey sold-out) | [x] |
| 21.9 | Backend: animalController — whitelist pregnancyStatus/pregnancyDate/expectedBirthDate/birthCount in PUT; listingController — parse qurbaniShares JSON in create + update | [x] |

---

---

## 22. Advanced Accounting & Finance System

| # | Task | Status |
|---|------|--------|
| 22.1 | Advanced P&L table with filter by animal type, expense category, and date range | [x] |
| 22.2 | Budget planning module — set monthly/yearly budget targets per category and track vs actual | [x] |
| 22.3 | Per-animal-type cost breakdown (feed cost per cattle vs sheep, etc.) | [x] |
| 22.4 | PDF export for statements (print-friendly layout, Arabic RTL) | [x] |
| 22.5 | Income vs expense comparison chart with trend line | [x] |
| 22.6 | Farm-level revenue analytics: total livestock sold, avg price, best-performing animal type | [x] |
| 22.7 | Financial filters: farm / animal type / date range / expense category (all combinable) | [x] |
| 22.8 | Net profit margin % calculation per month/year | [x] |
| 22.9 | Drill-down: click any month cell → list individual transactions for that category/month | [x] |

> **Note:** Builds on existing section 11 (SellerStatements). Expense categories already include feed, water, electricity, workers, rent, veterinary, transportation, miscellaneous (mapped to existing 9 categories). New filters and visualizations are the main additions.

---

## 23. Livestock Medical Records

| # | Task | Status |
|---|------|--------|
| 23.1 | MedicalRecord model: animal ref, date, diagnosis, treatment, medication, vet, cost, followUpDate, notes | [x] |
| 23.2 | Backend `/api/animals/:id/medical` — POST (add record), GET (list), PATCH, DELETE | [x] |
| 23.3 | SellerAnimalDetail — 🏥 السجل الطبي tab: add form + timeline of treatments | [x] |
| 23.4 | Medical cost auto-linked to Expense model (category: 'doctor') so it appears in accounting | [x] |
| 23.5 | Follow-up date reminders: if followUpDate is set and approaching (≤7 days), show alert on SellerDashboard | [x] |
| 23.6 | SellerHerd AnimalCard — show 🏥 medical badge if animal has unresolved follow-up | [x] |

---

## 24. Growth & Weight Reminder System

| # | Task | Status |
|---|------|--------|
| 24.1 | Animal model: add `nextWeighingDate` field (date seller sets for next weight check) | [x] |
| 24.2 | SellerAnimalDetail weight tab — WeightGoalEditor: next weighing date picker + target weight input | [x] |
| 24.3 | Backend: scheduled job (node-cron) — daily scan for animals with nextWeighingDate ≤ today; create notification for seller | [x] |
| 24.4 | SellerDashboard — weighing reminders widget (animals due ≤7 days via GET /animals/weighing-due) | [x] |
| 24.5 | Weight milestone alert: when new weight is logged and is ≥ target weight (if set), notify seller | [x] |
| 24.6 | Animal model: add `targetWeight` field (target weight for sale-readiness) | [x] |
| 24.7 | SellerAnimalDetail weight tab — WeightGoalEditor shows target vs current progress bar | [x] |

---

## 25. Farm Profile Enhancements

| # | Task | Status |
|---|------|--------|
| 25.1 | Seller User model: add farmDescription, farmBanner (image path) | [x] |
| 25.2 | Settings page (seller) — farm description textarea, banner image upload with preview | [x] |
| 25.3 | BuyerFarmDetail — farm banner overlay on header gradient + "عن المزرعة" description card | [x] |
| 25.4 | /api/sellers and /api/sellers/:id — return farmDescription, farmBanner in projection | [x] |
| 25.5 | Farm certificates/credentials display on BuyerFarmDetail (e.g. "بيطري معتمد", "منشأة مرخصة") | [x] |
| 25.6 | Farm availability hours / working days shown on BuyerFarmDetail | [x] |
| 25.7 | Seller User model — `farmLocation: { lat, lng, address }` sub-document | [x] |
| 25.8 | Settings page (seller) — `LocationPicker` under banner section to pin farm location; serialised as JSON string in FormData; "✕ إزالة الموقع" clear button; `farmLocation` included in both JSON + FormData save paths | [x] |
| 25.9 | BuyerFarmDetail — "📍 موقع المزرعة" card with `StaticMap` iframe when `seller.farmLocation.lat` present; `/api/sellers` projection updated to include `farmLocation` | [x] |

---

## 26. Shopping Cart & Enhanced Checkout

| # | Task | Status |
|---|------|--------|
| 26.1 | CartContext — client-side cart (items: listingId, qty, price snapshot) | [x] |
| 26.2 | Cart icon in BuyerLayout with item count badge | [x] |
| 26.3 | BuyerCart page — cart summary, remove items, total | [x] |
| 26.4 | Checkout flow: cart → address/delivery → payment → confirm | [x] |
| 26.5 | Multi-item order support on backend (Order model: items array) | [x] |
| 26.6 | Order confirmation page with order number | [x] |
| 26.7 | BuyerOrders — group order items in detail view | [x] |

> **Note:** Current OrderModal handles single-item orders. Cart system adds multi-item support. Backend Order model will need `items` array field alongside existing single-listing fields for backwards compatibility.

---

## 27. Dairy Stock Management

| # | Task | Status |
|---|------|--------|
| 27.1 | DairyProduct model: add `stockLog[]` (date, quantity, note) for daily stock updates | [x] |
| 27.2 | SellerDairy — "تحديث المخزون" quick button per product → opens stock update modal | [x] |
| 27.3 | Stock history view per dairy product | [x] |
| 27.4 | Low-stock alert: notify seller when quantity drops below `minStockAlert` threshold | [x] |
| 27.5 | Expiry date alert: notification when product expiry is within 3 days | [x] |
| 27.6 | BuyerFarmDetail dairy tab — show expiry date and stock availability clearly | [x] |

---

## 28. Scheduled Notifications & Reminders (Backend Cron)

| # | Task | Status |
|---|------|--------|
| 28.1 | Install node-cron; create `scheduler.js` loaded from server.js (after DB connect) | [x] |
| 28.2 | Daily job: vaccinations due ≤3 days → notification to seller | [x] |
| 28.3 | Daily job: weighing due ≤1 day → notification to seller | [x] |
| 28.4 | Daily job: pregnancy expectedBirthDate ≤7 days → notification to seller | [x] |
| 28.5 | Daily job: dairy expiry ≤3 days → notification to seller | [x] |
| 28.6 | Daily job: medical follow-up date ≤3 days → notification to seller | [x] |
| 28.7 | Notification types added to Notification model for new trigger types | [x] |

---

## 29. Mobile Responsiveness & UI Polish

| # | Task | Status |
|---|------|--------|
| 29.1 | Responsive grid breakpoints across SellerHerd, SellerListings, BuyerBrowse | [x] |
| 29.2 | Touch-friendly button sizes (min 44px tap target) on mobile | [x] |
| 29.3 | SellerLayout sidebar — full-screen mobile drawer with close button | [x] |
| 29.4 | BuyerBrowse filter panel — bottom sheet on mobile | [x] |
| 29.5 | Arabic typography improvements: proper line-height, letter-spacing, font weights | [x] |
| 29.6 | Consistent spacing system (4px base grid) across all seller/buyer/admin pages | [x] |
| 29.7 | Loading skeleton consistency — all list/grid pages use same SK animation | [x] |
| 29.8 | Empty states — consistent illustration/icon + Arabic copy across all pages | [x] |

---

## 30. Future-Ready Infrastructure

| # | Task | Status |
|---|------|--------|
| 30.1 | Visa/Mastercard payment gateway (Fawry / PayMob integration) | [ ] |
| 30.2 | QR code generation per animal (links to listing public URL via qrserver.com) | [x] |
| 30.3 | AdminDashboard — advanced analytics: revenue by governorate bar chart | [x] |
| 30.4 | Live livestock auction module (bidding, countdown timer, reserve price) | [ ] |
| 30.5 | Multi-branch farm support (seller can have multiple farm locations) | [ ] |
| 30.6 | AI recommendations: suggest optimal sale price based on market data + animal age/weight | [ ] |
| 30.7 | Inventory management: link Herd Management to Listing availability (auto-mark sold when order completes) | [x] |
| 30.8 | Public API / webhook for third-party farm management integrations | [ ] |
| 30.9 | Cloud image storage migration (S3 / Cloudinary) to replace local /uploads | [ ] |

---

## 31. Flutter Mobile App (farmflow_mobile/)

> **Stack:** Flutter 3 · Riverpod · GoRouter · Dio · fl_chart · cached_network_image
> **Target:** iOS + Android · Arabic RTL · Cairo font

### Sprint 1 — Foundation (complete)

| # | Task | Status |
|---|------|--------|
| M1.1 | pubspec.yaml — all dependencies (riverpod, go_router, dio, fl_chart, image_picker, etc.) | [x] |
| M1.2 | AppColors, AppTheme, Cairo font assets | [x] |
| M1.3 | ApiClient (Dio + Bearer token interceptor + 401 clear) | [x] |
| M1.4 | ApiEndpoints — all route strings | [x] |
| M1.5 | TokenStorage (flutter_secure_storage) | [x] |
| M1.6 | AuthRepository + AuthNotifier (login / register / logout / refresh) | [x] |
| M1.7 | SplashScreen → auto-login flow | [x] |
| M1.8 | LoginScreen | [x] |
| M1.9 | RegisterRoleScreen → BuyerRegisterScreen + SellerRegisterScreen | [x] |
| M1.10 | GoRouter with auth redirect; buyer 4-tab shell + seller 4-tab shell | [x] |
| M1.11 | AppShell (BuyerShell + SellerShell bottom nav bars) | [x] |
| M1.12 | Shared widgets: ShimmerBox/Card/List, EmptyState, PrimaryButton, AppTextField, StatusBadge, ConfirmDialog | [x] |

### Sprint 2 — Buyer App (complete)

| # | Task | Status |
|---|------|--------|
| M2.1 | Shared models: SellerSummaryModel, ListingModel, DairyProductModel, SupplyModel, OrderModel, ReviewModel, NotificationModel, UserModel | [x] |
| M2.2 | SellersService — allSellersProvider, sellersFilterProvider, filteredSellersProvider | [x] |
| M2.3 | BuyerHomeScreen — search bar, filter FAB, tabs (🌾 مزارع / 🌙 عيد), FarmCard grid, EidFarmTile list | [x] |
| M2.4 | FilterSheet — governorate chips + animal type chips, reset | [x] |
| M2.5 | FarmDetailScreen — SliverAppBar banner, header card (rating/certs/phone), 4-tab: مواشي / ألبان / مستلزمات / تقييمات | [x] |
| M2.6 | FarmDetailService — fetches seller + listings + dairy + supplies (with graceful fallback) | [x] |
| M2.7 | ListingDetailScreen — image gallery, specs, price badge, OrderModal | [x] |
| M2.8 | OrderModal — payment selector (COD/InstaPay/deposit), notes, submit | [x] |
| M2.9 | OrdersScreen — list buyer orders with status chips | [x] |
| M2.10 | FavoritesScreen — saved farms list | [x] |
| M2.11 | BuyerProfileScreen — view profile, logout | [x] |
| M2.12 | NotificationsScreen — list + mark read | [x] |
| M2.13 | M4.6 — Supplies tab in FarmDetailScreen (_SuppliesTab with SupplyCard) | [x] |
| M2.14 | M6.7 — Add-review bottom sheet in reviews tab (star selector + comment + POST /reviews) | [x] |

### Sprint 3 — Seller App (complete)

| # | Task | Status |
|---|------|--------|
| M3.1 | SellerDashboardScreen — KPI cards (income/expenses/profit from /finance/summary), follow-ups due widget (rose), recent orders list | [x] |
| M3.2 | SellerListingsScreen — horizontal status filter (all/pending/approved/sold/rejected), listing cards with image/status badge | [x] |
| M3.3 | SellerListingsService — myListingsProvider (GET /listings/my) | [x] |
| M3.4 | HerdScreen — type filter bar, summary strip (total/male/female/pregnant), animal cards with 🏥/🤰/🐣 badges | [x] |
| M3.5 | HerdService — AnimalModel, AnimalSummary, myAnimalsProvider, animalSummaryProvider | [x] |
| M3.6 | StatementsScreen — 3 tabs: ملخص (totals card + grouped bar chart fl_chart), مصروفات (category breakdown + rows), إيرادات (total header + rows) | [x] |
| M3.7 | FinanceService — FinanceSummary/MonthlyPoint, financeSummaryProvider, recentExpensesProvider, recentIncomeProvider | [x] |

### Sprint 4 — Seller Forms & Detail Screens (complete)

| # | Task | Status |
|---|------|--------|
| M4.1 | AddAnimalScreen — type picker (8 types), gender chips, date picker, tag/breed/weight/color/notes, POST /animals | [x] |
| M4.2 | AnimalDetailScreen — NestedScrollView + SliverAppBar; Tab 1: LineChart weight history + add-weight sheet; Tab 2: vaccination timeline + add-vac sheet; Tab 3: medical records + add-med sheet | [x] |
| M4.3 | AddListingScreen — type picker, breed+age fields, weight+price (required), delivery RadioListTile, Eid toggles (eidAvailable + slaughterService), description, POST /listings | [x] |
| M4.4 | SellerDairyScreen — list with status badge + delete; AddDairySheet bottom sheet (type picker, name, qty+unit dropdown, price, delivery) | [x] |
| M4.5 | SellerSuppliesScreen — list with category color/emoji + status badge + delete; AddSupplySheet bottom sheet (category picker, name, qty, unit, price, delivery) | [x] |
| M4.6 | DairyService (myDairyProvider, createDairy, deleteDairy) + SuppliesService (mySuppliesProvider, createSupply, deleteSupply) + AnimalDetailService (animalDetailProvider.family, animalMedicalProvider.family) | [x] |
| M4.7 | Router: /seller/herd/add, /seller/herd/:id, /seller/listings/add, /seller/dairy, /seller/supplies | [x] |
| M4.8 | HerdScreen FAB → AddAnimalScreen; animal cards tappable → AnimalDetailScreen; ListingsScreen FAB → AddListingScreen; Dashboard quick-access row (dairy + supplies) | [x] |
| M4.9 | flutter analyze: 0 errors (fixed 5× TextDirection.rtl + 1 unused import) | [x] |

### Sprint 5 — Edit Flows & Profile (complete)

| # | Task | Status |
|---|------|--------|
| M5.1 | EditAnimalScreen — loads from animalDetailProvider(id) in initState; tag+birthDate read-only; type picker, gender, breed, weight, color, notes; PUT /animals/:id; invalidates myAnimals + animalDetail | [x] |
| M5.2 | EditListingScreen — accepts ListingModel via GoRouter extra; pre-fills all fields; type picker, delivery radio, Eid toggles, PUT /listings/:id | [x] |
| M5.3 | AnimalDetailScreen — edit ✏️ icon in SliverAppBar actions → /seller/herd/:id/edit | [x] |
| M5.4 | SellerListingsScreen — edit icon on non-sold listing cards → /seller/listings/:id/edit (extra: listing) | [x] |
| M5.5 | BuyerProfileScreen — "تعديل الملف الشخصي" opens _EditProfileSheet (name, phone, governorate dropdown 27 gov, PUT /auth/profile + updateUser); "تغيير كلمة المرور" opens _ChangePasswordSheet (current+new+confirm, show/hide toggles, PUT /auth/password) | [x] |
| M5.6 | Router: /seller/herd/:id/edit (EditAnimalScreen), /seller/listings/:id/edit (EditListingScreen via extra) | [x] |
| M5.7 | flutter analyze: 0 errors | [x] |

### Sprint 6 — Image Upload & Admin Foundation (complete)

| # | Task | Status |
|---|------|--------|
| M6.1 | Image picker on AddAnimalScreen / EditAnimalScreen (image_picker → multipart POST /animals) | [x] |
| M6.2 | Image picker on AddListingScreen / EditListingScreen (image_picker → multipart POST /listings) | [x] |
| M6.3 | Push notifications (FCM token registration on login, foreground/background display) | [x] |
| M6.4 | Offline graceful degradation (cached data when network unavailable) | [ ] |
| M6.5 | Admin screens — stats dashboard, user management, listing/supply approval | [x] |

> **M6.1–M6.2:** `ImagePickerGrid` shared widget (gallery + camera, up to 5 images, thumbnails with × remove). All 4 add/edit screens use FormData multipart upload when images are selected, plain JSON otherwise.
>
> **M6.5:** `AdminDashboardScreen` (KPI cards + pending counts with revenue gradient), `AdminListingsScreen` (approve/reject with optional rejection reason), `AdminUsersScreen` (role filter chips + search + animated isActive toggle). `_AdminShell` 3-tab BottomNavigationBar added to AppShell. All admin routes in GoRouter.
>
> **M6.3 done (Sprint 14):** Firebase project `farmflow-d049d` configured; `FcmService` handles permission, token registration, foreground SnackBar, background deep-link routing. See Sprint 14 below.
>
> **M6.4 deferred:** Online-first is acceptable for v1; offline caching is a v2 item.

### Sprint 7 — Admin Full Panel (complete)

| # | Task | Status |
|---|------|--------|
| M7.1 | AdminDairyScreen — all dairy products (GET /dairy/admin/all), filter pending/approved/all, POST /dairy/:id/approve, DELETE /dairy/:id | [x] |
| M7.2 | AdminOrdersScreen — all orders (GET /orders), status filter tabs (all/pending/confirmed/completed/cancelled), PUT /orders/:id/status, PATCH /orders/:id/delivery (cost + delivery status) | [x] |
| M7.3 | AdminReviewsScreen — all reviews (GET /reviews/admin/all), DELETE /reviews/:id with confirm dialog | [x] |
| M7.4 | AdminEidScreen — GET/PATCH /eid/config, eidMode toggle + DatePicker (Arabic locale) | [x] |
| M7.5 | Admin nav expanded to 5 tabs: الرئيسية / الإعلانات / الطلبات / الألبان / المستخدمون | [x] |
| M7.6 | Dashboard quick-actions row: التقييمات → /admin/reviews, إعدادات العيد → /admin/eid | [x] |
| M7.7 | ApiEndpoints: adminDairyAll, adminApproveDairy, adminAllReviews, reviewById, orderDelivery | [x] |

> **M7.5:** `_AdminShell` expanded from 3 to 5 BottomNavigationBar tabs. Dairy pending card on dashboard now routes to `/admin/dairy` instead of `/admin/listings`. Reviews and Eid accessible via quick-actions section at the bottom of the dashboard.
>
> **M7.3:** Reviews delete calls `DELETE /reviews/:id` (admin role). All review data shown: star rating, buyer name, seller farm, comment preview, creation date.
>
> **M7.2:** Delivery panel is collapsible per order card — shows delivery status chips (لم يُشحن / في الطريق / تم التسليم) and cost field; pre-populated from existing order data.

---

## Current Status Summary (as of 2026-05-01)

> **Web app:** All sections 1–30 complete except items requiring external credentials.
> **Backend:** Live on Render at `https://farmflow-backend-g07p.onrender.com` (free tier — spins down after 15 min inactivity). MongoDB Atlas M0 cluster at `cluster0.mr7xjcy.mongodb.net` (Ireland, free forever).
> **Flutter app:** Sprints 1–15 complete. Full buyer/seller/admin flows, PDF/CSV export, NID validation, infinite scroll, 68 passing tests, FCM push notifications, signed APK/AAB + iOS archive. APK rebuilt with Render URL. Remaining: store listings (Play/App Store accounts), Apple provisioning profile for signed IPA, server-side push triggers, Cloudinary for image storage.

**Fully complete (web):** 1 (1.1–1.7), 2, 3, 4, 5, 6 (6.1–6.8, 6.10–6.13), 7, 8, 9 (9.1–9.7), 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30 (30.2, 30.3, 30.7)

**Fully complete (Flutter — Sprints 1–14):**
- **Sprint 1** — foundation, theme, auth flow, GoRouter, AppShell (buyer + seller + admin tabs)
- **Sprint 2** — buyer browse/filters, farm detail (4 tabs), listing detail + order modal, orders, favorites, profile, notifications, add-review sheet
- **Sprint 3** — seller dashboard (KPIs + follow-ups + recent orders), listings screen, herd screen (type filter + summary strip + badges), statements screen (3 tabs + fl_chart), finance/herd/listing services
- **Sprint 4** — add animal, animal detail (LineChart + vaccinations + medical tabs), add listing, dairy screen, supplies screen, all detail services, FABs wired, dashboard quick-access
- **Sprint 5** — edit animal (pre-filled from provider), edit listing (GoRouter extra), buyer profile edit (27-gov dropdown + change password), router routes for all edit screens
- **Sprint 6** — `ImagePickerGrid` widget, image picker in all 4 add/edit forms (FormData multipart), admin dashboard + listings approval + users management, `_AdminShell` 3-tab nav
- **Sprint 7** — `AdminDairyScreen` (approve/delete), `AdminOrdersScreen` (status filter + delivery), `AdminReviewsScreen` (delete), `AdminEidScreen` (toggle + date picker); admin nav 5 tabs
- **Sprint 8** — `ContactButtons` (WhatsApp/Call/Copy, Egyptian phone normalisation); `HapticFeedback` in buttons + CTAs; Android `<queries>` + iOS `LSApplicationQueriesSchemes`
- **Sprint 9** — global Dio error snackbar, image compression, ShimmerFill placeholders, AppBottomSheet, Hero animations, form auto-scroll, GovPickerSheet, flutter_dotenv, launcher icons + splash config
- **Sprint 10** — SupplyCard 3rd tab + `/buyer/supply/:id` route; expense drill-down sheet; CSV export; ConnectivityWidget; AR↔EN locale toggle; all edit/delete flows confirmed
- **Sprint 11** — M11.8 PDF export (A4 RTL, Cairo font, KPI strip + tables, share via `Printing.sharePdf`); M3.6 National ID validation (`parseNationalId`, live `_NationalIdInfoCard` in both register screens)
- **Sprint 12** — M21.1 client-side infinite scroll: `HerdScreen` (15-item batches), `SellerListingsScreen` (10-item batches), `BuyerHomeScreen._FarmsTab` (12-item batches, `CustomScrollView`+`SliverGrid`); backend `GET /api/animals` + `GET /api/listings` extended with optional `?page&limit` server-side pagination (backwards-compatible)
- **Sprint 13** — M22 unit/widget tests: 68/68 passing (`test/unit/national_id_util_test.dart` 21 cases, `test/unit/model_helpers_test.dart` 20 cases, `test/widget/empty_state_test.dart` 5 cases, `test/widget/status_badge_test.dart` 19 cases, `test/widget_test.dart` RTL + smoke)
- **Sprint 14** — M16.x FCM: Firebase project `farmflow-d049d` configured; `firebase_core` + `firebase_messaging` added; `FcmService` handles permission, token → `PATCH /auth/fcm-token`, foreground SnackBar, background deep-link routing; backend `fcmToken` field on User model
- **Sprint 15** — M23 Release: icons + splash generated (`flutter_launcher_icons` + `flutter_native_splash`); Android PKCS12 keystore + `build.gradle.kts` signing config + ProGuard; `app-release.apk` (30 MB) + `app-release.aab` (49 MB) signed and built; iOS `Runner.xcarchive` built (unsigned, ready for Xcode Organizer signing); iOS display name fixed to "FarmFlow"; post-release: APK rebuilt after icon timestamp mismatch (icons were generated 4 min after original APK); `android:usesCleartextTraffic="true"` added to manifest; `.env` API URL changed from `10.0.2.2` (emulator alias) to `192.168.1.10` (Mac local WiFi IP) for real-device testing; redistributed via Firebase App Distribution

**Blocked on external credentials (web):**
- 1.8 / 9.9 — Egyptian Civil Registry API (EDA/Nafaz)
- 6.9 / 30.1 — Visa/Mastercard gateway (Fawry/PayMob)
- 9.10 — Real InstaPay gateway
- 9.8 / 30.9 — Cloud image storage (S3/Cloudinary)
- 30.4 — Live auctions
- 30.5 — Multi-branch farms
- 30.6 — AI price recommendations
- 30.8 — Public API/webhooks

**Remaining Flutter items:**
- M23.8–M23.9 — Google Play + App Store store listings (needs developer accounts + screenshots)
- M23.3 / M23.7 — iOS signed IPA export (needs Apple Developer team + provisioning profile in Xcode Organizer)
- Cloud image storage — `/uploads` is ephemeral on Render; migrate to Cloudinary (images lost on redeploy)
- Cloud image storage — `/uploads` is ephemeral on Render; migrate to Cloudinary (images lost on redeploy)
- `flutter analyze`: 0 errors, 0 warnings (2 pre-existing style infos in auth screens)
