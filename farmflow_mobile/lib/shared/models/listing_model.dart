/// Livestock listing — mirrors backend Listing schema.
class ListingModel {
  const ListingModel({
    required this.id,
    required this.sellerId,
    this.sellerName,
    this.sellerFarmName,
    required this.type,
    this.breed,
    required this.age,
    required this.weight,
    required this.price,
    this.description,
    this.images = const [],
    required this.status,
    this.location,
    this.pricePerKg,
    this.deliveryType = 'none',
    this.deliveryCost,
    this.eidAvailable = false,
    this.slaughterService = false,
    this.slaughterCost,
    required this.createdAt,
    this.views = 0,
    this.rejectionReason,
    this.healthStatus,
    this.color,
    this.traits = const [],
  });

  final String id;
  final String sellerId;
  final String? sellerName;
  final String? sellerFarmName;
  final String type;
  final String? breed;
  final int age;       // months
  final double weight; // kg
  final double price;
  final String? description;
  final List<String> images;
  final String status; // pending | approved | rejected | sold
  final String? location;
  final double? pricePerKg;
  final String deliveryType; // none | farm | admin
  final double? deliveryCost;
  final bool eidAvailable;
  final bool slaughterService;
  final double? slaughterCost;
  final DateTime createdAt;
  final int views;
  final String? rejectionReason;
  final String? healthStatus; // healthy | vaccinated | certified
  final String? color;
  final List<String> traits; // dairy | meat | breeding | show | working

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

  String get typeAr => _typeAr[type] ?? type;

  String get ageText {
    if (age < 12) return '$age شهر';
    final years = age ~/ 12;
    final months = age % 12;
    if (months == 0) return '$years سنة';
    return '$years سنة و$months شهر';
  }

  factory ListingModel.fromJson(Map<String, dynamic> json) {
    List<String> toStrings(dynamic v) =>
        v is List ? v.map((e) => e.toString()).toList() : const [];

    String sellerId;
    String? sellerName;
    String? sellerFarmName;

    final sellerRaw = json['seller'];
    if (sellerRaw is Map<String, dynamic>) {
      sellerId      = sellerRaw['_id'] as String? ?? sellerRaw['id'] as String? ?? '';
      sellerName    = sellerRaw['name'] as String?;
      sellerFarmName = sellerRaw['farmName'] as String?;
    } else {
      sellerId = sellerRaw?.toString() ?? '';
    }

    return ListingModel(
      id:               json['_id'] as String? ?? json['id'] as String? ?? '',
      sellerId:         sellerId,
      sellerName:       sellerName,
      sellerFarmName:   sellerFarmName,
      type:             json['type'] as String? ?? 'other',
      breed:            json['breed'] as String?,
      age:              (json['age'] as num?)?.toInt() ?? 0,
      weight:           (json['weight'] as num?)?.toDouble() ?? 0,
      price:            (json['price'] as num?)?.toDouble() ?? 0,
      description:      json['description'] as String?,
      images:           toStrings(json['images']),
      status:           json['status'] as String? ?? 'pending',
      location:         json['location'] as String?,
      pricePerKg:       (json['pricePerKg'] as num?)?.toDouble(),
      deliveryType:     json['deliveryType'] as String? ?? 'none',
      deliveryCost:     (json['deliveryCost'] as num?)?.toDouble(),
      eidAvailable:     json['eidAvailable'] as bool? ?? false,
      slaughterService: json['slaughterService'] as bool? ?? false,
      slaughterCost:    (json['slaughterCost'] as num?)?.toDouble(),
      createdAt:        DateTime.tryParse(json['createdAt'] as String? ?? '') ??
                        DateTime.now(),
      views:            (json['views'] as num?)?.toInt() ?? 0,
      rejectionReason:  json['rejectionReason'] as String?,
      healthStatus:     json['healthStatus'] as String?,
      color:            json['color'] as String?,
      traits:           (json['traits'] as List?)?.map((e) => e.toString()).toList() ?? [],
    );
  }
}
