const { validationResult } = require('express-validator');
const Listing = require('../models/Listing');
const Animal  = require('../models/Animal');
const User    = require('../models/User');
const { createNotification } = require('../utils/notify');

const LISTING_OVER_HERD_LIMIT = 100;

// POST /api/listings
const createListing = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const images = req.files ? req.files.map((f) => `/uploads/${f.filename}`) : [];

    // Destructure only safe fields — prevents status/seller injection
    const { type, breed, age, weight, price, pricePerKg, description, location, deliveryType, deliveryCost, eidAvailable, slaughterService, slaughterCost, qurbaniShares, depositRequired, depositPercentage, animal, purpose, farmId } = req.body;

    // Guard: active listings must not exceed herd size + 100
    const [activeListings, herdCount] = await Promise.all([
      Listing.countDocuments({ seller: req.user.id, status: { $in: ['pending', 'approved', 'draft'] } }),
      Animal.countDocuments({ seller: req.user.id }),
    ]);
    if (activeListings >= herdCount + LISTING_OVER_HERD_LIMIT) {
      return res.status(400).json({
        message: `لا يمكن إضافة إعلانات أكثر من حجم القطيع بـ ${LISTING_OVER_HERD_LIMIT} إعلان. عدد الحيوانات: ${herdCount}، الإعلانات النشطة: ${activeListings}.`,
      });
    }

    // Guard: one active listing per animal
    if (animal) {
      const existing = await Listing.findOne({
        seller: req.user.id,
        animal,
        status: { $in: ['pending', 'approved', 'draft'] },
      });
      if (existing) {
        return res.status(409).json({ message: 'هذا الحيوان معروض للبيع بالفعل' });
      }
    }

    let parsedQurbaniShares = [];
    if (qurbaniShares) {
      try { parsedQurbaniShares = JSON.parse(qurbaniShares); } catch {}
    }

    const saveDraft = req.body.status === 'draft';

    const listing = await Listing.create({
      type, breed, age, weight, price, pricePerKg, description, location,
      purpose: purpose || 'general',
      deliveryType: deliveryType || 'none',
      deliveryCost: deliveryCost || undefined,
      eidAvailable:     eidAvailable === 'true' || eidAvailable === true || false,
      slaughterService: slaughterService === 'true' || slaughterService === true || false,
      slaughterCost:    slaughterCost || undefined,
      qurbaniShares:    parsedQurbaniShares,
      depositRequired:  depositRequired === 'true' || depositRequired === true || false,
      depositPercentage: depositPercentage || undefined,
      seller: req.user.id,
      animal: animal || null,
      farm:   farmId || undefined,
      images,
      status: saveDraft ? 'draft' : 'pending',
    });

    // Only notify admins for listings going to review (not drafts)
    if (!saveDraft) {
      User.find({ role: 'admin' }, '_id').then(admins => {
        admins.forEach(admin => createNotification(admin._id, {
          type:    'listing_pending',
          title:   'إعلان جديد للمراجعة',
          message: 'تم إرسال إعلان ماشية جديد ويحتاج إلى مراجعة',
          link:    '/admin/listings',
        }));
      }).catch(() => {});
    }

    res.status(201).json(listing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/listings
// - buyer / public : approved only; supports ?type, ?minPrice, ?maxPrice, ?minWeight, ?maxWeight, ?location, ?delivery=true, ?q, ?sort
// - seller         : their own listings (all statuses)
// - admin          : everything
// Supports optional ?page=1&limit=20 for pagination; returns all if omitted.
const getListings = async (req, res) => {
  try {
    let filter = {};

    if (!req.user) {
      filter.status = 'approved';
    } else if (req.user.role === 'buyer') {
      filter.status = 'approved';
    } else if (req.user.role === 'seller') {
      filter.seller = req.user.id;
      if (req.query.farmId) filter.farm = req.query.farmId;
    }
    // admin: no filter — sees all

    // Search/filter params — applied for buyer/public requests only
    const role = req.user?.role;
    if (!role || role === 'buyer') {
      const { type, minPrice, maxPrice, minWeight, maxWeight, location, delivery, q } = req.query;

      if (type && type !== 'all')    filter.type = type;
      if (delivery === 'true')       filter.deliveryType = { $ne: 'none' };

      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
      }

      if (minWeight || maxWeight) {
        filter.weight = {};
        if (minWeight) filter.weight.$gte = Number(minWeight);
        if (maxWeight) filter.weight.$lte = Number(maxWeight);
      }

      if (location && location.trim()) {
        filter.location = { $regex: location.trim(), $options: 'i' };
      }

      if (q && q.trim()) {
        const re = { $regex: q.trim(), $options: 'i' };
        filter.$or = [{ breed: re }, { description: re }];
      }
    }

    const SORTS = {
      price_asc:  { price:  1 },
      price_desc: { price: -1 },
      newest:     { createdAt: -1 },
    };
    const sort = SORTS[req.query.sort] || { createdAt: -1 };

    const { page, limit } = req.query;
    if (page && limit) {
      const p = Math.max(1, parseInt(page, 10));
      const l = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const [items, total] = await Promise.all([
        Listing.find(filter).populate('seller', 'name farmName governorate phone').populate('animal', 'tagId').sort(sort).skip((p - 1) * l).limit(l),
        Listing.countDocuments(filter),
      ]);
      return res.json({ items, total, page: p, pages: Math.ceil(total / l), hasMore: p * l < total });
    }

    const listings = await Listing.find(filter)
      .populate('seller', 'name farmName governorate phone')
      .populate('animal', 'tagId')
      .sort(sort);

    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/listings/:id
const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('seller', 'name phone').populate('animal', 'tagId');

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Buyers can only see approved listings
    const role = req.user?.role;
    if ((!role || role === 'buyer') && listing.status !== 'approved') {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Sellers can only see their own listings
    if (role === 'seller' && listing.seller._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(listing);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid listing ID' });
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/listings/:id
const updateListing = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    // Sellers can only update their own listings
    if (req.user.role === 'seller' && listing.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Whitelist updatable fields — prevents seller/status injection
    const { type, breed, age, weight, price, pricePerKg, description, location, deliveryType, deliveryCost, eidAvailable, slaughterService, slaughterCost, qurbaniShares, depositRequired, depositPercentage, purpose } = req.body;
    const updates = { type, breed, age, weight, price, pricePerKg, description, location, deliveryType, deliveryCost, eidAvailable, slaughterService, slaughterCost, depositRequired, depositPercentage, purpose };
    if (qurbaniShares !== undefined) {
      try { updates.qurbaniShares = JSON.parse(qurbaniShares); } catch { updates.qurbaniShares = []; }
    }

    // Strip undefined keys so partial updates don't overwrite with undefined
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    // Seller can publish their own draft (draft → pending)
    if (req.user.role === 'seller' && req.body.status === 'pending' && listing.status === 'draft') {
      updates.status = 'pending';
      // Notify admins now that the listing is going to review
      User.find({ role: 'admin' }, '_id').then(admins => {
        admins.forEach(admin => createNotification(admin._id, {
          type: 'listing_pending', title: 'إعلان جديد للمراجعة',
          message: 'تم إرسال إعلان ماشية جديد ويحتاج إلى مراجعة', link: '/admin/listings',
        }));
      }).catch(() => {});
    }

    // Only admin can change to other statuses
    if (req.user.role === 'admin' && req.body.status) {
      updates.status = req.body.status;
    }

    const newImages = req.files ? req.files.map((f) => `/uploads/${f.filename}`) : [];
    if (req.body.keepImages !== undefined) {
      // Explicit image management: caller specifies which existing images to retain
      let baseImages = listing.images;
      try { baseImages = JSON.parse(req.body.keepImages); } catch {}
      updates.images = [...baseImages, ...newImages];
    } else if (newImages.length > 0) {
      updates.images = [...listing.images, ...newImages];
    }

    const updated = await Listing.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    // Notify seller when admin approves or rejects
    if (req.user.role === 'admin' && updates.status) {
      const sellerId = updated.seller?._id || updated.seller;
      if (updates.status === 'approved') {
        createNotification(sellerId, {
          type: 'listing_approved', title: 'تمت الموافقة على إعلانك',
          message: 'تمت الموافقة على إعلانك ويمكن للمشترين رؤيته الآن', link: '/seller/listings',
        });
      } else if (updates.status === 'rejected') {
        createNotification(sellerId, {
          type: 'listing_rejected', title: 'تم رفض إعلانك',
          message: 'تم رفض إعلانك من قبل المسؤول', link: '/seller/listings',
        });
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/listings/:id
const deleteListing = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (req.user.role === 'seller' && listing.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await listing.deleteOne();
    res.status(204).send();
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid listing ID' });
    res.status(500).json({ message: err.message });
  }
};

// GET /api/listings/my/listed-animal-ids
// Returns array of animal IDs that have an active (pending/approved/draft) listing for this seller
const getListedAnimalIds = async (req, res) => {
  try {
    const docs = await Listing.find(
      { seller: req.user.id, animal: { $ne: null }, status: { $in: ['pending', 'approved', 'draft'] } },
      'animal'
    ).lean();
    res.json(docs.map(d => d.animal.toString()));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createListing, getListings, getListingById, updateListing, deleteListing, getListedAnimalIds };
