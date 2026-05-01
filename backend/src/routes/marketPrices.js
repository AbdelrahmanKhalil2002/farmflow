const router = require('express').Router();
const Listing = require('../models/Listing');

// GET /api/market-prices
// Returns average pricePerKg per animal type from approved listings in the last 90 days
// Optional: ?governorate=Cairo
router.get('/', async (req, res) => {
  try {
    const since = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    const match = { status: 'approved', createdAt: { $gte: since } };
    if (req.query.governorate) {
      match.location = req.query.governorate;
    }

    const agg = await Listing.aggregate([
      { $match: match },
      { $group: {
        _id: '$type',
        avgPricePerKg: { $avg: '$pricePerKg' },
        minPricePerKg: { $min: '$pricePerKg' },
        maxPricePerKg: { $max: '$pricePerKg' },
        count:         { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);

    res.json(agg.map(r => ({
      type:          r._id,
      avgPricePerKg: Math.round(r.avgPricePerKg || 0),
      minPricePerKg: Math.round(r.minPricePerKg || 0),
      maxPricePerKg: Math.round(r.maxPricePerKg || 0),
      count:         r.count,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

module.exports = router;
