import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/seller_summary_model.dart';

class SellersFilter {
  final String search;
  final String? governorate;
  final String? animalType;

  const SellersFilter({this.search = '', this.governorate, this.animalType});

  SellersFilter copyWith({
    String? search,
    Object? governorate = _sentinel,
    Object? animalType  = _sentinel,
  }) => SellersFilter(
    search:      search      ?? this.search,
    governorate: governorate == _sentinel ? this.governorate : governorate as String?,
    animalType:  animalType  == _sentinel ? this.animalType  : animalType  as String?,
  );

  @override
  bool operator ==(Object other) =>
      other is SellersFilter &&
      other.search == search &&
      other.governorate == governorate &&
      other.animalType == animalType;

  @override
  int get hashCode => Object.hash(search, governorate, animalType);
}

const _sentinel = Object();

/// Fetches all sellers once and caches them.
final allSellersProvider = FutureProvider<List<SellerSummaryModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.sellers);
  final data = res.data as List? ?? [];
  return data
      .map((e) => SellerSummaryModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

/// Current filter state.
final sellersFilterProvider = StateProvider<SellersFilter>((_) => const SellersFilter());

/// Derived provider: all sellers filtered + sorted by rating.
final filteredSellersProvider =
    Provider<AsyncValue<List<SellerSummaryModel>>>((ref) {
  final allAsync = ref.watch(allSellersProvider);
  final filter   = ref.watch(sellersFilterProvider);

  return allAsync.whenData((all) {
    var result = all.where((s) {
      // Search: farm name or governorate
      if (filter.search.isNotEmpty) {
        final q    = filter.search.toLowerCase();
        final name = (s.farmName ?? s.name).toLowerCase();
        final gov  = (s.governorate ?? '').toLowerCase();
        if (!name.contains(q) && !gov.contains(q)) return false;
      }
      // Governorate filter
      if (filter.governorate != null && s.governorate != filter.governorate) {
        return false;
      }
      // Animal type filter (check both profile types and listing types)
      if (filter.animalType != null) {
        final types = <String>{...s.animalTypes, ...s.listingTypes};
        if (!types.contains(filter.animalType)) return false;
      }
      return true;
    }).toList();

    result.sort((a, b) => b.averageRating.compareTo(a.averageRating));
    return result;
  });
});

// ── Server-side paginated sellers ─────────────────────────────────────────────

const _kSellersPageSize = 20;

class PaginatedSellersState {
  final List<SellerSummaryModel> items;
  final bool isLoading;
  final bool hasMore;
  final int page;

  const PaginatedSellersState({
    this.items = const [],
    this.isLoading = false,
    this.hasMore = true,
    this.page = 0,
  });

  PaginatedSellersState copyWith({
    List<SellerSummaryModel>? items,
    bool? isLoading,
    bool? hasMore,
    int? page,
  }) =>
      PaginatedSellersState(
        items:     items     ?? this.items,
        isLoading: isLoading ?? this.isLoading,
        hasMore:   hasMore   ?? this.hasMore,
        page:      page      ?? this.page,
      );
}

class PaginatedSellersNotifier
    extends AutoDisposeAsyncNotifier<PaginatedSellersState> {
  @override
  Future<PaginatedSellersState> build() async {
    // Watch the filter so we auto-refresh when it changes.
    ref.watch(sellersFilterProvider);
    return _fetchPage(1, []);
  }

  Future<void> loadMore() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore || current.isLoading) return;
    state = AsyncData(current.copyWith(isLoading: true));
    try {
      final next = await _fetchPage(current.page + 1, current.items);
      state = AsyncData(next);
    } catch (e, st) {
      // Restore the previous data; don't wipe what the user already sees.
      state = AsyncData(current.copyWith(isLoading: false));
      // Re-throw so callers can surface errors if needed.
      Error.throwWithStackTrace(e, st);
    }
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = AsyncData(await _fetchPage(1, []));
  }

  Future<PaginatedSellersState> _fetchPage(
      int page, List<SellerSummaryModel> existing) async {
    final dio    = ref.read(dioProvider);
    final filter = ref.read(sellersFilterProvider);

    final params = <String, dynamic>{
      'page':  page,
      'limit': _kSellersPageSize,
    };
    if (filter.search.isNotEmpty)    params['search']      = filter.search;
    if (filter.governorate != null)  params['governorate'] = filter.governorate;
    if (filter.animalType  != null)  params['animalType']  = filter.animalType;

    final res  = await dio.get(ApiEndpoints.sellers, queryParameters: params);
    final data = res.data;

    List<SellerSummaryModel> newItems;
    bool hasMore;

    if (data is Map) {
      // Paginated response: { items, hasMore, page, pages, total }
      newItems = (data['items'] as List? ?? [])
          .map((e) => SellerSummaryModel.fromJson(e as Map<String, dynamic>))
          .toList();
      hasMore = data['hasMore'] as bool? ?? false;
    } else {
      // Flat array (backwards compat / no page param)
      newItems = (data as List? ?? [])
          .map((e) => SellerSummaryModel.fromJson(e as Map<String, dynamic>))
          .toList();
      hasMore = false;
    }

    return PaginatedSellersState(
      items:     [...existing, ...newItems],
      isLoading: false,
      hasMore:   hasMore,
      page:      page,
    );
  }
}

final paginatedSellersProvider =
    AutoDisposeAsyncNotifierProvider<PaginatedSellersNotifier, PaginatedSellersState>(
  PaginatedSellersNotifier.new,
);
