/**
 * Non-critical notification helper.
 * Never throws — a notification failure should never break the main request.
 */
const Notification = require('../models/Notification');
const { sendPush }  = require('./pushNotify');
const { sendEmail } = require('./emailService');

// Maps notification types to the notifPrefs key that controls them.
const TYPE_TO_PREF = {
  vaccination_due:  'reminders',
  weighing_due:     'reminders',
  pregnancy_due:    'reminders',
  dairy_expiry:     'dairy',
  medical_followup: 'reminders',
  new_order:        'orders',
  order_confirmed:  'orders',
  order_cancelled:  'orders',
  order_completed:  'orders',
  new_message:      'messages',
};

/**
 * @param {string|ObjectId} userId
 * @param {object} payload  { type, title, message, link? }
 */
// Email subjects/bodies for order events
const EMAIL_TEMPLATES = {
  new_order: (name) => ({
    subject: 'طلب جديد — FarmFlow',
    html: `<div dir="rtl" style="font-family:sans-serif;padding:24px"><h2 style="color:#3A7D44">لديك طلب جديد!</h2><p>مرحباً ${name}،</p><p>تلقيت طلبًا جديدًا على FarmFlow. يرجى مراجعة لوحة التحكم للتفاصيل.</p></div>`,
  }),
  order_confirmed: (name) => ({
    subject: 'تم تأكيد طلبك — FarmFlow',
    html: `<div dir="rtl" style="font-family:sans-serif;padding:24px"><h2 style="color:#3A7D44">تم تأكيد طلبك</h2><p>مرحباً ${name}،</p><p>تم تأكيد طلبك من قِبل البائع. سيتم التواصل معك قريبًا.</p></div>`,
  }),
  order_completed: (name) => ({
    subject: 'اكتمل طلبك — FarmFlow',
    html: `<div dir="rtl" style="font-family:sans-serif;padding:24px"><h2 style="color:#3A7D44">اكتمل الطلب</h2><p>مرحباً ${name}،</p><p>تم إتمام طلبك بنجاح. نشكرك على ثقتك بـ FarmFlow.</p></div>`,
  }),
  order_cancelled: (name) => ({
    subject: 'تم إلغاء الطلب — FarmFlow',
    html: `<div dir="rtl" style="font-family:sans-serif;padding:24px"><h2 style="color:#E53E3E">تم إلغاء الطلب</h2><p>مرحباً ${name}،</p><p>للأسف، تم إلغاء الطلب. للاستفسار، تواصل معنا عبر التطبيق.</p></div>`,
  }),
};

const createNotification = async (userId, payload) => {
  try {
    // Check user preference before creating the in-app notification
    const prefKey = TYPE_TO_PREF[payload.type];
    const User = require('../models/User');
    let user = null;

    if (prefKey) {
      user = await User.findById(userId).select('notifPrefs email name').lean();
      const prefs = user?.notifPrefs ?? {};
      // Default is true — only skip if explicitly false
      if (prefs[prefKey] === false) return;
    }

    await Notification.create({ user: userId, ...payload });

    // Send email for order events if user has an email address
    if (EMAIL_TEMPLATES[payload.type]) {
      if (!user) user = await User.findById(userId).select('email name').lean();
      if (user?.email) {
        const tmpl = EMAIL_TEMPLATES[payload.type](user.name || '');
        sendEmail({ to: user.email, ...tmpl }).catch(() => {});
      }
    }
  } catch (err) {
    // Log but never propagate
    console.error('[notify] Failed to create notification:', err.message);
  }

  // Fire-and-forget push notification — never awaited so it cannot block
  sendPush(userId, { title: payload.title, body: payload.message });
};

module.exports = { createNotification };
