const express = require('express');
const router  = express.Router();
const Budget  = require('../models/Budget');
const { protect }        = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');

// GET /api/budget?year=2025  — fetch all budget entries for the seller for a year
router.get('/', protect, authorizeRoles('seller'), async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  try {
    const budgets = await Budget.find({ seller: req.user.id, year }).lean();
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/budget — upsert a single budget target
router.put('/', protect, authorizeRoles('seller'), async (req, res) => {
  const { year, month, category, targetAmount } = req.body;
  if (!year || !month || !category || targetAmount == null) {
    return res.status(400).json({ message: 'year, month, category, targetAmount مطلوبة' });
  }
  try {
    const budget = await Budget.findOneAndUpdate(
      { seller: req.user.id, year, month, category },
      { targetAmount },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(budget);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
