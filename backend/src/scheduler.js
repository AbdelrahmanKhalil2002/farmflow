/**
 * scheduler.js — Daily cron jobs for date-based notifications.
 * Loaded from server.js AFTER the database connection is established.
 * All jobs run at 08:00 server time every day.
 * Each job groups results by seller and creates one summary notification per seller.
 */

const cron          = require('node-cron');
const Animal        = require('./models/Animal');
const DairyProduct  = require('./models/DairyProduct');
const MedicalRecord = require('./models/MedicalRecord');
const { createNotification } = require('./utils/notify');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a Date N days from now at end-of-day */
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 3600 * 1000);
const today       = ()  => new Date();

/**
 * Wraps a job function so errors are caught and logged but never crash the server.
 */
const safeJob = (name, fn) => async () => {
  console.log(`[cron] ${name} — running`);
  try {
    await fn();
    console.log(`[cron] ${name} — done`);
  } catch (err) {
    console.error(`[cron] ${name} — error: ${err.message}`);
  }
};

/**
 * Groups an array of documents by seller field (ObjectId).
 * Returns a plain object: { sellerId: [doc, ...] }
 */
const groupBySeller = (docs) =>
  docs.reduce((acc, doc) => {
    const sid = (doc.seller || doc.sellerId).toString();
    (acc[sid] = acc[sid] || []).push(doc);
    return acc;
  }, {});

// ─── Job 1: Vaccination reminders (≤ 3 days) ─────────────────────────────────
const vaccinationReminder = safeJob('vaccination-reminder', async () => {
  const deadline = daysFromNow(3);
  const now      = today();

  // Find active animals that have at least one vaccination due in the window
  const animals = await Animal.find({
    status: 'active',
    vaccinationLog: {
      $elemMatch: { nextDueDate: { $gte: now, $lte: deadline } },
    },
  }).lean();

  if (!animals.length) return;

  const bySeller = groupBySeller(animals);
  for (const [sellerId, items] of Object.entries(bySeller)) {
    await createNotification(sellerId, {
      type:    'vaccination_due',
      title:   '💉 تذكير: تطعيمات قادمة',
      message: `لديك ${items.length} ${items.length === 1 ? 'حيوان' : 'حيوانات'} بموعد تطعيم خلال 3 أيام.`,
      link:    '/seller/herd',
    });
  }
});

// ─── Job 2: Weighing reminders (≤ 1 day) ────────────────────────────────────
const weighingReminder = safeJob('weighing-reminder', async () => {
  const deadline = daysFromNow(1);

  const animals = await Animal.find({
    status: 'active',
    nextWeighingDate: { $lte: deadline },
  }).lean();

  if (!animals.length) return;

  const bySeller = groupBySeller(animals);
  for (const [sellerId, items] of Object.entries(bySeller)) {
    await createNotification(sellerId, {
      type:    'weighing_due',
      title:   '⚖️ تذكير: وزن القطيع',
      message: `موعد وزن ${items.length} ${items.length === 1 ? 'حيوان' : 'حيوانات'} اليوم أو غداً.`,
      link:    '/seller/herd',
    });
  }
});

// ─── Job 3: Pregnancy / birth reminders (≤ 7 days) ──────────────────────────
const pregnancyReminder = safeJob('pregnancy-reminder', async () => {
  const deadline = daysFromNow(7);
  const now      = today();

  const animals = await Animal.find({
    status:           'active',
    pregnancyStatus:  'pregnant',
    expectedBirthDate: { $gte: now, $lte: deadline },
  }).lean();

  if (!animals.length) return;

  const bySeller = groupBySeller(animals);
  for (const [sellerId, items] of Object.entries(bySeller)) {
    await createNotification(sellerId, {
      type:    'pregnancy_due',
      title:   '🐣 تذكير: ولادة قادمة',
      message: `${items.length} ${items.length === 1 ? 'حيوان حامل' : 'حيوانات حوامل'} موعد ولادتها خلال 7 أيام.`,
      link:    '/seller/herd',
    });
  }
});

// ─── Job 4: Dairy expiry reminders (≤ 3 days) ───────────────────────────────
const dairyExpiryReminder = safeJob('dairy-expiry-reminder', async () => {
  const deadline = daysFromNow(3);
  const now      = today();

  const products = await DairyProduct.find({
    status:     'approved',
    available:  true,
    expiryDate: { $gte: now, $lte: deadline },
  }).lean();

  if (!products.length) return;

  // DairyProduct uses 'seller' field directly
  const bySeller = groupBySeller(products);
  for (const [sellerId, items] of Object.entries(bySeller)) {
    const names = items.map(p => p.name).slice(0, 3).join('، ');
    const extra = items.length > 3 ? ` وغيرها` : '';
    await createNotification(sellerId, {
      type:    'dairy_expiry',
      title:   '🥛 تحذير: منتجات تقترب من انتهاء الصلاحية',
      message: `${names}${extra} تنتهي صلاحيتها خلال 3 أيام. تحقق من المخزون.`,
      link:    '/seller/dairy',
    });
  }
});

// ─── Job 5: Medical follow-up reminders (≤ 3 days) ──────────────────────────
const medicalFollowupReminder = safeJob('medical-followup-reminder', async () => {
  const deadline = daysFromNow(3);
  const now      = today();

  const records = await MedicalRecord.find({
    resolved:    { $ne: true },
    followUpDate: { $gte: now, $lte: deadline },
  }).lean();

  if (!records.length) return;

  const bySeller = groupBySeller(records);
  for (const [sellerId, items] of Object.entries(bySeller)) {
    await createNotification(sellerId, {
      type:    'medical_followup',
      title:   '🏥 تذكير: متابعات طبية',
      message: `لديك ${items.length} ${items.length === 1 ? 'متابعة طبية' : 'متابعات طبية'} خلال 3 أيام القادمة.`,
      link:    '/seller/herd',
    });
  }
});

// ─── Register cron schedules ──────────────────────────────────────────────────
/**
 * All jobs run daily at 08:00 AM server time.
 * Format: second(opt) minute hour day-of-month month day-of-week
 */
const initScheduler = () => {
  cron.schedule('0 8 * * *', vaccinationReminder,      { timezone: 'Africa/Cairo' });
  cron.schedule('0 8 * * *', weighingReminder,         { timezone: 'Africa/Cairo' });
  cron.schedule('0 8 * * *', pregnancyReminder,        { timezone: 'Africa/Cairo' });
  cron.schedule('0 8 * * *', dairyExpiryReminder,      { timezone: 'Africa/Cairo' });
  cron.schedule('0 8 * * *', medicalFollowupReminder,  { timezone: 'Africa/Cairo' });
  console.log('[scheduler] 5 daily cron jobs registered (08:00 Cairo)');
};

module.exports = { initScheduler };
