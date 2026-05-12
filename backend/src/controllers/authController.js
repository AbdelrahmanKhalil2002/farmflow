const jwt                             = require('jsonwebtoken');
const crypto                          = require('crypto');
const { validationResult }            = require('express-validator');
const User                            = require('../models/User');
const Farm                            = require('../models/Farm');
const { validateEgyptianId, verifyWithRegistry } = require('../utils/egyptianId');
const { sendEmail }                   = require('../utils/emailService');

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ─── POST /api/auth/register ──────────────────────────────────────────────────
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    name, email, password, role,
    phone,                         // buyer
    personalPhone, farmName, farmPhone, experience, animalTypes, bio, // seller (legacy)
    farms,                         // seller (new: array of farm objects)
    nationalId, governorate,
  } = req.body;

  try {
    // ── Email uniqueness (only if provided) ──────────────────────────────────
    if (email) {
      const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
      if (emailExists) {
        return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
      }
    }

    // ── Phone uniqueness ─────────────────────────────────────────────────────
    const phoneField = role === 'seller' ? { personalPhone } : { phone };
    if (phoneField.personalPhone || phoneField.phone) {
      const phoneValue = phoneField.personalPhone || phoneField.phone;
      const query      = role === 'seller' ? { personalPhone: phoneValue } : { phone: phoneValue };
      const phoneExists = await User.findOne(query);
      if (phoneExists) {
        return res.status(400).json({ message: 'رقم الهاتف مستخدم بالفعل' });
      }
    }

    // ── National ID uniqueness + validation ──────────────────────────────────
    if (nationalId) {
      const idResult = validateEgyptianId(nationalId);
      if (!idResult.valid) {
        return res.status(400).json({ message: idResult.error });
      }
      const idExists = await User.findOne({ nationalId });
      if (idExists) {
        return res.status(400).json({ message: 'رقم الهوية مسجل مسبقًا' });
      }
    }

    // ── Farm phone uniqueness (seller) ───────────────────────────────────────
    if (farmPhone) {
      const farmPhoneExists = await User.findOne({ farmPhone });
      if (farmPhoneExists) {
        return res.status(400).json({ message: 'رقم هاتف المزرعة مستخدم بالفعل' });
      }
    }

    // ── Build user payload ───────────────────────────────────────────────────
    const userData = {
      name:        name.trim(),
      password,
      role:        role || 'buyer',
      nationalId:  nationalId || undefined,
      governorate: governorate || undefined,
    };

    if (email) userData.email = email.toLowerCase().trim();

    if (role === 'seller') {
      userData.farmName      = farmName?.trim();
      userData.farmPhone     = farmPhone?.trim();
      userData.personalPhone = personalPhone?.trim();
      userData.experience    = experience || undefined;
      userData.animalTypes   = Array.isArray(animalTypes) ? animalTypes : [];
      userData.bio           = bio?.trim() || undefined;
    } else {
      // buyer
      userData.phone = phone?.trim();
    }

    const user  = await User.create(userData);
    const token = generateToken(user._id, user.role);

    // ── Send email verification ───────────────────────────────────────────────
    if (userData.email) {
      const vToken = crypto.randomBytes(32).toString('hex');
      await User.findByIdAndUpdate(user._id, {
        emailVerificationToken:  crypto.createHash('sha256').update(vToken).digest('hex'),
        emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${vToken}`;
      sendEmail({
        to: userData.email,
        subject: 'تأكيد البريد الإلكتروني — FarmFlow',
        html: `
          <div dir="rtl" style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#3A7D44;margin-top:0">مرحباً بك في FarmFlow</h2>
            <p>مرحباً ${userData.name}،</p>
            <p>شكراً لتسجيلك. اضغط على الزر أدناه لتأكيد بريدك الإلكتروني:</p>
            <a href="${verifyUrl}" style="display:inline-block;padding:12px 28px;background:#3A7D44;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0;font-size:15px">
              تأكيد البريد الإلكتروني
            </a>
            <p style="color:#666;font-size:13px">الرابط صالح لمدة 24 ساعة. إذا لم تنشئ هذا الحساب، تجاهل هذه الرسالة.</p>
          </div>
        `,
      }).catch(() => {});
    }

    // ── Create Farm documents for sellers ────────────────────────────────────
    if (role === 'seller') {
      const farmList = Array.isArray(farms) && farms.length > 0 ? farms : null;
      if (farmList) {
        await Farm.insertMany(farmList.map(f => ({
          owner:         user._id,
          name:          (f.name || '').trim() || userData.farmName || user.name,
          type:          f.type          || 'livestock',
          governorate:   f.governorate   || userData.governorate || '',
          farmPhone:     f.farmPhone     || '',
          animalTypes:   Array.isArray(f.animalTypes) ? f.animalTypes : [],
          typicalPrices: Array.isArray(f.typicalPrices) ? f.typicalPrices.filter(p => p.price > 0) : [],
        })));
      }
      // For legacy registrations (no farms array), FarmContext.migrateLegacy handles creation
    }

    res.status(201).json({ token, user });
  } catch (err) {
    // Duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0];
      const msgs  = {
        email:         'البريد الإلكتروني مستخدم بالفعل',
        nationalId:    'رقم الهوية مسجل مسبقًا',
        phone:         'رقم الهاتف مستخدم بالفعل',
        personalPhone: 'رقم الهاتف الشخصي مستخدم بالفعل',
        farmPhone:     'رقم هاتف المزرعة مستخدم بالفعل',
      };
      return res.status(400).json({ message: msgs[field] || 'البيانات مستخدمة بالفعل' });
    }
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Accepts: { identifier: email | phone | farmPhone, password }
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { identifier, password } = req.body;
  const id = identifier.trim().toLowerCase();

  try {
    // Try email, then phone, then farmPhone, then personalPhone
    const user = await User.findOne({
      $or: [
        { email: id },
        { phone: identifier.trim() },
        { farmPhone: identifier.trim() },
        { personalPhone: identifier.trim() },
      ],
    }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'الحساب موقوف، تواصل مع الإدارة' });
    }

    // 2FA disabled for development

    const token = generateToken(user._id, user.role);
    User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).catch(() => {});

    user.password = undefined;
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user)         return res.status(404).json({ message: 'المستخدم غير موجود' });
    if (!user.isActive) return res.status(403).json({ message: 'الحساب موقوف' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/auth/verify-id ─────────────────────────────────────────────────
// Validates Egyptian National ID format + mock Civil Registry check.
const verifyId = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nationalId } = req.body;

  try {
    // Check if already registered
    const exists = await User.findOne({ nationalId: nationalId.trim() });
    if (exists) {
      return res.status(400).json({ verified: false, message: 'رقم الهوية مسجل مسبقًا في المنظومة' });
    }

    const result = await verifyWithRegistry(nationalId.trim());
    if (!result.verified) {
      return res.status(400).json({ verified: false, message: result.error });
    }

    res.json({ verified: true, info: result.info });
  } catch (err) {
    res.status(500).json({ verified: false, message: err.message });
  }
};

// ─── PUT /api/auth/profile ────────────────────────────────────────────────────
// Updates editable profile fields. Password is NOT changed here.
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

    const allowed = ['name', 'governorate', 'bio'];
    if (user.role === 'seller') allowed.push('farmName', 'farmPhone', 'personalPhone', 'experience', 'animalTypes', 'farmDescription', 'farmCertificates', 'workingHours');
    if (user.role === 'buyer')  allowed.push('phone');
    // Email update (optional for sellers)
    allowed.push('email');

    // Handle banner image upload
    if (req.file && user.role === 'seller') {
      user.farmBanner = `/uploads/${req.file.filename}`;
    }

    // Handle farm location (sellers only) — accepts JSON object or stringified JSON
    if (user.role === 'seller' && req.body.farmLocation !== undefined) {
      try {
        const raw = req.body.farmLocation;
        const loc = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (loc && loc.lat != null && loc.lng != null) {
          user.farmLocation = {
            lat:     parseFloat(loc.lat),
            lng:     parseFloat(loc.lng),
            address: (loc.address || '').trim(),
          };
        } else {
          user.farmLocation = undefined;
        }
      } catch { /* ignore malformed JSON */ }
    }

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        if (field === 'email') {
          const val = req.body.email?.toLowerCase().trim();
          if (val && val !== user.email) {
            const exists = await User.findOne({ email: val, _id: { $ne: user._id } });
            if (exists) return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
            user.email = val;
          } else if (!val) {
            user.email = undefined;
          }
        } else if (field === 'animalTypes') {
          // FormData sends as 'animalTypes[]', JSON sends as 'animalTypes'
          const raw = req.body['animalTypes[]'] || req.body.animalTypes;
          user.animalTypes = Array.isArray(raw) ? raw : (raw ? [raw] : []);
        } else if (field === 'farmCertificates') {
          // FormData sends as 'farmCertificates[]', JSON sends as 'farmCertificates'
          const raw = req.body['farmCertificates[]'] || req.body.farmCertificates;
          user.farmCertificates = Array.isArray(raw) ? raw : (raw ? [raw] : []);
        } else if (field === 'workingHours') {
          // workingHours comes as JSON string in FormData or as object in JSON body
          const raw = req.body.workingHours;
          if (raw) {
            user.workingHours = typeof raw === 'string' ? JSON.parse(raw) : raw;
          }
        } else if (field === 'farmPhone' && user.role === 'seller') {
          const val = req.body.farmPhone?.trim();
          if (val && val !== user.farmPhone) {
            const exists = await User.findOne({ farmPhone: val, _id: { $ne: user._id } });
            if (exists) return res.status(400).json({ message: 'رقم هاتف المزرعة مستخدم بالفعل' });
          }
          user.farmPhone = val || undefined;
        } else if (field === 'personalPhone' && user.role === 'seller') {
          const val = req.body.personalPhone?.trim();
          if (val && val !== user.personalPhone) {
            const exists = await User.findOne({ personalPhone: val, _id: { $ne: user._id } });
            if (exists) return res.status(400).json({ message: 'رقم الهاتف الشخصي مستخدم بالفعل' });
          }
          user.personalPhone = val || undefined;
        } else if (field === 'phone' && user.role === 'buyer') {
          const val = req.body.phone?.trim();
          if (val && val !== user.phone) {
            const exists = await User.findOne({ phone: val, _id: { $ne: user._id } });
            if (exists) return res.status(400).json({ message: 'رقم الهاتف مستخدم بالفعل' });
          }
          user.phone = val || undefined;
        } else {
          const val = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
          user[field] = val || undefined;
        }
      }
    }

    await user.save();
    res.json(user);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0];
      const msgs  = { email: 'البريد الإلكتروني مستخدم', phone: 'رقم الهاتف مستخدم', personalPhone: 'رقم الهاتف الشخصي مستخدم', farmPhone: 'رقم هاتف المزرعة مستخدم' };
      return res.status(400).json({ message: msgs[field] || 'البيانات مستخدمة بالفعل' });
    }
    res.status(500).json({ message: err.message });
  }
};

// ─── PUT /api/auth/password ───────────────────────────────────────────────────
const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'كلمة المرور الحالية والجديدة مطلوبتان' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' });
  }

  try {
    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

    const match = await user.matchPassword(currentPassword);
    if (!match) return res.status(401).json({ message: 'كلمة المرور الحالية غير صحيحة' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
const forgotPassword = async (req, res) => {
  const { identifier } = req.body;
  if (!identifier?.trim()) {
    return res.status(400).json({ message: 'البريد الإلكتروني أو رقم الهاتف مطلوب' });
  }
  const id = identifier.trim().toLowerCase();

  // Generic message always returned to prevent user enumeration
  const GENERIC = 'إذا كان الحساب موجودًا وله بريد إلكتروني، ستصل رسالة إليك خلال دقائق';

  try {
    const user = await User.findOne({
      $or: [
        { email: id },
        { phone: identifier.trim() },
        { personalPhone: identifier.trim() },
      ],
    });

    if (!user || !user.email) return res.json({ message: GENERIC });

    const token = crypto.randomBytes(32).toString('hex');
    await User.findByIdAndUpdate(user._id, {
      resetPasswordToken:  crypto.createHash('sha256').update(token).digest('hex'),
      resetPasswordExpiry: new Date(Date.now() + 30 * 60 * 1000), // 30 min
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'استعادة كلمة المرور — FarmFlow',
      html: `
        <div dir="rtl" style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#3A7D44;margin-top:0">استعادة كلمة المرور</h2>
          <p>مرحباً ${user.name}،</p>
          <p>طلبت استعادة كلمة المرور الخاصة بك. اضغط على الزر أدناه للمتابعة:</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:#3A7D44;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0;font-size:15px">
            إعادة تعيين كلمة المرور
          </a>
          <p style="color:#666;font-size:13px">الرابط صالح لمدة <strong>30 دقيقة</strong> فقط. إذا لم تطلب ذلك، تجاهل هذه الرسالة.</p>
        </div>
      `,
    });

    res.json({ message: GENERIC });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: 'الرمز وكلمة المرور الجديدة مطلوبان' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const user = await User.findOne({
      resetPasswordToken:  hashedToken,
      resetPasswordExpiry: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpiry');

    if (!user) {
      return res.status(400).json({ message: 'الرابط غير صالح أو منتهي الصلاحية' });
    }

    user.password            = password;
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.json({ message: 'تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/auth/verify-email ─────────────────────────────────────────────
const verifyEmail = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'الرمز مطلوب' });

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const user = await User.findOne({
      emailVerificationToken:  hashedToken,
      emailVerificationExpiry: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpiry');

    if (!user) {
      return res.status(400).json({ message: 'رابط التحقق غير صالح أو منتهي الصلاحية' });
    }

    user.isEmailVerified         = true;
    user.emailVerificationToken  = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    res.json({ message: 'تم تأكيد البريد الإلكتروني بنجاح' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/auth/resend-verification ──────────────────────────────────────
const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user)              return res.status(404).json({ message: 'المستخدم غير موجود' });
    if (!user.email)        return res.status(400).json({ message: 'لا يوجد بريد إلكتروني مرتبط بالحساب' });
    if (user.isEmailVerified) return res.status(400).json({ message: 'البريد الإلكتروني مؤكد بالفعل' });

    const token = crypto.randomBytes(32).toString('hex');
    await User.findByIdAndUpdate(user._id, {
      emailVerificationToken:  crypto.createHash('sha256').update(token).digest('hex'),
      emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: 'تأكيد البريد الإلكتروني — FarmFlow',
      html: `
        <div dir="rtl" style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#3A7D44;margin-top:0">تأكيد البريد الإلكتروني</h2>
          <p>مرحباً ${user.name}،</p>
          <p>اضغط على الزر أدناه لتأكيد بريدك الإلكتروني:</p>
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 28px;background:#3A7D44;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0;font-size:15px">
            تأكيد البريد الإلكتروني
          </a>
          <p style="color:#666;font-size:13px">الرابط صالح لمدة 24 ساعة.</p>
        </div>
      `,
    });

    res.json({ message: 'تم إرسال رسالة التأكيد إلى بريدك الإلكتروني' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/auth/verify-2fa ────────────────────────────────────────────────
const verify2FA = async (req, res) => {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) {
    return res.status(400).json({ message: 'الرمز والتوكن مطلوبان' });
  }

  let decoded;
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'الجلسة منتهية، يرجى تسجيل الدخول مجددًا' });
  }

  if (!decoded.twoFactor) {
    return res.status(400).json({ message: 'توكن غير صالح' });
  }

  try {
    const user = await User.findById(decoded.id)
      .select('+twoFactorCode +twoFactorExpiry');

    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

    if (!user.twoFactorCode || !user.twoFactorExpiry || user.twoFactorExpiry < new Date()) {
      return res.status(400).json({ message: 'انتهت صلاحية رمز التحقق' });
    }

    const expected = crypto.createHash('sha256').update(code.trim()).digest('hex');
    if (user.twoFactorCode !== expected) {
      return res.status(401).json({ message: 'رمز التحقق غير صحيح' });
    }

    user.twoFactorCode   = undefined;
    user.twoFactorExpiry = undefined;
    user.lastLogin       = new Date();
    await user.save();

    const token = generateToken(user._id, user.role);
    user.password = undefined;
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, login, getMe, verifyId, updateProfile, updatePassword, forgotPassword, resetPassword, verifyEmail, resendVerification, verify2FA };
