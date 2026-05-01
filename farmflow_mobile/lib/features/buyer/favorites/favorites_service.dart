import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/auth/auth_notifier.dart';

class FavoriteIdsNotifier extends StateNotifier<Set<String>> {
  FavoriteIdsNotifier(this._dio, Set<String> initial) : super(initial);

  final Dio _dio;

  bool isFavorite(String sellerId) => state.contains(sellerId);

  Future<void> toggle(String sellerId) async {
    final wasFavorite = state.contains(sellerId);
    // Optimistic update
    state = Set.from(state)..toggle(sellerId, !wasFavorite);
    try {
      if (wasFavorite) {
        await _dio.delete('${ApiEndpoints.favorites}/$sellerId');
      } else {
        await _dio.post('${ApiEndpoints.favorites}/$sellerId');
      }
    } on DioException {
      // Rollback on failure
      state = Set.from(state)..toggle(sellerId, wasFavorite);
    }
  }
}

extension on Set<String> {
  void toggle(String value, bool add) {
    if (add) {
      this.add(value);
    } else {
      remove(value);
    }
  }
}

/// Initialized from the current user's savedFarms; updates optimistically.
final favoriteIdsProvider =
    StateNotifierProvider<FavoriteIdsNotifier, Set<String>>((ref) {
  final user = ref.watch(authNotifierProvider).valueOrNull;
  return FavoriteIdsNotifier(
    ref.watch(dioProvider),
    user?.savedFarms.toSet() ?? {},
  );
});
