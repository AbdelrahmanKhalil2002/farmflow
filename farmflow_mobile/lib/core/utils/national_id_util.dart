/// Egyptian National ID parser & validator.
/// Format: BYYMMDDGGGXXXC  (14 digits)
///   B   = century (2=1900s, 3=2000s)
///   YYMMDD = birth date
///   GGG = governorate code
///   XXX = sequence
///   C   = last digit (odd=male, even=female)
class NationalIdInfo {
  final bool isValid;
  final DateTime? birthDate;
  final int? age;
  final String? governorate;
  final String? gender;
  final String? error;

  const NationalIdInfo({
    required this.isValid,
    this.birthDate,
    this.age,
    this.governorate,
    this.gender,
    this.error,
  });
}

NationalIdInfo parseNationalId(String id) {
  if (id.length != 14 || !RegExp(r'^\d{14}$').hasMatch(id)) {
    return const NationalIdInfo(isValid: false, error: 'يجب أن تكون الهوية 14 رقماً');
  }

  final century = int.parse(id[0]);
  if (century != 2 && century != 3) {
    return const NationalIdInfo(isValid: false, error: 'رقم الهوية غير صحيح');
  }

  final yearSuffix = int.parse(id.substring(1, 3));
  final month      = int.parse(id.substring(3, 5));
  final day        = int.parse(id.substring(5, 7));
  final govCode    = id.substring(7, 10);
  final lastDigit  = int.parse(id[13]);

  final fullYear = century == 2 ? 1900 + yearSuffix : 2000 + yearSuffix;

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return const NationalIdInfo(isValid: false, error: 'تاريخ الميلاد في الهوية غير صحيح');
  }

  DateTime? birthDate;
  try {
    birthDate = DateTime(fullYear, month, day);
    // Detect invalid dates like Feb 30
    if (birthDate.month != month || birthDate.day != day) {
      return const NationalIdInfo(isValid: false, error: 'تاريخ الميلاد في الهوية غير صحيح');
    }
  } catch (_) {
    return const NationalIdInfo(isValid: false, error: 'تاريخ الميلاد في الهوية غير صحيح');
  }

  final govName = _govCodes[govCode];
  if (govName == null) {
    return const NationalIdInfo(isValid: false, error: 'كود المحافظة غير صحيح');
  }

  final now = DateTime.now();
  final age = now.year - birthDate.year -
      (now.month < birthDate.month ||
              (now.month == birthDate.month && now.day < birthDate.day)
          ? 1
          : 0);

  if (age < 16) {
    return const NationalIdInfo(isValid: false, error: 'يجب أن يكون عمرك 16 سنة على الأقل');
  }

  final gender = lastDigit % 2 != 0 ? 'ذكر' : 'أنثى';

  return NationalIdInfo(
    isValid: true,
    birthDate: birthDate,
    age: age,
    governorate: govName,
    gender: gender,
  );
}

const _govCodes = {
  '010': 'القاهرة',
  '011': 'القاهرة',
  '020': 'الإسكندرية',
  '021': 'الإسكندرية',
  '030': 'بور سعيد',
  '031': 'بور سعيد',
  '040': 'السويس',
  '041': 'السويس',
  '110': 'دمياط',
  '111': 'دمياط',
  '120': 'الدقهلية',
  '121': 'الدقهلية',
  '130': 'الشرقية',
  '131': 'الشرقية',
  '140': 'القليوبية',
  '141': 'القليوبية',
  '150': 'كفر الشيخ',
  '151': 'كفر الشيخ',
  '160': 'الغربية',
  '161': 'الغربية',
  '170': 'المنوفية',
  '171': 'المنوفية',
  '180': 'البحيرة',
  '181': 'البحيرة',
  '190': 'الإسماعيلية',
  '191': 'الإسماعيلية',
  '210': 'الجيزة',
  '211': 'الجيزة',
  '220': 'بني سويف',
  '221': 'بني سويف',
  '230': 'الفيوم',
  '231': 'الفيوم',
  '240': 'المنيا',
  '241': 'المنيا',
  '250': 'أسيوط',
  '251': 'أسيوط',
  '260': 'سوهاج',
  '261': 'سوهاج',
  '270': 'قنا',
  '271': 'قنا',
  '280': 'أسوان',
  '281': 'أسوان',
  '290': 'الأقصر',
  '291': 'الأقصر',
  '310': 'البحر الأحمر',
  '311': 'البحر الأحمر',
  '320': 'الوادي الجديد',
  '321': 'الوادي الجديد',
  '330': 'مطروح',
  '331': 'مطروح',
  '340': 'شمال سيناء',
  '341': 'شمال سيناء',
  '350': 'جنوب سيناء',
  '351': 'جنوب سيناء',
  '880': 'خارج مصر',
  '881': 'خارج مصر',
};
