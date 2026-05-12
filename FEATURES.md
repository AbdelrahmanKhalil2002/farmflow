# FarmFlow — Complete Feature List

> FarmFlow is an Egyptian farm marketplace platform connecting livestock sellers with buyers.
> Available on **Web**, **Mobile (iOS & Android)**, and **Desktop (macOS & Windows)**, with Arabic RTL as the default language.
> Three user roles: **Seller** (farm owner) · **Buyer** (customer) · **Admin** (platform manager)

---

## Authentication

| Feature | What it does |
|---------|-------------|
| Login | Sign in with email or phone number + password. The app automatically detects your role (seller, buyer, or admin) and takes you to the right home screen. |
| Register as Buyer | Create a buyer account by entering your name, email, phone number, national ID (auto-validated), password, and governorate. |
| Register as Seller | Create a seller account with personal info + farm details: farm name, farm phone, location, years of experience, animal types you raise, and a bio. |
| National ID Validation | When you enter your national ID, the app instantly reads your birth date, age, and governorate from the ID number — no manual entry needed. |
| Email Verification | After registration, a verification link is sent to your email address (24-hour expiry). Unverified accounts can resend the link from the login screen. |
| Password Reset | Forgot your password? Request a reset link via email — valid for 1 hour. Enter a new password on the reset page. |
| Language Toggle | Switch between Arabic and English on the login and registration screens. |

---

## Seller Features

### Dashboard

| Feature | What it does |
|---------|-------------|
| KPI Summary | Shows your total income, total expenses, net profit, and total number of animals — all in one glance. |
| Income vs. Expense Chart | A line chart showing your income and expenses over the last 30 days so you can see financial trends at a glance. |
| Recent Orders Feed | Displays the last 5 orders placed by buyers so you can take action quickly. |
| Herd vs. Listings Chart | A grouped bar chart showing, per animal type, how many animals you own versus how many are actively listed for sale. |
| Vaccination Reminders | Lists animals that have a vaccination due within the next 14 days so nothing is missed. |
| Weighing Reminders | Lists animals that haven't been weighed in the last 7 days to keep growth records up to date. |
| Quick Action Buttons | One-tap shortcuts to add a new listing, add a new animal, or open the financial statements. |

---

### Farm Management

| Feature | What it does |
|---------|-------------|
| Multi-Farm Support | Create and manage multiple farms under one seller account. Each farm has its own name, type, governorate, phone, banner photo, working hours, and typical prices. |
| Farm Profile | Edit your farm's public profile: name, type (livestock / poultry / dairy / horses / mixed), governorate, phone, bio, farm description, certificates, and location coordinates. |
| Farm Banner | Upload a cover banner image shown to buyers on your farm's public page. |
| Legacy Migration | One-tap migration converts your existing profile-level farm fields into a full Farm record if you registered before multi-farm support was added. |

---

### Livestock Listings

| Feature | What it does |
|---------|-------------|
| My Listings | View all your livestock listings with their current status: pending approval, approved, sold, draft, or rejected. |
| Add Listing | Create a new livestock listing by choosing the animal type, entering weight, price (total or per kg), and delivery options, uploading up to 5 photos, and optionally marking it as available for Eid or slaughter service. Save as draft or submit for review. |
| Edit Listing | Update any detail on an existing listing — price, photos, delivery options, etc. |
| Delete Listing | Remove a listing with a two-step confirmation to prevent accidental deletion. |
| Publish Draft | Promote a saved draft to pending review with a single tap. |
| Eid Mode Toggles | Mark a listing as available for Eid purchase and/or offer a slaughter service with optional cost. |
| Qurbani Shares | Split a large animal into shares for group purchase during Eid. |
| Deposit Option | Require a deposit (configurable percentage) to reserve a listing before full payment. |
| Herd Size Guard | The platform prevents you from having more than 100 active listings above your registered herd size, keeping your listings realistic. |
| Market Price Hint | When creating or editing a listing, a yellow bar shows the current market average price per kg for that animal type so you can price competitively. |

---

### Herd Management

| Feature | What it does |
|---------|-------------|
| Herd Screen | View all your animals in a grid, filter by animal type or status (active / sold / all), and search by name or tag ID. Loads in batches of 15 with infinite scroll. |
| Herd Summary | A quick strip at the top showing total animal count, average age, average weight, and breakdown by type. |
| Add Animal | Register a new animal with type, breed, tag ID, gender, date of birth, weight, color, pregnancy status, and a photo. |
| Animal Detail | A full profile for each animal with four tabs: Growth, Vaccinations, Medical Records, and Info. |
| Growth Chart | A line chart tracking the animal's weight over time. Add new weight entries and set a target weight with a progress bar. |
| Vaccination Records | Log vaccinations with the vaccine name and date. Overdue and upcoming vaccinations are color-coded for easy spotting. |
| Medical Records | Log vet visits with diagnosis, treatment, medication, vet name, cost, and follow-up date. |
| Pregnancy Tracking | Set and update pregnancy status (not pregnant, pregnant, recently gave birth) with expected delivery date. |
| List Animal for Sale | Directly create a listing from an animal's profile with type, breed, and weight pre-filled. |
| Delete Animal | Remove an animal record with a two-step confirmation. |
| Vet Records (Cross-Herd) | A dedicated screen showing all medical records and all vaccination entries across your entire herd in one view, with tabs for medical / vaccinations. |
| Breed Settings | Define and save custom breed names per animal type so they appear in your listing and animal forms. |

---

### Finance

| Feature | What it does |
|---------|-------------|
| Statements Screen | A three-tab financial overview: a bar chart summary, an expenses list, and an income list — all filterable by year and quarter. |
| KPI Strip | Shows total income, total expenses, net profit, and your best-performing month at the top of the statements screen. |
| Monthly P&L Table | A scrollable table with income and all 9 expense categories per month. Profit months are green, loss months are red. |
| Add Expense | Log a farm expense by selecting a category (feed, veterinary, transport, electricity, salaries, rent, water, maintenance, or other), entering the amount, date, and notes. |
| Drill-Down | Tap any category or bar on the chart to see the individual transactions that make it up. |
| Export CSV | Export your financial data as a CSV file (UTF-8 BOM, renders correctly in Excel) and share it via any app. |
| Export PDF | Generate a formatted A4 PDF report (RTL Arabic, Cairo font) of your statements and share or print it. |
| Budget Tracking | Set monthly or yearly budgets for each expense category and track how much you've spent against your budget with visual progress bars. |

---

### Dairy Products

| Feature | What it does |
|---------|-------------|
| Dairy Products List | View all your dairy listings (milk, cheese, yogurt, butter, cream, ghee) with their approval status. |
| Add Dairy Product | Create a new dairy listing by selecting the product type, entering quantity, unit, price, availability dates, delivery options, and uploading photos. |
| Edit / Delete | Update an existing dairy product or remove it with a confirmation dialog. |

---

### Farm Supplies

| Feature | What it does |
|---------|-------------|
| Supplies List | View all your supply listings (feed, equipment, seeds, veterinary supplies, etc.) with status badges. |
| Add Supply | Create a supply listing with category, name, quantity, price, location, delivery toggle, and photos. |
| Edit / Delete | Update or remove a supply listing. |

---

### Seller Profile & Settings

| Feature | What it does |
|---------|-------------|
| Profile Screen | View and edit your personal and farm details: name, phone numbers, governorate, years of experience, animal types, bio, and farm description. |
| Change Password | Update your account password from the profile screen. |
| Notification Preferences | Toggle in-app notification categories on or off (orders, reminders, dairy, messages). |
| Language Setting | Switch between Arabic and English from the Settings page — persists across sessions. |

---

## Buyer Features

### Browse & Discover

| Feature | What it does |
|---------|-------------|
| Home / Marketplace | Browse all farms selling livestock, dairy products, and supplies. See farm cards with name, location, star rating, and available animal types. Loads in pages of 12 with infinite scroll. |
| Search | Search for farms by name or keywords. |
| Filters | Filter farms by governorate, animal type, price range (min/max ج.م/كجم), and sort order (newest, top-rated, price). |
| Eid Tab | A dedicated tab showing farms and listings marked as available for Eid with special offers. An Eid countdown banner appears when the season is active or within 30 days. |
| Supplies Tab | Browse farm supplies (feed, equipment, seeds, etc.) from sellers. |
| Favorite a Farm | Tap the heart icon on any farm card to save it to your favorites list for quick access later. |
| Location Auto-Detect | When selecting your governorate, tap "استخدام موقعي الحالي" to automatically detect your nearest Egyptian governorate from your GPS position. |

---

### Farm & Listing Detail

| Feature | What it does |
|---------|-------------|
| Farm Detail Screen | View a seller's full farm profile: banner photo, ratings, contact options, and four tabs showing their livestock, dairy products, supplies, and buyer reviews. |
| Listing Detail | See full animal information — type, breed, age, weight, health status, photos — alongside price and delivery options. |
| Price Comparison Badge | Each listing shows whether its price is below market (📉 green), fair (✓ amber), or above market (📈 red) compared to the current average for that animal type. |
| Dairy Product Detail | View product description, price, delivery info, and seller contact. |
| Supply Detail | View supply details, pricing, availability, and contact the seller. |
| Reviews Section | See all buyer reviews for a farm with star ratings, comments, and a rating breakdown (5→1 star proportional bars). |
| Contact Seller | Three contact options on every farm/listing: open WhatsApp chat, call directly, or copy the phone number. |
| Message Seller | Send a direct message to a seller from their farm page — opens the in-app messaging thread. |

---

### Ordering

| Feature | What it does |
|---------|-------------|
| Place Order | From any listing detail, open the order form: choose delivery or pickup, select payment method (Cash on Delivery or InstaPay), and add notes. |
| Order Confirmation | A confirmation message appears immediately after placing an order. |
| My Orders | View all your orders across tabs: الكل / نشط / مكتمل / ملغي — with pull-to-refresh. |
| Order Detail | Tap any order to see full details: items, delivery cost, notes, seller contact, and status. |
| Print Receipt | Tap "تحميل الإيصال" on any order to open a styled Arabic PDF receipt in a new window — save as PDF via the browser/app print dialog. |
| Write a Review | After an order is delivered, leave a star rating (1–5) and optional comment for the seller. Each order can only be reviewed once. |

---

### Favorites & Account

| Feature | What it does |
|---------|-------------|
| Favorites Screen | View all your saved farms in one list. Tap to visit a farm or remove it from favorites. |
| Buyer Profile | View and edit your account details: name, phone, email, and governorate. |
| Change Password | Update your account password. |
| Notifications | A bell icon shows unread notification count. The notifications screen lists all updates (order confirmed, listing approved, etc.) with mark-all-read. |

---

## Messaging

| Feature | What it does |
|---------|-------------|
| In-App Chat | Buyers and sellers can exchange messages through a conversation thread — no need to share personal contact details. |
| Conversation List | A unified inbox shows all your conversations, sorted by most recent, with unread message count badges. Unread count is updated every 30 seconds automatically. |
| Message Thread | Each conversation shows the full message history with timestamps and a reply input at the bottom. |
| Seller Navigation | Buyers reach the messaging screen by tapping "💬 رسالة للبائع" on any farm detail page, with the farm name pre-filled as context. |
| Unread Badges | The sidebar nav link and mobile drawer show a red unread count badge so you always know when you have new messages. |

---

## Admin Features

> The admin panel is available on both web (full) and mobile (quick actions only).

| Feature | What it does |
|---------|-------------|
| Admin Dashboard | Platform-wide overview: total users, total listings, total orders, and revenue. Includes order trend chart and revenue breakdown by governorate. |
| Platform Analytics | Weekly Monday-aligned charts for new users, new listings, new orders, and total GMV (gross merchandise value) — up to 52 weeks of history. |
| Financial Analytics | Monthly seller income and expense trends, income breakdown by animal type, top revenue-generating animal types, and order statistics. Filter by seller or view platform-wide. |
| Eid Mode Settings | Toggle Eid season on or off for the entire platform, and set the Eid date so buyers see the countdown banner and relevant listings. |
| User Management | View all registered users with per-user listing count, order count, and revenue stats. Search by name. Toggle any user active or inactive to restrict platform access. |
| Listing Approval | Review listings submitted by sellers. Approve to make them visible to buyers, or reject — the seller receives a notification either way. |
| Dairy Approval | Same approval workflow for dairy product listings. |
| Order Management | View all orders on the platform. Update order status (pending → confirmed → in transit → delivered / cancelled) and delivery status for any order. |
| Reviews Moderation | View all buyer reviews (tabs: all / high ≥4 / low <3). Search, sort, expand comments, and delete reviews that violate platform guidelines. |
| Market Prices | Horizontal bar chart per animal type showing min / average / max price per kg across all approved listings in the last 90 days, with optional governorate filter. |

---

## Platform-Wide Features

| Feature | What it does |
|---------|-------------|
| Arabic RTL Layout | The entire app is built right-to-left for Arabic. Cairo and Tajawal fonts are used throughout for a native Arabic reading experience. |
| Language Switch | Users can switch between Arabic and English at any time — from the auth screens or from Settings. The preference persists across sessions. |
| Push Notifications (Mobile) | Real-time device push notifications via Firebase Cloud Messaging (FCM) for new orders, listing approval/rejection, messages, and vaccination reminders. Tapping a notification deep-links to the relevant screen. |
| In-App Notifications (All Platforms) | A notification centre in every layout shows all platform events with Arabic timestamps. Mark individual or all notifications as read. |
| Email Notifications | Transactional emails are sent for new orders (seller), order confirmed/completed/cancelled (buyer), listing approved/rejected (seller), and email verification/password reset. Activated by configuring SMTP credentials on the server. |
| Offline Banner | When the device loses internet connection, a red banner appears at the top of every screen alerting the user. It disappears automatically when connectivity returns. Cached data is served while offline. |
| Image Upload | Sellers can upload up to 5 photos per listing, animal, or product. Images are compressed automatically before uploading to save bandwidth. Stored on the production server's persistent disk. |
| Shimmer Loading | Instead of a blank screen, a shimmering placeholder appears while data loads — giving instant visual feedback. |
| Global Error Messages | If a server request fails, a red Arabic error message automatically appears explaining what went wrong. |
| Pagination | All long lists (listings, herd, farms, orders) support server-side pagination. The web app paginates at `/api?page=&limit=`; mobile apps use client-side infinite scroll in batches. |
| JWT Authentication | All API calls are secured with a JWT token. If the token expires, the app automatically redirects to the login screen. |
| Rate Limiting & Security | The backend applies rate limits on all routes and uses `helmet` security headers to prevent common web attacks. |
| HTTPS Production | The web app and API are served over HTTPS at `مزرعتي.com` (Let's Encrypt certificate, auto-renewed). |
| Auto-Deploy | Every push to the `main` branch automatically deploys the latest code to the production server via GitHub Actions. |

---

## Desktop App (Electron)

> Available as a standalone macOS (.dmg) or Windows (.exe / NSIS installer) app — no browser needed.

| Feature | What it does |
|---------|-------------|
| Full Feature Parity | The desktop app wraps the complete React web frontend — every seller, buyer, and admin feature available on the web works identically on desktop. |
| Native File Save | Export reports and data directly to a folder on your computer using the native OS save dialog — no browser download prompt. |
| OS Notifications | Native desktop notifications appear for new orders, messages, and listing status changes — even when the app is minimised. |
| Dock / Tray Badge | The app icon in the dock (macOS) or system tray (Windows) shows an unread notification count badge. |
| Minimise to Tray | Closing the window sends the app to the system tray instead of quitting — it keeps running and notifying in the background. |
| Auto-Updater | The app silently checks for new releases on GitHub and installs updates in the background. You see a "restart to update" prompt when ready. |
| Deep Links | `farmflow://` URLs in emails and notifications open the desktop app and navigate directly to the relevant listing, farm, or order. |
| Native App Menu | A fully translated Arabic menu bar (macOS) with keyboard shortcuts: Cmd+Shift+E to export CSV, Cmd+Shift+P to export PDF, from any seller screen. |
| Spellcheck | The text editor in forms and messages has Arabic + English spellcheck enabled via the system dictionary. |
| Frameless Title Bar | On macOS, the window uses a seamless title bar with the FarmFlow green colour. On Windows, the title bar overlay matches the brand. |
| Splash Screen | A branded splash screen with an animated loading bar appears while the app loads on first launch. |

---

## Mobile App (Flutter — iOS & Android)

> Available as a signed APK/AAB for Android (distributed via Firebase App Distribution pending Play Store submission) and as an iOS archive (pending App Store submission).

| Feature | What it does |
|---------|-------------|
| Full Feature Parity | The Flutter app covers all seller, buyer, and admin flows available on the web — listings, herd, finance, dairy, supplies, orders, messaging, and notifications. |
| Native Push Notifications | FCM push notifications with deep-link routing — tapping a notification opens the relevant screen directly. |
| Location Auto-Detect | In the governorate picker, tap "استخدام موقعي الحالي" to auto-select your nearest Egyptian governorate from GPS. |
| PDF Export | Generate and share A4 RTL financial statement PDFs directly from the mobile app using the system share sheet. |
| CSV Export | Export financial data as a CSV file and share via any installed app. |
| Image Compression | Photos are automatically compressed before upload to minimise data usage on mobile connections. |
| Infinite Scroll | All long lists (herd, listings, farms) load incrementally as you scroll — no page buttons needed. |
| Haptic Feedback | Key actions (buttons, CTAs, confirmations) provide tactile haptic feedback for a native feel. |
| Hero Animations | Tapping a farm or listing card animates the image smoothly into the detail screen. |
| Bottom Sheet Navigation | Forms, filters, and pickers slide up as bottom sheets instead of opening new pages — keeping context visible. |
| WhatsApp / Call Integration | Contact buttons open WhatsApp or the phone dialler directly, with automatic Egyptian phone number normalisation. |
| RTL Layout | The entire app renders right-to-left for Arabic. Flipping to English switches direction automatically. |
| 68 Automated Tests | Unit tests (national ID logic, model helpers), widget tests (empty states, status badges), and a full integration test covering the buyer flow from login to order placement. |

---

## Coming Soon (v2 Roadmap)

> Full task breakdown in [docs/PLAN.md §38](docs/PLAN.md), [docs/FLUTTER_PLAN.md Sprint 19](docs/FLUTTER_PLAN.md), and [docs/DESKTOP_PLAN.md Phase 7](docs/DESKTOP_PLAN.md).

| Feature | What it will do |
|---------|----------------|
| **Cloudinary CDN** | Migrate all image storage from the server disk to Cloudinary for fast global delivery, automatic resizing, and no storage limits. |
| **Paymob Payment Gateway** | Accept live card, Fawry, and mobile-wallet payments — replacing the current placeholder InstaPay flow with a real payment provider. |
| **SMS OTP Verification** | Confirm phone numbers on registration and password reset with a 6-digit code sent via SMS (Twilio or Vonage). |
| **Referral System** | Every user gets a unique referral code and shareable link. Referring new users earns rewards such as free promoted listings. |
| **Real-Time Chat (Socket.io)** | Replace the 30-second polling in the messaging system with a persistent Socket.io connection for instant message delivery, read receipts, and typing indicators. |
| **Live Auction** | Sellers can run timed auctions on a listing. Buyers place bids in real time with a live countdown timer; the highest bidder wins when time runs out. |
| **Delivery Tracking** | After an order is confirmed, sellers create a shipment via Bosta or Aramex. Buyers track the courier status in real time directly from their order detail screen. |
| **Promoted Listings** | Sellers pay to pin their listing to the top of buyer search results for 1, 7, or 30 days — powered by Paymob. |
| **Escrow Payments** | Buyer payment is held securely until the buyer confirms delivery. Funds are released to the seller automatically. Admins can intervene in disputes. |
| **Digital Health Certificate** | Each animal gets a QR code linking to a public health summary page showing its vaccination history, medical records, and last vet visit — verifiable by buyers without an account. |
| **Video Listings** | Sellers can upload a short video (up to 60 seconds) alongside listing photos so buyers can see the animal in motion before buying. |
| **Vet Consultation** | Browse a directory of veterinarians, book a consultation slot, and chat (or video call) directly in the app — no need to visit the clinic for routine questions. |
