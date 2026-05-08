import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/l10n/l10n_ext.dart';
import '../../../shared/models/order_model.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import 'orders_service.dart';

// ── Active tab filter ─────────────────────────────────────────────────────────
enum _OrderTab { all, active, completed, cancelled }

extension _OrderTabExt on _OrderTab {
  String get label {
    switch (this) {
      case _OrderTab.all:       return 'الكل';
      case _OrderTab.active:    return 'نشط';
      case _OrderTab.completed: return 'مكتمل';
      case _OrderTab.cancelled: return 'ملغي';
    }
  }

  bool matches(OrderModel order) {
    switch (this) {
      case _OrderTab.all:       return true;
      case _OrderTab.active:    return order.status == 'pending' || order.status == 'confirmed';
      case _OrderTab.completed: return order.status == 'completed';
      case _OrderTab.cancelled: return order.status == 'cancelled';
    }
  }
}

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  _OrderTab _activeTab = _OrderTab.all;

  @override
  Widget build(BuildContext context) {
    final asyncOrders = ref.watch(myOrdersProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        title: Text(
          context.l10n.ordersTitle,
          style: const TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w800,
            color: AppColors.white,
          ),
        ),
        elevation: 0,
      ),
      body: asyncOrders.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(16),
          child: ShimmerList(count: 4, cardHeight: 110),
        ),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: context.l10n.loadOrdersFailed,
          subtitle: e.toString(),
          actionLabel: context.l10n.retry,
          action: () => ref.invalidate(myOrdersProvider),
        ),
        data: (orders) {
          // Compute per-tab counts
          final counts = {
            _OrderTab.all:       orders.length,
            _OrderTab.active:    orders.where(_OrderTab.active.matches).length,
            _OrderTab.completed: orders.where(_OrderTab.completed.matches).length,
            _OrderTab.cancelled: orders.where(_OrderTab.cancelled.matches).length,
          };

          final filtered = orders.where(_activeTab.matches).toList();

          // Summary stats
          final activeCount = counts[_OrderTab.active]!;
          final totalSpent = orders
              .where((o) => o.status == 'completed')
              .fold<double>(0, (sum, o) => sum + o.totalAmount);

          return RefreshIndicator(
            color: AppColors.green,
            onRefresh: () async => ref.invalidate(myOrdersProvider),
            child: CustomScrollView(
              slivers: [
                // ── Summary strip ────────────────────────────────────────────
                SliverToBoxAdapter(
                  child: _SummaryStrip(
                    total: orders.length,
                    active: activeCount,
                    totalSpent: totalSpent,
                  ),
                ),

                // ── Filter tabs ──────────────────────────────────────────────
                SliverToBoxAdapter(
                  child: _TabBar(
                    activeTab: _activeTab,
                    counts: counts,
                    onTabChanged: (t) => setState(() => _activeTab = t),
                  ),
                ),

                if (filtered.isEmpty)
                  SliverFillRemaining(
                    child: EmptyState(
                      icon: Icons.receipt_long_outlined,
                      title: context.l10n.noOrders,
                      subtitle: context.l10n.noOrdersSubtitle,
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.all(16),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (_, i) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _OrderCard(order: filtered[i]),
                        ),
                        childCount: filtered.length,
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ── Summary strip ─────────────────────────────────────────────────────────────
class _SummaryStrip extends StatelessWidget {
  const _SummaryStrip({
    required this.total,
    required this.active,
    required this.totalSpent,
  });

  final int total;
  final int active;
  final double totalSpent;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.card,
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          _SumStat(label: 'إجمالي الطلبات', value: '$total'),
          _Divider(),
          _SumStat(label: 'الطلبات النشطة', value: '$active'),
          _Divider(),
          _SumStat(
              label: 'الإجمالي المنفق',
              value: '${totalSpent.toStringAsFixed(0)} ج.م'),
        ],
      ),
    );
  }
}

class _SumStat extends StatelessWidget {
  const _SumStat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            value,
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppColors.green,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize: 10,
              color: AppColors.muted,
            ),
          ),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 28,
      color: AppColors.border,
    );
  }
}

// ── Tab bar with counts ───────────────────────────────────────────────────────
class _TabBar extends StatelessWidget {
  const _TabBar({
    required this.activeTab,
    required this.counts,
    required this.onTabChanged,
  });

  final _OrderTab activeTab;
  final Map<_OrderTab, int> counts;
  final ValueChanged<_OrderTab> onTabChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.card,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: _OrderTab.values.map((tab) {
            final selected = activeTab == tab;
            final count = counts[tab] ?? 0;
            return Padding(
              padding: const EdgeInsets.only(left: 8),
              child: GestureDetector(
                onTap: () => onTabChanged(tab),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 7),
                  decoration: BoxDecoration(
                    color: selected ? AppColors.green : AppColors.bg,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: selected ? AppColors.green : AppColors.border,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        tab.label,
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: selected ? AppColors.white : AppColors.text,
                        ),
                      ),
                      if (count > 0) ...[
                        const SizedBox(width: 5),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(
                            color: selected
                                ? AppColors.white.withValues(alpha: 0.3)
                                : AppColors.green.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '$count',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: selected
                                  ? AppColors.white
                                  : AppColors.green,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

// ── Order card ────────────────────────────────────────────────────────────────
class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order});
  final OrderModel order;

  static const _statusColor = {
    'pending':   Color(0xFFF59E0B),
    'confirmed': Color(0xFF3B82F6),
    'completed': Color(0xFF22C55E),
    'cancelled': Color(0xFFEF4444),
  };

  static const _statusBg = {
    'pending':   Color(0xFFFEF3C7),
    'confirmed': Color(0xFFEFF6FF),
    'completed': Color(0xFFF0FDF4),
    'cancelled': Color(0xFFFEF2F2),
  };

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor[order.status] ?? AppColors.muted;
    final statusBg    = _statusBg[order.status] ?? AppColors.bg;
    final fmt = DateFormat('d MMM yyyy', 'ar');

    return GestureDetector(
      onTap: () => _showOrderDetail(context, order),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
          boxShadow: const [
            BoxShadow(color: Color(0x08000000), blurRadius: 6, offset: Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    order.listing?.typeAr ??
                        (order.listing?.breed ?? 'طلب #${order.id.substring(0, 8)}'),
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.text,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    order.statusAr,
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              order.sellerFarmName ?? order.sellerName ?? context.l10n.unknownFarm,
              style: const TextStyle(
                  fontFamily: 'Cairo', fontSize: 12, color: AppColors.muted),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.payments_outlined, size: 14, color: AppColors.muted),
                const SizedBox(width: 4),
                Text(order.paymentAr,
                    style: const TextStyle(
                        fontFamily: 'Cairo', fontSize: 12, color: AppColors.muted)),
                const Spacer(),
                Text(
                  '${order.totalAmount.toStringAsFixed(0)} ج.م',
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.green,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              fmt.format(order.createdAt),
              style: const TextStyle(
                  fontFamily: 'Cairo', fontSize: 11, color: AppColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}

void _showOrderDetail(BuildContext context, OrderModel order) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.card,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => _OrderDetailSheet(order: order),
  );
}

// ── Order detail sheet ────────────────────────────────────────────────────────
class _OrderDetailSheet extends ConsumerStatefulWidget {
  const _OrderDetailSheet({required this.order});
  final OrderModel order;

  @override
  ConsumerState<_OrderDetailSheet> createState() => _OrderDetailSheetState();
}

class _OrderDetailSheetState extends ConsumerState<_OrderDetailSheet> {
  bool _cancelling = false;

  Future<void> _cancelOrder() async {
    setState(() => _cancelling = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.patch(
        ApiEndpoints.orderStatus(widget.order.id),
        data: {'status': 'cancelled'},
      );
      ref.invalidate(myOrdersProvider);
      if (mounted) Navigator.pop(context);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('فشل إلغاء الطلب. يرجى المحاولة مجددًا.',
                style: TextStyle(fontFamily: 'Cairo')),
            backgroundColor: AppColors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  void _downloadReceipt() {
    final fmt = DateFormat('d MMMM yyyy — h:mm a', 'ar');
    final receipt = '''
━━━━━━━━━━━━━━━━━━━━━━━━
      🌾 FarmFlow — فاتورة طلب
━━━━━━━━━━━━━━━━━━━━━━━━
رقم الطلب:   ${widget.order.id}
التاريخ:       ${fmt.format(widget.order.createdAt)}
المزرعة:       ${widget.order.sellerFarmName ?? widget.order.sellerName ?? '—'}
المنتج:        ${widget.order.listing?.typeAr ?? '—'}${widget.order.listing?.breed != null ? ' (${widget.order.listing!.breed})' : ''}
الحالة:        ${widget.order.statusAr}
الدفع:         ${widget.order.paymentAr}
${widget.order.deliveryCost > 0 ? 'التوصيل:       ${widget.order.deliveryCost.toStringAsFixed(0)} ج.م\n' : ''}الإجمالي:      ${widget.order.totalAmount.toStringAsFixed(0)} ج.م
━━━━━━━━━━━━━━━━━━━━━━━━
شكراً لاستخدامك FarmFlow
''';
    Share.share(receipt, subject: 'فاتورة طلب FarmFlow');
  }

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('d MMMM yyyy — h:mm a', 'ar');
    final canCancel = widget.order.status == 'pending';

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (_, scroll) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Text(context.l10n.orderDetails,
                style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.text)),
            const SizedBox(height: 16),
            Expanded(
              child: ListView(
                controller: scroll,
                children: [
                  // ── Progress tracker ────────────────────────────────────
                  _ProgressTracker(status: widget.order.status),
                  const SizedBox(height: 20),

                  // ── Details ─────────────────────────────────────────────
                  _DetailRow(label: context.l10n.orderNumber, value: '${widget.order.id.substring(0, 12)}...'),
                  _DetailRow(label: context.l10n.orderStatus, value: widget.order.statusAr),
                  _DetailRow(
                      label: context.l10n.farmLabel,
                      value: widget.order.sellerFarmName ?? widget.order.sellerName ?? '—'),
                  _DetailRow(label: context.l10n.paymentMethodLabel, value: widget.order.paymentAr),
                  _DetailRow(
                      label: context.l10n.total,
                      value: '${widget.order.totalAmount.toStringAsFixed(0)} ج.م'),
                  if (widget.order.deliveryCost > 0)
                    _DetailRow(
                        label: context.l10n.deliveryCostLabel,
                        value: '${widget.order.deliveryCost.toStringAsFixed(0)} ج.م'),
                  _DetailRow(label: context.l10n.shippingStatus, value: widget.order.deliveryStatusAr),
                  if (widget.order.notes != null)
                    _DetailRow(label: context.l10n.notesLabel, value: widget.order.notes!),
                  _DetailRow(
                      label: context.l10n.dateLabel,
                      value: fmt.format(widget.order.createdAt)),

                  const SizedBox(height: 16),

                  // ── Receipt download ────────────────────────────────────
                  OutlinedButton.icon(
                    onPressed: _downloadReceipt,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.green),
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.download_outlined,
                        color: AppColors.green, size: 18),
                    label: const Text(
                      'تحميل الفاتورة',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.w700,
                        color: AppColors.green,
                      ),
                    ),
                  ),

                  // ── Cancel order ────────────────────────────────────────
                  if (canCancel) ...[
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      onPressed: _cancelling ? null : _cancelOrder,
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.red),
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: _cancelling
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  color: AppColors.red, strokeWidth: 2),
                            )
                          : const Icon(Icons.cancel_outlined,
                              color: AppColors.red, size: 18),
                      label: const Text(
                        'إلغاء الطلب',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontWeight: FontWeight.w700,
                          color: AppColors.red,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Progress tracker ──────────────────────────────────────────────────────────
class _ProgressTracker extends StatelessWidget {
  const _ProgressTracker({required this.status});
  final String status;

  static const _steps = [
    (Icons.shopping_cart_outlined, 'وُضع'),
    (Icons.check_circle_outline,   'أُكد'),
    (Icons.local_shipping_outlined,'في الطريق'),
    (Icons.home_outlined,          'وصل'),
  ];

  static const _statusIndex = {
    'pending':   0,
    'confirmed': 1,
    'in_transit': 2, // delivery status
    'completed': 3,
    'cancelled': -1,
  };

  int get _currentStep => _statusIndex[status] ?? 0;

  @override
  Widget build(BuildContext context) {
    if (status == 'cancelled') {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.redBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.red.withValues(alpha: 0.3)),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.cancel_outlined, color: AppColors.red, size: 18),
            SizedBox(width: 8),
            Text(
              'تم إلغاء الطلب',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.red,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.greenBg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'تتبع الطلب',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: AppColors.muted,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: List.generate(_steps.length * 2 - 1, (idx) {
              if (idx.isOdd) {
                // Connector line
                final stepIdx = (idx - 1) ~/ 2;
                final active = _currentStep > stepIdx;
                return Expanded(
                  child: Container(
                    height: 2,
                    color: active ? AppColors.green : AppColors.border,
                  ),
                );
              }
              final stepIdx = idx ~/ 2;
              final done    = _currentStep > stepIdx;
              final current = _currentStep == stepIdx;

              return Column(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: done || current
                          ? AppColors.green
                          : AppColors.card,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: done || current
                            ? AppColors.green
                            : AppColors.border,
                        width: current ? 2.5 : 1.5,
                      ),
                    ),
                    child: Icon(
                      _steps[stepIdx].$1,
                      size: 15,
                      color: done || current
                          ? AppColors.white
                          : AppColors.muted,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _steps[stepIdx].$2,
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 9,
                      fontWeight: current
                          ? FontWeight.w800
                          : FontWeight.w500,
                      color: done || current
                          ? AppColors.greenText
                          : AppColors.muted,
                    ),
                  ),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: const TextStyle(
                  fontFamily: 'Cairo', fontSize: 13, color: AppColors.muted)),
          Flexible(
            child: Text(value,
                textAlign: TextAlign.left,
                style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.text)),
          ),
        ],
      ),
    );
  }
}
