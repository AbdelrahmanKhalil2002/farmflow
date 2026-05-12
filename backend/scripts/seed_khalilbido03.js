/**
 * Seed script — 2500 animals (500 × 5 types) for khalilbido03@gmail.com
 * Statuses: deceased, sick, quarantine, upcoming weighing,
 *           upcoming vaccination, medical follow-up, healthy
 *
 * Usage: node backend/scripts/seed_khalilbido03.js  (from project root)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose      = require('mongoose');
const User          = require('../src/models/User');
const Farm          = require('../src/models/Farm');
const Animal        = require('../src/models/Animal');
const MedicalRecord = require('../src/models/MedicalRecord');

const OWNER_EMAIL = 'khalilbido03@gmail.com';
const COUNT_EACH  = 500;

const TYPES = ['cattle', 'buffalo', 'sheep', 'goat', 'camel'];

const TYPE_AR = {
  cattle: 'بقر', buffalo: 'جاموس', sheep: 'ضأن', goat: 'ماعز', camel: 'إبل',
};

const BREEDS = {
  cattle:  ['بلدي', 'فريزيان', 'هولشتاين', 'أنجوس', 'سيمنتال'],
  buffalo: ['مصري', 'مري', 'نيلي-رافي'],
  sheep:   ['رحماني', 'سوهاجي', 'بلدي', 'برقي', 'عواسي'],
  goat:    ['بلدي', 'زريبي', 'نوبي', 'شامي'],
  camel:   ['مجاهيم', 'وضحاء', 'حُمُر', 'دروميدار'],
};

const COLORS = {
  cattle:  ['أبيض', 'أسود', 'بني', 'رمادي', 'أبلق'],
  buffalo: ['رمادي غامق', 'أسود', 'رمادي فاتح'],
  sheep:   ['أبيض', 'أسود', 'بني فاتح', 'رمادي'],
  goat:    ['أبيض', 'أسود', 'بني', 'محطط'],
  camel:   ['بيج', 'بني فاتح', 'رملي', 'أبيض'],
};

const VACCINES  = ['تحصين الحمى القلاعية', 'تحصين الجمرة الخبيثة', 'تحصين الطاعون البقري', 'تحصين البروسيلا', 'تحصين الكزاز'];
const DIAGNOSES = ['التهاب الجهاز التنفسي', 'إسهال حاد', 'طفيليات خارجية', 'التهاب الضرع', 'عدوى بكتيرية', 'حمى'];
const TREATMENTS= ['مضادات حيوية', 'مضادات طفيليات', 'محاليل وريدية', 'مراهم موضعية', 'أدوية مضادة للالتهاب'];

const rand    = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randDate= yearsAgo => new Date(Date.now() - Math.random() * yearsAgo * 365 * 24 * 3600 * 1000);
const daysFromNow = (min, max) => new Date(Date.now() + randInt(min, max) * 24 * 3600 * 1000);

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB\n');

  // ── Find owner ──────────────────────────────────────────────────────────────
  const owner = await User.findOne({ email: OWNER_EMAIL });
  if (!owner) throw new Error(`User not found: ${OWNER_EMAIL}`);
  console.log(`✓ Owner: ${owner.name} (${owner._id})`);

  // ── Find or use first farm ──────────────────────────────────────────────────
  let farm = await Farm.findOne({ owner: owner._id });
  if (!farm) {
    farm = await Farm.create({
      owner: owner._id,
      name: 'مزرعة المواشي',
      type: 'livestock',
      governorate: 'القاهرة',
      animalTypes: TYPES,
    });
    console.log(`✓ Created farm: ${farm.name}`);
  } else {
    console.log(`✓ Farm: ${farm.name} (${farm._id})`);
  }

  // ── Clear existing animals & medical records ────────────────────────────────
  const del = await Animal.deleteMany({ farm: farm._id });
  await MedicalRecord.deleteMany({ seller: owner._id });
  console.log(`✓ Cleared ${del.deletedCount} existing animals\n`);

  // ── Build animal documents ──────────────────────────────────────────────────
  const docs = [];
  let idx = 1;

  for (const type of TYPES) {
    for (let i = 0; i < COUNT_EACH; i++) {
      const gender = i % 2 === 0 ? 'female' : 'male';
      const weightKg =
        type === 'cattle'  ? randInt(180, 600) :
        type === 'buffalo' ? randInt(200, 650) :
        type === 'sheep'   ? randInt(25,  90)  :
        type === 'camel'   ? randInt(300, 700) :
                             randInt(20,  70);

      docs.push({
        seller:        owner._id,
        farm:          farm._id,
        tagId:         `${TYPE_AR[type]}-${String(idx).padStart(5, '0')}`,
        type,
        breed:         rand(BREEDS[type]),
        gender,
        color:         rand(COLORS[type]),
        dob:           randDate(5),
        currentWeight: weightKg,
        healthStatus:  'healthy',
        status:        'active',
        weightLog:     [{ date: new Date(), weightKg, notes: 'وزن أولي' }],
      });
      idx++;
    }
  }

  // ── Insert all animals ─────────────────────────────────────────────────────
  console.log(`Inserting ${docs.length} animals…`);
  const inserted = await Animal.insertMany(docs, { ordered: true });
  console.log(`✓ Inserted ${inserted.length} animals\n`);

  const shuffled = shuffle([...inserted]);

  // ── Slice buckets (non-overlapping) ────────────────────────────────────────
  //  0  – 299  → deceased   (300)
  // 300 – 499  → quarantine (200)
  // 500 – 699  → sick       (200)
  // 700 – 1199 → وزن قريب   (500)
  // 1200– 1699 → تطعيم قريب (500)
  // 1700– 1999 → متابعة طبية(300)
  // 2000– 2499 → healthy    (500) — unchanged

  const deceased   = shuffled.slice(0,   300);
  const quarantine = shuffled.slice(300, 500);
  const sick       = shuffled.slice(500, 700);
  const weighing   = shuffled.slice(700, 1200);
  const vaccin     = shuffled.slice(1200, 1700);
  const medFU      = shuffled.slice(1700, 2000);

  // deceased
  await Animal.bulkWrite(deceased.map(a => ({
    updateOne: {
      filter: { _id: a._id },
      update: { $set: { healthStatus: 'deceased', status: 'deceased' } },
    },
  })));
  console.log(`✓ متوفي       : ${deceased.length}`);

  // quarantine
  await Animal.bulkWrite(quarantine.map(a => ({
    updateOne: {
      filter: { _id: a._id },
      update: { $set: { healthStatus: 'quarantine' } },
    },
  })));
  console.log(`✓ حجر صحي     : ${quarantine.length}`);

  // sick
  await Animal.bulkWrite(sick.map(a => ({
    updateOne: {
      filter: { _id: a._id },
      update: { $set: { healthStatus: 'sick' } },
    },
  })));
  console.log(`✓ مريض        : ${sick.length}`);

  // upcoming weighing
  await Animal.bulkWrite(weighing.map(a => ({
    updateOne: {
      filter: { _id: a._id },
      update: { $set: { nextWeighingDate: daysFromNow(0, 6) } },
    },
  })));
  console.log(`✓ وزن قريب    : ${weighing.length}`);

  // upcoming vaccination
  await Animal.bulkWrite(vaccin.map(a => ({
    updateOne: {
      filter: { _id: a._id },
      update: {
        $push: {
          vaccinationLog: {
            vaccine:     rand(VACCINES),
            date:        randDate(0.3),
            nextDueDate: daysFromNow(1, 7),
            vet:         'د. محمد السيد',
            notes:       'تحصين دوري',
          },
        },
      },
    },
  })));
  console.log(`✓ تطعيم قريب  : ${vaccin.length}`);

  // medical follow-up
  const medDocs = medFU.map(a => ({
    animal:      a._id,
    seller:      owner._id,
    date:        randDate(0.1),
    diagnosis:   rand(DIAGNOSES),
    treatment:   rand(TREATMENTS),
    medication:  'أموكسيسيلين 500mg',
    vet:         'د. أحمد الشريف',
    cost:        randInt(150, 800),
    followUpDate: daysFromNow(1, 7),
    resolved:    false,
    notes:       'متابعة لازمة',
  }));
  await MedicalRecord.insertMany(medDocs, { ordered: false });
  console.log(`✓ متابعة طبية : ${medDocs.length}`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const total = await Animal.countDocuments({ farm: farm._id });
  console.log(`\n✅ Done — إجمالي الحيوانات: ${total}`);
  console.log(`   بقر: 500 | جاموس: 500 | ضأن: 500 | ماعز: 500 | إبل: 500`);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err.message); process.exit(1); });
