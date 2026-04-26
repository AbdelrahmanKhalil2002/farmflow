const { validationResult } = require('express-validator');
const Listing = require('../models/Listing');

// POST /api/listings
const createListing = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const images = req.files ? req.files.map((f) => `/uploads/${f.filename}`) : [];

    // Destructure only safe fields — prevents status/seller injection
    const { type, breed, age, weight, price, description, location } = req.body;

    const listing = await Listing.create({
      type, breed, age, weight, price, description, location,
      seller: req.user.id,
      images,
    });

    res.status(201).json(listing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/listings
// - buyer / public : approved only
// - seller         : their own listings (all statuses)
// - admin          : everything
const getListings = async (req, res) => {
  try {
    let filter = {};

    if (!req.user) {
      filter.status = 'approved';
    } else if (req.user.role === 'buyer') {
      filter.status = 'approved';
    } else if (req.user.role === 'seller') {
      filter.seller = req.user.id;
    }
    // admin: no filter — sees all

    const listings = await Listing.find(filter)
      .populate('seller', 'name phone')
      .sort({ createdAt: -1 });

    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/listings/:id
const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('seller', 'name phone');

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
    const { type, breed, age, weight, price, description, location } = req.body;
    const updates = { type, breed, age, weight, price, description, location };

    // Strip undefined keys so partial updates don't overwrite with undefined
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    // Only admin can change status
    if (req.user.role === 'admin' && req.body.status) {
      updates.status = req.body.status;
    }

    const newImages = req.files ? req.files.map((f) => `/uploads/${f.filename}`) : [];
    if (newImages.length > 0) updates.images = [...listing.images, ...newImages];

    const updated = await Listing.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

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

module.exports = { createListing, getListings, getListingById, updateListing, deleteListing };
