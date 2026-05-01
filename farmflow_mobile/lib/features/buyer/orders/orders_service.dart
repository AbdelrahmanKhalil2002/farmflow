import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/order_model.dart';

/// Fetches the current buyer's orders.
final myOrdersProvider = FutureProvider<List<OrderModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.myOrders);
  final data = res.data as List? ?? [];
  return data.map((e) => OrderModel.fromJson(e as Map<String, dynamic>)).toList();
});

/// Creates a new order. Returns the created OrderModel.
Future<OrderModel> placeOrder(dynamic dio, Map<String, dynamic> body) async {
  final res = await dio.post(ApiEndpoints.orders, data: body);
  return OrderModel.fromJson(res.data as Map<String, dynamic>);
}
