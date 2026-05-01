import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/order_model.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import 'orders_service.dart';

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncOrders = ref.watch(myOrdersProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        title: const Text(
          'طلباتي',
          style: TextStyle(
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
          title: 'تعذّر تحميل الطلبات',
          subtitle: e.toString(),
          actionLabel: 'إعادة المحاولة',
          action: () => ref.invalidate(myOrdersProvider),
        ),
        data: (orders) {
          if (orders.isEmpty) {
            return const EmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'لا توجد طلبات بعد',
              subtitle: 'تصفح المزارع وأضف أول طلب',
            );
          }
          return RefreshIndicator(
            color: AppColors.green,
            onRefresh: () async => ref.invalidate(myOrdersProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: orders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, i) => _OrderCard(order: orders[i]),
            ),
          );
        },
      ),
    );
  }
}

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
              order.sellerFarmName ?? order.sellerName ?? 'مزرعة غير معروفة',
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
    builder: (_) => _OrderDetailSheet(order: order),
  );
}

class _OrderDetailSheet extends StatelessWidget {
  const _OrderDetailSheet({required this.order});
  final OrderModel order;

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('d MMMM yyyy — h:mm a', 'ar');
    return DraggableScrollableSheet(
      initialChildSize: 0.55,
      minChildSize: 0.4,
      maxChildSize: 0.85,
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
            const Text('تفاصيل الطلب',
                style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.text)),
            const SizedBox(height: 16),
            Expanded(
              child: ListView(
                controller: scroll,
                children: [
                  _DetailRow(label: 'رقم الطلب', value: '${order.id.substring(0, 12)}...'),
                  _DetailRow(label: 'الحالة', value: order.statusAr),
                  _DetailRow(
                      label: 'المزرعة',
                      value: order.sellerFarmName ?? order.sellerName ?? '—'),
                  _DetailRow(label: 'طريقة الدفع', value: order.paymentAr),
                  _DetailRow(
                      label: 'الإجمالي',
                      value: '${order.totalAmount.toStringAsFixed(0)} ج.م'),
                  if (order.deliveryCost > 0)
                    _DetailRow(
                        label: 'التوصيل',
                        value: '${order.deliveryCost.toStringAsFixed(0)} ج.م'),
                  _DetailRow(label: 'حالة الشحن', value: order.deliveryStatusAr),
                  if (order.notes != null)
                    _DetailRow(label: 'ملاحظات', value: order.notes!),
                  _DetailRow(
                      label: 'التاريخ', value: fmt.format(order.createdAt)),
                ],
              ),
            ),
          ],
        ),
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
