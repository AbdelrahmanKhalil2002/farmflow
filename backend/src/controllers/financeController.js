const { validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Listing = require('../models/Listing');
const Order = require('../models/Order');

// Resolve which seller ID to scope the query to.
// Sellers always see their own data. Admins can pass ?sellerId= or see all.
const resolveSeller = (req) => {
  if (req.user.role === 'seller') return req.user.id;
  return req.query.sellerId || null; // null = admin sees all
};

const buildDateFilter = (from, to) => {
  const filter = {};
  if (from) filter.$gte = new Date(from);
  if (to) filter.$lte = new Date(to);
  return Object.keys(filter).length ? filter : null;
};

// ─── Expenses ────────────────────────────────────────────────────────────────

// POST /api/finance/expenses
const addExpense = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { category, amount, date, note, listing: listingId } = req.body;

    if (listingId) {
      const listing = await Listing.findOne({ _id: listingId, seller: req.user.id });
      if (!listing) return res.status(400).json({ message: 'Listing not found or does not belong to you' });
    }

    const expense = await Expense.create({
      category, amount, date, note,
      listing: listingId || null,
      seller: req.user.id,
    });
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/finance/expenses
const getExpenses = async (req, res) => {
  try {
    const sellerId = resolveSeller(req);
    const { from, to, category, listingId } = req.query;

    const filter = {};
    if (sellerId) filter.seller = sellerId;
    if (category) filter.category = category;
    if (listingId) filter.listing = listingId;

    const dateFilter = buildDateFilter(from, to);
    if (dateFilter) filter.date = dateFilter;

    const expenses = await Expense.find(filter)
      .populate('listing', 'type breed')
      .sort({ date: -1 });

    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Income ──────────────────────────────────────────────────────────────────

// POST /api/finance/income
const addIncome = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { type, amount, date, note, listing: listingId, order: orderId } = req.body;

    if (listingId) {
      const listing = await Listing.findOne({ _id: listingId, seller: req.user.id });
      if (!listing) return res.status(400).json({ message: 'Listing not found or does not belong to you' });
    }

    if (orderId) {
      const order = await Order.findOne({ _id: orderId, seller: req.user.id });
      if (!order) return res.status(400).json({ message: 'Order not found or does not belong to you' });
    }

    const income = await Income.create({
      type, amount, date, note,
      listing: listingId || null,
      order: orderId || null,
      seller: req.user.id,
    });
    res.status(201).json(income);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/finance/income
const getIncome = async (req, res) => {
  try {
    const sellerId = resolveSeller(req);
    const { from, to, type, listingId } = req.query;

    const filter = {};
    if (sellerId) filter.seller = sellerId;
    if (type) filter.type = type;
    if (listingId) filter.listing = listingId;

    const dateFilter = buildDateFilter(from, to);
    if (dateFilter) filter.date = dateFilter;

    const income = await Income.find(filter)
      .populate('listing', 'type breed')
      .populate('order', 'status totalAmount')
      .sort({ date: -1 });

    res.json(income);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Summary ─────────────────────────────────────────────────────────────────

// GET /api/finance/summary
// Returns: totalIncome, totalExpenses, netProfit
// Optional query: from, to (date range), sellerId (admin only)
const getSummary = async (req, res) => {
  try {
    const sellerId = resolveSeller(req);
    const { from, to } = req.query;

    const dateFilter = buildDateFilter(from, to);

    const buildMatch = (dateField) => {
      const match = {};
      if (sellerId) {
        const mongoose = require('mongoose');
        match.seller = new mongoose.Types.ObjectId(sellerId);
      }
      if (dateFilter) match[dateField] = dateFilter;
      return match;
    };

    const [incomeResult, expenseResult] = await Promise.all([
      Income.aggregate([
        { $match: buildMatch('date') },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: buildMatch('date') },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const [incomeByType, expenseByCategory] = await Promise.all([
      Income.aggregate([
        { $match: buildMatch('date') },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: buildMatch('date') },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
      ]),
    ]);

    const totalIncome = incomeResult[0]?.total || 0;
    const totalExpenses = expenseResult[0]?.total || 0;

    res.json({
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      incomeByType: Object.fromEntries(incomeByType.map((i) => [i._id, i.total])),
      expenseByCategory: Object.fromEntries(expenseByCategory.map((e) => [e._id, e.total])),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { addExpense, getExpenses, addIncome, getIncome, getSummary };
