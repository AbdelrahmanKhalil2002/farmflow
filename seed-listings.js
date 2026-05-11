/**
 * seed-listings.js
 * Seeds 2000 listings for khalilbido05@gmail.com
 * 400 × each status: approved, rejected, sold, draft, pending
 * Includes multiple real images per listing.
 *
 * Usage: node seed-listings.js
 */

require('dotenv').config({ path: './backend/.env' });
const mongoose = require('./backend/node_modules/mongoose');
const { Schema, Types: { ObjectId } } = mongoose;

const MONGO_URI    = process.env.MONGO_URI;
const SELLER_EMAIL = 'khalilbido05@gmail.com';
const PER_STATUS   = 400;

// ── Inline models ─────────────────────────────────────────────────────────────
const User    = mongoose.model('User',    new Schema({ email: String }, { collection: 'users' }));
const Listing = mongoose.model('Listing', new Schema({
  seller:            { type: ObjectId, ref: 'User', required: true },
  type:              { type: String, required: true },
  breed:             String,
  age:               { type: Number, required: true },
  weight:            { type: Number, required: true },
  price:             { type: Number, required: true },
  description:       String,
  images:            { type: [String], default: [] },
  status:            { type: String, default: 'pending' },
  location:          String,
  pricePerKg:        Number,
  deliveryType:      { type: String, default: 'none' },
  deliveryCost:      Number,
  eidAvailable:      { type: Boolean, default: false },
  slaughterService:  { type: Boolean, default: false },
  slaughterCost:     Number,
  depositRequired:   { type: Boolean, default: false },
  depositPercentage: Number,
  qurbaniShares:     { type: Array, default: [] },
}, { timestamps: true, collection: 'listings' }));

// ── Reliable picsum.photos images (consistent per seed key) ──────────────────
// Each type gets 6 unique seeds so listings have variety
const IMAGES = {
  cattle:  [
    'https://picsum.photos/seed/cattle1/640/480',
    'https://picsum.photos/seed/cattle2/640/480',
    'https://picsum.photos/seed/cattle3/640/480',
    'https://picsum.photos/seed/cattle4/640/480',
    'https://picsum.photos/seed/cattle5/640/480',
    'https://picsum.photos/seed/cattle6/640/480',
  ],
  buffalo: [
    'https://picsum.photos/seed/buffalo1/640/480',
    'https://picsum.photos/seed/buffalo2/640/480',
    'https://picsum.photos/seed/buffalo3/640/480',
    'https://picsum.photos/seed/buffalo4/640/480',
    'https://picsum.photos/seed/buffalo5/640/480',
    'https://picsum.photos/seed/buffalo6/640/480',
  ],
  sheep:   [
    'https://picsum.photos/seed/sheep1/640/480',
    'https://picsum.photos/seed/sheep2/640/480',
    'https://picsum.photos/seed/sheep3/640/480',
    'https://picsum.photos/seed/sheep4/640/480',
    'https://picsum.photos/seed/sheep5/640/480',
    'https://picsum.photos/seed/sheep6/640/480',
  ],
  goat:    [
    'https://picsum.photos/seed/goat1/640/480',
    'https://picsum.photos/seed/goat2/640/480',
    'https://picsum.photos/seed/goat3/640/480',
    'https://picsum.photos/seed/goat4/640/480',
    'https://picsum.photos/seed/goat5/640/480',
    'https://picsum.photos/seed/goat6/640/480',
  ],
  camel:   [
    'https://picsum.photos/seed/camel1/640/480',
    'https://picsum.photos/seed/camel2/640/480',
    'https://picsum.photos/seed/camel3/640/480',
    'https://picsum.photos/seed/camel4/640/480',
    'https://picsum.photos/seed/camel5/640/480',
    'https://picsum.photos/seed/camel6/640/480',
  ],
};

// ── Listing data — المواشي الخمسة فقط ────────────────────────────────────────
const TYPES = ['cattle', 'buffalo', 'sheep', 'goat', 'camel'];

const CONFIG = {
  cattle:  { breeds:['فريزيان','هولشتاين','براون سويس','بلدي مصري','سيمنتال','أبردين أنجوس'], minW:280, maxW:580, minA:12, maxA:84,  minP:8000,  maxP:35000 },
  buffalo: { breeds:['جاموس مصري','نيلي رافي','مرة','بلدي نيلي'],                             minW:380, maxW:680, minA:18, maxA:96,  minP:12000, maxP:45000 },
  sheep:   { breeds:['أوسيمي','بركاوي','رومانوف','دمياطي','رحماني','أوباسي','صحراوي'],         minW:35,  maxW:95,  minA:3,  maxA:48,  minP:1200,  maxP:6000  },
  goat:    { breeds:['زرايبي','نوبي','بلدي مصري','شامي','الألبين','بوعر','سانين'],             minW:22,  maxW:58,  minA:3,  maxA:60,  minP:800,   maxP:4500  },
  camel:   { breeds:['عربي أصيل','سوداني','مغربي','صومالي','رقيبي','شعل'],                    minW:380, maxW:720, minA:24, maxA:144, minP:20000, maxP:90000 },
};

const LOCATIONS = [
  'القاهرة','الجيزة','الإسكندرية','المنصورة','أسيوط','سوهاج',
  'الفيوم','بني سويف','المنيا','قنا','الأقصر','أسوان',
  'طنطا','المحلة الكبرى','الزقازيق','الإسماعيلية','بورسعيد',
  'دمياط','كفر الشيخ','شبرا الخيمة','العاشر من رمضان',
  'الرياض','جدة','الدمام','أبوظبي','دبي','الكويت',
];

const DESCRIPTIONS = [
  'حيوان صحي ومعافى، تربية نظيفة على أعلاف طبيعية، جاهز للبيع الفوري.',
  'من أفضل السلالات، تغذية متوازنة وبيئة نظيفة طوال فترة التربية.',
  'مربى في مزرعة خاصة، يحمل كامل التطعيمات وشهادة صحية معتمدة.',
  'حيوان هادئ الطباع، سهل التعامل، مناسب للعائلات والمزارع الصغيرة.',
  'وزن مثالي وبنية جسمية ممتازة، فحص بيطري دوري ومتابعة منتظمة.',
  'تربية منزلية نظيفة، علف طبيعي مع إضافات معدنية لضمان صحة جيدة.',
  'مناسب لعيد الأضحى، سليم ومستوفٍ لجميع الشروط الشرعية والصحية.',
  'من إنتاج مزرعة معتمدة، يأتي مع ضمان الصحة وشهادة المنشأ.',
  'حيوان نشيط وبصحة ممتازة، مثالي للتربية والتكاثر أو للبيع الفوري.',
  'أصيل ومربى بشكل طبيعي على المراعي، بعيداً عن الهرمونات الصناعية.',
  'فرصة لا تعوض للمربين، سعر مناسب مع ضمان الجودة وإمكانية الفحص.',
  'من نتاج أفضل المزارع، يستحق كل ريال، أُنصح بالفحص قبل الشراء.',
];

const REJECTION_REASONS = [
  'الصور غير واضحة أو ناقصة.',
  'وصف الحيوان لا يتطابق مع المتطلبات.',
  'عدم استيفاء اشتراطات الصحة البيطرية.',
  'السعر خارج النطاق المسموح به.',
  'معلومات الاتصال غير مكتملة.',
];

const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const pick = (arr) => arr[rand(0, arr.length - 1)];

function buildListing(index, status, sellerId) {
  const type   = pick(TYPES);
  const cfg    = CONFIG[type];
  const weight = rand(cfg.minW, cfg.maxW);
  const price  = rand(cfg.minP, cfg.maxP);
  const imgs   = IMAGES[type] || IMAGES.other;

  // 2–4 images per listing, cycling through available ones
  const imgCount = rand(2, Math.min(4, imgs.length));
  const images   = [];
  for (let i = 0; i < imgCount; i++) {
    images.push(imgs[(index + i) % imgs.length]);
  }

  const base = {
    seller:      sellerId,
    type,
    breed:       pick(cfg.breeds),
    age:         rand(cfg.minA, cfg.maxA),
    weight,
    price,
    pricePerKg:  Math.round((price / weight) * 10) / 10,
    description: pick(DESCRIPTIONS),
    images,
    status,
    location:    pick(LOCATIONS),
    deliveryType: pick(['none', 'none', 'none', 'farm', 'admin']),
    eidAvailable: Math.random() > 0.6,
    slaughterService: Math.random() > 0.7,
  };

  if (base.deliveryType !== 'none') base.deliveryCost = rand(50, 500);
  if (base.slaughterService)        base.slaughterCost = rand(100, 400);
  if (Math.random() > 0.8) {
    base.depositRequired   = true;
    base.depositPercentage = pick([10, 20, 25, 30, 50]);
  }

  return base;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('FarmFlow Listings Seeder\n');
  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB\n');

  const seller = await User.findOne({ email: SELLER_EMAIL });
  if (!seller) throw new Error(`User not found: ${SELLER_EMAIL}`);
  console.log(`✓ Found seller: ${seller._id}\n`);

  const STATUSES = ['approved', 'rejected', 'sold', 'draft', 'pending'];
  let total = 0;

  for (const status of STATUSES) {
    console.log(`── Inserting ${PER_STATUS} listings [${status}]…`);
    const docs = [];
    for (let i = 0; i < PER_STATUS; i++) {
      docs.push(buildListing(total + i, status, seller._id));
    }
    try {
      const result = await Listing.insertMany(docs, { ordered: false });
      total += result.length;
      console.log(`  ✓ ${result.length} inserted  (running total: ${total})`);
    } catch (err) {
      const inserted = err.insertedDocs?.length || (err.result?.nInserted ?? 0);
      total += inserted;
      console.log(`  ⚠ ${inserted} inserted, some skipped: ${err.message?.slice(0, 80)}`);
    }
  }

  console.log(`\n══════════════════════════════════`);
  console.log(`✓ Done — ${total} listings seeded for ${SELLER_EMAIL}`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
