const Farm    = require('../models/Farm');
const User    = require('../models/User');
const path    = require('path');
const fs      = require('fs');

// ── GET /api/farms  — list caller's farms ─────────────────────────────────────
exports.getMyFarms = async (req, res) => {
  try {
    const farms = await Farm.find({ owner: req.user.id, isActive: true })
      .sort({ createdAt: 1 });
    res.json(farms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/farms/:id  — public farm profile ─────────────────────────────────
exports.getFarmById = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id)
      .populate('owner', 'name averageRating');
    if (!farm) return res.status(404).json({ message: 'Farm not found' });
    res.json(farm);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/farms  — create new farm ───────────────────────────────────────
exports.createFarm = async (req, res) => {
  try {
    const {
      name, type, governorate, farmPhone, personalPhone, experience,
      animalTypes, bio, farmDescription, farmLocation, farmCertificates, workingHours,
    } = req.body;

    if (!name) return res.status(400).json({ message: 'Farm name is required' });

    const farmData = {
      owner:            req.user.id,
      name:             name.trim(),
      type:             type             || 'livestock',
      governorate:      governorate      || '',
      farmPhone:        farmPhone        || '',
      personalPhone:    personalPhone    || '',
      experience:       experience       || '',
      animalTypes:      parseArray(animalTypes),
      bio:              bio              || '',
      farmDescription:  farmDescription  || '',
      farmCertificates: parseArray(farmCertificates),
      workingHours:     parseJson(workingHours, { days: [], from: '08:00', to: '17:00' }),
      farmLocation:     parseJson(farmLocation, null),
    };

    if (req.file) {
      farmData.farmBanner = `/uploads/${req.file.filename}`;
    }

    const farm = await Farm.create(farmData);
    res.status(201).json(farm);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT /api/farms/:id  — update farm ────────────────────────────────────────
exports.updateFarm = async (req, res) => {
  try {
    const farm = await Farm.findOne({ _id: req.params.id, owner: req.user.id });
    if (!farm) return res.status(404).json({ message: 'Farm not found' });

    const {
      name, type, governorate, farmPhone, personalPhone, experience,
      animalTypes, bio, farmDescription, farmLocation, farmCertificates, workingHours,
    } = req.body;

    if (name             != null) farm.name             = name.trim();
    if (type             != null) farm.type             = type;
    if (governorate      != null) farm.governorate      = governorate;
    if (farmPhone        != null) farm.farmPhone        = farmPhone;
    if (personalPhone    != null) farm.personalPhone    = personalPhone;
    if (experience       != null) farm.experience       = experience;
    if (bio              != null) farm.bio              = bio;
    if (farmDescription  != null) farm.farmDescription  = farmDescription;
    if (animalTypes      != null) farm.animalTypes      = parseArray(animalTypes);
    if (farmCertificates != null) farm.farmCertificates = parseArray(farmCertificates);
    if (farmLocation     != null) farm.farmLocation     = parseJson(farmLocation, farm.farmLocation);
    if (workingHours     != null) farm.workingHours     = parseJson(workingHours, farm.workingHours);

    if (req.file) {
      // Remove old banner if exists
      if (farm.farmBanner) {
        const oldPath = path.join(__dirname, '../../', farm.farmBanner);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      farm.farmBanner = `/uploads/${req.file.filename}`;
    }

    await farm.save();
    res.json(farm);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/farms/:id  — soft-delete farm ─────────────────────────────────
exports.deleteFarm = async (req, res) => {
  try {
    const farm = await Farm.findOne({ _id: req.params.id, owner: req.user.id });
    if (!farm) return res.status(404).json({ message: 'Farm not found' });

    // Prevent deleting the last farm
    const count = await Farm.countDocuments({ owner: req.user.id, isActive: true });
    if (count <= 1) {
      return res.status(400).json({ message: 'Cannot delete your only farm' });
    }

    farm.isActive = false;
    await farm.save();
    res.json({ message: 'Farm deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/farms/migrate  — create default Farm for legacy seller data ──────
exports.migrateLegacyFarm = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'seller') {
      return res.status(400).json({ message: 'Seller only' });
    }

    const existing = await Farm.findOne({ owner: user._id });
    if (existing) return res.json({ message: 'Already migrated', farm: existing });

    const farm = await Farm.create({
      owner:            user._id,
      name:             user.farmName        || user.name,
      type:             'livestock',
      governorate:      user.governorate     || '',
      farmPhone:        user.farmPhone       || '',
      personalPhone:    user.personalPhone   || '',
      experience:       user.experience      || '',
      animalTypes:      user.animalTypes     || [],
      bio:              user.bio             || '',
      farmDescription:  user.farmDescription || '',
      farmBanner:       user.farmBanner      || null,
      farmLocation:     user.farmLocation    || null,
      farmCertificates: user.farmCertificates|| [],
      workingHours:     user.workingHours    || { days: [], from: '08:00', to: '17:00' },
      averageRating:    user.averageRating   || 0,
      ratingCount:      user.ratingCount     || 0,
    });

    res.status(201).json({ message: 'Default farm created', farm });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
}

function parseJson(val, fallback) {
  if (val == null) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}
