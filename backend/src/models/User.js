const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // ── Common fields ──────────────────────────────────────────────────────────
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    email: {
      type:      String,
      unique:    true,
      sparse:    true,   // NULL is not indexed — multiple users may omit email
      lowercase: true,
      trim:      true,
    },
    password: {
      type:      String,
      required:  true,
      minlength: 6,
      select:    false,
    },
    role: {
      type:    String,
      enum:    ['buyer', 'seller', 'admin'],
      default: 'buyer',
    },
    nationalId: {
      type:      String,
      unique:    true,
      sparse:    true,       // optional but unique when provided
      trim:      true,
      maxlength: 14,
      minlength: 14,
    },
    governorate: {
      type: String,
      trim: true,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    lastLogin: {
      type:    Date,
      default: null,
    },
    fcmToken: {
      type:    String,
      default: null,
    },

    // ── Seller-specific fields ─────────────────────────────────────────────────
    farmName: {
      type: String,
      trim: true,
    },
    farmPhone: {
      type:   String,
      unique: true,
      sparse: true,
      trim:   true,
    },
    personalPhone: {
      type:   String,
      unique: true,
      sparse: true,
      trim:   true,
    },
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
      type: String,  // stored path like /uploads/xxx.jpg
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
      days: { type: [String], default: [] },   // e.g. ['الأحد','الاثنين','الثلاثاء']
      from: { type: String, trim: true },      // e.g. '08:00'
      to:   { type: String, trim: true },      // e.g. '17:00'
    },

    // ── Buyer-specific fields ──────────────────────────────────────────────────
    phone: {
      type:   String,
      unique: true,
      sparse: true,
      trim:   true,
    },

    // ── Rating fields (denormalized from reviews) ──────────────────────────────
    averageRating: {
      type:    Number,
      default: 0,
      min:     0,
      max:     5,
    },
    reviewCount: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // ── Buyer saved farms ──────────────────────────────────────────────────────
    savedFarms: [{
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    }],
  },
  { timestamps: true }
);

// ─── Hash password before saving ─────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ─── Compare plain password with stored hash ──────────────────────────────────
userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// ─── Strip sensitive fields from API responses ────────────────────────────────
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
