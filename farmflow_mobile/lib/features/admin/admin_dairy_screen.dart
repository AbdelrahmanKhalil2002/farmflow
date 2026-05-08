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
  String _statusFilter = 'pending';
  String _typeFilter   = 'all';

  static const _typeFilters = [
    ('all',    'الكل'),
    ('milk',   '🥛 لبن'),
    ('cheese', '🧀 جبنة'),
    ('yogurt', '🥣 زبادي'),
    ('butter', '🧈 زبد'),
    ('cream',  '🍦 قشطة'),
    ('ghee',   '🫙 سمن'),
  ];

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(adminDairyProvider);

    final statusFilters = [
      ('pending',  context.l10n.pendingStatus),
      ('approved', context.l10n.approvedStatus),
      ('rejected', context.l10n.rejectedStatus),
      ('all',      context.l10n.allFilter),
    ];

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Text(context.l10n.adminDairyTitle,
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                color: AppColors.white)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(88),
          child: Column(children: [
            // Status filter
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 4),
              child: Row(
                children: statusFilters.map((f) {
                  final sel = _statusFilter == f.$1;
                  return GestureDetector(
                    onTap: () => setState(() => _statusFilter = f.$1),
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
            // Type filter
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              child: Row(
                children: _typeFilters.map((f) {
                  final sel = _typeFilter == f.$1;
                  return GestureDetector(
                    onTap: () => setState(() => _typeFilter = f.$1),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      margin: const EdgeInsets.only(left: 6),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                        color: sel
                            ? AppColors.white.withValues(alpha: 0.9)
                            : AppColors.white.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: sel
                              ? AppColors.white
                              : AppColors.white.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Text(f.$2,
                          style: TextStyle(
                              fontFamily: 'Cairo', fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: sel
                                  ? AppColors.green
                                  : AppColors.white)),
                    ),
                  );
                }).toList(),
              ),
            ),
          ]),
        ),
      ),
      body: async.when(
        loading: () => const Padding(
            padding: EdgeInsets.all(16),
            child: ShimmerList(count: 5, cardHeight: 100)),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: context.l10n.loadingFailed,
          subtitle: e.toString(),
          actionLabel: context.l10n.retry,
          action: () => ref.invalidate(adminDairyProvider),
        ),
        data: (products) {
          final filtered = products.where((p) {
            final status = p['status'] as String? ?? 'pending';
            final type   = p['type'] as String? ?? '';
            final statusOk = _statusFilter == 'all' || status == _statusFilter;
            final typeOk   = _typeFilter == 'all' || type == _typeFilter;
            return statusOk && typeOk;
          }).toList();

          if (filtered.isEmpty) {
            return EmptyState(
              icon: Icons.local_drink_outlined,
              title: context.l10n.noDairyItems,
              subtitle: _statusFilter == 'pending'
                  ? context.l10n.noDairyPending
                  : context.l10n.noResults,
            );
          }
          return RefreshIndicator(
            color: AppColors.green,
            onRefresh: () async => ref.invalidate(adminDairyProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: filtered.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => GestureDetector(
                onTap: () => _showDetailSheet(context, filtered[i]),
                child: _DairyReviewCard(
                  product: filtered[i],
                  onAction: () {
                    ref.invalidate(adminDairyProvider);
                    ref.invalidate(adminStatsProvider);
                  },
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  void _showDetailSheet(BuildContext context, Map<String, dynamic> product) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _DairyDetailSheet(
        product: product,
        onAction: () {
          ref.invalidate(adminDairyProvider);
          ref.invalidate(adminStatsProvider);
        },
      ),
    );
  }
}

// ── Dairy detail sheet ────────────────────────────────────────────────────────

class _DairyDetailSheet extends ConsumerStatefulWidget {
  const _DairyDetailSheet({required this.product, required this.onAction});
  final Map<String, dynamic> product;
  final VoidCallback onAction;

  @override
  ConsumerState<_DairyDetailSheet> createState() =>
      _DairyDetailSheetState();
}

class _DairyDetailSheetState extends ConsumerState<_DairyDetailSheet> {
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

  static const _typeEmoji = {
    'milk':   '🥛',
    'cheese': '🧀',
    'yogurt': '🥣',
    'butter': '🧈',
    'cream':  '🍦',
    'ghee':   '🫙',
    'other':  '🫙',
  };

  Future<void> _approve() async {
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.post(ApiEndpoints.adminApproveDairy(
          widget.product['_id'] as String));
      widget.onAction();
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted) setState(() => _loading = false);
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
      await dio.patch(ApiEndpoints.dairyStatus(widget.product['_id'] as String),
          data: {'status': 'rejected', 'rejectionReason': reason});
      widget.onAction();
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p          = widget.product;
    final type       = p['type'] as String? ?? 'other';
    final status     = p['status'] as String? ?? 'pending';
    final price      = (p['pricePerUnit'] as num?)?.toDouble() ?? 0;
    final unit       = p['unit'] as String? ?? 'لتر';
    final qty        = (p['quantity'] as num?)?.toInt() ?? 0;
    final desc       = p['description'] as String?;
    final seller     = p['seller'] as Map? ?? {};
    final sellerName = seller['farmName'] as String?
        ?? seller['name'] as String? ?? '—';
    final sellerPhone = seller['farmPhone'] as String?
        ?? seller['phone'] as String? ?? '';
    final imageUrl   = p['image'] as String? ?? p['photo'] as String?;
    final fmt        = NumberFormat('#,##0', 'ar');
    final isPending  = status == 'pending';
    final statusColors = {
      'pending':  AppColors.amber,
      'approved': AppColors.green,
      'rejected': AppColors.red,
    };
    final statusAr = {
      'pending':  'قيد المراجعة',
      'approved': 'مقبول',
      'rejected': 'مرفوض',
    };
    final statusColor = statusColors[status] ?? AppColors.muted;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (_, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(children: [
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 6),
            width: 36, height: 4,
            decoration: BoxDecoration(color: AppColors.border,
                borderRadius: BorderRadius.circular(2)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(children: [
              Expanded(
                child: Text(_typeAr[type] ?? type,
                    style: const TextStyle(fontFamily: 'Cairo', fontSize: 16,
                        fontWeight: FontWeight.w800, color: AppColors.text)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(statusAr[status] ?? status,
                    style: TextStyle(fontFamily: 'Cairo', fontSize: 11,
                        fontWeight: FontWeight.w700, color: statusColor)),
              ),
            ]),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ListView(
              controller: scrollCtrl,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                // Product image
                if (imageUrl != null && imageUrl.isNotEmpty) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      imageUrl,
                      height: 180,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        height: 100,
                        color: AppColors.blueBg,
                        child: Center(
                          child: Text(_typeEmoji[type] ?? '🥛',
                              style: const TextStyle(fontSize: 40)),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                ] else ...[
                  Container(
                    height: 100,
                    decoration: BoxDecoration(
                      color: AppColors.blueBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(_typeEmoji[type] ?? '🥛',
                          style: const TextStyle(fontSize: 40)),
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // Specs
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.bg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(children: [
                    _SpecRow('النوع', _typeAr[type] ?? type),
                    _SpecRow('السعر',
                        '${fmt.format(price)} ج.م / $unit'),
                    if (qty > 0) _SpecRow('الكمية', '$qty $unit'),
                    if (desc != null && desc.isNotEmpty)
                      _SpecRow('الوصف', desc),
                  ]),
                ),
                const SizedBox(height: 12),

                // Seller info
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.bg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(children: [
                    _SpecRow('البائع', sellerName),
                    if (sellerPhone.isNotEmpty)
                      _SpecRow('الهاتف', sellerPhone),
                  ]),
                ),
                const SizedBox(height: 16),

                // Action buttons
                if (isPending)
                  Row(children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _loading ? null : _approve,
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.green,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        icon: _loading
                            ? const SizedBox(width: 16, height: 16,
                                child: CircularProgressIndicator(
                                    color: AppColors.white, strokeWidth: 2))
                            : const Icon(Icons.check, size: 16,
                                color: AppColors.white),
                        label: Text(context.l10n.approveButton,
                            style: const TextStyle(fontFamily: 'Cairo',
                                fontWeight: FontWeight.w700,
                                color: AppColors.white)),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _loading ? null : _rejectWithReason,
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.red),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        icon: const Icon(Icons.close, size: 16,
                            color: AppColors.red),
                        label: Text(context.l10n.rejectButton,
                            style: const TextStyle(fontFamily: 'Cairo',
                                fontWeight: FontWeight.w700,
                                color: AppColors.red)),
                      ),
                    ),
                  ]),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ]),
      ),
    );
  }
}

// ── Spec row ──────────────────────────────────────────────────────────────────

class _SpecRow extends StatelessWidget {
  const _SpecRow(this.label, this.value);
  final String label, value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(children: [
      Text(label,
          style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
              color: AppColors.muted)),
      const Spacer(),
      Flexible(
        child: Text(value, textAlign: TextAlign.end,
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                fontWeight: FontWeight.w600, color: AppColors.text)),
      ),
    ]),
  );
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

  static const _typeEmoji = {
    'milk':   '🥛',
    'cheese': '🧀',
    'yogurt': '🥣',
    'butter': '🧈',
    'cream':  '🍦',
    'ghee':   '🫙',
    'other':  '🫙',
  };

  static const _statusColors = {
    'pending':  AppColors.amber,
    'approved': AppColors.green,
    'rejected': AppColors.red,
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
          content: Text(context.l10n.approveDairyFailed,
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
          ApiEndpoints.dairyStatus(widget.product['_id'] as String),
          data: {'status': 'rejected', 'rejectionReason': reason});
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
        title: Text(context.l10n.deleteProductTitle,
            style: const TextStyle(fontFamily: 'Cairo')),
        content: Text(context.l10n.deleteProductMessage,
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
          ApiEndpoints.dairyById(widget.product['_id'] as String));
      widget.onAction();
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(context.l10n.deleteDairyFailed,
              style: const TextStyle(fontFamily: 'Cairo')),
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
    final statusAr = {
      'pending':  context.l10n.pendingStatus,
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
              Container(
                width: 48, height: 48,
                decoration: BoxDecoration(
                  color: AppColors.blue.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Text(_typeEmoji[type] ?? '🥛',
                      style: const TextStyle(fontSize: 24)),
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
                    Text('${context.l10n.seller}: $sellerName',
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
                    border: Border.all(color: AppColors.red.withValues(alpha: 0.3)),
                  ),
                  child: _loading
                      ? const SizedBox(width: 16, height: 16,
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
