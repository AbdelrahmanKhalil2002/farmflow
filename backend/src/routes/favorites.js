const router = require('express').Router();
const { param } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const User = require('../models/User');

// All routes are buyer-only
router.use(protect, authorizeRoles('buyer'));

// GET /api/favorites — list saved farms
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('savedFarms', 'name farmName governorate averageRating reviewCount animalTypes bio');
    res.json(user.savedFarms || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/favorites/:sellerId — add to favorites
router.post(
  '/:sellerId',
  param('sellerId').isMongoId(),
  async (req, res) => {
    try {
      const { sellerId } = req.params;
      await User.findByIdAndUpdate(req.user.id, {
        $addToSet: { savedFarms: sellerId },
      });
      res.json({ message: 'Farm saved to favorites' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// DELETE /api/favorites/:sellerId — remove from favorites
router.delete(
  '/:sellerId',
  param('sellerId').isMongoId(),
  async (req, res) => {
    try {
      const { sellerId } = req.params;
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { savedFarms: sellerId },
      });
      res.json({ message: 'Farm removed from favorites' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
