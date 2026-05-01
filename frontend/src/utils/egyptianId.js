/**
 * Egyptian National ID (الرقم القومي) — client-side validation
 * Mirrors the backend validation in backend/src/utils/egyptianId.js
 */

export const VALID_GOV_CODES = new Set([
  '01','02','03','04','11','12','13','14','15',
  '16','17','18','19','21','22','23','24','25',
  '26','27','28','29','31','32','33','34','35','88',
]);

export const GOV_NAMES = {
  '01':'القاهرة','02':'الإسكندرية','03':'بورسعيد','04':'السويس',
  '11':'دمياط','12':'الدقهلية','13':'الشرقية','14':'القليوبية',
  '15':'كفر الشيخ','16':'الغربية','17':'المنوفية','18':'البحيرة',
  '19':'الإسماعيلية','21':'الجيزة','22':'بني سويف','23':'الفيوم',
  '24':'المنيا','25':'أسيوط','26':'سوهاج','27':'قنا',
  '28':'الأقصر','29':'أسوان','31':'البحر الأحمر','32':'الوادي الجديد',
  '33':'مطروح','34':'شمال سيناء','35':'جنوب سيناء','88':'الخارج',
};

/**
 * @param {string} id
 * @returns {{ valid: boolean, error?: string, info?: object }}
 */
export const validateEgyptianId = (id) => {
  if (!id) return { valid: false, error: 'رقم الهوية مطلوب' };

  const digits = String(id).trim().replace(/\s/g, '');

  if (!/^\d{14}$/.test(digits))
    return { valid: false, error: 'يجب أن يتكون من 14 رقمًا بالضبط' };

  const century = digits[0];
  if (!['2', '3'].includes(century))
    return { valid: false, error: 'الرقم الأول يجب أن يكون 2 أو 3' };

  const yy    = parseInt(digits.slice(1, 3), 10);
  const month = parseInt(digits.slice(3, 5), 10);
  const day   = parseInt(digits.slice(5, 7), 10);
  const gov   = digits.slice(7, 9);

  const fullYear = (century === '2' ? 1900 : 2000) + yy;

  if (month < 1 || month > 12)
    return { valid: false, error: 'شهر الميلاد غير صحيح' };

  const daysInMonth = new Date(fullYear, month, 0).getDate();
  if (day < 1 || day > daysInMonth)
    return { valid: false, error: 'يوم الميلاد غير صحيح' };

  const birthDate = new Date(fullYear, month - 1, day);
  if (birthDate > new Date())
    return { valid: false, error: 'تاريخ الميلاد في المستقبل' };

  const minAge = new Date();
  minAge.setFullYear(minAge.getFullYear() - 16);
  if (birthDate > minAge)
    return { valid: false, error: 'يجب أن يكون العمر 16 عامًا على الأقل' };

  if (!VALID_GOV_CODES.has(gov))
    return { valid: false, error: 'كود المحافظة غير صحيح' };

  const genderDigit = parseInt(digits[12], 10);

  return {
    valid: true,
    info: {
      birthYear:       fullYear,
      birthMonth:      month,
      birthDay:        day,
      age:             new Date().getFullYear() - fullYear,
      governorateCode: gov,
      governorateName: GOV_NAMES[gov] || gov,
      gender:          genderDigit % 2 !== 0 ? 'male' : 'female',
    },
  };
};
