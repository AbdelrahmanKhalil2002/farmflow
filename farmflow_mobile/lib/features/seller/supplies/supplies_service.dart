import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/supply_model.dart';

/// Fetches the seller's own supplies.
final mySuppliesProvider = FutureProvider<List<SupplyModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.supplies, queryParameters: {'my': '1'});
  final data = res.data as List? ?? [];
  return data
      .map((e) => SupplyModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

/// Creates a supply listing. Returns the created model.
Future<SupplyModel> createSupply(Dio dio, Map<String, dynamic> body) async {
  final res = await dio.post(ApiEndpoints.supplies, data: body);
  return SupplyModel.fromJson(res.data as Map<String, dynamic>);
}

/// Updates a supply. Returns the updated model.
Future<SupplyModel> updateSupply(
    Dio dio, String id, Map<String, dynamic> body) async {
  final res = await dio.put(ApiEndpoints.supplyById(id), data: body);
  return SupplyModel.fromJson(res.data as Map<String, dynamic>);
}

/// Deletes a supply. Returns true on success.
Future<bool> deleteSupply(Dio dio, String id) async {
  try {
    await dio.delete(ApiEndpoints.supplyById(id));
    return true;
  } catch (_) {
    return false;
  }
}
