import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/image_helper.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/seller_summary_model.dart';
import '../../../shared/models/supply_model.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../buyer/browse/sellers_service.dart';
import '../../buyer/browse/buyer_supplies_service.dart';
import '../../buyer/favorites/favorites_service.dart';
import '../../buyer/notifications/notifications_service.dart';

// ── Egyptian governorates ─────────────────────────────────────────────────────
const _governorates = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية',
  'القليوبية', 'كفر الشيخ', 'الغربية', 'المنوفية', 'البحيرة',
  'الإسماعيلية', 'السويس', 'بور سعيد', 'دمياط', 'الفيوم',
  'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا',
  'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح',
  'شمال سيناء', 'جنوب سيناء',
];

const _animalTypes = [
  ('cattle',  'أبقار'),
  ('buffalo', 'جاموس'),
  ('sheep',   'خراف'),
  ('goat',    'ماعز'),
  ('camel',   'إبل'),
  ('horse',   'خيول'),
  ('poultry', 'دواجن'),
  ('rabbit',  'أرانب'),
];

class BuyerHomeScreen extends ConsumerStatefulWidget {
  const BuyerHomeScreen({super.key});

  @override
  ConsumerState<BuyerHomeScreen> createState() => _BuyerHomeScreenState();
}

class _BuyerHomeScreenState extends ConsumerState<BuyerHomeScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final _searchCtrl = TextEditingController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    _searchCtrl.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearch(String q) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      ref.read(sellersFilterProvider.notifier).update(
            (f) => f.copyWith(search: q),
          );
    });
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => const _FilterSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final unread = ref.watch(unreadCountProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        title: const Text(
          'FarmFlow',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w800,
            color: AppColors.white,
            fontSize: 20,
          ),
        ),
        actions: [
          Stack(
            alignment: Alignment.topRight,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined,
                    color: AppColors.white),
                onPressed: () => context.push('/buyer/notifications'),
              ),
              if (unread > 0)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    width: 16,
                    height: 16,
                    decoration: const BoxDecoration(
                      color: AppColors.red,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        unread > 9 ? '9+' : '$unread',
                        style: const TextStyle(
                          color: AppColors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(100),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _searchCtrl,
                        onChanged: _onSearch,
                        textDirection: TextDirection.rtl,
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 14,
                          color: AppColors.text,
                        ),
                        decoration: InputDecoration(
                          hintText: 'ابحث عن مزرعة أو محافظة...',
                          hintStyle: TextStyle(
                            fontFamily: 'Cairo',
                            color: AppColors.muted.withValues(alpha: 0.7),
                            fontSize: 13,
                          ),
                          prefixIcon: const Icon(Icons.search,
                              color: AppColors.muted, size: 20),
                          filled: true,
                          fillColor: AppColors.white,
                          contentPadding:
                              const EdgeInsets.symmetric(vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: _showFilterSheet,
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: AppColors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.tune, color: AppColors.green),
                      ),
                    ),
                  ],
                ),
              ),
              TabBar(
                controller: _tabs,
                labelColor: AppColors.white,
                unselectedLabelColor:
                    AppColors.white.withValues(alpha: 0.6),
                indicatorColor: AppColors.white,
                indicatorWeight: 3,
                labelStyle: const TextStyle(
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
                tabs: const [
                  Tab(text: '🌾 المزارع'),
                  Tab(text: '🌙 عروض العيد'),
                  Tab(text: '🛒 المستلزمات'),
                ],
              ),
            ],
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: const [
          _FarmsTab(),
          _EidTab(),
          _SuppliesTab(),
        ],
      ),
    );
  }
}

// ── Farms Tab ─────────────────────────────────────────────────────────────────
class _FarmsTab extends ConsumerWidget {
  const _FarmsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncSellers = ref.watch(paginatedSellersProvider);

    return asyncSellers.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(16),
        child: ShimmerList(count: 6, cardHeight: 200),
      ),
      error: (e, _) => EmptyState(
        icon: Icons.wifi_off_rounded,
        title: 'تعذّر تحميل المزارع',
        subtitle: e.toString(),
        actionLabel: 'إعادة المحاولة',
        action: () => ref.read(paginatedSellersProvider.notifier).refresh(),
      ),
      data: (sellersState) {
        if (sellersState.items.isEmpty) {
          return RefreshIndicator(
            color: AppColors.green,
            onRefresh: () => ref.read(paginatedSellersProvider.notifier).refresh(),
            child: const CustomScrollView(
              slivers: [
                SliverFillRemaining(
                  child: EmptyState(
                    icon: Icons.search_off_rounded,
                    title: 'لا توجد مزارع',
                    subtitle: 'جرّب تعديل كلمة البحث أو الفلتر',
                  ),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          color: AppColors.green,
          onRefresh: () => ref.read(paginatedSellersProvider.notifier).refresh(),
          child: CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverGrid(
                  delegate: SliverChildBuilderDelegate(
                    (_, i) => FarmCard(seller: sellersState.items[i]),
                    childCount: sellersState.items.length,
                  ),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.72,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                ),
              ),
              // Load-more footer
              SliverToBoxAdapter(
                child: sellersState.isLoading
                    ? const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Center(
                          child: CircularProgressIndicator(
                              color: AppColors.green, strokeWidth: 2.5),
                        ),
                      )
                    : sellersState.hasMore
                        ? Padding(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            child: Center(
                              child: OutlinedButton.icon(
                                onPressed: () => ref
                                    .read(paginatedSellersProvider.notifier)
                                    .loadMore(),
                                icon: const Icon(Icons.expand_more,
                                    color: AppColors.green),
                                label: const Text(
                                  'تحميل المزيد',
                                  style: TextStyle(
                                    fontFamily: 'Cairo',
                                    color: AppColors.green,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(
                                      color: AppColors.green),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                ),
                              ),
                            ),
                          )
                        : const SizedBox(height: 16),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ── Eid Tab ───────────────────────────────────────────────────────────────────
class _EidTab extends ConsumerWidget {
  const _EidTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Reuse the already-loaded sellers list; farms with eidAvailable
    // listings are identified by listingTypes containing relevant types
    final asyncAll = ref.watch(allSellersProvider);

    return asyncAll.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(16),
        child: ShimmerList(count: 4, cardHeight: 200),
      ),
      error: (_, __) => const EmptyState(
        icon: Icons.sentiment_dissatisfied,
        title: 'تعذّر التحميل',
      ),
      data: (all) {
        // Show all sellers that have livestock listings (eid candidates)
        final eid = all
            .where((s) =>
                s.listingCount > 0 &&
                s.listingTypes.any((t) =>
                    ['sheep', 'goat', 'cattle', 'camel'].contains(t)))
            .toList();

        if (eid.isEmpty) {
          return const EmptyState(
            icon: Icons.event_outlined,
            title: 'لا توجد عروض عيد حالياً',
            subtitle: 'تابع المزارع للحصول على آخر العروض',
          );
        }
        return RefreshIndicator(
          color: AppColors.green,
          onRefresh: () async => ref.invalidate(allSellersProvider),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: eid.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _EidFarmTile(seller: eid[i]),
          ),
        );
      },
    );
  }
}

class _EidFarmTile extends ConsumerWidget {
  const _EidFarmTile({required this.seller});
  final SellerSummaryModel seller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isFav = ref.watch(favoriteIdsProvider).contains(seller.id);
    return GestureDetector(
      onTap: () => context.push('/buyer/farm/${seller.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
          boxShadow: const [
            BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2)),
          ],
        ),
        child: Row(
          children: [
            Hero(
              tag: 'farm-banner-${seller.id}',
              child: ClipRRect(
                borderRadius: const BorderRadius.horizontal(
                    right: Radius.circular(14)),
                child: SizedBox(
                  width: 90,
                  height: 90,
                  child: seller.farmBanner != null
                      ? CachedNetworkImage(
                          imageUrl: imageUrl(seller.farmBanner),
                          fit: BoxFit.cover,
                          placeholder: (_, __) => const ShimmerFill(),
                          errorWidget: (_, __, ___) =>
                              const _BannerPlaceholder(compact: true),
                        )
                      : const _BannerPlaceholder(compact: true),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      seller.displayName,
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: AppColors.text,
                      ),
                    ),
                    if (seller.governorate != null)
                      Text(
                        seller.governorate!,
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12,
                          color: AppColors.muted,
                        ),
                      ),
                    const SizedBox(height: 4),
                    _TypeChips(types: seller.listingTypes),
                  ],
                ),
              ),
            ),
            IconButton(
              icon: Icon(
                isFav ? Icons.favorite : Icons.favorite_border,
                color: isFav ? AppColors.red : AppColors.muted,
                size: 20,
              ),
              onPressed: () =>
                  ref.read(favoriteIdsProvider.notifier).toggle(seller.id),
            ),
          ],
        ),
      ),
    );
  }
}

// ── FarmCard ──────────────────────────────────────────────────────────────────
class FarmCard extends ConsumerWidget {
  const FarmCard({super.key, required this.seller});
  final SellerSummaryModel seller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isFav = ref.watch(favoriteIdsProvider).contains(seller.id);

    return GestureDetector(
      onTap: () => context.push('/buyer/farm/${seller.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0D000000),
              blurRadius: 8,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Banner
            Stack(
              children: [
                Hero(
                  tag: 'farm-banner-${seller.id}',
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(13)),
                    child: SizedBox(
                      height: 100,
                      child: seller.farmBanner != null
                          ? CachedNetworkImage(
                              imageUrl: imageUrl(seller.farmBanner),
                              fit: BoxFit.cover,
                              placeholder: (_, __) => const ShimmerFill(),
                              errorWidget: (_, __, ___) =>
                                  const _BannerPlaceholder(),
                            )
                          : const _BannerPlaceholder(),
                    ),
                  ),
                ),
                // "جديد" badge
                if (seller.isNew)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.amber,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'جديد',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppColors.white,
                        ),
                      ),
                    ),
                  ),
                // Favorite button
                Positioned(
                  top: 4,
                  right: 4,
                  child: GestureDetector(
                    onTap: () =>
                        ref.read(favoriteIdsProvider.notifier).toggle(seller.id),
                    child: Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: AppColors.white.withValues(alpha: 0.85),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isFav ? Icons.favorite : Icons.favorite_border,
                        color: isFav ? AppColors.red : AppColors.muted,
                        size: 16,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            // Info
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      seller.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.text,
                      ),
                    ),
                    if (seller.governorate != null)
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined,
                              size: 11, color: AppColors.muted),
                          const SizedBox(width: 2),
                          Text(
                            seller.governorate!,
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 11,
                              color: AppColors.muted,
                            ),
                          ),
                        ],
                      ),
                    const SizedBox(height: 4),
                    // Rating
                    Row(
                      children: [
                        const Icon(Icons.star_rounded,
                            size: 13, color: AppColors.amber),
                        const SizedBox(width: 2),
                        Text(
                          seller.averageRating > 0
                              ? seller.averageRating.toStringAsFixed(1)
                              : 'جديد',
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.text,
                          ),
                        ),
                        if (seller.reviewCount > 0) ...[
                          const SizedBox(width: 2),
                          Text(
                            '(${seller.reviewCount})',
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 10,
                              color: AppColors.muted,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    _TypeChips(
                        types: seller.listingTypes.isNotEmpty
                            ? seller.listingTypes
                            : seller.animalTypes),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Animal type chips ─────────────────────────────────────────────────────────
class _TypeChips extends StatelessWidget {
  const _TypeChips({required this.types});
  final List<String> types;

  static const _labels = {
    'cattle': 'أبقار', 'buffalo': 'جاموس', 'sheep': 'خراف',
    'goat': 'ماعز', 'camel': 'إبل', 'horse': 'خيول',
    'poultry': 'دواجن', 'rabbit': 'أرانب', 'other': 'أخرى',
    'milk': 'لبن', 'cheese': 'جبنة', 'yogurt': 'زبادي',
    'butter': 'زبد', 'cream': 'قشطة', 'ghee': 'سمن',
  };

  @override
  Widget build(BuildContext context) {
    final show = types.take(3).toList();
    return Wrap(
      spacing: 4,
      runSpacing: 2,
      children: show.map((t) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: AppColors.greenBg,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          _labels[t] ?? t,
          style: const TextStyle(
            fontFamily: 'Cairo',
            fontSize: 9,
            color: AppColors.greenText,
            fontWeight: FontWeight.w700,
          ),
        ),
      )).toList(),
    );
  }
}

// ── Banner placeholder ────────────────────────────────────────────────────────
class _BannerPlaceholder extends StatelessWidget {
  const _BannerPlaceholder({this.compact = false});
  final bool compact;

  @override
  Widget build(BuildContext context) => Container(
    color: AppColors.greenBg,
    child: Center(
      child: Text(
        '🌾',
        style: TextStyle(fontSize: compact ? 24 : 36),
      ),
    ),
  );
}

// ── Supplies Tab ──────────────────────────────────────────────────────────────
class _SuppliesTab extends ConsumerWidget {
  const _SuppliesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncSupplies = ref.watch(allSuppliesProvider);

    return asyncSupplies.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(16),
        child: ShimmerList(count: 6, cardHeight: 140),
      ),
      error: (e, _) => EmptyState(
        icon: Icons.wifi_off_rounded,
        title: 'تعذّر تحميل المستلزمات',
        subtitle: e.toString(),
        actionLabel: 'إعادة المحاولة',
        action: () => ref.invalidate(allSuppliesProvider),
      ),
      data: (supplies) {
        if (supplies.isEmpty) {
          return const EmptyState(
            icon: Icons.storefront_outlined,
            title: 'لا توجد مستلزمات متاحة',
            subtitle: 'تابع لاحقاً لعروض العلف والمعدات',
          );
        }
        return RefreshIndicator(
          color: AppColors.green,
          onRefresh: () async => ref.invalidate(allSuppliesProvider),
          child: GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.78,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: supplies.length,
            itemBuilder: (_, i) => _SupplyCard(supply: supplies[i]),
          ),
        );
      },
    );
  }
}

class _SupplyCard extends StatelessWidget {
  const _SupplyCard({required this.supply});
  final SupplyModel supply;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/buyer/supply/${supply.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
          boxShadow: const [
            BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Image
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(13)),
              child: SizedBox(
                height: 90,
                child: supply.images.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: imageUrl(supply.images.first),
                        fit: BoxFit.cover,
                        placeholder: (_, __) => const ShimmerFill(),
                        errorWidget: (_, __, ___) => const _SupplyPlaceholder(),
                      )
                    : const _SupplyPlaceholder(),
              ),
            ),
            // Info
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      supply.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.greenBg,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        supply.categoryAr,
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 9,
                          color: AppColors.greenText,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '${supply.pricePerUnit.toStringAsFixed(0)} ج.م/${supply.unit}',
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: AppColors.green,
                      ),
                    ),
                    if (supply.deliveryAvailable)
                      Row(
                        children: const [
                          Icon(Icons.local_shipping_outlined,
                              size: 10, color: AppColors.muted),
                          SizedBox(width: 2),
                          Text(
                            'توصيل متاح',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 9,
                              color: AppColors.muted,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SupplyPlaceholder extends StatelessWidget {
  const _SupplyPlaceholder();

  @override
  Widget build(BuildContext context) => Container(
    color: const Color(0xFFF0F4FF),
    child: const Center(child: Text('🛒', style: TextStyle(fontSize: 32))),
  );
}

// ── Filter bottom sheet ───────────────────────────────────────────────────────
class _FilterSheet extends ConsumerWidget {
  const _FilterSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(sellersFilterProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      expand: false,
      builder: (_, scrollCtrl) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Handle
            Center(
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const Text(
              'فلترة المزارع',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: AppColors.text,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'المحافظة',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.muted,
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: ListView(
                controller: scrollCtrl,
                children: [
                  // Governorate selector
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _FilterChip(
                        label: 'الكل',
                        selected: filter.governorate == null,
                        onTap: () => ref
                            .read(sellersFilterProvider.notifier)
                            .update((f) => f.copyWith(governorate: null)),
                      ),
                      ..._governorates.map((g) => _FilterChip(
                            label: g,
                            selected: filter.governorate == g,
                            onTap: () => ref
                                .read(sellersFilterProvider.notifier)
                                .update((f) => f.copyWith(governorate: g)),
                          )),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'نوع الماشية',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.muted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _FilterChip(
                        label: 'الكل',
                        selected: filter.animalType == null,
                        onTap: () => ref
                            .read(sellersFilterProvider.notifier)
                            .update((f) => f.copyWith(animalType: null)),
                      ),
                      ..._animalTypes.map((t) => _FilterChip(
                            label: t.$2,
                            selected: filter.animalType == t.$1,
                            onTap: () => ref
                                .read(sellersFilterProvider.notifier)
                                .update((f) => f.copyWith(animalType: t.$1)),
                          )),
                    ],
                  ),
                  const SizedBox(height: 24),
                  // Reset button
                  if (filter.governorate != null || filter.animalType != null)
                    OutlinedButton(
                      onPressed: () {
                        ref
                            .read(sellersFilterProvider.notifier)
                            .update((_) => const SellersFilter());
                        Navigator.pop(context);
                      },
                      child: const Text(
                        'مسح الفلتر',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          color: AppColors.red,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context),
              style: FilledButton.styleFrom(backgroundColor: AppColors.green),
              child: const Text(
                'تطبيق',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: selected ? AppColors.green : AppColors.bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: selected ? AppColors.green : AppColors.border,
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontFamily: 'Cairo',
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: selected ? AppColors.white : AppColors.text,
        ),
      ),
    ),
  );
}
