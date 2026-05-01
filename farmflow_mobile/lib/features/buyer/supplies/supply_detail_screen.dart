import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/api/image_helper.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/supply_model.dart';
import '../../../shared/widgets/contact_buttons.dart';
import '../../../shared/widgets/shimmer_widget.dart';

// ── Provider ──────────────────────────────────────────────────────────────────

final supplyDetailProvider =
    FutureProvider.family<SupplyModel, String>((ref, id) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(ApiEndpoints.supplyById(id));
  return SupplyModel.fromJson(res.data as Map<String, dynamic>);
});

// ── Screen ────────────────────────────────────────────────────────────────────

class SupplyDetailScreen extends ConsumerWidget {
  const SupplyDetailScreen({super.key, required this.supplyId});
  final String supplyId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncSupply = ref.watch(supplyDetailProvider(supplyId));

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: asyncSupply.when(
        loading: () => Scaffold(
          appBar: AppBar(backgroundColor: AppColors.green,
              leading: const BackButton(color: AppColors.white)),
          body: const Center(
              child: CircularProgressIndicator(color: AppColors.green)),
        ),
        error: (e, _) => Scaffold(
          appBar: AppBar(backgroundColor: AppColors.green,
              leading: const BackButton(color: AppColors.white)),
          body: Center(child: Text(e.toString(),
              style: const TextStyle(fontFamily: 'Cairo'))),
        ),
        data: (supply) => _SupplyDetailBody(supply: supply),
      ),
    );
  }
}

// ── Detail body ───────────────────────────────────────────────────────────────

class _SupplyDetailBody extends ConsumerWidget {
  const _SupplyDetailBody({required this.supply});
  final SupplyModel supply;

  static const _catColors = {
    'feed':       Color(0xFF22C55E),
    'veterinary': Color(0xFFEF4444),
    'equipment':  Color(0xFF3B82F6),
    'seeds':      Color(0xFF10B981),
    'other':      Color(0xFF6B7280),
  };
  static const _catEmojis = {
    'feed': '🌾', 'veterinary': '💉',
    'equipment': '🔧', 'seeds': '🌱', 'other': '📦',
  };
  static const _catAr = {
    'feed': 'علف', 'veterinary': 'مستلزمات بيطرية',
    'equipment': 'معدات', 'seeds': 'بذور', 'other': 'أخرى',
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fmt = NumberFormat('#,##0', 'ar');
    final catColor = _catColors[supply.category] ?? AppColors.muted;
    final catEmoji = _catEmojis[supply.category] ?? '📦';
    final catAr    = _catAr[supply.category] ?? supply.category;

    return CustomScrollView(
      slivers: [
        // Image gallery or emoji header
        SliverAppBar(
          expandedHeight: supply.images.isNotEmpty ? 280 : 160,
          pinned: true,
          backgroundColor: AppColors.green,
          leading: const BackButton(color: AppColors.white),
          flexibleSpace: FlexibleSpaceBar(
            background: supply.images.isNotEmpty
                ? PageView.builder(
                    itemCount: supply.images.length,
                    itemBuilder: (_, i) => CachedNetworkImage(
                      imageUrl: imageUrl(supply.images[i]),
                      fit: BoxFit.cover,
                      placeholder: (_, __) => const ShimmerFill(),
                      errorWidget: (_, __, ___) =>
                          _EmojiPlaceholder(emoji: catEmoji, color: catColor),
                    ),
                  )
                : _EmojiPlaceholder(emoji: catEmoji, color: catColor),
          ),
        ),

        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Price & category header
              Container(
                color: AppColors.card,
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: catColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(catAr,
                              style: TextStyle(fontFamily: 'Cairo',
                                  fontSize: 11, fontWeight: FontWeight.w700,
                                  color: catColor)),
                        ),
                        if (supply.deliveryAvailable) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.greenBg,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text('🚚 توصيل متاح',
                                style: TextStyle(fontFamily: 'Cairo',
                                    fontSize: 11, fontWeight: FontWeight.w700,
                                    color: AppColors.greenText)),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(supply.name,
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 20,
                            fontWeight: FontWeight.w800, color: AppColors.text)),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Text(
                          '${fmt.format(supply.pricePerUnit)} ج.م',
                          style: const TextStyle(fontFamily: 'Cairo', fontSize: 22,
                              fontWeight: FontWeight.w900, color: AppColors.green),
                        ),
                        Text(
                          ' / ${supply.unit}',
                          style: const TextStyle(fontFamily: 'Cairo', fontSize: 14,
                              color: AppColors.muted),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 8),

              // ── Specs grid
              Container(
                color: AppColors.card,
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('تفاصيل المنتج',
                        style: TextStyle(fontFamily: 'Cairo', fontSize: 15,
                            fontWeight: FontWeight.w800, color: AppColors.text)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: _SpecCard(
                            label: 'الكمية المتاحة',
                            value: '${supply.quantity.toStringAsFixed(0)} ${supply.unit}')),
                        const SizedBox(width: 8),
                        Expanded(child: _SpecCard(
                            label: 'الحد الأدنى للطلب',
                            value: '${supply.minOrderQty} ${supply.unit}')),
                      ],
                    ),
                    if (supply.location != null) ...[
                      const SizedBox(height: 8),
                      _SpecCard(
                          label: 'الموقع',
                          value: supply.location!,
                          wide: true),
                    ],
                    if (supply.description != null &&
                        supply.description!.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      const Text('الوصف',
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.muted)),
                      const SizedBox(height: 6),
                      Text(supply.description!,
                          style: const TextStyle(fontFamily: 'Cairo',
                              fontSize: 13, color: AppColors.text,
                              height: 1.6)),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 8),

              // ── Seller card
              _SellerCard(sellerId: supply.sellerId),

              const SizedBox(height: 80),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Specs card ────────────────────────────────────────────────────────────────

class _SpecCard extends StatelessWidget {
  const _SpecCard({required this.label, required this.value, this.wide = false});
  final String label, value;
  final bool wide;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: AppColors.bg,
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: AppColors.border),
    ),
    child: wide
        ? Row(children: [
            Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 11,
                color: AppColors.muted)),
            const SizedBox(width: 8),
            Expanded(child: Text(value, style: const TextStyle(
                fontFamily: 'Cairo', fontSize: 13,
                fontWeight: FontWeight.w700, color: AppColors.text))),
          ])
        : Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 11,
                  color: AppColors.muted)),
              const SizedBox(height: 4),
              Text(value, style: const TextStyle(fontFamily: 'Cairo', fontSize: 14,
                  fontWeight: FontWeight.w700, color: AppColors.text)),
            ],
          ),
  );
}

// ── Seller detail model (lightweight) ────────────────────────────────────────

class _SellerInfo {
  final String id, name;
  final String? farmName, farmPhone, governorate;
  const _SellerInfo({required this.id, required this.name,
      this.farmName, this.farmPhone, this.governorate});

  factory _SellerInfo.fromJson(Map<String, dynamic> j) => _SellerInfo(
    id:           j['_id'] as String? ?? '',
    name:         j['name'] as String? ?? '',
    farmName:     j['farmName'] as String?,
    farmPhone:    j['farmPhone'] as String?,
    governorate:  j['governorate'] as String?,
  );
}

final _sellerInfoProvider =
    FutureProvider.family<_SellerInfo, String>((ref, id) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(ApiEndpoints.sellerById(id));
  return _SellerInfo.fromJson(res.data as Map<String, dynamic>);
});

// ── Seller card ───────────────────────────────────────────────────────────────

class _SellerCard extends ConsumerWidget {
  const _SellerCard({required this.sellerId});
  final String sellerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncSeller = ref.watch(_sellerInfoProvider(sellerId));

    return Container(
      color: AppColors.card,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('البائع',
              style: TextStyle(fontFamily: 'Cairo', fontSize: 15,
                  fontWeight: FontWeight.w800, color: AppColors.text)),
          const SizedBox(height: 12),
          asyncSeller.when(
            loading: () => const ShimmerCard(height: 60),
            error: (_, __) => const SizedBox.shrink(),
            data: (seller) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(seller.farmName ?? seller.name,
                              style: const TextStyle(fontFamily: 'Cairo',
                                  fontSize: 15, fontWeight: FontWeight.w700,
                                  color: AppColors.text)),
                          if (seller.governorate != null)
                            Text(seller.governorate!,
                                style: const TextStyle(fontFamily: 'Cairo',
                                    fontSize: 12, color: AppColors.muted)),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () => context.push('/buyer/farm/$sellerId'),
                      child: const Text('عرض المزرعة',
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                              color: AppColors.green,
                              fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
                if (seller.farmPhone != null &&
                    seller.farmPhone!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  ContactButtons(phone: seller.farmPhone!),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Emoji placeholder ─────────────────────────────────────────────────────────

class _EmojiPlaceholder extends StatelessWidget {
  const _EmojiPlaceholder({required this.emoji, required this.color});
  final String emoji;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    color: color.withValues(alpha: 0.12),
    child: Center(
      child: Text(emoji, style: const TextStyle(fontSize: 80)),
    ),
  );
}
