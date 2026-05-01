# FarmFlow — Flutter Mobile App Plan

> **Backend:** Existing Node/Express + MongoDB (reused as-is)
> **Mobile stack:** Flutter (Dart) · Riverpod · GoRouter · Dio · FCM
> **Languages:** Arabic (default, RTL) · English (switchable)
> **Platforms:** Android (primary) · iOS (secondary)
> **Users:** Seller (farm owner) · Buyer · Admin (read-only mobile panel)

---

## Status Legend

- [x] Done
- [-] Partial
- [ ] Not started

---

## Phase 1 — Project Setup & Architecture

### M1. Project Foundation

| # | Task | Status |
|---|------|--------|
| M1.1 | Create Flutter project: `flutter create farmflow_mobile --org com.farmflow` | [x] |
| M1.2 | Folder structure: `lib/core`, `lib/features`, `lib/shared`, `lib/l10n` | [x] |
| M1.3 | Add core dependencies to `pubspec.yaml` (see list below) | [x] |
| M1.4 | Configure Arabic RTL as default — `MaterialApp(locale: Locale('ar'), textDirection: TextDirection.rtl)` | [x] |
| M1.5 | Arabic + English `ARB` localisation files (`app_ar.arb`, `app_en.arb`) | [x] |
| M1.6 | Theme setup: green primary `#3A7D44`, warm background `#F8F4EE`, Cairo/Tajawal Arabic font | [x] |
| M1.7 | Android: set `android:supportsRtl="true"` in `AndroidManifest.xml` | [x] |
| M1.8 | iOS: add Arabic + English to `CFBundleLocalizations` in `Info.plist` | [x] |

**Core packages:**
```yaml
dependencies:
  flutter_riverpod: ^2.x        # state management
  go_router: ^13.x              # declarative routing + deep links
  dio: ^5.x                     # HTTP client with interceptors
  flutter_secure_storage: ^9.x  # JWT token storage
  shared_preferences: ^2.x      # lightweight settings cache
  cached_network_image: ^3.x    # image cache
  image_picker: ^1.x            # camera + gallery
  firebase_messaging: ^14.x     # push notifications (FCM)
  firebase_core: ^2.x
  intl: ^0.19.x                 # date formatting + i18n
  flutter_localizations:        # RTL + locale support (SDK)
    sdk: flutter
  lottie: ^3.x                  # loading animations
  fl_chart: ^0.68.x             # charts (income/expense)
  pin_code_fields: ^8.x         # OTP / national ID input style
  url_launcher: ^6.x            # WhatsApp / phone call CTAs
  path_provider: ^2.x           # local file paths
  permission_handler: ^11.x     # camera/notification permissions
```

---

### M2. Core Infrastructure

| # | Task | Status |
|---|------|--------|
| M2.1 | `ApiClient` (Dio singleton) — base URL from env, JWT interceptor (inject Bearer token), 401 → logout | [x] |
| M2.2 | `AuthRepository` — login, register seller, register buyer, getMe, updateProfile, updatePassword | [x] |
| M2.3 | `TokenStorage` (flutter_secure_storage) — read/write/delete JWT; loaded on app startup | [x] |
| M2.4 | `AuthNotifier` (Riverpod AsyncNotifier) — holds `User?`; exposes `login()`, `logout()`, `refresh()` | [x] |
| M2.5 | GoRouter with redirect logic: unauthenticated → `/login`; role-based shell routes (seller/buyer/admin) | [x] |
| M2.6 | `AppShell` per role — BottomNavigationBar for buyer/seller; Drawer for admin | [x] |
| M2.7 | Global error handler — DioException → Arabic error SnackBar via `ScaffoldMessenger` | [x] |
| M2.8 | `ImageUploadService` — wraps `image_picker` + `dio.post` as `MultipartFile` | [x] |
| M2.9 | `NotificationService` — FCM setup, `onMessage` / `onBackgroundMessage`, local notification display | [ ] |
| M2.10 | `ConnectivityWidget` — banner shown when offline; retries on reconnect | [x] |

---

## Phase 2 — Authentication Screens

### M3. Auth Screens

| # | Task | Status |
|---|------|--------|
| M3.1 | `SplashScreen` — FarmFlow logo + shimmer; checks token → redirect to role home or login | [x] |
| M3.2 | `LoginScreen` — identifier field (phone or email), password, show/hide toggle; role auto-detected from JWT | [x] |
| M3.3 | `RegisterRoleScreen` — two large cards: 🌾 مزارع / 🛒 مشتري; taps route to respective register form | [x] |
| M3.4 | `BuyerRegisterScreen` — name, email, phone, national ID (14-digit), password, confirm password | [x] |
| M3.5 | `SellerRegisterScreen` — name, farm name, farm phone, personal phone, optional email, national ID, password | [x] |
| M3.6 | National ID live validation — format check + `POST /auth/verify-id`; shows extracted info (age, governorate) | [x] |
| M3.7 | Language toggle (AR/EN) on login + register screens | [x] |

---

## Phase 3 — Buyer App

### M4. Buyer — Browse Farms

| # | Task | Status |
|---|------|--------|
| M4.1 | `BuyerHomeScreen` — search bar + filter FAB + FarmCard grid (pulls `GET /api/sellers`) | [x] |
| M4.2 | `FarmCard` widget — banner image, farm name, governorate, star rating + count, animal type chips, "جديد اليوم" badge | [x] |
| M4.3 | Filter bottom sheet — governorate picker, animal type chips, price range slider (ج.م/كجم), sort options | [x] |
| M4.4 | Eid tab bar — 🌾 المزارع / 🌙 عروض العيد | [x] |
| M4.5 | `EidListingCard` — eid farm tiles in tab | [x] |
| M4.6 | `SupplyCard` grid for المستلزمات tab | [x] |
| M4.7 | Favorites toggle ❤️/🤍 on FarmCard (calls `POST/DELETE /api/favorites/:id`) | [x] |

### M5. Buyer — Farm Detail & Listings

| # | Task | Status |
|---|------|--------|
| M5.1 | `FarmDetailScreen` — banner hero with parallax, farm name + rating + stats; tab bar (مواشي / منتجات الألبان / التقييمات) | [x] |
| M5.2 | Farm description card ("عن المزرعة") using `farmDescription` or `bio` + certificates + phone | [x] |
| M5.3 | `LivestockListingCard` — image, type, breed, weight, price, eid badge | [x] |
| M5.4 | `ListingDetailScreen` — image gallery (PageView), animal specs grid, delivery card, slaughter card, price, OrderModal | [x] |
| M5.5 | `DairyProductCard` in farm dairy tab | [x] |
| M5.6 | `SupplyDetailScreen` — image gallery, price, delivery, seller card, contact CTA | [x] |
| M5.7 | Reviews section on FarmDetailScreen — star summary + list | [x] |

### M6. Buyer — Orders

| # | Task | Status |
|---|------|--------|
| M6.1 | `OrderModal` bottom sheet — delivery option, payment method picker, notes | [x] |
| M6.2 | Payment method: Cash (COD) | [x] |
| M6.3 | Payment method: InstaPay (selector, full flow TBD) | [x] |
| M6.4 | Order confirmation via SnackBar after submit | [x] |
| M6.5 | `OrdersScreen` — list of buyer orders with status chips; pull-to-refresh | [x] |
| M6.6 | Order detail bottom sheet — delivery cost, notes, status | [x] |
| M6.7 | Write review flow — star picker + optional comment | [x] |

### M7. Buyer — Favorites & Account

| # | Task | Status |
|---|------|--------|
| M7.1 | `FavoritesScreen` — saved farms list; remove + navigate | [x] |
| M7.2 | `BuyerProfileScreen` — avatar, name, phone, email, menu items, logout | [x] |
| M7.3 | Change password screen | [x] |
| M7.4 | Notification bell + `NotificationsScreen` (list, mark-read, unread badge) | [x] |

---

## Phase 4 — Seller App

### M8. Seller — Dashboard

| # | Task | Status |
|---|------|--------|
| M8.1 | `SellerDashboardScreen` — KPI cards (income, expenses, net profit, herd count); period tabs (هذا الشهر / ربع سنوي / هذا العام) | [x] |
| M8.2 | Income vs Expense line chart — `fl_chart` LineChart with 30-day rolling data | [x] |
| M8.3 | Upcoming vaccination reminders widget (≤14 days) | [x] |
| M8.4 | Weighing reminders widget (≤7 days) | [x] |
| M8.5 | Recent orders feed — last 5 orders with status | [x] |
| M8.6 | Quick action buttons — ＋ إعلان / ＋ حيوان / كشف الحسابات | [x] |

### M9. Seller — Livestock Listings

| # | Task | Status |
|---|------|--------|
| M9.1 | `SellerListingsScreen` — own listings list with status badges; pull-to-refresh; search | [x] |
| M9.2 | `AddListingScreen` — type picker, weight/price, delivery radio, Eid toggles, photo upload, POST /listings | [x] |
| M9.3 | Type picker — emoji grid (8 types) | [x] |
| M9.4 | Photos — `ImagePickerGrid` multi-select (up to 5); thumbnails with remove | [x] |
| M9.5 | Price + delivery — weight/price fields, delivery RadioListTile, POST /listings | [x] |
| M9.6 | Eid section — eidAvailable + slaughterService toggles | [x] |
| M9.7 | `EditListingScreen` — pre-filled from ListingModel passed via GoRouter extra; PUT /listings/:id | [x] |
| M9.8 | Delete listing — two-step confirmation dialog | [x] |

### M10. Seller — Herd Management

| # | Task | Status |
|---|------|--------|
| M10.1 | `HerdScreen` — grid of AnimalCards; search bar; type chips; status tabs (نشط / مُباع / الكل) | [x] |
| M10.2 | Herd summary strip — total, avg age, avg weight, count by type | [x] |
| M10.3 | `AnimalCard` — type emoji, breed/tagId, current weight, health badge, pregnancy chip, status | [x] |
| M10.4 | `AddAnimalScreen` — type picker, breed+tagId, gender toggle, DOB date picker, weight, color, photo upload | [x] |
| M10.5 | Pregnancy section in AddAnimalScreen — status chips + conditional date pickers (female only) | [x] |
| M10.6 | `AnimalDetailScreen` — header card + TabBar: 📈 النمو / 💉 التطعيمات / 🏥 السجل الطبي / 📋 معلومات | [x] |
| M10.7 | Weight tab — `fl_chart` LineChart growth chart; add weight form; weight log list | [x] |
| M10.8 | WeightGoalEditor in weight tab — target weight + next weighing date; progress bar | [x] |
| M10.9 | Vaccination tab — add form; timeline list with overdue/upcoming color coding | [x] |
| M10.10 | Medical records tab — add form (diagnosis, treatment, medication, vet, cost, follow-up date); timeline | [x] |
| M10.11 | Info tab — specs grid + notes; image gallery | [x] |
| M10.12 | Pregnancy editor bottom sheet — status chips + date inputs + save | [x] |
| M10.13 | "عرض للبيع" action — navigate to AddListingScreen with pre-filled type/breed/weight params | [x] |
| M10.14 | Delete animal — two-step confirmation; navigate back to HerdScreen | [x] |

### M11. Seller — Finance

| # | Task | Status |
|---|------|--------|
| M11.1 | Expenses tab — list grouped by category inside `StatementsScreen` | [-] |
| M11.2 | Add expense bottom sheet — category picker (9 categories), amount, date, notes | [x] |
| M11.3 | Income list tab — entries with totals inside `StatementsScreen` | [-] |
| M11.4 | `StatementsScreen` — 3-tab: bar chart summary / مصروفات / إيرادات; year + period picker | [x] |
| M11.5 | KPI summary strip on StatementsScreen (income, expenses, net profit, best month) | [x] |
| M11.6 | Drill-down bottom sheet — tap any cell → individual transactions | [x] |
| M11.7 | Export CSV — share intent via `Share.share()` | [x] |
| M11.8 | Export PDF — `printing` package | [x] |

### M12. Seller — Dairy Products

| # | Task | Status |
|---|------|--------|
| M12.1 | `SellerDairyScreen` — own dairy products list; status badges; pull-to-refresh | [x] |
| M12.2 | Add dairy bottom sheet — type picker, name, qty+unit, price, dates, delivery, images | [x] |
| M12.3 | `EditDairyScreen` — pre-filled form | [x] |
| M12.4 | Delete dairy — two-step confirmation | [x] |

### M13. Seller — Supplies

| # | Task | Status |
|---|------|--------|
| M13.1 | `SellerSuppliesScreen` — own supply listings; status badges | [x] |
| M13.2 | Add supply bottom sheet — category picker, name, qty+unit, price, location, delivery toggle, photos | [x] |
| M13.3 | `EditSupplyScreen` — pre-filled with existing data | [x] |

### M14. Seller — Profile & Settings

| # | Task | Status |
|---|------|--------|
| M14.1 | `SellerProfileScreen` — farm name, phones, governorate, experience, animal types, bio, farmDescription | [x] |
| M14.2 | Farm banner image upload — `image_picker` + preview; sends as multipart | [x] |
| M14.3 | Edit profile form (same fields as web Settings seller section) | [x] |
| M14.4 | Change password screen | [x] |
| M14.5 | Notification preferences toggle (in-app only) | [x] |

---

## Phase 5 — Admin Mobile Panel (Lite)

> Admin panel is complex — full desktop use is via web. Mobile provides read + approve/reject actions only.

### M15. Admin Mobile

| # | Task | Status |
|---|------|--------|
| M15.1 | `AdminDashboardScreen` — overview KPIs (users, listings, orders, revenue); market prices chart | [x] |
| M15.2 | `AdminListingsScreen` — pending listings list; approve / reject with reason | [x] |
| M15.3 | `AdminDairyScreen` — pending dairy products; approve / reject | [x] |
| M15.4 | `AdminOrdersScreen` — all orders; filter by status; update delivery status | [x] |
| M15.5 | `AdminUsersScreen` — user list; view profile; toggle active/inactive | [x] |
| M15.6 | `AdminReviewsScreen` — all reviews; delete flagged reviews | [x] |
| M15.7 | Eid settings — eidMode toggle + eidDate picker | [x] |

---

## Phase 6 — Shared & Mobile-Native Features

### M16. Push Notifications (FCM)

| # | Task | Status |
|---|------|--------|
| M16.1 | Firebase project setup — Android `google-services.json` + iOS `GoogleService-Info.plist` | [x] |
| M16.2 | Backend: `fcmToken` field on User model; `PATCH /auth/fcm-token` saves token per user | [x] |
| M16.3 | Flutter: `FcmService` — request permissions, get token, `PATCH /auth/fcm-token`, `onTokenRefresh` | [x] |
| M16.4 | `notifyPush()` utility in backend — wraps `firebase-admin messaging().send()` | [x] |
| M16.5 | Foreground messages — floating `SnackBar` with title/body + "عرض" deep-link action | [x] |
| M16.6 | Background tap — `onMessageOpenedApp` + `getInitialMessage` → GoRouter deep-link routing | [x] |
| M16.7 | Deep-link routing: `data.link` path takes priority; fallback `data.type` switch (8 notification types → screens) | [x] |
| M16.8 | Server-side push triggers via firebase-admin (order placed/status → buyer/seller; herd reminders) | [x] |

### M17. Camera & Image Handling

| # | Task | Status |
|---|------|--------|
| M17.1 | `ImagePickerSheet` bottom sheet — "الكاميرا" / "معرض الصور" options | [x] |
| M17.2 | Multi-image select for listings/animals/supplies (up to 5) | [x] |
| M17.3 | Image compression before upload (`flutter_image_compress`) — max 1MB per image | [x] |
| M17.4 | `CachedNetworkImage` with shimmer placeholder across all image displays | [x] |

### M18. Location & Maps

| # | Task | Status |
|---|------|--------|
| M18.1 | Governorate picker — searchable `ListView` bottom sheet (27 Egyptian governorates) | [x] |
| M18.2 | `geolocator` — detect current governorate on supply/listing add (optional, with permission request) | [x] |

### M19. WhatsApp & Phone CTAs

| # | Task | Status |
|---|------|--------|
| M19.1 | `url_launcher` — "تواصل على واتساب" → `https://wa.me/20XXXXXXXXXX` | [x] |
| M19.2 | Direct phone call button → `tel:01XXXXXXXX` | [x] |
| M19.3 | "نسخ رقم الهاتف" — `Clipboard.setData()` with SnackBar confirmation | [x] |

---

## Phase 7 — UI/UX & Polish

### M20. Design System

| # | Task | Status |
|---|------|--------|
| M20.1 | `AppTheme` — ThemeData with Arabic Cairo font, green primary, warm card surfaces | [x] |
| M20.2 | `AppColors` constants matching web design tokens (`bg`, `card`, `green`, `amber`, `red`, etc.) | [x] |
| M20.3 | `ShimmerWidget` reusable — shimmer placeholder for all loading states | [x] |
| M20.4 | `EmptyState` reusable — icon + Arabic title + subtitle (used on all empty list/grid pages) | [x] |
| M20.5 | `StatusBadge` reusable — colour-coded for listing/order/animal statuses | [x] |
| M20.6 | `ConfirmDialog` — two-step destructive confirmation (matches web pattern) | [x] |
| M20.7 | `AppBottomSheet` wrapper — draggable, rounded top corners, Arabic title bar | [x] |
| M20.8 | `PrimaryButton` + `SecondaryButton` — consistent 48px touch targets | [x] |
| M20.9 | `AppTextField` — RTL-first, custom border/focus colors, Arabic hint text | [x] |
| M20.10 | Haptic feedback on primary actions (submit, confirm delete) | [x] |

### M21. Performance & UX

| # | Task | Status |
|---|------|--------|
| M21.1 | Infinite scroll / pagination on all long lists (BuyerHome, SellerListings, etc.) | [x] |
| M21.2 | Pull-to-refresh (`RefreshIndicator`) on all data screens | [x] |
| M21.3 | Optimistic UI on favorite toggle — instant heart fill, rollback on error | [x] |
| M21.4 | Hero animations — farm card image → farm detail header (Flutter Hero widget) | [x] |
| M21.5 | Skeleton shimmer on first load for all grid/list screens | [x] |
| M21.6 | Form auto-scroll to first invalid field on submit | [x] |
| M21.7 | `AutofillHints` on login/register fields (phone, email, password) | [x] |

---

## Phase 8 — Testing & Release

### M22. Testing

| # | Task | Status |
|---|------|--------|
| M22.1 | Unit tests: `parseNationalId` (21 cases), `ListingModel`/`AnimalModel` helpers (20 cases) | [x] |
| M22.2 | Widget tests: `EmptyState` (5 cases), `StatusBadge` (all 15 statuses + size variants) | [x] |
| M22.3 | Integration test: login → browse → place order flow | [x] |
| M22.4 | RTL locale + AppTheme smoke tests (2 cases in widget_test.dart) | [x] |

### M23. Build & Release

| # | Task | Status |
|---|------|--------|
| M23.1 | `flutter_dotenv` — separate `.env` files for dev/staging/prod API base URL | [x] |
| M23.2 | Android: `build.gradle.kts` release signing config (key.properties + PKCS12 keystore); ProGuard rules (incl. Play Core + Firebase dontwarn) | [x] |
| M23.3 | iOS: Xcode archive built (`--no-codesign`); requires Apple Developer account + provisioning profile to export signed IPA | [-] |
| M23.4 | App icons — `flutter_launcher_icons` generated (`remove_alpha_ios: true`; adaptive icon with green `#3A7D44` background) | [x] |
| M23.5 | Splash screen — `flutter_native_splash` generated (green `#3A7D44` bg, dark mode `#2D6235`, centered logo, Android + iOS) | [x] |
| M23.6 | Android APK: `build/app/outputs/flutter-apk/app-release.apk` (30 MB, signed); AAB: `build/app/outputs/bundle/release/app-release.aab` (49 MB) | [x] |
| M23.7 | iOS archive: `build/ios/archive/Runner.xcarchive` (built, unsigned); sign + export via Xcode Organizer or `xcodebuild -exportArchive` with provisioning profile | [-] |
| M23.8 | Google Play Store listing setup | [ ] |
| M23.9 | Apple App Store listing setup | [ ] |

---

## Folder Structure

```
lib/
├── core/
│   ├── api/
│   │   ├── api_client.dart          # Dio singleton + interceptors
│   │   └── api_endpoints.dart       # all route strings
│   ├── auth/
│   │   ├── auth_notifier.dart       # Riverpod AuthNotifier
│   │   ├── auth_repository.dart
│   │   └── token_storage.dart
│   ├── router/
│   │   └── app_router.dart          # GoRouter config + redirects
│   └── theme/
│       ├── app_theme.dart
│       └── app_colors.dart
├── features/
│   ├── auth/                        # login, register screens
│   ├── buyer/
│   │   ├── browse/                  # BuyerHomeScreen, FarmCard
│   │   ├── farm_detail/
│   │   ├── orders/
│   │   └── favorites/
│   ├── seller/
│   │   ├── dashboard/
│   │   ├── listings/
│   │   ├── herd/                    # animals, weight, vaccination, medical
│   │   ├── finance/                 # expenses, income, statements
│   │   ├── dairy/
│   │   └── supplies/
│   └── admin/
│       ├── dashboard/
│       ├── listings/
│       └── orders/
├── core/
│   └── utils/
│       ├── image_compress_util.dart  # flutter_image_compress wrapper (M17.3)
│       └── scaffold_messenger_key.dart # global SnackBar key (M2.7)
├── shared/
│   ├── models/                       # shared data models
│   ├── widgets/
│   │   ├── shimmer_widget.dart       # ShimmerBox / ShimmerCard / ShimmerList / ShimmerFill
│   │   ├── empty_state.dart
│   │   ├── status_badge.dart
│   │   ├── confirm_dialog.dart
│   │   ├── app_bottom_sheet.dart     # drag handle + title wrapper (M20.7)
│   │   ├── primary_button.dart       # haptic on press
│   │   ├── app_text_field.dart
│   │   ├── image_picker_grid.dart    # 5-image grid + source sheet
│   │   ├── contact_buttons.dart      # WhatsApp / Call / Copy (M19)
│   │   └── gov_picker.dart           # searchable 27-gov sheet + GovPickerField (M18.1)
│   └── services/
│       └── notification_service.dart
└── l10n/
    ├── app_ar.arb
    └── app_en.arb
```

---

## API Mapping (Mobile ↔ Existing Backend)

| Feature | Method | Endpoint | Used in |
|---------|--------|----------|---------|
| Login | POST | `/api/auth/login` | M3.2 |
| Register buyer | POST | `/api/auth/register` | M3.4 |
| Register seller | POST | `/api/auth/register` | M3.5 |
| Get me | GET | `/api/auth/me` | M2.4 |
| Update profile | PUT | `/api/auth/profile` | M14.3 |
| Save FCM token | POST | `/api/auth/fcm-token` | M16.5 |
| All farms | GET | `/api/sellers` | M4.1 |
| Farm detail | GET | `/api/sellers/:id` | M5.1 |
| Eid listings | GET | `/api/eid/listings` | M4.4 |
| Listing detail | GET | `/api/listings/:id` | M5.4 |
| Place order | POST | `/api/orders` | M6.1 |
| My orders (buyer) | GET | `/api/orders/my` | M6.5 |
| Write review | POST | `/api/reviews` | M6.7 |
| Toggle favorite | POST/DELETE | `/api/favorites/:id` | M4.7 |
| My favorites | GET | `/api/favorites` | M7.1 |
| Notifications | GET | `/api/notifications` | M7.4 |
| Animals list | GET | `/api/animals` | M10.1 |
| Add animal | POST | `/api/animals` | M10.4 |
| Animal detail | GET | `/api/animals/:id` | M10.6 |
| Add weight entry | POST | `/api/animals/:id/weight` | M10.7 |
| Add vaccination | POST | `/api/animals/:id/vaccination` | M10.9 |
| Medical records | GET/POST/DELETE | `/api/animals/:id/medical` | M10.10 |
| Weighing due | GET | `/api/animals/weighing-due` | M8.4 |
| My listings | GET | `/api/listings/my` ⚠️ dedicated route (before `/:id`) | M9.1 |
| Add listing | POST | `/api/listings` | M9.2 |
| Finance summary | GET | `/api/finance/summary` | M8.1 |
| Expenses | GET/POST | `/api/finance/expenses` | M11.1 |
| Income | GET | `/api/finance/income` | M11.3 |
| Statements | GET | `/api/statements` | M11.4 |
| Drill-down | GET | `/api/statements/transactions` | M11.6 |
| Market prices | GET | `/api/market-prices` | M8.5 |
| Supplies (buyer) | GET | `/api/supplies` | M4.6 |
| My supplies | GET | `/api/supplies` | M13.1 |
| Dairy (buyer) | GET | `/api/dairy` | M5.5 |
| My dairy | GET | `/api/dairy/my` | M12.1 |

> Backend changes required: M16.2 + M16.3 (FCM token storage — `fcmToken` field on User + `PATCH /auth/fcm-token`). Also: `GET /listings/my` added as a dedicated protected route in `backend/src/routes/listings.js` (must appear before `/:id` to prevent "my" being treated as a MongoDB ObjectId and returning 400).

---

## Priority Build Order

**Sprint 1 — Foundation + Auth (M1 + M2 + M3) ✅ DONE**
- Project setup, theme, RTL, routing, Dio client, token storage
- Login screen, register screens (buyer + seller), splash

**Sprint 2 — Buyer Core ✅ DONE**
- Browse farms + filters, farm detail (4 tabs), listing detail, order modal, orders list, favorites, profile + notifications, add-review sheet

**Sprint 3 — Seller Core ✅ DONE**
- Seller dashboard (KPIs + follow-ups + orders), listings screen (status filter), herd screen (type filter + summary + badges), statements screen (3 tabs + fl_chart)

**Sprint 4 — Seller Forms & Detail Screens ✅ DONE**
- Add animal + detail (LineChart + vaccinations + medical), add listing, dairy + supplies screens, FABs, router wired

**Sprint 5 — Edit Flows & Profile ✅ DONE**
- Edit animal, edit listing (GoRouter extra), buyer profile edit + change password, all edit routes

**Sprint 6 — Image Upload + Admin Foundation ✅ DONE**
- `ImagePickerGrid` widget, image picker on all 4 add/edit screens (FormData multipart)
- Admin dashboard, listings approval, users management, `_AdminShell` 3-tab nav

**Sprint 7 — Admin Full Panel ✅ DONE**
- `AdminDairyScreen` (approve POST /dairy/:id/approve, delete with confirm dialog, filter pending/approved/all)
- `AdminOrdersScreen` (status filter tabs, PUT /orders/:id/status, collapsible delivery panel PATCH /orders/:id/delivery)
- `AdminReviewsScreen` (GET /reviews/admin/all, DELETE /reviews/:id)
- `AdminEidScreen` (GET/PATCH /eid/config, Switch toggle + DatePicker Arabic locale)
- Admin nav expanded to 5 tabs: الرئيسية / الإعلانات / الطلبات / الألبان / المستخدمون
- Dashboard quick-actions row: التقييمات → /admin/reviews, إعدادات العيد → /admin/eid

**Sprint 8 — Polish & CTAs ✅ DONE**
- `ContactButtons` shared widget: WhatsApp (`https://wa.me/20...`), Call (`tel:`), Copy to clipboard + SnackBar
- Egyptian phone normalisation: strips non-digits, prepends `20` country code for WhatsApp
- Integrated in `FarmDetailScreen` `_HeaderCard` (replaces old phone tap); personal phone shown as secondary row
- `_SellerCard` added to `ListingDetailScreen`: seller avatar + farm name + "عرض المزرعة" → `/buyer/farm/:id`
- `HapticFeedback.mediumImpact()` wired into `PrimaryButton.onPressed`; `HapticFeedback.lightImpact()` on contact CTA taps and copy
- Android `<queries>`: added `DIAL/tel` intent + `com.whatsapp` package visibility
- iOS `LSApplicationQueriesSchemes`: `whatsapp`, `tel`

**Sprint 9 — Polish & UX ✅ DONE**
- Global Dio error snackbar, image compression (flutter_image_compress), ShimmerFill on all CachedNetworkImage, AppBottomSheet wrapper, Hero animations (FarmCard→FarmDetail), form auto-scroll to first invalid field, GovPickerSheet searchable bottom sheet, flutter_dotenv, flutter_launcher_icons + flutter_native_splash config

**Sprint 10 — Remaining Features ✅ DONE**
- M4.6 SupplyCard 3rd tab in BuyerHome (🛒 المستلزمات grid + /buyer/supply/:id route)
- M11.6 drill-down bottom sheet (tap expense category → filtered transactions)
- M11.7 CSV export via share_plus
- M2.10 ConnectivityWidget (animated offline banner in all 3 AppShells)
- M3.7 language toggle AR↔EN on login + register screens (localeProvider)
- All seller/buyer edit flows, delete confirmations, profile screens (M9.8, M10.5, M10.8, M10.12, M10.14, M12.3, M12.4, M13.3, M14.1–M14.5)

**Sprint 11 — PDF Export + National ID Validation ✅ DONE**
- M11.8 PDF export (pdf + printing packages)
- M3.6 National ID format validation in register screens

**Sprint 12 — Infinite Scroll ✅ DONE**
- M21.1 client-side infinite scroll: HerdScreen, SellerListingsScreen (15/10-item batches + CircularProgressIndicator footer), BuyerHomeScreen _FarmsTab (12-item batches, CustomScrollView + SliverGrid, filter reset)
- Backend `GET /api/animals` and `GET /api/listings` extended with optional `?page&limit` server-side pagination (returns `{items, total, page, pages, hasMore}` when params present, backwards-compatible array when not)

**Sprint 13 — Testing (M22) ✅ DONE**
- M22.1 Unit tests: `test/unit/national_id_util_test.dart` (21 cases — length/format, century, date, gov codes, age, gender), `test/unit/model_helpers_test.dart` (20 cases — ListingModel.ageText/typeAr/fromJson, AnimalModel.ageText/typeAr/genderAr/fromJson)
- M22.2 Widget tests: `test/widget/empty_state_test.dart` (5 cases — icon, title, subtitle, action button, circular container), `test/widget/status_badge_test.dart` (19 cases — all 15 statuses + fallback + font-size variants)
- M22.4 RTL + ProviderScope smoke tests in `test/widget_test.dart`
- **Total: 68/68 tests passing** (`flutter test` 0 failures)

**Sprint 14 — FCM Push Notifications (M16) ✅ DONE**
- Firebase project `farmflow-d049d` configured via FlutterFire CLI
- `firebase_core: ^3.13.1` + `firebase_messaging: ^15.2.5` added to `pubspec.yaml`
- `Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform)` in `main()`
- `FcmService` (`lib/core/services/fcm_service.dart`): request permission, get token → `PATCH /auth/fcm-token`, `onTokenRefresh`, foreground `SnackBar` with "عرض" action, `onMessageOpenedApp` + `getInitialMessage` deep-link routing
- Background handler: top-level `_firebaseMessagingBackgroundHandler` with `@pragma('vm:entry-point')`
- Deep-link routing: `data.link` path first; fallback `data.type` switch (order → /buyer/orders, listing → /seller/listings, herd → /seller/herd, etc.)
- Backend: `fcmToken: String` field on User model + `PATCH /auth/fcm-token` protected endpoint
- `FarmFlowApp` converted to `ConsumerStatefulWidget`; FCM init guarded by `_fcmInitialised` bool
- **Note:** M16.4/M16.8 (server-side push via firebase-admin) not implemented — token storage ready for future use

**Sprint 15 — Release (M23) ✅ MOSTLY DONE**
- `flutter_launcher_icons` run: adaptive Android icon (green bg `#3A7D44` + foreground PNG) + iOS icon (alpha stripped). Assets: `assets/icon/icon.png` + `assets/icon/icon_foreground.png`.
- `flutter_native_splash:create` run: green splash on Android (v21 + v31 window inset styles) + iOS `LaunchScreen.storyboard`.
- Android signing: PKCS12 keystore at `android/keystore/farmflow-release.jks` (alias `farmflow`, valid 27+ years); `key.properties` read at build time (gitignored); `build.gradle.kts` `signingConfigs.release` with `isMinifyEnabled + isShrinkResources`; ProGuard rules include Flutter + Firebase + Play Core dontwarn.
- **`app-release.apk`** built and signed: `build/app/outputs/flutter-apk/app-release.apk` (30 MB)
- **`app-release.aab`** built and signed: `build/app/outputs/bundle/release/app-release.aab` (49 MB) — upload this to Google Play.
- **`Runner.xcarchive`** built (unsigned): `build/ios/archive/Runner.xcarchive` (288 MB) — open in Xcode Organizer, add Apple Developer team + provisioning profile, then Distribute App → App Store Connect.
- iOS display name fixed to `FarmFlow` (was "Farmflow Mobile") in `ios/Runner/Info.plist`.
- **Post-release fixes:**
  - Icon timing: original APK was built 4 min before icons were generated (timestamp mismatch); APK rebuilt with correct icon and redistributed.
  - `android:usesCleartextTraffic="true"` added to `AndroidManifest.xml` `<application>` tag — Android 9+ blocks plain HTTP without this flag.
  - `.env` API URL changed from `http://10.0.2.2:5001/api` (Android emulator alias — unreachable on real devices) to `http://192.168.1.10:5001/api` (Mac local WiFi IP); both devices must be on the same network. Option B: deploy backend to Railway/Render for a public HTTPS URL that removes the same-network constraint.
  - APK redistributed via Firebase App Distribution to `khalilbido03@gmail.com`.
- **Remaining:** Google Play + App Store developer accounts, store listing copy/screenshots, Apple provisioning profile for signed IPA export.

**Sprint 16 — Remaining Flutter tasks ✅ DONE**
- **M16.4/M16.8 (server-side push):** `backend/src/utils/pushNotify.js` already fully implemented — `firebase-admin` installed, `sendPush(userId, {title, body, data})` fetches user's `fcmToken` from DB and calls `admin.messaging().send()`. Wired into every `createNotification()` call in `notify.js` (fire-and-forget, never blocks). Activate by setting `FIREBASE_SERVICE_ACCOUNT_JSON` in `backend/.env` (download key from Firebase Console → Project Settings → Service Accounts → Generate new private key → minify JSON → paste as single-line value).
- **M18.2 (geolocator):** `geolocator: ^12.0.0` added to `pubspec.yaml`; `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION` added to `AndroidManifest.xml`; `NSLocationWhenInUseUsageDescription` added to `ios/Runner/Info.plist`. "استخدام موقعي الحالي" button added to `_GovPickerSheet` — requests permission → `Geolocator.getCurrentPosition(desiredAccuracy: medium)` → Euclidean distance to 27 Egyptian governorate centroids → pops sheet with nearest match. Error string shown below button on service-disabled / permission-denied / timeout.
- **M22.3 (integration test):** `integration_test: sdk: flutter` added to `dev_dependencies`. `integration_test/app_test.dart` created — covers full buyer flow: splash/auto-login check → enter credentials → tap login → assert BuyerHomeScreen → tap first farm card → tap مواشي tab → tap first listing → tap order button → assert OrderModal payment options. Credentials passed via `--dart-define=TEST_EMAIL=... TEST_PASSWORD=...` (defaults to seeded `buyer1@farmflow.com / buyer123`). Requires backend running + DB seeded.

---

## Key Mobile-First Decisions

| Decision | Rationale |
|----------|-----------|
| **Riverpod over BLoC** | Less boilerplate, easier async state, good for smaller team |
| **GoRouter over Navigator 2.0** | Declarative, supports deep links for FCM notification taps |
| **Dio over http** | Interceptors for JWT injection + refresh, FormData for multipart, better error handling |
| **fl_chart over charts_flutter** | Actively maintained, supports line + bar + pie charts needed for finance screens |
| **No local database (Hive/Drift)** | Mobile app targets online-first use; avoid sync complexity for v1 |
| **Bottom nav (4 items max)** | Thumb-reachable, matches iOS/Android HIG for primary navigation |
| **Arabic-first RTL** | `Directionality.of(context)` + `TextDirection.rtl` ensures correct layout without per-widget overrides |
| **No admin complex screens on mobile** | Admin approval workflows work better on desktop; mobile admin is read + quick actions only |
