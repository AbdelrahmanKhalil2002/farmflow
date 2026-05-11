const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();

// Trust the first proxy (Nginx) so express-rate-limit reads the real client IP
// from X-Forwarded-For instead of the loopback address.
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// Rate limiting — tight on auth endpoints, generous on everything else
// Skipped entirely outside production so local testing isn't blocked
const skipInDev = () => process.env.NODE_ENV !== 'production';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skip: skipInDev,
  message: { message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  skip: skipInDev,
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS — allowed origins:
//   • Web dev:     http://localhost:5173 (Vite dev server)
//   • Web prod:    FRONTEND_URL env var (deployed domain)
//   • Desktop app: app://localhost (Electron production protocol)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'app://localhost',
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, same-origin server calls)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin "${origin}" not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API docs — available at /api/docs (disabled in production by default; set ENABLE_DOCS=true to expose)
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DOCS === 'true') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'FarmFlow API Docs',
    swaggerOptions: { persistAuthorization: true },
  }));
  app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));
}

// Routes (added incrementally)
app.use('/api/auth',    authLimiter, require('./routes/auth'));
app.use('/api',         apiLimiter);
app.use('/api/listings', require('./routes/listings'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/finance',  require('./routes/expenses'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/dairy',    require('./routes/dairy'));
app.use('/api/sellers',       require('./routes/sellers'));
app.use('/api/statements',   require('./routes/statements'));
app.use('/api/reviews',      require('./routes/reviews'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/favorites',    require('./routes/favorites'));
app.use('/api/market-prices', require('./routes/marketPrices'));
app.use('/api/eid',           require('./routes/eid'));
app.use('/api/animals',       require('./routes/animals'));
app.use('/api/supplies',      require('./routes/supplies'));
app.use('/api/wholesale',     require('./routes/wholesale'));
app.use('/api/budget',        require('./routes/budget'));
app.use('/api/messages',     require('./routes/messages'));
app.use('/api/farms',        require('./routes/farms'));

// Health check — available at both /health (Render default probe path) and /api/health
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

module.exports = app;
