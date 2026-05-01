import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/shimmer_widget.dart';
import '../admin/admin_dashboard_screen.dart';

// ── Provider ──────────────────────────────────────────────────────────────────

final pendingListingsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.listings,
      queryParameters: {'status': 'pending', 'limit': 50});
  final data = res.data as List? ?? [];
  return data.cast<Map<String, dynamic>>();
});

// ── Screen ────────────────────────────────────────────────────────────────────

class AdminListingsScreen extends ConsumerWidget {
  const AdminListingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(pendingListingsProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text('الإعلانات قيد المراجعة',
            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                color: AppColors.white)),
      ),
      body: async.when(
        loading: () => const Padding(
            padding: EdgeInsets.all(16),
            child: ShimmerList(count: 5, cardHeight: 110)),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: 'تعذّر التحميل',
          subtitle: e.toString(),
          actionLabel: 'إعادة المحاولة',
          action: () => ref.invalidate(pendingListingsProvider),
        ),
        data: (listings) {
          if (listings.isEmpty) {
            return const EmptyState(
              icon: Icons.check_circle_outline,
              title: 'لا توجد إعلانات معلّقة',
              subtitle: 'كل الإعلانات تمت مراجعتها',
            );
          }
          return RefreshIndicator(
            color: AppColors.green,
            onRefresh: () async => ref.invalidate(pendingListingsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: listings.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _ListingReviewCard(
                listing: listings[i],
                onAction: () {
                  ref.invalidate(pendingListingsProvider);
                  ref.invalidate(adminStatsProvider);
                },
              ),
            ),
          );
        },
      ),
    );
  }
}

// ── Card ──────────────────────────────────────────────────────────────────────

class _ListingReviewCard extends ConsumerStatefulWidget {
  const _ListingReviewCard(
      {required this.listing, required this.onAction});
  final Map<String, dynamic> listing;
  final VoidCallback onAction;

  @override
  ConsumerState<_ListingReviewCard> createState() =>
      _ListingReviewCardState();
}

class _ListingReviewCardState extends ConsumerState<_ListingReviewCard> {
  bool _loading = false;
  bool _rejecting = false;
  final _reasonCtrl = TextEditingController();

  static const _typeAr = {
    'cattle': 'أبقار', 'buffalo': 'جاموس', 'sheep': 'خراف',
    'goat': 'ماعز', 'camel': 'إبل', 'horse': 'خيول',
    'poultry': 'دواجن', 'rabbit': 'أرانب',
  };
  static const _emojis = {
    'cattle': '🐄', 'buffalo': '🐃', 'sheep': '🐑', 'goat': '🐐',
    'camel': '🐪', 'horse': '🐴', 'poultry': '🐔', 'rabbit': '🐇',
  };

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _setStatus(String status, {String? reason}) async {
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.patch(
        ApiEndpoints.listingStatus(widget.listing['_id'] as String),
        data: {
          'status': status,
          if (reason != null && reason.isNotEmpty)
            'rejectionReason': reason,
        },
      );
      widget.onAction();
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('فشل في تحديث الحالة',
              style: TextStyle(fontFamily: 'Cairo')),
          backgroundColor: AppColors.red,
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l      = widget.listing;
    final type   = l['type'] as String? ?? 'other';
    final breed  = l['breed'] as String?;
    final weight = (l['weight'] as num?)?.toDouble() ?? 0;
    final price  = (l['price'] as num?)?.toDouble() ?? 0;
    final seller = l['seller'] as Map? ?? {};
    final sellerName = seller['farmName'] as String?
        ?? seller['name'] as String? ?? '—';
    final fmt = NumberFormat('#,##0', 'ar');

    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(color: Color(0x08000000), blurRadius: 6,
              offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Info row ───────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              Container(
                width: 52, height: 52,
                decoration: BoxDecoration(
                  color: AppColors.greenBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Text(_emojis[type] ?? '🐾',
                      style: const TextStyle(fontSize: 26)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(breed ?? _typeAr[type] ?? type,
                      style: const TextStyle(fontFamily: 'Cairo',
                          fontSize: 14, fontWeight: FontWeight.w700,
                          color: AppColors.text)),
                  const SizedBox(height: 2),
                  Text('${weight.toStringAsFixed(0)} كجم  •  ${fmt.format(price)} ج.م',
                      style: const TextStyle(fontFamily: 'Cairo',
                          fontSize: 12, color: AppColors.muted)),
                  Text('البائع: $sellerName',
                      style: const TextStyle(fontFamily: 'Cairo',
                          fontSize: 11, color: AppColors.muted)),
                ],
              )),
            ]),
          ),

          // ── Reject reason input ────────────────────────────────────────
          if (_rejecting)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              child: TextField(
                controller: _reasonCtrl,
                maxLines: 2,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
                    color: AppColors.text),
                decoration: InputDecoration(
                  hintText: 'سبب الرفض (اختياري)',
                  hintStyle: const TextStyle(fontFamily: 'Cairo',
                      fontSize: 13, color: AppColors.muted),
                  filled: true, fillColor: AppColors.bg,
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide:
                          const BorderSide(color: AppColors.border)),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide:
                          const BorderSide(color: AppColors.border)),
                ),
              ),
            ),

          // ── Action buttons ─────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            child: Row(children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: _loading ? null
                      : () => _setStatus('approved'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.green,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  icon: _loading
                      ? const SizedBox(width: 16, height: 16,
                          child: CircularProgressIndicator(
                              color: AppColors.white, strokeWidth: 2))
                      : const Icon(Icons.check, size: 16,
                          color: AppColors.white),
                  label: const Text('قبول',
                      style: TextStyle(fontFamily: 'Cairo',
                          fontWeight: FontWeight.w700,
                          color: AppColors.white)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _rejecting
                    ? FilledButton.icon(
                        onPressed: _loading ? null
                            : () => _setStatus('rejected',
                                reason: _reasonCtrl.text.trim()),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.red,
                          padding:
                              const EdgeInsets.symmetric(vertical: 10),
                        ),
                        icon: const Icon(Icons.send, size: 16,
                            color: AppColors.white),
                        label: const Text('إرسال',
                            style: TextStyle(fontFamily: 'Cairo',
                                fontWeight: FontWeight.w700,
                                color: AppColors.white)),
                      )
                    : OutlinedButton.icon(
                        onPressed: _loading ? null
                            : () =>
                                setState(() => _rejecting = true),
                        style: OutlinedButton.styleFrom(
                          side:
                              const BorderSide(color: AppColors.red),
                          padding:
                              const EdgeInsets.symmetric(vertical: 10),
                        ),
                        icon: const Icon(Icons.close, size: 16,
                            color: AppColors.red),
                        label: const Text('رفض',
                            style: TextStyle(fontFamily: 'Cairo',
                                fontWeight: FontWeight.w700,
                                color: AppColors.red)),
                      ),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}
