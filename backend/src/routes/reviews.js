const router = require('express').Router();
const { body, param } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const { createReview, getSellerReviews, deleteReview, getAllReviews, getMyReviewedOrders, replyToReview } = require('../controllers/reviewController');

// POST /api/reviews
router.post(
  '/',
  protect,
  authorizeRoles('buyer'),
  [
    body('orderId').isMongoId().withMessage('Invalid order ID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().trim().isLength({ max: 500 }),
  ],
  createReview
);

// GET /api/reviews/my-reviewed — buyer only
router.get('/my-reviewed', protect, authorizeRoles('buyer'), getMyReviewedOrders);

// GET /api/reviews/admin/all — admin only
router.get('/admin/all', protect, authorizeRoles('admin'), getAllReviews);

// GET /api/reviews/seller/:sellerId
router.get('/seller/:sellerId', param('sellerId').isMongoId(), getSellerReviews);

// PATCH /api/reviews/:id/reply — seller only (reply to a review of their farm)
router.patch(
  '/:id/reply',
  protect,
  authorizeRoles('seller'),
  param('id').isMongoId(),
  body('body').trim().notEmpty().isLength({ max: 500 }),
  replyToReview
);

// DELETE /api/reviews/:id  — admin only
router.delete(
  '/:id',
  protect,
  authorizeRoles('admin'),
  param('id').isMongoId(),
  deleteReview
);

module.exports = router;
