import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/dairy_product_model.dart';

/// Fetches the seller's own dairy products.
final myDairyProvider = FutureProvider<List<DairyProductModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.myDairy);
  final data = res.data as List? ?? [];
  return data
      .map((e) => DairyProductModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

/// Creates a dairy product. Returns the created model.
Future<DairyProductModel> createDairy(Dio dio, Map<String, dynamic> body) async {
  final res = await dio.post(ApiEndpoints.dairy, data: body);
  return DairyProductModel.fromJson(res.data as Map<String, dynamic>);
}

/// Updates a dairy product. Returns the updated model.
Future<DairyProductModel> updateDairy(
    Dio dio, String id, Map<String, dynamic> body) async {
  final res = await dio.put(ApiEndpoints.dairyById(id), data: body);
  return DairyProductModel.fromJson(res.data as Map<String, dynamic>);
}

/// Deletes a dairy product. Returns true on success.
Future<bool> deleteDairy(Dio dio, String id) async {
  try {
    await dio.delete(ApiEndpoints.dairyById(id));
    return true;
  } catch (_) {
    return false;
  }
}
