const { validationResult } = require('express-validator');
const User    = require('../models/User');
const Listing = require('../models/Listing');
const Order   = require('../models/Order');
const Expense = require('../models/Expense');

// GET /api/admin/stats
// Extended to return everything the admin dashboard needs in a single round-trip.
const getStats = async (req, res) => {
  try {
    const now           = new Date();
    const sevenDaysAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersThisWeek,
      sellerCount,
      buyerCount,
      pendingListings,
      activeListings,
      rejectedListings,
      soldListings,
      totalOrders,
      completedOrders,
      pendingOrders,
      revenueAgg,
      ordersByDayRaw,
      recentUsers,
      recentListings,
      recentOrders,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ role: 'seller' }),
      User.countDocuments({ role: 'buyer' }),
      Listing.countDocuments({ status: 'pending' }),
      Listing.countDocuments({ status: 'approved' }),
      Listing.countDocuments({ status: 'rejected' }),
      Listing.countDocuments({ status: 'sold' }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'completed' }),
      Order.countDocuments({ status: 'pending' }),
      // Sum revenue from non-cancelled orders
      Order.aggregate([
        { $match: { status: { $nin: ['cancelled'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      // Daily order counts + revenue for the last 90 days
      Order.aggregate([
        { $match: { createdAt: { $gte: ninetyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count:   { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Recent users (last 7 days)
      User.find({ createdAt: { $gte: sevenDaysAgo } })
        .sort({ createdAt: -1 })
        .limit(6)
        .select('name role createdAt'),
      // Most recent listings (any status)
      Listing.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select('type breed price status createdAt')
        .populate('seller', 'name'),
      // Most recent orders
      Order.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select('totalAmount status createdAt paymentType')
        .populate('buyer', 'name')
        .populate('listing', 'type breed'),
    ]);

    // ── Merge & sort activity feed ───────────────────────────────────────────
    const activity = [
      ...recentUsers.map(u => ({
        kind:      'user',
        text:      `${u.name} registered as ${u.role}`,
        meta:      u.role,
        createdAt: u.createdAt,
      })),
      ...recentListings.map(l => ({
        kind:      l.status === 'pending' ? 'listing_pending' : 'listing',
        text:      `${l.seller?.name ?? 'Seller'} submitted ${l.type}${l.breed ? ` (${l.breed})` : ''} · ${Number(l.price).toLocaleString()} SAR`,
        meta:      l.status,
        createdAt: l.createdAt,
      })),
      ...recentOrders.map(o => ({
        kind:      'order',
        text:      `${o.buyer?.name ?? 'Buyer'} ordered ${o.listing?.type ?? 'item'} · ${Number(o.totalAmount).toLocaleString()} SAR`,
        meta:      o.status,
        createdAt: o.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 14);

    res.json({
      totalUsers,
      newUsersThisWeek,
      sellerCount,
      buyerCount,
      pendingListings,
      activeListings,
      rejectedListings,
      soldListings,
      totalOrders,
      completedOrders,
      pendingOrders,
      totalRevenue: revenueAgg[0]?.total ?? 0,
      ordersByDay:  ordersByDayRaw,
      recentActivity: activity,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/users  — enriched with per-user listing/order stats
const getUsers = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip  = (page - 1) * limit;

    const [total, users, listingAgg, buyerOrderAgg, sellerRevenueAgg] = await Promise.all([
      User.countDocuments(),
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Listing.aggregate([
        { $group: { _id: '$seller', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $group: { _id: '$buyer', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { status: { $nin: ['cancelled'] } } },
        { $group: { _id: '$seller', revenue: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const listingMap = {};
    listingAgg.forEach(x => { if (x._id) listingMap[x._id.toString()] = x.count; });

    const buyerOrderMap = {};
    buyerOrderAgg.forEach(x => { if (x._id) buyerOrderMap[x._id.toString()] = x.count; });

    const sellerRevenueMap = {};
    sellerRevenueAgg.forEach(x => { if (x._id) sellerRevenueMap[x._id.toString()] = x.revenue; });

    const enriched = users.map(u => {
      const id = u._id.toString();
      return {
        ...u,
        listingCount:  listingMap[id]       ?? 0,
        orderCount:    buyerOrderMap[id]     ?? 0,
        sellerRevenue: sellerRevenueMap[id]  ?? 0,
      };
    });

    res.json({
      users: enriched,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/users/:id/toggle
const toggleUserStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });

    if (target._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    target.isActive = !target.isActive;
    await target.save();
    res.json(target);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    await User.deleteOne({ _id: target._id });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/platform-analytics?weeks=N (default 12)
const getPlatformAnalytics = async (req, res) => {
  try {
    const weeks = Math.min(52, Math.max(4, parseInt(req.query.weeks) || 12));
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    // Build week-start buckets (Monday-aligned ISO weeks)
    const buckets = Array.from({ length: weeks }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (weeks - 1 - i) * 7);
      // Round back to Monday
      const day = d.getDay();
      const diff = (day === 0 ? -6 : 1 - day);
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const weekStart = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = (day === 0 ? -6 : 1 - day);
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d.toISOString().slice(0, 10);
    };

    const [users, listings, orders] = await Promise.all([
      User.find({ createdAt: { $gte: since } }).select('role createdAt').lean(),
      Listing.find({ createdAt: { $gte: since } }).select('createdAt').lean(),
      Order.find({ createdAt: { $gte: since } }).select('status totalAmount createdAt').lean(),
    ]);

    // Aggregate into weekly buckets
    const weekMap = {};
    buckets.forEach(b => {
      const key = b.toISOString().slice(0, 10);
      weekMap[key] = { week: key, buyers: 0, sellers: 0, listings: 0, orders: 0, gmv: 0 };
    });

    users.forEach(u => {
      const k = weekStart(u.createdAt);
      if (weekMap[k]) weekMap[k][u.role === 'seller' ? 'sellers' : 'buyers']++;
    });
    listings.forEach(l => {
      const k = weekStart(l.createdAt);
      if (weekMap[k]) weekMap[k].listings++;
    });
    orders.forEach(o => {
      const k = weekStart(o.createdAt);
      if (weekMap[k]) {
        weekMap[k].orders++;
        if (o.status === 'completed') weekMap[k].gmv += o.totalAmount || 0;
      }
    });

    res.json(Object.values(weekMap));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getStats, getUsers, toggleUserStatus, deleteUser, getPlatformAnalytics };
