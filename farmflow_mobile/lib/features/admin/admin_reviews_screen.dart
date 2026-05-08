import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/l10n/l10n_ext.dart';
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

class AdminReviewsScreen extends ConsumerStatefulWidget {
  const AdminReviewsScreen({super.key});

  @override
  ConsumerState<AdminReviewsScreen> createState() =>
      _AdminReviewsScreenState();
}

class _AdminReviewsScreenState extends ConsumerState<AdminReviewsScreen> {
  String _ratingTab = 'all';   // all | high | low
  String _search    = '';
  String _sortBy    = 'newest'; // newest | highest | lowest

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(adminReviewsProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Text(context.l10n.adminReviewsTitle,
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                color: AppColors.white)),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.sort, color: AppColors.white),
            tooltip: 'ترتيب',
            onSelected: (v) => setState(() => _sortBy = v),
            itemBuilder: (_) => [
              const PopupMenuItem(
                value: 'newest',
                child: Text('الأحدث',
                    style: TextStyle(fontFamily: 'Cairo')),
              ),
              const PopupMenuItem(
                value: 'highest',
                child: Text('أعلى تقييم',
                    style: TextStyle(fontFamily: 'Cairo')),
              ),
              const PopupMenuItem(
                value: 'lowest',
                child: Text('أقل تقييم',
                    style: TextStyle(fontFamily: 'Cairo')),
              ),
            ],
          ),
        ],
      ),
      body: async.when(
        loading: () => const Padding(
            padding: EdgeInsets.all(16),
            child: ShimmerList(count: 6, cardHeight: 90)),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: context.l10n.loadingFailed,
          subtitle: e.toString(),
          actionLabel: context.l10n.retry,
          action: () => ref.invalidate(adminReviewsProvider),
        ),
        data: (reviews) {
          final total   = reviews.length;
          final high    = reviews.where((r) =>
              (r['rating'] as num?)?.toInt() != null &&
              (r['rating'] as num).toInt() >= 4).length;
          final low     = reviews.where((r) =>
              (r['rating'] as num?)?.toInt() != null &&
              (r['rating'] as num).toInt() < 3).length;

          // Filter
          var filtered = reviews.where((r) {
            final rating    = (r['rating'] as num?)?.toInt() ?? 0;
            final buyer     = r['buyer'] as Map? ?? {};
            final buyerName = (buyer['name'] as String? ?? '').toLowerCase();
            final comment   = (r['comment'] as String? ?? '').toLowerCase();
            final ratingOk  = _ratingTab == 'all' ||
                (_ratingTab == 'high' && rating >= 4) ||
                (_ratingTab == 'low' && rating < 3);
            final searchOk  = _search.isEmpty ||
                buyerName.contains(_search) ||
                comment.contains(_search);
            return ratingOk && searchOk;
          }).toList();

          // Sort
          filtered.sort((a, b) {
            switch (_sortBy) {
              case 'highest':
                final ra = (a['rating'] as num?)?.toInt() ?? 0;
                final rb = (b['rating'] as num?)?.toInt() ?? 0;
                return rb.compareTo(ra);
              case 'lowest':
                final ra = (a['rating'] as num?)?.toInt() ?? 0;
                final rb = (b['rating'] as num?)?.toInt() ?? 0;
                return ra.compareTo(rb);
              default:
                final da = a['createdAt'] as String? ?? '';
                final db = b['createdAt'] as String? ?? '';
                return db.compareTo(da);
            }
          });

          return Column(children: [
            // ── Stats strip ─────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: Row(children: [
                _StatChip(label: 'الكل',    value: '$total', color: AppColors.blue),
                const SizedBox(width: 8),
                _StatChip(label: 'عالي ≥4', value: '$high',  color: AppColors.green),
                const SizedBox(width: 8),
                _StatChip(label: 'منخفض <3', value: '$low', color: AppColors.red),
              ]),
            ),
            const SizedBox(height: 8),

            // ── Search bar ──────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 0),
              child: TextField(
                onChanged: (v) => setState(() => _search = v.toLowerCase()),
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
                    color: AppColors.text),
                decoration: InputDecoration(
                  hintText: 'بحث باسم المشتري أو التعليق...',
                  hintStyle: const TextStyle(fontFamily: 'Cairo',
                      fontSize: 13, color: AppColors.muted),
                  prefixIcon: const Icon(Icons.search,
                      color: AppColors.muted, size: 20),
                  filled: true, fillColor: AppColors.card,
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.border)),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.border)),
                  focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(
                          color: AppColors.green, width: 1.5)),
                ),
              ),
            ),
            const SizedBox(height: 8),

            // ── Rating tabs ─────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              child: Row(children: [
                for (final tab in [
                  ('all',  'الكل',     total,  AppColors.blue),
                  ('high', 'عالي ≥4', high,   AppColors.green),
                  ('low',  'منخفض <3', low,   AppColors.red),
                ]) ...[
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _ratingTab = tab.$1),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        margin: const EdgeInsets.only(left: 6),
                        padding: const EdgeInsets.symmetric(
                            vertical: 8, horizontal: 4),
                        decoration: BoxDecoration(
                          color: _ratingTab == tab.$1
                              ? (tab.$4).withValues(alpha: 0.12)
                              : AppColors.card,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: _ratingTab == tab.$1
                                ? tab.$4
                                : AppColors.border,
                          ),
                        ),
                        child: Column(children: [
                          Text(tab.$2,
                              style: TextStyle(fontFamily: 'Cairo',
                                  fontSize: 11, fontWeight: FontWeight.w700,
                                  color: _ratingTab == tab.$1
                                      ? tab.$4
                                      : AppColors.muted),
                              textAlign: TextAlign.center),
                          Container(
                            margin: const EdgeInsets.only(top: 2),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 1),
                            decoration: BoxDecoration(
                              color: tab.$4.withValues(alpha: 0.14),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text('${tab.$3}',
                                style: TextStyle(fontFamily: 'Cairo',
                                    fontSize: 10, fontWeight: FontWeight.w800,
                                    color: tab.$4)),
                          ),
                        ]),
                      ),
                    ),
                  ),
                ],
              ]),
            ),

            // ── List ────────────────────────────────────────────────────
            Expanded(
              child: filtered.isEmpty
                  ? EmptyState(
                      icon: Icons.star_border_outlined,
                      title: context.l10n.noReviews2,
                      subtitle: context.l10n.noReviewsYet2,
                    )
                  : RefreshIndicator(
                      color: AppColors.green,
                      onRefresh: () async =>
                          ref.invalidate(adminReviewsProvider),
                      child: ListView.separated(
                        padding: const EdgeInsets.all(12),
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 10),
                        itemBuilder: (_, i) => _ReviewAdminCard(
                          review: filtered[i],
                          onDeleted: () =>
                              ref.invalidate(adminReviewsProvider),
                        ),
                      ),
                    ),
            ),
          ]);
        },
      ),
    );
  }
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

class _StatChip extends StatelessWidget {
  const _StatChip({
    required this.label,
    required this.value,
    required this.color,
  });
  final String label, value;
  final Color  color;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Text(value, style: TextStyle(fontFamily: 'Cairo', fontSize: 14,
            fontWeight: FontWeight.w800, color: color)),
        Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 9,
            color: AppColors.muted), textAlign: TextAlign.center),
      ]),
    ),
  );
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
        title: Text(context.l10n.deleteReviewTitle,
            style: const TextStyle(fontFamily: 'Cairo')),
        content: Text(context.l10n.deleteReviewMessage,
            style: const TextStyle(fontFamily: 'Cairo')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(context.l10n.cancel,
                style: const TextStyle(fontFamily: 'Cairo')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(context.l10n.delete,
                style: const TextStyle(
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
          content: Text(context.l10n.deleteReviewFailed,
              style: const TextStyle(fontFamily: 'Cairo')),
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
    final ratingColor = rating >= 4
        ? AppColors.green
        : rating < 3
            ? AppColors.red
            : AppColors.amber;

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
          decoration: BoxDecoration(
            color: ratingColor.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
                buyerName.isNotEmpty ? buyerName[0] : '؟',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: ratingColor)),
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
            Text(context.l10n.forFarm(sellerName),
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
