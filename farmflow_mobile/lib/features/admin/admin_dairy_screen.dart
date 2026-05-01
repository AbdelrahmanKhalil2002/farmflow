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

final adminDairyProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.adminDairyAll);
  final data = res.data as List? ?? [];
  return data.cast<Map<String, dynamic>>();
});

// ── Screen ────────────────────────────────────────────────────────────────────

class AdminDairyScreen extends ConsumerStatefulWidget {
  const AdminDairyScreen({super.key});

  @override
  ConsumerState<AdminDairyScreen> createState() => _AdminDairyScreenState();
}

class _AdminDairyScreenState extends ConsumerState<AdminDairyScreen> {
  String _filter = 'pending';

  static const _filters = [
    ('pending',  'قيد المراجعة'),
    ('approved', 'مقبول'),
    ('all',      'الكل'),
  ];

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(adminDairyProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text('منتجات الألبان',
            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                color: AppColors.white)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(44),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: Row(
              children: _filters.map((f) {
                final sel = _filter == f.$1;
                return GestureDetector(
                  onTap: () => setState(() => _filter = f.$1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    margin: const EdgeInsets.only(left: 6),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: sel
                          ? AppColors.white
                          : AppColors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(f.$2,
                        style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: sel
                                ? AppColors.green : AppColors.white)),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
      body: async.when(
        loading: () => const Padding(
            padding: EdgeInsets.all(16),
            child: ShimmerList(count: 5, cardHeight: 100)),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: 'تعذّر التحميل',
          subtitle: e.toString(),
          actionLabel: 'إعادة المحاولة',
          action: () => ref.invalidate(adminDairyProvider),
        ),
        data: (products) {
          final filtered = products.where((p) {
            if (_filter == 'all') return true;
            return (p['status'] as String? ?? 'pending') == _filter;
          }).toList();

          if (filtered.isEmpty) {
            return EmptyState(
              icon: Icons.local_drink_outlined,
              title: 'لا توجد منتجات',
              subtitle: _filter == 'pending'
                  ? 'لا توجد منتجات قيد المراجعة'
                  : 'لا توجد نتائج',
            );
          }
          return RefreshIndicator(
            color: AppColors.green,
            onRefresh: () async => ref.invalidate(adminDairyProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: filtered.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _DairyReviewCard(
                product: filtered[i],
                onAction: () {
                  ref.invalidate(adminDairyProvider);
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

class _DairyReviewCard extends ConsumerStatefulWidget {
  const _DairyReviewCard({required this.product, required this.onAction});
  final Map<String, dynamic> product;
  final VoidCallback onAction;

  @override
  ConsumerState<_DairyReviewCard> createState() => _DairyReviewCardState();
}

class _DairyReviewCardState extends ConsumerState<_DairyReviewCard> {
  bool _loading = false;

  static const _typeAr = {
    'milk':   'حليب طازج',
    'cheese': 'جبن',
    'yogurt': 'زبادي',
    'butter': 'زبدة',
    'cream':  'قشطة',
    'ghee':   'سمن',
    'other':  'أخرى',
  };

  static const _statusColors = {
    'pending':  AppColors.amber,
    'approved': AppColors.green,
    'rejected': AppColors.red,
  };
  static const _statusAr = {
    'pending':  'قيد المراجعة',
    'approved': 'مقبول',
    'rejected': 'مرفوض',
  };

  Future<void> _approve() async {
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.post(
          ApiEndpoints.adminApproveDairy(widget.product['_id'] as String));
      widget.onAction();
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('فشل في القبول',
              style: TextStyle(fontFamily: 'Cairo')),
          backgroundColor: AppColors.red,
        ));
      }
    }
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('حذف المنتج',
            style: TextStyle(fontFamily: 'Cairo')),
        content: const Text('هل تريد حذف هذا المنتج؟',
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
      await dio.delete(
          ApiEndpoints.dairyById(widget.product['_id'] as String));
      widget.onAction();
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
    final p          = widget.product;
    final type       = p['type'] as String? ?? 'other';
    final status     = p['status'] as String? ?? 'pending';
    final price      = (p['pricePerUnit'] as num?)?.toDouble() ?? 0;
    final unit       = p['unit'] as String? ?? 'لتر';
    final seller     = p['seller'] as Map? ?? {};
    final sellerName = seller['farmName'] as String?
        ?? seller['name'] as String? ?? '—';
    final fmt         = NumberFormat('#,##0', 'ar');
    final statusColor = _statusColors[status] ?? AppColors.muted;
    final isPending   = status == 'pending';

    return Container(
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Info ────────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              Container(
                width: 48, height: 48,
                decoration: BoxDecoration(
                  color: AppColors.blue.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Center(
                  child:
                      Text('🥛', style: TextStyle(fontSize: 24)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_typeAr[type] ?? type,
                        style: const TextStyle(fontFamily: 'Cairo',
                            fontSize: 14, fontWeight: FontWeight.w700,
                            color: AppColors.text)),
                    const SizedBox(height: 2),
                    Text('${fmt.format(price)} ج.م / $unit',
                        style: const TextStyle(fontFamily: 'Cairo',
                            fontSize: 12, color: AppColors.muted)),
                    Text('البائع: $sellerName',
                        style: const TextStyle(fontFamily: 'Cairo',
                            fontSize: 11, color: AppColors.muted)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_statusAr[status] ?? status,
                    style: TextStyle(fontFamily: 'Cairo', fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: statusColor)),
              ),
            ]),
          ),

          // ── Actions (pending only) ──────────────────────────────────────
          if (isPending)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
              child: Row(children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _loading ? null : _approve,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.green,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    icon: _loading
                        ? const SizedBox(
                            width: 16, height: 16,
                            child: CircularProgressIndicator(
                                color: AppColors.white, strokeWidth: 2))
                        : const Icon(Icons.check,
                            size: 16, color: AppColors.white),
                    label: const Text('قبول',
                        style: TextStyle(fontFamily: 'Cairo',
                            fontWeight: FontWeight.w700,
                            color: AppColors.white)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _loading ? null : _delete,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.red),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    icon: const Icon(Icons.delete_outline,
                        size: 16, color: AppColors.red),
                    label: const Text('حذف',
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
