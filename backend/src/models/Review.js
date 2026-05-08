const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    buyer: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    seller: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    order: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Order',
      required: true,
      unique:   true,   // one review per completed order
    },
    rating: {
      type:     Number,
      required: true,
      min:      1,
      max:      5,
    },
    comment: {
      type:    String,
      trim:    true,
      maxlength: 500,
    },
    flagged: {
      type:    Boolean,
      default: false,
    },
    reply: {
      body: { type: String, trim: true, maxlength: 500, default: null },
      at:   { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
