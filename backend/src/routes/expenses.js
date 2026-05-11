const router = require('express').Router();
const { body, param, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const {
  addExpense,
  getExpenses,
  deleteExpense,
  updateExpense,
  addIncome,
  getIncome,
  deleteIncome,
  updateIncome,
  getSummary,
  getAnalytics,
} = require('../controllers/financeController');

const EXPENSE_CATEGORIES = ['feed', 'doctor', 'transport', 'electricity', 'salary', 'rent', 'water', 'maintenance', 'other'];
const INCOME_TYPES = ['sale', 'dairy', 'feed', 'other'];

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
    body('animalId').optional().isMongoId().withMessage('Invalid animal ID'),
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

const expenseBodyValidation = [
  body('category').optional().isIn(EXPENSE_CATEGORIES).withMessage(`Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  body('listing').optional().isMongoId().withMessage('Invalid listing ID'),
  body('animalId').optional().isMongoId().withMessage('Invalid animal ID'),
  body('note').optional().trim(),
];

router.delete(
  '/expenses/:id',
  protect,
  authorizeRoles('seller', 'admin'),
  param('id').isMongoId().withMessage('Invalid expense ID'),
  deleteExpense
);

router.put(
  '/expenses/:id',
  protect,
  authorizeRoles('seller', 'admin'),
  [param('id').isMongoId().withMessage('Invalid expense ID'), ...expenseBodyValidation],
  updateExpense
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

const incomeBodyValidation = [
  body('type').optional().isIn(INCOME_TYPES).withMessage(`Type must be one of: ${INCOME_TYPES.join(', ')}`),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  body('listing').optional().isMongoId().withMessage('Invalid listing ID'),
  body('order').optional().isMongoId().withMessage('Invalid order ID'),
  body('note').optional().trim(),
];

router.delete(
  '/income/:id',
  protect,
  authorizeRoles('seller', 'admin'),
  param('id').isMongoId().withMessage('Invalid income ID'),
  deleteIncome
);

router.put(
  '/income/:id',
  protect,
  authorizeRoles('seller', 'admin'),
  [param('id').isMongoId().withMessage('Invalid income ID'), ...incomeBodyValidation],
  updateIncome
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

router.get(
  '/analytics',
  protect,
  authorizeRoles('seller', 'admin'),
  [
    query('months').optional().isInt({ min: 1, max: 24 }).withMessage('months must be between 1 and 24'),
    query('sellerId').optional().isMongoId(),
  ],
  getAnalytics
);

module.exports = router;
