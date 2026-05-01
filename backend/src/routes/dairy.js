const router  = require('express').Router();
const { body, param } = require('express-validator');
const { protect }         = require('../middleware/auth');
const { authorizeRoles }  = require('../middleware/role');
const upload              = require('../config/upload');
const {
  createDairy, getMyDairy, getApprovedDairy, getDairyById,
  updateDairy, deleteDairy, adminApproveDairy,
} = require('../controllers/dairyController');

const optionalAuth = (req, _res, next) => {
  const jwt = require('jsonwebtoken');
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET); } catch {}
  }
  next();
};

const idParam = param('id').isMongoId().withMessage('Invalid ID');

const bodyValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').isIn(['milk','cheese','yogurt','butter','cream','ghee','other']).withMessage('Invalid type'),
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be positive'),
  body('unit').isIn(['kg','liter','piece','pack','dozen']).withMessage('Invalid unit'),
  body('pricePerUnit').isFloat({ min: 0 }).withMessage('Price must be positive'),
];

// Public
router.get('/',         optionalAuth, getApprovedDairy);
router.get('/my',       protect, authorizeRoles('seller'), getMyDairy);
// Admin — all products regardless of status
router.get('/admin/all', protect, authorizeRoles('admin'), async (req, res) => {
  try {
    const DairyProduct = require('../models/DairyProduct');
    const products = await DairyProduct.find({})
      .populate('seller', 'name farmName governorate')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get('/:id', optionalAuth, getDairyById);

// Seller
router.post('/',
  protect, authorizeRoles('seller'),
  upload.array('images', 5),
  bodyValidation,
  createDairy
);

router.put('/:id',
  protect, authorizeRoles('seller', 'admin'),
  upload.array('images', 5),
  [idParam, ...bodyValidation.map(v => v.optional())],
  updateDairy
);

router.delete('/:id', protect, authorizeRoles('seller', 'admin'), idParam, deleteDairy);

// Admin
router.post('/:id/approve', protect, authorizeRoles('admin'), idParam, adminApproveDairy);

// POST /api/dairy/:id/stock — seller updates dairy product stock
router.post('/:id/stock',
  protect,
  authorizeRoles('seller'),
  async (req, res) => {
    try {
      const DairyProduct = require('../models/DairyProduct');
      const product = await DairyProduct.findById(req.params.id);
      if (!product) return res.status(404).json({ message: 'Product not found' });
      if (product.seller.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const change = parseFloat(req.body.change);
      if (isNaN(change) || change === 0) {
        return res.status(400).json({ message: 'change must be a non-zero number' });
      }

      const newQty = product.quantity + change;
      if (newQty < 0) {
        return res.status(400).json({ message: 'Stock cannot go below zero' });
      }

      product.quantity = newQty;
      product.stockLog.push({ change, note: req.body.note || '' });
      await product.save();

      // Low-stock notification
      if (product.minStockAlert > 0 && newQty <= product.minStockAlert) {
        const { createNotification } = require('../utils/notify');
        createNotification(req.user.id, {
          type:    'general',
          title:   '⚠️ مخزون منخفض',
          message: `كمية "${product.name}" وصلت إلى ${newQty} ${product.unit} — أقل من حد التنبيه`,
          link:    '/seller/dairy',
        });
      }

      res.json(product);
    } catch (err) {
      if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID' });
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
