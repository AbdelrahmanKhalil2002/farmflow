const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    const user = await User.findById(decoded.id).select('_id role').lean();
    if (!user) {
      return res.status(401).json({ message: 'Account no longer exists' });
    }

    req.user = { id: user._id, role: user.role };
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

module.exports = { protect };
