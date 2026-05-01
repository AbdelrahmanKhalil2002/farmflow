const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    year:  { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 }, // 1–12
    category: {
      type: String,
      enum: ['feed','doctor','transport','electricity','salary','rent','water','maintenance','other','income'],
      required: true,
    },
    targetAmount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

// Unique per seller/year/month/category
budgetSchema.index({ seller: 1, year: 1, month: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
