/**
 * seed-animals-extra.js
 * Adds 300 more of each type (cattle/buffalo/sheep/goat/camel) → 1500 total.
 * Varied: health, status, old dates, upcoming vaccination/weighing, medical follow-ups.
 *
 * Usage: node seed-animals-extra.js
 */

require('dotenv').config({ path: './backend/.env' });
const mongoose = require('./backend/node_modules/mongoose');
const { Schema, Types: { ObjectId } } = mongoose;

const MONGO_URI    = process.env.MONGO_URI;
const SELLER_EMAIL = 'khalilbido05@gmail.com';

// ── Schemas ───────────────────────────────────────────────────────────────────
const weightEntrySchema = new Schema({ date: { type: Date }, weightKg: { type: Number } });
const vaccinationEntrySchema = new Schema({
  vaccine: String, date: Date, nextDueDate: Date, vet: String, notes: String,
});

const animalSchema = new Schema({
  seller: ObjectId, farm: ObjectId,
  tagId: String, type: String, breed: String,
  gender: { type: String, default: 'unknown' },
  dob: Date, color: String,
  currentWeight: Number,
  healthStatus:  { type: String, default: 'healthy' },
  status:        { type: String, default: 'active' },
  notes: String,
  pregnancyStatus:   { type: String, default: 'none' },
  pregnancyDate:     Date,
  expectedBirthDate: Date,
  birthCount:        { type: Number, default: 0 },
  targetWeight:      Number,
  nextWeighingDate:  Date,
  weightLog:        { type: [weightEntrySchema],      default: [] },
  vaccinationLog:   { type: [vaccinationEntrySchema], default: [] },
  images:           { type: [String], default: [] },
}, { timestamps: true, collection: 'animals' });

animalSchema.index({ seller: 1, tagId: 1 }, { unique: true, sparse: true });

const Animal        = mongoose.model('Animal', animalSchema);
const MedicalRecord = mongoose.model('MedicalRecord', new Schema({
  animal: ObjectId, seller: ObjectId, date: Date,
  diagnosis: String, treatment: String, medication: String,
  vet: String, cost: Number, followUpDate: Date, resolved: { type: Boolean, default: false }, notes: String,
}, { timestamps: true, collection: 'medicalrecords' }));
const User = mongoose.model('User', new Schema({ email: String }, { collection: 'users' }));

// ── Data ──────────────────────────────────────────────────────────────────────
const IMAGES = {
  cattle:  ['https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Cow_female_black_white.jpg/640px-Cow_female_black_white.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Cattle_in_norway.jpg/640px-Cattle_in_norway.jpg'],
  buffalo: ['https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Water_buffalo_large.jpg/640px-Water_buffalo_large.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Domestic_Water_Buffalo.jpg/640px-Domestic_Water_Buffalo.jpg'],
  sheep:   ['https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Woolly_Sheep_Portrait.jpg/640px-Woolly_Sheep_Portrait.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Lamb_portrait.jpg/640px-Lamb_portrait.jpg'],
  goat:    ['https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Hausziege_04.jpg/640px-Hausziege_04.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Domestic_goat_kid_in_capeweed.jpg/640px-Domestic_goat_kid_in_capeweed.jpg'],
  camel:   ['https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Camelus_dromedarius_%28camel_in_Dubai%29.jpg/640px-Camelus_dromedarius_%28camel_in_Dubai%29.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Dromedary_Camel_%284477955702%29.jpg/640px-Dromedary_Camel_%284477955702%29.jpg'],
};

const CONFIG = {
  cattle:  { breeds: ['فريزيان','هولشتاين','براون سويس','بلدي مصري','سيمنتال','أبردين أنجوس'], colors: ['أسود وأبيض','بني','أحمر وأبيض','بيج','رمادي'],   minW: 280, maxW: 580, maxYears: 10, genders: ['female','female','female','male'], vaccines: ['تحصين الحمى القلاعية','تحصين الجمرة الخبيثة','تحصين اللمكوز','تحصين الطاعون البقري'] },
  buffalo: { breeds: ['جاموس مصري','نيلي رافي','مرة','بلدي نيلي'],                            colors: ['رمادي داكن','أسود','رمادي فحمي'],                  minW: 380, maxW: 680, maxYears: 12, genders: ['female','female','male'],           vaccines: ['تحصين الحمى القلاعية','تحصين الجمرة الخبيثة','تحصين البروسيلا'] },
  sheep:   { breeds: ['أوسيمي','بركاوي','رومانوف','دمياطي','رحماني','أوباسي'],                 colors: ['أبيض','بني فاتح','أسود وأبيض','رمادي','بيج'],      minW: 35,  maxW: 95,  maxYears: 8,  genders: ['female','female','male'],           vaccines: ['تحصين الجدري','تحصين اللسان الأزرق','تحصين الطاعون الصغير'] },
  goat:    { breeds: ['زرايبي','نوبي','بلدي مصري','شامي','الألبين','بوعر'],                    colors: ['أبيض','بني','أسود','رقطاء','بني وأبيض','رمادي'],   minW: 22,  maxW: 58,  maxYears: 9,  genders: ['female','female','male'],           vaccines: ['تحصين الجدري','تحصين الطاعون الصغير','تحصين الكلوستريديا'] },
  camel:   { breeds: ['عربي أصيل','سوداني','مغربي','صومالي','رقيبي','شعل'],                   colors: ['بيج','بني فاتح','رملي','بني داكن','أبيض ناصع'],   minW: 380, maxW: 720, maxYears: 15, genders: ['female','male','male'],             vaccines: ['تحصين الجدري الجملي','تحصين الكوروناء الجملية','تحصين الإنفلونزا'] },
};

const VETS = ['د. أحمد العطار','د. محمد السيد','د. علي حسن','د. خالد عبد الله','د. سامي النجار','د. ياسر إبراهيم'];
const DIAGNOSES = ['التهاب مفاصل','تهيج جلدي','إسهال حاد','الحمى القلاعية','التهاب الضرع','طفيليات خارجية','نقص فيتامينات','هزال وضعف عام','إصابة في الرجل','التهاب العين'];
const TREATMENTS = ['مضاد حيوي','مسكن ألم','مضاد طفيليات','محلول وريدي','فيتامينات','علاج موضعي','راحة تامة وعزل'];
const MEDICATIONS = ['أوكسي تتراسيكلين','إنروفلوكساسين','فيتامين B12','كلوريد الصوديوم','آيفرمكتين','بنسلين','ميترونيدازول'];

const rand    = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const pick    = arr => arr[rand(0, arr.length - 1)];
const randMs  = ms => new Date(Date.now() - rand(0, ms));
const daysMs  = d => d * 24 * 3600 * 1000;

// ── Scenario buckets ──────────────────────────────────────────────────────────
// Each animal gets one scenario that drives its flags
function pickScenario(i) {
  const r = i % 20; // 20-slot cycle so distribution is deterministic
  if (r < 9)  return 'normal';          // 45% — normal healthy active
  if (r < 12) return 'sick';            // 15% — sick / under treatment
  if (r < 13) return 'quarantine';      //  5% — quarantine
  if (r < 15) return 'deceased';        // 10% — deceased animal
  if (r < 16) return 'sold';            //  5% — sold
  if (r < 18) return 'vac_due';         // 10% — vaccination due in ≤30 days
  if (r < 19) return 'weigh_due';       //  5% — weighing due in ≤7 days
  return 'medical_followup';            //  5% — open medical follow-up needed
}

function buildAnimal(type, index, sellerId) {
  const cfg      = CONFIG[type];
  const scenario = pickScenario(index);
  const gender   = pick(cfg.genders);
  const imgs     = IMAGES[type];
  const prefix   = type.slice(0, 3).toUpperCase();

  // Status & health driven by scenario
  let status       = 'active';
  let healthStatus = 'healthy';
  let maxYears     = cfg.maxYears;
  let dobOffset;   // years back for DOB

  if (scenario === 'sick')             { healthStatus = 'sick'; }
  if (scenario === 'quarantine')       { healthStatus = 'quarantine'; }
  if (scenario === 'deceased')         { status = 'deceased'; healthStatus = 'deceased'; maxYears = Math.min(cfg.maxYears, 8); }
  if (scenario === 'sold')             { status = 'sold'; }

  // Older animals — some from 5-15 years ago (creates historic date variety)
  const oldAnimal = index % 7 === 0;
  if (oldAnimal) dobOffset = rand(5, maxYears) * 365;
  else           dobOffset = rand(1, Math.min(5, maxYears) * 365);

  const dob    = new Date(Date.now() - daysMs(dobOffset));
  const weight = rand(cfg.minW, cfg.maxW);

  // Weight log — 3 entries, spaced out realistically
  const w0 = Math.max(cfg.minW * 0.5, weight - rand(40, 100));
  const w1 = Math.max(cfg.minW * 0.7, weight - rand(10, 40));
  const weightLog = [
    { date: new Date(Date.now() - daysMs(rand(180, 365))), weightKg: w0 },
    { date: new Date(Date.now() - daysMs(rand(30, 90))),   weightKg: w1 },
    { date: new Date(),                                    weightKg: weight },
  ];

  // Vaccination log
  const numVacs = rand(1, 3);
  const vaccinationLog = [];
  for (let v = 0; v < numVacs; v++) {
    let nextDueDate;
    if (scenario === 'vac_due' && v === 0) {
      nextDueDate = new Date(Date.now() + daysMs(rand(1, 28)));  // due within 28 days
    } else {
      nextDueDate = new Date(Date.now() + daysMs(rand(90, 365)));
    }
    vaccinationLog.push({
      vaccine:     pick(cfg.vaccines),
      date:        new Date(Date.now() - daysMs(rand(30, 300))),
      nextDueDate,
      vet:         pick(VETS),
    });
  }

  // Weighing date
  let nextWeighingDate;
  if (scenario === 'weigh_due') {
    nextWeighingDate = new Date(Date.now() + daysMs(rand(0, 6)));  // within 7 days
  } else {
    nextWeighingDate = new Date(Date.now() + daysMs(rand(10, 60)));
  }

  // Pregnancy (females, active/healthy only)
  let pregnancyStatus = 'none', pregnancyDate, expectedBirthDate;
  if (gender === 'female' && status === 'active' && healthStatus === 'healthy' && Math.random() > 0.7) {
    pregnancyStatus = 'pregnant';
    pregnancyDate   = new Date(Date.now() - daysMs(rand(10, 90)));
    expectedBirthDate = new Date(Date.now() + daysMs(rand(30, 180)));
  }

  return {
    doc: {
      seller: sellerId,
      tagId:  `${prefix}-${String(index + 101).padStart(3, '0')}`,  // starts at 101 (100 already exist)
      type, breed: pick(cfg.breeds), gender,
      color: pick(cfg.colors), dob,
      currentWeight: weight,
      healthStatus, status,
      notes: scenario === 'sick'       ? 'تحت العلاج — مراقبة يومية'
           : scenario === 'quarantine' ? 'معزول لحين استيضاح التشخيص'
           : scenario === 'deceased'   ? 'توفي — سجل محفوظ للأرشيف'
           : scenario === 'sold'       ? 'تم البيع'
           : undefined,
      pregnancyStatus, pregnancyDate: pregnancyDate || undefined,
      expectedBirthDate: expectedBirthDate || undefined,
      birthCount:  gender === 'female' ? rand(0, 5) : 0,
      targetWeight: status === 'active' && Math.random() > 0.5 ? weight + rand(20, 80) : undefined,
      nextWeighingDate,
      weightLog, vaccinationLog,
      images: [imgs[index % imgs.length], imgs[(index + 1) % imgs.length]],
    },
    needsFollowUp: scenario === 'medical_followup',
    sellerId,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('FarmFlow Extra Seed — 300×5 = 1500 total\n');
  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB\n');

  const seller = await User.findOne({ email: SELLER_EMAIL });
  if (!seller) throw new Error(`Seller not found: ${SELLER_EMAIL}`);
  console.log(`✓ Seller: ${seller._id}\n`);

  const TYPES = ['cattle', 'buffalo', 'sheep', 'goat', 'camel'];
  const TYPE_AR = { cattle:'بقرة', buffalo:'جاموسة', sheep:'خروف', goat:'ماعز', camel:'جمل' };

  let totalAnimals  = 0;
  let totalMedical  = 0;

  for (const type of TYPES) {
    console.log(`── Seeding 300 ${TYPE_AR[type]} (${type})…`);
    const built = Array.from({ length: 300 }, (_, i) => buildAnimal(type, i, seller._id));
    const docs   = built.map(b => b.doc);

    let inserted = [];
    try {
      const result = await Animal.insertMany(docs, { ordered: false });
      inserted = result;
      totalAnimals += result.length;
      console.log(`  ✓ ${result.length} animals inserted`);
    } catch (err) {
      inserted = err.insertedDocs || [];
      totalAnimals += inserted.length;
      const skipped = 300 - inserted.length;
      console.log(`  ⚠ ${inserted.length} inserted${skipped ? `, ${skipped} skipped (dup tagId)` : ''}`);
    }

    // Create MedicalRecord follow-ups for animals that need them
    const followUpAnimals = inserted.filter((_, i) => built[i]?.needsFollowUp);
    if (followUpAnimals.length > 0) {
      const medDocs = followUpAnimals.map(animal => ({
        animal:      animal._id,
        seller:      seller._id,
        date:        new Date(Date.now() - daysMs(rand(1, 14))),
        diagnosis:   pick(DIAGNOSES),
        treatment:   pick(TREATMENTS),
        medication:  pick(MEDICATIONS),
        vet:         pick(VETS),
        cost:        rand(50, 500),
        followUpDate: new Date(Date.now() + daysMs(rand(1, 7))),  // follow-up within 7 days
        resolved:    false,
        notes:       'تحتاج مراجعة دورية وفحص متابعة',
      }));
      await MedicalRecord.insertMany(medDocs, { ordered: false }).catch(() => {});
      totalMedical += medDocs.length;
      console.log(`  ✓ ${medDocs.length} medical follow-ups created`);
    }
  }

  // Summary breakdown
  const counts = await Animal.aggregate([
    { $match: { seller: seller._id } },
    { $group: { _id: { type: '$type', status: '$status', health: '$healthStatus' }, n: { $sum: 1 } } },
  ]);

  const byType   = {};
  const byStatus = {};
  const byHealth = {};
  counts.forEach(({ _id, n }) => {
    byType[_id.type]     = (byType[_id.type]     || 0) + n;
    byStatus[_id.status] = (byStatus[_id.status] || 0) + n;
    byHealth[_id.health] = (byHealth[_id.health] || 0) + n;
  });

  const total = Object.values(byType).reduce((s, v) => s + v, 0);

  console.log('\n══════════════════════════════════');
  console.log(`✓ Total animals in DB : ${total}`);
  console.log(`  New animals added   : ${totalAnimals}`);
  console.log(`  Medical follow-ups  : ${totalMedical}`);
  console.log('\nBy type:',   JSON.stringify(byType));
  console.log('By status:', JSON.stringify(byStatus));
  console.log('By health:', JSON.stringify(byHealth));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
