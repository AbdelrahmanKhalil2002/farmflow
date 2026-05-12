import 'package:fl_chart/fl_chart.dart';
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
import '../../../core/l10n/l10n_ext.dart';
import '../finance/finance_service.dart';
import '../finance/statements_screen.dart';

// ── Providers ─────────────────────────────────────────────────────────────────

final dashboardPeriodProvider = StateProvider<String>((ref) => 'month');

final periodFinanceSummaryProvider =
    FutureProvider.family<FinanceSummary, String>((ref, period) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(ApiEndpoints.financeSummary,
      queryParameters: {'period': period});
  return FinanceSummary.fromJson(res.data as Map<String, dynamic>);
});

final sellerOrdersProvider = FutureProvider<List<OrderModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(ApiEndpoints.orders, queryParameters: {'limit': 10});
  final data = res.data as List? ?? [];
  return data.map((e) => OrderModel.fromJson(e as Map<String, dynamic>)).toList();
});

final followUpsDueProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final res = await dio.get(ApiEndpoints.followUpsDue);
    final data = res.data as List? ?? [];
    return data.cast<Map<String, dynamic>>();
  } catch (_) {
    return [];
  }
});

final weighingDueProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final res = await dio.get(ApiEndpoints.weighingDue);
    final data = res.data as List? ?? [];
    return data.cast<Map<String, dynamic>>();
  } catch (_) {
    return [];
  }
});

// Returns {byType: {cattle:10,...}, listingsByType: {cattle:3,...}}
final herdTypeChartProvider = FutureProvider<Map<String, Map<String, int>>>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final results = await Future.wait([
      dio.get(ApiEndpoints.animalSummary),
      dio.get(ApiEndpoints.myListings, queryParameters: {'status': 'approved,pending', 'limit': 200}),
    ]);
    final summary = results[0].data as Map<String, dynamic>? ?? {};
    final byType = (summary['byType'] as Map<String, dynamic>? ?? {})
        .map((k, v) => MapEntry(k, (v as num).toInt()));
    final listings = results[1].data as List? ?? [];
    final listingsByType = <String, int>{};
    for (final l in listings) {
      final t = (l as Map<String, dynamic>)['type'] as String? ?? 'other';
      listingsByType[t] = (listingsByType[t] ?? 0) + 1;
    }
    return {'herd': byType, 'listings': listingsByType};
  } catch (_) {
    return {'herd': {}, 'listings': {}};
  }
});

final dashboardStatsProvider = FutureProvider<Map<String, int>>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final ordersRes = await dio.get(ApiEndpoints.orders, queryParameters: {'limit': 1});
    final listingsRes = await dio.get(ApiEndpoints.myListings, queryParameters: {'limit': 1, 'status': 'approved'});
    final pendingRes = await dio.get(ApiEndpoints.myListings, queryParameters: {'limit': 1, 'status': 'pending'});
    return {
      'totalOrders': (ordersRes.data as List?)?.length ?? 0,
      'activeListings': (listingsRes.data as List?)?.length ?? 0,
      'pendingListings': (pendingRes.data as List?)?.length ?? 0,
    };
  } catch (_) {
    return {'totalOrders': 0, 'activeListings': 0, 'pendingListings': 0};
  }
});

// ── Screen ────────────────────────────────────────────────────────────────────

class SellerDashboardScreen extends ConsumerWidget {
  const SellerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).valueOrNull;

    void invalidateAll() {
      ref.invalidate(financeSummaryProvider);
      ref.invalidate(periodFinanceSummaryProvider);
      ref.invalidate(currentYearStatementsProvider);
      ref.invalidate(currentYearBudgetProvider);
      ref.invalidate(recentExpensesProvider);
      ref.invalidate(recentIncomeProvider);
      ref.invalidate(sellerOrdersProvider);
      ref.invalidate(followUpsDueProvider);
      ref.invalidate(weighingDueProvider);
      ref.invalidate(dashboardStatsProvider);
      ref.invalidate(herdTypeChartProvider);
    }

    void quickAdd() {
      showModalBottomSheet(
        context: context,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (ctx) => Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 36),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(child: Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40, height: 4,
                decoration: BoxDecoration(
                    color: const Color(0xFFEEEEEE),
                    borderRadius: BorderRadius.circular(2)),
              )),
              Text(
                context.l10n.quickAddTitle,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 17,
                    fontWeight: FontWeight.w800, color: Color(0xFF111827)),
              ),
              const SizedBox(height: 16),
              Row(children: [
                Expanded(child: _QuickAddItem(
                  emoji: '💸', label: context.l10n.quickAddExpense,
                  color: AppColors.red, bg: AppColors.redBg,
                  onTap: () { Navigator.pop(ctx); showAddExpenseSheet(context, onCreated: invalidateAll); },
                )),
                const SizedBox(width: 10),
                Expanded(child: _QuickAddItem(
                  emoji: '💰', label: context.l10n.quickAddIncome,
                  color: AppColors.green, bg: AppColors.greenBg,
                  onTap: () { Navigator.pop(ctx); showAddIncomeSheet(context, onCreated: invalidateAll); },
                )),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(child: _QuickAddItem(
                  emoji: '🐄', label: context.l10n.quickAddAnimal,
                  color: const Color(0xFF8B5CF6), bg: const Color(0xFFF5F3FF),
                  onTap: () { Navigator.pop(ctx); context.push('/seller/herd/add'); },
                )),
                const SizedBox(width: 10),
                Expanded(child: _QuickAddItem(
                  emoji: '📢', label: context.l10n.quickAddListing,
                  color: const Color(0xFF3B82F6), bg: const Color(0xFFEFF6FF),
                  onTap: () { Navigator.pop(ctx); context.push('/seller/listings/add'); },
                )),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(child: _QuickAddItem(
                  emoji: '🥛', label: context.l10n.quickAddDairy,
                  color: AppColors.blue, bg: const Color(0xFFEFF6FF),
                  onTap: () { Navigator.pop(ctx); context.push('/seller/dairy'); },
                )),
                const SizedBox(width: 10),
                Expanded(child: _QuickAddItem(
                  emoji: '🌾', label: context.l10n.quickAddSupply,
                  color: AppColors.green, bg: AppColors.greenBg,
                  onTap: () { Navigator.pop(ctx); context.push('/seller/supplies'); },
                )),
              ]),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'dashboard_add',
        backgroundColor: AppColors.green,
        onPressed: quickAdd,
        icon: const Icon(Icons.add, color: Colors.white),
        label: Text(
          context.l10n.addButton,
          style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: Colors.white),
        ),
      ),
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.l10n.dashboardGreeting(user?.farmName ?? user?.name ?? ''),
              style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                  fontSize: 16, color: AppColors.white),
            ),
            Text(
              context.l10n.sellerDashboardTitle,
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: Color(0xCCFFFFFF)),
            ),
          ],
        ),
      ),
      body: RefreshIndicator(
        color: AppColors.green,
        onRefresh: () async => invalidateAll(),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
          children: const [
            _PeriodSelector(),
            SizedBox(height: 12),
            _KpiRow(),
            SizedBox(height: 12),
            _MiniStatsRow(),
            SizedBox(height: 14),
            _TrendChart(),
            SizedBox(height: 14),
            _HerdTypeChart(),
            SizedBox(height: 14),
            _QuickAccessRow(),
            SizedBox(height: 14),
            _PendingOrdersAlert(),
            _VaccinationRemindersCard(),
            _WeighingRemindersCard(),
            _FollowUpsCard(),
            SizedBox(height: 14),
            _RecentOrdersCard(),
          ],
        ),
      ),
    );
  }
}

// ── Period selector ───────────────────────────────────────────────────────────

class _PeriodSelector extends ConsumerWidget {
  const _PeriodSelector();

  static const _periods = [
    ('month',   'هذا الشهر'),
    ('quarter', 'ربع سنوي'),
    ('year',    'هذا العام'),
    ('all',     'الكل'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(dashboardPeriodProvider);
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: _periods.map((p) {
          final isSelected = selected == p.$1;
          return GestureDetector(
            onTap: () => ref.read(dashboardPeriodProvider.notifier).state = p.$1,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              margin: const EdgeInsets.only(left: 6),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.green : Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected ? AppColors.green : const Color(0xFFE5E7EB),
                ),
                boxShadow: isSelected ? [
                  const BoxShadow(color: Color(0x1A3A7D44), blurRadius: 6, offset: Offset(0, 2)),
                ] : null,
              ),
              child: Text(
                p.$2,
                style: TextStyle(
                  fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w700,
                  color: isSelected ? Colors.white : const Color(0xFF6B7280),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ── KPI row ───────────────────────────────────────────────────────────────────

class _KpiRow extends ConsumerWidget {
  const _KpiRow();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final period = ref.watch(dashboardPeriodProvider);
    final asyncSummary = ref.watch(periodFinanceSummaryProvider(period));

    return asyncSummary.when(
      loading: () => const ShimmerCard(height: 110),
      error: (_, __) => const SizedBox.shrink(),
      data: (s) {
        final fmt = NumberFormat('#,##0', 'ar');
        final profitColor = s.netProfit >= 0 ? AppColors.green : AppColors.red;
        final margin = s.totalIncome > 0
            ? (s.netProfit / s.totalIncome * 100).toStringAsFixed(1)
            : '0.0';
        return Column(
          children: [
            Row(
              children: [
                Expanded(child: _KpiCard(
                  icon: Icons.trending_up, iconColor: AppColors.green,
                  label: context.l10n.kpiRevenue,
                  value: '${fmt.format(s.totalIncome)} ج.م', bg: AppColors.greenBg,
                )),
                const SizedBox(width: 8),
                Expanded(child: _KpiCard(
                  icon: Icons.trending_down, iconColor: AppColors.red,
                  label: context.l10n.kpiExpenses,
                  value: '${fmt.format(s.totalExpenses)} ج.م', bg: AppColors.redBg,
                )),
                const SizedBox(width: 8),
                Expanded(child: _KpiCard(
                  icon: Icons.account_balance_wallet_outlined, iconColor: profitColor,
                  label: context.l10n.kpiNetProfit,
                  value: '${fmt.format(s.netProfit)} ج.م',
                  bg: s.netProfit >= 0 ? AppColors.greenBg : AppColors.redBg,
                  subtitle: 'هامش $margin%',
                )),
              ],
            ),
          ],
        );
      },
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({
    required this.icon, required this.iconColor, required this.label,
    required this.value, required this.bg, this.subtitle,
  });
  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final Color bg;
  final String? subtitle;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(12),
      boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))],
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        width: 28, height: 28,
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(icon, size: 15, color: iconColor),
      ),
      const SizedBox(height: 8),
      Text(value, style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
          fontWeight: FontWeight.w800, color: iconColor)),
      Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 10, color: Color(0xFF6B7280))),
      if (subtitle != null)
        Text(subtitle!, style: const TextStyle(fontFamily: 'Cairo', fontSize: 9,
            color: Color(0xFF9CA3AF), fontWeight: FontWeight.w600)),
    ]),
  );
}

// ── Mini stats row ────────────────────────────────────────────────────────────

class _MiniStatsRow extends ConsumerWidget {
  const _MiniStatsRow();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncOrders = ref.watch(sellerOrdersProvider);
    return asyncOrders.when(
      loading: () => const ShimmerCard(height: 60),
      error: (_, __) => const SizedBox.shrink(),
      data: (orders) {
        final pending = orders.where((o) => o.status == 'pending').length;
        final active  = orders.where((o) => o.status == 'confirmed').length;
        return Row(children: [
          Expanded(child: _StatChip(label: 'إجمالي الطلبات', value: orders.length.toString(),
              color: AppColors.blue)),
          const SizedBox(width: 8),
          Expanded(child: _StatChip(label: 'قيد التأكيد', value: pending.toString(),
              color: AppColors.amber)),
          const SizedBox(width: 8),
          Expanded(child: _StatChip(label: 'مؤكدة', value: active.toString(),
              color: AppColors.green)),
        ]);
      },
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: color.withValues(alpha: 0.2)),
    ),
    child: Column(children: [
      Text(value, style: TextStyle(fontFamily: 'Cairo', fontSize: 18,
          fontWeight: FontWeight.w800, color: color)),
      Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 10,
          color: Color(0xFF6B7280)), textAlign: TextAlign.center),
    ]),
  );
}

// ── Trend chart ───────────────────────────────────────────────────────────────

class _TrendChart extends ConsumerWidget {
  const _TrendChart();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncSummary = ref.watch(financeSummaryProvider);

    return asyncSummary.when(
      loading: () => const ShimmerCard(height: 200),
      error: (_, __) => const SizedBox.shrink(),
      data: (s) {
        if (s.monthly.isEmpty) return const SizedBox.shrink();
        final months = s.monthly.take(6).toList();
        final maxVal = months.fold<double>(0, (m, p) =>
            [m, p.income, p.expenses].reduce((a, b) => a > b ? a : b));
        if (maxVal == 0) return const SizedBox.shrink();

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(12),
            boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))],
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Icon(Icons.bar_chart_rounded, size: 16, color: AppColors.green),
              const SizedBox(width: 6),
              const Text('الإيرادات والمصروفات', style: TextStyle(fontFamily: 'Cairo',
                  fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF111827))),
              const Spacer(),
              // Legend
              Row(children: [
                Container(width: 10, height: 10, decoration: BoxDecoration(
                    color: AppColors.green, borderRadius: BorderRadius.circular(2))),
                const SizedBox(width: 4),
                const Text('إيرادات', style: TextStyle(fontFamily: 'Cairo', fontSize: 10, color: Color(0xFF6B7280))),
                const SizedBox(width: 10),
                Container(width: 10, height: 10, decoration: BoxDecoration(
                    color: AppColors.red, borderRadius: BorderRadius.circular(2))),
                const SizedBox(width: 4),
                const Text('مصروفات', style: TextStyle(fontFamily: 'Cairo', fontSize: 10, color: Color(0xFF6B7280))),
              ]),
            ]),
            const SizedBox(height: 16),
            SizedBox(
              height: 160,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: maxVal * 1.2,
                  barTouchData: BarTouchData(
                    touchTooltipData: BarTouchTooltipData(
                      getTooltipItem: (group, groupIndex, rod, rodIndex) {
                        final month = months[groupIndex].label;
                        final label = rodIndex == 0 ? 'إيرادات' : 'مصروفات';
                        final fmt = NumberFormat('#,##0', 'ar');
                        return BarTooltipItem(
                          '$month\n$label: ${fmt.format(rod.toY)} ج.م',
                          const TextStyle(fontFamily: 'Cairo', fontSize: 10, color: Colors.white),
                        );
                      },
                    ),
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final idx = value.toInt();
                          if (idx < 0 || idx >= months.length) return const SizedBox.shrink();
                          return Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(months[idx].label,
                                style: const TextStyle(fontFamily: 'Cairo', fontSize: 9,
                                    color: Color(0xFF9CA3AF))),
                          );
                        },
                        reservedSize: 22,
                      ),
                    ),
                    leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    getDrawingHorizontalLine: (_) => const FlLine(
                        color: Color(0xFFEEEEEE), strokeWidth: 1),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: List.generate(months.length, (i) {
                    final m = months[i];
                    return BarChartGroupData(x: i, barRods: [
                      BarChartRodData(toY: m.income, color: AppColors.green,
                          width: 10, borderRadius: BorderRadius.circular(3)),
                      BarChartRodData(toY: m.expenses, color: AppColors.red.withValues(alpha: 0.7),
                          width: 10, borderRadius: BorderRadius.circular(3)),
                    ], barsSpace: 3);
                  }),
                ),
              ),
            ),
          ]),
        );
      },
    );
  }
}

// ── Pending orders alert ──────────────────────────────────────────────────────

class _PendingOrdersAlert extends ConsumerWidget {
  const _PendingOrdersAlert();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncOrders = ref.watch(sellerOrdersProvider);
    return asyncOrders.maybeWhen(
      data: (orders) {
        final pending = orders.where((o) => o.status == 'pending').toList();
        if (pending.isEmpty) return const SizedBox.shrink();
        return GestureDetector(
          onTap: () => context.push('/seller/orders'),
          child: Container(
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFF59E0B)),
            ),
            child: Row(children: [
              const Icon(Icons.access_time_rounded, size: 18, color: Color(0xFFF59E0B)),
              const SizedBox(width: 10),
              Expanded(child: Text(
                'لديك ${pending.length} طلب ${pending.length == 1 ? "ينتظر" : "تنتظر"} تأكيدك',
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
                    fontWeight: FontWeight.w700, color: Color(0xFF92400E)),
              )),
              const Icon(Icons.chevron_right, size: 16, color: Color(0xFF92400E)),
            ]),
          ),
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }
}

// ── Herd vs listings grouped bar chart ───────────────────────────────────────

const _kTypeEmoji = {
  'cattle': '🐄', 'buffalo': '🐃', 'sheep': '🐑', 'goat': '🐐',
  'camel': '🐪', 'horse': '🐎', 'poultry': '🐔', 'rabbit': '🐇', 'other': '🐾',
};

class _HerdTypeChart extends ConsumerWidget {
  const _HerdTypeChart();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncData = ref.watch(herdTypeChartProvider);
    return asyncData.when(
      loading: () => const ShimmerCard(height: 180),
      error: (_, __) => const SizedBox.shrink(),
      data: (data) {
        final herd     = data['herd']     ?? {};
        final listings = data['listings'] ?? {};
        // union of types from both maps, sorted by herd count descending
        final types = {...herd.keys, ...listings.keys}.toList()
          ..sort((a, b) => (herd[b] ?? 0).compareTo(herd[a] ?? 0));
        if (types.isEmpty) return const SizedBox.shrink();

        final maxVal = types.fold<int>(
          1, (m, t) => [m, herd[t] ?? 0, listings[t] ?? 0].reduce((a, b) => a > b ? a : b),
        );

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))],
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Header + legend
            Row(children: [
              const Icon(Icons.pets, size: 16, color: AppColors.green),
              const SizedBox(width: 6),
              const Expanded(
                child: Text('القطيع مقابل المعروض للبيع',
                    style: TextStyle(fontFamily: 'Cairo', fontSize: 14,
                        fontWeight: FontWeight.w700, color: Color(0xFF111827))),
              ),
              _LegendDot(color: AppColors.green, label: 'القطيع'),
              const SizedBox(width: 10),
              _LegendDot(color: const Color(0xFFD97706), label: 'معروض'),
            ]),
            const SizedBox(height: 16),
            SizedBox(
              height: 140,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: maxVal.toDouble() * 1.25,
                  barTouchData: BarTouchData(
                    touchTooltipData: BarTouchTooltipData(
                      getTooltipItem: (group, groupIdx, rod, rodIdx) {
                        final type = types[groupIdx];
                        final emoji = _kTypeEmoji[type] ?? '🐾';
                        final lbl = rodIdx == 0 ? 'قطيع' : 'معروض';
                        return BarTooltipItem(
                          '$emoji $lbl: ${rod.toY.toInt()}',
                          const TextStyle(fontFamily: 'Cairo', color: Colors.white,
                              fontSize: 11, fontWeight: FontWeight.w700),
                        );
                      },
                    ),
                  ),
                  titlesData: FlTitlesData(
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (val, _) {
                          final idx = val.toInt();
                          if (idx < 0 || idx >= types.length) return const SizedBox.shrink();
                          return Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                              _kTypeEmoji[types[idx]] ?? '🐾',
                              style: const TextStyle(fontSize: 14),
                            ),
                          );
                        },
                        reservedSize: 28,
                      ),
                    ),
                    leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles:  const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    getDrawingHorizontalLine: (_) => FlLine(
                      color: const Color(0xFFE5E7EB),
                      strokeWidth: 0.5,
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: List.generate(types.length, (i) {
                    final t = types[i];
                    return BarChartGroupData(
                      x: i,
                      barRods: [
                        BarChartRodData(
                          toY: (herd[t] ?? 0).toDouble(),
                          color: AppColors.green,
                          width: 10,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                        ),
                        BarChartRodData(
                          toY: (listings[t] ?? 0).toDouble(),
                          color: const Color(0xFFD97706),
                          width: 10,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                        ),
                      ],
                      barsSpace: 3,
                    );
                  }),
                ),
              ),
            ),
          ]),
        );
      },
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) => Row(children: [
    Container(width: 10, height: 10,
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
    const SizedBox(width: 4),
    Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 10, color: Color(0xFF6B7280))),
  ]);
}

// ── Quick-access row ──────────────────────────────────────────────────────────

class _QuickAccessRow extends StatelessWidget {
  const _QuickAccessRow();

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(child: _QuickCard(emoji: '🥛', label: context.l10n.quickAccessDairy,
          color: AppColors.blue, onTap: () => context.push('/seller/dairy'))),
      const SizedBox(width: 8),
      Expanded(child: _QuickCard(emoji: '🌾', label: context.l10n.quickAccessSupplies,
          color: AppColors.green, onTap: () => context.push('/seller/supplies'))),
      const SizedBox(width: 8),
      Expanded(child: _QuickCard(emoji: '🏥', label: context.l10n.quickAccessVet,
          color: AppColors.rose, onTap: () => context.push('/seller/vet-records'))),
    ],
  );
}

// ── Vaccination reminders ─────────────────────────────────────────────────────

class _VaccinationRemindersCard extends ConsumerWidget {
  const _VaccinationRemindersCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncVax = ref.watch(weighingDueProvider);
    return asyncVax.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (animals) {
        if (animals.isEmpty) return const SizedBox.shrink();
        return Container(
          margin: const EdgeInsets.only(bottom: 14),
          decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(12),
            boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))],
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
              child: Row(children: [
                const Icon(Icons.monitor_weight_outlined, size: 16, color: Color(0xFF6366F1)),
                const SizedBox(width: 6),
                Text('وزن مستحق (${animals.length})',
                    style: const TextStyle(fontFamily: 'Cairo', fontSize: 14,
                        fontWeight: FontWeight.w700, color: Color(0xFF6366F1))),
                const Spacer(),
                GestureDetector(
                  onTap: () => context.push('/seller/herd'),
                  child: const Text('عرض الكل', style: TextStyle(fontFamily: 'Cairo',
                      fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.green)),
                ),
              ]),
            ),
            const Divider(height: 1),
            ...animals.take(3).map((a) {
              final name = a['breed'] as String? ?? a['tagId'] as String? ?? 'حيوان';
              final target = (a['targetWeight'] as num?)?.toDouble();
              final current = (a['lastWeight'] as num?)?.toDouble();
              final pct = (target != null && target > 0 && current != null)
                  ? (current / target).clamp(0.0, 1.0)
                  : null;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    const Icon(Icons.pets, size: 13, color: Color(0xFF6366F1)),
                    const SizedBox(width: 6),
                    Expanded(child: Text(name, style: const TextStyle(fontFamily: 'Cairo',
                        fontSize: 13, color: AppColors.text))),
                    if (current != null)
                      Text('${current.toStringAsFixed(0)} كجم',
                          style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                              fontWeight: FontWeight.w700, color: Color(0xFF6366F1))),
                  ]),
                  if (pct != null) ...[
                    const SizedBox(height: 4),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: pct, minHeight: 5,
                        backgroundColor: const Color(0xFFE0E7FF),
                        valueColor: const AlwaysStoppedAnimation(Color(0xFF6366F1)),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text('${(pct * 100).toStringAsFixed(0)}% من الهدف ${target!.toStringAsFixed(0)} كجم',
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 10, color: Color(0xFF9CA3AF))),
                  ],
                ]),
              );
            }),
          ]),
        );
      },
    );
  }
}

// ── Weighing / follow-ups card ────────────────────────────────────────────────

class _WeighingRemindersCard extends StatelessWidget {
  const _WeighingRemindersCard();

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}

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
          margin: const EdgeInsets.only(bottom: 14),
          decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(12),
            boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))],
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
              child: Row(children: [
                const Icon(Icons.medical_services_outlined, size: 16, color: AppColors.rose),
                const SizedBox(width: 6),
                Text(
                  context.l10n.medicalFollowUps(followUps.length),
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 14,
                      fontWeight: FontWeight.w700, color: AppColors.rose),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () => context.push('/seller/vet-records'),
                  child: Text(context.l10n.viewAll,
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                          fontWeight: FontWeight.w700, color: AppColors.green)),
                ),
              ]),
            ),
            const Divider(height: 1),
            ...followUps.take(3).map((f) {
              final name = f['breed'] as String? ?? f['tagId'] as String? ?? context.l10n.animalType;
              final dateStr = f['followUpDate'] as String? ?? '';
              final date = DateTime.tryParse(dateStr);
              final formatted = date != null ? DateFormat('d MMM', 'ar').format(date) : '';
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                child: Row(children: [
                  const Icon(Icons.pets, size: 14, color: AppColors.rose),
                  const SizedBox(width: 8),
                  Expanded(child: Text(name, style: const TextStyle(fontFamily: 'Cairo',
                      fontSize: 13, color: AppColors.text))),
                  if (formatted.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.rose.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(formatted, style: const TextStyle(fontFamily: 'Cairo',
                          fontSize: 11, color: AppColors.rose, fontWeight: FontWeight.w700)),
                    ),
                ]),
              );
            }),
          ]),
        );
      },
    );
  }
}

// ── Recent orders card ────────────────────────────────────────────────────────

class _RecentOrdersCard extends ConsumerWidget {
  const _RecentOrdersCard();

  static const _statusColor = {
    'pending':   Color(0xFFF59E0B), 'confirmed': Color(0xFF3B82F6),
    'completed': Color(0xFF22C55E), 'cancelled': Color(0xFFEF4444),
  };
  static const _statusAr = {
    'pending': 'قيد الانتظار', 'confirmed': 'مؤكد',
    'completed': 'مكتمل', 'cancelled': 'ملغي',
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncOrders = ref.watch(sellerOrdersProvider);

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(context.l10n.recentOrders,
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 15,
                fontWeight: FontWeight.w800, color: Color(0xFF111827))),
        GestureDetector(
          onTap: () => context.push('/seller/orders'),
          child: Text(context.l10n.viewAll,
              style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                  color: AppColors.green, fontWeight: FontWeight.w700)),
        ),
      ]),
      const SizedBox(height: 10),
      asyncOrders.when(
        loading: () => const ShimmerList(count: 3, cardHeight: 72),
        error: (_, __) => const SizedBox.shrink(),
        data: (orders) {
          if (orders.isEmpty) {
            return Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
                  boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))]),
              child: Center(child: Text(context.l10n.noOrdersYet,
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: Color(0xFF6B7280)))),
            );
          }
          final fmt = NumberFormat('#,##0', 'ar');
          final dateFmt = DateFormat('d MMM', 'ar');
          final shown = orders.take(5).toList();
          return Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
                boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))]),
            child: Column(
              children: List.generate(shown.length, (i) {
                final order = shown[i];
                final color = _statusColor[order.status] ?? AppColors.muted;
                final statusAr = _statusAr[order.status] ?? order.status;
                final listing = order.listing;
                final isLast = i == shown.length - 1;
                return Column(children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                    child: Row(children: [
                      Container(
                        width: 38, height: 38,
                        decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
                        child: Icon(Icons.receipt_long_outlined, size: 17, color: color),
                      ),
                      const SizedBox(width: 10),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(listing?.breed ?? listing?.typeAr ?? 'طلب',
                            style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
                                fontWeight: FontWeight.w700, color: Color(0xFF111827))),
                        Text(dateFmt.format(order.createdAt),
                            style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: Color(0xFF6B7280))),
                      ])),
                      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text('${fmt.format(order.totalAmount)} ج.م',
                            style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
                                fontWeight: FontWeight.w800, color: AppColors.green)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: color.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6)),
                          child: Text(statusAr, style: TextStyle(fontFamily: 'Cairo', fontSize: 10,
                              fontWeight: FontWeight.w700, color: color)),
                        ),
                      ]),
                    ]),
                  ),
                  if (!isLast) const Divider(height: 1, thickness: 1, indent: 62, color: Color(0xFFEEEEEE)),
                ]);
              }),
            ),
          );
        },
      ),
    ]);
  }
}

// ── Quick-add item ────────────────────────────────────────────────────────────

class _QuickAddItem extends StatelessWidget {
  const _QuickAddItem({required this.emoji, required this.label,
      required this.color, required this.bg, required this.onTap});
  final String emoji;
  final String label;
  final Color color;
  final Color bg;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.2))),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(emoji, style: const TextStyle(fontSize: 26)),
        const SizedBox(height: 6),
        Text(label, style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
            fontWeight: FontWeight.w700, color: color)),
      ]),
    ),
  );
}

class _QuickCard extends StatelessWidget {
  const _QuickCard({required this.emoji, required this.label,
      required this.color, required this.onTap});
  final String emoji;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
          boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))]),
      child: Row(children: [
        Container(
          width: 34, height: 34,
          decoration: BoxDecoration(color: color.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(8)),
          child: Center(child: Text(emoji, style: const TextStyle(fontSize: 18))),
        ),
        const SizedBox(width: 10),
        Expanded(child: Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
            fontWeight: FontWeight.w700, color: Color(0xFF111827)))),
        Icon(Icons.chevron_right, size: 16, color: color),
      ]),
    ),
  );
}
