require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initScheduler } = require('./src/scheduler');

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  initScheduler();
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  // Graceful shutdown — Render (and other PaaS) send SIGTERM before stopping the container.
  // Finish in-flight requests before closing, instead of hard-killing the process.
  process.on('SIGTERM', () => {
    console.log('SIGTERM received — shutting down gracefully');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});
