import 'package:flutter_test/flutter_test.dart';
import 'package:farmflow_mobile/shared/models/listing_model.dart';
import 'package:farmflow_mobile/features/seller/herd/herd_service.dart';

// ── Helper builders ───────────────────────────────────────────────────────────

ListingModel _listing({required int ageMonths, String type = 'cattle'}) =>
    ListingModel(
      id: 'x',
      sellerId: 's',
      type: type,
      age: ageMonths,
      weight: 100,
      price: 5000,
      status: 'approved',
      createdAt: DateTime(2024),
    );

AnimalModel _animal({required DateTime dob, String type = 'sheep'}) =>
    AnimalModel(
      id: 'a',
      type: type,
      tagId: 'T001',
      gender: 'male',
      birthDate: dob,
    );

// ── ListingModel.ageText ──────────────────────────────────────────────────────

void main() {
  group('ListingModel.ageText', () {
    test('less than 12 months → "N شهر"', () {
      expect(_listing(ageMonths: 3).ageText,  equals('3 شهر'));
      expect(_listing(ageMonths: 11).ageText, equals('11 شهر'));
    });

    test('exactly 12 months → "1 سنة"', () {
      expect(_listing(ageMonths: 12).ageText, equals('1 سنة'));
    });

    test('exactly 24 months → "2 سنة"', () {
      expect(_listing(ageMonths: 24).ageText, equals('2 سنة'));
    });

    test('13 months → "1 سنة و1 شهر"', () {
      expect(_listing(ageMonths: 13).ageText, equals('1 سنة و1 شهر'));
    });

    test('18 months → "1 سنة و6 شهر"', () {
      expect(_listing(ageMonths: 18).ageText, equals('1 سنة و6 شهر'));
    });
  });

  group('ListingModel.typeAr', () {
    test('known types return Arabic names', () {
      expect(_listing(ageMonths: 6, type: 'cattle').typeAr,  equals('أبقار'));
      expect(_listing(ageMonths: 6, type: 'sheep').typeAr,   equals('خراف'));
      expect(_listing(ageMonths: 6, type: 'camel').typeAr,   equals('إبل'));
      expect(_listing(ageMonths: 6, type: 'poultry').typeAr, equals('دواجن'));
    });

    test('unknown type falls back to raw value', () {
      expect(_listing(ageMonths: 6, type: 'llama').typeAr, equals('llama'));
    });
  });

  group('ListingModel.fromJson', () {
    test('parses flat seller id string', () {
      final m = ListingModel.fromJson({
        '_id': 'abc',
        'seller': 'seller123',
        'type': 'goat',
        'age': 8,
        'weight': 30.0,
        'price': 1500,
        'status': 'approved',
        'createdAt': '2024-01-15T00:00:00.000Z',
      });
      expect(m.id, equals('abc'));
      expect(m.sellerId, equals('seller123'));
      expect(m.type, equals('goat'));
      expect(m.age, equals(8));
    });

    test('parses populated seller object', () {
      final m = ListingModel.fromJson({
        '_id': 'def',
        'seller': {'_id': 'sel1', 'name': 'أحمد', 'farmName': 'مزرعة النيل'},
        'type': 'buffalo',
        'age': 24,
        'weight': 450.0,
        'price': 35000,
        'status': 'pending',
        'createdAt': '2024-03-01T00:00:00.000Z',
      });
      expect(m.sellerId,       equals('sel1'));
      expect(m.sellerName,     equals('أحمد'));
      expect(m.sellerFarmName, equals('مزرعة النيل'));
    });

    test('defaults missing optional fields', () {
      final m = ListingModel.fromJson({
        '_id': 'g',
        'seller': 's',
        'type': 'sheep',
        'age': 6,
        'weight': 25,
        'price': 800,
        'status': 'approved',
        'createdAt': '2024-06-01T00:00:00.000Z',
      });
      expect(m.eidAvailable,    isFalse);
      expect(m.slaughterService, isFalse);
      expect(m.deliveryType,    equals('none'));
      expect(m.images,          isEmpty);
    });
  });

  // ── AnimalModel.ageText / typeAr ────────────────────────────────────────────

  group('AnimalModel.ageText', () {
    final now = DateTime.now();

    test('less than 1 month → "أقل من شهر"', () {
      // Use a date in the same year+month to guarantee ageMonths == 0
      final safeDay = now.day > 1 ? now.day - 1 : now.day;
      final dob = DateTime(now.year, now.month, safeDay);
      expect(_animal(dob: dob).ageText, equals('أقل من شهر'));
    });

    test('2 months → "2 شهر"', () {
      final m   = now.month > 2 ? now.month - 2 : now.month + 10;
      final y   = now.month > 2 ? now.year : now.year - 1;
      final dob = DateTime(y, m, 1);
      expect(_animal(dob: dob).ageText, equals('2 شهر'));
    });

    test('exactly 12 months → "1 سنة"', () {
      final dob = DateTime(now.year - 1, now.month, 1);
      expect(_animal(dob: dob).ageText, equals('1 سنة'));
    });

    test('14 months → "1 سنة و2 شهر"', () {
      final m   = now.month > 2 ? now.month - 2 : now.month + 10;
      final y   = now.month > 2 ? now.year - 1 : now.year - 2;
      final dob = DateTime(y, m, 1);
      expect(_animal(dob: dob).ageText, equals('1 سنة و2 شهر'));
    });
  });

  group('AnimalModel.typeAr / typeEmoji / genderAr', () {
    test('sheep typeAr = خراف', () {
      expect(_animal(dob: DateTime(2022), type: 'sheep').typeAr, equals('خراف'));
    });

    test('unknown type falls back to raw', () {
      expect(_animal(dob: DateTime(2022), type: 'alpaca').typeAr, equals('alpaca'));
    });

    test('male genderAr = ذكر', () {
      expect(_animal(dob: DateTime(2022)).genderAr, equals('ذكر'));
    });

    test('female genderAr = أنثى', () {
      final a = AnimalModel(
          id: 'b', type: 'goat', tagId: 'T2', gender: 'female',
          birthDate: DateTime(2022));
      expect(a.genderAr, equals('أنثى'));
    });
  });

  group('AnimalModel.fromJson', () {
    test('parses basic fields', () {
      final a = AnimalModel.fromJson({
        '_id': 'aaa',
        'type': 'cattle',
        'tagId': 'C001',
        'gender': 'male',
        'birthDate': '2021-03-10T00:00:00.000Z',
        'weight': 320.5,   // model reads json['weight']
      });
      expect(a.id,     equals('aaa'));
      expect(a.tagId,  equals('C001'));
      expect(a.weight, equals(320.5));
      expect(a.birthDate.year, equals(2021));
    });

    test('medicalBadge defaults false', () {
      final a = AnimalModel.fromJson({
        '_id': 'b', 'type': 'goat', 'tagId': 'G1',
        'gender': 'female', 'birthDate': '2022-01-01T00:00:00.000Z',
      });
      expect(a.medicalBadge, isFalse);
    });
  });
}
