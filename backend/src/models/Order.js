const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sourceType: {
      type: String,
      enum: ['listing', 'supply'],
      default: 'listing',
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
    },
    supply: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supply',
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    paymentType: {
      type: String,
      enum: ['deposit', 'cod', 'instapay'], // cash on delivery / InstaPay
      required: true,
    },
    depositAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
    },
    deliveryLocation: {
      lat:     { type: Number },
      lng:     { type: Number },
      address: { type: String, trim: true },
    },
    // Multi-item cart support (optional — single-item orders leave this empty)
    items: [
      {
        listing:  { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
        seller:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        quantity: { type: Number, default: 1 },
        price:    { type: Number },
      },
    ],

    // Admin-handled delivery fields
    deliveryCost: {
      type: Number,
      default: 0,
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'in_transit', 'delivered'],
      default: 'pending',
    },

    // Immutable per-step timestamps — one entry pushed on every status transition
    timeline: [
      {
        status: { type: String, required: true },
        at:     { type: Date,   default: Date.now },
        note:   { type: String, trim: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
