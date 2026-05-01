const router    = require('express').Router();
const { body }  = require('express-validator');
const { validationResult } = require('express-validator');
const { protect }       = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const AppConfig = require('../models/AppConfig');
const Listing   = require('../models/Listing');

// GET /api/eid/config — public: returns eidMode + eidDate
router.get('/config', async (_req, res) => {
  try {
    const cfg = await AppConfig.get();
    res.json({ eidMode: cfg.eidMode, eidDate: cfg.eidDate });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/eid/config — admin: toggle eidMode + set eidDate
router.patch(
  '/config',
  protect,
  authorizeRoles('admin'),
  [
    body('eidMode').optional().isBoolean(),
    body('eidDate').optional().isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const cfg = await AppConfig.get();
      if (req.body.eidMode  !== undefined) cfg.eidMode  = req.body.eidMode;
      if (req.body.eidDate  !== undefined) cfg.eidDate  = req.body.eidDate || null;
      await cfg.save();
      res.json({ eidMode: cfg.eidMode, eidDate: cfg.eidDate });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// GET /api/eid/listings — public: approved listings marked as eidAvailable
router.get('/listings', async (req, res) => {
  try {
    const listings = await Listing.find({ status: 'approved', eidAvailable: true })
      .populate('seller', 'name farmName governorate')
      .sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
