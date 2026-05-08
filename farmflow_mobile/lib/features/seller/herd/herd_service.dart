import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

/// Animal summary from the server (lightweight for herd list).
class AnimalModel {
  const AnimalModel({
    required this.id,
    required this.type,
    this.breed,
    required this.tagId,
    required this.gender,
    required this.birthDate,
    this.weight,
    this.pregnancyStatus,
    this.medicalBadge = false,
    this.images = const [],
    this.status = 'active',
    this.nextVaccinationDate,
    this.vaccinationDue = false,
    this.targetWeight,
  });

  final String id;
  final String type;
  final String? breed;
  final String tagId;
  final String gender;      // male | female
  final DateTime birthDate;
  final double? weight;
  final String? pregnancyStatus; // none | pregnant | recently_gave_birth
  final bool medicalBadge;
  final List<String> images;
  final String status; // active | sold | deceased
  final DateTime? nextVaccinationDate;
  final bool vaccinationDue;
  final double? targetWeight;

  static const _typeAr = {
    'cattle':  'أبقار',
    'buffalo': 'جاموس',
    'sheep':   'خراف',
    'goat':    'ماعز',
    'camel':   'إبل',
    'horse':   'خيول',
    'poultry': 'دواجن',
    'rabbit':  'أرانب',
    'other':   'أخرى',
  };

  static const _emojis = {
    'cattle': '🐄', 'buffalo': '🐃', 'sheep': '🐑', 'goat': '🐐',
    'camel': '🐪', 'horse': '🐴', 'poultry': '🐔', 'rabbit': '🐇',
  };

  String get typeAr    => _typeAr[type] ?? type;
  String get typeEmoji => _emojis[type] ?? '🐾';
  String get genderAr  => gender == 'male' ? 'ذكر' : 'أنثى';

  int get ageMonths {
    final now = DateTime.now();
    return (now.year - birthDate.year) * 12 + (now.month - birthDate.month);
  }

  String get ageText {
    final m = ageMonths;
    if (m < 1)  return 'أقل من شهر';
    if (m < 12) return '$m شهر';
    final y = m ~/ 12;
    final rem = m % 12;
    if (rem == 0) return '$y سنة';
    return '$y سنة و$rem شهر';
  }

  bool get isPregnant      => pregnancyStatus == 'pregnant';
  bool get recentlyGaveBirth => pregnancyStatus == 'recently_gave_birth';

  factory AnimalModel.fromJson(Map<String, dynamic> json) {
    List<String> toStrings(dynamic v) =>
        v is List ? v.map((e) => e.toString()).toList() : const [];

    return AnimalModel(
      id:       json['_id'] as String? ?? json['id'] as String? ?? '',
      type:     json['type'] as String? ?? 'other',
      breed:    json['breed'] as String?,
      tagId:    json['tagId'] as String? ?? '',
      gender:   json['gender'] as String? ?? 'male',
      birthDate: DateTime.tryParse(json['birthDate'] as String? ?? '') ??
                 DateTime.now(),
      weight:   (json['weight'] as num?)?.toDouble(),
      pregnancyStatus: json['pregnancyStatus'] as String?,
      medicalBadge:    json['medicalBadge'] as bool? ?? false,
      images:   toStrings(json['images']),
      status:   json['status'] as String? ?? 'active',
      nextVaccinationDate: json['nextVaccinationDate'] != null
          ? DateTime.tryParse(json['nextVaccinationDate'] as String)
          : null,
      vaccinationDue: json['vaccinationDue'] as bool? ?? false,
      targetWeight:   (json['targetWeight'] as num?)?.toDouble(),
    );
  }
}

/// Fetches all animals for the authenticated seller.
final myAnimalsProvider = FutureProvider<List<AnimalModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.animals);
  final data = res.data as List? ?? [];
  return data
      .map((e) => AnimalModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

// ── Server-side pagination ────────────────────────────────────────────────────

const _kPageSize = 20;

class PaginatedAnimalsState {
  final List<AnimalModel> items;
  final bool isLoading;
  final bool hasMore;
  final int page;

  const PaginatedAnimalsState({
    this.items = const [],
    this.isLoading = false,
    this.hasMore = true,
    this.page = 0,
  });

  PaginatedAnimalsState copyWith({
    List<AnimalModel>? items,
    bool? isLoading,
    bool? hasMore,
    int? page,
  }) =>
      PaginatedAnimalsState(
        items:     items     ?? this.items,
        isLoading: isLoading ?? this.isLoading,
        hasMore:   hasMore   ?? this.hasMore,
        page:      page      ?? this.page,
      );
}

class PaginatedAnimalsNotifier
    extends AutoDisposeAsyncNotifier<PaginatedAnimalsState> {
  @override
  Future<PaginatedAnimalsState> build() async {
    return _fetchPage(1, []);
  }

  Future<void> loadMore() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore || current.isLoading) return;
    state = AsyncData(current.copyWith(isLoading: true));
    final next = await _fetchPage(current.page + 1, current.items);
    state = AsyncData(next);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = AsyncData(await _fetchPage(1, []));
  }

  Future<PaginatedAnimalsState> _fetchPage(
      int page, List<AnimalModel> existing) async {
    final dio = ref.read(dioProvider);
    final res = await dio.get(
      ApiEndpoints.animals,
      queryParameters: {'page': page, 'limit': _kPageSize},
    );
    final data = res.data;
    List<AnimalModel> newItems;
    bool hasMore;
    if (data is Map) {
      newItems = (data['items'] as List)
          .map((e) => AnimalModel.fromJson(e as Map<String, dynamic>))
          .toList();
      hasMore = data['hasMore'] as bool? ?? false;
    } else {
      newItems = (data as List)
          .map((e) => AnimalModel.fromJson(e as Map<String, dynamic>))
          .toList();
      hasMore = false;
    }
    return PaginatedAnimalsState(
      items:     [...existing, ...newItems],
      isLoading: false,
      hasMore:   hasMore,
      page:      page,
    );
  }
}

final paginatedAnimalsProvider =
    AutoDisposeAsyncNotifierProvider<PaginatedAnimalsNotifier, PaginatedAnimalsState>(
  PaginatedAnimalsNotifier.new,
);

/// Summary counts from /animals/summary
class AnimalSummary {
  final int total;
  final int male;
  final int female;
  final int pregnant;
  final double avgAge;    // months
  final double avgWeight; // kg
  final Map<String, int> byType;

  const AnimalSummary({
    required this.total,
    required this.male,
    required this.female,
    required this.pregnant,
    this.avgAge = 0,
    this.avgWeight = 0,
    this.byType = const {},
  });

  factory AnimalSummary.fromJson(Map<String, dynamic> json) => AnimalSummary(
    total:     (json['total']     as num?)?.toInt() ?? 0,
    male:      (json['male']      as num?)?.toInt() ?? 0,
    female:    (json['female']    as num?)?.toInt() ?? 0,
    pregnant:  (json['pregnant']  as num?)?.toInt() ?? 0,
    avgAge:    (json['avgAge']    as num?)?.toDouble() ?? 0,
    avgWeight: (json['avgWeight'] as num?)?.toDouble() ?? 0,
    byType:    (json['byType'] as Map<String, dynamic>? ?? {})
        .map((k, v) => MapEntry(k, (v as num?)?.toInt() ?? 0)),
  );
}

final animalSummaryProvider = FutureProvider<AnimalSummary>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.animalSummary);
  return AnimalSummary.fromJson(res.data as Map<String, dynamic>);
});

/// Deletes an animal. Returns true on success.
Future<bool> deleteAnimal(Dio dio, String id) async {
  try {
    await dio.delete(ApiEndpoints.animalById(id));
    return true;
  } catch (_) {
    return false;
  }
}
