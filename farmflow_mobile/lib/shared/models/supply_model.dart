/// Agricultural supply — mirrors backend Supply schema.
class SupplyModel {
  const SupplyModel({
    required this.id,
    required this.sellerId,
    required this.name,
    required this.category,
    this.description,
    required this.quantity,
    required this.unit,
    required this.pricePerUnit,
    this.minOrderQty = 1,
    this.location,
    this.deliveryAvailable = false,
    this.deliveryCost,
    this.images = const [],
    this.status = 'pending',
    required this.createdAt,
  });

  final String id;
  final String sellerId;
  final String name;
  final String category; // feed | veterinary | equipment | seeds | other
  final String? description;
  final double quantity;
  final String unit;
  final double pricePerUnit;
  final int minOrderQty;
  final String? location;
  final bool deliveryAvailable;
  final double? deliveryCost;
  final List<String> images;
  final String status;
  final DateTime createdAt;

  static const _categoryAr = {
    'feed':        'علف',
    'veterinary':  'مستلزمات بيطرية',
    'equipment':   'معدات',
    'seeds':       'بذور',
    'other':       'أخرى',
  };

  String get categoryAr => _categoryAr[category] ?? category;

  factory SupplyModel.fromJson(Map<String, dynamic> json) {
    List<String> toStrings(dynamic v) =>
        v is List ? v.map((e) => e.toString()).toList() : const [];

    final sellerRaw = json['seller'];
    final sellerId = sellerRaw is Map
        ? (sellerRaw['_id'] ?? sellerRaw['id']).toString()
        : sellerRaw?.toString() ?? '';

    return SupplyModel(
      id:               json['_id'] as String? ?? json['id'] as String? ?? '',
      sellerId:         sellerId,
      name:             json['name'] as String? ?? '',
      category:         json['category'] as String? ?? 'other',
      description:      json['description'] as String?,
      quantity:         (json['quantity'] as num?)?.toDouble() ?? 0,
      unit:             json['unit'] as String? ?? '',
      pricePerUnit:     (json['pricePerUnit'] as num?)?.toDouble() ?? 0,
      minOrderQty:      (json['minOrderQty'] as num?)?.toInt() ?? 1,
      location:         json['location'] as String?,
      deliveryAvailable: json['deliveryAvailable'] as bool? ?? false,
      deliveryCost:     (json['deliveryCost'] as num?)?.toDouble(),
      images:           toStrings(json['images']),
      status:           json['status'] as String? ?? 'pending',
      createdAt:        DateTime.tryParse(json['createdAt'] as String? ?? '') ??
                        DateTime.now(),
    );
  }
}
