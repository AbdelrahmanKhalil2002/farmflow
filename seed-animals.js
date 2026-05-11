/**
 * seed-animals.js
 * Adds 100 cattle, 100 buffalo, 100 sheep, 100 goat, 100 camel
 * to a seller account via the FarmFlow REST API.
 *
 * Usage:  node seed-animals.js
 */

const API_BASE = 'https://xn--pgbnc3a9c8a.com/api';
const EMAIL    = 'khalilbido05@gmail.com';
const PASSWORD = '!bido2002';

// ── Public-domain images (Wikimedia Commons) ─────────────────────────────────
const IMAGE_URLS = {
  cattle: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Cow_female_black_white.jpg/800px-Cow_female_black_white.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Cow_female_black_white.jpg/640px-Cow_female_black_white.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Cattle_in_norway.jpg/800px-Cattle_in_norway.jpg',
  ],
  buffalo: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Water_buffalo_large.jpg/800px-Water_buffalo_large.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Domestic_Water_Buffalo.jpg/800px-Domestic_Water_Buffalo.jpg',
  ],
  sheep: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Ovis_orientalis_aries_Merinolandschaf.jpg/800px-Ovis_orientalis_aries_Merinolandschaf.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Woolly_Sheep_Portrait.jpg/800px-Woolly_Sheep_Portrait.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Lamb_portrait.jpg/800px-Lamb_portrait.jpg',
  ],
  goat: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Hausziege_04.jpg/800px-Hausziege_04.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Domestic_goat_kid_in_capeweed.jpg/800px-Domestic_goat_kid_in_capeweed.jpg',
  ],
  camel: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Camelus_dromedarius_%28camel_in_Dubai%29.jpg/800px-Camelus_dromedarius_%28camel_in_Dubai%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Arabian-Camel-Dromedary-800x600.jpg/800px-Arabian-Camel-Dromedary-800x600.jpg',
  ],
};

// ── Realistic livestock data ──────────────────────────────────────────────────
const ANIMALS_CONFIG = {
  cattle: {
    breeds:  ['فريزيان', 'هولشتاين', 'براون سويس', 'بلدي مصري', 'سيمنتال', 'أبردين أنجوس'],
    colors:  ['أسود وأبيض', 'بني', 'أحمر وأبيض', 'بيج', 'رمادي'],
    minW: 280, maxW: 580,
    genders: ['female', 'female', 'female', 'male'],
    vaccines: ['تحصين الحمى القلاعية', 'تحصين الجمرة الخبيثة', 'تحصين اللمكوز', 'تحصين الطاعون البقري'],
  },
  buffalo: {
    breeds:  ['جاموس مصري', 'نيلي رافي', 'مرة', 'بلدي'],
    colors:  ['رمادي داكن', 'أسود', 'رمادي'],
    minW: 380, maxW: 680,
    genders: ['female', 'female', 'male'],
    vaccines: ['تحصين الحمى القلاعية', 'تحصين الجمرة الخبيثة', 'تحصين الطاعون البقري'],
  },
  sheep: {
    breeds:  ['أوسيمي', 'بركاوي', 'رومانوف', 'دمياطي', 'رحماني', 'أوباسي'],
    colors:  ['أبيض', 'بني فاتح', 'أسود وأبيض', 'رمادي', 'بيج'],
    minW: 35, maxW: 95,
    genders: ['female', 'female', 'male'],
    vaccines: ['تحصين الجدري', 'تحصين اللسان الأزرق', 'تحصين الطاعون الصغير'],
  },
  goat: {
    breeds:  ['زرايبي', 'نوبي', 'بلدي', 'شامي', 'الألبين', 'بوعر'],
    colors:  ['أبيض', 'بني', 'أسود', 'رقطاء', 'بني وأبيض'],
    minW: 22, maxW: 58,
    genders: ['female', 'female', 'male'],
    vaccines: ['تحصين الجدري', 'تحصين الطاعون الصغير', 'تحصين اللسان الأزرق'],
  },
  camel: {
    breeds:  ['عربي أصيل', 'سوداني', 'مغربي', 'صومالي', 'رقيبي'],
    colors:  ['بيج', 'بني فاتح', 'رملي', 'بني داكن', 'أبيض'],
    minW: 380, maxW: 720,
    genders: ['female', 'male', 'male'],
    vaccines: ['تحصين الجدري', 'تحصين الكوروناء الجملية', 'تحصين التهاب الكبد'],
  },
};

const VETS = ['د. أحمد العطار', 'د. محمد السيد', 'د. علي حسن', 'د. خالد عبد الله', 'د. سامي النجار'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function rand(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function pick(arr)       { return arr[rand(0, arr.length - 1)]; }

function randDate(yearsBack) {
  const ms = Date.now() - rand(0, yearsBack * 365 * 24 * 3600 * 1000);
  return new Date(ms).toISOString().split('T')[0];
}

async function downloadImage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FarmFlow-Seeder/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed: ${JSON.stringify(data)}`);
  console.log(`✓ Logged in as ${data.user?.name || EMAIL}`);
  return data.token;
}

async function createAnimal(token, animalData, imageBufs = []) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(animalData)) {
    if (v !== undefined && v !== null) fd.append(k, String(v));
  }
  for (let i = 0; i < imageBufs.length; i++) {
    if (imageBufs[i]) {
      fd.append('images', new Blob([imageBufs[i]], { type: 'image/jpeg' }), `photo_${i + 1}.jpg`);
    }
  }
  const res = await fetch(`${API_BASE}/animals`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function addVaccination(token, animalId, vaccine, vet) {
  const date     = randDate(2);
  const next     = new Date(Date.now() + rand(90, 365) * 24 * 3600 * 1000).toISOString().split('T')[0];
  await fetch(`${API_BASE}/animals/${animalId}/vaccination`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ vaccine, date, nextDueDate: next, vet }),
  });
}

async function addWeight(token, animalId, weightKg) {
  await fetch(`${API_BASE}/animals/${animalId}/weight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ weightKg, date: randDate(1) }),
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('FarmFlow Animal Seeder — 500 animals\n');

  const token = await login();

  // Pre-download images per type (so we don't re-download for every animal)
  console.log('↓  Downloading animal images…');
  const imageCache = {};
  for (const [type, urls] of Object.entries(IMAGE_URLS)) {
    imageCache[type] = [];
    for (const url of urls) {
      const buf = await downloadImage(url);
      if (buf) {
        imageCache[type].push(buf);
        process.stdout.write('.');
      }
    }
  }
  console.log('\n');

  const TYPES = ['cattle', 'buffalo', 'sheep', 'goat', 'camel'];
  const TYPE_AR = { cattle: 'بقرة', buffalo: 'جاموسة', sheep: 'خروف', goat: 'ماعز', camel: 'جمل' };
  let total = 0;
  let failed = 0;

  for (const type of TYPES) {
    const cfg    = ANIMALS_CONFIG[type];
    const images = imageCache[type];
    console.log(`\n── Adding 100 ${TYPE_AR[type]} (${type}) ──`);

    for (let i = 1; i <= 100; i++) {
      const weight  = rand(cfg.minW, cfg.maxW);
      const gender  = pick(cfg.genders);
      const maxYears = type === 'camel' ? 10 : type === 'cattle' || type === 'buffalo' ? 7 : 5;

      const animalData = {
        type,
        breed:         pick(cfg.breeds),
        gender,
        color:         pick(cfg.colors),
        tagId:         `${type.toUpperCase().slice(0, 3)}-${String(i).padStart(3, '0')}`,
        dob:           randDate(maxYears),
        currentWeight: weight,
        healthStatus:  Math.random() > 0.05 ? 'healthy' : 'sick',
        notes:         gender === 'female' && Math.random() > 0.7
          ? 'بقرة منتجة للحليب، تحت المراقبة الدورية'
          : undefined,
      };

      // Pick 1-2 images cycling through the available ones
      const picked = [];
      if (images.length > 0) {
        picked.push(images[i % images.length]);
        if (images.length > 1 && Math.random() > 0.5) picked.push(images[(i + 1) % images.length]);
      }

      try {
        const animal = await createAnimal(token, animalData, picked);

        // Add 1-2 vaccinations
        const numVacs = rand(1, 2);
        for (let v = 0; v < numVacs; v++) {
          await addVaccination(token, animal._id, pick(cfg.vaccines), pick(VETS));
        }

        // Add a historical weight entry (so there's a trend)
        const prevWeight = weight - rand(5, 30);
        if (prevWeight > 0) {
          await addWeight(token, animal._id, prevWeight);
        }

        total++;
        if (i % 10 === 0) process.stdout.write(`  [${i}/100]\n`);
        else process.stdout.write('.');
      } catch (err) {
        failed++;
        console.error(`\n  ✗ Failed animal ${type}-${i}: ${err.message}`);
      }
    }
    console.log(`  ✓ Done — ${total} created so far`);
  }

  console.log(`\n══════════════════════════════════`);
  console.log(`✓ Seeding complete: ${total} animals created, ${failed} failed`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
