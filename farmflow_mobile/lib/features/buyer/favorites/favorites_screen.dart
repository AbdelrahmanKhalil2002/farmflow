import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/image_helper.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/seller_summary_model.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import '../browse/sellers_service.dart';
import 'favorites_service.dart';

class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favoriteIds = ref.watch(favoriteIdsProvider);
    final asyncAll    = ref.watch(allSellersProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        title: const Text(
          'المفضلة',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w800,
            color: AppColors.white,
          ),
        ),
        elevation: 0,
      ),
      body: asyncAll.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(16),
          child: ShimmerList(count: 4, cardHeight: 90),
        ),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: 'تعذّر التحميل',
          subtitle: e.toString(),
          actionLabel: 'إعادة المحاولة',
          action: () => ref.invalidate(allSellersProvider),
        ),
        data: (all) {
          final favorites =
              all.where((s) => favoriteIds.contains(s.id)).toList();

          if (favoriteIds.isEmpty || favorites.isEmpty) {
            return const EmptyState(
              icon: Icons.favorite_outline,
              title: 'لا توجد مزارع مفضلة',
              subtitle: 'اضغط على ❤️ في أي مزرعة لإضافتها هنا',
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: favorites.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _FavoriteTile(seller: favorites[i]),
          );
        },
      ),
    );
  }
}

class _FavoriteTile extends ConsumerWidget {
  const _FavoriteTile({required this.seller});
  final SellerSummaryModel seller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () => context.push('/buyer/farm/${seller.id}'),
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
            // Thumbnail
            ClipRRect(
              borderRadius:
                  const BorderRadius.horizontal(right: Radius.circular(13)),
              child: SizedBox(
                width: 80,
                height: 80,
                child: seller.farmBanner != null
                    ? CachedNetworkImage(
                        imageUrl: imageUrl(seller.farmBanner),
                        fit: BoxFit.cover,
                        placeholder: (_, __) => const ShimmerFill(),
                        errorWidget: (_, __, ___) => const _Placeholder(),
                      )
                    : const _Placeholder(),
              ),
            ),
            // Info
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      seller.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.text,
                      ),
                    ),
                    if (seller.governorate != null)
                      Row(children: [
                        const Icon(Icons.location_on_outlined,
                            size: 12, color: AppColors.muted),
                        const SizedBox(width: 2),
                        Text(seller.governorate!,
                            style: const TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 12,
                                color: AppColors.muted)),
                      ]),
                    const SizedBox(height: 4),
                    Row(children: [
                      const Icon(Icons.star_rounded,
                          size: 13, color: AppColors.amber),
                      const SizedBox(width: 2),
                      Text(
                        seller.averageRating > 0
                            ? seller.averageRating.toStringAsFixed(1)
                            : 'جديد',
                        style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.text),
                      ),
                    ]),
                  ],
                ),
              ),
            ),
            // Remove favourite
            IconButton(
              icon: const Icon(Icons.favorite, color: AppColors.red, size: 20),
              onPressed: () =>
                  ref.read(favoriteIdsProvider.notifier).toggle(seller.id),
            ),
          ],
        ),
      ),
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder();
  @override
  Widget build(BuildContext context) => Container(
    color: AppColors.greenBg,
    child: const Center(child: Text('🌾', style: TextStyle(fontSize: 28))),
  );
}
