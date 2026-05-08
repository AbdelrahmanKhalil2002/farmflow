const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ],
    context: {
      type:   { type: String, enum: ['listing', 'order', 'general'], default: 'general' },
      refId:  { type: mongoose.Schema.Types.ObjectId, default: null },
      label:  { type: String, default: '' },
    },
    lastMessage: {
      body:   { type: String, default: '' },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      at:     { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// Fast lookup: "all conversations I participate in, newest first"
conversationSchema.index({ participants: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
