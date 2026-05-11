const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema(
  {
    owner: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    // ── Identity ───────────────────────────────────────────────────────────────
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    type: {
      type:    String,
      enum:    ['livestock', 'horses', 'poultry', 'dairy', 'exotic', 'mixed', 'other'],
      default: 'livestock',
    },
    governorate: {
      type: String,
      trim: true,
    },

    // ── Contact ────────────────────────────────────────────────────────────────
    farmPhone: {
      type: String,
      trim: true,
    },
    personalPhone: {
      type: String,
      trim: true,
    },

    // ── Profile ────────────────────────────────────────────────────────────────
    experience: {
      type: String,   // '<1', '1-3', '3-5', '5-10', '>10'
    },
    animalTypes: {
      type:    [String],
      default: [],
    },
    bio: {
      type: String,
      trim: true,
    },
    farmDescription: {
      type: String,
      trim: true,
    },
    farmBanner: {
      type: String,  // /uploads/xxx.jpg
    },
    farmLocation: {
      lat:     { type: Number },
      lng:     { type: Number },
      address: { type: String, trim: true },
    },
    farmCertificates: {
      type:    [String],
      default: [],
    },
    workingHours: {
      days: { type: [String], default: [] },
      from: { type: String, trim: true },
      to:   { type: String, trim: true },
    },

    // ── Typical prices per animal type (set during registration) ─────────────
    typicalPrices: {
      type: [{
        animalType: { type: String, required: true },
        price:      { type: Number, required: true, min: 0 },
      }],
      default: [],
    },

    // ── Rating (denormalized) ──────────────────────────────────────────────────
    averageRating: {
      type:    Number,
      default: 0,
      min:     0,
      max:     5,
    },
    ratingCount: {
      type:    Number,
      default: 0,
    },

    sellsSupplies: {
      type:    Boolean,
      default: false,
    },

    wholesaleCode: {
      type:   String,
      trim:   true,
      index:  { sparse: true },
    },

    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Farm', farmSchema);
