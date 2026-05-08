import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/auth/auth_notifier.dart';
import '../../core/l10n/l10n_ext.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/confirm_dialog.dart';
import '../../shared/widgets/shimmer_widget.dart';

// ── Stats provider ────────────────────────────────────────────────────────────

final adminStatsProvider =
    FutureProvider<Map<String, dynamic>>((ref) async {
  final dio  = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.adminStats);
  return res.data as Map<String, dynamic>? ?? {};
});

// ── Orders trend provider (last 7 days) ───────────────────────────────────────

final adminOrdersTrendProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final res = await dio.get(ApiEndpoints.adminStats,
        queryParameters: {'period': '7d'});
    final data = res.data as Map<String, dynamic>? ?? {};
    final trend = data['ordersTrend'] as List?;
    if (trend != null) return trend.cast<Map<String, dynamic>>();
  } catch (_) {}
  return [];
});

// ── Screen ────────────────────────────────────────────────────────────────────

class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncStats = ref.watch(adminStatsProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Text(context.l10n.adminDashboardTitle,
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                color: AppColors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.white),
            onPressed: () async {
              final ok = await showConfirmDialog(
                context,
                title: context.l10n.logoutConfirmTitle,
                message: context.l10n.logoutConfirmMessage,
                confirmLabel: context.l10n.logoutConfirmButton,
                dangerous: true,
              );
              if (ok && context.mounted) {
                await ref.read(authNotifierProvider.notifier).logout();
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.green,
        onRefresh: () async {
          ref.invalidate(adminStatsProvider);
          ref.invalidate(adminOrdersTrendProvider);
        },
        child: asyncStats.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(16),
            child: Column(children: [
              ShimmerCard(height: 120),
              SizedBox(height: 12),
              ShimmerCard(height: 120),
              SizedBox(height: 12),
              ShimmerCard(height: 180),
              SizedBox(height: 12),
              ShimmerCard(height: 140),
            ]),
          ),
          error: (e, _) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.wifi_off_rounded, size: 48,
                    color: AppColors.muted),
                const SizedBox(height: 10),
                Text(context.l10n.loadingFailed, style: const TextStyle(
                    fontFamily: 'Cairo', color: AppColors.muted)),
                TextButton(
                  onPressed: () => ref.invalidate(adminStatsProvider),
                  child: Text(context.l10n.retry,
                      style: const TextStyle(fontFamily: 'Cairo',
                          color: AppColors.green)),
                ),
              ],
            ),
          ),
          data: (stats) => _StatsBody(stats: stats),
        ),
      ),
    );
  }
}

// ── Body ──────────────────────────────────────────────────────────────────────

class _StatsBody extends ConsumerStatefulWidget {
  const _StatsBody({required this.stats});
  final Map<String, dynamic> stats;

  @override
  ConsumerState<_StatsBody> createState() => _StatsBodyState();
}

class _StatsBodyState extends ConsumerState<_StatsBody> {
  int _get(String key) {
    final v = widget.stats[key];
    if (v is int)    return v;
    if (v is double) return v.toInt();
    if (v is Map)    return 0;
    return 0;
  }

  double _getDouble(String key) {
    final v = widget.stats[key];
    if (v is num) return v.toDouble();
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final fmt     = NumberFormat('#,##0', 'ar');
    final fmtMony = NumberFormat('#,##0', 'ar');

    final counts  = widget.stats['counts'] as Map? ?? widget.stats;
    final revenue = widget.stats['revenue'] as Map?;
    final pending = widget.stats['pending'] as Map?;
    final weeklyStats = widget.stats['weeklyStats'] as Map?;

    int getC(String k) {
      final v = counts[k];
      if (v is int)    return v;
      if (v is double) return v.toInt();
      return 0;
    }

    final totalUsers       = getC('users')    > 0 ? getC('users')    : _get('totalUsers');
    final totalSellers     = getC('sellers')  > 0 ? getC('sellers')  : _get('totalSellers');
    final totalBuyers      = getC('buyers')   > 0 ? getC('buyers')   : _get('totalBuyers');
    final totalListings    = getC('listings') > 0 ? getC('listings') : _get('totalListings');
    final totalOrders      = getC('orders')   > 0 ? getC('orders')   : _get('totalOrders');
    final completedOrders  = getC('completedOrders') > 0 ? getC('completedOrders') : _get('completedOrders');
    final totalRevenue     = revenue != null
        ? (revenue['total'] as num?)?.toDouble() ?? 0.0
        : _getDouble('totalRevenue');
    final pendingListings  = pending != null
        ? (pending['listings'] as int?) ?? 0
        : _get('pendingListings');
    final pendingDairy     = pending != null
        ? (pending['dairy'] as int?) ?? 0
        : _get('pendingDairy');
    final pendingSupplies  = pending != null
        ? (pending['supplies'] as int?) ?? 0
        : _get('pendingSupplies');
    final newUsersWeek     = weeklyStats != null
        ? (weeklyStats['newUsers'] as int?) ?? 0
        : _get('newUsersThisWeek');
    final newListingsWeek  = weeklyStats != null
        ? (weeklyStats['newListings'] as int?) ?? 0
        : _get('newListingsThisWeek');

    // Platform health percentages
    final approvalRate = totalListings > 0
        ? ((totalListings - pendingListings) / totalListings * 100).clamp(0, 100)
        : 0.0;
    final completionRate = totalOrders > 0
        ? (completedOrders / totalOrders * 100).clamp(0, 100)
        : 0.0;

    final trendAsync = ref.watch(adminOrdersTrendProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // ── Revenue highlight ────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.green, AppColors.greenDark],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(context.l10n.totalIncome,
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                          color: Color(0xCCFFFFFF))),
                  const SizedBox(height: 4),
                  Text('${fmtMony.format(totalRevenue)} ج.م',
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 22,
                          fontWeight: FontWeight.w800, color: AppColors.white)),
                  const SizedBox(height: 6),
                  Text('${fmt.format(totalOrders)} ${context.l10n.ordersTitle}  •  ${fmt.format(completedOrders)} مكتمل',
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                          color: Color(0xCCFFFFFF))),
                ]),
            ),
            const Icon(Icons.account_balance_wallet_outlined,
                size: 44, color: Color(0x66FFFFFF)),
          ]),
        ),
        const SizedBox(height: 16),

        // ── User KPIs ────────────────────────────────────────────────────
        Row(children: [
          Expanded(child: _KpiCard(
            label: context.l10n.adminUsersTitle,
            value: fmt.format(totalUsers),
            sub: newUsersWeek > 0 ? '+${fmt.format(newUsersWeek)} هذا الأسبوع' : null,
            icon: Icons.people_outline,
            color: AppColors.blue,
          )),
          const SizedBox(width: 10),
          Expanded(child: _KpiCard(
            label: context.l10n.sellerBadge,
            value: fmt.format(totalSellers),
            icon: Icons.storefront_outlined,
            color: AppColors.green,
          )),
          const SizedBox(width: 10),
          Expanded(child: _KpiCard(
            label: context.l10n.buyerBadge,
            value: fmt.format(totalBuyers),
            icon: Icons.person_outline,
            color: AppColors.amber,
          )),
        ]),
        const SizedBox(height: 10),

        // ── Listing & Order KPIs ─────────────────────────────────────────
        Row(children: [
          Expanded(child: _KpiCard(
            label: context.l10n.adminListingsTitle,
            value: fmt.format(totalListings),
            sub: newListingsWeek > 0 ? '+${fmt.format(newListingsWeek)} هذا الأسبوع' : null,
            icon: Icons.sell_outlined,
            color: AppColors.green,
          )),
          const SizedBox(width: 10),
          Expanded(child: _KpiCard(
            label: context.l10n.adminOrdersTitle,
            value: fmt.format(totalOrders),
            sub: completedOrders > 0 ? '${fmt.format(completedOrders)} مكتمل' : null,
            icon: Icons.receipt_long_outlined,
            color: AppColors.blue,
          )),
          const SizedBox(width: 10),
          const Expanded(child: SizedBox()),
        ]),
        const SizedBox(height: 20),

        // ── Platform health ───────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('صحة المنصة',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 14,
                    fontWeight: FontWeight.w800, color: AppColors.text)),
            const SizedBox(height: 14),
            _HealthBar(
              label: 'معدل الموافقة',
              value: approvalRate / 100,
              displayValue: '${approvalRate.toStringAsFixed(0)}%',
              color: AppColors.green,
            ),
            const SizedBox(height: 10),
            _HealthBar(
              label: 'معدل إتمام الطلبات',
              value: completionRate / 100,
              displayValue: '${completionRate.toStringAsFixed(0)}%',
              color: AppColors.blue,
            ),
          ]),
        ),
        const SizedBox(height: 16),

        // ── Orders trend chart ────────────────────────────────────────────
        trendAsync.when(
          loading: () => const ShimmerCard(height: 160),
          error: (_, __) => const SizedBox.shrink(),
          data: (trend) {
            if (trend.isEmpty) return const SizedBox.shrink();
            return _OrdersTrendChart(trend: trend);
          },
        ),
        const SizedBox(height: 16),

        // ── Pending approvals ─────────────────────────────────────────────
        if (pendingListings + pendingDairy + pendingSupplies > 0) ...[
          Text(context.l10n.pendingStatus,
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 15,
                  fontWeight: FontWeight.w800, color: AppColors.text)),
          const SizedBox(height: 10),
          _PendingCard(
            label: context.l10n.adminListingsTitle,
            count: pendingListings,
            icon: Icons.pets_outlined,
            color: AppColors.green,
            onTap: () => context.go('/admin/listings'),
          ),
          const SizedBox(height: 8),
          _PendingCard(
            label: context.l10n.adminDairyTitle,
            count: pendingDairy,
            icon: Icons.local_drink_outlined,
            color: AppColors.blue,
            onTap: () => context.go('/admin/dairy'),
          ),
          const SizedBox(height: 8),
          _PendingCard(
            label: context.l10n.suppliesTitle,
            count: pendingSupplies,
            icon: Icons.inventory_2_outlined,
            color: AppColors.amber,
            onTap: () => context.go('/admin/supplies'),
          ),
        ],

        // ── Quick actions ──────────────────────────────────────────────────
        const SizedBox(height: 24),
        Text(context.l10n.adminDashboardTitle,
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 15,
                fontWeight: FontWeight.w800, color: AppColors.text)),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
            child: _QuickAction(
              label: context.l10n.adminReviewsTitle,
              icon: Icons.star_outline_rounded,
              color: AppColors.amber,
              onTap: () => context.go('/admin/reviews'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _QuickAction(
              label: context.l10n.adminEidTitle,
              icon: Icons.celebration_outlined,
              color: const Color(0xFFC97B2E),
              onTap: () => context.go('/admin/eid'),
            ),
          ),
        ]),
        const SizedBox(height: 24),
      ],
    );
  }
}

// ── Orders trend chart ────────────────────────────────────────────────────────

class _OrdersTrendChart extends StatelessWidget {
  const _OrdersTrendChart({required this.trend});
  final List<Map<String, dynamic>> trend;

  @override
  Widget build(BuildContext context) {
    final bars = <BarChartGroupData>[];
    for (var i = 0; i < trend.length; i++) {
      final count = (trend[i]['count'] as num?)?.toDouble() ?? 0;
      bars.add(BarChartGroupData(
        x: i,
        barRods: [
          BarChartRodData(
            toY: count,
            color: AppColors.green,
            width: 14,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
          ),
        ],
      ));
    }
    final maxY = trend
        .map((e) => (e['count'] as num?)?.toDouble() ?? 0)
        .fold(0.0, (a, b) => a > b ? a : b);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('الطلبات — آخر ٧ أيام',
            style: TextStyle(fontFamily: 'Cairo', fontSize: 14,
                fontWeight: FontWeight.w800, color: AppColors.text)),
        const SizedBox(height: 14),
        SizedBox(
          height: 130,
          child: BarChart(
            BarChartData(
              maxY: (maxY * 1.2).clamp(5, double.infinity),
              barGroups: bars,
              gridData: FlGridData(
                show: true,
                drawVerticalLine: false,
                horizontalInterval: (maxY / 4).clamp(1, double.infinity),
                getDrawingHorizontalLine: (_) => const FlLine(
                    color: AppColors.border, strokeWidth: 0.8),
              ),
              borderData: FlBorderData(show: false),
              titlesData: FlTitlesData(
                leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 22,
                    getTitlesWidget: (val, meta) {
                      final idx = val.toInt();
                      if (idx < 0 || idx >= trend.length) {
                        return const SizedBox.shrink();
                      }
                      final label = trend[idx]['label'] as String? ?? '';
                      return Text(label,
                          style: const TextStyle(fontFamily: 'Cairo',
                              fontSize: 10, color: AppColors.muted));
                    },
                  ),
                ),
              ),
              barTouchData: BarTouchData(enabled: false),
            ),
          ),
        ),
      ]),
    );
  }
}

// ── Health bar ────────────────────────────────────────────────────────────────

class _HealthBar extends StatelessWidget {
  const _HealthBar({
    required this.label,
    required this.value,
    required this.displayValue,
    required this.color,
  });
  final String label, displayValue;
  final double value;
  final Color  color;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(children: [
        Expanded(child: Text(label,
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                color: AppColors.muted))),
        Text(displayValue,
            style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                fontWeight: FontWeight.w700, color: color)),
      ]),
      const SizedBox(height: 6),
      ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: LinearProgressIndicator(
          value: value.clamp(0.0, 1.0),
          minHeight: 8,
          backgroundColor: color.withValues(alpha: 0.12),
          valueColor: AlwaysStoppedAnimation<Color>(color),
        ),
      ),
    ],
  );
}

// ── Widgets ───────────────────────────────────────────────────────────────────

class _KpiCard extends StatelessWidget {
  const _KpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.sub,
  });
  final String label, value;
  final String? sub;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: color.withValues(alpha: 0.2)),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, size: 18, color: color),
      const SizedBox(height: 6),
      Text(value, style: TextStyle(fontFamily: 'Cairo', fontSize: 16,
          fontWeight: FontWeight.w800, color: color)),
      Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 10,
          color: AppColors.muted)),
      if (sub != null) ...[
        const SizedBox(height: 2),
        Text(sub!, style: const TextStyle(fontFamily: 'Cairo', fontSize: 9,
            color: AppColors.muted)),
      ],
    ]),
  );
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });
  final String   label;
  final IconData icon;
  final Color    color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Icon(icon, size: 22, color: color),
        const SizedBox(height: 6),
        Text(label,
            style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                fontWeight: FontWeight.w700, color: color)),
      ]),
    ),
  );
}

class _PendingCard extends StatelessWidget {
  const _PendingCard({required this.label, required this.count,
      required this.icon, required this.color, required this.onTap});
  final String label;
  final int count;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    if (count == 0) return const SizedBox.shrink();
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                shape: BoxShape.circle),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(label,
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
                  fontWeight: FontWeight.w600, color: AppColors.text))),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12)),
            child: Text('$count',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                    fontWeight: FontWeight.w800, color: color)),
          ),
          const SizedBox(width: 6),
          Icon(Icons.chevron_right, size: 16, color: color),
        ]),
      ),
    );
  }
}
