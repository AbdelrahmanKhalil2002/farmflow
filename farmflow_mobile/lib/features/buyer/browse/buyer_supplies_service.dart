import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/supply_model.dart';

/// Fetches all approved supplies for buyers.
final allSuppliesProvider = FutureProvider<List<SupplyModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.supplies);
  final data = res.data as List? ?? [];
  return data
      .map((e) => SupplyModel.fromJson(e as Map<String, dynamic>))
      .toList();
});
