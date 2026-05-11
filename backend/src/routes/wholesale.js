const router = require('express').Router();
const crypto = require('crypto');
const { protect }        = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');
const WholesaleAccess    = require('../models/WholesaleAccess');
const Farm               = require('../models/Farm');
const { createNotification } = require('../utils/notify');

const genCode = () => crypto.randomBytes(3).toString('hex').toUpperCase(); // 6-char hex, e.g. "A3F7B2"

// POST /generate-code — seller generates/refreshes wholesale code for their farm
router.post('/generate-code', protect, authorizeRoles('seller'), async (req, res) => {
  try {
    const farm = await Farm.findOne({ _id: req.body.farmId, owner: req.user.id });
    if (!farm) return res.status(404).json({ message: 'المزرعة غير موجودة' });
    farm.wholesaleCode = genCode();
    await farm.save();
    res.json({ code: farm.wholesaleCode });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /enter-code — buyer enters code → instant approved access
router.post('/enter-code', protect, authorizeRoles('buyer'), async (req, res) => {
  try {
    const { code } = req.body;
    if (!code?.trim()) return res.status(400).json({ message: 'أدخل الكود' });

    const farm = await Farm.findOne({ wholesaleCode: code.trim().toUpperCase() }).populate('owner', '_id name');
    if (!farm) return res.status(404).json({ message: 'الكود غير صحيح' });

    const sellerId = farm.owner._id;

    await WholesaleAccess.findOneAndUpdate(
      { seller: sellerId, buyer: req.user.id },
      { status: 'approved' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    createNotification(sellerId, {
      type:    'general',
      title:   'تاجر جديد انضم بكود الجملة',
      message: 'تاجر جديد حصل على وصول لأسعار الجملة',
      link:    '/seller/supplies',
    });

    res.json({ sellerId, sellerName: farm.owner.name, status: 'approved' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /request — buyer requests wholesale access for a seller
router.post('/request', protect, authorizeRoles('buyer'), async (req, res) => {
  try {
    const { sellerId } = req.body;
    if (!sellerId) return res.status(400).json({ message: 'sellerId مطلوب' });

    const existing = await WholesaleAccess.findOne({ seller: sellerId, buyer: req.user.id });

    if (existing && existing.status !== 'rejected') return res.json(existing);

    if (existing && existing.status === 'rejected') {
      existing.status = 'pending';
      await existing.save();
      createNotification(sellerId, {
        type: 'general', title: 'طلب وصول بالجملة (جديد)',
        message: 'تاجر أعاد طلب الوصول لأسعار الجملة', link: '/seller/supplies',
      });
      return res.json(existing);
    }

    const access = await WholesaleAccess.create({ seller: sellerId, buyer: req.user.id, status: 'pending' });

    createNotification(sellerId, {
      type: 'general', title: 'طلب وصول بالجملة',
      message: 'تاجر جديد يطلب الوصول لأسعار الجملة', link: '/seller/supplies',
    });

    res.status(201).json(access);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /requests — seller views all their wholesale access requests
router.get('/requests', protect, authorizeRoles('seller'), async (req, res) => {
  try {
    const requests = await WholesaleAccess.find({ seller: req.user.id })
      .populate('buyer', 'name phone')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /requests/:id — seller approves or rejects a request
router.patch('/requests/:id', protect, authorizeRoles('seller'), async (req, res) => {
  try {
    const access = await WholesaleAccess.findOne({ _id: req.params.id, seller: req.user.id });
    if (!access) return res.status(404).json({ message: 'الطلب غير موجود' });

    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'قيمة غير صالحة' });

    access.status = status;
    await access.save();

    createNotification(access.buyer, {
      type:    'general',
      title:   status === 'approved' ? 'تمت الموافقة على وصولك للجملة' : 'تم رفض طلب الجملة',
      message: status === 'approved'
        ? 'تمت الموافقة على وصولك لأسعار الجملة — يمكنك الآن رؤية أسعار الجملة'
        : 'تم رفض طلبك للوصول لأسعار الجملة',
      link: '/buyer/supplies',
    });

    res.json(access);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /check/:sellerId — buyer checks their access status for a seller
router.get('/check/:sellerId', protect, authorizeRoles('buyer'), async (req, res) => {
  try {
    const access = await WholesaleAccess.findOne({ seller: req.params.sellerId, buyer: req.user.id });
    res.json({ status: access?.status || 'none' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
