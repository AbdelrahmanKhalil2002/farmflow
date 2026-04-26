# FarmFlow — Project Overview

## What is FarmFlow?

FarmFlow is a web-based livestock marketplace and farm management platform. It connects livestock sellers directly with buyers, while giving farm owners the tools to track their income, expenses, and profitability — all in one place.

The platform is built for agricultural communities where livestock trading is a core economic activity. Before FarmFlow, sellers had no centralized way to list animals, and buyers had no reliable way to browse and purchase livestock online. Financial record-keeping was done manually or not at all.

---

## Problem It Solves

| Problem | FarmFlow's Solution |
|---------|-------------------|
| No trusted marketplace for livestock trading | Verified listings with admin moderation before going live |
| Buyers cannot browse animals remotely | Online catalogue with photos, breed, age, weight, and location |
| Sellers track income and expenses in notebooks | Built-in finance module with expense categories and income records |
| No transparency in the order process | Order status tracking (pending → confirmed → completed) |
| Anyone could post fraudulent listings | Admin approval gate before a listing is visible to buyers |

---

## User Roles

FarmFlow has three roles. Each role has its own dashboard, navigation, and set of permissions.

### Seller

A farm owner or livestock trader who wants to list animals for sale.

**Can:**
- Register and create a seller account
- Add livestock listings with photos, type, breed, age, weight, price, and location
- View and delete their own listings
- Track expenses by category (feed, doctor, transport, other)
- Record income entries (sale, deposit)
- View a financial summary showing total income, total expenses, and net profit
- See all orders placed on their listings

**Cannot:**
- Browse or order livestock (seller role only)
- Approve or reject listings
- Manage other users

### Buyer

A person looking to purchase livestock.

**Can:**
- Register and create a buyer account
- Browse all approved livestock listings
- View full listing details including seller contact information
- Place orders using cash on delivery or deposit payment
- Track the status of their orders

**Cannot:**
- Create listings
- Access financial data
- Manage users or approve content

### Admin

A platform operator who oversees all activity.

**Can:**
- View platform-wide statistics (total users, pending listings, active listings, total orders)
- Review and approve or reject pending livestock listings
- View all users and activate or deactivate accounts
- View all orders across all buyers and sellers

**Cannot:**
- Self-deactivate (safety guard to prevent locking out the last admin)
- Register through the public registration form (admin accounts are created directly in the database)

---

## Platform Flow

```
Seller registers → adds listing → listing goes to Admin review
Admin approves listing → listing becomes visible to buyers
Buyer browses → views detail → places order
Seller sees order → confirms or cancels
Seller marks order complete → listing marked as sold
```

---

## Technology

Built with a modern JavaScript stack — React on the frontend, Node.js + Express on the backend, and MongoDB for storage. See `architecture.md` for the full technical breakdown.
