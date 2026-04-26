/**
 * seed.js — create three test users (admin, seller, buyer) in a fresh DB.
 *
 * Usage:
 *   node seed.js           # creates users, skips any that already exist
 *   node seed.js --reset   # drops ALL data first, then seeds
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./src/models/User');

const SEED_USERS = [
  { name: 'Admin',       email: 'admin@farmflow.com',  password: 'admin123',  role: 'admin'  },
  { name: 'Test Seller', email: 'seller@farmflow.com', password: 'seller123', role: 'seller' },
  { name: 'Test Buyer',  email: 'buyer@farmflow.com',  password: 'buyer123',  role: 'buyer'  },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  if (process.argv.includes('--reset')) {
    await mongoose.connection.dropDatabase();
    console.log('Database dropped.');
  }

  for (const u of SEED_USERS) {
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log(`  skip  ${u.email} (already exists)`);
      continue;
    }

    const hash = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, password: hash, isActive: true });
    console.log(`  created  ${u.role.padEnd(7)} ${u.email}  /  password: ${u.password}`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
};

run().catch((err) => { console.error(err); process.exit(1); });
