import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/user_model.dart';
import '../../../shared/models/listing_model.dart';
import '../../../shared/models/dairy_product_model.dart';
import '../../../shared/models/review_model.dart';
import '../../../shared/models/supply_model.dart';

class FarmDetailData {
  const FarmDetailData({
    required this.seller,
    required this.listings,
    required this.dairy,
    this.supplies = const [],
  });

  final UserModel seller;
  final List<ListingModel> listings;
  final List<DairyProductModel> dairy;
  final List<SupplyModel> supplies;
}

/// Fetches seller profile + approved listings + approved dairy products + supplies.
final farmDetailProvider =
    FutureProvider.family<FarmDetailData, String>((ref, sellerId) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.sellerById(sellerId));
  final data = res.data as Map<String, dynamic>;

  final seller = UserModel.fromJson(data['seller'] as Map<String, dynamic>);
  final listings = (data['listings'] as List? ?? [])
      .map((e) => ListingModel.fromJson(e as Map<String, dynamic>))
      .toList();
  final dairy = (data['dairy'] as List? ?? [])
      .map((e) => DairyProductModel.fromJson(e as Map<String, dynamic>))
      .toList();

  // Supplies — fetched separately; graceful fallback on error
  List<SupplyModel> supplies = [];
  try {
    final supRes = await dio.get(
      ApiEndpoints.supplies,
      queryParameters: {'seller': sellerId, 'status': 'approved'},
    );
    supplies = (supRes.data as List? ?? [])
        .map((e) => SupplyModel.fromJson(e as Map<String, dynamic>))
        .toList();
  } catch (_) {}

  return FarmDetailData(
      seller: seller, listings: listings, dairy: dairy, supplies: supplies);
});

/// Fetches reviews for a seller.
final sellerReviewsProvider =
    FutureProvider.family<List<ReviewModel>, String>((ref, sellerId) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.reviewsBySeller(sellerId));
  final data = res.data as List? ?? [];
  return data.map((e) => ReviewModel.fromJson(e as Map<String, dynamic>)).toList();
});
