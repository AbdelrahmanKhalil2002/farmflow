import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/shimmer_widget.dart';

// ── Provider ──────────────────────────────────────────────────────────────────

final adminOrdersProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.orders);
  final data = res.data as List? ?? [];
  return data.cast<Map<String, dynamic>>();
});

// ── Screen ────────────────────────────────────────────────────────────────────

class AdminOrdersScreen extends ConsumerStatefulWidget {
  const AdminOrdersScreen({super.key});

  @override
  ConsumerState<AdminOrdersScreen> createState() => _AdminOrdersScreenState();
}

class _AdminOrdersScreenState extends ConsumerState<AdminOrdersScreen> {
  String _filter = 'all';

  static const _filters = [
    ('all',       'الكل'),
    ('pending',   'معلّق'),
    ('confirmed', 'مؤكّد'),
    ('completed', 'مكتمل'),
    ('cancelled', 'ملغي'),
  ];

  static const _statusAr = {
    'pending':   'معلّق',
    'confirmed': 'مؤكّد',
    'completed': 'مكتمل',
    'cancelled': 'ملغي',
  };

  static const _statusColors = {
    'pending':   AppColors.amber,
    'confirmed': AppColors.blue,
    'completed': AppColors.green,
    'cancelled': AppColors.red,
  };

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(adminOrdersProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text('إدارة الطلبات',
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
            child: ShimmerList(count: 5, cardHeight: 110)),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: 'تعذّر التحميل',
          subtitle: e.toString(),
          actionLabel: 'إعادة المحاولة',
          action: () => ref.invalidate(adminOrdersProvider),
        ),
        data: (orders) {
          final filtered = orders.where((o) {
            if (_filter == 'all') return true;
            return (o['status'] as String? ?? '') == _filter;
          }).toList();

          if (filtered.isEmpty) {
            return const EmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'لا توجد طلبات',
              subtitle: 'لا توجد طلبات في هذه الفئة',
            );
          }
          return RefreshIndicator(
            color: AppColors.green,
            onRefresh: () async => ref.invalidate(adminOrdersProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: filtered.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _OrderAdminCard(
                order: filtered[i],
                statusAr: _statusAr,
                statusColors: _statusColors,
                onAction: () => ref.invalidate(adminOrdersProvider),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ── Card ──────────────────────────────────────────────────────────────────────

class _OrderAdminCard extends ConsumerStatefulWidget {
  const _OrderAdminCard({
    required this.order,
    required this.statusAr,
    required this.statusColors,
    required this.onAction,
  });
  final Map<String, dynamic> order;
  final Map<String, String> statusAr;
  final Map<String, Color> statusColors;
  final VoidCallback onAction;

  @override
  ConsumerState<_OrderAdminCard> createState() => _OrderAdminCardState();
}

class _OrderAdminCardState extends ConsumerState<_OrderAdminCard> {
  bool   _loading          = false;
  bool   _expanded         = false;
  String _deliveryStatus   = 'pending';
  final  _deliveryCostCtrl = TextEditingController();

  static const _deliveryStatuses = [
    ('pending',    'لم يُشحن'),
    ('in_transit', 'في الطريق'),
    ('delivered',  'تم التسليم'),
  ];

  static const _paymentAr = {
    'deposit':  'عربون',
    'cod':      'كاش',
    'instapay': 'InstaPay',
  };

  @override
  void initState() {
    super.initState();
    final o = widget.order;
    _deliveryStatus =
        (o['deliveryStatus'] as String?) ?? 'pending';
    final cost = (o['deliveryCost'] as num?)?.toDouble();
    if (cost != null && cost > 0) {
      _deliveryCostCtrl.text = cost.toStringAsFixed(0);
    }
  }

  @override
  void dispose() {
    _deliveryCostCtrl.dispose();
    super.dispose();
  }

  Future<void> _updateStatus(String status) async {
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.put(
        ApiEndpoints.orderStatus(widget.order['_id'] as String),
        data: {'status': status},
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

  Future<void> _setDelivery() async {
    setState(() => _loading = true);
    try {
      final dio  = ref.read(dioProvider);
      final cost = double.tryParse(_deliveryCostCtrl.text.trim());
      await dio.patch(
        ApiEndpoints.orderDelivery(widget.order['_id'] as String),
        data: {
          if (cost != null) 'deliveryCost': cost,
          'deliveryStatus': _deliveryStatus,
        },
      );
      widget.onAction();
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('فشل في تحديث التوصيل',
              style: TextStyle(fontFamily: 'Cairo')),
          backgroundColor: AppColors.red,
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final o           = widget.order;
    final status      = o['status'] as String? ?? 'pending';
    final statusColor = widget.statusColors[status] ?? AppColors.muted;
    final buyer       = o['buyer'] as Map? ?? {};
    final listing     = o['listing'] as Map? ?? {};
    final buyerName   = buyer['name'] as String? ?? '—';
    final listingName = listing['breed'] as String?
        ?? listing['type'] as String? ?? '—';
    final total       = (o['totalPrice'] as num?)?.toDouble() ?? 0;
    final paymentType = o['paymentType'] as String? ?? '';
    final fmt         = NumberFormat('#,##0', 'ar');
    final canAct      = status != 'completed' && status != 'cancelled';

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
          // ── Header ────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.receipt_long_outlined,
                    size: 20, color: statusColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(listingName,
                      style: const TextStyle(fontFamily: 'Cairo',
                          fontSize: 14, fontWeight: FontWeight.w700,
                          color: AppColors.text)),
                  const SizedBox(height: 2),
                  Text(
                      'المشتري: $buyerName  •  '
                      '${_paymentAr[paymentType] ?? paymentType}',
                      style: const TextStyle(fontFamily: 'Cairo',
                          fontSize: 11, color: AppColors.muted)),
                ]),
              ),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('${fmt.format(total)} ج.م',
                    style: const TextStyle(fontFamily: 'Cairo',
                        fontSize: 14, fontWeight: FontWeight.w800,
                        color: AppColors.text)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(widget.statusAr[status] ?? status,
                      style: TextStyle(fontFamily: 'Cairo', fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: statusColor)),
                ),
              ]),
            ]),
          ),

          // ── Action chips ──────────────────────────────────────────────
          if (canAct)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              child: Wrap(spacing: 8, runSpacing: 6, children: [
                if (status == 'pending')
                  _ActionChip(
                      label: 'تأكيد',
                      color: AppColors.green,
                      loading: _loading,
                      onTap: () => _updateStatus('confirmed')),
                _ActionChip(
                    label: 'مكتمل',
                    color: AppColors.blue,
                    loading: _loading,
                    onTap: () => _updateStatus('completed')),
                _ActionChip(
                    label: 'إلغاء',
                    color: AppColors.red,
                    loading: _loading,
                    onTap: () => _updateStatus('cancelled')),
                // Delivery toggle
                GestureDetector(
                  onTap: () => setState(() => _expanded = !_expanded),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.bg,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      const Text('التوصيل',
                          style: TextStyle(fontFamily: 'Cairo',
                              fontSize: 12, fontWeight: FontWeight.w600,
                              color: AppColors.text)),
                      const SizedBox(width: 4),
                      Icon(
                          _expanded
                              ? Icons.expand_less
                              : Icons.expand_more,
                          size: 16, color: AppColors.muted),
                    ]),
                  ),
                ),
              ]),
            ),

          // ── Delivery section ──────────────────────────────────────────
          if (_expanded)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                const Divider(height: 1),
                const SizedBox(height: 12),
                // Delivery status chips
                Wrap(
                  spacing: 8,
                  children: _deliveryStatuses.map((ds) {
                    final sel = _deliveryStatus == ds.$1;
                    return GestureDetector(
                      onTap: () =>
                          setState(() => _deliveryStatus = ds.$1),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: sel
                              ? AppColors.green.withValues(alpha: 0.1)
                              : AppColors.bg,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: sel
                                ? AppColors.green
                                : AppColors.border,
                          ),
                        ),
                        child: Text(ds.$2,
                            style: TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: sel
                                    ? AppColors.green
                                    : AppColors.text)),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 10),
                // Cost field
                TextField(
                  controller: _deliveryCostCtrl,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(fontFamily: 'Cairo',
                      fontSize: 13, color: AppColors.text),
                  decoration: InputDecoration(
                    hintText: 'تكلفة التوصيل (ج.م)',
                    hintStyle: const TextStyle(fontFamily: 'Cairo',
                        fontSize: 13, color: AppColors.muted),
                    filled: true,
                    fillColor: AppColors.bg,
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
                const SizedBox(height: 10),
                FilledButton(
                  onPressed: _loading ? null : _setDelivery,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.green,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  child: _loading
                      ? const SizedBox(
                          width: 18, height: 18,
                          child: CircularProgressIndicator(
                              color: AppColors.white, strokeWidth: 2))
                      : const Text('حفظ بيانات التوصيل',
                          style: TextStyle(fontFamily: 'Cairo',
                              fontWeight: FontWeight.w700,
                              color: AppColors.white)),
                ),
              ]),
            ),
        ],
      ),
    );
  }
}

// ── Shared action chip ────────────────────────────────────────────────────────

class _ActionChip extends StatelessWidget {
  const _ActionChip({
    required this.label,
    required this.color,
    required this.loading,
    required this.onTap,
  });
  final String   label;
  final Color    color;
  final bool     loading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: loading ? null : onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(label,
          style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
              fontWeight: FontWeight.w700, color: color)),
    ),
  );
}
