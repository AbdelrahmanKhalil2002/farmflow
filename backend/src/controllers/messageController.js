const { validationResult } = require('express-validator');
const Conversation       = require('../models/Conversation');
const Message            = require('../models/Message');
const { createNotification } = require('../utils/notify');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const otherParticipant = (conv, myId) =>
  conv.participants.find(p => p._id.toString() !== myId.toString());

// ─── GET /api/messages  (inbox) ───────────────────────────────────────────────
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const convs = await Conversation.find({ participants: userId })
      .populate('participants', 'name farmName role')
      .sort({ updatedAt: -1 });

    const result = await Promise.all(
      convs.map(async (c) => {
        const unread = await Message.countDocuments({
          conversation: c._id,
          sender:       { $ne: userId },
          read:         false,
        });
        return { ...c.toObject(), unread };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/messages/unread-count ──────────────────────────────────────────
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const convIds = (
      await Conversation.find({ participants: userId }, '_id')
    ).map(c => c._id);

    const count = await Message.countDocuments({
      conversation: { $in: convIds },
      sender:       { $ne: userId },
      read:         false,
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/messages  (start or retrieve conversation) ────────────────────
const getOrCreate = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { recipientId, contextType = 'general', contextRefId = null, contextLabel = '' } = req.body;
  const myId = req.user._id;

  if (recipientId === myId.toString()) {
    return res.status(400).json({ message: 'Cannot message yourself' });
  }

  try {
    // Find an existing conversation between these two users
    let conv = await Conversation.findOne({
      participants: { $all: [myId, recipientId], $size: 2 },
    }).populate('participants', 'name farmName role');

    if (!conv) {
      conv = await Conversation.create({
        participants: [myId, recipientId],
        context: { type: contextType, refId: contextRefId, label: contextLabel },
      });
      conv = await Conversation.findById(conv._id).populate('participants', 'name farmName role');
    }

    res.json(conv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/messages/:id  (thread) ─────────────────────────────────────────
const getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const conv   = await Conversation.findById(req.params.id);

    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    if (!conv.participants.some(p => p.toString() === userId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 50);
    const skip  = (page - 1) * limit;

    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'name farmName role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/messages/:id  (send) ──────────────────────────────────────────
const sendMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const userId = req.user._id;
    const conv   = await Conversation.findById(req.params.id);

    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    if (!conv.participants.some(p => p.toString() === userId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { type = 'text', offerAmount } = req.body;

    // For offer messages, body can be auto-generated
    const bodyText = req.body.body?.trim()
      || (type === 'offer' ? `🤝 عرض سعر: ${Number(offerAmount).toLocaleString()} ج.م` : '');
    if (!bodyText) return res.status(400).json({ message: 'Message body is required' });

    const msgData = {
      conversation: conv._id,
      sender:       userId,
      body:         bodyText,
      type,
    };
    if (type === 'offer' && offerAmount) {
      msgData.offerAmount = Number(offerAmount);
      msgData.offerStatus = 'pending';
    }

    const msg = await Message.create(msgData);

    // Denormalize last message onto conversation + bump updatedAt
    conv.lastMessage = { body: msg.body, sender: userId, at: msg.createdAt };
    await conv.save();

    const populated = await msg.populate('sender', 'name farmName role');

    // Notify the recipient (fire-and-forget)
    const recipientId = conv.participants.find(p => p.toString() !== userId.toString());
    const notifBody = type === 'offer'
      ? `عرض سعر: ${Number(offerAmount).toLocaleString()} ج.م`
      : (msg.body.length > 80 ? msg.body.slice(0, 80) + '…' : msg.body);
    createNotification(recipientId, {
      type:    'new_message',
      title:   `رسالة جديدة من ${req.user.name}`,
      message: notifBody,
      link:    null,
    });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PATCH /api/messages/:convId/offers/:msgId  (respond to offer) ────────────
const respondToOffer = async (req, res) => {
  try {
    const userId = req.user._id;
    const { convId, msgId } = req.params;
    const { action, counterAmount } = req.body; // action: 'accepted'|'rejected'|'countered'

    const conv = await Conversation.findById(convId);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    if (!conv.participants.some(p => p.toString() === userId.toString()))
      return res.status(403).json({ message: 'Access denied' });

    const offerMsg = await Message.findById(msgId);
    if (!offerMsg || offerMsg.type !== 'offer')
      return res.status(404).json({ message: 'Offer message not found' });
    if (offerMsg.conversation.toString() !== convId)
      return res.status(400).json({ message: 'Message does not belong to this conversation' });
    if (offerMsg.offerStatus !== 'pending')
      return res.status(400).json({ message: 'Offer is no longer pending' });
    // Only the receiver of the offer can respond
    if (offerMsg.sender.toString() === userId.toString())
      return res.status(403).json({ message: 'You cannot respond to your own offer' });

    offerMsg.offerStatus = action; // 'accepted' | 'rejected' | 'countered'
    await offerMsg.save();

    let counterMsg = null;
    if (action === 'countered' && counterAmount) {
      // Create a counter-offer message from the responder
      const cBody = `🤝 عرض مضاد: ${Number(counterAmount).toLocaleString()} ج.م`;
      counterMsg = await Message.create({
        conversation: conv._id,
        sender:       userId,
        body:         cBody,
        type:         'offer',
        offerAmount:  Number(counterAmount),
        offerStatus:  'pending',
      });
      conv.lastMessage = { body: cBody, sender: userId, at: counterMsg.createdAt };
      await conv.save();
      await counterMsg.populate('sender', 'name farmName role');
    }

    const populated = await offerMsg.populate('sender', 'name farmName role');
    res.json({ offer: populated, counter: counterMsg });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PATCH /api/messages/:id/read  (mark thread as read) ─────────────────────
const markRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const conv   = await Conversation.findById(req.params.id);

    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    if (!conv.participants.some(p => p.toString() === userId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Message.updateMany(
      { conversation: conv._id, sender: { $ne: userId }, read: false },
      { $set: { read: true } }
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getConversations, getUnreadCount, getOrCreate, getMessages, sendMessage, markRead, respondToOffer };
