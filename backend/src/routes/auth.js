const router             = require('express').Router();
const { body }           = require('express-validator');
const { register, login, getMe, verifyId, updateProfile, updatePassword, forgotPassword, resetPassword, verifyEmail, resendVerification, verify2FA } = require('../controllers/authController');
const { protect }        = require('../middleware/auth');
const upload             = require('../config/upload');

// ─── Register ─────────────────────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('الاسم مطلوب'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
    body('role')
      .optional()
      .isIn(['buyer', 'seller'])
      .withMessage('النوع يجب أن يكون buyer أو seller'),

    // Buyer: email required, phone required
    body('email')
      .if(body('role').equals('buyer'))
      .isEmail()
      .withMessage('بريد إلكتروني غير صالح للمشتري'),
    body('phone')
      .if(body('role').equals('buyer'))
      .notEmpty()
      .withMessage('رقم الهاتف مطلوب للمشتري'),

    // Seller: email optional, farmName required, farmPhone required, personalPhone required
    body('email')
      .if(body('role').equals('seller'))
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage('البريد الإلكتروني غير صالح'),
    body('farmName')
      .if(body('role').equals('seller'))
      .trim()
      .notEmpty()
      .withMessage('اسم المزرعة مطلوب'),
    body('farmPhone')
      .if(body('role').equals('seller'))
      .notEmpty()
      .withMessage('رقم هاتف المزرعة مطلوب'),
    body('personalPhone')
      .if(body('role').equals('seller'))
      .notEmpty()
      .withMessage('رقم الهاتف الشخصي مطلوب'),

    // National ID: required for both
    body('nationalId')
      .trim()
      .isLength({ min: 14, max: 14 })
      .withMessage('رقم الهوية الوطنية يجب أن يكون 14 رقمًا')
      .isNumeric()
      .withMessage('رقم الهوية يجب أن يحتوي على أرقام فقط'),
  ],
  register
);

// ─── Login (email OR phone) ───────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('identifier')
      .trim()
      .notEmpty()
      .withMessage('البريد الإلكتروني أو رقم الهاتف مطلوب'),
    body('password')
      .notEmpty()
      .withMessage('كلمة المرور مطلوبة'),
  ],
  login
);

// ─── Get current user ─────────────────────────────────────────────────────────
router.get('/me', protect, getMe);

// ─── Update profile ───────────────────────────────────────────────────────────
router.put('/profile', protect, upload.single('farmBanner'), updateProfile);

// ─── Change password ──────────────────────────────────────────────────────────
router.put('/password', protect, updatePassword);

// ─── FCM token registration ───────────────────────────────────────────────────
router.patch('/fcm-token', protect, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'token required' });
    await require('../models/User').findByIdAndUpdate(req.user.id, { fcmToken: token });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Notification preferences ─────────────────────────────────────────────────
router.get('/notif-prefs', protect, async (req, res) => {
  try {
    const user = await require('../models/User').findById(req.user.id).select('notifPrefs');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const prefs = user.notifPrefs ?? { orders: true, reminders: true, dairy: true, messages: true };
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/notif-prefs', protect, async (req, res) => {
  try {
    const { orders, reminders, dairy, messages } = req.body;
    const prefs = {};
    if (orders    !== undefined) prefs['notifPrefs.orders']    = !!orders;
    if (reminders !== undefined) prefs['notifPrefs.reminders'] = !!reminders;
    if (dairy     !== undefined) prefs['notifPrefs.dairy']     = !!dairy;
    if (messages  !== undefined) prefs['notifPrefs.messages']  = !!messages;
    await require('../models/User').findByIdAndUpdate(req.user.id, { $set: prefs });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Verify National ID (format + Civil Registry mock) ───────────────────────
router.post(
  '/verify-id',
  [
    body('nationalId')
      .trim()
      .isLength({ min: 14, max: 14 })
      .withMessage('رقم الهوية يجب أن يكون 14 رقمًا'),
  ],
  verifyId
);

// ─── Password reset ───────────────────────────────────────────────────────────
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);

// ─── Email verification ───────────────────────────────────────────────────────
router.post('/verify-email',          verifyEmail);
router.post('/resend-verification',   protect, resendVerification);

// ─── Admin 2FA ────────────────────────────────────────────────────────────────
router.post('/verify-2fa', verify2FA);

module.exports = router;
