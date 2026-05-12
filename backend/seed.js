/**
 * seed.js — full FarmFlow data population covering every feature.
 *
 * Usage:
 *   node seed.js           # skips users that already exist
 *   node seed.js --reset   # drops ALL data first, then seeds
 */

require('dotenv').config();
const mongoose = require('mongoose');

const User          = require('./src/models/User');
const Listing       = require('./src/models/Listing');
const Order         = require('./src/models/Order');
const Expense       = require('./src/models/Expense');
const Income        = require('./src/models/Income');
const Animal        = require('./src/models/Animal');
const DairyProduct  = require('./src/models/DairyProduct');
const Supply        = require('./src/models/Supply');
const Review        = require('./src/models/Review');
const Notification  = require('./src/models/Notification');
const MedicalRecord = require('./src/models/MedicalRecord');
const AppConfig     = require('./src/models/AppConfig');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pick   = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand   = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randF  = (min, max, dp = 1) => parseFloat((Math.random() * (max - min) + min).toFixed(dp));
const maybe  = (prob, val) => Math.random() < prob ? val : undefined;

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n) {
  return daysAgo(-n);
}

// ─── Static data ─────────────────────────────────────────────────────────────

const GOVERNORATES = [
  'القاهرة','الجيزة','الإسكندرية','الدقهلية','البحيرة','القليوبية',
  'الشرقية','المنيا','أسيوط','سوهاج','قنا','أسوان','الأقصر',
  'الفيوم','بني سويف','المنوفية','الغربية','كفر الشيخ','الإسماعيلية',
];

const EGYPT_COORDS = [
  { lat: 30.0444, lng: 31.2357, gov: 'القاهرة' },
  { lat: 30.0131, lng: 31.2089, gov: 'الجيزة' },
  { lat: 31.2001, lng: 29.9187, gov: 'الإسكندرية' },
  { lat: 31.0364, lng: 31.3807, gov: 'الدقهلية' },
  { lat: 30.8480, lng: 30.3436, gov: 'البحيرة' },
  { lat: 30.3300, lng: 31.2200, gov: 'القليوبية' },
  { lat: 30.7333, lng: 31.7167, gov: 'الشرقية' },
  { lat: 28.1099, lng: 30.7503, gov: 'المنيا' },
  { lat: 27.1810, lng: 31.1837, gov: 'أسيوط' },
  { lat: 26.5590, lng: 31.6957, gov: 'سوهاج' },
];

const BREEDS = {
  cattle:  ['فريزيان','بلدي','سيمنتال','هولشتاين','برهمان'],
  buffalo: ['جاموس بلدي','مري','نيلي-راوي'],
  sheep:   ['عسيمي','بركي','رحماني','فلاحي','صحراوي'],
  goat:    ['زرايبي','بلدي','نوبي','شامي'],
  camel:   ['بلدي عربي','مجاهيم','وضح'],
  horse:   ['عربي أصيل','مصري بلدي','إنجليزي'],
  poultry: ['فراخ بلدي','روسي أبيض','ديك رومي','بط بلدي'],
  rabbit:  ['نيوزيلاندي','بلدي','كاليفورنيا','ألماني'],
  other:   ['بلدي'],
};

const LISTING_DESCRIPTIONS = [
  'حيوان صحي معتنى به جيداً، تمت جميع التطعيمات اللازمة وشهادة بيطرية متاحة',
  'تربية طبيعية بدون هرمونات أو مضادات حيوية، مثالي للعائلات',
  'من أفضل السلالات، وزن ممتاز ومناسب للذبح والتربية',
  'حيوان نظيف وسليم، جاهز للاستلام فوراً بعد إتمام الصفقة',
  'تم فحصه بيطرياً الأسبوع الماضي، صحة ممتازة بدون أي أمراض',
  'من إنتاج المزرعة مباشرةً، أصل موثوق ومعروف',
  'مناسب جداً لعيد الأضحى، وزن مثالي وصحة جيدة جداً',
  'من نسل أصيل، مربى في بيئة نظيفة وعلى أجود الأعلاف',
  'سعر مناسب لجودته، يمكن التفاوض لمن يشتري أكثر من قطعة',
  'لديه سجل طبي كامل، جميع التطعيمات مكتملة حتى هذا الشهر',
];

// ─── Users ───────────────────────────────────────────────────────────────────

const SELLERS_DATA = [
  {
    name: 'محمد عبد الرحمن الزيات',
    email: 'seller1@farmflow.com', password: 'seller123', role: 'seller',
    personalPhone: '01001234001', farmName: 'مزرعة النيل الخضراء',
    farmPhone: '01101234001', experience: '5-10',
    animalTypes: ['cattle', 'buffalo'],
    bio: 'مزرعة متخصصة في تربية الأبقار والجاموس بمحافظة الجيزة منذ أكثر من ١٥ عاماً',
    farmDescription: 'نمتلك أكثر من ٢٠٠ رأس ماشية من أجود السلالات المحلية والمستوردة، ونوفر خدمة التوصيل لجميع محافظات مصر',
    governorate: 'الجيزة', nationalId: '29001011234501',
  },
  {
    name: 'أحمد السيد حسن الشرقاوي',
    email: 'seller2@farmflow.com', password: 'seller123', role: 'seller',
    personalPhone: '01001234002', farmName: 'مزرعة الصحراء الذهبية',
    farmPhone: '01101234002', experience: '3-5',
    animalTypes: ['sheep', 'goat'],
    bio: 'خبرة واسعة في تربية الأغنام والماعز بمحافظة المنيا، متخصصون في سلالة العسيمي',
    farmDescription: 'مزرعة صغيرة لكن متكاملة، نعتمد على الرعي الطبيعي وتوفير أجود الأعلاف',
    governorate: 'المنيا', nationalId: '29002021234502',
  },
  {
    name: 'علي محمود إبراهيم الفرسي',
    email: 'seller3@farmflow.com', password: 'seller123', role: 'seller',
    personalPhone: '01001234003', farmName: 'اسطبلات الفرسان',
    farmPhone: '01101234003', experience: '>10',
    animalTypes: ['horse', 'camel'],
    bio: 'متخصصون في تربية الخيول العربية الأصيلة والجِمال، نتعامل مع أهل الخير',
    farmDescription: 'نمتلك أكثر من ٥٠ حصاناً عربياً أصيلاً وعدداً من الجِمال عالية القيمة',
    governorate: 'الشرقية', nationalId: '29003031234503',
  },
  {
    name: 'خالد عمر مصطفى الداجن',
    email: 'seller4@farmflow.com', password: 'seller123', role: 'seller',
    personalPhone: '01001234004', farmName: 'داجنة الوادي الجديد',
    farmPhone: '01101234004', experience: '1-3',
    animalTypes: ['poultry', 'rabbit'],
    bio: 'مزرعة دواجن وأرانب باستخدام أحدث أساليب التربية المكثفة',
    farmDescription: 'طاقة إنتاجية تصل إلى ٥٠٠٠ دجاجة بلدي و٣٠٠ أرنب شهرياً',
    governorate: 'الدقهلية', nationalId: '29004041234504',
  },
  {
    name: 'يوسف طارق النجار البحيري',
    email: 'seller5@farmflow.com', password: 'seller123', role: 'seller',
    personalPhone: '01001234005', farmName: 'مزرعة الدلتا الخضراء',
    farmPhone: '01101234005', experience: '5-10',
    animalTypes: ['cattle', 'sheep', 'goat'],
    bio: 'مزرعة متكاملة في قلب الدلتا — ماشية وأغنام وألبان طازجة يومياً',
    farmDescription: 'نوفر الحيوانات الحية والمنتجات الألبانية مع إمكانية التوصيل يومياً',
    governorate: 'البحيرة', nationalId: '29005051234505',
  },
  {
    name: 'حسام فتحي علي الصعيدي',
    email: 'seller6@farmflow.com', password: 'seller123', role: 'seller',
    personalPhone: '01001234006', farmName: 'مزرعة الصعيد الأخضر',
    farmPhone: '01101234006', experience: '>10',
    animalTypes: ['buffalo', 'sheep'],
    bio: 'أكبر مزرعة جاموس في أسيوط — ألبان ولحوم وجاموس حلاب بجودة لا تضاهى',
    farmDescription: 'نمتلك أكثر من ١٥٠ رأس جاموس بلدي وفريزيان، نتخصص في إنتاج الألبان والجبن البلدي',
    governorate: 'أسيوط', nationalId: '29006061234506',
  },
];

const BUYERS_DATA = [
  { name: 'سامي حمدي عبد الله',   email: 'buyer1@farmflow.com',  password: 'buyer123', role: 'buyer', phone: '01201234001', governorate: 'القاهرة' },
  { name: 'ريم أحمد الشافعي',      email: 'buyer2@farmflow.com',  password: 'buyer123', role: 'buyer', phone: '01201234002', governorate: 'الإسكندرية' },
  { name: 'طارق سعد المصري',       email: 'buyer3@farmflow.com',  password: 'buyer123', role: 'buyer', phone: '01201234003', governorate: 'القاهرة' },
  { name: 'منى حسن السيد',         email: 'buyer4@farmflow.com',  password: 'buyer123', role: 'buyer', phone: '01201234004', governorate: 'الجيزة' },
  { name: 'عمر عادل رضا',          email: 'buyer5@farmflow.com',  password: 'buyer123', role: 'buyer', phone: '01201234005', governorate: 'القليوبية' },
  { name: 'نور الدين زكي العتيل',  email: 'buyer6@farmflow.com',  password: 'buyer123', role: 'buyer', phone: '01201234006', governorate: 'الشرقية' },
  { name: 'هدى إبراهيم العزب',     email: 'buyer7@farmflow.com',  password: 'buyer123', role: 'buyer', phone: '01201234007', governorate: 'المنيا' },
  { name: 'كريم وليد السعيد',      email: 'buyer8@farmflow.com',  password: 'buyer123', role: 'buyer', phone: '01201234008', governorate: 'الدقهلية' },
  { name: 'إيمان صلاح الدين ناصر', email: 'buyer9@farmflow.com',  password: 'buyer123', role: 'buyer', phone: '01201234009', governorate: 'البحيرة' },
  { name: 'أنس محمود الغزالي',     email: 'buyer10@farmflow.com', password: 'buyer123', role: 'buyer', phone: '01201234010', governorate: 'أسيوط' },
];

// ─── Listings ─────────────────────────────────────────────────────────────────

const LISTING_TEMPLATES = [
  // Cattle
  { type: 'cattle', breed: 'فريزيان',    ageR: [18,48], wR: [350,650], pR: [25000,75000] },
  { type: 'cattle', breed: 'بلدي',        ageR: [12,36], wR: [200,450], pR: [15000,45000] },
  { type: 'cattle', breed: 'سيمنتال',    ageR: [24,60], wR: [400,700], pR: [30000,90000] },
  { type: 'cattle', breed: 'هولشتاين',   ageR: [18,42], wR: [350,600], pR: [28000,70000] },
  { type: 'cattle', breed: 'برهمان',     ageR: [20,48], wR: [300,600], pR: [22000,65000] },
  // Buffalo
  { type: 'buffalo', breed: 'جاموس بلدي', ageR: [12,48], wR: [250,600], pR: [18000,65000] },
  { type: 'buffalo', breed: 'مري',         ageR: [18,54], wR: [300,650], pR: [22000,75000] },
  { type: 'buffalo', breed: 'نيلي-راوي',  ageR: [24,60], wR: [350,700], pR: [25000,80000] },
  // Sheep
  { type: 'sheep', breed: 'عسيمي',   ageR: [4,18],  wR: [30,80],  pR: [1500,7000] },
  { type: 'sheep', breed: 'بركي',    ageR: [3,15],  wR: [25,70],  pR: [1200,6000] },
  { type: 'sheep', breed: 'رحماني',  ageR: [4,24],  wR: [35,90],  pR: [1800,8000] },
  { type: 'sheep', breed: 'فلاحي',   ageR: [3,12],  wR: [20,60],  pR: [1000,5000] },
  { type: 'sheep', breed: 'صحراوي',  ageR: [5,20],  wR: [28,75],  pR: [1400,6500] },
  // Goat
  { type: 'goat', breed: 'زرايبي',  ageR: [3,18],  wR: [20,55],  pR: [800,4500] },
  { type: 'goat', breed: 'بلدي',    ageR: [2,14],  wR: [15,45],  pR: [600,3500] },
  { type: 'goat', breed: 'نوبي',    ageR: [4,20],  wR: [25,60],  pR: [1000,5000] },
  // Camel
  { type: 'camel', breed: 'بلدي عربي', ageR: [24,96], wR: [300,700], pR: [15000,60000] },
  { type: 'camel', breed: 'مجاهيم',   ageR: [30,84], wR: [350,750], pR: [20000,80000] },
  // Horse
  { type: 'horse', breed: 'عربي أصيل',  ageR: [12,84], wR: [300,550], pR: [20000,120000] },
  { type: 'horse', breed: 'مصري بلدي',  ageR: [12,60], wR: [250,500], pR: [8000,40000] },
  // Poultry
  { type: 'poultry', breed: 'فراخ بلدي', ageR: [1,4], wR: [1,3],  pR: [80,200] },
  { type: 'poultry', breed: 'ديك رومي',  ageR: [2,6], wR: [4,12], pR: [200,600] },
  { type: 'poultry', breed: 'بط بلدي',  ageR: [1,4], wR: [1,3],  pR: [70,180] },
  // Rabbit
  { type: 'rabbit', breed: 'نيوزيلاندي', ageR: [1,5], wR: [1,3], pR: [60,200] },
  { type: 'rabbit', breed: 'بلدي',        ageR: [1,4], wR: [1,2], pR: [40,120] },
];

// Guaranteed status distribution per seller
const STATUS_POOL = ['approved','approved','approved','approved','approved','pending','pending','rejected','sold'];

function buildListings(sellers) {
  const all = [];
  sellers.forEach(seller => {
    const count = rand(9, 13);
    // Cycle statuses to guarantee coverage
    const statuses = [...STATUS_POOL];
    while (statuses.length < count) statuses.push(pick(['approved','pending']));

    for (let i = 0; i < count; i++) {
      const tmpl = pick(LISTING_TEMPLATES);
      const age    = rand(tmpl.ageR[0], tmpl.ageR[1]);
      const weight = rand(tmpl.wR[0], tmpl.wR[1]);
      const price  = rand(tmpl.pR[0], tmpl.pR[1]);
      const status = statuses[i % statuses.length];
      const delType = pick(['none','none','farm','admin']);
      const delCost = delType !== 'none' ? rand(50, 500) : undefined;
      const eid     = Math.random() > 0.45;
      const slSvc   = eid && Math.random() > 0.5;

      const doc = {
        seller: seller._id,
        type:   tmpl.type,
        breed:  tmpl.breed,
        age,
        weight,
        price,
        pricePerKg:   parseFloat((price / weight).toFixed(1)),
        description:  pick(LISTING_DESCRIPTIONS),
        status,
        location:     seller.governorate,
        deliveryType: delType,
        deliveryCost: delCost,
        eidAvailable:     eid,
        slaughterService: slSvc,
        slaughterCost:    slSvc ? rand(100, 400) : undefined,
        createdAt: daysAgo(rand(1, 150)),
      };

      // Qurbani shares on large eid animals
      if (eid && ['cattle','buffalo','camel'].includes(tmpl.type) && Math.random() > 0.45) {
        doc.qurbaniShares = [
          { shareType: 'seventh', pricePerShare: Math.round(price / 7 * 1.08), totalShares: 7, bookedShares: rand(0, 7) },
          { shareType: 'quarter', pricePerShare: Math.round(price / 4 * 1.08), totalShares: 4, bookedShares: rand(0, 4) },
          { shareType: 'half',    pricePerShare: Math.round(price / 2 * 1.08), totalShares: 2, bookedShares: rand(0, 2) },
        ];
      }

      all.push(doc);
    }
  });
  return all;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

const PAYMENT_TYPES  = ['deposit','cod','cod','instapay'];
const ORDER_STATUSES = ['pending','confirmed','completed','completed','completed','cancelled'];

function buildOrders(buyers, listings) {
  const approved = listings.filter(l => ['approved','sold'].includes(l.status));
  const orders   = [];
  const usedPairs = new Set(); // avoid identical buyer+listing duplicate issues

  for (let i = 0; i < 55; i++) {
    const listing = pick(approved);
    const buyer   = pick(buyers);
    const key     = `${buyer._id}-${listing._id}`;
    if (usedPairs.has(key)) continue;
    usedPairs.add(key);

    const status  = pick(ORDER_STATUSES);
    const payment = pick(PAYMENT_TYPES);
    const total   = listing.price + (listing.deliveryCost || 0);
    const dep     = payment === 'deposit' ? Math.round(total * 0.25) : 0;
    const coord   = pick(EGYPT_COORDS);

    orders.push({
      buyer:        buyer._id,
      seller:       listing.seller,
      listing:      listing._id,
      paymentType:  payment,
      depositAmount: dep,
      totalAmount:   total,
      status,
      notes: maybe(0.5, 'أرجو الاتصال قبل التوصيل أو الاستلام'),
      deliveryCost:   listing.deliveryCost || 0,
      deliveryStatus: status === 'completed' ? 'delivered'
                    : status === 'confirmed'  ? pick(['pending','in_transit'])
                    : 'pending',
      deliveryLocation: listing.deliveryType !== 'none' ? {
        lat:     coord.lat + randF(-0.05, 0.05, 4),
        lng:     coord.lng + randF(-0.05, 0.05, 4),
        address: `شارع ${rand(1, 200)} — ${coord.gov}`,
      } : undefined,
      createdAt: daysAgo(rand(1, 90)),
    });
  }

  return orders;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

const EXPENSE_NOTES = {
  feed:        ['شراء علف أبقار مركز وتبن','كيس سايلاج للتسمين','دريس برسيم خضر'],
  doctor:      ['رسوم كشف بيطري دوري','علاج من حمى القلاعية','جلسة طاعون وتطعيم'],
  transport:   ['نقل حيوانات لسوق المواشي','مواصلات للمزرعة الفرعية','شحن علف من التاجر'],
  electricity: ['فاتورة كهرباء شهر الحظيرة','مولد كهربائي صيانة','استهلاك مضخة المياه'],
  salary:      ['مرتب العامل الأول','مرتب العامل الثاني','مكافأة شهرية للعمال'],
  rent:        ['إيجار الأرض الشهري','إيجار المخزن','إيجار موقف الشاحنات'],
  water:       ['فاتورة مياه ري وشرب','صيانة ماسورة مياه','إصلاح خزان المياه'],
  maintenance: ['صيانة الحظيرة والسياج','إصلاح معدات التغذية','دهان وصيانة دورية'],
  other:       ['مصاريف متنوعة لم تُصنف','مشتريات عاجلة','مصاريف إدارية'],
};

function buildExpenses(sellers, listingsBySeller) {
  const all = [];

  sellers.forEach(seller => {
    const sellerListings = listingsBySeller[seller._id.toString()] || [];

    // 6 months of monthly overheads
    for (let m = 0; m < 6; m++) {
      ['electricity','salary','rent','water'].forEach(cat => {
        const amounts = { electricity: [300,1500], salary: [1200,4000], rent: [500,3000], water: [100,600] };
        all.push({
          seller:    seller._id,
          category:  cat,
          amount:    rand(...amounts[cat]),
          date:      daysAgo(m * 30 + rand(0, 3)),
          note:      pick(EXPENSE_NOTES[cat]),
          isMonthly: true,
        });
      });

      // Variable per-animal expenses each month
      for (let j = 0; j < rand(5, 9); j++) {
        const cat = pick(['feed','feed','doctor','transport','maintenance','other']);
        all.push({
          seller:  seller._id,
          listing: sellerListings.length && Math.random() > 0.4
                   ? pick(sellerListings)._id : null,
          category:  cat,
          amount:    rand(80, 3500),
          date:      daysAgo(m * 30 + rand(0, 25)),
          note:      pick(EXPENSE_NOTES[cat]),
          isMonthly: false,
        });
      }
    }

    // Extra irregular big-ticket expenses (vet visit, equipment purchase)
    for (let k = 0; k < rand(3, 6); k++) {
      all.push({
        seller:    seller._id,
        category:  pick(['doctor','maintenance','transport','other']),
        amount:    rand(500, 8000),
        date:      daysAgo(rand(1, 170)),
        note:      pick(['شراء معدات جديدة','رسوم طبيب بيطري متخصص','مصاريف تشييد حظيرة']),
        isMonthly: false,
      });
    }
  });

  return all;
}

// ─── Income ───────────────────────────────────────────────────────────────────

function buildIncomes(orders, sellers) {
  const all = [];

  orders.forEach(order => {
    if (['completed','confirmed'].includes(order.status)) {
      all.push({
        seller:  order.seller,
        listing: order.listing,
        order:   order._id,
        type:    'sale',
        amount:  order.totalAmount,
        date:    new Date(order.createdAt.getTime() + 2 * 86400000),
        note:    'عائد بيع حيوان',
      });
    }
    if (order.depositAmount > 0 && ['pending','confirmed'].includes(order.status)) {
      all.push({
        seller:  order.seller,
        listing: order.listing,
        order:   order._id,
        type:    'sale',
        amount:  order.depositAmount,
        date:    order.createdAt,
        note:    'عربون مقدم على الصفقة',
      });
    }
  });

  // Manual income entries (rental, consultancy, misc) per seller
  sellers.forEach(seller => {
    for (let i = 0; i < rand(3, 6); i++) {
      all.push({
        seller:  seller._id,
        listing: null,
        order:   null,
        type:    'sale',
        amount:  rand(200, 5000),
        date:    daysAgo(rand(1, 120)),
        note:    pick(['إيجار أرض زراعية','بيع سماد عضوي','بيع ألبان يومي','مبيعات متفرقة']),
      });
    }
  });

  return all;
}

// ─── Animals ─────────────────────────────────────────────────────────────────

const HEALTH_STATUSES  = ['healthy','healthy','healthy','healthy','sick','quarantine'];
const ANIMAL_STATUSES  = ['active','active','active','active','active','sold','deceased'];
const PREG_STATUSES    = ['none','none','none','pregnant','recently_gave_birth'];
const ANIMAL_COLORS    = ['بني','أسود','أبيض','رمادي','بني محمر','أصفر مائل للرمادي','رقطاء'];
const VETS             = ['د. أحمد سمير','د. هاني النجار','د. رضا الكيال','د. منى العزيز','د. عصام طلعت'];
const VACCINES         = ['حمى القلاعية','طاعون','جمرة خبيثة','بروسيلا','برونشيتس','نيوكاسل'];

function buildAnimals(sellers) {
  const all = [];
  const tagCounters = {};

  sellers.forEach(seller => {
    const sid = seller._id.toString();
    tagCounters[sid] = 0;
    const types = seller.animalTypes.length ? seller.animalTypes : ['cattle','sheep'];
    const count = rand(8, 14);

    for (let i = 0; i < count; i++) {
      tagCounters[sid]++;
      const type   = pick(types);
      const gender = pick(['male','female','female']);
      const dob    = daysAgo(rand(60, 1100));
      const cw     = Math.max(1, rand(5, 550));

      // Weight log (3–6 entries going up over time)
      const wLog = [];
      let w = Math.max(1, cw - rand(5, Math.max(6, Math.floor(cw * 0.25))));
      for (let ww = 0; ww < rand(3, 6); ww++) {
        wLog.push({
          date:     daysAgo(rand(ww * 20 + 5, ww * 20 + 30)),
          weightKg: Math.max(1, w),
          notes:    maybe(0.5, 'وزن دوري'),
        });
        w += rand(1, Math.max(2, Math.floor(cw * 0.05)));
      }
      wLog.sort((a, b) => a.date - b.date);

      // Vaccination log (2–4 entries)
      const vLog = [];
      for (let v = 0; v < rand(2, 4); v++) {
        vLog.push({
          vaccine:     pick(VACCINES),
          date:        daysAgo(rand(30, 250)),
          nextDueDate: daysFromNow(rand(30, 180)),
          vet:         pick(VETS),
          notes:       maybe(0.4, 'تطعيم دوري'),
        });
      }

      const health = pick(HEALTH_STATUSES);
      const status = health === 'deceased' ? 'deceased' : pick(ANIMAL_STATUSES);
      const isFemale = gender === 'female';

      all.push({
        seller:        seller._id,
        tagId:         `${sid.slice(-4)}-${String(tagCounters[sid]).padStart(3,'0')}`,
        type,
        breed:         pick(BREEDS[type] || ['بلدي']),
        gender,
        dob,
        color:         pick(ANIMAL_COLORS),
        currentWeight: cw,
        healthStatus:  health,
        status,
        pregnancyStatus:  isFemale ? pick(PREG_STATUSES) : 'none',
        pregnancyDate:    isFemale && Math.random() > 0.6 ? daysAgo(rand(30, 120)) : undefined,
        expectedBirthDate:isFemale && Math.random() > 0.6 ? daysFromNow(rand(10, 100)) : undefined,
        birthCount:       isFemale ? rand(0, 5) : 0,
        targetWeight:     Math.max(cw + 5, cw + rand(5, 100)),
        nextWeighingDate: daysFromNow(rand(2, 21)),
        weightLog:        wLog,
        vaccinationLog:   vLog,
        notes:            maybe(0.5, 'حيوان صحي ومعتنى به بشكل منتظم'),
        createdAt:        daysAgo(rand(30, 400)),
      });
    }
  });

  return all;
}

// ─── Medical Records ──────────────────────────────────────────────────────────

const DIAGNOSES  = ['حمى بكتيرية','إسهال حاد','طفيليات خارجية','كسر في القدم الأمامية','التهاب مفاصل','إصابة جلدية بالجرب','تعب عام وفقدان شهية','إصابة بالحشرات'];
const TREATMENTS = ['مضادات حيوية لمدة ٥ أيام','محاليل وريدية وأملاح','دواء طارد للطفيليات بالحقن','جبيرة وراحة تامة','مسكنات ومضادات التهاب موضعية','كريم علاجي موضعي'];
const MEDICATIONS= ['أموكسيسيلين','أمبيسيلين','سيفتريازون','إيفرمكتين 1%','ديكساميثازون','أوكسي-تتراسيكلين','فيتامين ب-كومبلكس','كالسيوم بورجلوكونات'];

function buildMedicalRecords(animals) {
  const all = [];

  animals.forEach(animal => {
    const needsRecord = animal.healthStatus === 'sick'
                      || animal.healthStatus === 'quarantine'
                      || Math.random() > 0.55;
    if (!needsRecord) return;

    const count = animal.healthStatus === 'sick' ? rand(2, 4) : rand(1, 2);
    for (let i = 0; i < count; i++) {
      all.push({
        animal:      animal._id,
        seller:      animal.seller,
        date:        daysAgo(rand(1, 200)),
        diagnosis:   pick(DIAGNOSES),
        treatment:   pick(TREATMENTS),
        medication:  pick(MEDICATIONS),
        vet:         pick(VETS),
        cost:        rand(50, 1200),
        followUpDate: maybe(0.55, daysFromNow(rand(3, 21))),
        resolved:    animal.healthStatus === 'healthy' ? true : Math.random() > 0.4,
        notes:       maybe(0.5, 'حالة تحت المتابعة الدقيقة'),
      });
    }
  });

  return all;
}

// ─── Dairy Products ───────────────────────────────────────────────────────────

const DAIRY_TEMPLATES = [
  { type: 'milk',   name: 'لبن بقري طازج',      unit: 'liter', pR: [8,15]    },
  { type: 'milk',   name: 'لبن جاموسي طازج',    unit: 'liter', pR: [12,22]   },
  { type: 'milk',   name: 'لبن ماعز طبيعي',     unit: 'liter', pR: [15,28]   },
  { type: 'cheese', name: 'جبنة بيضاء قريش',    unit: 'kg',    pR: [40,80]   },
  { type: 'cheese', name: 'جبنة رومي بلدي',     unit: 'kg',    pR: [80,150]  },
  { type: 'cheese', name: 'جبنة مطبوخة بلدي',   unit: 'kg',    pR: [50,100]  },
  { type: 'yogurt', name: 'زبادي طازج حليب بقر',unit: 'kg',    pR: [18,40]   },
  { type: 'yogurt', name: 'لبن رايب بلدي',      unit: 'kg',    pR: [15,35]   },
  { type: 'butter', name: 'زبد بلدي طازج',      unit: 'kg',    pR: [70,120]  },
  { type: 'cream',  name: 'قشطة طازجة صافية',   unit: 'kg',    pR: [30,65]   },
  { type: 'ghee',   name: 'سمن بلدي أصلي',      unit: 'kg',    pR: [100,200] },
  { type: 'ghee',   name: 'سمن جاموسي صافي',    unit: 'kg',    pR: [120,220] },
  { type: 'other',  name: 'كريمة طازجة للطهي',  unit: 'liter', pR: [25,55]   },
];

const DAIRY_STATUS_POOL = ['approved','approved','approved','approved','pending','pending','rejected'];

function buildDairyProducts(sellers) {
  const all = [];

  sellers.forEach(seller => {
    const count = rand(4, 7);
    for (let i = 0; i < count; i++) {
      const tmpl = pick(DAIRY_TEMPLATES);
      const prodDate = daysAgo(rand(0, 7));
      all.push({
        seller:      seller._id,
        name:        tmpl.name,
        type:        tmpl.type,
        quantity:    rand(5, 250),
        unit:        tmpl.unit,
        pricePerUnit: rand(tmpl.pR[0], tmpl.pR[1]),
        productionDate: prodDate,
        expiryDate:  new Date(prodDate.getTime() + rand(3,30) * 86400000),
        description: 'منتج طازج من مزرعتنا مباشرةً، خالٍ من المواد الحافظة والإضافات الصناعية',
        deliveryAvailable: Math.random() > 0.4,
        deliveryCost:      Math.random() > 0.4 ? rand(10, 60) : undefined,
        status:      DAIRY_STATUS_POOL[i % DAIRY_STATUS_POOL.length],
        available:   true,
        rejectionReason: DAIRY_STATUS_POOL[i % DAIRY_STATUS_POOL.length] === 'rejected'
                        ? 'الصور غير واضحة، يرجى إعادة الرفع' : undefined,
        createdAt:   daysAgo(rand(1, 80)),
      });
    }
  });

  return all;
}

// ─── Supplies ─────────────────────────────────────────────────────────────────

const SUPPLY_TEMPLATES = [
  { name: 'علف أبقار مركز 18% بروتين', category: 'feed',       unit: 'كجم',   pR: [5,12],     qR: [100,5000] },
  { name: 'تبن قمح مضغوط',             category: 'feed',       unit: 'طن',    pR: [600,1400], qR: [5,50]     },
  { name: 'علف أرانب بيليه',           category: 'feed',       unit: 'كجم',   pR: [8,16],     qR: [50,2000]  },
  { name: 'سايلاج ذرة طازج',           category: 'feed',       unit: 'طن',    pR: [400,900],  qR: [5,30]     },
  { name: 'بريميكس معادن ومقويات',     category: 'feed',       unit: 'كجم',   pR: [30,80],    qR: [10,200]   },
  { name: 'لقاح حمى القلاعية',         category: 'veterinary', unit: 'جرعة',  pR: [15,35],    qR: [20,500]   },
  { name: 'مضاد حيوي أموكسيسيلين بيطري',category:'veterinary', unit: 'قطعة',  pR: [25,80],    qR: [10,200]   },
  { name: 'سرنجات بيطرية ١٠مل',        category: 'veterinary', unit: 'علبة',  pR: [8,20],     qR: [20,300]   },
  { name: 'فيتامينات ADE مركبة',       category: 'veterinary', unit: 'زجاجة', pR: [30,70],    qR: [10,150]   },
  { name: 'مضخة ري بالتنقيط',          category: 'equipment',  unit: 'قطعة',  pR: [200,800],  qR: [2,30]     },
  { name: 'حوض شرب جلفانيز ٢٠٠ لتر',  category: 'equipment',  unit: 'قطعة',  pR: [200,600],  qR: [2,20]     },
  { name: 'مولد كهرباء زراعي ٥ كيلو',  category: 'equipment',  unit: 'قطعة',  pR: [3000,8000],qR: [1,5]      },
  { name: 'شبكة حظيرة جلفانيز ٢إنش',  category: 'equipment',  unit: 'متر',   pR: [30,80],    qR: [50,500]   },
  { name: 'بذور برسيم مصري فاخر',     category: 'seeds',      unit: 'كجم',   pR: [15,40],    qR: [10,300]   },
  { name: 'بذور ذرة صفراء شامية',     category: 'seeds',      unit: 'كجم',   pR: [8,18],     qR: [20,500]   },
  { name: 'بذور دراوة خضراء',         category: 'seeds',      unit: 'كجم',   pR: [10,25],    qR: [10,200]   },
  { name: 'مستلزمات حلابة أوتوماتيك', category: 'other',      unit: 'طقم',   pR: [500,3000], qR: [1,10]     },
  { name: 'أكياس تغليف ألبان ٢٠٠مل',  category: 'other',      unit: 'كرتون', pR: [40,80],    qR: [5,100]    },
];

const SUPPLY_STATUS_POOL = ['approved','approved','approved','approved','pending','pending','rejected','sold_out'];

function buildSupplies(sellers) {
  const all = [];

  sellers.forEach(seller => {
    const count = rand(3, 6);
    for (let i = 0; i < count; i++) {
      const tmpl   = pick(SUPPLY_TEMPLATES);
      const status = SUPPLY_STATUS_POOL[i % SUPPLY_STATUS_POOL.length];
      all.push({
        seller:       seller._id,
        name:         tmpl.name,
        category:     tmpl.category,
        description:  'منتج عالي الجودة، متاح بالجملة والقطاعي مع إمكانية التفاوض في الكميات الكبيرة',
        quantity:     rand(tmpl.qR[0], tmpl.qR[1]),
        unit:         tmpl.unit,
        pricePerUnit: rand(tmpl.pR[0], tmpl.pR[1]),
        minOrderQty:  rand(1, 10),
        location:     seller.governorate,
        deliveryAvailable: Math.random() > 0.4,
        deliveryCost:      Math.random() > 0.4 ? rand(20, 300) : undefined,
        status,
        rejectionReason: status === 'rejected' ? 'المنتج لا يستوفي معايير الجودة المطلوبة' : undefined,
        createdAt:    daysAgo(rand(1, 100)),
      });
    }
  });

  return all;
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

const REVIEW_COMMENTS = [
  'تجربة ممتازة! الحيوان كما وُصف تماماً والبائع متعاون جداً',
  'جودة عالية وسعر مناسب، سأتعامل معهم مجدداً بكل تأكيد',
  'خدمة رائعة والتوصيل كان سريعاً ودقيقاً في الموعد',
  'الحيوان صحي ومعتنى به، شكراً لكم على الاهتمام',
  'تجربة جيدة، يمكن تحسين سرعة الرد على الرسائل',
  'ممتاز من كل النواحي، أنصح الجميع بالتعامل معهم',
  'البائع صادق وأمين والحيوان بصحة جيدة جداً كما وصف',
  'سعر عادل وحيوان ممتاز، استلمته بحالة أحسن مما توقعت',
  'التواصل كان سهلاً والصفقة تمت بكل سلاسة ووضوح',
  'لا يوجد أي تزوير في الوصف، الحيوان بالضبط كما في الصور',
];

function buildReviews(orders) {
  const all = [];
  const completedOrders = orders.filter(o => o.status === 'completed');

  completedOrders.forEach(order => {
    if (Math.random() > 0.25) {
      all.push({
        buyer:     order.buyer,
        seller:    order.seller,
        order:     order._id,
        rating:    pick([3,4,4,4,5,5,5]),
        comment:   pick(REVIEW_COMMENTS),
        flagged:   Math.random() > 0.97,
        createdAt: new Date(order.createdAt.getTime() + rand(1,5) * 86400000),
      });
    }
  });

  return all;
}

// ─── Notifications ────────────────────────────────────────────────────────────

function buildNotifications(admin, sellers, buyers) {
  const all = [];

  // Admin notifications
  sellers.forEach(seller => {
    all.push({
      user: admin._id, type: 'listing_pending',
      title: 'إعلان جديد بانتظار المراجعة',
      message: `قدّم ${seller.name} إعلاناً جديداً يحتاج إلى موافقتك`,
      link: '/admin/listings', read: Math.random() > 0.5,
      createdAt: daysAgo(rand(1, 20)),
    });
    all.push({
      user: admin._id, type: 'dairy_pending',
      title: 'منتج ألبان بانتظار المراجعة',
      message: `أضاف ${seller.name} منتج ألبان جديد بانتظار الموافقة`,
      link: '/admin/dairy', read: Math.random() > 0.5,
      createdAt: daysAgo(rand(1, 15)),
    });
    all.push({
      user: admin._id, type: 'new_user',
      title: 'بائع جديد انضم للمنصة',
      message: `سجّل ${seller.name} بصفة بائع من محافظة ${seller.governorate}`,
      link: '/admin/users', read: Math.random() > 0.6,
      createdAt: daysAgo(rand(5, 60)),
    });
  });

  buyers.forEach(buyer => {
    all.push({
      user: admin._id, type: 'new_user',
      title: 'مشترٍ جديد انضم للمنصة',
      message: `سجّل ${buyer.name} كمشترٍ من محافظة ${buyer.governorate}`,
      link: '/admin/users', read: true,
      createdAt: daysAgo(rand(5, 60)),
    });
  });

  // Seller notifications — all types
  sellers.forEach(seller => {
    all.push({
      user: seller._id, type: 'listing_approved',
      title: 'تمت الموافقة على إعلانك',
      message: 'تمت مراجعة إعلانك والموافقة عليه، يمكن للمشترين مشاهدته الآن',
      read: Math.random() > 0.4, createdAt: daysAgo(rand(1, 30)),
    });
    all.push({
      user: seller._id, type: 'listing_rejected',
      title: 'تم رفض أحد إعلاناتك',
      message: 'تم رفض إعلانك لعدم استيفاء الشروط، راجع التفاصيل وأعد الرفع',
      link: '/seller/listings', read: Math.random() > 0.5,
      createdAt: daysAgo(rand(5, 40)),
    });
    all.push({
      user: seller._id, type: 'new_order',
      title: 'طلب شراء جديد وصلك',
      message: 'تلقيت طلب شراء جديد على أحد إعلاناتك، تحقق من التفاصيل وأكّد الطلب',
      link: '/seller/orders', read: Math.random() > 0.3,
      createdAt: daysAgo(rand(1, 10)),
    });
    all.push({
      user: seller._id, type: 'order_cancelled',
      title: 'إلغاء طلب شراء',
      message: 'تم إلغاء طلب شراء من أحد المشترين على إعلانك',
      read: Math.random() > 0.5, createdAt: daysAgo(rand(3, 25)),
    });
    all.push({
      user: seller._id, type: 'dairy_approved',
      title: 'تمت الموافقة على منتج الألبان',
      message: 'تمت مراجعة منتج الألبان الذي أضفته والموافقة عليه',
      read: true, createdAt: daysAgo(rand(2, 20)),
    });
    all.push({
      user: seller._id, type: 'dairy_rejected',
      title: 'تم رفض منتج الألبان',
      message: 'تم رفض منتج الألبان الذي أضفته، يرجى مراجعة الصور وإعادة الرفع',
      link: '/seller/dairy', read: false,
      createdAt: daysAgo(rand(5, 30)),
    });
  });

  // Buyer notifications — all types
  buyers.forEach(buyer => {
    all.push({
      user: buyer._id, type: 'order_confirmed',
      title: 'تم تأكيد طلبك',
      message: 'قام البائع بتأكيد طلبك، سيتم التواصل معك قريباً لترتيب الاستلام',
      link: '/buyer/orders', read: Math.random() > 0.4,
      createdAt: daysAgo(rand(1, 20)),
    });
    all.push({
      user: buyer._id, type: 'order_in_transit',
      title: 'طلبك في الطريق إليك',
      message: 'الحيوان في طريقه إليك الآن، تابع التوصيل من صفحة طلباتك',
      link: '/buyer/orders', read: Math.random() > 0.5,
      createdAt: daysAgo(rand(1, 10)),
    });
    all.push({
      user: buyer._id, type: 'order_completed',
      title: 'اكتمل طلبك بنجاح',
      message: 'تم استلام طلبك وإتمام الصفقة، يسعدنا تقييمك للبائع',
      link: '/buyer/orders', read: Math.random() > 0.5,
      createdAt: daysAgo(rand(2, 15)),
    });
    all.push({
      user: buyer._id, type: 'general',
      title: 'عروض عيد الأضحى متاحة الآن',
      message: 'تصفح أفضل العروض والأسعار للأضاحي قبل العيد مباشرةً',
      link: '/browse', read: Math.random() > 0.6,
      createdAt: daysAgo(rand(1, 7)),
    });
  });

  return all;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  if (process.argv.includes('--reset')) {
    await mongoose.connection.dropDatabase();
    console.log('Database dropped.\n');
  }

  // ── 1. Users ────────────────────────────────────────────────────────────────
  console.log('Creating users…');
  const adminDoc = await User.findOne({ email: 'admin@farmflow.com' })
                 || await User.create({ name: 'Admin', email: 'admin@farmflow.com', password: 'admin123', role: 'admin', isActive: true });
  console.log(`  admin   → ${adminDoc.email}`);

  const sellers = [];
  for (const sd of SELLERS_DATA) {
    const u = await User.findOne({ email: sd.email }) || await User.create({ ...sd, isActive: true });
    sellers.push(u);
    console.log(`  seller  → ${u.email}`);
  }

  const buyers = [];
  for (const bd of BUYERS_DATA) {
    const u = await User.findOne({ email: bd.email }) || await User.create({ ...bd, isActive: true });
    buyers.push(u);
    console.log(`  buyer   → ${u.email}`);
  }

  // savedFarms — some buyers follow some sellers
  for (const buyer of buyers) {
    const savedCount = rand(1, 4);
    const shuffled   = [...sellers].sort(() => Math.random() - 0.5).slice(0, savedCount);
    await User.findByIdAndUpdate(buyer._id, { savedFarms: shuffled.map(s => s._id) });
  }
  console.log('  savedFarms set for all buyers\n');

  // ── 2. Listings ──────────────────────────────────────────────────────────────
  console.log('Creating listings…');
  const listingDocs = buildListings(sellers);
  const listings    = await Listing.insertMany(listingDocs);

  const listingsBySeller = {};
  listings.forEach(l => {
    const k = l.seller.toString();
    if (!listingsBySeller[k]) listingsBySeller[k] = [];
    listingsBySeller[k].push(l);
  });

  const statusCounts = {};
  listings.forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });
  console.log(`  → ${listings.length} listings  ${JSON.stringify(statusCounts)}\n`);

  // ── 3. Orders ────────────────────────────────────────────────────────────────
  console.log('Creating orders…');
  const orderDocs = buildOrders(buyers, listings);
  const orders    = await Order.insertMany(orderDocs);

  const oCounts = {};
  orders.forEach(o => { oCounts[o.status] = (oCounts[o.status] || 0) + 1; });
  console.log(`  → ${orders.length} orders  ${JSON.stringify(oCounts)}\n`);

  // ── 4. Expenses ──────────────────────────────────────────────────────────────
  console.log('Creating expenses…');
  const expDocs  = buildExpenses(sellers, listingsBySeller);
  const expenses = await Expense.insertMany(expDocs);
  console.log(`  → ${expenses.length} expenses\n`);

  // ── 5. Income ────────────────────────────────────────────────────────────────
  console.log('Creating income records…');
  const incDocs = buildIncomes(orders, sellers);
  const incomes = await Income.insertMany(incDocs);
  console.log(`  → ${incomes.length} income records\n`);

  // ── 6. Animals ───────────────────────────────────────────────────────────────
  console.log('Creating farm animals…');
  const animalDocs = buildAnimals(sellers);
  const animals    = await Animal.insertMany(animalDocs);

  const aCounts = {};
  animals.forEach(a => { aCounts[a.healthStatus] = (aCounts[a.healthStatus] || 0) + 1; });
  console.log(`  → ${animals.length} animals  ${JSON.stringify(aCounts)}\n`);

  // ── 7. Medical Records ───────────────────────────────────────────────────────
  console.log('Creating medical records…');
  const medDocs = buildMedicalRecords(animals);
  const medRecs = await MedicalRecord.insertMany(medDocs);
  console.log(`  → ${medRecs.length} medical records\n`);

  // ── 8. Dairy Products ────────────────────────────────────────────────────────
  console.log('Creating dairy products…');
  const dairyDocs = buildDairyProducts(sellers);
  const dairies   = await DairyProduct.insertMany(dairyDocs);

  const dCounts = {};
  dairies.forEach(d => { dCounts[d.status] = (dCounts[d.status] || 0) + 1; });
  console.log(`  → ${dairies.length} dairy products  ${JSON.stringify(dCounts)}\n`);

  // ── 9. Supplies ──────────────────────────────────────────────────────────────
  console.log('Creating supplies…');
  const supDocs    = buildSupplies(sellers);
  const supplies   = await Supply.insertMany(supDocs);

  const sCounts = {};
  supplies.forEach(s => { sCounts[s.status] = (sCounts[s.status] || 0) + 1; });
  console.log(`  → ${supplies.length} supplies  ${JSON.stringify(sCounts)}\n`);

  // ── 10. Reviews ──────────────────────────────────────────────────────────────
  console.log('Creating reviews…');
  const reviewDocs = buildReviews(orders);
  const reviews    = await Review.insertMany(reviewDocs);
  console.log(`  → ${reviews.length} reviews`);

  // Update seller average ratings from reviews
  for (const seller of sellers) {
    const sellerReviews = reviews.filter(r => r.seller.toString() === seller._id.toString());
    if (sellerReviews.length) {
      const avg = sellerReviews.reduce((s, r) => s + r.rating, 0) / sellerReviews.length;
      await User.findByIdAndUpdate(seller._id, {
        averageRating: parseFloat(avg.toFixed(1)),
        reviewCount:   sellerReviews.length,
      });
    }
  }
  console.log('  ratings updated on all sellers\n');

  // ── 11. Notifications ────────────────────────────────────────────────────────
  console.log('Creating notifications…');
  const notifDocs = buildNotifications(adminDoc, sellers, buyers);
  const notifs    = await Notification.insertMany(notifDocs);
  console.log(`  → ${notifs.length} notifications\n`);

  // ── 12. AppConfig ────────────────────────────────────────────────────────────
  console.log('Setting AppConfig…');
  await AppConfig.findOneAndUpdate(
    { _singleton: 'main' },
    { eidMode: false, eidDate: new Date('2026-06-17') },
    { upsert: true },
  );
  console.log('  eidMode: false  |  eidDate: 2026-06-17\n');

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('══════════════════════════════════════════');
  console.log('  Seed complete!');
  console.log('──────────────────────────────────────────');
  console.log(`  Users        : 1 admin + ${sellers.length} sellers + ${buyers.length} buyers`);
  console.log(`  Listings     : ${listings.length}`);
  console.log(`  Orders       : ${orders.length}`);
  console.log(`  Expenses     : ${expenses.length}`);
  console.log(`  Income       : ${incomes.length}`);
  console.log(`  Animals      : ${animals.length}`);
  console.log(`  Med Records  : ${medRecs.length}`);
  console.log(`  Dairy        : ${dairies.length}`);
  console.log(`  Supplies     : ${supplies.length}`);
  console.log(`  Reviews      : ${reviews.length}`);
  console.log(`  Notifications: ${notifs.length}`);
  console.log('──────────────────────────────────────────');
  console.log('  admin@farmflow.com       / admin123');
  console.log('  seller1-6@farmflow.com   / seller123');
  console.log('  buyer1-10@farmflow.com   / buyer123');
  console.log('══════════════════════════════════════════\n');

  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
