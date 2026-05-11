/**
 * seed-animals-direct.js
 * Direct MongoDB seed — bypasses API rate limits.
 * Adds 100 cattle, 100 buffalo, 100 sheep, 100 goat, 100 camel
 * for the seller account khalilbido05@gmail.com
 *
 * Usage: node seed-animals-direct.js   (run from FarmFlow root)
 */

require('dotenv').config({ path: './backend/.env' });

const mongoose = require('./backend/node_modules/mongoose');
const { Schema, Types: { ObjectId } } = mongoose;

const MONGO_URI = process.env.MONGO_URI;
const SELLER_EMAIL = 'khalilbido05@gmail.com';

// ── Inline schemas (mirrors models exactly) ───────────────────────────────────
const weightEntrySchema = new Schema({
  date:     { type: Date, default: Date.now },
  weightKg: { type: Number, required: true },
  notes:    String,
});

const vaccinationEntrySchema = new Schema({
  vaccine:     { type: String, required: true },
  date:        { type: Date, default: Date.now },
  nextDueDate: Date,
  vet:         String,
  notes:       String,
});

const animalSchema = new Schema({
  seller:        { type: ObjectId, ref: 'User', required: true },
  farm:          { type: ObjectId, ref: 'Farm' },
  tagId:         String,
  type:          { type: String, required: true },
  breed:         String,
  gender:        { type: String, default: 'unknown' },
  dob:           Date,
  color:         String,
  currentWeight: Number,
  healthStatus:  { type: String, default: 'healthy' },
  status:        { type: String, default: 'active' },
  notes:         String,
  pregnancyStatus: { type: String, default: 'none' },
  pregnancyDate:   Date,
  expectedBirthDate: Date,
  birthCount:      { type: Number, default: 0 },
  targetWeight:    Number,
  nextWeighingDate: Date,
  weightLog:     { type: [weightEntrySchema], default: [] },
  vaccinationLog: { type: [vaccinationEntrySchema], default: [] },
  images:        { type: [String], default: [] },
}, { timestamps: true, collection: 'animals' });

animalSchema.index({ seller: 1, tagId: 1 }, { unique: true, sparse: true });

const Animal = mongoose.model('Animal', animalSchema);
const User   = mongoose.model('User', new Schema({ email: String, role: String }, { collection: 'users' }));

// ── Realistic images — real Wikimedia Commons URLs ───────────────────────────
// These are stored as URL strings, same as how uploaded images would be stored
// (the app normally stores '/uploads/filename', but for testing, URLs work too)
const IMAGES = {
  cattle: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Cow_female_black_white.jpg/640px-Cow_female_black_white.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Cattle_in_norway.jpg/640px-Cattle_in_norway.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/BeefMaster_bull.jpg/640px-BeefMaster_bull.jpg',
  ],
  buffalo: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Water_buffalo_large.jpg/640px-Water_buffalo_large.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Domestic_Water_Buffalo.jpg/640px-Domestic_Water_Buffalo.jpg',
  ],
  sheep: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Woolly_Sheep_Portrait.jpg/640px-Woolly_Sheep_Portrait.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Lamb_portrait.jpg/640px-Lamb_portrait.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Ovis_aries_%28Mouflon%29.jpg/640px-Ovis_aries_%28Mouflon%29.jpg',
  ],
  goat: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Hausziege_04.jpg/640px-Hausziege_04.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Domestic_goat_kid_in_capeweed.jpg/640px-Domestic_goat_kid_in_capeweed.jpg',
  ],
  camel: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Camelus_dromedarius_%28camel_in_Dubai%29.jpg/640px-Camelus_dromedarius_%28camel_in_Dubai%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Dromedary_Camel_%284477955702%29.jpg/640px-Dromedary_Camel_%284477955702%29.jpg',
  ],
};

// ── Livestock config ──────────────────────────────────────────────────────────
const CONFIG = {
  cattle: {
    breeds:  ['فريزيان', 'هولشتاين', 'براون سويس', 'بلدي مصري', 'سيمنتال', 'أبردين أنجوس'],
    colors:  ['أسود وأبيض', 'بني', 'أحمر وأبيض', 'بيج', 'رمادي'],
    minW: 280, maxW: 580, maxYears: 7,
    genders: ['female', 'female', 'female', 'male'],
    vaccines: ['تحصين الحمى القلاعية', 'تحصين الجمرة الخبيثة', 'تحصين اللمكوز', 'تحصين الطاعون البقري', 'تحصين الكلابيلا'],
  },
  buffalo: {
    breeds:  ['جاموس مصري', 'نيلي رافي', 'مرة', 'بلدي نيلي'],
    colors:  ['رمادي داكن', 'أسود', 'رمادي فحمي'],
    minW: 380, maxW: 680, maxYears: 8,
    genders: ['female', 'female', 'male'],
    vaccines: ['تحصين الحمى القلاعية', 'تحصين الجمرة الخبيثة', 'تحصين الطاعون البقري', 'تحصين البروسيلا'],
  },
  sheep: {
    breeds:  ['أوسيمي', 'بركاوي', 'رومانوف', 'دمياطي', 'رحماني', 'أوباسي', 'صحراوي'],
    colors:  ['أبيض', 'بني فاتح', 'أسود وأبيض', 'رمادي', 'بيج'],
    minW: 35, maxW: 95, maxYears: 5,
    genders: ['female', 'female', 'male'],
    vaccines: ['تحصين الجدري', 'تحصين اللسان الأزرق', 'تحصين الطاعون الصغير', 'تحصين التسمم الدموي'],
  },
  goat: {
    breeds:  ['زرايبي', 'نوبي', 'بلدي مصري', 'شامي', 'الألبين', 'بوعر', 'سانين'],
    colors:  ['أبيض', 'بني', 'أسود', 'رقطاء', 'بني وأبيض', 'رمادي'],
    minW: 22, maxW: 58, maxYears: 6,
    genders: ['female', 'female', 'male'],
    vaccines: ['تحصين الجدري', 'تحصين الطاعون الصغير', 'تحصين اللسان الأزرق', 'تحصين الكلوستريديا'],
  },
  camel: {
    breeds:  ['عربي أصيل', 'سوداني', 'مغربي', 'صومالي', 'رقيبي', 'شعل'],
    colors:  ['بيج', 'بني فاتح', 'رملي', 'بني داكن', 'أبيض ناصع'],
    minW: 380, maxW: 720, maxYears: 12,
    genders: ['female', 'male', 'male'],
    vaccines: ['تحصين الجدري الجملي', 'تحصين الكوروناء الجملية', 'تحصين التهاب الكبد', 'تحصين الإنفلونزا'],
  },
};

const VETS = [
  'د. أحمد العطار', 'د. محمد السيد', 'د. علي حسن',
  'د. خالد عبد الله', 'د. سامي النجار', 'د. ياسر إبراهيم',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const pick = (arr) => arr[rand(0, arr.length - 1)];

function randDate(maxYears) {
  const ms = Date.now() - rand(1, maxYears * 365) * 24 * 3600 * 1000;
  return new Date(ms);
}

function randFutureDate(days) {
  return new Date(Date.now() + rand(60, days) * 24 * 3600 * 1000);
}

function buildAnimal(type, index, sellerId) {
  const cfg    = CONFIG[type];
  const weight = rand(cfg.minW, cfg.maxW);
  const gender = pick(cfg.genders);
  const dob    = randDate(cfg.maxYears);
  const imgs   = IMAGES[type];
  const typePrefix = type.slice(0, 3).toUpperCase();

  // 2 images per animal cycling through available ones
  const images = [
    imgs[index % imgs.length],
    imgs[(index + 1) % imgs.length],
  ];

  // Historical weight ~3 months ago
  const prevWeight = Math.max(cfg.minW * 0.7, weight - rand(15, 50));
  const olderWeight = Math.max(cfg.minW * 0.5, prevWeight - rand(10, 30));

  // 1-3 vaccinations
  const numVacs = rand(1, 3);
  const vaccinationLog = [];
  for (let v = 0; v < numVacs; v++) {
    vaccinationLog.push({
      vaccine:     pick(cfg.vaccines),
      date:        randDate(2),
      nextDueDate: randFutureDate(365),
      vet:         pick(VETS),
      notes:       v === 0 ? 'جرعة دورية — حالة جيدة' : undefined,
    });
  }

  // Pregnancy for some females
  let pregnancyStatus = 'none';
  let pregnancyDate, expectedBirthDate;
  if (gender === 'female' && Math.random() > 0.65) {
    pregnancyStatus = 'pregnant';
    pregnancyDate = randDate(0.3);
    expectedBirthDate = new Date(Date.now() + rand(30, 180) * 24 * 3600 * 1000);
  }

  return {
    seller: sellerId,
    tagId:  `${typePrefix}-${String(index + 1).padStart(3, '0')}`,
    type,
    breed:  pick(cfg.breeds),
    gender,
    color:  pick(cfg.colors),
    dob,
    currentWeight: weight,
    healthStatus: Math.random() > 0.04 ? 'healthy' : 'sick',
    status: 'active',
    notes: gender === 'female' && pregnancyStatus === 'pregnant'
      ? 'تحت المراقبة خلال فترة الحمل'
      : Math.random() > 0.7 ? 'حيوان منتج بصحة ممتازة' : undefined,
    pregnancyStatus,
    pregnancyDate: pregnancyDate || undefined,
    expectedBirthDate: expectedBirthDate || undefined,
    birthCount: gender === 'female' ? rand(0, 4) : 0,
    targetWeight: Math.random() > 0.5 ? weight + rand(20, 80) : undefined,
    nextWeighingDate: randFutureDate(30),
    weightLog: [
      { date: new Date(Date.now() - rand(80, 120) * 24 * 3600 * 1000), weightKg: olderWeight },
      { date: new Date(Date.now() - rand(30, 60)  * 24 * 3600 * 1000), weightKg: prevWeight },
      { date: new Date(), weightKg: weight },
    ],
    vaccinationLog,
    images,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('FarmFlow Direct MongoDB Seeder\n');
  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB\n');

  // Find seller by email
  const seller = await User.findOne({ email: SELLER_EMAIL });
  if (!seller) throw new Error(`Seller not found: ${SELLER_EMAIL}`);
  console.log(`✓ Found seller: ${seller._id}\n`);

  const TYPES = ['cattle', 'buffalo', 'sheep', 'goat', 'camel'];
  const TYPE_AR = { cattle: 'بقرة', buffalo: 'جاموسة', sheep: 'خروف', goat: 'ماعز', camel: 'جمل' };

  let total = 0;

  for (const type of TYPES) {
    console.log(`── Seeding 100 ${TYPE_AR[type]} (${type})…`);
    const docs = [];
    for (let i = 0; i < 100; i++) {
      docs.push(buildAnimal(type, i, seller._id));
    }
    try {
      const result = await Animal.insertMany(docs, { ordered: false });
      total += result.length;
      console.log(`  ✓ ${result.length} inserted (total: ${total})`);
    } catch (err) {
      // ordered:false — some may succeed even if others fail (e.g. duplicate tagId)
      const inserted = err.insertedDocs?.length || (err.result?.nInserted ?? 0);
      total += inserted;
      console.log(`  ⚠ ${inserted} inserted, some skipped: ${err.message?.slice(0, 100)}`);
    }
  }

  console.log(`\n══════════════════════════════════`);
  console.log(`✓ Done: ${total} animals seeded for ${SELLER_EMAIL}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
