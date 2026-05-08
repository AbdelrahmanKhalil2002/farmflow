/**
 * seed_data.js — populates sample data for the 11 test accounts.
 * Run: node seed_data.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const User          = require('./src/models/User');
const Animal        = require('./src/models/Animal');
const MedicalRecord = require('./src/models/MedicalRecord');
const Listing       = require('./src/models/Listing');
const DairyProduct  = require('./src/models/DairyProduct');
const Supply        = require('./src/models/Supply');
const Order         = require('./src/models/Order');
const Review        = require('./src/models/Review');
const Expense       = require('./src/models/Expense');
const Income        = require('./src/models/Income');
const Notification  = require('./src/models/Notification');
const Budget        = require('./src/models/Budget');
const AppConfig     = require('./src/models/AppConfig');

const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randF = (min, max, dp = 0) => parseFloat((Math.random() * (max - min) + min).toFixed(dp));

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // ── Clear existing sample data (non-user collections) ────────────────────────
  await Promise.all([
    Animal.deleteMany({}), MedicalRecord.deleteMany({}), Listing.deleteMany({}),
    DairyProduct.deleteMany({}), Supply.deleteMany({}), Order.deleteMany({}),
    Review.deleteMany({}), Expense.deleteMany({}), Income.deleteMany({}),
    Notification.deleteMany({}), Budget.deleteMany({}), AppConfig.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // ── Fetch users ──────────────────────────────────────────────────────────────
  const sellers = await User.find({ role: 'seller' }).select('_id email farmName animalTypes').lean();
  const buyers  = await User.find({ role: 'buyer'  }).select('_id email').lean();

  const s = (email) => sellers.find(u => u.email === email);
  const b = (email) => buyers.find(u => u.email === email);

  const S1 = s('seller1@farmflow.com');
  const S2 = s('seller2@farmflow.com');
  const S3 = s('seller3@farmflow.com');
  const S4 = s('seller4@farmflow.com');
  const S5 = s('seller5@farmflow.com');
  const S11 = sellers.find(u => u.email === 'seller11@farmflow.com');

  const B1 = b('buyer1@farmflow.com');
  const B2 = b('buyer2@farmflow.com');
  const B3 = b('buyer3@farmflow.com');
  const B4 = b('buyer4@farmflow.com');
  const B5 = b('buyer5@farmflow.com');

  // ── AppConfig ─────────────────────────────────────────────────────────────────
  await AppConfig.findOneAndUpdate(
    { _singleton: 'main' },
    { eidMode: false, eidDate: new Date('2026-06-06') },
    { upsert: true }
  );
  console.log('AppConfig done');

  // ═══════════════════════════════════════════════════════════════════════════════
  // ANIMALS
  // ═══════════════════════════════════════════════════════════════════════════════
  const animalDefs = [
    // Seller 1 — أبقار / جاموس
    { seller: S1._id, tagId: 'S1-001', type: 'cattle', breed: 'فريزيان', gender: 'female', dob: daysAgo(900), color: 'أبيض وأسود', currentWeight: 480, healthStatus: 'healthy', status: 'active', pregnancyStatus: 'pregnant', pregnancyDate: daysAgo(60), expectedBirthDate: daysAgo(-220), birthCount: 2, targetWeight: 520, nextWeighingDate: daysAgo(-7), notes: 'بقرة عالية الإنتاج', weightLog: [{ date: daysAgo(90), weightKg: 450 }, { date: daysAgo(60), weightKg: 465 }, { date: daysAgo(30), weightKg: 480 }], vaccinationLog: [{ vaccine: 'حمى القلاعية', date: daysAgo(120), nextDueDate: daysAgo(-60), vet: 'د. محمد علي' }, { vaccine: 'الجمرة الخبيثة', date: daysAgo(90), nextDueDate: daysAgo(-90) }] },
    { seller: S1._id, tagId: 'S1-002', type: 'cattle', breed: 'بلدي', gender: 'male', dob: daysAgo(540), color: 'بني', currentWeight: 350, healthStatus: 'healthy', status: 'active', targetWeight: 450, nextWeighingDate: daysAgo(-5), weightLog: [{ date: daysAgo(60), weightKg: 300 }, { date: daysAgo(30), weightKg: 325 }, { date: daysAgo(5), weightKg: 350 }], vaccinationLog: [{ vaccine: 'حمى القلاعية', date: daysAgo(60), nextDueDate: daysAgo(-120) }] },
    { seller: S1._id, tagId: 'S1-003', type: 'buffalo', breed: 'مصري', gender: 'female', dob: daysAgo(1200), color: 'رمادي داكن', currentWeight: 520, healthStatus: 'healthy', status: 'active', pregnancyStatus: 'none', birthCount: 4, targetWeight: 560, weightLog: [{ date: daysAgo(30), weightKg: 520 }], vaccinationLog: [{ vaccine: 'حمى القلاعية', date: daysAgo(45), nextDueDate: daysAgo(-135) }] },
    { seller: S1._id, tagId: 'S1-004', type: 'cattle', breed: 'فريزيان', gender: 'female', dob: daysAgo(730), color: 'أبيض', currentWeight: 410, healthStatus: 'sick', status: 'active', notes: 'تحت العلاج البيطري', weightLog: [{ date: daysAgo(14), weightKg: 410 }], vaccinationLog: [] },

    // Seller 2 — أغنام / ماعز
    { seller: S2._id, tagId: 'S2-001', type: 'sheep', breed: 'رحماني', gender: 'female', dob: daysAgo(400), color: 'أبيض', currentWeight: 55, healthStatus: 'healthy', status: 'active', pregnancyStatus: 'recently_gave_birth', birthCount: 1, targetWeight: 65, weightLog: [{ date: daysAgo(30), weightKg: 52 }, { date: daysAgo(10), weightKg: 55 }], vaccinationLog: [{ vaccine: 'الجدري', date: daysAgo(80), nextDueDate: daysAgo(-180) }] },
    { seller: S2._id, tagId: 'S2-002', type: 'sheep', breed: 'بربري', gender: 'male', dob: daysAgo(300), color: 'أبيض وأسود', currentWeight: 70, healthStatus: 'healthy', status: 'active', targetWeight: 80, weightLog: [{ date: daysAgo(20), weightKg: 68 }, { date: daysAgo(5), weightKg: 70 }], vaccinationLog: [{ vaccine: 'الجدري', date: daysAgo(70), nextDueDate: daysAgo(-190) }, { vaccine: 'الطاعون الصغير', date: daysAgo(50) }] },
    { seller: S2._id, tagId: 'S2-003', type: 'goat', breed: 'بلدي', gender: 'female', dob: daysAgo(600), color: 'بني فاتح', currentWeight: 38, healthStatus: 'healthy', status: 'active', pregnancyStatus: 'pregnant', pregnancyDate: daysAgo(45), expectedBirthDate: daysAgo(-105), birthCount: 2, weightLog: [{ date: daysAgo(15), weightKg: 38 }], vaccinationLog: [] },
    { seller: S2._id, tagId: 'S2-004', type: 'goat', breed: 'شامي', gender: 'male', dob: daysAgo(450), color: 'أبيض', currentWeight: 48, healthStatus: 'healthy', status: 'active', targetWeight: 55, weightLog: [{ date: daysAgo(10), weightKg: 48 }], vaccinationLog: [{ vaccine: 'حمى القلاعية', date: daysAgo(30) }] },
    { seller: S2._id, tagId: 'S2-005', type: 'sheep', breed: 'رحماني', gender: 'female', dob: daysAgo(250), color: 'أبيض', currentWeight: 42, healthStatus: 'healthy', status: 'active', targetWeight: 60, weightLog: [{ date: daysAgo(7), weightKg: 42 }], vaccinationLog: [] },

    // Seller 3 — إبل / خيول
    { seller: S3._id, tagId: 'S3-001', type: 'camel', breed: 'مجاهيم', gender: 'male', dob: daysAgo(1460), color: 'أصفر', currentWeight: 550, healthStatus: 'healthy', status: 'active', targetWeight: 600, weightLog: [{ date: daysAgo(30), weightKg: 540 }, { date: daysAgo(10), weightKg: 550 }], vaccinationLog: [{ vaccine: 'الجدري الجمالي', date: daysAgo(90) }] },
    { seller: S3._id, tagId: 'S3-002', type: 'camel', breed: 'وضح', gender: 'female', dob: daysAgo(1825), color: 'أبيض', currentWeight: 480, healthStatus: 'healthy', status: 'active', pregnancyStatus: 'pregnant', pregnancyDate: daysAgo(200), expectedBirthDate: daysAgo(-170), birthCount: 3, weightLog: [{ date: daysAgo(20), weightKg: 480 }], vaccinationLog: [] },
    { seller: S3._id, tagId: 'S3-003', type: 'horse', breed: 'عربي أصيل', gender: 'male', dob: daysAgo(1095), color: 'كستنائي', currentWeight: 420, healthStatus: 'healthy', status: 'active', weightLog: [{ date: daysAgo(14), weightKg: 420 }], vaccinationLog: [{ vaccine: 'الإنفلونزا', date: daysAgo(60), nextDueDate: daysAgo(-120) }, { vaccine: 'الكزاز', date: daysAgo(30), nextDueDate: daysAgo(-335) }] },
    { seller: S3._id, tagId: 'S3-004', type: 'horse', breed: 'عربي', gender: 'female', dob: daysAgo(730), color: 'رمادي', currentWeight: 350, healthStatus: 'healthy', status: 'active', weightLog: [{ date: daysAgo(21), weightKg: 350 }], vaccinationLog: [] },

    // Seller 4 — دجاج / أرانب
    { seller: S4._id, tagId: 'S4-001', type: 'poultry', breed: 'كوب 500', gender: 'female', dob: daysAgo(60), color: 'أبيض', currentWeight: 2.2, healthStatus: 'healthy', status: 'active', weightLog: [{ date: daysAgo(7), weightKg: 2.0 }, { date: daysAgo(0), weightKg: 2.2 }], vaccinationLog: [{ vaccine: 'نيوكاسل', date: daysAgo(14) }, { vaccine: 'الإنفلونزا', date: daysAgo(7) }] },
    { seller: S4._id, tagId: 'S4-002', type: 'rabbit', breed: 'نيوزيلندي', gender: 'female', dob: daysAgo(120), color: 'أبيض', currentWeight: 2.8, healthStatus: 'healthy', status: 'active', pregnancyStatus: 'pregnant', pregnancyDate: daysAgo(20), expectedBirthDate: daysAgo(-11), birthCount: 1, weightLog: [{ date: daysAgo(7), weightKg: 2.8 }], vaccinationLog: [{ vaccine: 'الجرب', date: daysAgo(30) }] },
    { seller: S4._id, tagId: 'S4-003', type: 'rabbit', breed: 'كاليفورني', gender: 'male', dob: daysAgo(90), color: 'أبيض وأسود', currentWeight: 2.5, healthStatus: 'healthy', status: 'active', targetWeight: 3.5, weightLog: [{ date: daysAgo(5), weightKg: 2.5 }], vaccinationLog: [] },

    // Seller 5 — أبقار / أغنام / ماعز
    { seller: S5._id, tagId: 'S5-001', type: 'cattle', breed: 'هولشتاين', gender: 'female', dob: daysAgo(1095), color: 'أبيض وأسود', currentWeight: 510, healthStatus: 'healthy', status: 'active', pregnancyStatus: 'none', birthCount: 3, targetWeight: 550, weightLog: [{ date: daysAgo(60), weightKg: 490 }, { date: daysAgo(30), weightKg: 500 }, { date: daysAgo(7), weightKg: 510 }], vaccinationLog: [{ vaccine: 'حمى القلاعية', date: daysAgo(30), nextDueDate: daysAgo(-150) }, { vaccine: 'الجمرة الخبيثة', date: daysAgo(60) }] },
    { seller: S5._id, tagId: 'S5-002', type: 'cattle', breed: 'بلدي', gender: 'male', dob: daysAgo(420), color: 'أحمر', currentWeight: 280, healthStatus: 'healthy', status: 'active', targetWeight: 400, weightLog: [{ date: daysAgo(30), weightKg: 250 }, { date: daysAgo(10), weightKg: 280 }], vaccinationLog: [{ vaccine: 'حمى القلاعية', date: daysAgo(45) }] },
    { seller: S5._id, tagId: 'S5-003', type: 'sheep', breed: 'رحماني', gender: 'female', dob: daysAgo(500), color: 'أبيض', currentWeight: 60, healthStatus: 'healthy', status: 'active', birthCount: 2, pregnancyStatus: 'recently_gave_birth', weightLog: [{ date: daysAgo(15), weightKg: 60 }], vaccinationLog: [{ vaccine: 'الجدري', date: daysAgo(40) }] },
    { seller: S5._id, tagId: 'S5-004', type: 'goat', breed: 'بلدي', gender: 'female', dob: daysAgo(380), color: 'بني', currentWeight: 35, healthStatus: 'healthy', status: 'active', weightLog: [{ date: daysAgo(12), weightKg: 35 }], vaccinationLog: [] },
    { seller: S5._id, tagId: 'S5-005', type: 'cattle', breed: 'فريزيان', gender: 'male', dob: daysAgo(300), color: 'أبيض وأسود', currentWeight: 190, healthStatus: 'quarantine', status: 'active', notes: 'تحت الملاحظة البيطرية', weightLog: [{ date: daysAgo(3), weightKg: 190 }], vaccinationLog: [] },
  ];

  const createdAnimals = await Animal.insertMany(animalDefs);
  console.log(`Animals: ${createdAnimals.length} created`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // MEDICAL RECORDS
  // ═══════════════════════════════════════════════════════════════════════════════
  const sickAnimal  = createdAnimals.find(a => a.tagId === 'S1-004');
  const quarAnimal  = createdAnimals.find(a => a.tagId === 'S5-005');
  const goatAnimal  = createdAnimals.find(a => a.tagId === 'S2-003');

  await MedicalRecord.insertMany([
    { animal: sickAnimal._id,  seller: S1._id, date: daysAgo(5),  diagnosis: 'التهاب في الضرع', treatment: 'مضادات حيوية موضعية وجهازية', medication: 'أموكسيسيلين 500 ملج', vet: 'د. أحمد الشافعي', cost: 350, followUpDate: daysAgo(-3), resolved: false, notes: 'تحسن ملحوظ' },
    { animal: quarAnimal._id,  seller: S5._id, date: daysAgo(8),  diagnosis: 'إسهال حاد', treatment: 'محاليل وريدية ومضادات حيوية', medication: 'أمبيسيلين + أورال ريهايدريشن', vet: 'د. سمير حسن', cost: 580, followUpDate: daysAgo(-2), resolved: false },
    { animal: goatAnimal._id,  seller: S2._id, date: daysAgo(15), diagnosis: 'فطريات جلدية', treatment: 'مضادات فطرية موضعية', medication: 'فلوكونازول كريم', vet: 'د. ليلى يوسف', cost: 200, followUpDate: daysAgo(0), resolved: true },
    { animal: createdAnimals.find(a => a.tagId === 'S3-003')._id, seller: S3._id, date: daysAgo(20), diagnosis: 'إجهاد حرارة', treatment: 'تبريد وسوائل', medication: 'محاليل شفهية', vet: 'د. خالد نور', cost: 150, resolved: true },
  ]);
  console.log('MedicalRecords done');

  // ═══════════════════════════════════════════════════════════════════════════════
  // LISTINGS
  // ═══════════════════════════════════════════════════════════════════════════════
  const listingDefs = [
    // Seller 1
    { seller: S1._id, type: 'cattle', breed: 'فريزيان', age: 30, weight: 450, price: 28000, description: 'بقرة فريزيان حلوب عالية الإنتاج ≥20 لتر/يوم، بصحة ممتازة وسجل تطعيمات كامل', location: 'الجيزة', status: 'approved', pricePerKg: 62, deliveryType: 'farm', deliveryCost: 800, eidAvailable: false },
    { seller: S1._id, type: 'buffalo', breed: 'مصري', age: 48, weight: 500, price: 35000, description: 'جاموسة مصرية أصيلة منتجة، سجل ولادات 4 مرات', location: 'الجيزة', status: 'approved', pricePerKg: 70, deliveryType: 'none', eidAvailable: true, slaughterService: true, slaughterCost: 1200 },
    { seller: S1._id, type: 'cattle', breed: 'بلدي', age: 18, weight: 320, price: 18000, description: 'عجل بلدي للتسمين، نمو سريع', location: 'الجيزة', status: 'approved', pricePerKg: 56, deliveryType: 'admin', deliveryCost: 600, eidAvailable: true, depositRequired: true, depositPercentage: 25 },
    { seller: S1._id, type: 'cattle', breed: 'فريزيان', age: 6, weight: 85, price: 7500, description: 'عجلة فريزيان صغيرة للتربية', location: 'الجيزة', status: 'pending' },

    // Seller 2
    { seller: S2._id, type: 'sheep', breed: 'رحماني', age: 14, weight: 68, price: 4500, description: 'خروف رحماني ممتاز للذبح، تغذية طبيعية', location: 'الإسكندرية', status: 'approved', pricePerKg: 66, deliveryType: 'farm', deliveryCost: 300, eidAvailable: true, slaughterService: false },
    { seller: S2._id, type: 'sheep', breed: 'بربري', age: 18, weight: 75, price: 5200, description: 'كبش بربري للبيع، وزن ممتاز', location: 'الإسكندرية', status: 'approved', pricePerKg: 69, deliveryType: 'none', eidAvailable: true },
    { seller: S2._id, type: 'goat', breed: 'شامي', age: 24, weight: 55, price: 3800, description: 'ماعز شامي أصيل، مناسب للتربية', location: 'الإسكندرية', status: 'approved', deliveryType: 'none' },
    { seller: S2._id, type: 'sheep', breed: 'رحماني', age: 8, weight: 40, price: 2800, description: 'خروف صغير للتربية', location: 'الإسكندرية', status: 'rejected', description: 'بيانات غير مكتملة' },

    // Seller 3
    { seller: S3._id, type: 'camel', breed: 'مجاهيم', age: 48, weight: 540, price: 55000, description: 'جمل مجاهيم أصيل للبيع، مدرب ويمشي بهدوء', location: 'المنيا', status: 'approved', pricePerKg: 102, deliveryType: 'admin', deliveryCost: 2500, eidAvailable: true, slaughterService: true, slaughterCost: 3000, qurbaniShares: [{ shareType: 'seventh', pricePerShare: 9000, totalShares: 7, bookedShares: 3 }, { shareType: 'half', pricePerShare: 30000, totalShares: 2, bookedShares: 1 }] },
    { seller: S3._id, type: 'horse', breed: 'عربي أصيل', age: 36, weight: 400, price: 85000, description: 'حصان عربي أصيل سليم الصحة، يصلح للركوب والسباقات', location: 'المنيا', status: 'approved', deliveryType: 'none' },
    { seller: S3._id, type: 'camel', breed: 'وضح', age: 12, weight: 180, price: 22000, description: 'هجين صغير للتربية', location: 'المنيا', status: 'approved', deliveryType: 'farm', deliveryCost: 2000 },

    // Seller 4
    { seller: S4._id, type: 'poultry', breed: 'كوب 500', age: 2, weight: 2.2, price: 85, description: 'دجاج لاحم جاهز للذبح، تربية طبيعية بدون هرمونات', location: 'المنصورة', status: 'approved', pricePerKg: 39, deliveryType: 'farm', deliveryCost: 0 },
    { seller: S4._id, type: 'rabbit', breed: 'نيوزيلندي', age: 3, weight: 2.5, price: 120, description: 'أرانب نيوزيلندية طازجة، تربية نظيفة', location: 'المنصورة', status: 'approved', pricePerKg: 48, deliveryType: 'farm', deliveryCost: 0 },
    { seller: S4._id, type: 'poultry', breed: 'بلدي', age: 4, weight: 1.8, price: 95, description: 'دجاج بلدي أصيل', location: 'المنصورة', status: 'approved', pricePerKg: 53, deliveryType: 'none' },

    // Seller 5
    { seller: S5._id, type: 'cattle', breed: 'هولشتاين', age: 36, weight: 490, price: 32000, description: 'بقرة هولشتاين حلوب ممتازة، إنتاج يومي 25 لتر', location: 'الزقازيق', status: 'approved', pricePerKg: 65, deliveryType: 'farm', deliveryCost: 700, eidAvailable: false },
    { seller: S5._id, type: 'sheep', breed: 'رحماني', age: 16, weight: 72, price: 4800, description: 'خروف رحماني ممتاز للعيد', location: 'الزقازيق', status: 'approved', pricePerKg: 67, deliveryType: 'none', eidAvailable: true, slaughterService: false },
    { seller: S5._id, type: 'cattle', breed: 'بلدي', age: 10, weight: 180, price: 12000, description: 'عجل تسمين، وزن جيد ونمو سريع', location: 'الزقازيق', status: 'approved', pricePerKg: 67, deliveryType: 'admin', deliveryCost: 500, depositRequired: true, depositPercentage: 30 },
    { seller: S5._id, type: 'goat', breed: 'بلدي', age: 12, weight: 33, price: 2200, description: 'ماعز بلدية للبيع', location: 'الزقازيق', status: 'pending' },
  ];

  const createdListings = await Listing.insertMany(listingDefs);
  console.log(`Listings: ${createdListings.length} created`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // DAIRY PRODUCTS
  // ═══════════════════════════════════════════════════════════════════════════════
  await DairyProduct.insertMany([
    // Seller 1 (أبقار/جاموس)
    { seller: S1._id, name: 'لبن بقري طازج', type: 'milk', quantity: 200, unit: 'liter', pricePerUnit: 20, productionDate: daysAgo(0), expiryDate: daysAgo(-3), description: 'لبن بقري طازج يومي من أبقار فريزيان، غير مبستر', deliveryAvailable: true, deliveryCost: 50, status: 'approved', available: true, minStockAlert: 20 },
    { seller: S1._id, name: 'جبنة بيضاء بلدية', type: 'cheese', quantity: 30, unit: 'kg', pricePerUnit: 120, productionDate: daysAgo(3), expiryDate: daysAgo(-25), description: 'جبنة بيضاء مصرية طازجة مصنوعة يدوياً', deliveryAvailable: true, deliveryCost: 100, status: 'approved', available: true },
    { seller: S1._id, name: 'زبادي بلدي', type: 'yogurt', quantity: 50, unit: 'kg', pricePerUnit: 35, productionDate: daysAgo(1), expiryDate: daysAgo(-6), description: 'زبادي طازج من لبن بقر طبيعي', deliveryAvailable: false, status: 'approved', available: true },

    // Seller 2 (أغنام/ماعز)
    { seller: S2._id, name: 'لبن ماعز طازج', type: 'milk', quantity: 40, unit: 'liter', pricePerUnit: 30, productionDate: daysAgo(0), expiryDate: daysAgo(-2), description: 'لبن ماعز طازج غني بالبروتين والكالسيوم', deliveryAvailable: true, deliveryCost: 30, status: 'approved', available: true },
    { seller: S2._id, name: 'جبنة ماعز', type: 'cheese', quantity: 15, unit: 'kg', pricePerUnit: 160, productionDate: daysAgo(5), expiryDate: daysAgo(-20), description: 'جبنة ماعز طبيعية لذيذة', deliveryAvailable: false, status: 'approved', available: true },

    // Seller 3 (إبل)
    { seller: S3._id, name: 'لبن إبل طازج', type: 'milk', quantity: 25, unit: 'liter', pricePerUnit: 80, productionDate: daysAgo(0), expiryDate: daysAgo(-2), description: 'لبن إبل طازج 100% طبيعي، مفيد للصحة', deliveryAvailable: true, deliveryCost: 200, status: 'approved', available: true },

    // Seller 5 (أبقار)
    { seller: S5._id, name: 'لبن هولشتاين طازج', type: 'milk', quantity: 300, unit: 'liter', pricePerUnit: 18, productionDate: daysAgo(0), expiryDate: daysAgo(-3), description: 'لبن طازج يومي من أبقار هولشتاين', deliveryAvailable: true, deliveryCost: 60, status: 'approved', available: true, minStockAlert: 30 },
    { seller: S5._id, name: 'قشطة بلدية', type: 'cream', quantity: 20, unit: 'kg', pricePerUnit: 90, productionDate: daysAgo(1), expiryDate: daysAgo(-5), description: 'قشطة طازجة من أفضل الأبقار', deliveryAvailable: false, status: 'approved', available: true },
    { seller: S5._id, name: 'سمن بلدي', type: 'ghee', quantity: 10, unit: 'kg', pricePerUnit: 250, productionDate: daysAgo(7), expiryDate: daysAgo(-90), description: 'سمن بلدي 100% طبيعي', deliveryAvailable: true, deliveryCost: 80, status: 'pending', available: true },
  ]);
  console.log('DairyProducts done');

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUPPLIES
  // ═══════════════════════════════════════════════════════════════════════════════
  await Supply.insertMany([
    // Seller 1
    { seller: S1._id, name: 'علف أبقار مركز', category: 'feed', description: 'علف مركز عالي البروتين للأبقار الحلوب، 18% بروتين', quantity: 500, unit: 'كجم', pricePerUnit: 12, minOrderQty: 50, location: 'الجيزة', deliveryAvailable: true, deliveryCost: 200, status: 'approved' },
    { seller: S1._id, name: 'دريس برسيم', category: 'feed', description: 'دريس برسيم طازج مجفف عالي الجودة', quantity: 1000, unit: 'كجم', pricePerUnit: 4, minOrderQty: 100, location: 'الجيزة', deliveryAvailable: true, deliveryCost: 150, status: 'approved' },
    { seller: S1._id, name: 'أدوية بيطرية متنوعة', category: 'veterinary', description: 'مجموعة أدوية بيطرية شائعة الاستخدام', quantity: 50, unit: 'قطعة', pricePerUnit: 80, minOrderQty: 5, location: 'الجيزة', deliveryAvailable: false, status: 'pending' },

    // Seller 2
    { seller: S2._id, name: 'علف أغنام', category: 'feed', description: 'خليط علف متوازن للأغنام والماعز', quantity: 300, unit: 'كجم', pricePerUnit: 9, minOrderQty: 25, location: 'الإسكندرية', deliveryAvailable: true, deliveryCost: 120, status: 'approved' },
    { seller: S2._id, name: 'حبل وأدوات رعي', category: 'equipment', description: 'حبال وأدوات رعي متنوعة', quantity: 30, unit: 'قطعة', pricePerUnit: 45, minOrderQty: 1, location: 'الإسكندرية', deliveryAvailable: false, status: 'approved' },

    // Seller 3
    { seller: S3._id, name: 'علف إبل', category: 'feed', description: 'علف إبل بجودة عالية، مناسب للرعي والتسمين', quantity: 2000, unit: 'كجم', pricePerUnit: 7, minOrderQty: 200, location: 'المنيا', deliveryAvailable: true, deliveryCost: 500, status: 'approved' },
    { seller: S3._id, name: 'سرج وعدة خيل', category: 'equipment', description: 'سرج جلد طبيعي مع لجام وعدة كاملة', quantity: 5, unit: 'طقم', pricePerUnit: 3500, minOrderQty: 1, location: 'المنيا', deliveryAvailable: false, status: 'approved' },

    // Seller 4
    { seller: S4._id, name: 'علف دواجن', category: 'feed', description: 'علف دواجن لاحمة عالي البروتين', quantity: 1000, unit: 'كجم', pricePerUnit: 8, minOrderQty: 25, location: 'المنصورة', deliveryAvailable: true, deliveryCost: 100, status: 'approved' },
    { seller: S4._id, name: 'أقفاص دواجن', category: 'equipment', description: 'أقفاص مجلفنة للدواجن', quantity: 20, unit: 'قطعة', pricePerUnit: 150, minOrderQty: 1, location: 'المنصورة', deliveryAvailable: false, status: 'approved' },

    // Seller 5
    { seller: S5._id, name: 'ذرة صفراء', category: 'feed', description: 'ذرة صفراء طازجة للعلف', quantity: 5000, unit: 'كجم', pricePerUnit: 6, minOrderQty: 100, location: 'الزقازيق', deliveryAvailable: true, deliveryCost: 300, status: 'approved' },
    { seller: S5._id, name: 'لقاحات حمى القلاعية', category: 'veterinary', description: 'لقاح حمى القلاعية معتمد من وزارة الزراعة', quantity: 100, unit: 'جرعة', pricePerUnit: 25, minOrderQty: 10, location: 'الزقازيق', deliveryAvailable: true, deliveryCost: 50, status: 'approved' },
  ]);
  console.log('Supplies done');

  // ═══════════════════════════════════════════════════════════════════════════════
  // ORDERS + INCOME + REVIEWS
  // ═══════════════════════════════════════════════════════════════════════════════
  const lBySeller = (sellerId, type) => createdListings.find(l => String(l.seller) === String(sellerId) && l.type === type && l.status === 'approved');

  const L_S1_cattle  = lBySeller(S1._id, 'cattle');
  const L_S1_buffalo = lBySeller(S1._id, 'buffalo');
  const L_S2_sheep   = lBySeller(S2._id, 'sheep');
  const L_S2_sheep2  = createdListings.find(l => String(l.seller) === String(S2._id) && l.type === 'sheep' && l.status === 'approved' && l._id !== L_S2_sheep._id);
  const L_S3_camel   = lBySeller(S3._id, 'camel');
  const L_S4_poultry = lBySeller(S4._id, 'poultry');
  const L_S5_cattle  = lBySeller(S5._id, 'cattle');
  const L_S5_sheep   = lBySeller(S5._id, 'sheep');

  // We'll create 8 orders across various statuses
  const orderDefs = [
    { buyer: B1._id, seller: S1._id, listing: L_S1_cattle._id,  paymentType: 'cod',     totalAmount: 28000, status: 'completed', notes: 'التسليم عند المزرعة', deliveryLocation: { lat: 30.0131, lng: 31.2089, address: 'الجيزة' }, deliveryCost: 800, deliveryStatus: 'delivered', createdAt: daysAgo(30) },
    { buyer: B2._id, seller: S2._id, listing: L_S2_sheep._id,   paymentType: 'deposit', depositAmount: 1125, totalAmount: 4500, status: 'confirmed', notes: 'سيتم الاستلام قريباً', createdAt: daysAgo(10) },
    { buyer: B3._id, seller: S3._id, listing: L_S3_camel._id,   paymentType: 'instapay',totalAmount: 55000, status: 'completed', deliveryCost: 2500, deliveryStatus: 'delivered', createdAt: daysAgo(20) },
    { buyer: B1._id, seller: S4._id, listing: L_S4_poultry._id, paymentType: 'cod',     totalAmount: 850,   status: 'completed', deliveryStatus: 'delivered', createdAt: daysAgo(7) },
    { buyer: B4._id, seller: S5._id, listing: L_S5_cattle._id,  paymentType: 'cod',     totalAmount: 32000, status: 'pending',   notes: 'بانتظار تأكيد البائع', createdAt: daysAgo(2) },
    { buyer: B5._id, seller: S2._id, listing: L_S2_sheep2._id,  paymentType: 'cod',     totalAmount: 5200,  status: 'completed', deliveryStatus: 'delivered', createdAt: daysAgo(45) },
    { buyer: B2._id, seller: S1._id, listing: L_S1_buffalo._id, paymentType: 'deposit', depositAmount: 8750, totalAmount: 35000, status: 'confirmed', createdAt: daysAgo(5) },
    { buyer: B3._id, seller: S5._id, listing: L_S5_sheep._id,   paymentType: 'cod',     totalAmount: 4800,  status: 'cancelled', notes: 'إلغاء بطلب المشتري', createdAt: daysAgo(15) },
  ];

  const createdOrders = await Order.insertMany(orderDefs);
  console.log(`Orders: ${createdOrders.length} created`);

  // Income for completed orders
  const completedOrders = createdOrders.filter(o => o.status === 'completed');
  await Income.insertMany(completedOrders.map(o => ({
    seller: o.seller, listing: o.listing, order: o._id,
    type: 'sale', amount: o.totalAmount, date: o.createdAt,
    note: 'إيراد بيع ماشية',
  })));

  // Extra monthly income entries
  await Income.insertMany([
    { seller: S1._id, type: 'sale', amount: 9600, date: daysAgo(60), note: 'إيراد مبيعات اللبن — شهر مارس' },
    { seller: S1._id, type: 'sale', amount: 10200, date: daysAgo(30), note: 'إيراد مبيعات اللبن — شهر أبريل' },
    { seller: S5._id, type: 'sale', amount: 14400, date: daysAgo(60), note: 'إيراد مبيعات اللبن — شهر مارس' },
    { seller: S5._id, type: 'sale', amount: 15000, date: daysAgo(30), note: 'إيراد مبيعات اللبن — شهر أبريل' },
    { seller: S2._id, type: 'sale', amount: 3600, date: daysAgo(30), note: 'مبيعات جبنة ولبن — أبريل' },
    { seller: S3._id, type: 'sale', amount: 8000, date: daysAgo(30), note: 'إيراد لبن إبل — أبريل' },
  ]);
  console.log('Income done');

  // Reviews for completed orders
  const reviewDefs = [
    { buyer: B1._id, seller: S1._id, order: createdOrders[0]._id, rating: 5, comment: 'بائع ممتاز، البقرة بالضبط زي ما وصفها، ينصح به جداً' },
    { buyer: B3._id, seller: S3._id, order: createdOrders[2]._id, rating: 5, comment: 'جمل أصيل وصادق في التعامل، شكراً جزيلاً' },
    { buyer: B1._id, seller: S4._id, order: createdOrders[3]._id, rating: 4, comment: 'دجاج طازج ونظيف، سيتم الطلب مرة أخرى' },
    { buyer: B5._id, seller: S2._id, order: createdOrders[5]._id, rating: 4, comment: 'خروف ممتاز والأسعار معقولة' },
  ];
  await Review.insertMany(reviewDefs);

  // Update seller averageRating
  await User.findByIdAndUpdate(S1._id, { averageRating: 5.0, reviewCount: 1 });
  await User.findByIdAndUpdate(S2._id, { averageRating: 4.0, reviewCount: 1 });
  await User.findByIdAndUpdate(S3._id, { averageRating: 5.0, reviewCount: 1 });
  await User.findByIdAndUpdate(S4._id, { averageRating: 4.0, reviewCount: 1 });
  console.log('Reviews done');

  // ═══════════════════════════════════════════════════════════════════════════════
  // EXPENSES
  // ═══════════════════════════════════════════════════════════════════════════════
  const expenseDefs = [];
  const sellerExpenses = [
    { seller: S1._id, monthly: [{ cat: 'salary', amt: 3000 }, { cat: 'rent', amt: 2500 }, { cat: 'electricity', amt: 800 }, { cat: 'water', amt: 400 }], ops: [{ cat: 'feed', amt: 4200 }, { cat: 'doctor', amt: 350 }, { cat: 'feed', amt: 3800 }, { cat: 'transport', amt: 600 }] },
    { seller: S2._id, monthly: [{ cat: 'rent', amt: 1500 }, { cat: 'electricity', amt: 400 }], ops: [{ cat: 'feed', amt: 1800 }, { cat: 'doctor', amt: 200 }, { cat: 'feed', amt: 1600 }] },
    { seller: S3._id, monthly: [{ cat: 'salary', amt: 4000 }, { cat: 'rent', amt: 3000 }, { cat: 'electricity', amt: 1200 }, { cat: 'water', amt: 600 }, { cat: 'maintenance', amt: 800 }], ops: [{ cat: 'feed', amt: 7000 }, { cat: 'doctor', amt: 150 }, { cat: 'transport', amt: 1200 }] },
    { seller: S4._id, monthly: [{ cat: 'rent', amt: 1000 }, { cat: 'electricity', amt: 300 }], ops: [{ cat: 'feed', amt: 900 }, { cat: 'doctor', amt: 0 }, { cat: 'other', amt: 250 }] },
    { seller: S5._id, monthly: [{ cat: 'salary', amt: 3500 }, { cat: 'rent', amt: 2000 }, { cat: 'electricity', amt: 1000 }, { cat: 'water', amt: 500 }], ops: [{ cat: 'feed', amt: 5500 }, { cat: 'doctor', amt: 580 }, { cat: 'feed', amt: 5200 }, { cat: 'transport', amt: 400 }] },
  ];

  for (const se of sellerExpenses) {
    for (const m of [-90, -60, -30, 0]) {
      for (const e of se.monthly) {
        if (e.amt > 0) expenseDefs.push({ seller: se.seller, category: e.cat, amount: e.amt, date: daysAgo(-m), isMonthly: true, note: 'مصروف شهري' });
      }
    }
    for (let i = 0; i < se.ops.length; i++) {
      if (se.ops[i].amt > 0) expenseDefs.push({ seller: se.seller, category: se.ops[i].cat, amount: se.ops[i].amt, date: daysAgo(rand(1, 80)), note: 'مصروف تشغيلي' });
    }
  }

  // Vet expenses linked to sick animals
  expenseDefs.push({ seller: S1._id, category: 'doctor', amount: 350, date: daysAgo(5), note: 'علاج S1-004 التهاب ضرع' });
  expenseDefs.push({ seller: S5._id, category: 'doctor', amount: 580, date: daysAgo(8), note: 'علاج S5-005 إسهال حاد' });

  await Expense.insertMany(expenseDefs);
  console.log(`Expenses: ${expenseDefs.length} created`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // BUDGETS
  // ═══════════════════════════════════════════════════════════════════════════════
  const budgetDefs = [];
  const currentYear = 2026;
  const budgetSellers = [
    { id: S1._id, targets: { feed: 5000, doctor: 1000, salary: 3000, rent: 2500, electricity: 900, water: 400, income: 40000 } },
    { id: S2._id, targets: { feed: 2000, doctor: 500,  rent: 1500, electricity: 400, income: 15000 } },
    { id: S3._id, targets: { feed: 8000, doctor: 1000, salary: 4000, rent: 3000, electricity: 1200, water: 600, transport: 1500, income: 60000 } },
    { id: S5._id, targets: { feed: 6000, doctor: 1200, salary: 3500, rent: 2000, electricity: 1000, water: 500, income: 50000 } },
  ];

  for (const bs of budgetSellers) {
    for (const month of [3, 4, 5]) {
      for (const [cat, amt] of Object.entries(bs.targets)) {
        budgetDefs.push({ seller: bs.id, year: currentYear, month, category: cat, targetAmount: amt });
      }
    }
  }

  await Budget.insertMany(budgetDefs);
  console.log(`Budgets: ${budgetDefs.length} created`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  await Notification.insertMany([
    { user: S1._id,  type: 'medical_followup',  title: 'موعد متابعة بيطري', message: 'موعد متابعة S1-004 بعد 3 أيام', read: false },
    { user: S1._id,  type: 'vaccination_due',   title: 'موعد تطعيم', message: 'حان موعد تطعيم حمى القلاعية لـ S1-003', read: false },
    { user: S2._id,  type: 'pregnancy_due',     title: 'موعد ولادة قريب', message: 'المتوقع ولادة S2-003 خلال 105 أيام', read: false },
    { user: S3._id,  type: 'pregnancy_due',     title: 'موعد ولادة', message: 'الناقة S3-002 في الشهر السابع، الولادة قريبة', read: true },
    { user: S5._id,  type: 'medical_followup',  title: 'متابعة بيطرية', message: 'يجب متابعة S5-005 المعزول اليوم', read: false },
    { user: S5._id,  type: 'weighing_due',      title: 'موعد وزن', message: 'حان موعد وزن S5-002 اليوم', read: false },
    { user: B1._id,  type: 'order_confirmed',   title: 'تم تأكيد طلبك', message: 'تم تأكيد طلبك على بقرة فريزيان من مزرعة النيل', read: true },
    { user: B2._id,  type: 'order_confirmed',   title: 'تم تأكيد الطلب', message: 'تم تأكيد طلبك على خروف رحماني من مزرعة الإسكندرية', read: false },
    { user: B3._id,  type: 'order_confirmed',   title: 'طلبك مكتمل', message: 'اكتمل تسليم طلبك على جمل مجاهيم', read: true },
  ]);
  console.log('Notifications done');

  console.log('\n✅ All sample data seeded successfully!');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
