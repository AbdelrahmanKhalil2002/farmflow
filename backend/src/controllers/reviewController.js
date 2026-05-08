const { validationResult } = require('express-validator');
const Review = require('../models/Review');
const Order  = require('../models/Order');
const User   = require('../models/User');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const recalcSellerRating = async (sellerId) => {
  const agg = await Review.aggregate([
    { $match: { seller: sellerId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg   = agg[0]?.avg   ?? 0;
  const count = agg[0]?.count ?? 0;
  await User.findByIdAndUpdate(sellerId, {
    averageRating: Math.round(avg * 10) / 10,
    reviewCount:   count,
  });
};

// ─── POST /api/reviews ────────────────────────────────────────────────────────
// Buyer submits a review for a completed order
const createReview = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { orderId, rating, comment } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'completed') {
      return res.status(400).json({ message: 'You can only review completed orders' });
    }
    if (order.buyer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const existing = await Review.findOne({ order: orderId });
    if (existing) return res.status(400).json({ message: 'You have already reviewed this order' });

    const review = await Review.create({
      buyer:  req.user.id,
      seller: order.seller,
      order:  orderId,
      rating,
      comment: comment?.trim() || undefined,
    });

    await recalcSellerRating(order.seller);

    await review.populate('buyer', 'name');
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/reviews/seller/:sellerId ───────────────────────────────────────
// Public — returns all non-flagged reviews for a seller
const getSellerReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ seller: req.params.sellerId, flagged: false })
      .populate('buyer', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE /api/reviews/:id — admin only ─────────────────────────────────────
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    const sellerId = review.seller;
    await review.deleteOne();
    await recalcSellerRating(sellerId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/reviews/admin/all — admin only ──────────────────────────────────
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('buyer',  'name')
      .populate('seller', 'name farmName')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/reviews/my-reviewed — buyer only ────────────────────────────────
// Returns the list of order IDs the current buyer has already reviewed
const getMyReviewedOrders = async (req, res) => {
  try {
    const reviews = await Review.find({ buyer: req.user.id }, 'order');
    res.json(reviews.map(r => r.order.toString()));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PATCH /api/reviews/:id/reply — seller only ───────────────────────────────
const replyToReview = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    review.reply = { body: req.body.body.trim(), at: new Date() };
    await review.save();
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createReview, getSellerReviews, deleteReview, getAllReviews, getMyReviewedOrders, replyToReview };
