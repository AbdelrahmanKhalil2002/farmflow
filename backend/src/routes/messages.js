const router = require('express').Router();
const { body, param } = require('express-validator');
const { protect }       = require('../middleware/auth');
const {
  getConversations,
  getUnreadCount,
  getOrCreate,
  getMessages,
  sendMessage,
  markRead,
  respondToOffer,
} = require('../controllers/messageController');

// All message routes require authentication
router.use(protect);

// GET  /api/messages              — inbox (all my conversations)
router.get('/', getConversations);

// GET  /api/messages/unread-count — total unread across all conversations
router.get('/unread-count', getUnreadCount);

// POST /api/messages              — start or retrieve a conversation
router.post(
  '/',
  [
    body('recipientId').isMongoId().withMessage('Invalid recipient ID'),
    body('contextType').optional().isIn(['listing', 'order', 'general']),
    body('contextRefId').optional().isMongoId(),
    body('contextLabel').optional().trim().isLength({ max: 120 }),
  ],
  getOrCreate
);

// GET  /api/messages/:id          — fetch messages in a conversation
router.get('/:id', param('id').isMongoId(), getMessages);

// POST /api/messages/:id          — send a message (or offer)
router.post(
  '/:id',
  [
    param('id').isMongoId(),
    body('body').optional().trim().isLength({ max: 1000 }),
    body('type').optional().isIn(['text', 'offer']),
    body('offerAmount').optional().isFloat({ min: 1 }).withMessage('Offer amount must be positive'),
  ],
  sendMessage
);

// PATCH /api/messages/:convId/offers/:msgId — accept/reject/counter an offer
router.patch(
  '/:convId/offers/:msgId',
  [
    param('convId').isMongoId(),
    param('msgId').isMongoId(),
    body('action').isIn(['accepted', 'rejected', 'countered']).withMessage('action must be accepted, rejected, or countered'),
    body('counterAmount').optional().isFloat({ min: 1 }),
  ],
  respondToOffer
);

// PATCH /api/messages/:id/read    — mark all messages in conversation as read
router.patch('/:id/read', param('id').isMongoId(), markRead);

module.exports = router;
