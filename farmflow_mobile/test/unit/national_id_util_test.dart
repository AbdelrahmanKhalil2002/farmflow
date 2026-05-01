import 'package:flutter_test/flutter_test.dart';
import 'package:farmflow_mobile/core/utils/national_id_util.dart';

void main() {
  group('parseNationalId', () {
    // ── length / format ──────────────────────────────────────────────────────
    test('rejects ID shorter than 14 digits', () {
      final r = parseNationalId('2901011001010');
      expect(r.isValid, isFalse);
    });

    test('rejects ID longer than 14 digits', () {
      final r = parseNationalId('290101100101011');
      expect(r.isValid, isFalse);
    });

    test('rejects non-digit characters', () {
      final r = parseNationalId('29010110010101a');
      expect(r.isValid, isFalse);
    });

    // ── century digit ────────────────────────────────────────────────────────
    test('rejects century digit 1 (pre-1900)', () {
      final r = parseNationalId('19001011001010');
      expect(r.isValid, isFalse);
    });

    test('rejects century digit 4', () {
      final r = parseNationalId('49001011001010');
      expect(r.isValid, isFalse);
    });

    test('accepts century digit 2 → 1900s birth year', () {
      // 2 90 01 01 210 001 1 → Cairo male, born 1990-01-01
      final r = parseNationalId('29001012100011');
      expect(r.isValid, isTrue);
      expect(r.birthDate!.year, equals(1990));
    });

    test('accepts century digit 3 → 2000s birth year', () {
      // 3 05 06 15 210 001 1 → Cairo male, born 2005-06-15
      final r = parseNationalId('30506152100011');
      expect(r.isValid, isTrue);
      expect(r.birthDate!.year, equals(2005));
    });

    // ── invalid dates ────────────────────────────────────────────────────────
    test('rejects invalid month 00', () {
      final r = parseNationalId('29000012100011');
      expect(r.isValid, isFalse);
    });

    test('rejects invalid month 13', () {
      final r = parseNationalId('29013012100011');
      expect(r.isValid, isFalse);
    });

    test('rejects invalid day 00', () {
      final r = parseNationalId('29001002100011');
      expect(r.isValid, isFalse);
    });

    test('rejects Feb 30 (overflow date)', () {
      final r = parseNationalId('29002302100011');
      expect(r.isValid, isFalse);
    });

    // ── governorate codes ────────────────────────────────────────────────────
    test('valid Cairo code 010', () {
      final r = parseNationalId('29001010100011');
      expect(r.isValid, isTrue);
      expect(r.governorate, equals('القاهرة'));
    });

    test('valid Giza code 210', () {
      final r = parseNationalId('29001012100011');
      expect(r.isValid, isTrue);
      expect(r.governorate, equals('الجيزة'));
    });

    test('valid overseas code 880', () {
      final r = parseNationalId('29001018800011');
      expect(r.isValid, isTrue);
      expect(r.governorate, equals('خارج مصر'));
    });

    test('rejects unknown governorate code 999', () {
      final r = parseNationalId('29001019990011');
      expect(r.isValid, isFalse);
    });

    // ── age constraint ───────────────────────────────────────────────────────
    test('rejects age < 16 (born 2015)', () {
      final r = parseNationalId('31501012100011');
      expect(r.isValid, isFalse);
      expect(r.error, contains('16'));
    });

    test('accepts age = 16', () {
      final now = DateTime.now();
      final y   = now.year - 16;
      final century = y >= 2000 ? '3' : '2';
      final yy  = (y % 100).toString().padLeft(2, '0');
      final mm  = now.month.toString().padLeft(2, '0');
      final dd  = now.day.toString().padLeft(2, '0');
      final id  = '${century}${yy}${mm}${dd}2100011';
      final r   = parseNationalId(id);
      expect(r.isValid, isTrue);
      expect(r.age, greaterThanOrEqualTo(16));
    });

    // ── gender ───────────────────────────────────────────────────────────────
    test('odd last digit → male (ذكر)', () {
      // last digit = 1 (odd)
      final r = parseNationalId('29001012100011');
      expect(r.isValid, isTrue);
      expect(r.gender, equals('ذكر'));
    });

    test('even last digit → female (أنثى)', () {
      // last digit = 2 (even)
      final r = parseNationalId('29001012100012');
      expect(r.isValid, isTrue);
      expect(r.gender, equals('أنثى'));
    });

    // ── birth date extraction ─────────────────────────────────────────────────
    test('correctly extracts birth date fields', () {
      // born 1985-07-23, Cairo 010
      final r = parseNationalId('28507230100011');
      expect(r.isValid, isTrue);
      expect(r.birthDate!.year,  equals(1985));
      expect(r.birthDate!.month, equals(7));
      expect(r.birthDate!.day,   equals(23));
    });

    // ── age calculation ───────────────────────────────────────────────────────
    test('age is non-negative integer', () {
      final r = parseNationalId('28507230100011');
      expect(r.isValid, isTrue);
      expect(r.age, greaterThan(0));
      expect(r.age, lessThan(200));
    });
  });
}
