const mongoose = require('mongoose');

/**
 * Expense categories:
 *
 * Livestock-specific:
 *   feed       — علف وعلاج (food & feed)
 *   doctor     — رعاية بيطرية (vet & medical)
 *   transport  — نقل ومواصلات
 *
 * Monthly farm operations:
 *   electricity — كهرباء
 *   salary      — رواتب العمال
 *   rent        — إيجار
 *   water       — مياه
 *   maintenance — صيانة
 *   other       — أخرى / متنوعة
 */
const EXPENSE_CATEGORIES = [
  'feed',
  'doctor',
  'transport',
  'electricity',
  'salary',
  'rent',
  'water',
  'maintenance',
  'other',
];

const expenseSchema = new mongoose.Schema(
  {
    seller: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    farm: {
      type:  mongoose.Schema.Types.ObjectId,
      ref:   'Farm',
      index: true,
    },
    listing: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Listing',
      default: null,
    },
    animal: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Animal',
      default: null,
    },
    category: {
      type:     String,
      enum:     EXPENSE_CATEGORIES,
      required: true,
    },
    amount: {
      type:     Number,
      required: true,
      min:      0,
    },
    date: {
      type:     Date,
      required: true,
      default:  Date.now,
    },
    note: {
      type: String,
      trim: true,
    },
    // Monthly flag — when true, this is a recurring farm-level expense
    isMonthly: {
      type:    Boolean,
      default: false,
    },

    // Day of month (1-28) on which this expense auto-recurs. null = non-recurring.
    recurringDay: {
      type:    Number,
      min:     1,
      max:     28,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for fast per-seller date-range queries
expenseSchema.index({ seller: 1, date: -1 });
expenseSchema.index({ seller: 1, category: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
