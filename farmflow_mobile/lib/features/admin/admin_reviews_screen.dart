import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/shimmer_widget.dart';

// ── Provider ──────────────────────────────────────────────────────────────────

final adminReviewsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.adminAllReviews);
  final data = res.data as List? ?? [];
  return data.cast<Map<String, dynamic>>();
});

// ── Screen ────────────────────────────────────────────────────────────────────

class AdminReviewsScreen extends ConsumerWidget {
  const AdminReviewsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(adminReviewsProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text('إدارة التقييمات',
            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                color: AppColors.white)),
      ),
      body: async.when(
        loading: () => const Padding(
            padding: EdgeInsets.all(16),
            child: ShimmerList(count: 6, cardHeight: 90)),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: 'تعذّر التحميل',
          subtitle: e.toString(),
          actionLabel: 'إعادة المحاولة',
          action: () => ref.invalidate(adminReviewsProvider),
        ),
        data: (reviews) {
          if (reviews.isEmpty) {
            return const EmptyState(
              icon: Icons.star_border_outlined,
              title: 'لا توجد تقييمات',
              subtitle: 'لم يُضف أي تقييم بعد',
            );
          }
          return RefreshIndicator(
            color: AppColors.green,
            onRefresh: () async => ref.invalidate(adminReviewsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: reviews.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _ReviewAdminCard(
                review: reviews[i],
                onDeleted: () => ref.invalidate(adminReviewsProvider),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ── Card ──────────────────────────────────────────────────────────────────────

class _ReviewAdminCard extends ConsumerStatefulWidget {
  const _ReviewAdminCard(
      {required this.review, required this.onDeleted});
  final Map<String, dynamic> review;
  final VoidCallback onDeleted;

  @override
  ConsumerState<_ReviewAdminCard> createState() =>
      _ReviewAdminCardState();
}

class _ReviewAdminCardState extends ConsumerState<_ReviewAdminCard> {
  bool _loading = false;

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('حذف التقييم',
            style: TextStyle(fontFamily: 'Cairo')),
        content: const Text('هل تريد حذف هذا التقييم؟',
            style: TextStyle(fontFamily: 'Cairo')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('إلغاء',
                style: TextStyle(fontFamily: 'Cairo')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('حذف',
                style: TextStyle(
                    fontFamily: 'Cairo', color: AppColors.red)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      await dio
          .delete(ApiEndpoints.reviewById(widget.review['_id'] as String));
      widget.onDeleted();
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('فشل في الحذف',
              style: TextStyle(fontFamily: 'Cairo')),
          backgroundColor: AppColors.red,
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final r          = widget.review;
    final rating     = (r['rating'] as num?)?.toInt() ?? 0;
    final comment    = r['comment'] as String? ?? '';
    final buyer      = r['buyer'] as Map? ?? {};
    final seller     = r['seller'] as Map? ?? {};
    final buyerName  = buyer['name'] as String? ?? '—';
    final sellerName = seller['farmName'] as String?
        ?? seller['name'] as String? ?? '—';
    final createdAt  = r['createdAt'] as String?;
    final dateStr    = createdAt != null
        ? DateFormat('d MMM yyyy', 'ar')
            .format(DateTime.parse(createdAt))
        : '';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(
              color: Color(0x08000000),
              blurRadius: 6,
              offset: Offset(0, 2)),
        ],
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Avatar
        Container(
          width: 40, height: 40,
          decoration: const BoxDecoration(
            color: AppColors.greenBg,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
                buyerName.isNotEmpty ? buyerName[0] : '؟',
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.green)),
          ),
        ),
        const SizedBox(width: 12),
        // Content
        Expanded(
          child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
            Row(children: [
              Expanded(
                child: Text(buyerName,
                    style: const TextStyle(fontFamily: 'Cairo',
                        fontSize: 13, fontWeight: FontWeight.w700,
                        color: AppColors.text)),
              ),
              // Stars
              Row(
                mainAxisSize: MainAxisSize.min,
                children: List.generate(
                    5,
                    (i) => Icon(
                          i < rating
                              ? Icons.star_rounded
                              : Icons.star_border_rounded,
                          size: 14,
                          color: i < rating
                              ? AppColors.amber
                              : AppColors.muted,
                        )),
              ),
            ]),
            const SizedBox(height: 2),
            Text('للمزرعة: $sellerName',
                style: const TextStyle(fontFamily: 'Cairo',
                    fontSize: 11, color: AppColors.muted)),
            if (comment.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(comment,
                  style: const TextStyle(fontFamily: 'Cairo',
                      fontSize: 12, color: AppColors.text),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis),
            ],
            if (dateStr.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(dateStr,
                  style: const TextStyle(fontFamily: 'Cairo',
                      fontSize: 10, color: AppColors.muted)),
            ],
          ]),
        ),
        const SizedBox(width: 8),
        // Delete icon
        GestureDetector(
          onTap: _loading ? null : _delete,
          child: _loading
              ? const SizedBox(
                  width: 20, height: 20,
                  child: CircularProgressIndicator(
                      color: AppColors.red, strokeWidth: 2))
              : const Icon(Icons.delete_outline,
                  size: 20, color: AppColors.red),
        ),
      ]),
    );
  }
}
