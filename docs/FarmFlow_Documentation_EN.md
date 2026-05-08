# FarmFlow — Official Documentation

> **Egyptian Livestock Marketplace Platform**
> Connecting farm owners with buyers across Egypt

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Description](#project-description)
3. [The Problem We Solve](#the-problem-we-solve)
4. [Platform Overview](#platform-overview)
5. [Seller Features](#seller-features) *(Dashboard, Herd, Listings, Finance, Dairy, Supplies, Orders, Analytics, Messages, Settings)*
6. [Buyer Features](#buyer-features) *(Browse, Orders, Messages, Account)*
7. [Admin Panel](#admin-panel)
8. [Platform-Wide Features](#platform-wide-features)
9. [Technology Stack](#technology-stack)
10. [Coming Soon](#coming-soon)

---

## Executive Summary

**FarmFlow** is a digital platform designed specifically for the Egyptian livestock market. It bridges the gap between farm owners (sellers) and customers (buyers) by providing a transparent, trusted, and easy-to-use marketplace for livestock, dairy products, and farm supplies.

The platform serves three types of users:
- **Sellers** — Farm owners who manage their herds, list animals for sale, and track their finances
- **Buyers** — Customers who browse farms, discover livestock, and place orders
- **Admins** — Platform managers who maintain quality and approve listings

FarmFlow is available on:
- **Web** (Browser — for both sellers and buyers)
- **Mobile App** (iOS & Android — Flutter)
- **Desktop App** (Windows/macOS — works offline and online, designed for farm owners with PCs)

---

## Project Description

FarmFlow is a full-stack Egyptian livestock marketplace that digitalizes the traditionally informal livestock trade. Farmers can manage every aspect of their business — from tracking each animal's health and weight to setting budgets and exporting financial reports. Buyers get a trustworthy discovery platform with verified listings, health certificates, and direct seller contact.

The platform is designed with Egypt-first principles:
- Full Arabic RTL interface
- Egyptian governorates and EGP currency
- National ID auto-validation (reads birth date, age, and region from the ID number)
- Support for local payment methods (Cash on Delivery, InstaPay)

---

## The Problem We Solve

The livestock trade in Egypt faces several challenges:

| Problem | How FarmFlow Solves It |
|---------|----------------------|
| No centralized marketplace | A single platform listing all farms and available animals |
| Lack of transparency about animal health | Every listing shows health status, vaccination records, and health certificates |
| Difficulty tracking farm expenses and income | Built-in financial management with expense categories, budgets, and PDF/CSV exports |
| No herd management tools | Full herd tracking: weight history, vaccinations, medical records, pregnancy status |
| Informal and unverified transactions | Admin approval process, verified seller profiles, and structured order flow |
| No dairy or supplies channel | Separate sections for dairy products and farm supplies alongside livestock |

---

## Platform Overview

### Multi-Platform Architecture

| Platform | Target User | Connectivity |
|----------|-------------|-------------|
| Web App | Sellers & Buyers | Online only |
| Mobile App (iOS/Android) | Sellers & Buyers | Online |
| Desktop App | Sellers (farm owners with PCs) | **Offline & Online** |

> The Desktop App is specifically designed for farm owners who prefer working on a PC. It functions fully offline and syncs data when connected to the internet.

### Three User Roles

```
┌─────────────────────────────────────────────────────────────────┐
│                         FARMFLOW                                  │
├─────────────────┬───────────────────┬───────────────────────────┤
│     SELLER      │      BUYER        │         ADMIN              │
│  Farm Owner     │  Customer         │  Platform Manager          │
│                 │                   │                            │
│ • Herd Mgmt     │ • Browse Farms    │ • Approve Listings         │
│ • Listings      │ • Place Orders    │ • Manage Users             │
│ • Finance       │ • Favorites       │ • Monitor Platform         │
│ • Dairy         │ • Reviews         │ • Eid Mode Control         │
│ • Supplies      │ • Notifications   │ • Order Oversight          │
└─────────────────┴───────────────────┴───────────────────────────┘
```

---

## Seller Features

### 1. Dashboard

The seller's command center. At a glance, the seller can see:

| Feature | Description |
|---------|-------------|
| KPI Cards | Total income, total expenses, net profit, and total number of animals |
| Income vs. Expense Chart | Line chart showing financial trends over the last 30 days |
| Recent Orders | The last 5 buyer orders for quick action |
| Vaccination Reminders | Animals with vaccinations due in the next 14 days |
| Weighing Reminders | Animals not weighed in the last 7 days |
| Quick Actions | One-tap shortcuts: Add Listing, Add Animal, Open Statements |

---

### 2. Herd Management

Complete lifecycle management for every animal on the farm.

#### 2.1 Herd Overview
- Grid view of all animals, filterable by type (cattle, sheep, camels, goats, horses, rabbits) or status (active / sold / all)
- Summary strip: total count, average age, average weight, type breakdown

#### 2.2 Animal Profile
Each animal has a full digital passport with four tabs:

| Tab | What It Contains |
|-----|-----------------|
| Growth | Weight history chart, target weight with progress bar, weight entry log |
| Vaccinations | All vaccination records with color-coded due/overdue status |
| Medical | Vet visit records: diagnosis, treatment, medication, cost, follow-up date |
| Info | Breed, tag ID, gender, date of birth, color, pregnancy status |

#### 2.3 Pregnancy & Birth Tracking
- Set pregnancy status: not pregnant / pregnant / recently gave birth
- Record expected delivery date
- Log birth details and offspring information

#### 2.4 Health Certificate
- Each animal has an official health status visible to buyers
- Medical costs are automatically linked to the farm's expense records

---

### 3. Livestock Listings

Sellers can list animals for sale while keeping them in the herd registry.

| Feature | Description |
|---------|-------------|
| Create Listing | Animal type, breed, weight, price, delivery options, up to 5 photos |
| Status Tracking | Pending review → Approved → Sold |
| Eid Mode | Mark listing as available for Eid season |
| Slaughter Service | Offer slaughter service directly through the listing |
| Edit / Delete | Update or remove any listing with confirmation |

> **Important:** Only listings the seller explicitly marks for sale are visible to buyers. All other animals remain private herd records.

---

### 4. Financial Management

Built-in accounting tools designed for farm owners.

#### 4.1 Expense Categories
- Feed & fodder
- Veterinary & medical
- Water
- Electricity
- Employee salaries
- Farm rent
- Transport
- Maintenance
- Other

#### 4.2 Statements & Reports

| Feature | Description |
|---------|-------------|
| KPI Strip | Total income, total expenses, net profit, best month |
| Bar Chart | Income vs. expenses by period (monthly/yearly) |
| Drill-Down | Tap any chart bar to see individual transactions |
| Expense List | Full categorized expense history |
| Income List | All income from sales and orders |
| CSV Export | Export financial data as a spreadsheet |
| PDF Export | Generate a formatted A4 PDF report for printing or sharing |
| Budget Tracking | Set monthly/yearly budgets per category and track spending |

---

### 5. Dairy Products

For farms that produce dairy in addition to livestock.

| Feature | Description |
|---------|-------------|
| Product Types | Milk, cheese, yogurt, butter, cream, ghee |
| Listing Details | Quantity, unit, price, availability dates, delivery options, photos |
| Approval Workflow | Dairy listings go through admin approval before becoming visible |
| Edit / Delete | Full management of dairy listings |

---

### 6. Farm Supplies

Sellers can also offer farm supplies to other farmers or buyers.

| Feature | Description |
|---------|-------------|
| Supply Categories | Feed, equipment, seeds, veterinary supplies, and more |
| Listing Details | Name, quantity, price, location, delivery toggle, photos |
| Edit / Delete | Full management of supply listings |

---

### 7. Orders Management

Sellers receive and manage buyer orders from a dedicated orders screen.

| Feature | Description |
|---------|-------------|
| Order List | View all incoming orders with status, buyer name, and total |
| Status Updates | Mark orders as confirmed, in-progress, delivered, or cancelled |
| Order Details | Full breakdown of each order including delivery method and payment |

---

### 8. Analytics

Visual performance dashboard for the farm.

| Feature | Description |
|---------|-------------|
| Revenue Trends | Monthly income vs. expense bar charts |
| Top Listings | Best-performing animal and dairy listings by order count |
| Herd Composition | Breakdown of animals by type with count and percentage |
| Order Funnel | Orders placed, confirmed, and completed over time |

---

### 9. Messages

Real-time messaging between sellers and buyers.

| Feature | Description |
|---------|-------------|
| Conversation List | All active buyer conversations with unread badge counts |
| In-Chat | Send and receive messages, view order context in the chat |
| Unread Indicator | Red badge on the sidebar nav icon when new messages arrive |

---

### 10. Seller Profile & Settings

| Feature | Description |
|---------|-------------|
| Farm Profile | Farm name, phone numbers, governorate, years of experience, animal types, bio |
| Banner Photo | Upload a cover image displayed to buyers |
| Working Hours | Set days and hours the farm is open |
| Farm Location | Pin farm location on an interactive map |
| Farm Certificates | Mark certifications (veterinary, organic, ministry-approved, etc.) |
| Appearance | Choose app theme (light, dark, or system) and accent color |
| Change Password | Secure account management |
| Notifications | Toggle in-app notifications on/off |
| Language | Switch the full app interface between Arabic and English |

---

## Buyer Features

### 1. Marketplace Discovery

| Feature | Description |
|---------|-------------|
| Home Screen | Browse all farms with cards showing name, location, star rating, and animal types |
| Search | Find farms by name or keywords |
| Filters | Filter by governorate, animal type, price range; sort by newest / top-rated / price |
| Eid Tab | Listings marked as available for Eid with special offers |
| Supplies Tab | Browse farm supplies from sellers |
| Favorites | Save farms to a favorites list for quick access |

---

### 2. Farm & Listing Detail

When a buyer selects a farm, they see:

| Section | Details |
|---------|---------|
| Farm Profile | Banner, ratings, contact options, farm info |
| Livestock Tab | All available animals with photos, health status, price |
| Dairy Tab | Available dairy products |
| Supplies Tab | Available farm supplies |
| Reviews Tab | All buyer reviews with star ratings |

Each listing shows:
- Animal type, breed, age, and weight
- **Health status and health certificate**
- Photos and video
- Price and delivery options
- Seller contact (WhatsApp, Call, Copy Number)

---

### 3. Ordering

| Feature | Description |
|---------|-------------|
| Place Order | Choose delivery or pickup, payment method (Cash on Delivery or InstaPay), add notes |
| Order Confirmation | Instant confirmation after placing an order |
| My Orders | Full order history with real-time status updates |
| Write a Review | Leave a star rating and comment after receiving your order |

---

### 4. Messages

Buyers can message sellers directly about listings before placing an order.

| Feature | Description |
|---------|-------------|
| Conversation List | All seller conversations with unread badge counts |
| In-Chat | Send messages, reference a specific listing in the conversation |

---

### 5. Account & Notifications

| Feature | Description |
|---------|-------------|
| Buyer Profile | Edit name, phone, email, and governorate |
| Change Password | Secure account management |
| Appearance | Choose app theme (light, dark, or system) |
| Language | Switch the full app interface between Arabic and English |
| Notifications | Real-time alerts for order updates, listing approvals, and reminders |

---

## Admin Panel

The admin panel is available on both web (full) and mobile (quick actions).

| Feature | Description |
|---------|-------------|
| Dashboard | Platform overview: total users, listings, orders, and revenue with trend charts |
| Listing Approval | Review and approve/reject seller listings before they go live to buyers |
| Dairy Approval | Same approval workflow for dairy product listings |
| User Management | View all users, search by name, toggle active/inactive status |
| Order Management | View all orders, update status and delivery information |
| Reviews Moderation | Delete reviews that violate platform guidelines |
| Eid Mode | Toggle Eid season platform-wide and set the Eid date |

---

## Platform-Wide Features

| Feature | Description |
|---------|-------------|
| Arabic RTL | Full right-to-left Arabic interface with Cairo and Tajawal fonts |
| Full Language Switch | Toggle the entire app between Arabic and English — every screen, sidebar, and button updates instantly. Language preference is persisted across sessions. |
| Theme & Appearance | Light, dark, and system themes with customizable accent colors |
| Offline Banner | Red alert banner when internet is lost; disappears when connection returns |
| Image Upload | Up to 5 photos per listing/animal; automatically compressed before upload |
| Shimmer Loading | Animated placeholders while data loads — no blank screens |
| Global Error Handling | Error messages appear automatically if a request fails |
| Secure Authentication | JWT tokens, auto-logout on expiry, password change |
| National ID Validation | Auto-reads birth date, age, governorate, and gender from Egyptian National ID |
| Push Notifications | FCM push notifications for orders, approvals, and reminders |
| Real-time Messaging | In-app chat between buyers and sellers with unread badge counts |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend (Web) | React + Vite |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Mobile | Flutter 3 (Riverpod, GoRouter, Cairo font) |
| Desktop | Electron (offline-capable) |
| Authentication | JWT |
| Notifications | Firebase Cloud Messaging (FCM) |
| Maps | Google Maps API |
| PDF Export | flutter_pdf + printing |
| Image Handling | flutter_image_compress + CachedNetworkImage |

---

## Coming Soon

| Feature | Description |
|---------|-------------|
| Butcher On-Demand | Buyers can request a certified butcher to come to their location |
| Ready-Slaughtered Delivery | Receive a slaughtered and prepared animal without leaving home |
| Livestock Auctions | Live auction system for premium livestock |
| AI Pricing Assistant | AI-powered price recommendations based on weight, breed, and market trends |
| Multi-Branch Management | Sellers with multiple farm locations can manage them from one account |
| Payment Gateway | Full Fawry/PayMob integration for card payments |
| Cloud Image Storage | AWS S3 / Cloudinary for scalable media storage |
| Public API | Open API for third-party integrations |

---

*FarmFlow — Bringing Egypt's livestock market into the digital age*

*Version 1.0 — May 2026*
