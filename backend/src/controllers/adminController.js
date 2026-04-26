const { validationResult } = require('express-validator');
const User    = require('../models/User');
const Listing = require('../models/Listing');
const Order   = require('../models/Order');

// GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const [totalUsers, pendingListings, totalOrders, activeListings] = await Promise.all([
      User.countDocuments(),
      Listing.countDocuments({ status: 'pending' }),
      Order.countDocuments(),
      Listing.countDocuments({ status: 'approved' }),
    ]);
    res.json({ totalUsers, pendingListings, totalOrders, activeListings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
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

module.exports = { getStats, getUsers, toggleUserStatus };
