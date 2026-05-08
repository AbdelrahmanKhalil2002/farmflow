const router = require('express').Router();
const { param } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const { getStats, getUsers, toggleUserStatus, deleteUser, getPlatformAnalytics } = require('../controllers/adminController');
const Order = require('../models/Order');
const User  = require('../models/User');

// All admin routes require a valid token + admin role
router.use(protect, authorizeRoles('admin'));

router.get('/stats',                getStats);
router.get('/platform-analytics',  getPlatformAnalytics);
router.get('/users',               getUsers);
router.patch(
  '/users/:id/toggle',
  param('id').isMongoId().withMessage('Invalid user ID'),
  toggleUserStatus
);
router.delete(
  '/users/:id',
  param('id').isMongoId().withMessage('Invalid user ID'),
  deleteUser
);

// GET /api/admin/analytics — revenue by governorate (30.3)
router.get('/analytics', async (req, res) => {
  try {
    // Aggregate completed orders → join seller → group by governorate
    const rows = await Order.aggregate([
      { $match: { status: 'completed' } },
      {
        $lookup: {
          from: 'users',
          localField: 'seller',
          foreignField: '_id',
          as: 'sellerDoc',
        },
      },
      { $unwind: { path: '$sellerDoc', preserveNullAndEmpty: false } },
      {
        $group: {
          _id:     '$sellerDoc.governorate',
          revenue: { $sum: '$totalAmount' },
          count:   { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 12 },
    ]);

    res.json(rows.map(r => ({
      governorate: r._id || 'غير محددة',
      revenue:     r.revenue,
      orderCount:  r.count,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
