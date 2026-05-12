/**
 * Seed script — adds 2000 diverse animals to مواشي عباس (khalilbido05@gmail.com)
 * with realistic distribution of:
 *   - nextWeighingDate within 7 days (for "وزن قريب" filter)
 *   - vaccination nextDueDate within 7 days (for "تطعيم قريب" filter)
 *   - MedicalRecord followUpDate within 7 days (for "متابعة طبية" filter)
 *
 * Usage:  node backend/scripts/seed_herd.js   (run from project root)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User          = require('../src/models/User');
const Farm          = require('../src/models/Farm');
const Animal        = require('../src/models/Animal');
const MedicalRecord = require('../src/models/MedicalRecord');

const OWNER_EMAIL = 'khalilbido05@gmail.com';
const FARM_NAME   = 'مواشي عباس';
const COUNT_EACH  = 500;   // per type → 2000 total

const TYPES = ['cattle', 'buffalo', 'sheep', 'goat'];

const TYPE_AR = { cattle:'بقر', buffalo:'جاموس', sheep:'ضأن', goat:'ماعز' };

const BREEDS = {
  cattle:  ['بلدي','فريزيان','هولشتاين','أنجوس'],
  buffalo: ['مصري','مري','نيلي-رافي'],
  sheep:   ['رحماني','سوهاجي','بلدي','برقي'],
  goat:    ['بلدي','زريبي','نوبي','شامي'],
};
const COLORS = {
  cattle:  ['أبيض','أسود','بني','رمادي'],
  buffalo: ['رمادي غامق','أسود','رمادي فاتح'],
  sheep:   ['أبيض','أسود','بني فاتح','رمادي'],
  goat:    ['أبيض','أسود','بني','محطط'],
};

const VACCINES = ['تحصين الحمى القلاعية','تحصين الجمرة الخبيثة','تحصين الطاعون البقري','تحصين البروسيلا','تحصين الكزاز'];
const DIAGNOSES = ['التهاب الجهاز التنفسي','إسهال حاد','طفيليات خارجية','التهاب الضرع','كسر في الطرف','عدوى بكتيرية'];
const TREATMENTS = ['مضادات حيوية','مضادات طفيليات','محاليل وريدية','مراهم موضعية','أدوية مضادة للالتهاب'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDate(yearsAgo) {
  return new Date(Date.now() - Math.random() * yearsAgo * 365 * 24 * 3600 * 1000);
}
function daysFromNow(min, max) {
  return new Date(Date.now() + (randInt(min, max)) * 24 * 3600 * 1000);
}

// Shuffle array in-place
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const owner = await User.findOne({ email: OWNER_EMAIL });
  if (!owner) throw new Error(`User not found: ${OWNER_EMAIL}`);
  console.log(`Owner : ${owner._id}  (${owner.email})`);

  const farm = await Farm.findOne({ owner: owner._id, name: FARM_NAME });
  if (!farm) throw new Error(`Farm not found: "${FARM_NAME}"`);
  console.log(`Farm  : ${farm._id}  (${farm.name})`);

  // ── Clean existing data ────────────────────────────────────────────────────
  const delAnimals = await Animal.deleteMany({ farm: farm._id });
  console.log(`Deleted ${delAnimals.deletedCount} existing animals`);

  // ── Build animal documents ─────────────────────────────────────────────────
  const docs = [];
  let idx = 1;

  for (const type of TYPES) {
    for (let i = 0; i < COUNT_EACH; i++) {
      const gender = i % 2 === 0 ? 'female' : 'male';
      const weightKg =
        type === 'cattle'  ? randInt(180, 600) :
        type === 'buffalo' ? randInt(200, 650) :
        type === 'sheep'   ? randInt(25,  90)  :
                             randInt(20,  70);

      docs.push({
        seller: owner._id,
        farm:   farm._id,
        tagId:  `${TYPE_AR[type]}-${String(idx).padStart(5,'0')}`,
        type,
        breed:  rand(BREEDS[type]),
        gender,
        color:  rand(COLORS[type]),
        dob:    randDate(4),
        currentWeight: weightKg,
        healthStatus: 'healthy',
        status: 'active',
        weightLog: [{ date: new Date(), weightKg, notes: 'وزن أولي' }],
      });
      idx++;
    }
  }

  // ── Insert animals ─────────────────────────────────────────────────────────
  console.log(`Inserting ${docs.length} animals…`);
  const inserted = await Animal.insertMany(docs, { ordered: true });
  console.log(`Inserted ${inserted.length} animals`);

  // ── Assign "weighing due" to first 500 (mixed types) ──────────────────────
  const shuffled = shuffle([...inserted]);
  const weighingDue = shuffled.slice(0, 500);
  const vaccinDue   = shuffled.slice(500, 1000);
  const medFollowUp = shuffled.slice(1000, 1250);

  // Update nextWeighingDate within 0–7 days for 500 animals
  const weighingIds = weighingDue.map(a => a._id);
  const weighingBulk = weighingDue.map(a => ({
    updateOne: {
      filter: { _id: a._id },
      update: { $set: { nextWeighingDate: daysFromNow(0, 6) } },
    },
  }));
  await Animal.bulkWrite(weighingBulk);
  console.log(`Set nextWeighingDate (0-6 days) on ${weighingDue.length} animals`);

  // Add vaccination log entry with nextDueDate within 0–7 days for 500 animals
  const vaccinBulk = vaccinDue.map(a => ({
    updateOne: {
      filter: { _id: a._id },
      update: {
        $push: {
          vaccinationLog: {
            vaccine:     rand(VACCINES),
            date:        randDate(0.5),
            nextDueDate: daysFromNow(1, 7),
            vet:         'د. محمد السيد',
            notes:       'تحصين دوري',
          },
        },
      },
    },
  }));
  await Animal.bulkWrite(vaccinBulk);
  console.log(`Added upcoming vaccination on ${vaccinDue.length} animals`);

  // Also mark some of these animals as sick for health filter diversity
  const sickAnimals = shuffled.slice(1750, 1900);
  const sickBulk = sickAnimals.map(a => ({
    updateOne: {
      filter: { _id: a._id },
      update: { $set: { healthStatus: 'sick' } },
    },
  }));
  await Animal.bulkWrite(sickBulk);
  console.log(`Marked ${sickAnimals.length} animals as sick`);

  // ── Create MedicalRecords for 250 animals ─────────────────────────────────
  await MedicalRecord.deleteMany({ seller: owner._id });

  const medDocs = medFollowUp.map(a => ({
    animal:     a._id,
    seller:     owner._id,
    date:       randDate(0.1),
    diagnosis:  rand(DIAGNOSES),
    treatment:  rand(TREATMENTS),
    medication: 'أموكسيسيلين 500mg',
    vet:        'د. أحمد الشريف',
    cost:       randInt(150, 800),
    followUpDate: daysFromNow(1, 7),
    resolved:   false,
    notes:      'متابعة لازمة',
  }));

  await MedicalRecord.insertMany(medDocs, { ordered: false });
  console.log(`Created ${medDocs.length} medical records with follow-up within 7 days`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const total = await Animal.countDocuments({ farm: farm._id });
  console.log(`\n✅ Done — Total animals in مواشي عباس: ${total}`);
  console.log(`   وزن قريب   : ~500 animals`);
  console.log(`   تطعيم قريب : ~500 animals`);
  console.log(`   متابعة طبية: ${medDocs.length} animals`);
  console.log(`   مريض        : ${sickAnimals.length} animals`);
  console.log(`   أنواع       : بقر / جاموس / ضأن / ماعز (500 من كل نوع)`);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err.message); process.exit(1); });
