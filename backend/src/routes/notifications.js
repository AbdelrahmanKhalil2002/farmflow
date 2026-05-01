const router = require('express').Router();
const { param } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
} = require('../controllers/notificationController');

// All notification routes require authentication
router.use(protect);

router.get('/',             getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all',   markAllRead);
router.patch('/:id/read',   param('id').isMongoId(), markOneRead);

module.exports = router;
