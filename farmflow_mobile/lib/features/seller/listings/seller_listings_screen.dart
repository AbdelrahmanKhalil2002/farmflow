import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/image_helper.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/listing_model.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import 'seller_listings_service.dart';

class SellerListingsScreen extends ConsumerStatefulWidget {
  const SellerListingsScreen({super.key});

  @override
  ConsumerState<SellerListingsScreen> createState() =>
      _SellerListingsScreenState();
}

class _SellerListingsScreenState extends ConsumerState<SellerListingsScreen> {
  String _statusFilter = 'all';
  final  _scrollCtrl  = ScrollController();

  static const _tabs = [
    ('all',      'الكل'),
    ('pending',  'قيد المراجعة'),
    ('approved', 'نشط'),
    ('sold',     'مُباع'),
    ('rejected', 'مرفوض'),
  ];

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollCtrl.position.pixels >=
        _scrollCtrl.position.maxScrollExtent - 200) {
      ref.read(paginatedListingsProvider.notifier).loadMore();
    }
  }

  void _setStatusFilter(String f) {
    setState(() => _statusFilter = f);
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final asyncListings = ref.watch(paginatedListingsProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        title: const Text(
          'إعلاناتي',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w800,
            color: AppColors.white,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(44),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: Row(
              children: _tabs.map((t) {
                final selected = _statusFilter == t.$1;
                return GestureDetector(
                  onTap: () => _setStatusFilter(t.$1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    margin: const EdgeInsets.only(left: 6),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: selected
                          ? AppColors.white
                          : AppColors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      t.$2,
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: selected
                            ? AppColors.green
                            : AppColors.white,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.green,
        onPressed: () => context.push('/seller/listings/add'),
        icon: const Icon(Icons.add, color: AppColors.white),
        label: const Text(
          'إضافة إعلان',
          style: TextStyle(
              fontFamily: 'Cairo', fontWeight: FontWeight.w700,
              color: AppColors.white),
        ),
      ),
      body: asyncListings.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(16),
          child: ShimmerList(count: 5, cardHeight: 100),
        ),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: 'تعذّر التحميل',
          subtitle: e.toString(),
          actionLabel: 'إعادة المحاولة',
          action: () =>
              ref.read(paginatedListingsProvider.notifier).refresh(),
        ),
        data: (state) {
          final filtered = _statusFilter == 'all'
              ? state.items
              : state.items
                  .where((l) => l.status == _statusFilter)
                  .toList();

          if (filtered.isEmpty && !state.isLoading) {
            return EmptyState(
              icon: Icons.sell_outlined,
              title: 'لا توجد إعلانات',
              subtitle: _statusFilter == 'all'
                  ? 'أضف أول إعلان لك'
                  : 'لا توجد إعلانات بهذه الحالة',
            );
          }

          return RefreshIndicator(
            color: AppColors.green,
            onRefresh: () async =>
                ref.read(paginatedListingsProvider.notifier).refresh(),
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: filtered.length + (state.hasMore ? 1 : 0),
              itemBuilder: (_, i) {
                if (i == filtered.length) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Center(child: CircularProgressIndicator(
                      color: AppColors.green, strokeWidth: 2.5)),
                  );
                }
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _ListingCard(listing: filtered[i]),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _ListingCard extends ConsumerWidget {
  const _ListingCard({required this.listing});
  final ListingModel listing;

  static const _statusColor = {
    'pending':  Color(0xFFF59E0B),
    'approved': Color(0xFF22C55E),
    'rejected': Color(0xFFEF4444),
    'sold':     Color(0xFF6B7280),
  };

  static const _statusBg = {
    'pending':  Color(0xFFFEF3C7),
    'approved': Color(0xFFF0FDF4),
    'rejected': Color(0xFFFEF2F2),
    'sold':     Color(0xFFF3F4F6),
  };

  static const _statusAr = {
    'pending':  'قيد المراجعة',
    'approved': 'نشط',
    'rejected': 'مرفوض',
    'sold':     'مُباع',
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusColor = _statusColor[listing.status] ?? AppColors.muted;
    final statusBg    = _statusBg[listing.status] ?? AppColors.bg;
    final statusAr    = _statusAr[listing.status] ?? listing.status;
    final fmt = NumberFormat('#,##0', 'ar');

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
          // Image
          ClipRRect(
            borderRadius:
                const BorderRadius.horizontal(right: Radius.circular(13)),
            child: SizedBox(
              width: 90,
              height: 90,
              child: listing.images.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: imageUrl(listing.images.first),
                      fit: BoxFit.cover,
                      placeholder: (_, __) => const ShimmerFill(),
                      errorWidget: (_, __, ___) =>
                          _Placeholder(type: listing.type),
                    )
                  : _Placeholder(type: listing.type),
            ),
          ),
          // Info
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          listing.breed ?? listing.typeAr,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppColors.text,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: statusBg,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          statusAr,
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: statusColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${listing.weight} كجم  •  ${listing.ageText}',
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 12,
                      color: AppColors.muted,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${fmt.format(listing.price)} ج.م',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.green,
                        ),
                      ),
                      if (listing.eidAvailable)
                        const Text(
                          '🌙 عيد',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 11,
                            color: AppColors.amber,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          // Action buttons (edit + delete) — hidden for sold listings
          if (listing.status != 'sold')
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  icon: const Icon(Icons.edit_outlined,
                      color: AppColors.muted, size: 20),
                  onPressed: () => context.push(
                      '/seller/listings/${listing.id}/edit',
                      extra: listing),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline,
                      color: AppColors.red, size: 20),
                  onPressed: () async {
                    final ok = await showConfirmDialog(
                      context,
                      title: 'حذف الإعلان',
                      message: 'هل تريد حذف إعلان "${listing.breed ?? listing.typeAr}"؟\nلا يمكن التراجع عن هذا الإجراء.',
                      confirmLabel: 'حذف',
                      dangerous: true,
                    );
                    if (ok) {
                      await deleteSellerListing(ref.read(dioProvider), listing.id);
                      ref.read(paginatedListingsProvider.notifier).refresh();
                    }
                  },
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder({required this.type});
  final String type;
  static const _emojis = {
    'cattle': '🐄', 'buffalo': '🐃', 'sheep': '🐑', 'goat': '🐐',
    'camel': '🐪', 'horse': '🐴', 'poultry': '🐔', 'rabbit': '🐇',
  };

  @override
  Widget build(BuildContext context) => Container(
    color: AppColors.greenBg,
    child: Center(
      child: Text(_emojis[type] ?? '🐾',
          style: const TextStyle(fontSize: 32)),
    ),
  );
}
