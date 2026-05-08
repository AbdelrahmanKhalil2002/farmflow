/// Seller model returned by GET /api/sellers (includes aggregated listing/dairy stats).
class SellerSummaryModel {
  const SellerSummaryModel({
    required this.id,
    required this.name,
    this.farmName,
    this.farmPhone,
    this.governorate,
    this.bio,
    this.farmDescription,
    this.farmBanner,
    this.farmLocation,
    this.farmCertificates = const [],
    this.animalTypes = const [],
    this.experience,
    this.averageRating = 0.0,
    this.reviewCount = 0,
    required this.createdAt,
    this.listingCount = 0,
    this.listingTypes = const [],
    this.newestListingAt,
    this.minPricePerKg,
    this.maxPricePerKg,
    this.dairyCount = 0,
    this.dairyTypes = const [],
  });

  final String id;
  final String name;
  final String? farmName;
  final String? farmPhone;
  final String? governorate;
  final String? bio;
  final String? farmDescription;
  final String? farmBanner;
  final String? farmLocation;
  final List<String> farmCertificates;
  final List<String> animalTypes;
  final String? experience;
  final double averageRating;
  final int reviewCount;
  final DateTime createdAt;

  // Aggregated fields
  final int listingCount;
  final List<String> listingTypes;
  final DateTime? newestListingAt;
  final double? minPricePerKg;
  final double? maxPricePerKg;
  final int dairyCount;
  final List<String> dairyTypes;

  String get displayName => farmName ?? name;

  /// True if a new listing was added within the last 7 days (or the farm itself is new).
  bool get isNew {
    final ref = newestListingAt ?? createdAt;
    return ref.isAfter(DateTime.now().subtract(const Duration(days: 7)));
  }

  factory SellerSummaryModel.fromJson(Map<String, dynamic> json) {
    List<String> toStrings(dynamic v) =>
        v is List ? v.map((e) => e.toString()).toList() : const [];

    return SellerSummaryModel(
      id:               json['_id'] as String? ?? json['id'] as String? ?? '',
      name:             json['name'] as String? ?? '',
      farmName:         json['farmName'] as String?,
      farmPhone:        json['farmPhone'] as String?,
      governorate:      json['governorate'] as String?,
      bio:              json['bio'] as String?,
      farmDescription:  json['farmDescription'] as String?,
      farmBanner:       json['farmBanner'] as String?,
      farmLocation:     json['farmLocation'] is Map
          ? (json['farmLocation'] as Map)['address'] as String?
          : json['farmLocation'] as String?,
      farmCertificates: toStrings(json['farmCertificates']),
      animalTypes:      toStrings(json['animalTypes']),
      experience:       json['experience'] as String?,
      averageRating:    (json['averageRating'] as num?)?.toDouble() ?? 0.0,
      reviewCount:      json['reviewCount'] as int? ?? 0,
      createdAt:        DateTime.tryParse(json['createdAt'] as String? ?? '') ??
                        DateTime.now(),
      listingCount:     json['listingCount'] as int? ?? 0,
      listingTypes:     toStrings(json['listingTypes']),
      newestListingAt:  json['newestListingAt'] != null
          ? DateTime.tryParse(json['newestListingAt'].toString())
          : null,
      minPricePerKg:    (json['minPricePerKg'] as num?)?.toDouble(),
      maxPricePerKg:    (json['maxPricePerKg'] as num?)?.toDouble(),
      dairyCount:       json['dairyCount'] as int? ?? 0,
      dairyTypes:       toStrings(json['dairyTypes']),
    );
  }
}
