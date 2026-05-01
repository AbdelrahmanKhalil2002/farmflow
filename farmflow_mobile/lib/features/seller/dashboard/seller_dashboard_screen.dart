import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/auth/auth_notifier.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/order_model.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import '../finance/finance_service.dart';

// ── Dashboard providers ───────────────────────────────────────────────────────

/// Seller's recent orders (last 10).
final sellerOrdersProvider = FutureProvider<List<OrderModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.orders, queryParameters: {'limit': 10});
  final data = res.data as List? ?? [];
  return data.map((e) => OrderModel.fromJson(e as Map<String, dynamic>)).toList();
});

/// Animals with follow-ups due within 7 days.
final followUpsDueProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final res  = await dio.get(ApiEndpoints.followUpsDue);
    final data = res.data as List? ?? [];
    return data.cast<Map<String, dynamic>>();
  } catch (_) {
    return [];
  }
});

// ── Screen ────────────────────────────────────────────────────────────────────

class SellerDashboardScreen extends ConsumerWidget {
  const SellerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).valueOrNull;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'مرحباً، ${user?.farmName ?? user?.name ?? 'مزارع'}',
              style: const TextStyle(
                fontFamily: 'Cairo',
                fontWeight: FontWeight.w800,
                fontSize: 16,
                color: AppColors.white,
              ),
            ),
            const Text(
              'لوحة التحكم',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 12,
                color: Color(0xCCFFFFFF),
              ),
            ),
          ],
        ),
      ),
      body: RefreshIndicator(
        color: AppColors.green,
        onRefresh: () async {
          ref.invalidate(financeSummaryProvider);
          ref.invalidate(sellerOrdersProvider);
          ref.invalidate(followUpsDueProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: const [
            _KpiRow(),
            SizedBox(height: 16),
            _QuickAccessRow(),
            SizedBox(height: 16),
            _FollowUpsCard(),
            SizedBox(height: 16),
            _RecentOrdersCard(),
          ],
        ),
      ),
    );
  }
}

// ── KPI row ───────────────────────────────────────────────────────────────────

class _KpiRow extends ConsumerWidget {
  const _KpiRow();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncSummary = ref.watch(financeSummaryProvider);

    return asyncSummary.when(
      loading: () => const ShimmerCard(height: 110),
      error: (_, __) => const SizedBox.shrink(),
      data: (s) {
        final fmt = NumberFormat('#,##0', 'ar');
        final profitColor = s.netProfit >= 0 ? AppColors.green : AppColors.red;
        return Row(
          children: [
            Expanded(child: _KpiCard(
              icon: Icons.trending_up,
              iconColor: AppColors.green,
              label: 'الإيرادات',
              value: '${fmt.format(s.totalIncome)} ج.م',
              bg: AppColors.greenBg,
            )),
            const SizedBox(width: 8),
            Expanded(child: _KpiCard(
              icon: Icons.trending_down,
              iconColor: AppColors.red,
              label: 'المصروفات',
              value: '${fmt.format(s.totalExpenses)} ج.م',
              bg: AppColors.redBg,
            )),
            const SizedBox(width: 8),
            Expanded(child: _KpiCard(
              icon: Icons.account_balance_wallet_outlined,
              iconColor: profitColor,
              label: 'صافي الربح',
              value: '${fmt.format(s.netProfit)} ج.م',
              bg: s.netProfit >= 0 ? AppColors.greenBg : AppColors.redBg,
            )),
          ],
        );
      },
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
    required this.bg,
  });

  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final Color bg;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: bg,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppColors.border),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: iconColor),
        const SizedBox(height: 6),
        Text(
          value,
          style: TextStyle(
            fontFamily: 'Cairo',
            fontSize: 13,
            fontWeight: FontWeight.w800,
            color: iconColor,
          ),
        ),
        Text(
          label,
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

// ── Quick-access row ──────────────────────────────────────────────────────────

class _QuickAccessRow extends StatelessWidget {
  const _QuickAccessRow();

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: _QuickCard(
          emoji: '🥛',
          label: 'منتجاتي الألبانية',
          color: AppColors.blue,
          onTap: () => context.push('/seller/dairy'),
        ),
      ),
      const SizedBox(width: 10),
      Expanded(
        child: _QuickCard(
          emoji: '🌾',
          label: 'مستلزماتي',
          color: AppColors.green,
          onTap: () => context.push('/seller/supplies'),
        ),
      ),
    ],
  );
}

class _QuickCard extends StatelessWidget {
  const _QuickCard({
    required this.emoji,
    required this.label,
    required this.color,
    required this.onTap,
  });
  final String emoji;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 22)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
          Icon(Icons.chevron_right, size: 16, color: color),
        ],
      ),
    ),
  );
}

// ── Follow-ups card ───────────────────────────────────────────────────────────

class _FollowUpsCard extends ConsumerWidget {
  const _FollowUpsCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncFollowUps = ref.watch(followUpsDueProvider);

    return asyncFollowUps.when(
      loading: () => const ShimmerCard(height: 80),
      error: (_, __) => const SizedBox.shrink(),
      data: (followUps) {
        if (followUps.isEmpty) return const SizedBox.shrink();
        return Container(
          decoration: BoxDecoration(
            color: AppColors.roseBg,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.rose.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
                child: Row(
                  children: [
                    const Icon(Icons.medical_services_outlined,
                        size: 16, color: AppColors.rose),
                    const SizedBox(width: 6),
                    Text(
                      'متابعات طبية (${followUps.length})',
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.rose,
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              ...followUps.take(3).map((f) {
                final name = f['breed'] as String?
                    ?? f['tagId'] as String?
                    ?? 'حيوان';
                final dateStr = f['followUpDate'] as String? ?? '';
                final date = DateTime.tryParse(dateStr);
                final formatted = date != null
                    ? DateFormat('d MMM', 'ar').format(date)
                    : '';
                return Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 8),
                  child: Row(
                    children: [
                      const Icon(Icons.pets, size: 14, color: AppColors.rose),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(name,
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 13,
                              color: AppColors.text,
                            )),
                      ),
                      if (formatted.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.rose.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(formatted,
                              style: const TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 11,
                                color: AppColors.rose,
                                fontWeight: FontWeight.w700,
                              )),
                        ),
                    ],
                  ),
                );
              }),
            ],
          ),
        );
      },
    );
  }
}

// ── Recent orders card ────────────────────────────────────────────────────────

class _RecentOrdersCard extends ConsumerWidget {
  const _RecentOrdersCard();

  static const _statusColor = {
    'pending':   Color(0xFFF59E0B),
    'confirmed': Color(0xFF3B82F6),
    'completed': Color(0xFF22C55E),
    'cancelled': Color(0xFFEF4444),
  };

  static const _statusAr = {
    'pending':   'قيد الانتظار',
    'confirmed': 'مؤكد',
    'completed': 'مكتمل',
    'cancelled': 'ملغي',
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncOrders = ref.watch(sellerOrdersProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'آخر الطلبات',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: AppColors.text,
              ),
            ),
            GestureDetector(
              onTap: () => context.go('/seller/statements'),
              child: const Text(
                'عرض الكل',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 13,
                  color: AppColors.green,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        asyncOrders.when(
          loading: () => const ShimmerList(count: 3, cardHeight: 72),
          error: (_, __) => const SizedBox.shrink(),
          data: (orders) {
            if (orders.isEmpty) {
              return Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: const Center(
                  child: Text(
                    'لا توجد طلبات بعد',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 13,
                      color: AppColors.muted,
                    ),
                  ),
                ),
              );
            }
            return Column(
              children: orders.take(5).map((order) {
                final color = _statusColor[order.status] ?? AppColors.muted;
                final statusAr = _statusAr[order.status] ?? order.status;
                final fmt = NumberFormat('#,##0', 'ar');
                final dateFmt = DateFormat('d MMM', 'ar');
                final buyerName = order.sellerName ?? '';
                final listing = order.listing;

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.receipt_long_outlined,
                            size: 18, color: color),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              listing?.breed ?? listing?.typeAr ?? buyerName,
                              style: const TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.text,
                              ),
                            ),
                            Text(
                              dateFmt.format(order.createdAt),
                              style: const TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 11,
                                color: AppColors.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${fmt.format(order.totalAmount)} ج.م',
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: AppColors.green,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              statusAr,
                              style: TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: color,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }).toList(),
            );
          },
        ),
      ],
    );
  }
}
