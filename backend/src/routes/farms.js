const router = require('express').Router();
const { protect }        = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const upload             = require('../config/upload');
const {
  getMyFarms,
  getFarmById,
  createFarm,
  updateFarm,
  deleteFarm,
  migrateLegacyFarm,
} = require('../controllers/farmController');

// Public
router.get('/:id', getFarmById);

// Seller-only
router.use(protect, authorizeRoles('seller'));
router.get  ('/',              getMyFarms);
router.post ('/',              upload.single('farmBanner'), createFarm);
router.put  ('/:id',          upload.single('farmBanner'), updateFarm);
router.delete('/:id',         deleteFarm);
router.post ('/migrate/self', migrateLegacyFarm);

module.exports = router;
