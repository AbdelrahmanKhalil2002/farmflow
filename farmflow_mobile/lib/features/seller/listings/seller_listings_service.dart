import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/listing_model.dart';

/// Fetches the seller's own listings.
final myListingsProvider = FutureProvider<List<ListingModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.myListings);
  final data = res.data as List? ?? [];
  return data
      .map((e) => ListingModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

/// Updates listing status (approve/reject — seller can only delete).
/// Returns true on success.
Future<bool> deleteSellerListing(Dio dio, String id) async {
  try {
    await dio.delete(ApiEndpoints.listingById(id));
    return true;
  } catch (_) {
    return false;
  }
}

// ── Server-side pagination ────────────────────────────────────────────────────

const _kListingsPageSize = 20;

class PaginatedListingsState {
  final List<ListingModel> items;
  final bool isLoading;
  final bool hasMore;
  final int page;

  const PaginatedListingsState({
    this.items = const [],
    this.isLoading = false,
    this.hasMore = true,
    this.page = 0,
  });

  PaginatedListingsState copyWith({
    List<ListingModel>? items,
    bool? isLoading,
    bool? hasMore,
    int? page,
  }) =>
      PaginatedListingsState(
        items:     items     ?? this.items,
        isLoading: isLoading ?? this.isLoading,
        hasMore:   hasMore   ?? this.hasMore,
        page:      page      ?? this.page,
      );
}

class PaginatedListingsNotifier
    extends AutoDisposeAsyncNotifier<PaginatedListingsState> {
  @override
  Future<PaginatedListingsState> build() async {
    return _fetchPage(1, []);
  }

  Future<void> loadMore() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore || current.isLoading) return;
    state = AsyncData(current.copyWith(isLoading: true));
    final next = await _fetchPage(current.page + 1, current.items);
    state = AsyncData(next);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = AsyncData(await _fetchPage(1, []));
  }

  Future<PaginatedListingsState> _fetchPage(
      int page, List<ListingModel> existing) async {
    final dio = ref.read(dioProvider);
    final res = await dio.get(
      ApiEndpoints.myListings,
      queryParameters: {'page': page, 'limit': _kListingsPageSize},
    );
    final data = res.data;
    List<ListingModel> newItems;
    bool hasMore;
    if (data is Map) {
      newItems = (data['items'] as List)
          .map((e) => ListingModel.fromJson(e as Map<String, dynamic>))
          .toList();
      hasMore = data['hasMore'] as bool? ?? false;
    } else {
      newItems = (data as List)
          .map((e) => ListingModel.fromJson(e as Map<String, dynamic>))
          .toList();
      hasMore = false;
    }
    return PaginatedListingsState(
      items:     [...existing, ...newItems],
      isLoading: false,
      hasMore:   hasMore,
      page:      page,
    );
  }
}

final paginatedListingsProvider =
    AutoDisposeAsyncNotifierProvider<PaginatedListingsNotifier, PaginatedListingsState>(
  PaginatedListingsNotifier.new,
);
