const mongoose = require('mongoose');

/**
 * DairyProduct — standalone product model for dairy items sold by farms.
 * Separate from Listing (livestock) because dairy products have fundamentally
 * different attributes: quantity, unit of measure, expiry date, production date.
 */
const dairySchema = new mongoose.Schema(
  {
    seller: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    // Product identity
    name: {
      type:     String,
      required: true,
      trim:     true,
      // e.g. 'جبنة بيضاء', 'لبن بقري طازج', 'زبد بلدي'
    },
    type: {
      type:     String,
      enum:     ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'ghee', 'other'],
      required: true,
    },

    // Quantity & pricing
    quantity: {
      type:     Number,
      required: true,
      min:      0,
    },
    unit: {
      type:     String,
      enum:     ['kg', 'liter', 'piece', 'pack', 'dozen'],
      required: true,
    },
    pricePerUnit: {
      type:     Number,
      required: true,
      min:      0,
    },

    // Dates
    productionDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },

    // Rich details
    description: {
      type: String,
      trim: true,
    },
    images: {
      type:    [String],
      default: [],
    },

    // Delivery
    deliveryAvailable: {
      type:    Boolean,
      default: false,
    },
    deliveryCost: {
      type: Number,
      min:  0,
    },

    // Admin moderation
    status: {
      type:    String,
      enum:    ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      trim: true,
    },

    available: {
      type:    Boolean,
      default: true,
    },

    // ── Stock management ──────────────────────────────────────────────────────────
    minStockAlert: {
      type:    Number,
      min:     0,
      default: 0,
    },
    stockLog: [{
      date:   { type: Date, default: Date.now },
      change: { type: Number, required: true },   // positive = add, negative = remove
      note:   { type: String, trim: true },
    }],
  },
  { timestamps: true }
);

dairySchema.index({ seller: 1, status: 1 });
dairySchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('DairyProduct', dairySchema);
