const router = require('express').Router();
const { body, param } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
} = require('../controllers/orderController');

const idParam = param('id').isMongoId().withMessage('Invalid order ID');

const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

router.post(
  '/',
  protect,
  authorizeRoles('buyer'),
  [
    body('listingId').isMongoId().withMessage('Valid listing ID is required'),
    body('paymentType').isIn(['deposit', 'cod']).withMessage('Payment type must be deposit or cod'),
    body('depositAmount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Deposit amount must be greater than 0'),
    body('notes').optional().trim(),
  ],
  createOrder
);

router.get('/', protect, authorizeRoles('buyer', 'seller', 'admin'), getOrders);

router.get('/:id', protect, authorizeRoles('buyer', 'seller', 'admin'), idParam, getOrderById);

router.put(
  '/:id/status',
  protect,
  authorizeRoles('seller', 'admin'),
  [
    idParam,
    body('status').isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
  ],
  updateOrderStatus
);

module.exports = router;
