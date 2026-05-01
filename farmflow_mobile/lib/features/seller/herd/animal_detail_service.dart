import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

// ── Weight entry ──────────────────────────────────────────────────────────────

class WeightEntry {
  final String id;
  final double weightKg;
  final DateTime date;
  final String? notes;

  const WeightEntry({
    required this.id,
    required this.weightKg,
    required this.date,
    this.notes,
  });

  factory WeightEntry.fromJson(Map<String, dynamic> json) => WeightEntry(
    id:       json['_id'] as String? ?? '',
    weightKg: (json['weightKg'] as num?)?.toDouble() ?? 0,
    date:     DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
    notes:    json['notes'] as String?,
  );
}

// ── Vaccination entry ─────────────────────────────────────────────────────────

class VaccinationEntry {
  final String id;
  final String vaccine;
  final DateTime date;
  final DateTime? nextDueDate;
  final String? vet;
  final String? notes;

  const VaccinationEntry({
    required this.id,
    required this.vaccine,
    required this.date,
    this.nextDueDate,
    this.vet,
    this.notes,
  });

  factory VaccinationEntry.fromJson(Map<String, dynamic> json) => VaccinationEntry(
    id:          json['_id'] as String? ?? '',
    vaccine:     json['vaccine'] as String? ?? '',
    date:        DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
    nextDueDate: json['nextDueDate'] != null
        ? DateTime.tryParse(json['nextDueDate'].toString())
        : null,
    vet:         json['vet'] as String?,
    notes:       json['notes'] as String?,
  );
}

// ── Medical record ────────────────────────────────────────────────────────────

class MedicalRecord {
  final String id;
  final DateTime date;
  final String? diagnosis;
  final String? treatment;
  final String? medication;
  final String? vet;
  final double? cost;
  final DateTime? followUpDate;
  final String? notes;

  const MedicalRecord({
    required this.id,
    required this.date,
    this.diagnosis,
    this.treatment,
    this.medication,
    this.vet,
    this.cost,
    this.followUpDate,
    this.notes,
  });

  factory MedicalRecord.fromJson(Map<String, dynamic> json) => MedicalRecord(
    id:           json['_id'] as String? ?? '',
    date:         DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
    diagnosis:    json['diagnosis'] as String?,
    treatment:    json['treatment'] as String?,
    medication:   json['medication'] as String?,
    vet:          json['vet'] as String?,
    cost:         (json['cost'] as num?)?.toDouble(),
    followUpDate: json['followUpDate'] != null
        ? DateTime.tryParse(json['followUpDate'].toString())
        : null,
    notes:        json['notes'] as String?,
  );
}

// ── Full animal detail ────────────────────────────────────────────────────────

class AnimalDetail {
  final String id;
  final String type;
  final String? breed;
  final String tagId;
  final String gender;
  final DateTime birthDate;
  final double? currentWeight;
  final String? color;
  final String? healthStatus;
  final String? notes;
  final List<String> images;
  final List<WeightEntry> weightHistory;
  final List<VaccinationEntry> vaccinations;
  final double? targetWeight;
  final String? pregnancyStatus; // none | pregnant | recently_gave_birth
  final DateTime? expectedBirthDate;

  const AnimalDetail({
    required this.id,
    required this.type,
    this.breed,
    required this.tagId,
    required this.gender,
    required this.birthDate,
    this.currentWeight,
    this.color,
    this.healthStatus,
    this.notes,
    this.images = const [],
    this.weightHistory = const [],
    this.vaccinations = const [],
    this.targetWeight,
    this.pregnancyStatus,
    this.expectedBirthDate,
  });

  static const _typeAr = {
    'cattle':  'أبقار', 'buffalo': 'جاموس', 'sheep': 'خراف',
    'goat':    'ماعز',  'camel':   'إبل',    'horse': 'خيول',
    'poultry': 'دواجن', 'rabbit':  'أرانب',  'other': 'أخرى',
  };
  static const _emojis = {
    'cattle': '🐄', 'buffalo': '🐃', 'sheep': '🐑', 'goat': '🐐',
    'camel':  '🐪', 'horse':   '🐴', 'poultry': '🐔', 'rabbit': '🐇',
  };

  String get typeAr    => _typeAr[type]    ?? type;
  String get typeEmoji => _emojis[type]    ?? '🐾';
  String get genderAr  => gender == 'male' ? 'ذكر' : 'أنثى';

  factory AnimalDetail.fromJson(Map<String, dynamic> json) {
    List<String> toStr(dynamic v) =>
        v is List ? v.map((e) => e.toString()).toList() : const [];

    return AnimalDetail(
      id:            json['_id'] as String? ?? json['id'] as String? ?? '',
      type:          json['type'] as String? ?? 'other',
      breed:         json['breed'] as String?,
      tagId:         json['tagId'] as String? ?? '',
      gender:        json['gender'] as String? ?? 'male',
      birthDate:     DateTime.tryParse(json['birthDate'] as String? ?? '') ?? DateTime.now(),
      currentWeight: (json['currentWeight'] as num?)?.toDouble() ??
                     (json['weight'] as num?)?.toDouble(),
      color:         json['color'] as String?,
      healthStatus:  json['healthStatus'] as String?,
      notes:         json['notes'] as String?,
      images:        toStr(json['images']),
      targetWeight:      (json['targetWeight'] as num?)?.toDouble(),
      pregnancyStatus:   json['pregnancyStatus'] as String?,
      expectedBirthDate: json['expectedBirthDate'] != null
          ? DateTime.tryParse(json['expectedBirthDate'].toString())
          : null,
      weightHistory: (json['weightHistory'] as List? ?? [])
          .map((e) => WeightEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
      vaccinations: (json['vaccinations'] as List? ?? [])
          .map((e) => VaccinationEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Fetches a single animal with full embedded data.
final animalDetailProvider =
    FutureProvider.family<AnimalDetail, String>((ref, id) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.animalById(id));
  return AnimalDetail.fromJson(res.data as Map<String, dynamic>);
});

/// Fetches medical records for an animal.
final animalMedicalProvider =
    FutureProvider.family<List<MedicalRecord>, String>((ref, id) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.animalMedical(id));
  final data = res.data as List? ?? [];
  return data.map((e) => MedicalRecord.fromJson(e as Map<String, dynamic>)).toList();
});
