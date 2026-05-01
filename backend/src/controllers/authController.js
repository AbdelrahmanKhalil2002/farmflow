const jwt                             = require('jsonwebtoken');
const { validationResult }            = require('express-validator');
const User                            = require('../models/User');
const { validateEgyptianId, verifyWithRegistry } = require('../utils/egyptianId');

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
    personalPhone, farmName, farmPhone, experience, animalTypes, bio, // seller
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

module.exports = { register, login, getMe, verifyId, updateProfile, updatePassword };
