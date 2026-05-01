const router       = require('express').Router();
const User         = require('../models/User');
const Listing      = require('../models/Listing');
const DairyProduct = require('../models/DairyProduct');

// GET /api/sellers — public: all farms with at least one approved listing or dairy product
// Supports optional pagination: ?page=1&limit=20
// When page/limit are absent the full array is returned (backwards compat).
router.get('/', async (req, res) => {
  try {
    // Determine pagination intent
    const wantPage  = req.query.page  !== undefined;
    const wantLimit = req.query.limit !== undefined;
    const paginate  = wantPage || wantLimit;
    const page      = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit     = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    // Optional server-side filters sent by the Flutter client
    const searchQ   = (req.query.search      || '').trim().toLowerCase();
    const govFilter = (req.query.governorate  || '').trim();
    const typeFilter= (req.query.animalType   || '').trim();

    // Find all sellers who have at least 1 approved listing
    const sellersWithListings = await Listing.distinct('seller', { status: 'approved' });
    const sellersWithDairy    = await DairyProduct.distinct('seller', { status: 'approved', available: true });

    const sellerIds = [...new Set([
      ...sellersWithListings.map(id => id.toString()),
      ...sellersWithDairy.map(id => id.toString()),
    ])];

    // Build User.find query with optional filters
    const userQuery = { _id: { $in: sellerIds }, role: 'seller', isActive: true };
    if (govFilter)  userQuery.governorate = govFilter;
    if (searchQ) {
      userQuery.$or = [
        { farmName: { $regex: searchQ, $options: 'i' } },
        { name:     { $regex: searchQ, $options: 'i' } },
        { governorate: { $regex: searchQ, $options: 'i' } },
      ];
    }

    const projection = 'name farmName farmPhone governorate bio farmDescription farmBanner farmLocation farmCertificates animalTypes experience averageRating reviewCount createdAt workingHours';

    // Total count (needed for pagination metadata)
    const total = paginate ? await User.countDocuments(userQuery) : null;

    let sellersQuery = User.find(userQuery, projection).sort({ averageRating: -1 });
    if (paginate) {
      sellersQuery = sellersQuery.skip((page - 1) * limit).limit(limit);
    }
    const sellers = await sellersQuery;

    const mongoose = require('mongoose');
    // Use the IDs actually returned, not the full sellerIds list, for the aggregation
    const returnedIds = sellers.map(s => s._id);
    const objIds = returnedIds.map(id => new mongoose.Types.ObjectId(id.toString()));

    // Aggregate listing counts + types + newest listing date + price range per seller
    // (using the IDs of the page slice, not the full universe)
    const listingAgg = await Listing.aggregate([
      { $match: { status: 'approved', seller: { $in: objIds } } },
      { $group: {
        _id: '$seller',
        count:          { $sum: 1 },
        types:          { $addToSet: '$type' },
        newestAt:       { $max: '$createdAt' },
        minPricePerKg:  { $min: '$pricePerKg' },
        maxPricePerKg:  { $max: '$pricePerKg' },
      }},
    ]);
    const listingMap = Object.fromEntries(listingAgg.map(c => [c._id.toString(), {
      count: c.count, types: c.types, newestAt: c.newestAt,
      minPricePerKg: c.minPricePerKg, maxPricePerKg: c.maxPricePerKg,
    }]));

    // Aggregate dairy counts + types per seller (page slice only)
    const dairyAgg = await DairyProduct.aggregate([
      { $match: { status: 'approved', available: true, seller: { $in: objIds } } },
      { $group: { _id: '$seller', count: { $sum: 1 }, types: { $addToSet: '$type' } } },
    ]);
    const dairyMap = Object.fromEntries(dairyAgg.map(c => [c._id.toString(), { count: c.count, types: c.types }]));

    const result = sellers.map(s => {
      const sid = s._id.toString();
      return {
        ...s.toJSON(),
        listingCount:      listingMap[sid]?.count         || 0,
        listingTypes:      listingMap[sid]?.types         || [],
        newestListingAt:   listingMap[sid]?.newestAt      || null,
        minPricePerKg:     listingMap[sid]?.minPricePerKg || null,
        maxPricePerKg:     listingMap[sid]?.maxPricePerKg || null,
        dairyCount:        dairyMap[sid]?.count           || 0,
        dairyTypes:        dairyMap[sid]?.types           || [],
      };
    });

    // Filter by animalType if requested (post-aggregation, since types come from listing/dairy aggregates)
    const finalResult = typeFilter
      ? result.filter(s => {
          const types = new Set([...(s.animalTypes || []), ...(s.listingTypes || []), ...(s.dairyTypes || [])]);
          return types.has(typeFilter);
        })
      : result;

    if (paginate) {
      const pages   = Math.ceil(total / limit);
      const hasMore = page < pages;
      res.json({ items: finalResult, total, page, pages, hasMore });
    } else {
      res.json(finalResult);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/sellers/:id — public: farm profile + approved listings + approved dairy
router.get('/:id', async (req, res) => {
  try {
    const seller = await User.findOne(
      { _id: req.params.id, role: 'seller', isActive: true },
      'name farmName farmPhone governorate bio farmDescription farmBanner farmLocation farmCertificates animalTypes experience averageRating reviewCount createdAt workingHours'
    );
    if (!seller) return res.status(404).json({ message: 'Farm not found' });

    const [listings, dairy] = await Promise.all([
      Listing.find({ seller: req.params.id, status: 'approved' }).sort({ createdAt: -1 }),
      DairyProduct.find({ seller: req.params.id, status: 'approved', available: true }).sort({ createdAt: -1 }),
    ]);

    res.json({ seller, listings, dairy });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID' });
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
