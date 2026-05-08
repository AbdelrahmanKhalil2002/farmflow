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
  String _search = '';

  static const _statusColors = {
    'pending':   AppColors.amber,
    'confirmed': AppColors.blue,
    'completed': AppColors.green,
    'cancelled': AppColors.red,
  };

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(adminOrdersProvider);

    final filters = [
      ('all',       context.l10n.allFilter),
      ('pending',   context.l10n.orderStatusPending),
      ('confirmed', context.l10n.orderStatusConfirmed),
      ('completed', context.l10n.orderStatusCompleted),
      ('cancelled', context.l10n.orderStatusCancelled),
    ];
    final statusAr = {
      'pending':   context.l10n.orderStatusPending,
      'confirmed': context.l10n.orderStatusConfirmed,
      'completed': context.l10n.orderStatusCompleted,
      'cancelled': context.l10n.orderStatusCancelled,
    };

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Text(context.l10n.adminOrdersTitle,
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
            child: ShimmerList(count: 5, cardHeight: 110)),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: context.l10n.loadingFailed,
          subtitle: e.toString(),
          actionLabel: context.l10n.retry,
          action: () => ref.invalidate(adminOrdersProvider),
        ),
        data: (orders) {
          final filtered = orders.where((o) {
            final status    = o['status'] as String? ?? '';
            final buyer     = o['buyer'] as Map? ?? {};
            final buyerName = (buyer['name'] as String? ?? '').toLowerCase();
            final orderId   = (o['_id'] as String? ?? '').toLowerCase();
            final statusOk  = _filter == 'all' || status == _filter;
            final searchOk  = _search.isEmpty ||
                buyerName.contains(_search) ||
                orderId.contains(_search);
            return statusOk && searchOk;
          }).toList();

          // Stats
          final total     = orders.length;
          final pending   = orders.where((o) =>
              (o['status'] as String?) == 'pending').length;
          final completed = orders.where((o) =>
              (o['status'] as String?) == 'completed').length;
          final revenue   = orders.fold<double>(0, (acc, o) =>
              acc + ((o['totalPrice'] as num?)?.toDouble() ?? 0));
          final fmt = NumberFormat('#,##0', 'ar');

          return Column(children: [
            // ── Search bar ──────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: TextField(
                onChanged: (v) => setState(() => _search = v.toLowerCase()),
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
                    color: AppColors.text),
                decoration: InputDecoration(
                  hintText: 'بحث برقم الطلب أو اسم المشتري...',
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
            // ── Stats strip ─────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
              child: Row(children: [
                _StatChip(label: 'الكل', value: '$total',
                    color: AppColors.blue),
                const SizedBox(width: 8),
                _StatChip(label: 'قيد الانتظار', value: '$pending',
                    color: AppColors.amber),
                const SizedBox(width: 8),
                _StatChip(label: 'مكتملة', value: '$completed',
                    color: AppColors.green),
                const SizedBox(width: 8),
                _StatChip(label: 'الإيراد', value: '${fmt.format(revenue)} ج',
                    color: AppColors.greenDark),
              ]),
            ),
            const SizedBox(height: 8),

            // ── List ────────────────────────────────────────────────────
            Expanded(
              child: filtered.isEmpty
                  ? EmptyState(
                      icon: Icons.receipt_long_outlined,
                      title: context.l10n.noOrders2,
                      subtitle: context.l10n.noOrdersInCategory,
                    )
                  : RefreshIndicator(
                      color: AppColors.green,
                      onRefresh: () async =>
                          ref.invalidate(adminOrdersProvider),
                      child: ListView.separated(
                        padding: const EdgeInsets.all(12),
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 10),
                        itemBuilder: (_, i) => GestureDetector(
                          onTap: () => _showDetailSheet(
                              context, filtered[i], statusAr),
                          child: _OrderAdminCard(
                            order: filtered[i],
                            statusAr: statusAr,
                            statusColors: _statusColors,
                            onAction: () =>
                                ref.invalidate(adminOrdersProvider),
                          ),
                        ),
                      ),
                    ),
            ),
          ]);
        },
      ),
    );
  }

  void _showDetailSheet(BuildContext context, Map<String, dynamic> order,
      Map<String, String> statusAr) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _OrderDetailSheet(
        order: order,
        statusAr: statusAr,
        statusColors: _statusColors,
        onAction: () => ref.invalidate(adminOrdersProvider),
      ),
    );
  }
}

// ── Order detail sheet ────────────────────────────────────────────────────────

class _OrderDetailSheet extends ConsumerStatefulWidget {
  const _OrderDetailSheet({
    required this.order,
    required this.statusAr,
    required this.statusColors,
    required this.onAction,
  });
  final Map<String, dynamic> order;
  final Map<String, String>  statusAr;
  final Map<String, Color>   statusColors;
  final VoidCallback onAction;

  @override
  ConsumerState<_OrderDetailSheet> createState() =>
      _OrderDetailSheetState();
}

class _OrderDetailSheetState extends ConsumerState<_OrderDetailSheet> {
  bool   _loading        = false;
  String _deliveryStatus = 'pending';
  final  _deliveryCostCtrl = TextEditingController();
  final  _noteCtrl         = TextEditingController();

  @override
  void initState() {
    super.initState();
    final o = widget.order;
    _deliveryStatus = o['deliveryStatus'] as String? ?? 'pending';
    final cost = (o['deliveryCost'] as num?)?.toDouble();
    if (cost != null && cost > 0) {
      _deliveryCostCtrl.text = cost.toStringAsFixed(0);
    }
    _noteCtrl.text = o['adminNotes'] as String? ?? '';
  }

  @override
  void dispose() {
    _deliveryCostCtrl.dispose();
    _noteCtrl.dispose();
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
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _saveDelivery() async {
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
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('تم حفظ بيانات التوصيل',
              style: TextStyle(fontFamily: 'Cairo')),
          backgroundColor: AppColors.green,
        ));
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final o           = widget.order;
    final status      = o['status'] as String? ?? 'pending';
    final statusColor = widget.statusColors[status] ?? AppColors.muted;
    final buyer       = o['buyer'] as Map? ?? {};
    final seller      = (o['listing'] as Map?)?['seller'] as Map? ?? {};
    final listing     = o['listing'] as Map? ?? {};
    final buyerName   = buyer['name'] as String? ?? '—';
    final buyerPhone  = buyer['phone'] as String? ?? buyer['personalPhone'] as String? ?? '';
    final sellerName  = seller['farmName'] as String? ?? seller['name'] as String? ?? '—';
    final sellerPhone = seller['farmPhone'] as String? ?? '';
    final listingName = listing['breed'] as String?
        ?? listing['type'] as String? ?? '—';
    final total       = (o['totalPrice'] as num?)?.toDouble() ?? 0;
    final paymentType = o['paymentType'] as String? ?? '';
    final createdAt   = o['createdAt'] as String?;
    final fmt         = NumberFormat('#,##0', 'ar');
    final canAct      = status != 'completed' && status != 'cancelled';
    final paymentAr   = {
      'deposit':  context.l10n.paymentDeposit,
      'cod':      context.l10n.paymentCash,
      'instapay': 'InstaPay',
    };
    final deliveryStatuses = [
      ('pending',    context.l10n.deliveryNotShipped),
      ('in_transit', context.l10n.deliveryInTransit),
      ('delivered',  context.l10n.deliveryDelivered),
    ];

    // Timeline steps
    final steps = [
      ('تم الطلب',    true),
      ('تم التأكيد',  status != 'pending'),
      ('جارٍ التوصيل', _deliveryStatus == 'in_transit' || _deliveryStatus == 'delivered'),
      ('مكتمل',       status == 'completed'),
    ];

    return DraggableScrollableSheet(
      initialChildSize: 0.92,
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
              Expanded(child: Text('تفاصيل الطلب',
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 16,
                      fontWeight: FontWeight.w800, color: AppColors.text))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(widget.statusAr[status] ?? status,
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
                // ── Buyer + Seller info ───────────────────────────────
                _SectionCard(children: [
                  _InfoRow(Icons.person_outline, 'المشتري', buyerName),
                  if (buyerPhone.isNotEmpty)
                    _InfoRow(Icons.phone_outlined, 'هاتف المشتري', buyerPhone),
                  const Divider(height: 16),
                  _InfoRow(Icons.storefront_outlined, 'البائع', sellerName),
                  if (sellerPhone.isNotEmpty)
                    _InfoRow(Icons.phone_outlined, 'هاتف البائع', sellerPhone),
                ]),
                const SizedBox(height: 12),

                // ── Payment info ──────────────────────────────────────
                _SectionCard(children: [
                  _InfoRow(Icons.receipt_long_outlined, 'المنتج', listingName),
                  _InfoRow(Icons.payments_outlined, 'الإجمالي',
                      '${fmt.format(total)} ج.م'),
                  _InfoRow(Icons.credit_card_outlined, 'طريقة الدفع',
                      paymentAr[paymentType] ?? paymentType),
                  if (createdAt != null)
                    _InfoRow(Icons.schedule_outlined, 'تاريخ الطلب',
                        DateFormat('d MMM yyyy', 'ar')
                            .format(DateTime.parse(createdAt))),
                ]),
                const SizedBox(height: 12),

                // ── 4-step timeline ───────────────────────────────────
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.bg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: List.generate(steps.length * 2 - 1, (i) {
                      if (i.isOdd) {
                        final done = steps[(i - 1) ~/ 2].$2 &&
                            steps[(i + 1) ~/ 2].$2;
                        return Expanded(
                          child: Container(height: 2,
                              color: done ? AppColors.green : AppColors.border),
                        );
                      }
                      final step = steps[i ~/ 2];
                      return Column(mainAxisSize: MainAxisSize.min, children: [
                        Container(
                          width: 28, height: 28,
                          decoration: BoxDecoration(
                            color: step.$2
                                ? AppColors.green
                                : AppColors.border,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            step.$2 ? Icons.check : Icons.circle_outlined,
                            size: 14,
                            color: step.$2
                                ? AppColors.white
                                : AppColors.muted,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(step.$1,
                            style: TextStyle(fontFamily: 'Cairo',
                                fontSize: 9,
                                color: step.$2
                                    ? AppColors.green
                                    : AppColors.muted)),
                      ]);
                    }),
                  ),
                ),
                const SizedBox(height: 12),

                // ── Admin delivery management ─────────────────────────
                if (canAct) ...[
                  const Text('إدارة التوصيل',
                      style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                          fontWeight: FontWeight.w700, color: AppColors.text)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: deliveryStatuses.map((ds) {
                      final sel = _deliveryStatus == ds.$1;
                      return GestureDetector(
                        onTap: () => setState(() => _deliveryStatus = ds.$1),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 7),
                          decoration: BoxDecoration(
                            color: sel
                                ? AppColors.green.withValues(alpha: 0.1)
                                : AppColors.bg,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: sel ? AppColors.green : AppColors.border,
                            ),
                          ),
                          child: Text(ds.$2,
                              style: TextStyle(
                                  fontFamily: 'Cairo', fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: sel
                                      ? AppColors.green
                                      : AppColors.text)),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _deliveryCostCtrl,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(fontFamily: 'Cairo',
                        fontSize: 13, color: AppColors.text),
                    decoration: InputDecoration(
                      hintText: context.l10n.deliveryCostHint,
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
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _loading ? null : _saveDelivery,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.green,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: _loading
                          ? const SizedBox(width: 18, height: 18,
                              child: CircularProgressIndicator(
                                  color: AppColors.white, strokeWidth: 2))
                          : Text(context.l10n.saveDelivery,
                              style: const TextStyle(fontFamily: 'Cairo',
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.white)),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Status action buttons
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    if (status == 'pending')
                      _ActionChipBtn(
                          label: context.l10n.confirmOrder2,
                          color: AppColors.green,
                          loading: _loading,
                          onTap: () => _updateStatus('confirmed')),
                    _ActionChipBtn(
                        label: context.l10n.completeOrder,
                        color: AppColors.blue,
                        loading: _loading,
                        onTap: () => _updateStatus('completed')),
                    _ActionChipBtn(
                        label: context.l10n.cancelOrder,
                        color: AppColors.red,
                        loading: _loading,
                        onTap: () => _updateStatus('cancelled')),
                  ]),
                ],
                const SizedBox(height: 24),
              ],
            ),
          ),
        ]),
      ),
    );
  }
}

// ── Section card ──────────────────────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: AppColors.bg,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppColors.border),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: children,
    ),
  );
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.icon, this.label, this.value);
  final IconData icon;
  final String label, value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(children: [
      Icon(icon, size: 15, color: AppColors.muted),
      const SizedBox(width: 8),
      Text(label,
          style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
              color: AppColors.muted)),
      const Spacer(),
      Text(value,
          style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
              fontWeight: FontWeight.w600, color: AppColors.text)),
    ]),
  );
}

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
        Text(value, style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
            fontWeight: FontWeight.w800, color: color)),
        Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 9,
            color: AppColors.muted), textAlign: TextAlign.center),
      ]),
    ),
  );
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

  @override
  void initState() {
    super.initState();
    final o = widget.order;
    _deliveryStatus = (o['deliveryStatus'] as String?) ?? 'pending';
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
          content: Text(context.l10n.updateStatusFailed,
              style: const TextStyle(fontFamily: 'Cairo')),
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
          content: Text(context.l10n.updateDeliveryFailed,
              style: const TextStyle(fontFamily: 'Cairo')),
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
    final paymentAr = {
      'deposit':  context.l10n.paymentDeposit,
      'cod':      context.l10n.paymentCash,
      'instapay': 'InstaPay',
    };
    final deliveryStatuses = [
      ('pending',    context.l10n.deliveryNotShipped),
      ('in_transit', context.l10n.deliveryInTransit),
      ('delivered',  context.l10n.deliveryDelivered),
    ];

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
                      '${context.l10n.buyerLabel}: $buyerName  •  '
                      '${paymentAr[paymentType] ?? paymentType}',
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
                      label: context.l10n.confirmOrder2,
                      color: AppColors.green,
                      loading: _loading,
                      onTap: () => _updateStatus('confirmed')),
                _ActionChip(
                    label: context.l10n.completeOrder,
                    color: AppColors.blue,
                    loading: _loading,
                    onTap: () => _updateStatus('completed')),
                _ActionChip(
                    label: context.l10n.cancelOrder,
                    color: AppColors.red,
                    loading: _loading,
                    onTap: () => _updateStatus('cancelled')),
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
                      Text(context.l10n.deliverySection,
                          style: const TextStyle(fontFamily: 'Cairo',
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
                Wrap(
                  spacing: 8,
                  children: deliveryStatuses.map((ds) {
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
                TextField(
                  controller: _deliveryCostCtrl,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(fontFamily: 'Cairo',
                      fontSize: 13, color: AppColors.text),
                  decoration: InputDecoration(
                    hintText: context.l10n.deliveryCostHint,
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
                      : Text(context.l10n.saveDelivery,
                          style: const TextStyle(fontFamily: 'Cairo',
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

class _ActionChipBtn extends StatelessWidget {
  const _ActionChipBtn({
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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(label,
          style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
              fontWeight: FontWeight.w700, color: color)),
    ),
  );
}
