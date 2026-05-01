const { validationResult } = require('express-validator');
const Order = require('../models/Order');
const Listing = require('../models/Listing');
const { createNotification } = require('../utils/notify');

// POST /api/orders
// Buyer places an order on an approved listing
const createOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { listingId, paymentType, depositAmount, notes, deliveryLocation } = req.body;

  try {
    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }
    if (listing.status !== 'approved') {
      return res.status(400).json({ message: 'Listing is not available for ordering' });
    }
    if (listing.seller.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot order your own listing' });
    }

    const existingOrder = await Order.findOne({
      buyer: req.user.id,
      listing: listing._id,
      status: { $in: ['pending', 'confirmed'] },
    });
    if (existingOrder) {
      return res.status(400).json({ message: 'You already have an active order for this listing' });
    }

    if (paymentType === 'deposit' && (!depositAmount || depositAmount <= 0)) {
      return res.status(400).json({ message: 'Deposit amount is required for deposit orders' });
    }
    if (paymentType === 'deposit' && depositAmount >= listing.price) {
      return res.status(400).json({ message: 'Deposit must be less than the total price' });
    }

    const order = await Order.create({
      buyer: req.user.id,
      seller: listing.seller,
      listing: listing._id,
      paymentType,
      depositAmount: paymentType === 'deposit' ? depositAmount : 0,
      totalAmount: listing.price,
      notes,
      deliveryLocation: (deliveryLocation?.lat != null && deliveryLocation?.lng != null)
        ? { lat: deliveryLocation.lat, lng: deliveryLocation.lng, address: deliveryLocation.address || '' }
        : undefined,
    });

    await order.populate([
      { path: 'listing', select: 'type breed price images deliveryType deliveryCost' },
      { path: 'seller', select: 'name phone' },
    ]);

    // Notify seller of new order
    createNotification(listing.seller, {
      type:    'new_order',
      title:   'طلب جديد',
      message: `لديك طلب جديد على إعلانك`,
      link:    '/seller/orders',
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/orders
// buyer: their own orders | seller: orders on their listings | admin: all
const getOrders = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'buyer') filter.buyer = req.user.id;
    else if (req.user.role === 'seller') filter.seller = req.user.id;
    // admin: no filter

    const orders = await Order.find(filter)
      .populate('listing', 'type breed price images deliveryType deliveryCost')
      .populate('buyer', 'name phone')
      .populate('seller', 'name phone')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('listing', 'type breed price images deliveryType deliveryCost')
      .populate('buyer', 'name phone')
      .populate('seller', 'name phone');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const { id, role } = req.user;
    // buyer/seller may be null if the user document was deleted
    const isBuyer = role === 'buyer' && order.buyer?._id?.toString() === id;
    const isSeller = role === 'seller' && order.seller?._id?.toString() === id;
    const isAdmin = role === 'admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid order ID' });
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/orders/:id/status
// Allowed transitions:
//   seller : pending → confirmed | pending/confirmed → cancelled
//   admin  : any → any
const updateOrderStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { status } = req.body;

  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const { id, role } = req.user;

    if (role === 'seller') {
      if (order.seller.toString() !== id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      const allowed = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['completed', 'cancelled'],
      };
      if (!allowed[order.status]?.includes(status)) {
        return res.status(400).json({
          message: `Cannot move order from '${order.status}' to '${status}'`,
        });
      }
    }

    order.status = status;
    await order.save();

    // Mark listing as sold when order is completed
    if (status === 'completed') {
      await Listing.findByIdAndUpdate(order.listing, { status: 'sold' });
    }

    await order.populate([
      { path: 'listing', select: 'type breed price' },
      { path: 'buyer', select: 'name phone' },
      { path: 'seller', select: 'name phone' },
    ]);

    // Notifications based on new status
    if (status === 'confirmed') {
      createNotification(order.buyer, {
        type: 'order_confirmed', title: 'تم تأكيد طلبك',
        message: 'قام البائع بتأكيد طلبك', link: '/buyer/orders',
      });
    } else if (status === 'cancelled') {
      createNotification(order.buyer, {
        type: 'order_cancelled', title: 'تم إلغاء الطلب',
        message: 'تم إلغاء طلبك', link: '/buyer/orders',
      });
    } else if (status === 'completed') {
      createNotification(order.buyer, {
        type: 'order_completed', title: 'اكتمل طلبك',
        message: 'تم تسليم طلبك بنجاح', link: '/buyer/orders',
      });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/orders/:id/delivery — admin sets delivery cost and/or status
const setDelivery = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { deliveryCost, deliveryStatus } = req.body;
  const update = {};
  if (deliveryCost  !== undefined) update.deliveryCost  = deliveryCost;
  if (deliveryStatus !== undefined) update.deliveryStatus = deliveryStatus;

  try {
    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('listing', 'type breed price images deliveryType deliveryCost')
      .populate('buyer',  'name phone')
      .populate('seller', 'name phone');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createOrder, getOrders, getOrderById, updateOrderStatus, setDelivery };
