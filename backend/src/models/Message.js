const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Conversation',
      required: true,
      index:    true,
    },
    sender: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    body: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 1000,
    },
    type: {
      type:    String,
      enum:    ['text', 'offer'],
      default: 'text',
    },
    offerAmount: {
      type: Number,
      min:  0,
    },
    offerStatus: {
      type: String,
      enum: ['pending', 'accepted', 'countered', 'rejected'],
    },
    read: {
      type:    Boolean,
      default: false,
      index:   true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
