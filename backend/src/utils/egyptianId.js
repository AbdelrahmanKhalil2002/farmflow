/**
 * Egyptian National ID (الرقم القومي) Validation
 *
 * Structure (14 digits):
 *  [0]     - Century: 2 = 1900s, 3 = 2000s
 *  [1-2]   - Year of birth (YY)
 *  [3-4]   - Month of birth (MM)
 *  [5-6]   - Day of birth (DD)
 *  [7-8]   - Governorate code
 *  [9-12]  - Sequence number (odd pos 12 = male, even = female)
 *  [13]    - Check digit
 *
 * This module validates format, date integrity, and governorate code.
 * Actual Civil Registry lookup requires an official government API
 * (EDA / Nafaz) — replace verifyWithRegistry() when credentials are available.
 */

const VALID_GOV_CODES = new Set([
  '01','02','03','04','11','12','13','14','15',
  '16','17','18','19','21','22','23','24','25',
  '26','27','28','29','31','32','33','34','35','88',
]);

const GOV_NAMES = {
  '01':'القاهرة','02':'الإسكندرية','03':'بورسعيد','04':'السويس',
  '11':'دمياط','12':'الدقهلية','13':'الشرقية','14':'القليوبية',
  '15':'كفر الشيخ','16':'الغربية','17':'المنوفية','18':'البحيرة',
  '19':'الإسماعيلية','21':'الجيزة','22':'بني سويف','23':'الفيوم',
  '24':'المنيا','25':'أسيوط','26':'سوهاج','27':'قنا',
  '28':'الأقصر','29':'أسوان','31':'البحر الأحمر','32':'الوادي الجديد',
  '33':'مطروح','34':'شمال سيناء','35':'جنوب سيناء','88':'الخارج',
};

/**
 * Validates the format and structural integrity of an Egyptian National ID.
 * @param {string} id - 14-digit national ID string
 * @returns {{ valid: boolean, error?: string, info?: object }}
 */
const validateEgyptianId = (id) => {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'رقم الهوية مطلوب' };
  }

  const digits = id.trim().replace(/\s/g, '');

  if (!/^\d{14}$/.test(digits)) {
    return { valid: false, error: 'رقم الهوية يجب أن يتكون من 14 رقمًا بالضبط' };
  }

  const century = digits[0];
  if (!['2', '3'].includes(century)) {
    return { valid: false, error: 'الرقم القومي غير صحيح (الرقم الأول يجب أن يكون 2 أو 3)' };
  }

  const yy    = parseInt(digits.slice(1, 3), 10);
  const month = parseInt(digits.slice(3, 5), 10);
  const day   = parseInt(digits.slice(5, 7), 10);
  const gov   = digits.slice(7, 9);

  const fullYear = (century === '2' ? 1900 : 2000) + yy;

  if (month < 1 || month > 12) {
    return { valid: false, error: 'شهر الميلاد في الرقم القومي غير صحيح' };
  }

  const daysInMonth = new Date(fullYear, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return { valid: false, error: 'يوم الميلاد في الرقم القومي غير صحيح' };
  }

  const birthDate = new Date(fullYear, month - 1, day);
  if (birthDate > new Date()) {
    return { valid: false, error: 'تاريخ الميلاد في المستقبل' };
  }

  // Must be at least 16 years old
  const minAge = new Date();
  minAge.setFullYear(minAge.getFullYear() - 16);
  if (birthDate > minAge) {
    return { valid: false, error: 'يجب أن يكون العمر 16 عامًا على الأقل' };
  }

  if (!VALID_GOV_CODES.has(gov)) {
    return { valid: false, error: 'كود المحافظة في الرقم القومي غير صحيح' };
  }

  const genderDigit = parseInt(digits[12], 10);
  const gender      = genderDigit % 2 !== 0 ? 'male' : 'female';

  const birth = `${fullYear}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  return {
    valid: true,
    info: {
      birthDate:      birth,
      birthYear:      fullYear,
      birthMonth:     month,
      birthDay:       day,
      age:            new Date().getFullYear() - fullYear,
      governorateCode: gov,
      governorateName: GOV_NAMES[gov] || gov,
      gender,
    },
  };
};

/**
 * Mock Civil Registry verification.
 * Replace the body with a real HTTP call to EDA/Nafaz when API keys are available.
 *
 * @param {string} id
 * @returns {Promise<{ verified: boolean, info?: object, error?: string }>}
 */
const verifyWithRegistry = async (id) => {
  const result = validateEgyptianId(id);
  if (!result.valid) return { verified: false, error: result.error };

  // ── PLACEHOLDER ──────────────────────────────────────────────────────────────
  // Replace this block with an actual API call when credentials are available:
  //
  //   const response = await axios.post(process.env.EDA_API_URL, {
  //     nationalId: id,
  //     apiKey:     process.env.EDA_API_KEY,
  //   });
  //   return { verified: response.data.valid, info: result.info };
  // ─────────────────────────────────────────────────────────────────────────────

  return { verified: true, info: result.info };
};

module.exports = { validateEgyptianId, verifyWithRegistry, GOV_NAMES };
