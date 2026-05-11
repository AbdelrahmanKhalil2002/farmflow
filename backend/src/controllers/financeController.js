const { validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Listing = require('../models/Listing');
const Order = require('../models/Order');

// Resolve which seller ID to scope the query to.
// Sellers always see their own data (no override possible).
// Admins can pass ?sellerId= to scope to a specific seller, or omit to see all.
const resolveSeller = (req) => {
  if (req.user.role === 'seller') return req.user.id;
  if (req.user.role === 'admin') return req.query.sellerId || null;
  return null;
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
    const { category, amount, date, note, listing: listingId, animalId, recurringDay, farmId } = req.body;

    if (listingId) {
      const listing = await Listing.findOne({ _id: listingId, seller: req.user.id });
      if (!listing) return res.status(400).json({ message: 'Listing not found or does not belong to you' });
    }

    const expense = await Expense.create({
      category, amount, date, note,
      listing: listingId || null,
      animal:  animalId  || null,
      farm:    farmId    || null,
      seller:  req.user.id,
      recurringDay: recurringDay ?? null,
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
    if (req.query.farmId) filter.farm = req.query.farmId;
    if (category) filter.category = category;
    if (listingId) filter.listing = listingId;

    const dateFilter = buildDateFilter(from, to);
    if (dateFilter) filter.date = dateFilter;

    const expenses = await Expense.find(filter)
      .populate('listing', 'type breed')
      .populate('animal', 'tagNumber type breed')
      .sort({ date: -1 });

    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/finance/expenses/:id
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, seller: req.user.id });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/finance/expenses/:id
const updateExpense = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { category, amount, date, note, listing: listingId, animalId, recurringDay } = req.body;
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, seller: req.user.id },
      { category, amount, date, note, listing: listingId || null, animal: animalId || null, recurringDay: recurringDay ?? null },
      { new: true, runValidators: true }
    ).populate('listing', 'type breed').populate('animal', 'tagNumber type breed');
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
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
    const { type, amount, date, note, listing: listingId, order: orderId, farmId } = req.body;

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
      order:   orderId   || null,
      farm:    farmId    || null,
      seller:  req.user.id,
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
    if (req.query.farmId) filter.farm = req.query.farmId;
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

// DELETE /api/finance/income/:id
const deleteIncome = async (req, res) => {
  try {
    const income = await Income.findOneAndDelete({ _id: req.params.id, seller: req.user.id });
    if (!income) return res.status(404).json({ message: 'Income not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/finance/income/:id
const updateIncome = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { type, amount, date, note, listing: listingId, order: orderId } = req.body;
    const income = await Income.findOneAndUpdate(
      { _id: req.params.id, seller: req.user.id },
      { type, amount, date, note, listing: listingId || null, order: orderId || null },
      { new: true, runValidators: true }
    )
      .populate('listing', 'type breed')
      .populate('order', 'status totalAmount');
    if (!income) return res.status(404).json({ message: 'Income not found' });
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
    const { from, to, farmId } = req.query;

    const dateFilter = buildDateFilter(from, to);

    const buildMatch = (dateField) => {
      const match = {};
      if (sellerId) {
        const mongoose = require('mongoose');
        match.seller = new mongoose.Types.ObjectId(sellerId);
      }
      if (farmId) match.farm = require('mongoose').Types.ObjectId.isValid(farmId) ? new (require('mongoose').Types.ObjectId)(farmId) : farmId;
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

// GET /api/finance/analytics?months=12
const getAnalytics = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const sellerId = resolveSeller(req);
    const months = Math.min(24, Math.max(1, parseInt(req.query.months) || 12));
    const { farmId } = req.query;

    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const buildMatch = (dateField) => {
      const m = { [dateField]: { $gte: from } };
      if (sellerId) m.seller = new mongoose.Types.ObjectId(sellerId);
      if (farmId && mongoose.Types.ObjectId.isValid(farmId)) m.farm = new mongoose.Types.ObjectId(farmId);
      return m;
    };

    const [monthlyIncome, monthlyExpenses, incomeByType, expenseByCategory, topAnimalTypes, orderStats] = await Promise.all([
      Income.aggregate([
        { $match: buildMatch('date') },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]),
      Expense.aggregate([
        { $match: buildMatch('date') },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]),
      Income.aggregate([
        { $match: buildMatch('date') },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: buildMatch('date') },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]),
      Income.aggregate([
        { $match: buildMatch('date') },
        { $lookup: { from: 'listings', localField: 'listing', foreignField: '_id', as: 'listing' } },
        { $unwind: { path: '$listing', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$listing.type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } },
        { $sort: { total: -1 } },
        { $limit: 6 },
      ]),
      Order.aggregate([
        { $match: (() => {
            const m = { createdAt: { $gte: from } };
            if (sellerId) m.seller = new mongoose.Types.ObjectId(sellerId);
            return m;
          })() },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const monthly = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const inc = monthlyIncome.find(m => m._id === key)?.total || 0;
      const exp = monthlyExpenses.find(m => m._id === key)?.total || 0;
      monthly.push({ month: key, income: inc, expenses: exp, profit: inc - exp });
    }

    res.json({
      monthly,
      incomeByType:      Object.fromEntries(incomeByType.map(i => [i._id, i.total])),
      expenseByCategory: Object.fromEntries(expenseByCategory.map(e => [e._id, e.total])),
      orderStats:        Object.fromEntries(orderStats.map(o => [o._id, o.count])),
      topAnimalTypes:    topAnimalTypes.map(t => ({ type: t._id, total: t.total, count: t.count })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { addExpense, getExpenses, deleteExpense, updateExpense, addIncome, getIncome, deleteIncome, updateIncome, getSummary, getAnalytics };
