/// Dairy product — mirrors backend DairyProduct schema.
class DairyProductModel {
  const DairyProductModel({
    required this.id,
    required this.sellerId,
    required this.name,
    required this.type,
    required this.quantity,
    required this.unit,
    required this.pricePerUnit,
    this.productionDate,
    this.expiryDate,
    this.description,
    this.images = const [],
    this.deliveryAvailable = false,
    this.deliveryCost,
    this.status = 'pending',
    this.available = true,
    required this.createdAt,
  });

  final String id;
  final String sellerId;
  final String name;
  final String type; // milk | cheese | yogurt | butter | cream | ghee | other
  final double quantity;
  final String unit; // kg | liter | piece | pack | dozen
  final double pricePerUnit;
  final DateTime? productionDate;
  final DateTime? expiryDate;
  final String? description;
  final List<String> images;
  final bool deliveryAvailable;
  final double? deliveryCost;
  final String status;
  final bool available;
  final DateTime createdAt;

  static const _typeAr = {
    'milk':   'لبن',
    'cheese': 'جبنة',
    'yogurt': 'زبادي',
    'butter': 'زبد',
    'cream':  'قشطة',
    'ghee':   'سمن',
    'other':  'أخرى',
  };

  static const _unitAr = {
    'kg':     'كجم',
    'liter':  'لتر',
    'piece':  'قطعة',
    'pack':   'عبوة',
    'dozen':  'دزينة',
  };

  String get typeAr  => _typeAr[type] ?? type;
  String get unitAr  => _unitAr[unit] ?? unit;

  factory DairyProductModel.fromJson(Map<String, dynamic> json) {
    List<String> toStrings(dynamic v) =>
        v is List ? v.map((e) => e.toString()).toList() : const [];

    final sellerRaw = json['seller'];
    final sellerId = sellerRaw is Map
        ? (sellerRaw['_id'] ?? sellerRaw['id']).toString()
        : sellerRaw?.toString() ?? '';

    return DairyProductModel(
      id:               json['_id'] as String? ?? json['id'] as String? ?? '',
      sellerId:         sellerId,
      name:             json['name'] as String? ?? '',
      type:             json['type'] as String? ?? 'other',
      quantity:         (json['quantity'] as num?)?.toDouble() ?? 0,
      unit:             json['unit'] as String? ?? 'piece',
      pricePerUnit:     (json['pricePerUnit'] as num?)?.toDouble() ?? 0,
      productionDate:   json['productionDate'] != null
          ? DateTime.tryParse(json['productionDate'].toString())
          : null,
      expiryDate:       json['expiryDate'] != null
          ? DateTime.tryParse(json['expiryDate'].toString())
          : null,
      description:      json['description'] as String?,
      images:           toStrings(json['images']),
      deliveryAvailable: json['deliveryAvailable'] as bool? ?? false,
      deliveryCost:     (json['deliveryCost'] as num?)?.toDouble(),
      status:           json['status'] as String? ?? 'pending',
      available:        json['available'] as bool? ?? true,
      createdAt:        DateTime.tryParse(json['createdAt'] as String? ?? '') ??
                        DateTime.now(),
    );
  }
}
