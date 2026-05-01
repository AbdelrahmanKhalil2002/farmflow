const router = require('express').Router();
const { body, param } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const upload = require('../config/upload');
const {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
} = require('../controllers/listingController');

const LISTING_TYPES = ['cattle', 'buffalo', 'sheep', 'goat', 'camel', 'horse', 'poultry', 'rabbit', 'other'];

const listingValidation = [
  body('type').isIn(LISTING_TYPES).withMessage('Invalid livestock type'),
  body('age').isFloat({ min: 0 }).withMessage('Age must be a positive number (months)'),
  body('weight').isFloat({ min: 0 }).withMessage('Weight must be a positive number (kg)'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('pricePerKg').optional().isFloat({ min: 0 }).withMessage('pricePerKg must be a positive number'),
  body('deliveryType').optional().isIn(['none', 'farm', 'admin']).withMessage('Invalid deliveryType'),
  body('deliveryCost').optional().isFloat({ min: 0 }).withMessage('deliveryCost must be positive'),
];

const idParam = param('id').isMongoId().withMessage('Invalid listing ID');

// Public — buyers see approved listings without logging in
router.get('/', (req, res, next) => {
  // Attach user if token present, but don't block unauthenticated requests
  const jwt = require('jsonwebtoken');
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    } catch {
      // ignore invalid token on public route
    }
  }
  next();
}, getListings);

// Seller's own listings (all statuses) — must be before /:id
router.get('/my', protect, authorizeRoles('seller', 'admin'), getListings);

router.get('/:id', idParam, (req, res, next) => {
  const jwt = require('jsonwebtoken');
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    } catch {}
  }
  next();
}, getListingById);

// Seller only
router.post(
  '/',
  protect,
  authorizeRoles('seller'),
  upload.array('images', 5),
  listingValidation,
  createListing
);

router.put(
  '/:id',
  protect,
  authorizeRoles('seller', 'admin'),
  upload.array('images', 5),
  [
    idParam,
    ...listingValidation.map((v) => v.optional()),
    body('status')
      .optional()
      .isIn(['pending', 'approved', 'rejected', 'sold'])
      .withMessage('Status must be one of: pending, approved, rejected, sold'),
  ],
  updateListing
);

router.delete(
  '/:id',
  protect,
  authorizeRoles('seller', 'admin'),
  idParam,
  deleteListing
);

module.exports = router;
