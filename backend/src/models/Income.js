const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    farm: {
      type:  mongoose.Schema.Types.ObjectId,
      ref:   'Farm',
      index: true,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      default: null,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    type: {
      type: String,
      enum: ['sale', 'dairy', 'feed', 'other'],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'transfer', 'instapay', 'auto'],
      default: 'cash',
    },
    fromOrder: {
      type: Boolean,
      default: false,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Income', incomeSchema);
