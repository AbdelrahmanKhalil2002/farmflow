/**
 * Non-critical notification helper.
 * Never throws — a notification failure should never break the main request.
 */
const Notification = require('../models/Notification');
const { sendPush }  = require('./pushNotify');

/**
 * @param {string|ObjectId} userId
 * @param {object} payload  { type, title, message, link? }
 */
const createNotification = async (userId, payload) => {
  try {
    await Notification.create({ user: userId, ...payload });
  } catch (err) {
    // Log but never propagate
    console.error('[notify] Failed to create notification:', err.message);
  }

  // Fire-and-forget push notification — never awaited so it cannot block
  sendPush(userId, { title: payload.title, body: payload.message });
};

module.exports = { createNotification };
