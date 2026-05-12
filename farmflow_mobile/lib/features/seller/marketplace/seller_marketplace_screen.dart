import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';

// ── Data model ─────────────────────────────────────────────────────────────────

/// Groups all approved supplies by their seller, built client-side from
/// a flat GET /supplies response.
class MarketplaceFarm {
  const MarketplaceFarm({
    required this.sellerId,
    required this.sellerName,
    this.farmName,
    this.governorate,
    required this.categories,
    required this.count,
  });

  final String sellerId;
  final String sellerName;
  final String? farmName;
  final String? governorate;
  final List<String> categories; // deduplicated
  final int count;

  String get displayName => farmName ?? sellerName;
}

// ── Provider ───────────────────────────────────────────────────────────────────

/// Fetches all approved supplies and groups them by seller client-side.
/// Falls back gracefully: if the marketplace endpoint 404s, it uses the
/// generic /supplies endpoint (which returns approved supplies by default).
final marketplaceFarmsProvider = FutureProvider<List<MarketplaceFarm>>((ref) async {
  final dio = ref.watch(dioProvider);

  List<dynamic> raw;
  try {
    // Prefer the dedicated marketplace endpoint if it exists.
    final res = await dio.get(ApiEndpoints.marketplaceSupplies);
    raw = res.data as List? ?? [];

    // If the endpoint returns grouped objects (seller + categories + count),
    // parse them directly without further grouping.
    if (raw.isNotEmpty && raw.first is Map && raw.first['seller'] is Map) {
      return raw.map((item) {
        final m = item as Map<String, dynamic>;
        final seller = m['seller'] as Map<String, dynamic>;
        final cats = (m['categories'] as List?)
                ?.map((c) => c.toString())
                .toList() ??
            const <String>[];
        return MarketplaceFarm(
          sellerId: (seller['_id'] ?? seller['id'] ?? '').toString(),
          sellerName: (seller['name'] ?? '').toString(),
          farmName: seller['farmName'] as String?,
          governorate: seller['governorate'] as String?,
          categories: cats,
          count: (m['count'] as num?)?.toInt() ?? 0,
        );
      }).toList();
    }
  } catch (_) {
    // Endpoint not implemented — fall through to generic /supplies.
  }

  // Generic fallback: GET /supplies returns flat list of approved supplies
  // with a populated seller field.
  try {
    final res = await dio.get(ApiEndpoints.supplies);
    raw = res.data as List? ?? [];
  } catch (_) {
    raw = const [];
  }

  // Group flat supply list by seller._id.
  final byId = <String, Map<String, dynamic>>{};
  for (final item in raw) {
    final m = item as Map<String, dynamic>;
    final sellerRaw = m['seller'];
    if (sellerRaw == null) continue;

    final String id;
    String sellerName = '';
    String? farmName;
    String? governorate;

    if (sellerRaw is Map) {
      id = (sellerRaw['_id'] ?? sellerRaw['id'] ?? '').toString();
      sellerName = (sellerRaw['name'] ?? '').toString();
      farmName = sellerRaw['farmName'] as String?;
      governorate = sellerRaw['governorate'] as String?;
    } else {
      id = sellerRaw.toString();
    }

    if (id.isEmpty) continue;

    if (!byId.containsKey(id)) {
      byId[id] = {
        'sellerId': id,
        'sellerName': sellerName,
        'farmName': farmName,
        'governorate': governorate,
        'categories': <String>{},
        'count': 0,
      };
    }
    final entry = byId[id]!;
    // Always keep the richest version of seller metadata we've seen.
    if (sellerName.isNotEmpty) entry['sellerName'] = sellerName;
    if (farmName != null) entry['farmName'] = farmName;
    if (governorate != null) entry['governorate'] = governorate;
    (entry['categories'] as Set<String>).add(m['category'] as String? ?? 'other');
    entry['count'] = (entry['count'] as int) + 1;
  }

  return byId.values.map((e) {
    return MarketplaceFarm(
      sellerId: e['sellerId'] as String,
      sellerName: e['sellerName'] as String,
      farmName: e['farmName'] as String?,
      governorate: e['governorate'] as String?,
      categories: (e['categories'] as Set<String>).toList(),
      count: e['count'] as int,
    );
  }).toList();
});

// ── Screen ─────────────────────────────────────────────────────────────────────

class SellerMarketplaceScreen extends ConsumerStatefulWidget {
  const SellerMarketplaceScreen({super.key});

  @override
  ConsumerState<SellerMarketplaceScreen> createState() =>
      _SellerMarketplaceScreenState();
}

class _SellerMarketplaceScreenState
    extends ConsumerState<SellerMarketplaceScreen> {
  final _searchCtrl = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  List<MarketplaceFarm> _filter(List<MarketplaceFarm> farms) {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return farms;
    return farms
        .where((f) =>
            f.displayName.toLowerCase().contains(q) ||
            (f.governorate?.toLowerCase().contains(q) ?? false))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final asyncFarms = ref.watch(marketplaceFarmsProvider);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.bg,
        appBar: AppBar(
          backgroundColor: AppColors.green,
          elevation: 0,
          leading: const BackButton(color: AppColors.white),
          title: const Text(
            'سوق المستلزمات',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w800,
              color: AppColors.white,
              fontSize: 18,
            ),
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(56),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
              child: TextField(
                controller: _searchCtrl,
                textDirection: TextDirection.rtl,
                onChanged: (v) => setState(() => _query = v),
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 14,
                  color: AppColors.text,
                ),
                decoration: InputDecoration(
                  hintText: 'ابحث باسم المزرعة أو المحافظة...',
                  hintStyle: TextStyle(
                    fontFamily: 'Cairo',
                    color: AppColors.muted.withValues(alpha: 0.7),
                    fontSize: 13,
                  ),
                  prefixIcon: const Icon(Icons.search,
                      color: AppColors.muted, size: 20),
                  suffixIcon: _query.isNotEmpty
                      ? GestureDetector(
                          onTap: () {
                            _searchCtrl.clear();
                            setState(() => _query = '');
                          },
                          child: const Icon(Icons.close,
                              color: AppColors.muted, size: 18),
                        )
                      : null,
                  filled: true,
                  fillColor: AppColors.white,
                  contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
          ),
        ),
        body: asyncFarms.when(
          loading: () => const _ShimmerGrid(),
          error: (e, _) => EmptyState(
            icon: Icons.wifi_off_rounded,
            title: 'تعذّر تحميل المزارع',
            subtitle: e.toString(),
            actionLabel: 'إعادة المحاولة',
            action: () => ref.invalidate(marketplaceFarmsProvider),
          ),
          data: (farms) {
            final visible = _filter(farms);

            if (farms.isEmpty) {
              return const EmptyState(
                icon: Icons.storefront_outlined,
                title: 'لا توجد مزارع تبيع مستلزمات حاليًا',
                subtitle: 'تحقق لاحقًا عندما يضيف المزارعون مستلزماتهم',
              );
            }

            if (visible.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.search_off_rounded,
                          size: 48, color: AppColors.muted.withValues(alpha: 0.5)),
                      const SizedBox(height: 12),
                      Text(
                        'لا توجد نتائج لـ "$_query"',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 15,
                          color: AppColors.muted,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              );
            }

            return RefreshIndicator(
              color: AppColors.green,
              onRefresh: () async => ref.invalidate(marketplaceFarmsProvider),
              child: CustomScrollView(
                slivers: [
                  // Count header
                  SliverToBoxAdapter(
                    child: Padding(
                      padding:
                          const EdgeInsets.fromLTRB(16, 14, 16, 6),
                      child: Text(
                        '${visible.length} مزرعة تعرض مستلزمات',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 13,
                          color: AppColors.muted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    sliver: SliverGrid(
                      delegate: SliverChildBuilderDelegate(
                        (context, i) =>
                            _FarmCard(farm: visible[i]),
                        childCount: visible.length,
                      ),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.78,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

// ── Farm card ──────────────────────────────────────────────────────────────────

class _FarmCard extends StatelessWidget {
  const _FarmCard({required this.farm});
  final MarketplaceFarm farm;

  static const _catMeta = <String, (String, Color)>{
    'feed':       ('🌾 علف',     Color(0xFF16A34A)),
    'veterinary': ('💊 بيطرية',  Color(0xFFDC2626)),
    'equipment':  ('🔧 معدات',   Color(0xFF2563EB)),
    'seeds':      ('🌱 بذور',    Color(0xFF059669)),
    'other':      ('📦 أخرى',    Color(0xFF6B7280)),
  };

  /// Generates a deterministic accent color from the seller ID string.
  Color _avatarColor() {
    const palette = [
      Color(0xFF3A7D44), // green
      Color(0xFF2563EB), // blue
      Color(0xFFD97706), // amber
      Color(0xFF7C3AED), // violet
      Color(0xFFDB2777), // pink
      Color(0xFF0891B2), // cyan
      Color(0xFF059669), // emerald
    ];
    final code = farm.sellerId.codeUnits
        .fold<int>(0, (acc, c) => acc + c);
    return palette[code % palette.length];
  }

  String get _initials {
    final name = farm.displayName.trim();
    if (name.isEmpty) return 'م';
    final parts = name.split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}';
    }
    return name.length >= 2 ? name.substring(0, 2) : name[0];
  }

  @override
  Widget build(BuildContext context) {
    final color = _avatarColor();
    final cats = farm.categories.take(3).toList();

    return GestureDetector(
      onTap: () => context.push('/seller/marketplace/${farm.sellerId}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE5E5DC)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0F000000),
              blurRadius: 10,
              offset: Offset(0, 3),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 16, 12, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Avatar circle with colorful initials
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: color.withValues(alpha: 0.30),
                    width: 2,
                  ),
                ),
                child: Center(
                  child: Text(
                    _initials,
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: color,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 10),

              // Farm name
              Text(
                farm.displayName,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.text,
                  height: 1.3,
                ),
              ),

              const SizedBox(height: 4),

              // Governorate
              if (farm.governorate != null) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.location_on_rounded,
                        size: 11,
                        color: AppColors.muted.withValues(alpha: 0.8)),
                    const SizedBox(width: 2),
                    Flexible(
                      child: Text(
                        farm.governorate!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
                          color: AppColors.muted.withValues(alpha: 0.8),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
              ] else
                const SizedBox(height: 6),

              // Category chips
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 4,
                runSpacing: 4,
                children: cats.map((cat) {
                  final meta = _catMeta[cat] ??
                      ('📦 أخرى', const Color(0xFF6B7280));
                  return Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: meta.$2.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: meta.$2.withValues(alpha: 0.25)),
                    ),
                    child: Text(
                      meta.$1,
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        color: meta.$2,
                      ),
                    ),
                  );
                }).toList(),
              ),

              const Spacer(),

              // Supply count pill
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.green.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${farm.count} منتج',
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: AppColors.green,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Loading shimmer (2-column grid) ───────────────────────────────────────────

class _ShimmerGrid extends StatelessWidget {
  const _ShimmerGrid();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: GridView.builder(
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.78,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: 6,
        itemBuilder: (_, __) => const _ShimmerFarmCard(),
      ),
    );
  }
}

class _ShimmerFarmCard extends StatelessWidget {
  const _ShimmerFarmCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E5DC)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 16, 12, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Avatar placeholder
            ShimmerBox(
              width: 60,
              height: 60,
              borderRadius: 30,
            ),
            const SizedBox(height: 10),
            // Name placeholder
            ShimmerBox(width: 90, height: 13, borderRadius: 6),
            const SizedBox(height: 6),
            // Governorate placeholder
            ShimmerBox(width: 60, height: 11, borderRadius: 6),
            const SizedBox(height: 8),
            // Category chips placeholder
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ShimmerBox(width: 44, height: 20, borderRadius: 10),
                const SizedBox(width: 4),
                ShimmerBox(width: 44, height: 20, borderRadius: 10),
              ],
            ),
            const Spacer(),
            // Count pill placeholder
            ShimmerBox(width: 70, height: 26, borderRadius: 13),
          ],
        ),
      ),
    );
  }
}
