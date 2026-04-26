const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['cattle', 'sheep', 'goat', 'camel', 'horse', 'other'],
      required: true,
    },
    breed: {
      type: String,
      trim: true,
    },
    age: {
      type: Number, // in months
      required: true,
    },
    weight: {
      type: Number, // in kg
      required: true,
    },
    price: {
      type: Number,
      required: true,
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
      enum: ['pending', 'approved', 'rejected', 'sold'],
      default: 'pending',
    },
    location: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Listing', listingSchema);
