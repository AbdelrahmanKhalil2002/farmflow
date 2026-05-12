The app should ultimately have three types of users.

1. Merchant (Farm Owner)
   When the merchant registers, they should enter:

* Farm name
* Farm phone number
* Personal phone number
* Optional email address
* Password
* National ID number

The National ID must be verified to ensure it exists in the Egyptian Civil Registry.

After logging in, the merchant should be able to:

* Add all types of livestock they own with full details
* Record expenses for food, water, and medical treatment
* Record all monthly expenses such as:

  * Electricity
  * Workers' salaries
  * Rent
  * Any additional expenses

The merchant should also be able to:

* Select livestock to display for sale
* Enter the price per kilogram
* Have the total price calculated automatically

For delivery:

* Option 1: The farm handles delivery and sets the delivery cost
* Option 2: The admin is responsible for delivery

There should be accounting sheets/dashboards for the merchant showing:

* Costs
* Expenses
* Profits
* Full financial calculations like an accounting system

There is another section to add:
Some farms also sell cheese and milk, so the merchant should also be able to display available dairy products.

2. Buyer
   Buyer registration should include:

* Email
* Phone number
* National ID number
* Password

When the buyer logs in:

* They should see all available farms
* Choose the farm they want
* View the products/livestock the merchant listed
* Purchase available items

Payment methods:

* InstaPay
* Cash
* In the future: Visa payments

3. Admin
   The admin's role is to:

* Monitor all operations
* Verify products/livestock before they appear to buyers
* Complete the process if delivery is handled by the admin
* Set the delivery cost when applicable

The most important thing is that the app should have Arabic as the default primary language.
If the user wants to switch the language to English, they should be able to change it either from the registration page or from the settings.

✅ **DONE — Full app i18n implemented (May 2026):**
- `LangContext` with Arabic/English DICT and `useLang()` / `t()` hook
- `LangToggle` on Login and Register screens
- Settings page Language section saves to global context + persists via `localStorage`
- **All seller pages, buyer pages, and both layout sidebars** wired to `t()` — every nav label, button, heading, empty state, and section title switches when the language changes
- `dir` attributes switched from hardcoded `"rtl"` to `{isRTL ? 'rtl' : 'ltr'}` throughout
- 400+ translation keys added covering `dashboard.*`, `listings.*`, `herd.*`, `expenses.*`, `income.*`, `statements.*`, `dairy.*`, `supplies.*`, `buyer.*`, `settings.*`, `nav.*`, `seller.*`, `footer.*`

---

## Phase 2 — Enhanced Features

### 11. Financial Statement Sheet (كشف الحسابات) ✅ DONE

The merchant has a dedicated financial statements page at /seller/statements:

* Monthly P&L table with sticky category column and scrollable month columns
* Rows: income from sales, each of 9 expense categories, total expenses, net profit
* Year and quarter (Q1–Q4) filters — quarter is client-side, year re-fetches
* Color-coded net profit row: green cells for profit months, red for loss months
* KPI summary strip: total income, total expenses, net profit, best month
* Export to CSV with UTF-8 BOM (Arabic renders correctly in Excel)
* Export to PDF — opens print window with RTL Arabic HTML table + 🖨 print button (no extra library needed)
* Drill-down modal — click any income/expense cell → DrillDownModal fetches `GET /api/statements/transactions?year=&month=&category=`, shows individual records (date, label, amount) with summary total strip; shimmer skeleton + empty state
* Backend: `GET /api/statements?year=&quarter=` aggregates Income + Expense; `GET /api/statements/transactions` returns raw records per month/category
* Accessible from SellerLayout sidebar: 📊 كشف الحسابات

### 12. Ratings & Reviews (التقييمات) ✅ DONE

* Review model: buyer, seller, order ref (unique — one review per order), rating 1–5, comment, flagged
* Backend: `POST /api/reviews` (buyer), `GET /api/reviews/seller/:sellerId` (public), `DELETE /api/reviews/:id` (admin), `GET /api/reviews/admin/all` (admin — all reviews with populated buyer+seller names)
* Seller averageRating + reviewCount fields on User model, auto-recalculated via aggregation on every create/delete
* BuyerOrders: "⭐ تقييم" button shown on completed orders → ReviewModal with star picker + optional comment; "✓ تم التقييم" badge after
* BuyerFarmDetail: star rating badge in farm header; reviews list section at the bottom
* BuyerBrowse farm cards: star row + review count + "موثوق ✓" amber badge (≥4.5) or green "✓ موثّق" badge
* /api/sellers endpoint: returns averageRating + reviewCount in seller projection
* AdminReviews page: tab bar (الكل / ⭐ عالية ≥4 / ⚠ منخفضة <3), search + sort, ReviewRow with star display, expand comment, two-step delete; AdminLayout nav link ⭐ Reviews
* `GET /api/reviews/my-reviewed` (buyer-only) — returns array of order IDs already reviewed; placed before `/:sellerId` param route to avoid Express treating the string as a MongoDB ObjectId; BuyerOrders fetches this on mount via `Promise.all` with orders fetch and stores result in a `Set` so `alreadyReviewed` prop initializes `OrderCard` state correctly across sessions/refreshes
* BuyerFarmDetail reviews section always rendered: empty state "لا توجد تقييمات بعد — كن أول من يقيّم هذه المزرعة" when no reviews exist; when reviews exist renders rating summary (average score + 5→1 star breakdown bars with proportional widths computed inline via IIFE) followed by review cards

### 13. Eid Al-Adha Module (موسم العيد) ✅ MOSTLY DONE

* `AppConfig` singleton model (`_singleton: 'main'`) with `eidMode` boolean + `eidDate` Date
* Backend routes (`/api/eid`): `GET /config` (public), `PATCH /config` (admin), `GET /listings` (public, eidAvailable=true + approved)
* Listing model: `eidAvailable` boolean, `slaughterService` boolean, `slaughterCost` number
* `EidCountdownBanner` component: polls /api/eid/config every 5 min; shows when eidMode=true OR eidDate within 30 days; live days:hrs:min countdown; "عروض العيد ✦" CTA → /buyer?eid=1; placed in BuyerLayout between header and main
* SellerAddListing (step 5) + SellerEditListing: Eid options box — eidAvailable checkbox, slaughterService checkbox, conditional slaughterCost input
* BuyerBrowse: tab bar (🌾 المزارع / 🌙 عروض العيد); auto-activates eid tab on `?eid=1`; `EidListingCard` shows type, breed, weight, price per kg, slaughter badge; lazy-loads `GET /api/eid/listings`
* AdminDashboard: Eid Settings card — eidMode toggle switch + eidDate date picker + save button

**Remaining:** Pre-booking with deposit for Eid listings (13.5)

### 14. Herd Management (إدارة القطيع) ✅ DONE

* `Animal` model: seller, tagId (sparse unique per seller), type, breed, dob, gender, color, currentWeight, healthStatus (healthy/sick/quarantine/deceased), status (active/sold/deceased), notes, images; embedded `weightLog[]` and `vaccinationLog[]`
* Backend `/api/animals` (seller/admin auth): CRUD; `POST /:id/weight` (updates currentWeight); `DELETE /:id/weight/:entryId`; `POST /:id/vaccination`; `DELETE /:id/vaccination/:entryId`; `GET /summary` (total, byType, avgAgeMonths, avgWeightKg)
* SellerHerd: AnimalCard grid with search, type filter, status tabs; herd summary strip
* SellerAddAnimal: type emoji picker, breed+tagId, gender toggle, DOB, weight+color, health status, photo upload
* SellerAnimalDetail: 3 tabs — 📈 النمو (SVG polyline growth chart), 💉 التطعيمات (add form + timeline with overdue/upcoming color coding), 📋 معلومات; status change; upcoming vaccination alert
* "عرض للبيع" → `/seller/listings/add?type=&breed=&weight=`; SellerAddListing reads URL params on init
* SellerDashboard: vaccination reminders widget — animals with vaccinations due ≤ 14 days
* SellerLayout: 🐾 إدارة القطيع nav link

### 15. Price Benchmarking (مقارنة الأسعار) ✅ DONE

* Backend `GET /api/market-prices` returns avg/min/max pricePerKg per animal type from approved listings in last 90 days
* Optional `?governorate=` query param for governorate-level breakdown
* Frontend service: `marketPricesService.js`
* SellerAddListing step 5 + SellerEditListing: yellow "📊 متوسط السوق" hint bar shows market avg when type is set
* BuyerListingDetail: "السعر مقارنةً بالسوق" badge — 📉 أقل من السوق (green, ratio < 0.93) / ✓ سعر عادل (amber) / 📈 أعلى من السوق (red, ratio > 1.10)
* AdminDashboard: horizontal bar chart per animal type (emoji + Arabic label, min–avg–max price range, count badge); sorted by avgPricePerKg desc; fetches from `marketPricesService`

### 16. In-App Notifications (الإشعارات) ✅ DONE

* Notification model with 14 typed events and 90-day TTL auto-delete
* Backend: `GET /api/notifications`, `/unread-count`, `/read-all`, `/:id/read`
* `utils/notify.js` — non-blocking createNotification helper (never throws)
* Triggers: new order → seller; order confirmed/cancelled/completed → buyer; listing approved/rejected → seller; dairy approved/rejected → seller; new listing/dairy submitted → all admins
* NotificationBell: 🔔 in SellerLayout, BuyerLayout (default green icon), AdminLayout (dim icon); polls unread count every 30s; dropdown panel with mark-read + navigate; `timeAgo` Arabic relative timestamps
* `iconColor` prop allows different layouts to use appropriate contrast colours

### 17. Saved Favorites & Advanced Filters (المفضلة والفلاتر) ✅ DONE

* Backend: `GET/POST/DELETE /api/favorites/:sellerId` (buyer-only, uses $addToSet / $pull on savedFarms)
* User model: `savedFarms[]` array of seller ObjectIds
* BuyerBrowse: ❤️/🤍 heart toggle on every farm card, favorites state loaded on mount
* /buyer/favorites: saved farms list with star rating, governorate, animal types, navigate + remove
* BuyerBrowse advanced filters: governorate dropdown (27 Egyptian governorates), animal type chip buttons, sort (newest / highest rated / most listings) — all client-side via useMemo
* "جديد اليوم ✦" red badge on farm accent bar when newestListingAt < 24h (backend returns newestListingAt from $max aggregation)
* BuyerBrowse: 🔧 فلاتر toggle button with active filter count badge; expandable panel; "✕ مسح الفلاتر" reset
* Price range filter: two number inputs (min/max ج.م/كجم); backend `GET /api/sellers` returns `minPricePerKg` + `maxPricePerKg` per farm via $min/$max aggregation; client overlaps filter with farm's price range

### 18. Feed & Supply Marketplace (سوق المستلزمات) ✅ DONE

**Backend:**
* `Supply` model: seller, name, category (feed/veterinary/equipment/seeds/other), description, quantity, unit, pricePerUnit, minOrderQty, location, deliveryAvailable, deliveryCost, images[], status (pending/approved/rejected/sold_out), rejectionReason
* `/api/supplies` registered in `app.js`
* `GET /` — inlined `optionalAuth`; role-filtered: buyer/public → approved only; seller → own; admin → all; optional `?category=` query param
* `POST /` — seller only; Multer upload; notifies all admins on creation (non-blocking)
* `GET /:id` — optionalAuth; enforces role visibility
* `PUT /:id` — seller/admin; handles `keepImages` JSON field to preserve existing images; seller edit resets status to `pending` for re-review
* `DELETE /:id`
* `PATCH /:id/status` — admin only; notifies seller on approve/reject

**Seller:**
* `SellerSupplies` — category emoji icon, name/qty/unit/price row, status badge (pending amber / approved green / rejected red / sold_out gray), two-step inline delete confirmation
* `SellerAddSupply` — 5-section form: category chip picker (5 categories), name, description textarea, quantity + unit (chip quick-select + free text), price/unit + min order qty, location, delivery toggle with slide-down cost input, drag-and-drop photo upload (up to 5); submits as FormData
* `SellerEditSupply` — same form pre-filled from `GET /supplies/:id`; separate kept-images row (remove × button) vs. new drop zone; sends `keepImages` JSON + new files; loading skeleton

**Buyer:**
* `BuyerBrowse` tab bar extended to 3 tabs: 🌾 المزارع / 🌙 عروض العيد / 🛒 المستلزمات; auto-activates on `?supplies=1`
* `SupplyCard` — thumbnail or category emoji, category chip, name, qty/location, price badge, delivery badge, "عرض التفاصيل ←" CTA → `/buyer/supplies/:id`; hover lift animation; lazy-loads supply list on first tab visit
* Supply tab filter bar: text search (name/description) + category chip buttons (الكل / علف 🌾 / بيطري 💊 / معدات 🔧 / بذور 🌱 / أخرى 📦)
* `BuyerSupplyDetail` — image gallery with thumbnail switcher; category + delivery badges; price block (price/unit + available qty + min order); delivery info card (cost or "قابل للتفاوض"); location row; seller card (avatar, farm name, governorate, star rating); "تواصل مع البائع" CTA (feedback state → "✓ تم إرسال الطلب"); phone link if available; description card

**Admin:**
* `AdminSupplies` — light-themed; tab bar: قيد المراجعة / مُعتمد / مرفوض / الكل (with live counts); supply row: thumbnail or emoji, name + meta + seller name/governorate, status badge, reject reason if set; approve/reject action buttons (can reverse decisions); confirm modal with optional rejection-reason textarea; seller notified via createNotification on action

**Routing & Nav:**
* App.jsx seller routes: `supplies`, `supplies/add`, `supplies/edit/:id`
* App.jsx buyer route: `supplies/:id`
* App.jsx admin route: `supplies`
* SellerLayout: 🛒 مستلزماتي nav link
* AdminLayout: 🛒 Supplies nav link (between Dairy and Users)

---

### 19. Admin Panel Light Theme ✅ DONE

All admin pages migrated from dark (`#0B1410` bg) to white/light (`#FFFFFF`/`#F4F6F4` bg):
* AdminLayout: S tokens updated (sidebarBg: #FFFFFF, mainBg: #F4F6F4, activeColor: #16A34A)
* AdminDashboard: C tokens, AKIND, SVG grid lines, chart tooltips, skeleton, revenue strip, box shadows
* AdminListings: C tokens, shimmer, row hover, filter buttons, sort arrows
* AdminUsers: C tokens, profile drawer, toggle/delete modals, shimmer, tab bars
* AdminOrders: C, STATUS, PAYMENT, DELIVERY_STATUS tokens; timeline, inputs, shimmer
* AdminDairy: C tokens, STATUS, shimmer, sort arrows, filter buttons
* AdminSupplies: C tokens renamed to light palette, skeleton shimmer, tab bar, modal

---

### 20. Settings Page Redesign ✅ DONE

Complete redesign of `/settings` page — Arabic-only labels, Egypt-specific, role-aware:
* Arabic-only labels throughout (removed bilingual text)
* Role-aware profile section: sellers see farmName/farmPhone/personalPhone/experience/animalTypes/bio; buyers see phone
* 27 Egyptian governorates in region selector (replaced Saudi/Gulf countries)
* Password strength bar (weak/medium/strong) with color indicator
* Show/hide password toggle on all password fields
* InstaPay + "soon" badge for Visa added to payment methods
* Removed Saudi-specific payment methods; EGP currency clearly shown
* Arabic-only FAQ items (Egyptian context)
* User mini card in nav sidebar showing name + role badge
* Backend: Added `PUT /auth/profile` + `PUT /auth/password` endpoints (authController.js + auth.js)

---

### 21. Livestock Management Enhancements ✅ DONE

**Backend (Animal.js):**
* Added pregnancy tracking fields: pregnancyStatus (none/pregnant/recently_gave_birth), pregnancyDate, expectedBirthDate, birthCount
* Animal PUT route: whitelists all pregnancy fields; birthCount handled separately (0-safe)

**Backend (Listing.js):**
* Added qurbaniShares array: [{shareType: seventh/quarter/half, pricePerShare, totalShares, bookedShares}]
* listingController create + update: parses qurbaniShares JSON string from FormData

**Frontend — Pregnancy Tracking:**
* SellerAddAnimal: pregnancy section appears when gender = female; 3 status buttons; conditional date inputs (pregnancyDate + expectedBirthDate) when pregnant; birthCount input when recently_gave_birth
* SellerHerd AnimalCard: amber 🤰 حامل chip + green 🐣 وضعت مؤخرًا chip in stats row
* SellerAnimalDetail: amber pregnancy banner showing pregnancy date + countdown to birth; "🤰 تحديث الحمل" action button for females; inline edit panel with status/dates/birthCount + save; info tab grid shows حالة الحمل + موعد الولادة + عدد المواليد rows

**Frontend — Qurbani Shares:**
* SellerAddListing / SellerEditListing: "نظام الأسهم" checkbox in Eid section (hidden for poultry/rabbit); 3 collapsible share type rows (سُبع/ربع/نصف) each with pricePerShare + totalShares inputs; serialised to JSON in FormData
* SellerEditListing: loads existing qurbaniShares array from listing and converts to form state
* BuyerListingDetail: amber "أسهم الأضحية المشتركة" card before CTA; each share shows label, price, progress bar, available count
* BuyerBrowse EidListingCard: share availability chips (amber for available / grey + 🔒 for sold-out)

---

### 22. Advanced Accounting & Finance System ✅ DONE

Extension of section 11 (SellerStatements):
* Advanced P&L table filterable by animal type, expense category, and date range
* Budget planning module — set monthly targets per category, track actuals vs budget
* Per-animal-type cost breakdown chart
* PDF export (Arabic RTL, print-friendly)
* Income vs expense comparison with trend line
* Farm revenue analytics: total sold, avg price, best animal type
* Financial filters combinable: farm / animal type / date range / category
* Net profit margin % per month/year
* Drill-down: click any cell → individual transactions for that month/category
* Expense categories: feed, water, electricity, workers, rent, veterinary, transportation, miscellaneous

---

### 23. Livestock Medical Records ✅ DONE

New module linked to Herd Management:
* `MedicalRecord` model (separate collection): animal ref, seller ref, date, diagnosis, treatment, medication, vet, cost (min 0), followUpDate, notes, resolved bool; indexed on animal + seller
* Backend `/api/animals/:id/medical`: `POST` (add), `GET` (list sorted date desc), `PATCH /:recordId` (update resolved), `DELETE /:recordId`; access control — seller can only access own animal's records
* `animalService.js` exports: `getMedicalRecords`, `addMedicalRecord`, `updateMedicalRecord`, `deleteMedicalRecord`, `getFollowUpsDue`
* SellerAnimalDetail: new 🏥 السجل الطبي tab — 4th tab in bar; lazy-fetches records on first tab open; add-record form (diagnosis*, date, treatment, medication, vet, cost, followUpDate, notes); treatment timeline with resolved badge, follow-up countdown (amber ≤7 days, red ≤3 days), two-step delete confirmation; shimmer skeleton + empty state
* **23.4** — `POST /:id/medical` auto-creates `Expense` (category: `doctor`) when `cost > 0`; fire-and-forget (never fails the medical record creation); note includes diagnosis + animal tagId
* **23.5** — `GET /api/animals/follow-ups-due`: returns MedicalRecord docs (with populated `animal: type/breed/tagId`) where `resolved ≠ true` AND `followUpDate ≤ today + 7 days`, sorted asc, limit 20; SellerDashboard loads on mount → red/rose widget (🏥 متابعات طبية قادمة) shows diagnosis, animal info, day countdown (red overdue / amber ≤3 days); hidden when empty
* **23.6** — SellerHerd fetches `getFollowUpsDue()` on mount; builds `followUpAnimalIds` Set; passes `hasFollowUp` prop to AnimalCard; AnimalCard stats row shows rose 🏥 متابعة طبية chip when true

---

### 24. Growth & Weight Reminder System ✅ DONE

Extends existing weight tracking in section 14:
* Animal model: added `targetWeight` (Number, min 0) and `nextWeighingDate` (Date) fields; `PUT /api/animals/:id` whitelist updated
* `GET /api/animals/weighing-due` — returns active animals where `nextWeighingDate ≤ today + 7 days`; sorted by date asc; limit 20
* `animalService.js`: `getWeighingDue()` service function added
* SellerAnimalDetail weight tab — `WeightGoalEditor` collapsible card: edit `targetWeight` + `nextWeighingDate` via FormData; shows current vs target progress bar (% of goal); countdown to next weighing in days (red overdue / amber ≤2 days); saves via `updateAnimal`
* SellerDashboard — weighing reminders widget (blue theme `#EFF6FF`): fetches `getWeighingDue()` on mount; shows animal emoji + type/breed/tagId, optional progress bar, days-remaining badge; "عرض القطيع ←" link
* **24.3** — node-cron daily weighing job in `scheduler.js`; fires at 08:00 Cairo time; groups due animals by seller; sends one `weighing_due` notification per seller per day
* **24.5** — Weight milestone alert: `POST /:id/weight` checks if `newWeight ≥ animal.targetWeight`; if so, calls `createNotification` with type `weight_milestone`, title "🎯 بلغ الحيوان وزن الهدف!", message includes type/breed/tagId + actual vs target weight + "جاهز للبيع"; fire-and-forget (no await)

---

### 25. Farm Profile Enhancements ✅ PARTIAL

Builds on existing BuyerFarmDetail (section 6):
* User model: added `farmDescription` (String, trim) and `farmBanner` (String — path like `/uploads/xxx.jpg`)
* `PUT /api/auth/profile` — now uses `upload.single('farmBanner')` multer middleware; `farmDescription` added to seller allowed fields; `farmBanner` written from `req.file.filename` when present; `animalTypes[]` FormData key handled alongside JSON `animalTypes`
* `authService.updateProfile` — detects FormData vs JSON and sets `Content-Type: multipart/form-data` accordingly
* Settings page (seller) — "وصف تفصيلي للمزرعة" textarea (`farmDescription`); banner image uploader with live preview and remove button; saves FormData when a banner file is selected, JSON otherwise
* BuyerFarmDetail — banner overlay: semi-transparent `div` with `backgroundImage` covers the header gradient when `seller.farmBanner` is set; "عن المزرعة" card below header showing `farmDescription || bio` with Arabic label
* `/api/sellers` + `/api/sellers/:id` — both projections now include `farmDescription farmBanner farmLocation farmCertificates`
* User model: added `farmLocation: { lat, lng, address }` sub-document (seller only)
* Settings page (seller) — `LocationPicker` component below banner section: interactive Google Maps with draggable pin, "📍 موقعي الحالي" geolocation button, auto reverse-geocoding; serialised to JSON string in FormData when saving with a banner; "✕ إزالة الموقع" clear button
* BuyerFarmDetail — "📍 موقع المزرعة" card with `StaticMap` (`<iframe>` embed, no API key needed) shown when `seller.farmLocation.lat` is present
* **25.5** — `farmCertificates: [String]` added to User model; 6 predefined certificate options ('بيطري معتمد', 'منشأة مرخصة', 'تحت الرقابة البيطرية', 'مزرعة عضوية', 'مُصدِّر معتمد', 'معتمد من وزارة الزراعة'); toggle chips in Settings (seller section, below location picker); FormData sends as `farmCertificates[]`, JSON path sends as array; `authController.updateProfile` handles both; BuyerFarmDetail shows "🏅 شهادات واعتمادات" card with green badge chips when `seller.farmCertificates.length > 0`
* **Remaining:** 25.6 working hours section

---

### Google Maps & Location Features ✅ DONE

Cross-cutting feature added to sections 6, 10, and 25:

**Infrastructure (`src/components/`):**
* `LocationPicker.jsx` — reusable interactive map picker component
  * `useGoogleMaps` custom hook: dynamically injects the Google Maps JS API script once (`<script id="gm-script">`); polls `window.google.maps` if script already being loaded; returns `loaded` boolean
  * Requires `VITE_GOOGLE_MAPS_KEY` in `.env` (enable **Maps JS API** + **Geocoding API** in Google Cloud Console)
  * Shows a no-key fallback message card when key is absent
  * Map initialised with default centre Cairo (30.0444, 31.2357); zooms to existing `value.lat/lng` if provided
  * Draggable `Marker` + map `click` listener → both call `Geocoder.geocode({ location })` to resolve address → calls `onChange({ lat, lng, address })`
  * "📍 موقعي الحالي" button triggers `navigator.geolocation.getCurrentPosition` (high accuracy), centres map + marker, then reverse-geocodes; shows locating spinner while active
  * Address confirmation chip displayed below map; hint text "اضغط على الخريطة أو اسحب الدبوس لتحديد الموقع بدقة"

* `StaticMap.jsx` — display-only embedded map
  * Renders `<iframe src="https://maps.google.com/maps?q=lat,lng&z=zoom&output=embed" />`
  * No API key required — works via public Google Maps embed
  * Optional `address` prop renders address chip below map
  * Returns `null` when `lat`/`lng` are not provided (safe to render anywhere)

**Backend:**
* `User.js` — `farmLocation: { lat: Number, lng: Number, address: String }` sub-document added after `farmBanner`
* `Order.js` — `deliveryLocation: { lat: Number, lng: Number, address: String }` sub-document added after `notes`
* `authController.js` — `updateProfile` handles `farmLocation` for sellers: accepts JSON object (plain request) or stringified JSON string (FormData with banner); validated with `parseFloat`; clears field when `null`/empty
* `sellers.js` — both `GET /` and `GET /:id` projections include `farmLocation`
* `orderController.js` — `createOrder` extracts `deliveryLocation` from `req.body`; stores sub-document when `lat`/`lng` are present

**Frontend integration:**
* `.env` / `.env.example` — `VITE_GOOGLE_MAPS_KEY=` added with documentation comment
* `Settings.jsx` (seller) — `farmLocation` state seeded from `user.farmLocation`; `LocationPicker` rendered in seller farm fields section; `farmLocation` appended to FormData as JSON string when saving with banner, or sent as object when saving as JSON; "✕ إزالة الموقع" button sets state to `null`
* `BuyerFarmDetail.jsx` — imports `StaticMap`; renders "📍 موقع المزرعة" card after the "عن المزرعة" description card when `seller.farmLocation?.lat` is present
* `OrderModal.jsx` — imports `LocationPicker`; `deliveryLocation` state added; in step 3 (Delivery), `LocationPicker` renders below the address/city/region inputs when `needsAddress`; selecting a pin auto-fills `delivery.address` if empty; step 4 review summary shows GPS pin row when set; `deliveryLocation` passed to `createOrder` when `lat != null`

---

### 26. Shopping Cart & Enhanced Checkout ✅ DONE

Extends current single-item OrderModal (section 6):
* CartContext: client-side cart with items (listingId, qty, price snapshot, sellerId)
* Cart icon in BuyerLayout with item count badge
* BuyerCart page: cart summary, remove items, subtotal per item, grand total
* Checkout flow: cart → delivery address → payment method → order confirmation
* Backend: Order model items[] array for multi-item orders (backwards compatible)
* Order confirmation page with order number and status

---

### 27. Dairy Stock Management ✅ DONE

Extends existing dairy module (section 3):
* DairyProduct model: add stockLog[] embedded array (date, qty, note) for history
* SellerDairy: "تحديث المخزون" quick button per product → stock update modal
* Stock history view per product
* Low-stock alert: notify when quantity < minStockAlert threshold
* Expiry alert: notify seller when expiry ≤ 3 days
* BuyerFarmDetail dairy tab: clearly show expiry date and stock availability

---

### 28. Scheduled Notifications & Reminders ✅ DONE

Backend cron infrastructure for all date-based alerts:
* `node-cron` installed; `src/scheduler.js` created; loaded in `server.js` after `connectDB()` resolves (so DB is ready)
* `Notification.js` enum extended with: `vaccination_due`, `weighing_due`, `pregnancy_due`, `dairy_expiry`, `medical_followup`, `weight_milestone`
* All 5 daily cron jobs registered via `initScheduler()` at `'0 8 * * *'` (08:00 Cairo / `Africa/Cairo` timezone)
* `safeJob(name, fn)` wrapper — each job is fully wrapped in try/catch; console-logs start + done/error; never throws
* `groupBySeller(docs)` helper — groups result arrays by `doc.seller.toString()` to produce one notification per seller (not per animal)
* **Job 1 — Vaccination (≤ 3 days):** queries `Animal` with `$elemMatch { nextDueDate: { $gte: now, $lte: now+3d } }` → `vaccination_due` notification
* **Job 2 — Weighing (≤ 1 day):** queries `Animal` where `nextWeighingDate ≤ now+1d` → `weighing_due` notification
* **Job 3 — Pregnancy (≤ 7 days):** queries `Animal` where `pregnancyStatus: 'pregnant'` AND `expectedBirthDate ≤ now+7d` → `pregnancy_due` notification
* **Job 4 — Dairy expiry (≤ 3 days):** queries `DairyProduct` where `status: approved, available: true, expiryDate ≤ now+3d` → `dairy_expiry` notification with product names in message
* **Job 5 — Medical follow-up (≤ 3 days):** queries `MedicalRecord` where `resolved ≠ true AND followUpDate ≤ now+3d` → `medical_followup` notification

---

### 29. Mobile Responsiveness & UI Polish ✅ DONE

* Responsive grid breakpoints across SellerHerd, SellerListings, BuyerBrowse
* Touch-friendly button sizes (min 44px tap target) on all interactive controls
* SellerLayout sidebar: full-screen mobile drawer with overlay + close button
* BuyerBrowse filter panel: bottom sheet on mobile
* Arabic typography improvements: consistent line-height 1.6–1.8, proper font weights
* 4px spacing base grid applied consistently across all pages
* Unified loading skeleton animation across all list/grid pages
* Consistent empty state illustrations + Arabic copy

---

### 30. Future-Ready Infrastructure ✅ PARTIAL

Structural foundations for upcoming capabilities:
* Visa/Mastercard gateway via Fawry or PayMob (Egyptian payment processors)
* QR code per animal linking to public animal profile page
* AdminDashboard advanced analytics: price trends per animal type, revenue by governorate
* Live livestock auction module: bidding system, countdown timer, reserve price
* Multi-branch farm support: seller can have multiple locations under one account
* AI price recommendation: suggest optimal pricePerKg based on market data + animal metrics
* Inventory sync: auto-mark listing as sold when order is completed
* Cloud image storage migration: S3 / Cloudinary to replace local /uploads

---

## Flutter Mobile App (farmflow_mobile/) — Implementation Status

> **Stack:** Flutter 3 · Riverpod · GoRouter · Dio · fl_chart · Cairo font
> **Directory:** `farmflow_mobile/`
> **Run:** `flutter run` (requires connected device or emulator)

### Completed Sprints

**Sprint 1 — Foundation ✅**
pubspec, main.dart, AppColors/AppTheme, ApiClient (Dio + JWT interceptor), ApiEndpoints, TokenStorage, AuthNotifier, SplashScreen, LoginScreen, RegisterRoleScreen → BuyerRegisterScreen + SellerRegisterScreen, GoRouter with auth redirect, AppShell (buyer 4-tab + seller 4-tab + admin 3-tab), shared widgets (shimmer/empty/button/textfield/badge/dialog).

**Sprint 2 — Buyer App ✅**
BuyerHomeScreen (search + filter + مزارع/عيد tabs), FarmDetailScreen (4 tabs: مواشي/ألبان/مستلزمات/تقييمات), ListingDetailScreen + OrderModal (COD/InstaPay), OrdersScreen, FavoritesScreen, BuyerProfileScreen (edit + change password), NotificationsScreen, add-review bottom sheet.

**Sprint 3 — Seller Dashboard & Lists ✅**
SellerDashboardScreen (KPI cards + follow-ups + recent orders), SellerListingsScreen (status filter tabs), HerdScreen (type filter + summary strip + health/pregnancy/medical badges), StatementsScreen (3 tabs: ملخص bar chart + مصروفات + إيرادات), all services (FinanceService, HerdService, SellerListingsService).
`SellerListingsService` calls `GET /api/listings/my` — a dedicated protected route in `backend/src/routes/listings.js` registered **before** `/:id`. Without this ordering, Express matches "my" as a MongoDB ObjectId param and returns 400.

**Sprint 4 — Seller Forms & Detail Screens ✅**
AddAnimalScreen (8 types, gender, date picker, POST /animals), AnimalDetailScreen (LineChart weight history + add-weight + vaccination timeline + medical records tabs), AddListingScreen (type picker, delivery radio, Eid toggles, POST /listings), SellerDairyScreen + SellerSuppliesScreen with add-item bottom sheets, all services, FABs wired, dashboard quick-access row.

**Sprint 5 — Edit Flows & Profile ✅**
EditAnimalScreen (loads animalDetailProvider in initState, tag+birthDate read-only, PUT /animals/:id), EditListingScreen (accepts ListingModel via GoRouter extra, PUT /listings/:id), BuyerProfileScreen _EditProfileSheet (name/phone/27-governorate dropdown, PUT /auth/profile) + _ChangePasswordSheet (current+new+confirm with show/hide, PUT /auth/password), AnimalDetailScreen edit icon, ListingsScreen edit icons, all edit routes in GoRouter.

**Sprint 6 — Image Upload + Admin Foundation ✅**
`ImagePickerGrid` shared widget: gallery + camera source sheet, up to 5 images, 80×80 thumbnails with × remove, FormData `MultipartFile` upload. Integrated in AddAnimalScreen, EditAnimalScreen, AddListingScreen, EditListingScreen — plain JSON when no images, multipart FormData otherwise.
AdminDashboardScreen (revenue gradient card + KPI rows + pending counts), AdminListingsScreen (approve/reject with optional reason text), AdminUsersScreen (role filter chips + search + animated isActive toggle). `_AdminShell` 3-tab BottomNavigationBar in AppShell. Admin ShellRoute in GoRouter.

**Sprint 7 — Admin Full Panel ✅**
`AdminDairyScreen`: fetches `GET /dairy/admin/all`; filter chips pending/approved/all; approve via `POST /dairy/:id/approve`; delete with confirm dialog via `DELETE /dairy/:id`; status badge on each card.
`AdminOrdersScreen`: fetches `GET /orders`; 5-tab status filter (all/pending/confirmed/completed/cancelled); action chips per card for status updates via `PUT /orders/:id/status`; collapsible delivery panel with status chips + cost field → `PATCH /orders/:id/delivery`.
`AdminReviewsScreen`: fetches `GET /reviews/admin/all`; displays rating stars, buyer name, seller farm, comment, date; delete via `DELETE /reviews/:id` with confirm dialog.
`AdminEidScreen`: loads `GET /eid/config`; `Switch` for eidMode + Arabic `DatePicker` for eidDate; saves via `PATCH /eid/config` with success/error SnackBar.
Admin nav expanded from 3 → 5 tabs (added الطلبات + الألبان). Dashboard updated: dairy pending card routes to `/admin/dairy`; new quick-actions row links to `/admin/reviews` and `/admin/eid`.
New `ApiEndpoints`: `adminDairyAll`, `adminApproveDairy(id)`, `adminAllReviews`, `reviewById(id)`, `orderDelivery(id)`.

**Sprint 8 — Contact CTAs & Polish ✅**
`ContactButtons` shared widget (`lib/shared/widgets/contact_buttons.dart`): three-action row — واتساب (opens `https://wa.me/20XXXXXXXXX`), اتصال (opens `tel:`), copy icon (`Clipboard.setData` + green SnackBar). Egyptian phone normalisation: strips non-digits, swaps leading `0` for country code `20`.
Integrated in `FarmDetailScreen` `_HeaderCard`: replaces old single phone `GestureDetector`; shows `personalPhone` as secondary row when different from `farmPhone`.
`_SellerCard` widget added to `ListingDetailScreen`: seller avatar (first-letter circle) + farm name + "عرض المزرعة" button → `context.push('/buyer/farm/{sellerId}')`.
`PrimaryButton` fires `HapticFeedback.mediumImpact()` on every press; contact CTAs + copy fire `HapticFeedback.lightImpact()`.
Platform setup: Android `<queries>` block adds `DIAL/tel` intent + `com.whatsapp` / `com.whatsapp.w4b` package visibility; iOS `Info.plist` adds `LSApplicationQueriesSchemes: [whatsapp, tel]`.
`flutter analyze`: 0 errors, 0 warnings.

**Sprint 9 — Polish, Performance & Build Config ✅**
**M2.7 — Global error handler:** `scaffoldMessengerKey` (`GlobalKey<ScaffoldMessengerState>`) wired into `MaterialApp.router`; Dio interceptor shows Arabic SnackBar for network/5xx errors only (4xx handled locally).
**M17.3 — Image compression:** `flutter_image_compress` added; `lib/core/utils/image_compress_util.dart` utility (`compressImage(XFile)`) — 80% quality, 1280×720 max; wired into all 4 add/edit screens.
**M17.4 — Shimmer placeholder:** `ShimmerFill` added to `shimmer_widget.dart`; applied to all 9 `CachedNetworkImage` instances across browse/detail/herd/listings screens.
**M20.7 — AppBottomSheet:** `lib/shared/widgets/app_bottom_sheet.dart` — static `show<T>()` factory with drag handle, optional Arabic title bar, keyboard-aware insets.
**M21.4 — Hero animations:** `Hero(tag: 'farm-banner-${seller.id}')` on `FarmCard` → `FarmDetailScreen` `FlexibleSpaceBar.background`.
**M21.6 — Form auto-scroll:** `_scrollTo(GlobalKey)` helper using `Scrollable.ensureVisible` on validation failure.
**M18.1 — GovPickerSheet:** searchable 27-governorate bottom sheet; replaces `DropdownButtonFormField` in `BuyerProfileScreen._EditProfileSheet`.
**M23.1 — flutter_dotenv:** `.env` asset; `API_BASE_URL=http://10.0.2.2:5001/api`.
**M23.4/M23.5 — Icons + Splash config:** `flutter_launcher_icons` + `flutter_native_splash` configured; awaits icon asset files.

**Sprint 10 — Remaining Features ✅**
`SupplyCard` 3rd tab in `BuyerHomeScreen` (🛒 المستلزمات grid + `/buyer/supply/:id` route).
`M11.6` expense drill-down bottom sheet (tap category → `GET /statements/transactions` filtered list).
`M11.7` CSV export via `share_plus`.
`M2.10` `ConnectivityWidget` animated offline banner in all 3 `AppShell` variants.
`M3.7` language toggle AR↔EN on login + register screens (`localeProvider`).
All seller/buyer edit flows, delete confirmations, and profile screens confirmed (M9.8, M10.5/12/14, M12.3/4, M13.3, M14.1–14.5).

**Sprint 11 — PDF Export & NID Validation ✅**
`M11.8` PDF export: `pdf ^3.11.1` + `printing ^5.13.2`; `StatementsScreen` generates A4 RTL PDF with green KPI strip + expenses/income tables + Cairo font; shared via `Printing.sharePdf`; export button is `PopupMenuButton` (CSV / PDF choices).
`M3.6` National ID validation: `lib/core/utils/national_id_util.dart` `parseNationalId()` — century digit, valid date, 35 governorate codes, age ≥ 16, gender from last digit; `_NationalIdInfoCard` live widget wired into both `BuyerRegisterScreen` and `SellerRegisterScreen`.

**Sprint 12 — Infinite Scroll ✅**
`M21.1` client-side infinite scroll:
- `HerdScreen` — 15-item batches, `_scrollCtrl` threshold 200 px, `_setTypeFilter` resets count
- `SellerListingsScreen` — 10-item batches, `ListView.builder` with footer item
- `BuyerHomeScreen._FarmsTab` — 12-item batches, `CustomScrollView` + `SliverGrid` + `SliverToBoxAdapter` footer; `ref.listen(sellersFilterProvider, ...)` resets count on filter change
Backend `GET /api/animals` and `GET /api/listings` extended with optional `?page&limit` (returns `{items, total, page, pages, hasMore}` when params present; plain array when absent — backwards-compatible).

**Sprint 13 — Unit & Widget Tests ✅**
68 / 68 tests passing (`flutter test` 0 failures):
- `test/unit/national_id_util_test.dart` — 21 cases: length/format, century digit, date validity, 35 gov codes, age ≥ 16, gender
- `test/unit/model_helpers_test.dart` — 20 cases: `ListingModel.ageText/typeAr/fromJson`, `AnimalModel.ageText/typeAr/genderAr/fromJson`
- `test/widget/empty_state_test.dart` — 5 cases: icon, title, subtitle, action button, circular container
- `test/widget/status_badge_test.dart` — 19 cases: all 15 status values + fallback + font-size variants
- `test/widget_test.dart` — 2 RTL/ProviderScope smoke tests (no real HTTP; tested with plain `MaterialApp`)

**Sprint 14 — FCM Push Notifications ✅**
Firebase project `farmflow-d049d` configured via FlutterFire CLI (`flutterfire configure --platforms=android,ios`).
Generated: `lib/firebase_options.dart`, `android/app/google-services.json`, `ios/Runner/GoogleService-Info.plist`.
Added: `firebase_core: ^3.13.1`, `firebase_messaging: ^15.2.5` to `pubspec.yaml`.
`Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform)` in `main()` before `runApp`.
`FcmService` (`lib/core/services/fcm_service.dart`):
  - `requestPermission` (alert/badge/sound)
  - `getToken()` → `PATCH /auth/fcm-token` (fire-and-forget)
  - `onTokenRefresh` → re-registers token
  - `onMessage` → floating `SnackBar` (title/body) with "عرض" action → `_navigate()`
  - `onMessageOpenedApp` + `getInitialMessage` → deep-link routing
  - `_navigate()`: `data.link` path first; fallback `data.type` switch (8 types → buyer/seller screens)
  - Top-level `_firebaseMessagingBackgroundHandler` with `@pragma('vm:entry-point')`
Backend: `fcmToken: { type: String, default: null }` on User model + `PATCH /auth/fcm-token` protected endpoint.
`FarmFlowApp` converted from `ConsumerWidget` to `ConsumerStatefulWidget`; FCM init guarded by `_fcmInitialised` bool to prevent re-init on rebuilds.
**Not yet done:** M16.4/M16.8 — server-side push sending via `firebase-admin` (requires separate setup).

**Sprint 16 — Backend Deployment ✅**
Backend and frontend deployed to DigitalOcean Droplet (Ubuntu 24.04, AMS3, $12/mo) at `https://xn--pgbnc3a9c8a.com` (مزرعتي.com). Node.js backend on port 5001 managed by PM2; React frontend built and served as static files by Nginx. HTTPS via Let's Encrypt (auto-renews). DNS A record on GoDaddy → `104.248.83.72`. Auto-deploy via GitHub Actions (`deploy.yml`) on push to main: SSH → `git pull` → `npm ci` → `npm run build` → `pm2 reload`. MongoDB Atlas M0 cluster (Ireland, free forever) at `cluster0.mr7xjcy.mongodb.net/farmflow`. `/uploads` directory is persistent on the Droplet (unlike Render). Mobile `.env` updated to DigitalOcean URL; APK rebuilt and redistributed via Firebase App Distribution.

**Sprint 17 — Full App i18n (M3.8) ✅**
`l10n.yaml` + `lib/core/l10n/l10n_ext.dart` (`context.l10n` shorthand). `app_en.arb` + `app_ar.arb` expanded to ~200 keys. All 35 feature screens updated — 759 hardcoded strings replaced. `AppLocalizations.delegate` added to `main.dart`. `flutter analyze` 0 errors, 0 warnings. Language toggle (AR↔EN) now switches all screen chrome instantly across buyer/seller/admin.

**Sprint 15 — Release (M23) ✅**
**Icons:** `dart run flutter_launcher_icons` — adaptive Android icon (green `#3A7D44` bg + `assets/icon/icon_foreground.png`); iOS icon with alpha stripped (`remove_alpha_ios: true`). Assets at `assets/icon/icon.png`.
**Splash:** `dart run flutter_native_splash:create` — green `#3A7D44` (light) / `#2D6235` (dark) background + centered `assets/images/splash_logo.png`; Android v21/v31 window inset styles + iOS `LaunchScreen.storyboard`.
**Android signing:** PKCS12 keystore `android/keystore/farmflow-release.jks` (alias `farmflow`, 27-year validity, CN=FarmFlow/C=EG); `android/key.properties` (gitignored); `build.gradle.kts` `signingConfigs.create("release")` reads from `rootProject.file("key.properties")`; `isMinifyEnabled + isShrinkResources = true`; `proguard-rules.pro` covers Flutter wrapper + Firebase + Play Core dontwarn entries.
**Android build:**
- APK: `build/app/outputs/flutter-apk/app-release.apk` (30 MB) — sideload / direct distribution
- AAB: `build/app/outputs/bundle/release/app-release.aab` (49 MB) — upload to Google Play Console
**iOS build:** `flutter build ipa --no-codesign` → `build/ios/archive/Runner.xcarchive` (288 MB); open in Xcode Organizer → add Apple Developer team + distribution provisioning profile → Distribute App → App Store Connect.
**iOS display name** fixed: `CFBundleDisplayName = FarmFlow` in `ios/Runner/Info.plist` (was "Farmflow Mobile").
**Post-release fixes:**
- Icon timing bug: original APK predated icon generation by 4 min; APK rebuilt and redistributed via Firebase App Distribution.
- `android:usesCleartextTraffic="true"` added to `AndroidManifest.xml` — Android 9+ blocks plain HTTP by default.
- `.env` API URL: `http://10.0.2.2:5001/api` (emulator alias) → `http://192.168.1.10:5001/api` (Mac local WiFi IP) → `https://xn--pgbnc3a9c8a.com/api` (DigitalOcean Droplet, Sprint 16); APK rebuilt to 34.3 MB and redistributed via Firebase App Distribution.

### Remaining Work

| Item | Notes |
|------|-------|
| iOS signed IPA (M23.3/M23.7) | Xcode archive ready; needs Apple Developer account + provisioning profile in Xcode Organizer |
| Store listings (M23.8–M23.9) | Google Play Console + App Store Connect accounts, screenshots, descriptions |
| Backend deployment | ✅ Live at `https://xn--pgbnc3a9c8a.com` (DigitalOcean Droplet, Ubuntu 24.04, AMS3, $12/mo, MongoDB Atlas M0) |
| Cloud image storage | `/uploads` is persistent on the Droplet (no longer ephemeral); Cloudinary migration still recommended for CDN performance and scalability |
| Push activation (M16.4/M16.8) | ✅ `FIREBASE_SERVICE_ACCOUNT_JSON` set in `backend/.env` on Droplet — Firebase initialized, server-side push live |
| Offline degradation (M6.4) | Deferred to v2; online-first acceptable for v1 |
| Full i18n (M3.8) | ✅ Complete — Sprint 17; all 35 screens updated; `context.l10n` extension; AR/EN toggle fully functional |
| Sprint 18 features | ✅ VetRecordsScreen, BreedSettingsScreen, buyer order tabs, price-range filter in buyer home |

---

## Electron Desktop App (farmflow_desktop/) ✅

> **Stack:** Electron 32 · electron-builder 25 · electron-store · electron-updater 6 · React frontend (shared with web, served via `app://` custom protocol)

### Phase 1 — Foundation ✅
- `farmflow_desktop/` bootstrapped with `electron` + `electron-builder` + `electron-store`.
- `BrowserWindow` with saved bounds/maximized state via `electron-store`.
- Dev: loads `http://localhost:5173` (Vite HMR). Prod: loads `app://localhost/`.
- `webSecurity` relaxed in dev only; `contextIsolation: true`, `nodeIntegration: false`.
- `app://` scheme registered as privileged (standard + secure + fetch + service workers).

### Phase 2 — Production Protocol Handler ✅
- `protocol.handle('app', …)` serves React SPA from `extraResources/frontend/dist`.
- `/api/*` and `/uploads/*` proxied to `BACKEND_ORIGIN` (`https://xn--pgbnc3a9c8a.com`; overridable via `FARMFLOW_API_URL` env var).
- SPA fallback: paths with no file extension → `index.html`.

### Phase 3 — IPC & File Export ✅
- `src/ipc/file.js`: `save-file` handle — writes Buffer to user-chosen path via `dialog.showSaveDialog`.
- `preload.js` exposes `window.electron.saveFile({ filename, defaultPath, buffer })`.
- `isDesktop` flag (`frontend/src/utils/platform.js`): `!!window.electron?.isDesktop`.
- Seller pages with native save dialog: `SellerStatements`, `SellerExpenses`, `SellerIncome`, `SellerHerd`.

### Phase 4 — OS Notifications & Badge ✅
- `src/ipc/notify.js`: `notify` handle → `new Notification(…).show()` with app icon.
- `set-badge` handle: macOS dock badge (`app.setBadgeCount`); Windows taskbar overlay (SVG badge image).
- Badge forwarded to tray icon via `onBadgeChange` callback.

### Phase 5 — Native App Menu & Keyboard Shortcuts ✅
- `src/ipc/menu.js`: Arabic native menu (File / Edit / View / Window).
- File menu broadcasts `menu-action` IPC: `export-csv` (Cmd+Shift+E) and `export-pdf` (Cmd+Shift+P).
- `preload.js` exposes `window.electron.onMenuAction(cb)` — returns unsubscribe fn for `useEffect` cleanup.

### Phase 6 — System Tray ✅
- `src/tray.js`: 16×16 tray icon; Arabic context menu (فتح FarmFlow / خروج).
- Close button hides to tray; `app._quitting` flag distinguishes real quit from hide.
- `updateBadge(n)`: red SVG circle overlay on tray icon; plain icon restored at 0.

### Phase 7 — Auto-Updater ✅
- `src/updater.js`: `electron-updater` with `autoDownload + autoInstallOnAppQuit`.
- Skipped in dev. In prod: `checkForUpdates()` on launch → Arabic dialogs.
- `publish` config: GitHub Releases (owner: abdelrahmankhalil, repo: FarmFlow).
- Builds: macOS DMG (arm64 + x64), Windows NSIS (x64).

### Remaining Desktop Items

| Item | Notes |
|------|-------|
| Preload IPC activation | ✅ All IPC bridges now live: saveFile, openFile, savePdf, notify, setBadge, onMenuAction, onDeepLink |
| Code signing (macOS) | Apple Developer certificate + notarization via `electron-builder` `afterSign` hook |
| Code signing (Windows) | EV certificate or self-signed for NSIS installer |
| CI/CD release pipeline | GitHub Actions: build DMG + NSIS on tag push, upload to GitHub Releases |

---

### 33. In-App Messaging (الرسائل) ✅ DONE

* `Conversation` model: `participants[]` (always 2 users), `context { type: listing|order|general, refId, label }` for linking thread to a listing/order, `lastMessage { body, sender, at }` denormalized for inbox display without extra queries; compound index `{ participants: 1, updatedAt: -1 }`
* `Message` model: `conversation` ref, `sender` ref, `body` (max 1000 chars), `read` boolean; indexed on `conversation` + `read` for efficient unread queries
* Backend `/api/messages` (all routes require `protect` middleware):
  - `GET /` — inbox: all conversations for current user sorted by `updatedAt` desc, with per-conversation unread count via `countDocuments`
  - `GET /unread-count` — total unread messages across all conversations (placed before `/:id` param route)
  - `POST /` — start or retrieve existing conversation with a user (accepts `recipientId`, `contextType`, `contextRefId`, `contextLabel`); uses `{ $all: [myId, recipientId], $size: 2 }` to ensure exactly one conversation per pair
  - `GET /:id` — paginated message thread (default 50, sorted newest-first then reversed for display)
  - `POST /:id` — send message; updates `conversation.lastMessage` denormalized field; fires `new_message` notification to recipient via `createNotification`
  - `PATCH /:id/read` — bulk mark all unread messages in thread as read: `Message.updateMany({ conversation, sender: { $ne: userId }, read: false }, { $set: { read: true } })`
* `Notification` model: `new_message` added to type enum
* `messageService.js` frontend service: 6 functions (`getConversations`, `getUnreadCount`, `getOrCreate`, `getMessages`, `sendMessage`, `markRead`)
* `MessagesPage.jsx` shared component (used by both buyer and seller via `basePath` prop):
  - Two-panel layout: 320 px conversation list + flex chat panel
  - `ConvItem`: avatar initials, unread badge dot, last message preview, context label chip
  - `ChatBubble`: RTL layout, green for sender / white for recipient, read receipts ✓ (sent) / ✓✓ (read)
  - Active chat: 5 s polling via `setInterval`; `markRead` called on conversation open and whenever poll detects unread messages from the other party
  - `?with=<userId>&contextType=&contextLabel=` URL params handled on mount to auto-open or create a conversation; params cleared with `navigate({ search: '' }, { replace: true })` after processing
  - Mobile-responsive: `mobileView` state toggles between `.msg-sidebar` and `.msg-chat` CSS classes; back button returns to list
  - Empty inbox: role-aware copy for buyer vs seller
* `BuyerMessages.jsx` + `SellerMessages.jsx` — thin wrappers: `<MessagesPage basePath="/buyer|seller" />`
* `App.jsx` routes: `/buyer/messages` → `<BuyerMessages />`, `/seller/messages` → `<SellerMessages />`
* `BuyerLayout`: 💬 الرسائل nav link; `msgUnread` state polled every 30 s via `getUnreadCount`; red badge rendered in desktop nav bar, dropdown menu, and mobile drawer
* `SellerLayout`: same; collapsed sidebar shows badge as small dot on the icon itself; expanded/mobile shows count pill after label
* `BuyerFarmDetail`: "💬 رسالة للبائع" button in farm header → `navigate('/buyer/messages?' + URLSearchParams({ with: seller._id, contextType: 'general', contextLabel: farmName }))`

---

### 35. Security Hardening & API Infrastructure ✅ DONE

* `helmet` middleware applied globally — sets secure HTTP response headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
* `express-rate-limit`: auth endpoints 10 req/15 min; all `/api/` routes 300 req/15 min; both limits disabled in dev (`NODE_ENV !== 'production'`)
* Error handler masks stack traces in production — returns generic "Internal server error" message
* **Swagger/OpenAPI docs** at `/api/docs` (swagger-ui-express UI) and `/api/docs.json`; disabled in production by default; set `ENABLE_DOCS=true` env var to expose
* Listing `draft` status — sellers can save without submitting; admin notifications only fire for non-draft (`status !== 'draft'`) submissions
* Extended Listing animal types: ostrich, gazelle, oryx, deer, llama, alpaca, donkey, mule
* Listing buyer search: `?type`, `?minPrice`, `?maxPrice`, `?minWeight`, `?maxWeight`, `?location`, `?delivery=true`, `?q`, `?sort`
* `GET /api/animals/vet/medical` + `GET /api/animals/vet/vaccinations` — cross-herd views of all medical records / all vaccination entries for the seller (admin sees all)
* `Review.reply: { body, at }` — seller reply field on Review model; `PATCH /api/reviews/:id/reply` (seller-only, max 500 chars)
* Order `sourceType: 'listing'|'supply'`; `supply` ref + `quantity`; `createOrder` handles supply orders with quantity validation and minOrderQty enforcement
* Order `timeline[]` — `{status, at, note}` pushed on every status change; initial `pending` entry on creation
* Expense `recurringDay` (1–28) — scheduler Job 6 auto-creates monthly instances at 08:00 Cairo; deduplicates by seller+category+note
* `GET /api/finance/analytics?months=N` — monthly trends, income by type, expense by category, top animal types by revenue, order stats; admin `?sellerId=` scoping
* `GET /api/admin/platform-analytics?weeks=N` — weekly Monday-aligned user/listing/order/GMV buckets; up to 52 weeks
* Admin users endpoint paginated with per-user listing/order/revenue stats

---

### 36. Email Service & Auth Enhancements ✅ DONE

* `emailService.js` — Nodemailer SMTP lazy-init singleton; fire-and-forget `sendEmail({ to, subject, html })`; silently skipped when SMTP env vars absent
* `.env.example` updated: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
* **Email verification** on registration: Arabic RTL welcome email + verification link (24-hour token); `POST /auth/verify-email`; `POST /auth/resend-verification`; `User.isEmailVerified` boolean
* **Password reset**: `POST /auth/forgot-password` (hashed token, 1-hour expiry, Arabic reset email); `POST /auth/reset-password` (validates token, bcrypt-hashes new password)
* **Admin 2FA (email OTP)**: admin login returns `{ requires2FA: true, token }` and sends 6-digit code via email (10-min validity); `POST /auth/verify-2fa` completes login; `twoFactorCode/Expiry` on User (select: false)
* **Notification preferences**: `notifPrefs: { orders, reminders, dairy, messages }` on User model (all default true); `GET/PUT /auth/notif-prefs`; `createNotification` skips in-app creation when pref is false
* **Email triggers for order events**: `new_order` → seller; `order_confirmed/completed/cancelled` → buyer; sent via `EMAIL_TEMPLATES` in `notify.js` when user has an email address; fire-and-forget

> **Activation:** Set `SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM` in `/var/www/farmflow/backend/.env` on the Droplet. Gmail requires an App Password. All email features degrade gracefully — nothing breaks if SMTP is not configured.

---

### 37. Multi-Farm Support (Backend Foundation) ✅ DONE

* `Farm` model — dedicated Farm collection with: owner (User ref), name, type (livestock/horses/poultry/dairy/exotic/mixed/other), governorate, farmPhone, personalPhone, experience, animalTypes, bio, farmDescription, farmBanner (image path), farmLocation ({lat, lng, address}), farmCertificates[], workingHours ({days[], from, to}), typicalPrices[] ({animalType, price}), averageRating, ratingCount, isActive
* `/api/farms`: `GET /` (my farms, seller-only), `GET /:id` (public), `POST /` + `PUT /:id` (farmBanner upload via Multer), `DELETE /:id`; all seller routes behind `protect + authorizeRoles('seller')`
* `POST /api/farms/migrate/self` — converts existing profile-level farm fields (farmName, farmPhone, etc.) to a Farm document for legacy sellers
* Registration: sellers can include a `farms[]` array to create Farm documents on sign-up; `typicalPrices[]` per farm stored at registration time
* `Listing.farm`, `DairyProduct.farm`, `Supply.farm` — optional Farm ObjectId ref on all marketplace items for per-farm filtering and analytics

---

## Phase 3 — v2 Roadmap Features

> Planned for the next major release. None implemented yet. Full task breakdown in `docs/PLAN.md §38`, `docs/FLUTTER_PLAN.md Sprint 19`, and `docs/DESKTOP_PLAN.md Phase 7`.

| Feature | Summary | Depends on |
|---------|---------|------------|
| **Cloudinary CDN** | Migrate all image storage from local disk to Cloudinary for CDN delivery and scalability | Cloudinary account |
| **Paymob gateway** | Live card / Fawry / mobile-wallet payments replacing placeholder InstaPay | Paymob merchant account |
| **SMS OTP** | Phone verification on registration and password reset via Twilio or Vonage | SMS provider account |
| **Referral system** | Unique codes per user, shareable links, reward tracking for inviting new users | — |
| **WebSocket chat** | Replace 30-second polling with Socket.io persistent connections for instant messaging | — |
| **Auction system** | Live bidding on listings with countdown timer; Socket.io `auction:bid` broadcast | WebSocket (above) |
| **Delivery tracking** | Bosta / Aramex courier API integration; real-time shipment status on order detail | Bosta/Aramex account |
| **Promoted listings** | Sellers pay to boost listings to top of search; `promotedUntil` field + Paymob payment | Paymob (above) |
| **Escrow payments** | Buyer payment held until delivery confirmed; Paymob capture-on-confirm flow | Paymob (above) |
| **Health certificate QR** | QR code per animal linking to a public signed-URL health summary page | — |
| **Video listings** | Short video (≤60s) upload alongside listing photos via Cloudinary | Cloudinary (above) |
| **Vet consultation** | In-app vet directory, booking calendar, text/video consultation chat | WebSocket (above) |
* **Remaining:** Web frontend multi-farm UI — farm switcher in SellerLayout, per-farm listing/dairy/supply creation, per-farm analytics; currently all items default to the first/only farm
