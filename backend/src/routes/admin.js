const router = require('express').Router();
const { param } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const { getStats, getUsers, toggleUserStatus } = require('../controllers/adminController');

// All admin routes require a valid token + admin role
router.use(protect, authorizeRoles('admin'));

router.get('/stats',                                          getStats);
router.get('/users',                                          getUsers);
router.patch(
  '/users/:id/toggle',
  param('id').isMongoId().withMessage('Invalid user ID'),
  toggleUserStatus
);

module.exports = router;
