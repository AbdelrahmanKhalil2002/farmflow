const router = require('express').Router();
const { query } = require('express-validator');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const Income  = require('../models/Income');
const Expense = require('../models/Expense');

// GET /api/statements?year=2025&quarter=Q1
// Returns 12 monthly records (or 3 for a quarter) for the authenticated seller
router.get(
  '/',
  protect,
  authorizeRoles('seller', 'admin'),
  [
    query('year').isInt({ min: 2020, max: 2100 }).withMessage('year must be a valid year'),
    query('quarter').optional().isIn(['Q1', 'Q2', 'Q3', 'Q4']).withMessage('quarter must be Q1–Q4'),
    query('sellerId').optional().isMongoId(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const year = parseInt(req.query.year, 10);

    // Admin can view any seller; seller can only view themselves
    let sellerId;
    if (req.user.role === 'admin' && req.query.sellerId) {
      sellerId = new mongoose.Types.ObjectId(req.query.sellerId);
    } else {
      sellerId = new mongoose.Types.ObjectId(req.user.id);
    }

    // Date boundaries for the full year
    const yearStart = new Date(year, 0, 1);
    const yearEnd   = new Date(year + 1, 0, 1);

    try {
      // Aggregate income by month
      const incomeAgg = await Income.aggregate([
        { $match: { seller: sellerId, date: { $gte: yearStart, $lt: yearEnd } } },
        { $group: {
          _id: { month: { $month: '$date' } }, // 1-based
          total: { $sum: '$amount' },
        }},
      ]);

      // Aggregate expenses by month + category
      const expenseAgg = await Expense.aggregate([
        { $match: { seller: sellerId, date: { $gte: yearStart, $lt: yearEnd } } },
        { $group: {
          _id: { month: { $month: '$date' }, category: '$category' },
          total: { $sum: '$amount' },
        }},
      ]);

      // Build lookup maps
      const incomeByMonth = {};   // { 1: 5000, 2: 3000, ... }
      incomeAgg.forEach(r => { incomeByMonth[r._id.month - 1] = r.total; });

      // expensesByMonth[monthIndex][category] = total
      const expensesByMonth = {};
      expenseAgg.forEach(r => {
        const m = r._id.month - 1; // convert to 0-based
        if (!expensesByMonth[m]) expensesByMonth[m] = {};
        expensesByMonth[m][r._id.category] = r.total;
      });

      // Build 12-month result array
      const months = Array.from({ length: 12 }, (_, m) => ({
        month:    m,
        income:   incomeByMonth[m]   ?? 0,
        expenses: expensesByMonth[m] ?? {},
      }));

      res.json(months);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// GET /api/statements/transactions?year=&month=&category=
// Returns individual income or expense entries for a specific month/category (drill-down)
router.get(
  '/transactions',
  protect,
  authorizeRoles('seller', 'admin'),
  [
    query('year').isInt({ min: 2020, max: 2100 }),
    query('month').isInt({ min: 0, max: 11 }),
    query('category').optional().trim(),
    query('sellerId').optional().isMongoId(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const year  = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10); // 0-based

    let sellerId;
    if (req.user.role === 'admin' && req.query.sellerId) {
      sellerId = new mongoose.Types.ObjectId(req.query.sellerId);
    } else {
      sellerId = new mongoose.Types.ObjectId(req.user.id);
    }

    const monthStart = new Date(year, month, 1);
    const monthEnd   = new Date(year, month + 1, 1);

    try {
      const category = req.query.category;

      if (category === 'income') {
        const records = await Income.find({
          seller: sellerId,
          date: { $gte: monthStart, $lt: monthEnd },
        }).sort({ date: -1 }).limit(200);
        return res.json({ type: 'income', records });
      }

      // expense category
      const filter = {
        seller: sellerId,
        date: { $gte: monthStart, $lt: monthEnd },
      };
      if (category && category !== 'total') filter.category = category;

      const records = await Expense.find(filter).sort({ date: -1 }).limit(200);
      res.json({ type: 'expense', records });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
