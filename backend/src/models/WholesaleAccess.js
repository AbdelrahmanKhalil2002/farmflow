const mongoose = require('mongoose');

const wholesaleAccessSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  buyer:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

wholesaleAccessSchema.index({ seller: 1, buyer: 1 }, { unique: true });

module.exports = mongoose.model('WholesaleAccess', wholesaleAccessSchema);
