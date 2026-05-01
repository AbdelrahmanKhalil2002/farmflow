/// Review — mirrors backend Review schema.
class ReviewModel {
  const ReviewModel({
    required this.id,
    this.buyerName,
    required this.sellerId,
    required this.orderId,
    required this.rating,
    this.comment,
    required this.createdAt,
  });

  final String id;
  final String? buyerName;
  final String sellerId;
  final String orderId;
  final int rating;    // 1..5
  final String? comment;
  final DateTime createdAt;

  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    final buyerRaw = json['buyer'];
    final buyerName = buyerRaw is Map ? buyerRaw['name'] as String? : null;

    final sellerRaw = json['seller'];
    final sellerId = sellerRaw is Map
        ? (sellerRaw['_id'] ?? sellerRaw['id']).toString()
        : sellerRaw?.toString() ?? '';

    final orderRaw = json['order'];
    final orderId = orderRaw is Map
        ? (orderRaw['_id'] ?? orderRaw['id']).toString()
        : orderRaw?.toString() ?? '';

    return ReviewModel(
      id:        json['_id'] as String? ?? json['id'] as String? ?? '',
      buyerName: buyerName,
      sellerId:  sellerId,
      orderId:   orderId,
      rating:    (json['rating'] as num?)?.toInt() ?? 1,
      comment:   json['comment'] as String?,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
                 DateTime.now(),
    );
  }
}
