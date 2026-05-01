const router   = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const multer   = require('multer');
const path     = require('path');
const { protect }       = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const Animal         = require('../models/Animal');
const MedicalRecord  = require('../models/MedicalRecord');
const Expense        = require('../models/Expense');
const { createNotification } = require('../utils/notify');

// ── Multer (animal photos) ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename:    (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

// All animal routes require seller auth
router.use(protect, authorizeRoles('seller', 'admin'));

const validate = (req, res, next) => {
  const e = validationResult(req);
  if (!e.isEmpty()) return res.status(400).json({ errors: e.array() });
  next();
};

// ── GET /api/animals ─────────────────────────────────────────────────────────
// Supports optional ?page=1&limit=20 for pagination; returns all if omitted.
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { seller: req.user.id };
    const { page, limit } = req.query;
    if (page && limit) {
      const p = Math.max(1, parseInt(page, 10));
      const l = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const [items, total] = await Promise.all([
        Animal.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
        Animal.countDocuments(filter),
      ]);
      return res.json({ items, total, page: p, pages: Math.ceil(total / l), hasMore: p * l < total });
    }
    const animals = await Animal.find(filter).sort({ createdAt: -1 });
    res.json(animals);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/animals/summary ─────────────────────────────────────────────────
// Returns herd stats: total by type, avg age, avg weight — used for dashboard strip
router.get('/summary', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { seller: req.user.id };
    const animals = await Animal.find({ ...filter, status: 'active' }, 'type dob currentWeight');

    const now = Date.now();
    const byType = {};
    let totalAgeMonths = 0, ageCount = 0, totalWeight = 0, weightCount = 0;

    animals.forEach(a => {
      byType[a.type] = (byType[a.type] || 0) + 1;
      if (a.dob) {
        totalAgeMonths += (now - new Date(a.dob).getTime()) / (30.44 * 24 * 3600 * 1000);
        ageCount++;
      }
      if (a.currentWeight) { totalWeight += a.currentWeight; weightCount++; }
    });

    res.json({
      total: animals.length,
      byType,
      avgAgeMonths: ageCount ? Math.round(totalAgeMonths / ageCount) : null,
      avgWeightKg:  weightCount ? Math.round((totalWeight / weightCount) * 10) / 10 : null,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/animals/follow-ups-due ──────────────────────────────────────────
// Returns unresolved MedicalRecords with followUpDate ≤ today + 7 days
router.get('/follow-ups-due', protect, async (req, res) => {
  try {
    const deadline = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const filter   = {
      resolved:       { $ne: true },
      followUpDate:   { $exists: true, $ne: null, $lte: deadline },
    };
    if (req.user.role !== 'admin') filter.seller = req.user.id;
    const records = await MedicalRecord.find(filter)
      .populate('animal', 'type breed tagId')
      .sort({ followUpDate: 1 })
      .limit(20);
    res.json(records);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/animals/weighing-due ─────────────────────────────────────────────
// Returns active animals where nextWeighingDate is within 7 days or overdue
router.get('/weighing-due', protect, async (req, res) => {
  try {
    const sellerId = req.user.role === 'admin' ? undefined : req.user.id;
    const filter = { status: 'active', nextWeighingDate: { $lte: new Date(Date.now() + 7 * 24 * 3600 * 1000) } };
    if (sellerId) filter.seller = sellerId;
    const animals = await Animal.find(filter, 'type breed tagId nextWeighingDate currentWeight targetWeight').sort({ nextWeighingDate: 1 }).limit(20);
    res.json(animals);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/animals ─────────────────────────────────────────────────────────
router.post(
  '/',
  upload.array('images', 4),
  [
    body('type').isIn(['cattle','buffalo','sheep','goat','camel','horse','poultry','rabbit','other']),
    body('gender').optional().isIn(['male','female','unknown']),
    body('healthStatus').optional().isIn(['healthy','sick','quarantine','deceased']),
    body('currentWeight').optional().isFloat({ min: 0 }),
    body('dob').optional().isISO8601(),
  ],
  validate,
  async (req, res) => {
    try {
      const { type, breed, gender, tagId, dob, color, currentWeight, healthStatus, notes } = req.body;
      const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
      const animal = await Animal.create({
        seller: req.user.id, type, breed, gender, tagId: tagId || undefined,
        dob: dob || undefined, color, currentWeight: currentWeight || undefined,
        healthStatus: healthStatus || 'healthy', notes, images,
        weightLog: currentWeight ? [{ date: dob || new Date(), weightKg: parseFloat(currentWeight) }] : [],
      });
      res.status(201).json(animal);
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: 'رقم الأذن مستخدم بالفعل لحيوان آخر' });
      res.status(500).json({ message: err.message });
    }
  }
);

// ── GET /api/animals/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found' });
    if (req.user.role === 'seller' && animal.seller.toString() !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });
    res.json(animal);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID' });
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/animals/:id ──────────────────────────────────────────────────────
router.put(
  '/:id',
  upload.array('images', 4),
  [
    body('type').optional().isIn(['cattle','buffalo','sheep','goat','camel','horse','poultry','rabbit','other']),
    body('gender').optional().isIn(['male','female','unknown']),
    body('healthStatus').optional().isIn(['healthy','sick','quarantine','deceased']),
    body('status').optional().isIn(['active','sold','deceased']),
    body('currentWeight').optional().isFloat({ min: 0 }),
    body('dob').optional().isISO8601(),
    body('pregnancyStatus').optional().isIn(['none','pregnant','recently_gave_birth']),
    body('birthCount').optional().isInt({ min: 0 }),
  ],
  validate,
  async (req, res) => {
    try {
      const animal = await Animal.findById(req.params.id);
      if (!animal) return res.status(404).json({ message: 'Animal not found' });
      if (req.user.role === 'seller' && animal.seller.toString() !== req.user.id)
        return res.status(403).json({ message: 'Access denied' });

      const fields = ['type','breed','gender','tagId','dob','color','currentWeight','healthStatus','status','notes',
        'pregnancyStatus','pregnancyDate','expectedBirthDate','nextWeighingDate'];
      fields.forEach(k => { if (req.body[k] !== undefined) animal[k] = req.body[k] || undefined; });
      // Numeric fields that can be 0, handle separately
      if (req.body.birthCount   !== undefined) animal.birthCount   = Number(req.body.birthCount)   || 0;
      if (req.body.targetWeight !== undefined) animal.targetWeight = Number(req.body.targetWeight) || undefined;

      // Handle images
      const newImages = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
      if (req.body.keepImages !== undefined) {
        let base = animal.images;
        try { base = JSON.parse(req.body.keepImages); } catch {}
        animal.images = [...base, ...newImages];
      } else if (newImages.length > 0) {
        animal.images = [...animal.images, ...newImages];
      }

      await animal.save();
      res.json(animal);
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: 'رقم الأذن مستخدم بالفعل لحيوان آخر' });
      res.status(500).json({ message: err.message });
    }
  }
);

// ── DELETE /api/animals/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found' });
    if (req.user.role === 'seller' && animal.seller.toString() !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });
    await animal.deleteOne();
    res.status(204).send();
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/animals/:id/weight ──────────────────────────────────────────────
router.post(
  '/:id/weight',
  [
    body('weightKg').isFloat({ min: 0.1 }).withMessage('أدخل وزنًا صحيحًا'),
    body('date').optional().isISO8601(),
  ],
  validate,
  async (req, res) => {
    try {
      const animal = await Animal.findById(req.params.id);
      if (!animal) return res.status(404).json({ message: 'Animal not found' });
      if (req.user.role === 'seller' && animal.seller.toString() !== req.user.id)
        return res.status(403).json({ message: 'Access denied' });

      const newWeight = parseFloat(req.body.weightKg);
      const entry = { weightKg: newWeight, date: req.body.date || new Date(), notes: req.body.notes };
      animal.weightLog.push(entry);
      // Update currentWeight to latest entry
      animal.currentWeight = newWeight;
      await animal.save();

      // 24.5 — weight milestone alert: notify seller when currentWeight ≥ targetWeight
      if (animal.targetWeight && newWeight >= animal.targetWeight) {
        const typeAr = { cattle: 'بقرة', buffalo: 'جاموس', sheep: 'خروف', goat: 'ماعز', camel: 'جمل', horse: 'حصان', poultry: 'دجاجة', rabbit: 'أرنب', other: 'حيوان' };
        const label = `${typeAr[animal.type] || animal.type}${animal.breed ? ` (${animal.breed})` : ''}${animal.tagId ? ` — رقم ${animal.tagId}` : ''}`;
        createNotification(animal.seller, {
          type:    'weight_milestone',
          title:   '🎯 بلغ الحيوان وزن الهدف!',
          message: `${label} وصل إلى ${newWeight} كجم (الهدف: ${animal.targetWeight} كجم). جاهز للبيع.`,
          link:    `/seller/herd/${animal._id}`,
        });
      }

      res.status(201).json(animal.weightLog[animal.weightLog.length - 1]);
    } catch (err) { res.status(500).json({ message: err.message }); }
  }
);

// ── DELETE /api/animals/:id/weight/:entryId ───────────────────────────────────
router.delete('/:id/weight/:entryId', async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found' });
    if (req.user.role === 'seller' && animal.seller.toString() !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });

    animal.weightLog = animal.weightLog.filter(e => e._id.toString() !== req.params.entryId);
    if (animal.weightLog.length > 0)
      animal.currentWeight = animal.weightLog[animal.weightLog.length - 1].weightKg;
    await animal.save();
    res.status(204).send();
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/animals/:id/vaccination ─────────────────────────────────────────
router.post(
  '/:id/vaccination',
  [
    body('vaccine').notEmpty().withMessage('أدخل اسم اللقاح'),
    body('date').optional().isISO8601(),
    body('nextDueDate').optional().isISO8601(),
  ],
  validate,
  async (req, res) => {
    try {
      const animal = await Animal.findById(req.params.id);
      if (!animal) return res.status(404).json({ message: 'Animal not found' });
      if (req.user.role === 'seller' && animal.seller.toString() !== req.user.id)
        return res.status(403).json({ message: 'Access denied' });

      const { vaccine, date, nextDueDate, vet, notes } = req.body;
      animal.vaccinationLog.push({ vaccine, date: date || new Date(), nextDueDate: nextDueDate || undefined, vet, notes });
      await animal.save();
      res.status(201).json(animal.vaccinationLog[animal.vaccinationLog.length - 1]);
    } catch (err) { res.status(500).json({ message: err.message }); }
  }
);

// ── DELETE /api/animals/:id/vaccination/:entryId ──────────────────────────────
router.delete('/:id/vaccination/:entryId', async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found' });
    if (req.user.role === 'seller' && animal.seller.toString() !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });

    animal.vaccinationLog = animal.vaccinationLog.filter(e => e._id.toString() !== req.params.entryId);
    await animal.save();
    res.status(204).send();
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/animals/:id/medical ─────────────────────────────────────────────
router.post('/:id/medical', protect, async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found' });
    if (req.user.role === 'seller' && animal.seller.toString() !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });

    const { date, diagnosis, treatment, medication, vet, cost, followUpDate, notes, resolved } = req.body;
    const record = await MedicalRecord.create({
      animal: req.params.id,
      seller: req.user.id,
      date: date || new Date(),
      diagnosis, treatment, medication, vet, notes,
      cost:        cost        ? Number(cost)  : undefined,
      followUpDate: followUpDate || undefined,
      resolved:    resolved === 'true' || resolved === true || false,
    });

    // 23.4 — auto-create doctor expense when a cost is recorded
    if (record.cost && record.cost > 0) {
      Expense.create({
        seller:   req.user.id,
        category: 'doctor',
        amount:   record.cost,
        date:     record.date || new Date(),
        note:     `سجل طبي: ${record.diagnosis || 'علاج بيطري'}${animal.tagId ? ` — ${animal.tagId}` : ''}`,
      }).catch(() => {}); // fire-and-forget — never fail the medical record
    }

    res.status(201).json(record);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/animals/:id/medical ──────────────────────────────────────────────
router.get('/:id/medical', protect, async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found' });
    if (req.user.role === 'seller' && animal.seller.toString() !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });

    const records = await MedicalRecord.find({ animal: req.params.id }).sort({ date: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PATCH /api/animals/:id/medical/:recordId ──────────────────────────────────
router.patch('/:id/medical/:recordId', protect, async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found' });
    if (req.user.role === 'seller' && animal.seller.toString() !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });

    const record = await MedicalRecord.findOneAndUpdate(
      { _id: req.params.recordId, animal: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE /api/animals/:id/medical/:recordId ─────────────────────────────────
router.delete('/:id/medical/:recordId', protect, async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Animal not found' });
    if (req.user.role === 'seller' && animal.seller.toString() !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });

    await MedicalRecord.findOneAndDelete({ _id: req.params.recordId, animal: req.params.id });
    res.status(204).send();
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
