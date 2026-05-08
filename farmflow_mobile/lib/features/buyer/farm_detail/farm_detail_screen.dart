import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/api/image_helper.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/listing_model.dart';
import '../../../shared/models/dairy_product_model.dart';
import '../../../shared/models/review_model.dart';
import '../../../shared/models/supply_model.dart';
import '../../../shared/models/user_model.dart';
import '../../../shared/widgets/contact_buttons.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import '../favorites/favorites_service.dart';
import '../../../core/l10n/l10n_ext.dart';
import 'farm_detail_service.dart';

class FarmDetailScreen extends ConsumerStatefulWidget {
  const FarmDetailScreen({super.key, required this.sellerId});
  final String sellerId;

  @override
  ConsumerState<FarmDetailScreen> createState() => _FarmDetailScreenState();
}

class _FarmDetailScreenState extends ConsumerState<FarmDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final asyncData = ref.watch(farmDetailProvider(widget.sellerId));
    final isFav = ref.watch(favoriteIdsProvider).contains(widget.sellerId);

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: asyncData.when(
        loading: () => const _LoadingView(),
        error: (e, _) => Scaffold(
          appBar: AppBar(leading: BackButton(onPressed: () => context.pop())),
          body: EmptyState(
            icon: Icons.wifi_off_rounded,
            title: context.l10n.farmDetailLoadFailed,
            subtitle: e.toString(),
            actionLabel: context.l10n.retry,
            action: () => ref.invalidate(farmDetailProvider(widget.sellerId)),
          ),
        ),
        data: (data) => _FarmDetailBody(
          data: data,
          tabs: _tabs,
          isFav: isFav,
          onFavToggle: () =>
              ref.read(favoriteIdsProvider.notifier).toggle(widget.sellerId),
          sellerId: widget.sellerId,
        ),
      ),
    );
  }
}

class _FarmDetailBody extends StatelessWidget {
  const _FarmDetailBody({
    required this.data,
    required this.tabs,
    required this.isFav,
    required this.onFavToggle,
    required this.sellerId,
  });

  final FarmDetailData data;
  final TabController tabs;
  final bool isFav;
  final VoidCallback onFavToggle;
  final String sellerId;

  @override
  Widget build(BuildContext context) {
    final seller = data.seller;

    return NestedScrollView(
      headerSliverBuilder: (context, _) => [
        SliverAppBar(
          expandedHeight: 200,
          pinned: true,
          backgroundColor: AppColors.green,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios, color: AppColors.white),
            onPressed: () => context.pop(),
          ),
          actions: [
            IconButton(
              icon: Icon(
                isFav ? Icons.favorite : Icons.favorite_border,
                color: AppColors.white,
              ),
              onPressed: onFavToggle,
            ),
          ],
          flexibleSpace: FlexibleSpaceBar(
            background: Hero(
              tag: 'farm-banner-$sellerId',
              child: seller.farmBanner != null
                  ? CachedNetworkImage(
                      imageUrl: imageUrl(seller.farmBanner),
                      fit: BoxFit.cover,
                      placeholder: (_, __) => const ShimmerFill(),
                      errorWidget: (_, __, ___) => const _BannerFallback(),
                    )
                  : const _BannerFallback(),
            ),
          ),
        ),
        SliverToBoxAdapter(child: _HeaderCard(seller: seller)),
        SliverToBoxAdapter(
          child: TabBar(
            controller: tabs,
            labelColor: AppColors.green,
            unselectedLabelColor: AppColors.muted,
            indicatorColor: AppColors.green,
            indicatorWeight: 3,
            labelStyle: const TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
            tabs: [
              Tab(text: '${context.l10n.tabLivestock} (${data.listings.length})'),
              Tab(text: '${context.l10n.tabDairy} (${data.dairy.length})'),
              Tab(text: '${context.l10n.tabSuppliesLabel} (${data.supplies.length})'),
              Tab(text: context.l10n.tabReviews),
            ],
          ),
        ),
      ],
      body: TabBarView(
        controller: tabs,
        children: [
          _LivestockTab(listings: data.listings),
          _DairyTab(dairy: data.dairy),
          _SuppliesTab(supplies: data.supplies),
          _ReviewsTab(sellerId: sellerId),
        ],
      ),
    );
  }
}

// ── Header card ───────────────────────────────────────────────────────────────
class _HeaderCard extends StatelessWidget {
  const _HeaderCard({required this.seller});
  final UserModel seller;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.card,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            seller.farmName ?? seller.name,
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppColors.text,
            ),
          ),
          if (seller.governorate != null) ...[
            const SizedBox(height: 2),
            Row(children: [
              const Icon(Icons.location_on_outlined, size: 14, color: AppColors.muted),
              const SizedBox(width: 4),
              Text(seller.governorate!,
                  style: const TextStyle(
                      fontFamily: 'Cairo', fontSize: 13, color: AppColors.muted)),
            ]),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              _StatBadge(
                icon: Icons.star_rounded,
                iconColor: AppColors.amber,
                label: seller.averageRating > 0
                    ? seller.averageRating.toStringAsFixed(1)
                    : context.l10n.newBadge,
              ),
              const SizedBox(width: 12),
              _StatBadge(
                icon: Icons.rate_review_outlined,
                iconColor: AppColors.blue,
                label: context.l10n.reviewCount(seller.reviewCount),
              ),
              if (seller.experience != null) ...[
                const SizedBox(width: 12),
                _StatBadge(
                  icon: Icons.history_edu_outlined,
                  iconColor: AppColors.green,
                  label: seller.experience!,
                ),
              ],
            ],
          ),
          // Bio / description
          if (seller.bio != null) ...[
            const SizedBox(height: 10),
            Text(
              seller.bio!,
              style: const TextStyle(
                  fontFamily: 'Cairo', fontSize: 13, color: AppColors.text, height: 1.5),
            ),
          ] else if (seller.farmDescription != null) ...[
            const SizedBox(height: 10),
            Text(
              seller.farmDescription!,
              style: const TextStyle(
                  fontFamily: 'Cairo', fontSize: 13, color: AppColors.text, height: 1.5),
            ),
          ],
          // Working hours
          if (seller.workingHours != null) ...[
            const SizedBox(height: 10),
            _WorkingHoursRow(workingHours: seller.workingHours!),
          ],
          if (seller.farmCertificates.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: seller.farmCertificates.map((c) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.greenBg,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF86EFAC)),
                ),
                child: Text('✓ $c',
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.greenText,
                    )),
              )).toList(),
            ),
          ],
          if (seller.farmPhone != null) ...[
            const SizedBox(height: 12),
            ContactButtons(phone: seller.farmPhone!),
          ],
          if (seller.personalPhone != null &&
              seller.personalPhone != seller.farmPhone) ...[
            const SizedBox(height: 8),
            Row(children: [
              const Icon(Icons.person_outline, size: 14, color: AppColors.muted),
              const SizedBox(width: 4),
              Text(context.l10n.personalPhone(seller.personalPhone!),
                  style: const TextStyle(fontFamily: 'Cairo',
                      fontSize: 12, color: AppColors.muted)),
            ]),
          ],
        ],
      ),
    );
  }
}

// ── Working hours row ─────────────────────────────────────────────────────────
class _WorkingHoursRow extends StatelessWidget {
  const _WorkingHoursRow({required this.workingHours});
  final String workingHours;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(Icons.access_time_outlined, size: 14, color: AppColors.muted),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            workingHours,
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize: 12,
              color: AppColors.muted,
            ),
          ),
        ),
      ],
    );
  }
}

class _StatBadge extends StatelessWidget {
  const _StatBadge({required this.icon, required this.iconColor, required this.label});
  final IconData icon;
  final Color iconColor;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 14, color: iconColor),
      const SizedBox(width: 3),
      Text(label,
          style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: AppColors.text)),
    ],
  );
}

// ── Livestock tab ─────────────────────────────────────────────────────────────
class _LivestockTab extends StatelessWidget {
  const _LivestockTab({required this.listings});
  final List<ListingModel> listings;

  @override
  Widget build(BuildContext context) {
    if (listings.isEmpty) {
      return EmptyState(
        icon: Icons.pets_outlined,
        title: context.l10n.noLivestockForSale,
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: listings.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, i) => _LivestockCard(listing: listings[i]),
    );
  }
}

class _LivestockCard extends StatelessWidget {
  const _LivestockCard({required this.listing});
  final ListingModel listing;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/buyer/listing/${listing.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
          boxShadow: const [
            BoxShadow(color: Color(0x08000000), blurRadius: 6, offset: Offset(0, 2)),
          ],
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.horizontal(right: Radius.circular(13)),
              child: SizedBox(
                width: 90,
                height: 90,
                child: listing.images.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: imageUrl(listing.images.first),
                        fit: BoxFit.cover,
                        placeholder: (_, __) => const ShimmerFill(),
                        errorWidget: (_, __, ___) =>
                            _ListingPlaceholder(type: listing.type),
                      )
                    : _ListingPlaceholder(type: listing.type),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        _TypeChip(label: listing.typeAr),
                        if (listing.eidAvailable) ...[
                          const SizedBox(width: 6),
                          const _EidChip(),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    if (listing.breed != null)
                      Text(listing.breed!,
                          style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.text)),
                    Text('${listing.weight} كجم  •  ${listing.ageText}',
                        style: const TextStyle(
                            fontFamily: 'Cairo', fontSize: 12, color: AppColors.muted)),
                    const SizedBox(height: 4),
                    Text('${listing.price.toStringAsFixed(0)} ج.م',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.green,
                        )),
                  ],
                ),
              ),
            ),
            const Padding(
              padding: EdgeInsets.only(left: 12),
              child: Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  const _TypeChip({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
    decoration: BoxDecoration(
      color: AppColors.greenBg,
      borderRadius: BorderRadius.circular(8),
    ),
    child: Text(label,
        style: const TextStyle(
            fontFamily: 'Cairo',
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: AppColors.greenText)),
  );
}

class _EidChip extends StatelessWidget {
  const _EidChip();
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
    decoration: BoxDecoration(
      color: const Color(0xFFFEF3C7),
      borderRadius: BorderRadius.circular(8),
    ),
    child: const Text('🌙 عيد',
        style: TextStyle(
            fontFamily: 'Cairo',
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: Color(0xFFD97706))),
  );
}

class _ListingPlaceholder extends StatelessWidget {
  const _ListingPlaceholder({required this.type});
  final String type;
  static const _emojis = {
    'cattle': '🐄', 'buffalo': '🐃', 'sheep': '🐑', 'goat': '🐐',
    'camel': '🐪', 'horse': '🐴', 'poultry': '🐔', 'rabbit': '🐇',
  };
  @override
  Widget build(BuildContext context) => Container(
    color: AppColors.greenBg,
    child: Center(child: Text(_emojis[type] ?? '🐾', style: const TextStyle(fontSize: 36))),
  );
}

// ── Dairy tab ─────────────────────────────────────────────────────────────────
class _DairyTab extends StatelessWidget {
  const _DairyTab({required this.dairy});
  final List<DairyProductModel> dairy;

  @override
  Widget build(BuildContext context) {
    if (dairy.isEmpty) {
      return EmptyState(
        icon: Icons.local_drink_outlined,
        title: context.l10n.noDairyProducts,
      );
    }
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.8,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: dairy.length,
      itemBuilder: (_, i) => _DairyCard(product: dairy[i]),
    );
  }
}

class _DairyCard extends StatelessWidget {
  const _DairyCard({required this.product});
  final DairyProductModel product;
  static const _emojis = {
    'milk': '🥛', 'cheese': '🧀', 'yogurt': '🥣',
    'butter': '🧈', 'cream': '🍦', 'ghee': '🫙', 'other': '🏺',
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(color: Color(0x08000000), blurRadius: 6, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(13)),
            child: SizedBox(
              height: 90,
              child: product.images.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: imageUrl(product.images.first),
                      fit: BoxFit.cover,
                      placeholder: (_, __) => const ShimmerFill(),
                      errorWidget: (_, __, ___) => _dairyPlaceholder(product.type),
                    )
                  : _dairyPlaceholder(product.type),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.text)),
                Text('${product.quantity.toStringAsFixed(0)} ${product.unitAr}',
                    style: const TextStyle(
                        fontFamily: 'Cairo', fontSize: 11, color: AppColors.muted)),
                const SizedBox(height: 4),
                Text('${product.pricePerUnit.toStringAsFixed(0)} ج.م / ${product.unitAr}',
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: AppColors.green,
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _dairyPlaceholder(String type) => Container(
    color: const Color(0xFFFFF7ED),
    child: Center(child: Text(_emojis[type] ?? '🥛', style: const TextStyle(fontSize: 36))),
  );
}

// ── Supplies tab ──────────────────────────────────────────────────────────────
class _SuppliesTab extends StatelessWidget {
  const _SuppliesTab({required this.supplies});
  final List<SupplyModel> supplies;

  @override
  Widget build(BuildContext context) {
    if (supplies.isEmpty) {
      return EmptyState(
        icon: Icons.inventory_2_outlined,
        title: context.l10n.noSuppliesAvailable,
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: supplies.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) => _SupplyCard(supply: supplies[i]),
    );
  }
}

class _SupplyCard extends StatelessWidget {
  const _SupplyCard({required this.supply});
  final SupplyModel supply;

  static const _catColors = {
    'feed':       Color(0xFF22C55E),
    'veterinary': Color(0xFFEF4444),
    'equipment':  Color(0xFF3B82F6),
    'seeds':      Color(0xFF10B981),
    'other':      Color(0xFF6B7280),
  };

  static const _emojis = {
    'feed':       '🌾',
    'veterinary': '💉',
    'equipment':  '🔧',
    'seeds':      '🌱',
    'other':      '📦',
  };

  @override
  Widget build(BuildContext context) {
    final color = _catColors[supply.category] ?? AppColors.muted;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(color: Color(0x08000000), blurRadius: 6, offset: Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.10),
              borderRadius:
                  const BorderRadius.horizontal(right: Radius.circular(13)),
            ),
            child: Center(
              child: Text(
                _emojis[supply.category] ?? '📦',
                style: const TextStyle(fontSize: 32),
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
                    supply.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.text,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          supply.categoryAr,
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: color,
                          ),
                        ),
                      ),
                      if (supply.deliveryAvailable) ...[
                        const SizedBox(width: 6),
                        const Text(
                          '🚚 توصيل',
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 10),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${supply.pricePerUnit.toStringAsFixed(0)} ج.م / ${supply.unit}',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppColors.green,
                        ),
                      ),
                      Text(
                        'المتاح: ${supply.quantity.toStringAsFixed(0)} ${supply.unit}',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
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
    );
  }
}

// ── Reviews tab ───────────────────────────────────────────────────────────────
class _ReviewsTab extends ConsumerWidget {
  const _ReviewsTab({required this.sellerId});
  final String sellerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncReviews = ref.watch(sellerReviewsProvider(sellerId));

    return asyncReviews.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(16),
        child: ShimmerList(count: 3, cardHeight: 80),
      ),
      error: (_, __) => EmptyState(
        icon: Icons.rate_review_outlined,
        title: context.l10n.loadReviewsFailed,
      ),
      data: (reviews) => Stack(
        children: [
          reviews.isEmpty
              ? EmptyState(
                  icon: Icons.rate_review_outlined,
                  title: context.l10n.noReviewsYet,
                  subtitle: context.l10n.noReviewsSubtitle,
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
                  children: [
                    // ── Rating breakdown ──────────────────────────────────
                    _RatingBreakdown(reviews: reviews),
                    const SizedBox(height: 16),
                    // ── Review list ───────────────────────────────────────
                    ...reviews.map((r) => _ReviewTile(review: r)),
                  ],
                ),
          // ── Add review FAB ─────────────────────────────────────────────
          Positioned(
            left: 16,
            right: 16,
            bottom: 16,
            child: FilledButton.icon(
              onPressed: () => _showAddReviewSheet(context, ref, sellerId),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.green,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              icon: const Icon(Icons.rate_review_outlined, color: AppColors.white),
              label: Text(
                context.l10n.writeReview,
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.w700,
                  color: AppColors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showAddReviewSheet(
      BuildContext context, WidgetRef ref, String sellerId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _AddReviewSheet(
        sellerId: sellerId,
        onSubmitted: () => ref.invalidate(sellerReviewsProvider(sellerId)),
      ),
    );
  }
}

// ── Rating breakdown chart ────────────────────────────────────────────────────
class _RatingBreakdown extends StatelessWidget {
  const _RatingBreakdown({required this.reviews});
  final List<ReviewModel> reviews;

  @override
  Widget build(BuildContext context) {
    if (reviews.isEmpty) return const SizedBox.shrink();

    final counts = List.filled(5, 0);
    for (final r in reviews) {
      final idx = (r.rating - 1).clamp(0, 4);
      counts[idx]++;
    }
    final total = reviews.length;
    final avg   = reviews.fold<double>(0, (s, r) => s + r.rating) / total;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Average rating circle
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                avg.toStringAsFixed(1),
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  color: AppColors.text,
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: List.generate(
                  5,
                  (i) => Icon(
                    i < avg.round()
                        ? Icons.star_rounded
                        : Icons.star_outline_rounded,
                    size: 12,
                    color: AppColors.amber,
                  ),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '$total تقييم',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 10,
                  color: AppColors.muted,
                ),
              ),
            ],
          ),
          const SizedBox(width: 16),
          // Star bars
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(5, (i) {
                final star  = 5 - i;
                final count = counts[star - 1];
                final pct   = total > 0 ? count / total : 0.0;
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      Text(
                        '$star',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.muted,
                        ),
                      ),
                      const SizedBox(width: 2),
                      const Icon(Icons.star_rounded,
                          size: 10, color: AppColors.amber),
                      const SizedBox(width: 6),
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: pct,
                            minHeight: 7,
                            backgroundColor: AppColors.border,
                            color: AppColors.amber,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      SizedBox(
                        width: 20,
                        child: Text(
                          '$count',
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 10,
                            color: AppColors.muted,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Review tile ───────────────────────────────────────────────────────────────
class _ReviewTile extends StatelessWidget {
  const _ReviewTile({required this.review});
  final ReviewModel review;

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('d MMM yyyy', 'ar');
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const CircleAvatar(
                radius: 16,
                backgroundColor: AppColors.greenBg,
                child: Icon(Icons.person, color: AppColors.green, size: 18),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(review.buyerName ?? context.l10n.buyer,
                        style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.text)),
                    Text(
                      fmt.format(review.createdAt),
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 10,
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
              ),
              // Star rating
              Row(
                children: List.generate(
                  5,
                  (i) => Icon(
                    i < review.rating
                        ? Icons.star_rounded
                        : Icons.star_outline_rounded,
                    size: 14,
                    color: AppColors.amber,
                  ),
                ),
              ),
            ],
          ),
          if (review.comment != null) ...[
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.only(right: 40),
              child: Text(review.comment!,
                  style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 13,
                      color: AppColors.text,
                      height: 1.4)),
            ),
          ],
          const SizedBox(height: 8),
          const Divider(height: 1, color: AppColors.border),
        ],
      ),
    );
  }
}

// ── Add Review bottom sheet ───────────────────────────────────────────────────
class _AddReviewSheet extends ConsumerStatefulWidget {
  const _AddReviewSheet({
    required this.sellerId,
    required this.onSubmitted,
  });
  final String sellerId;
  final VoidCallback onSubmitted;

  @override
  ConsumerState<_AddReviewSheet> createState() => _AddReviewSheetState();
}

class _AddReviewSheetState extends ConsumerState<_AddReviewSheet> {
  int _rating = 5;
  final _commentCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_loading) return;
    setState(() { _loading = true; _error = null; });

    try {
      final dio = ref.read(dioProvider);
      await dio.post(ApiEndpoints.reviews, data: {
        'seller':  widget.sellerId,
        'rating':  _rating,
        if (_commentCtrl.text.trim().isNotEmpty)
          'comment': _commentCtrl.text.trim(),
      });
      widget.onSubmitted();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _error = context.l10n.reviewFailed;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
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
          Text(
            context.l10n.rateThisFarm,
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 16),
          // Star selector
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (i) => GestureDetector(
              onTap: () => setState(() => _rating = i + 1),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Icon(
                  i < _rating ? Icons.star_rounded : Icons.star_outline_rounded,
                  size: 36,
                  color: i < _rating ? AppColors.amber : AppColors.border,
                ),
              ),
            )),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _commentCtrl,
            maxLines: 3,
            textDirection: TextDirection.rtl,
            decoration: InputDecoration(
              hintText: context.l10n.reviewComment,
              hintStyle: const TextStyle(
                fontFamily: 'Cairo',
                fontSize: 13,
                color: AppColors.muted,
              ),
              filled: true,
              fillColor: AppColors.bg,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.border),
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(
              _error!,
              style: const TextStyle(
                fontFamily: 'Cairo',
                fontSize: 12,
                color: AppColors.red,
              ),
            ),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _loading ? null : _submit,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.green,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: _loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        color: AppColors.white, strokeWidth: 2),
                  )
                : Text(
                    context.l10n.submitReview,
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontWeight: FontWeight.w700,
                      color: AppColors.white,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
class _LoadingView extends StatelessWidget {
  const _LoadingView();
  @override
  Widget build(BuildContext context) => const Scaffold(
    backgroundColor: AppColors.bg,
    body: Center(child: CircularProgressIndicator(color: AppColors.green)),
  );
}

class _BannerFallback extends StatelessWidget {
  const _BannerFallback();
  @override
  Widget build(BuildContext context) => Container(
    color: AppColors.greenBg,
    child: const Center(child: Text('🌾', style: TextStyle(fontSize: 60))),
  );
}
