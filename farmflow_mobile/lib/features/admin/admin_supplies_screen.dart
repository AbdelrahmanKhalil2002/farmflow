import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/l10n/l10n_ext.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/shimmer_widget.dart';
import '../admin/admin_dashboard_screen.dart';

// ── Provider ──────────────────────────────────────────────────────────────────

final adminSuppliesProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  // Request all statuses with admin token
  final res = await dio.get(ApiEndpoints.supplies,
      queryParameters: {'status': 'all', 'limit': 100});
  final data = res.data as List? ?? [];
  return data.cast<Map<String, dynamic>>();
});

// ── Screen ────────────────────────────────────────────────────────────────────

class AdminSuppliesScreen extends ConsumerStatefulWidget {
  const AdminSuppliesScreen({super.key});

  @override
  ConsumerState<AdminSuppliesScreen> createState() =>
      _AdminSuppliesScreenState();
}

class _AdminSuppliesScreenState extends ConsumerState<AdminSuppliesScreen> {
  String _filter = 'all';

  static const _statusColors = {
    'pending':  AppColors.amber,
    'approved': AppColors.green,
    'rejected': AppColors.red,
  };

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(adminSuppliesProvider);

    final filters = [
      ('all',      context.l10n.allFilter),
      ('pending',  'قيد المراجعة'),
      ('approved', context.l10n.approvedStatus),
      ('rejected', context.l10n.rejectedStatus),
    ];

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Text(context.l10n.suppliesTitle,
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                color: AppColors.white)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(44),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: Row(
              children: filters.map((f) {
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
            child: ShimmerList(count: 5, cardHeight: 120)),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: context.l10n.loadingFailed,
          subtitle: e.toString(),
          actionLabel: context.l10n.retry,
          action: () => ref.invalidate(adminSuppliesProvider),
        ),
        data: (supplies) {
          final filtered = supplies.where((s) {
            if (_filter == 'all') return true;
            return (s['status'] as String? ?? 'pending') == _filter;
          }).toList();

          if (filtered.isEmpty) {
            return EmptyState(
              icon: Icons.inventory_2_outlined,
              title: context.l10n.noSupplies,
              subtitle: context.l10n.noSuppliesSubtitle,
            );
          }
          return RefreshIndicator(
            color: AppColors.green,
            onRefresh: () async => ref.invalidate(adminSuppliesProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: filtered.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _SupplyAdminCard(
                supply: filtered[i],
                statusColors: _statusColors,
                onAction: () {
                  ref.invalidate(adminSuppliesProvider);
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

class _SupplyAdminCard extends ConsumerStatefulWidget {
  const _SupplyAdminCard({
    required this.supply,
    required this.statusColors,
    required this.onAction,
  });
  final Map<String, dynamic> supply;
  final Map<String, Color>   statusColors;
  final VoidCallback onAction;

  @override
  ConsumerState<_SupplyAdminCard> createState() =>
      _SupplyAdminCardState();
}

class _SupplyAdminCardState extends ConsumerState<_SupplyAdminCard> {
  bool _loading = false;

  // Category names in Arabic
  static const _categoryAr = {
    'feed':       'أعلاف',
    'medicine':   'أدوية',
    'equipment':  'معدات',
    'tools':      'أدوات',
    'other':      'أخرى',
  };

  static const _categoryColors = {
    'feed':      AppColors.green,
    'medicine':  AppColors.blue,
    'equipment': AppColors.amber,
    'tools':     AppColors.rose,
    'other':     AppColors.muted,
  };

  Future<void> _approve() async {
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.patch(
        ApiEndpoints.supplyStatus(widget.supply['_id'] as String),
        data: {'status': 'approved'},
      );
      widget.onAction();
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(context.l10n.errorOccurred,
              style: const TextStyle(fontFamily: 'Cairo')),
          backgroundColor: AppColors.red,
        ));
      }
    }
  }

  Future<void> _rejectWithReason() async {
    final ctrl = TextEditingController();
    if (!mounted) return;
    final reason = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('سبب الرفض',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 15,
                    fontWeight: FontWeight.w800, color: AppColors.text)),
            const SizedBox(height: 14),
            TextField(
              controller: ctrl,
              maxLines: 3,
              autofocus: true,
              style: const TextStyle(fontFamily: 'Cairo',
                  fontSize: 13, color: AppColors.text),
              decoration: InputDecoration(
                hintText: 'اكتب سبب الرفض...',
                hintStyle: const TextStyle(fontFamily: 'Cairo',
                    fontSize: 13, color: AppColors.muted),
                filled: true, fillColor: AppColors.bg,
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 10),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.border)),
                enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppColors.border)),
              ),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () =>
                    Navigator.of(ctx).pop(ctrl.text.trim()),
                style: FilledButton.styleFrom(
                    backgroundColor: AppColors.red,
                    padding: const EdgeInsets.symmetric(vertical: 12)),
                child: const Text('تأكيد الرفض',
                    style: TextStyle(fontFamily: 'Cairo',
                        fontWeight: FontWeight.w700,
                        color: AppColors.white)),
              ),
            ),
            const SizedBox(height: 8),
          ]),
        ),
      ),
    );

    if (reason == null) return;
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.patch(
        ApiEndpoints.supplyStatus(widget.supply['_id'] as String),
        data: {'status': 'rejected', 'rejectionReason': reason},
      );
      widget.onAction();
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(context.l10n.errorOccurred,
              style: const TextStyle(fontFamily: 'Cairo')),
          backgroundColor: AppColors.red,
        ));
      }
    }
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(context.l10n.deleteSupplyTitle,
            style: const TextStyle(fontFamily: 'Cairo')),
        content: Text(context.l10n.deleteSupplyMessage,
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
      await dio.delete(
          ApiEndpoints.supplyById(widget.supply['_id'] as String));
      widget.onAction();
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(context.l10n.errorOccurred,
              style: const TextStyle(fontFamily: 'Cairo')),
          backgroundColor: AppColors.red,
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final s          = widget.supply;
    final name       = s['name'] as String? ?? '—';
    final category   = s['category'] as String? ?? 'other';
    final status     = s['status'] as String? ?? 'pending';
    final price      = (s['price'] as num?)?.toDouble() ?? 0;
    final unit       = s['unit'] as String? ?? '';
    final quantity   = (s['quantity'] as num?)?.toInt() ?? 0;
    final seller     = s['seller'] as Map? ?? {};
    final sellerName = seller['farmName'] as String?
        ?? seller['name'] as String? ?? '—';
    final fmt         = NumberFormat('#,##0', 'ar');
    final statusColor = widget.statusColors[status] ?? AppColors.muted;
    final catColor    = _categoryColors[category] ?? AppColors.muted;
    final isPending   = status == 'pending';
    final statusAr = {
      'pending':  'قيد المراجعة',
      'approved': context.l10n.approvedStatus,
      'rejected': context.l10n.rejectedStatus,
    };

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
          // ── Info ─────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              // Category icon
              Container(
                width: 50, height: 50,
                decoration: BoxDecoration(
                  color: catColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.inventory_2_outlined,
                    size: 24, color: catColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        style: const TextStyle(fontFamily: 'Cairo',
                            fontSize: 14, fontWeight: FontWeight.w700,
                            color: AppColors.text)),
                    const SizedBox(height: 3),
                    Row(children: [
                      // Category badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: catColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(_categoryAr[category] ?? category,
                            style: TextStyle(fontFamily: 'Cairo',
                                fontSize: 10, fontWeight: FontWeight.w700,
                                color: catColor)),
                      ),
                      const SizedBox(width: 6),
                      Text('${fmt.format(price)} ج.م${unit.isNotEmpty ? ' / $unit' : ''}',
                          style: const TextStyle(fontFamily: 'Cairo',
                              fontSize: 12, color: AppColors.muted)),
                    ]),
                    const SizedBox(height: 2),
                    Text('${context.l10n.seller}: $sellerName'
                        '${quantity > 0 ? '  •  الكمية: $quantity' : ''}',
                        style: const TextStyle(fontFamily: 'Cairo',
                            fontSize: 11, color: AppColors.muted)),
                  ],
                ),
              ),
              // Status badge
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(statusAr[status] ?? status,
                    style: TextStyle(fontFamily: 'Cairo', fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: statusColor)),
              ),
            ]),
          ),

          // ── Actions ───────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            child: Row(children: [
              if (isPending) ...[
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
                    label: Text(context.l10n.approveButton,
                        style: const TextStyle(fontFamily: 'Cairo',
                            fontWeight: FontWeight.w700,
                            color: AppColors.white)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _loading ? null : _rejectWithReason,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.red),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    icon: const Icon(Icons.close,
                        size: 16, color: AppColors.red),
                    label: Text(context.l10n.rejectButton,
                        style: const TextStyle(fontFamily: 'Cairo',
                            fontWeight: FontWeight.w700,
                            color: AppColors.red)),
                  ),
                ),
                const SizedBox(width: 8),
              ],
              // Delete button (always visible)
              GestureDetector(
                onTap: _loading ? null : _delete,
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.redBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: AppColors.red.withValues(alpha: 0.3)),
                  ),
                  child: _loading && !isPending
                      ? const SizedBox(
                          width: 16, height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: AppColors.red))
                      : const Icon(Icons.delete_outline,
                          size: 16, color: AppColors.red),
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}
