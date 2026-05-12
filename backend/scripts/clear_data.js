/**
 * Clears all platform data while preserving admin accounts.
 * Usage: node backend/scripts/clear_data.js  (run from project root)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MODELS = [
  '../src/models/Order',
  '../src/models/Listing',
  '../src/models/Review',
  '../src/models/Supply',
  '../src/models/Farm',
  '../src/models/Animal',
  '../src/models/MedicalRecord',
  '../src/models/DairyProduct',
  '../src/models/Expense',
  '../src/models/Income',
  '../src/models/Budget',
  '../src/models/Conversation',
  '../src/models/Message',
  '../src/models/Notification',
  '../src/models/WholesaleAccess',
  '../src/models/AppConfig',
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  // Delete all non-admin users
  const { deletedCount: usersDeleted } = await require('../src/models/User').deleteMany({ role: { $ne: 'admin' } });
  console.log(`✓ Users deleted (non-admin): ${usersDeleted}`);

  // Clear every other collection
  for (const path of MODELS) {
    try {
      const Model = require(path);
      const name  = Model.collection.collectionName;
      const { deletedCount } = await Model.deleteMany({});
      console.log(`✓ ${name}: ${deletedCount} deleted`);
    } catch (e) {
      console.warn(`  skipped ${path}: ${e.message}`);
    }
  }

  // Show remaining admins
  const admins = await require('../src/models/User').find({ role: 'admin' }).select('name email');
  console.log(`\nAdmin accounts kept (${admins.length}):`);
  admins.forEach(a => console.log(`  • ${a.name} — ${a.email}`));

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch(err => { console.error(err); process.exit(1); });
