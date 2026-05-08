import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/image_helper.dart';
import '../../../core/l10n/l10n_ext.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/listing_model.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import 'seller_listings_service.dart';

class SellerListingsScreen extends ConsumerStatefulWidget {
  const SellerListingsScreen({super.key});

  @override
  ConsumerState<SellerListingsScreen> createState() => _SellerListingsScreenState();
}

class _SellerListingsScreenState extends ConsumerState<SellerListingsScreen> {
  String _statusFilter = 'all';
  String _searchQuery  = '';
  String _sortBy       = 'newest';
  bool   _showSearch   = false;
  final _scrollCtrl    = ScrollController();
  final _searchCtrl    = TextEditingController();

  static const _tabs = [
    ('all',      'الكل'),
    ('pending',  'قيد المراجعة'),
    ('approved', 'نشط'),
    ('sold',     'مُباع'),
    ('rejected', 'مرفوض'),
  ];

  static const _sortOptions = [
    ('newest',    'الأحدث'),
    ('oldest',    'الأقدم'),
    ('price_asc', 'السعر: الأقل'),
    ('price_desc','السعر: الأعلى'),
  ];

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollCtrl.position.pixels >= _scrollCtrl.position.maxScrollExtent - 200) {
      ref.read(paginatedListingsProvider.notifier).loadMore();
    }
  }

  List<ListingModel> _applyFiltersAndSort(List<ListingModel> all) {
    var list = all.where((l) {
      final matchesStatus = _statusFilter == 'all' || l.status == _statusFilter;
      final q = _searchQuery.toLowerCase().trim();
      final matchesSearch = q.isEmpty ||
          (l.breed?.toLowerCase().contains(q) ?? false) ||
          l.typeAr.toLowerCase().contains(q) ||
          (l.location?.toLowerCase().contains(q) ?? false);
      return matchesStatus && matchesSearch;
    }).toList();

    switch (_sortBy) {
      case 'oldest':
        list.sort((a, b) => a.createdAt.compareTo(b.createdAt));
      case 'price_asc':
        list.sort((a, b) => a.price.compareTo(b.price));
      case 'price_desc':
        list.sort((a, b) => b.price.compareTo(a.price));
      default: // newest
        list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    }
    return list;
  }

  void _showSortSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 36),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Center(child: Container(
            margin: const EdgeInsets.symmetric(vertical: 12),
            width: 40, height: 4,
            decoration: BoxDecoration(color: const Color(0xFFEEEEEE),
                borderRadius: BorderRadius.circular(2)),
          )),
          const Text('ترتيب حسب', style: TextStyle(fontFamily: 'Cairo', fontSize: 16,
              fontWeight: FontWeight.w800, color: Color(0xFF111827))),
          const SizedBox(height: 12),
          ..._sortOptions.map((opt) => ListTile(
            title: Text(opt.$2, style: const TextStyle(fontFamily: 'Cairo', fontSize: 14)),
            trailing: _sortBy == opt.$1
                ? const Icon(Icons.check_circle, color: AppColors.green)
                : null,
            onTap: () {
              setState(() => _sortBy = opt.$1);
              Navigator.pop(context);
            },
          )),
        ]),
      ),
    );
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final asyncListings = ref.watch(paginatedListingsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        title: _showSearch
            ? TextField(
                controller: _searchCtrl,
                autofocus: true,
                style: const TextStyle(fontFamily: 'Cairo', color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'بحث بالسلالة أو النوع...',
                  hintStyle: const TextStyle(color: Color(0xCCFFFFFF), fontFamily: 'Cairo'),
                  border: InputBorder.none,
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () {
                      setState(() { _showSearch = false; _searchQuery = ''; _searchCtrl.clear(); });
                    },
                  ),
                ),
                onChanged: (v) => setState(() => _searchQuery = v),
              )
            : Text(context.l10n.listingsTitle,
                style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                    color: AppColors.white)),
        actions: [
          if (!_showSearch)
            IconButton(
              icon: const Icon(Icons.search, color: Colors.white),
              onPressed: () => setState(() => _showSearch = true),
            ),
          IconButton(
            icon: Stack(children: [
              const Icon(Icons.sort, color: Colors.white),
              if (_sortBy != 'newest')
                Positioned(top: 0, left: 0, child: Container(
                  width: 8, height: 8,
                  decoration: const BoxDecoration(color: Color(0xFFFBBF24), shape: BoxShape.circle),
                )),
            ]),
            onPressed: _showSortSheet,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(44),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: Row(
              children: _tabs.map((t) {
                final selected = _statusFilter == t.$1;
                return GestureDetector(
                  onTap: () => setState(() => _statusFilter = t.$1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    margin: const EdgeInsets.only(left: 6),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: selected ? AppColors.white : AppColors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(t.$2,
                        style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: selected ? AppColors.green : AppColors.white)),
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
        label: Text(context.l10n.addListingTitle,
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                color: AppColors.white)),
      ),
      body: asyncListings.when(
        loading: () => const Padding(padding: EdgeInsets.all(16),
            child: ShimmerList(count: 5, cardHeight: 100)),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: context.l10n.loadListingsFailed,
          subtitle: e.toString(),
          actionLabel: context.l10n.retry,
          action: () => ref.read(paginatedListingsProvider.notifier).refresh(),
        ),
        data: (state) {
          final filtered = _applyFiltersAndSort(state.items);

          if (filtered.isEmpty && !state.isLoading) {
            return EmptyState(
              icon: Icons.sell_outlined,
              title: context.l10n.noListings,
              subtitle: _statusFilter == 'all' && _searchQuery.isEmpty
                  ? context.l10n.noListingsSubtitle
                  : 'لا توجد نتائج تطابق البحث',
            );
          }

          return Column(children: [
            // Results count bar
            if (filtered.isNotEmpty)
              Container(
                color: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(children: [
                  Text('${filtered.length} عنصر',
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                          color: Color(0xFF6B7280))),
                  const Spacer(),
                  if (_sortBy != 'newest')
                    Text('مرتبة: ${_sortOptions.firstWhere((s) => s.$1 == _sortBy, orElse: () => _sortOptions.first).$2}',
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 11,
                            color: AppColors.green, fontWeight: FontWeight.w600)),
                ]),
              ),
            Expanded(
              child: RefreshIndicator(
                color: AppColors.green,
                onRefresh: () async => ref.read(paginatedListingsProvider.notifier).refresh(),
                child: ListView.builder(
                  controller: _scrollCtrl,
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
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
              ),
            ),
          ]);
        },
      ),
    );
  }
}

// ── Listing card ──────────────────────────────────────────────────────────────

class _ListingCard extends ConsumerStatefulWidget {
  const _ListingCard({required this.listing});
  final ListingModel listing;

  @override
  ConsumerState<_ListingCard> createState() => _ListingCardState();
}

class _ListingCardState extends ConsumerState<_ListingCard> {
  bool _showRejection = false;

  static const _statusColor = {
    'pending':  Color(0xFFF59E0B), 'approved': Color(0xFF22C55E),
    'rejected': Color(0xFFEF4444), 'sold':     Color(0xFF6B7280),
  };
  static const _statusBg = {
    'pending':  Color(0xFFFEF3C7), 'approved': Color(0xFFF0FDF4),
    'rejected': Color(0xFFFEF2F2), 'sold':     Color(0xFFF3F4F6),
  };

  @override
  Widget build(BuildContext context) {
    final listing    = widget.listing;
    final statusAr   = {
      'pending':  context.l10n.listingStatusPending,
      'approved': context.l10n.listingStatusActive,
      'rejected': context.l10n.listingStatusRejected,
      'sold':     context.l10n.listingStatusSold,
    };
    final statusColor = _statusColor[listing.status] ?? AppColors.muted;
    final statusBg    = _statusBg[listing.status] ?? AppColors.bg;
    final statusLabel = statusAr[listing.status] ?? listing.status;
    final fmt         = NumberFormat('#,##0', 'ar');
    final dateFmt     = DateFormat('d MMM yy', 'ar');

    return Container(
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            // Image
            ClipRRect(
              borderRadius: const BorderRadius.horizontal(right: Radius.circular(13)),
              child: SizedBox(
                width: 90, height: 90,
                child: listing.images.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: imageUrl(listing.images.first), fit: BoxFit.cover,
                        placeholder: (_, __) => const ShimmerFill(),
                        errorWidget: (_, __, ___) => _Placeholder(type: listing.type))
                    : _Placeholder(type: listing.type),
              ),
            ),
            // Info
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(
                      child: Text(listing.breed ?? listing.typeAr,
                          maxLines: 1, overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontFamily: 'Cairo', fontSize: 14,
                              fontWeight: FontWeight.w700, color: Color(0xFF111827))),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(8)),
                      child: Text(statusLabel,
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 10,
                              fontWeight: FontWeight.w700, color: statusColor)),
                    ),
                  ]),
                  const SizedBox(height: 3),
                  Text('${listing.weight} كجم  •  ${listing.ageText}',
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: Color(0xFF6B7280))),
                  const SizedBox(height: 4),
                  Row(children: [
                    Expanded(child: Text('${fmt.format(listing.price)} ج.م',
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 15,
                            fontWeight: FontWeight.w800, color: AppColors.green))),
                    // Views count
                    if (listing.views > 0) ...[
                      const Icon(Icons.visibility_outlined, size: 12, color: Color(0xFF9CA3AF)),
                      const SizedBox(width: 3),
                      Text('${listing.views}',
                          style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: Color(0xFF9CA3AF))),
                      const SizedBox(width: 8),
                    ],
                    if (listing.eidAvailable)
                      const Text('🌙', style: TextStyle(fontSize: 12)),
                  ]),
                  // Date
                  Text(dateFmt.format(listing.createdAt),
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 10, color: Color(0xFFD1D5DB))),
                ]),
              ),
            ),
            // Action buttons
            if (listing.status != 'sold')
              Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                IconButton(
                  icon: const Icon(Icons.edit_outlined, color: Color(0xFF6B7280), size: 20),
                  onPressed: () => context.push('/seller/listings/${listing.id}/edit', extra: listing),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: AppColors.red, size: 20),
                  onPressed: () async {
                    final ok = await showConfirmDialog(context,
                        title: context.l10n.deleteListingTitle,
                        message: context.l10n.deleteListingMessage,
                        confirmLabel: context.l10n.delete, dangerous: true);
                    if (ok) {
                      await deleteSellerListing(ref.read(dioProvider), listing.id);
                      ref.read(paginatedListingsProvider.notifier).refresh();
                    }
                  },
                ),
              ]),
          ]),

          // Rejection reason banner
          if (listing.status == 'rejected' && listing.rejectionReason != null) ...[
            const Divider(height: 1),
            GestureDetector(
              onTap: () => setState(() => _showRejection = !_showRejection),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: const BoxDecoration(
                    color: Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.vertical(bottom: Radius.circular(12))),
                child: Row(children: [
                  const Icon(Icons.info_outline, size: 14, color: Color(0xFFEF4444)),
                  const SizedBox(width: 6),
                  Expanded(child: Text(
                    _showRejection
                        ? listing.rejectionReason!
                        : 'سبب الرفض — اضغط للعرض',
                    style: const TextStyle(fontFamily: 'Cairo', fontSize: 11,
                        color: Color(0xFFEF4444)),
                    maxLines: _showRejection ? 3 : 1,
                    overflow: TextOverflow.ellipsis,
                  )),
                  Icon(_showRejection ? Icons.expand_less : Icons.expand_more,
                      size: 16, color: const Color(0xFFEF4444)),
                ]),
              ),
            ),
          ],
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
    child: Center(child: Text(_emojis[type] ?? '🐾', style: const TextStyle(fontSize: 32))),
  );
}
