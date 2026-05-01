const { validationResult } = require('express-validator');
const DairyProduct = require('../models/DairyProduct');
const User         = require('../models/User');
const { createNotification } = require('../utils/notify');

// POST /api/dairy
const createDairy = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    const { name, type, quantity, unit, pricePerUnit, productionDate, expiryDate, description, deliveryAvailable, deliveryCost } = req.body;
    const product = await DairyProduct.create({
      seller: req.user.id,
      name, type, quantity, unit, pricePerUnit,
      productionDate: productionDate || undefined,
      expiryDate:     expiryDate     || undefined,
      description,
      images,
      deliveryAvailable: deliveryAvailable === 'true' || deliveryAvailable === true,
      deliveryCost: deliveryCost || undefined,
    });
    // Notify all admins of new pending dairy product
    User.find({ role: 'admin' }, '_id').then(admins => {
      admins.forEach(admin => createNotification(admin._id, {
        type:    'dairy_pending',
        title:   'منتج ألبان جديد للمراجعة',
        message: 'تم إرسال منتج ألبان جديد ويحتاج إلى مراجعة',
        link:    '/admin/dairy',
      }));
    }).catch(() => {});

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/dairy/my  — seller sees their own
const getMyDairy = async (req, res) => {
  try {
    const products = await DairyProduct.find({ seller: req.user.id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/dairy  — public: approved + available, optional ?sellerId=
const getApprovedDairy = async (req, res) => {
  try {
    const filter = { status: 'approved', available: true };
    if (req.query.sellerId) filter.seller = req.query.sellerId;
    const products = await DairyProduct.find(filter)
      .populate('seller', 'name farmName governorate')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/dairy/:id
const getDairyById = async (req, res) => {
  try {
    const product = await DairyProduct.findById(req.params.id).populate('seller', 'name farmName governorate farmPhone');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const role = req.user?.role;
    if ((!role || role === 'buyer') && (product.status !== 'approved' || !product.available)) {
      return res.status(404).json({ message: 'Product not found' });
    }
    if (role === 'seller' && product.seller._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/dairy/:id
const updateDairy = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const product = await DairyProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (req.user.role === 'seller' && product.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { name, type, quantity, unit, pricePerUnit, productionDate, expiryDate, description, deliveryAvailable, deliveryCost, available } = req.body;
    const updates = { name, type, quantity, unit, pricePerUnit, productionDate, expiryDate, description, deliveryAvailable, deliveryCost, available };
    Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

    if (req.user.role === 'admin') {
      if (req.body.status)          updates.status          = req.body.status;
      if (req.body.rejectionReason) updates.rejectionReason = req.body.rejectionReason;
    } else {
      // seller editing resets to pending for re-review
      if (product.status === 'rejected') updates.status = 'pending';
    }

    const newImages = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    if (newImages.length > 0) updates.images = [...product.images, ...newImages];

    const updated = await DairyProduct.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/dairy/:id
const deleteDairy = async (req, res) => {
  try {
    const product = await DairyProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (req.user.role === 'seller' && product.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await product.deleteOne();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/dairy/:id/approve  — admin only
const adminApproveDairy = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be approved or rejected' });
    }
    const product = await DairyProduct.findByIdAndUpdate(
      req.params.id,
      { status, rejectionReason: status === 'rejected' ? rejectionReason : undefined },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Notify seller
    if (status === 'approved') {
      createNotification(product.seller, {
        type: 'dairy_approved', title: 'تمت الموافقة على منتجك',
        message: 'تمت الموافقة على منتجك اللبني', link: '/seller/dairy',
      });
    } else {
      createNotification(product.seller, {
        type: 'dairy_rejected', title: 'تم رفض منتجك',
        message: 'تم رفض منتجك اللبني من قبل المسؤول', link: '/seller/dairy',
      });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createDairy, getMyDairy, getApprovedDairy, getDairyById, updateDairy, deleteDairy, adminApproveDairy };
