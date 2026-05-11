const router  = require('express').Router();
const { body, validationResult } = require('express-validator');
const multer  = require('multer');
const path    = require('path');
const { protect }        = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const jwt = require('jsonwebtoken');
const optionalAuth = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET); } catch {}
  }
  next();
};
const Supply  = require('../models/Supply');
const User    = require('../models/User');
const { createNotification } = require('../utils/notify');

// ── Multer ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename:    (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

const validate = (req, res, next) => {
  const e = validationResult(req);
  if (!e.isEmpty()) return res.status(400).json({ errors: e.array() });
  next();
};

// ── GET /api/supplies ─────────────────────────────────────────────────────────
// public/buyer → approved only; seller → own; admin → all
router.get('/', optionalAuth, async (req, res) => {
  try {
    let filter = {};
    const role = req.user?.role;
    if (!role || role === 'buyer') {
      filter.status = 'approved';
    } else if (role === 'seller') {
      if (req.query.browse === '1') {
        filter.status = 'approved';
        if (req.query.seller) {
          filter.seller = req.query.seller; // specific seller's supplies
        } else {
          filter.seller = { $ne: req.user.id }; // all approved except own
        }
      } else {
        filter.seller = req.user.id;
        if (req.query.farmId) filter.farm = req.query.farmId;
      }
    }
    // admin: no filter

    const { category } = req.query;
    if (category) filter.category = category;

    const supplies = await Supply.find(filter)
      .populate('seller', 'name farmName governorate phone')
      .sort({ createdAt: -1 });
    res.json(supplies);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/supplies ────────────────────────────────────────────────────────
router.post(
  '/',
  protect,
  authorizeRoles('seller'),
  upload.array('images', 5),
  [
    body('name').notEmpty().withMessage('أدخل اسم المنتج'),
    body('category').isIn(['feed','veterinary','equipment','seeds','other']),
    body('quantity').isFloat({ min: 0 }).withMessage('أدخل الكمية'),
    body('unit').notEmpty().withMessage('أدخل وحدة القياس'),
    body('pricePerUnit').isFloat({ min: 0 }).withMessage('أدخل السعر'),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, category, description, quantity, unit, pricePerUnit, minOrderQty, location, deliveryAvailable, deliveryCost, wholesalePrice, minWholesaleQty, farm } = req.body;
      const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

      const supply = await Supply.create({
        seller: req.user.id, name, category, description,
        quantity: parseFloat(quantity), unit,
        pricePerUnit: parseFloat(pricePerUnit),
        minOrderQty: minOrderQty ? parseInt(minOrderQty) : 1,
        location, deliveryAvailable: deliveryAvailable === 'true' || deliveryAvailable === true,
        deliveryCost: deliveryCost || undefined,
        wholesalePrice:  wholesalePrice  ? parseFloat(wholesalePrice)  : undefined,
        minWholesaleQty: minWholesaleQty ? parseInt(minWholesaleQty)   : undefined,
        farm: farm || undefined,
        images,
      });

      // Notify all admins
      User.find({ role: 'admin' }, '_id').then(admins => {
        admins.forEach(admin => createNotification(admin._id, {
          type:    'general',
          title:   'منتج مستلزمات جديد للمراجعة',
          message: `تم إرسال منتج "${name}" ويحتاج إلى مراجعة`,
          link:    '/admin/supplies',
        }));
      }).catch(() => {});

      res.status(201).json(supply);
    } catch (err) { res.status(500).json({ message: err.message }); }
  }
);

// ── GET /api/supplies/:id ─────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const supply = await Supply.findById(req.params.id).populate('seller', 'name farmName governorate phone averageRating reviewCount');
    if (!supply) return res.status(404).json({ message: 'Supply not found' });

    const role = req.user?.role;
    if ((!role || role === 'buyer') && supply.status !== 'approved')
      return res.status(404).json({ message: 'Supply not found' });
    if (role === 'seller' && supply.seller._id.toString() !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });

    res.json(supply);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID' });
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/supplies/:id ─────────────────────────────────────────────────────
router.put(
  '/:id',
  protect,
  authorizeRoles('seller', 'admin'),
  upload.array('images', 5),
  [
    body('category').optional().isIn(['feed','veterinary','equipment','seeds','other']),
    body('quantity').optional().isFloat({ min: 0 }),
    body('pricePerUnit').optional().isFloat({ min: 0 }),
  ],
  validate,
  async (req, res) => {
    try {
      const supply = await Supply.findById(req.params.id);
      if (!supply) return res.status(404).json({ message: 'Supply not found' });
      if (req.user.role === 'seller' && supply.seller.toString() !== req.user.id)
        return res.status(403).json({ message: 'Access denied' });

      const fields = ['name','category','description','quantity','unit','pricePerUnit','minOrderQty','location','deliveryAvailable','deliveryCost'];
      fields.forEach(k => { if (req.body[k] !== undefined) supply[k] = req.body[k]; });
      // Handle wholesale fields — empty string means "remove"
      if (req.body.wholesalePrice !== undefined) {
        supply.wholesalePrice   = req.body.wholesalePrice === '' ? undefined : parseFloat(req.body.wholesalePrice);
      }
      if (req.body.minWholesaleQty !== undefined) {
        supply.minWholesaleQty  = req.body.minWholesaleQty === '' ? undefined : parseInt(req.body.minWholesaleQty);
      }

      // Reset to pending when seller edits (forces re-review)
      if (req.user.role === 'seller') supply.status = 'pending';

      const newImages = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
      if (req.body.keepImages !== undefined) {
        let base = supply.images;
        try { base = JSON.parse(req.body.keepImages); } catch {}
        supply.images = [...base, ...newImages];
      } else if (newImages.length > 0) {
        supply.images = [...supply.images, ...newImages];
      }

      await supply.save();
      res.json(supply);
    } catch (err) { res.status(500).json({ message: err.message }); }
  }
);

// ── DELETE /api/supplies/:id ──────────────────────────────────────────────────
router.delete('/:id', protect, authorizeRoles('seller', 'admin'), async (req, res) => {
  try {
    const supply = await Supply.findById(req.params.id);
    if (!supply) return res.status(404).json({ message: 'Supply not found' });
    if (req.user.role === 'seller' && supply.seller.toString() !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });
    await supply.deleteOne();
    res.status(204).send();
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PATCH /api/supplies/:id/status — admin approve/reject ─────────────────────
router.patch(
  '/:id/status',
  protect,
  authorizeRoles('admin'),
  [body('status').isIn(['approved','rejected','sold_out'])],
  validate,
  async (req, res) => {
    try {
      const supply = await Supply.findById(req.params.id);
      if (!supply) return res.status(404).json({ message: 'Supply not found' });

      supply.status = req.body.status;
      if (req.body.rejectionReason) supply.rejectionReason = req.body.rejectionReason;
      await supply.save();

      // Notify seller
      const title   = req.body.status === 'approved' ? 'تمت الموافقة على منتجك' : 'تم رفض منتجك';
      const message = req.body.status === 'approved'
        ? `تمت الموافقة على "${supply.name}" ويمكن للمشترين رؤيته الآن`
        : `تم رفض "${supply.name}"${req.body.rejectionReason ? ': ' + req.body.rejectionReason : ''}`;
      createNotification(supply.seller, { type: 'general', title, message, link: '/seller/supplies' });

      res.json(supply);
    } catch (err) { res.status(500).json({ message: err.message }); }
  }
);

module.exports = router;
