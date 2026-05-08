const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    type: {
      type: String,
      enum: [
        // seller
        'new_order', 'order_cancelled', 'listing_approved', 'listing_rejected',
        'dairy_approved', 'dairy_rejected',
        // buyer
        'order_confirmed', 'order_in_transit', 'order_completed',
        // admin
        'listing_pending', 'dairy_pending', 'new_user',
        // scheduled reminders (cron)
        'vaccination_due', 'weighing_due', 'pregnancy_due', 'dairy_expiry',
        'medical_followup', 'weight_milestone',
        // generic
        'general',
        // messaging
        'new_message',
      ],
      default: 'general',
    },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    link:    { type: String, default: null },
    read:    { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// TTL — auto-delete notifications older than 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = mongoose.model('Notification', notificationSchema);
