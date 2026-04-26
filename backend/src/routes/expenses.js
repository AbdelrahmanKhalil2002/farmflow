const router = require('express').Router();
const { body, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const {
  addExpense,
  getExpenses,
  addIncome,
  getIncome,
  getSummary,
} = require('../controllers/financeController');

const EXPENSE_CATEGORIES = ['feed', 'doctor', 'transport', 'other'];
const INCOME_TYPES = ['sale', 'deposit'];

const dateQueryValidation = [
  query('from').optional().isISO8601().withMessage('from must be a valid date (ISO 8601)'),
  query('to').optional().isISO8601().withMessage('to must be a valid date (ISO 8601)'),
];

// ─── Expenses ────────────────────────────────────────────────────────────────

router.post(
  '/expenses',
  protect,
  authorizeRoles('seller'),
  [
    body('category')
      .isIn(EXPENSE_CATEGORIES)
      .withMessage(`Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
    body('listing').optional().isMongoId().withMessage('Invalid listing ID'),
    body('note').optional().trim(),
  ],
  addExpense
);

router.get(
  '/expenses',
  protect,
  authorizeRoles('seller', 'admin'),
  [
    ...dateQueryValidation,
    query('category').optional().isIn(EXPENSE_CATEGORIES),
    query('listingId').optional().isMongoId(),
    query('sellerId').optional().isMongoId(),
  ],
  getExpenses
);

// ─── Income ──────────────────────────────────────────────────────────────────

router.post(
  '/income',
  protect,
  authorizeRoles('seller'),
  [
    body('type')
      .isIn(INCOME_TYPES)
      .withMessage(`Type must be one of: ${INCOME_TYPES.join(', ')}`),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
    body('listing').optional().isMongoId().withMessage('Invalid listing ID'),
    body('order').optional().isMongoId().withMessage('Invalid order ID'),
    body('note').optional().trim(),
  ],
  addIncome
);

router.get(
  '/income',
  protect,
  authorizeRoles('seller', 'admin'),
  [
    ...dateQueryValidation,
    query('type').optional().isIn(INCOME_TYPES),
    query('listingId').optional().isMongoId(),
    query('sellerId').optional().isMongoId(),
  ],
  getIncome
);

// ─── Summary ─────────────────────────────────────────────────────────────────

router.get(
  '/summary',
  protect,
  authorizeRoles('seller', 'admin'),
  [
    ...dateQueryValidation,
    query('sellerId').optional().isMongoId(),
  ],
  getSummary
);

module.exports = router;
