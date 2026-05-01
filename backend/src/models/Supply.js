const mongoose = require('mongoose');
const { Schema, Types: { ObjectId } } = mongoose;

const supplySchema = new Schema({
  seller: { type: ObjectId, ref: 'User', required: true, index: true },

  name:        { type: String, required: true, trim: true, maxlength: 120 },
  category:    { type: String, required: true, enum: ['feed', 'veterinary', 'equipment', 'seeds', 'other'] },
  description: { type: String, trim: true, maxlength: 1000 },

  quantity:    { type: Number, required: true, min: 0 },
  unit:        { type: String, required: true, trim: true, maxlength: 30 },  // e.g. كجم, طن, كيس, قطعة, لتر
  pricePerUnit:{ type: Number, required: true, min: 0 },
  minOrderQty: { type: Number, default: 1, min: 1 },

  location:         { type: String, trim: true, maxlength: 120 },
  deliveryAvailable:{ type: Boolean, default: false },
  deliveryCost:     { type: Number, min: 0 },

  images: { type: [String], default: [] },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'sold_out'],
    default: 'pending',
  },
  rejectionReason: { type: String, trim: true, maxlength: 300 },
}, { timestamps: true });

module.exports = mongoose.model('Supply', supplySchema);
