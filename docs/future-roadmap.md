# FarmFlow — Future Roadmap

This document outlines planned improvements beyond the current MVP. Items are grouped by theme and roughly ordered by priority.

---

## 1. Real Payment Integration

### Visa / Mastercard (Stripe or PayTabs)

The current system records deposits and COD orders but does not process any real money. Adding card payments would:

- Integrate Stripe (global) or PayTabs (MENA-focused) as the payment gateway
- Replace the `paymentType: 'deposit'` free-text flow with a real checkout session
- Store transaction IDs and payment status on the Order document
- Trigger automatic income records when payment is confirmed (webhook-driven)
- Provide a refund mechanism when orders are cancelled

**Schema changes needed:**
```
orders.paymentStatus    — pending | paid | refunded
orders.transactionId    — gateway reference
orders.paidAt           — timestamp
```

### InstaPay / Fawry (Egypt/MENA local)

For sellers and buyers who prefer local payment rails:

- Generate a payment reference number for each order
- Buyer pays via InstaPay or Fawry using the reference
- Webhook or manual admin confirmation marks the order as paid

---

## 2. Mobile Application

### React Native (shared logic)

Much of the service layer (`api.js`, all `*Service.js` files, `token.js`, `format.js`) is pure JavaScript and can be reused in a React Native app with minimal changes.

**Planned screens:**

| Screen | Role |
|--------|------|
| Browse & Search | Buyer |
| Listing Detail + Order | Buyer |
| My Orders | Buyer |
| Add Listing (camera) | Seller |
| My Livestock | Seller |
| Finance Dashboard | Seller |
| Push notification inbox | All |

**Platform-specific additions:**
- Camera access for listing photos (replace the file input)
- Biometric login (Face ID / fingerprint) as an alternative to password entry
- Deep links for sharing individual listings

---

## 3. Notifications System

### In-App Notifications

A `notifications` collection and a notification bell in the navbar:

```
notifications
  recipient   ObjectId  ref: User
  type        String    — new_order | order_confirmed | listing_approved | listing_rejected
  message     String
  relatedId   ObjectId  — the order or listing this refers to
  read        Boolean   default: false
  createdAt   Date
```

Notifications triggered by:
- Admin approves/rejects a listing → notify the seller
- Buyer places an order → notify the seller
- Seller confirms/cancels an order → notify the buyer
- Order completed → notify both parties

### Push Notifications (Mobile)

- Firebase Cloud Messaging (FCM) for Android and iOS
- Store FCM tokens in the User document
- Send push when the same events above occur
- Respect quiet hours preference

### Email Notifications

- Transactional emails via SendGrid or AWS SES
- Welcome email on registration
- Order placed/confirmed/completed notifications
- Weekly financial summary email to sellers (total income, expenses, net profit for the week)

---

## 4. Search and Filtering

The current browse page shows all approved listings with no filtering. Adding:

- Search by type, breed, location
- Price range slider
- Age and weight range filters
- Sort by: newest, price (low to high / high to low), closest location
- Saved searches / watchlists for buyers

**Backend:** Add query param support to `GET /listings` (`?type=sheep&minPrice=500&maxPrice=2000&location=Riyadh`)

---

## 5. Listing Enhancements

### Multiple Animals per Listing

Currently one listing = one animal. Supporting a batch/herd listing:

```
listings.quantity   Number   default: 1
listings.priceUnit  String   per_head | per_batch
```

### Video Upload

- Allow one short video (max 30 s) per listing in addition to photos
- Store in cloud object storage (AWS S3 or Cloudflare R2) instead of local disk
- Stream via signed URLs

### Listing Expiry

- Listings auto-expire after 60 days if not sold
- Seller receives a reminder 7 days before expiry
- One-click relist resets the timer and re-enters the admin approval queue

---

## 6. Seller Reputation System

Trust is critical in livestock trading. Planned:

- Buyers can rate sellers (1–5 stars) after order completion
- Average rating shown on listing cards and detail pages
- Review text (optional)
- Admin can remove abusive reviews

```
reviews
  reviewer   ObjectId  ref: User (buyer)
  seller     ObjectId  ref: User
  order      ObjectId  ref: Order
  rating     Number    1–5
  comment    String
  createdAt  Date
```

---

## 7. Admin Enhancements

### Bulk Actions

- Approve or reject multiple pending listings at once
- Bulk deactivate user accounts

### Audit Log

Track every admin action with timestamp and actor:

```
audit_logs
  admin      ObjectId
  action     String    — approve_listing | reject_listing | deactivate_user | ...
  targetId   ObjectId
  targetType String    — listing | user | order
  createdAt  Date
```

### Analytics Dashboard

Replace the four stat cards with charts:
- New registrations over time (line chart)
- Orders per week (bar chart)
- Revenue by livestock type (pie chart)
- Top sellers by volume

---

## 8. Security Hardening

### httpOnly Cookies

Migrate from `sessionStorage` JWT to httpOnly cookies set by the backend. This eliminates the XSS risk of client-accessible token storage entirely. Requires:

- Backend sets `Set-Cookie: ff_token=...; HttpOnly; Secure; SameSite=Strict`
- Frontend removes all `sessionStorage` token logic
- CSRF token added to all state-changing requests

### Short-Lived JWT + Refresh Tokens

Current tokens are valid for 7 days. Replace with:
- Access token: 15-minute expiry
- Refresh token: 7-day expiry, stored in httpOnly cookie
- `POST /auth/refresh` issues a new access token silently
- Refresh tokens stored in the database so they can be invalidated on logout or account deactivation

### Rate Limiting

- `express-rate-limit` on `/api/auth/login` — max 10 attempts per IP per 15 minutes
- General API rate limit: 100 requests per IP per minute

---

## 9. Internationalisation (i18n)

The UI is currently English-only. Given the target market (Arabic-speaking users):

- Arabic (RTL) as the primary language with `react-i18next`
- RTL layout support with CSS logical properties
- Currency display in Saudi Riyals (SAR) or Egyptian Pounds (EGP) based on user locale
- Date formatting according to the Hijri or Gregorian calendar preference

---

## 10. Deployment

### Current State
Runs locally only. No production deployment.

### Target Stack
- **Backend:** Railway, Render, or AWS EC2
- **Database:** MongoDB Atlas (free tier → M10 for production)
- **Frontend:** Vercel or Netlify
- **Images:** AWS S3 with CloudFront CDN (replace local `/uploads/`)
- **CI/CD:** GitHub Actions — run lint and build on every pull request, deploy `main` automatically

### Environment Changes Needed
- Replace `MONGO_URI` with Atlas connection string
- Replace local file storage with S3 presigned upload URLs
- Set `FRONTEND_URL` to the production domain
- Set `JWT_SECRET` to a cryptographically random 256-bit value
- Enable HTTPS (handled by the hosting platform)
