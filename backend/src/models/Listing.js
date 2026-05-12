const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    animal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      default: null,
      index: true,
    },
    farm: {
      type:  mongoose.Schema.Types.ObjectId,
      ref:   'Farm',
      index: true,
    },
    type: {
      type: String,
      enum: ['cattle', 'buffalo', 'sheep', 'goat', 'camel', 'horse', 'poultry', 'rabbit', 'ostrich', 'gazelle', 'oryx', 'deer', 'llama', 'alpaca', 'donkey', 'mule', 'other'],
      required: function () { return this.status !== 'draft'; },
    },
    breed: {
      type: String,
      trim: true,
    },
    age: {
      type: Number, // in months
      required: function () { return this.status !== 'draft'; },
    },
    weight: {
      type: Number, // in kg
      required: function () { return this.status !== 'draft'; },
    },
    price: {
      type: Number,
      required: function () { return this.status !== 'draft'; },
    },
    description: {
      type: String,
      trim: true,
    },
    images: {
      type: [String], // file paths
      default: [],
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'sold'],
      default: 'pending',
    },
    location: {
      type: String,
      trim: true,
    },
    pricePerKg: {
      type: Number,
      min:  0,
    },
    deliveryType: {
      type:    String,
      enum:    ['none', 'farm', 'admin'],
      default: 'none',
    },
    deliveryCost: {
      type: Number,
      min:  0,
    },

    // ── Sale purpose ──────────────────────────────────────────────────────────
    purpose: {
      type:    String,
      enum:    ['general', 'fattening', 'breeding', 'newborn', 'slaughter'],
      default: 'general',
    },

    // ── Eid Al-Adha fields ─────────────────────────────────────────────────────
    eidAvailable: {
      type:    Boolean,
      default: false,
    },
    slaughterService: {
      type:    Boolean,
      default: false,
    },
    slaughterCost: {
      type: Number,
      min:  0,
    },

    // ── Deposit / pre-booking ──────────────────────────────────────────────────────
    depositRequired: {
      type:    Boolean,
      default: false,
    },
    depositPercentage: {
      type: Number,   // 1–100 (% of price)
      min:  1,
      max:  100,
    },

    // ── Qurbani (Eid) share system ─────────────────────────────────────────────
    // Allows a single animal to be sold in fractional shares (1/7, 1/4, 1/2)
    qurbaniShares: {
      type: [{
        shareType:    { type: String, enum: ['seventh', 'quarter', 'half'], required: true },
        pricePerShare:{ type: Number, required: true, min: 0 },
        totalShares:  { type: Number, required: true, min: 1 },
        bookedShares: { type: Number, default: 0, min: 0 },
      }],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Listing', listingSchema);
