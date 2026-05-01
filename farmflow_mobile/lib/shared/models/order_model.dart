import 'listing_model.dart';

class DeliveryLocation {
  final double? lat;
  final double? lng;
  final String? address;

  const DeliveryLocation({this.lat, this.lng, this.address});

  factory DeliveryLocation.fromJson(Map<String, dynamic> json) => DeliveryLocation(
    lat:     (json['lat'] as num?)?.toDouble(),
    lng:     (json['lng'] as num?)?.toDouble(),
    address: json['address'] as String?,
  );

  Map<String, dynamic> toJson() => {
    if (lat != null) 'lat': lat,
    if (lng != null) 'lng': lng,
    if (address != null) 'address': address,
  };
}

/// Order — mirrors backend Order schema.
class OrderModel {
  const OrderModel({
    required this.id,
    required this.buyerId,
    required this.sellerId,
    required this.listingId,
    this.listing,
    this.sellerName,
    this.sellerFarmName,
    required this.paymentType,
    this.depositAmount = 0,
    required this.totalAmount,
    required this.status,
    this.notes,
    this.deliveryLocation,
    this.deliveryCost = 0,
    this.deliveryStatus = 'pending',
    required this.createdAt,
  });

  final String id;
  final String buyerId;
  final String sellerId;
  final String listingId;
  final ListingModel? listing;
  final String? sellerName;
  final String? sellerFarmName;
  final String paymentType;  // deposit | cod | instapay
  final double depositAmount;
  final double totalAmount;
  final String status;         // pending | confirmed | completed | cancelled
  final String? notes;
  final DeliveryLocation? deliveryLocation;
  final double deliveryCost;
  final String deliveryStatus; // pending | in_transit | delivered
  final DateTime createdAt;

  static const _statusAr = {
    'pending':   'قيد الانتظار',
    'confirmed': 'مؤكد',
    'completed': 'مكتمل',
    'cancelled': 'ملغي',
  };

  static const _paymentAr = {
    'deposit':  'عربون',
    'cod':      'كاش عند الاستلام',
    'instapay': 'InstaPay',
  };

  static const _deliveryStatusAr = {
    'pending':    'لم يُشحن بعد',
    'in_transit': 'في الطريق',
    'delivered':  'تم التسليم',
  };

  String get statusAr         => _statusAr[status] ?? status;
  String get paymentAr        => _paymentAr[paymentType] ?? paymentType;
  String get deliveryStatusAr => _deliveryStatusAr[deliveryStatus] ?? deliveryStatus;

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    final buyerRaw = json['buyer'];
    final buyerId = buyerRaw is Map
        ? (buyerRaw['_id'] ?? buyerRaw['id']).toString()
        : buyerRaw?.toString() ?? '';

    final sellerRaw = json['seller'];
    String sellerId;
    String? sellerName;
    String? sellerFarmName;
    if (sellerRaw is Map<String, dynamic>) {
      sellerId      = sellerRaw['_id']?.toString() ?? sellerRaw['id']?.toString() ?? '';
      sellerName    = sellerRaw['name'] as String?;
      sellerFarmName = sellerRaw['farmName'] as String?;
    } else {
      sellerId = sellerRaw?.toString() ?? '';
    }

    final listingRaw = json['listing'];
    String listingId;
    ListingModel? listing;
    if (listingRaw is Map<String, dynamic>) {
      listingId = listingRaw['_id']?.toString() ?? listingRaw['id']?.toString() ?? '';
      listing   = ListingModel.fromJson(listingRaw);
    } else {
      listingId = listingRaw?.toString() ?? '';
    }

    return OrderModel(
      id:              json['_id'] as String? ?? json['id'] as String? ?? '',
      buyerId:         buyerId,
      sellerId:        sellerId,
      listingId:       listingId,
      listing:         listing,
      sellerName:      sellerName,
      sellerFarmName:  sellerFarmName,
      paymentType:     json['paymentType'] as String? ?? 'cod',
      depositAmount:   (json['depositAmount'] as num?)?.toDouble() ?? 0,
      totalAmount:     (json['totalAmount'] as num?)?.toDouble() ?? 0,
      status:          json['status'] as String? ?? 'pending',
      notes:           json['notes'] as String?,
      deliveryLocation: json['deliveryLocation'] != null
          ? DeliveryLocation.fromJson(json['deliveryLocation'] as Map<String, dynamic>)
          : null,
      deliveryCost:    (json['deliveryCost'] as num?)?.toDouble() ?? 0,
      deliveryStatus:  json['deliveryStatus'] as String? ?? 'pending',
      createdAt:       DateTime.tryParse(json['createdAt'] as String? ?? '') ??
                       DateTime.now(),
    );
  }
}
