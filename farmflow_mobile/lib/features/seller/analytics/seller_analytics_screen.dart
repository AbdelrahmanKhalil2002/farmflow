import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';

// ── Arabic month abbreviations (index 1-12) ────────────────────────────────────
const List<String> _kMonthsAr = [
  '',
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

// ── Expense category labels ────────────────────────────────────────────────────
const Map<String, String> _kCatAr = {
  'feed':         'علف',
  'doctor':       'بيطري',
  'transport':    'نقل',
  'electricity':  'كهرباء',
  'salary':       'رواتب',
  'rent':         'إيجار',
  'water':        'مياه',
  'maintenance':  'صيانة',
  'other':        'أخرى',
};

// ── Expense category icons ─────────────────────────────────────────────────────
const Map<String, IconData> _kCatIcons = {
  'feed':         Icons.grass_outlined,
  'doctor':       Icons.medical_services_outlined,
  'transport':    Icons.local_shipping_outlined,
  'electricity':  Icons.bolt_outlined,
  'salary':       Icons.people_outline,
  'rent':         Icons.home_outlined,
  'water':        Icons.water_drop_outlined,
  'maintenance':  Icons.build_outlined,
  'other':        Icons.more_horiz,
};

// ── Expense category colors ────────────────────────────────────────────────────
const Map<String, Color> _kCatColors = {
  'feed':         Color(0xFF22C55E),
  'doctor':       Color(0xFFEF4444),
  'transport':    Color(0xFF3B82F6),
  'electricity':  Color(0xFFF59E0B),
  'salary':       Color(0xFF8B5CF6),
  'rent':         Color(0xFF06B6D4),
  'water':        Color(0xFF0EA5E9),
  'maintenance':  Color(0xFF6B7280),
  'other':        Color(0xFFD97706),
};

// ── Animal type helpers ────────────────────────────────────────────────────────
const Map<String, String> _kAnimalTypeAr = {
  'cattle':  'أبقار',
  'sheep':   'أغنام',
  'goat':    'ماعز',
  'camel':   'إبل',
  'horse':   'خيول',
  'chicken': 'دواجن',
  'rabbit':  'أرانب',
  'other':   'أخرى',
};

const Map<String, String> _kAnimalEmoji = {
  'cattle':  '🐄',
  'sheep':   '🐑',
  'goat':    '🐐',
  'camel':   '🐪',
  'horse':   '🐴',
  'chicken': '🐔',
  'rabbit':  '🐇',
  'other':   '🐾',
};

// ── Order status colors ────────────────────────────────────────────────────────
const _kPendingColor   = Color(0xFFF59E0B);
const _kConfirmedColor = Color(0xFF3B82F6);
const _kCompletedColor = Color(0xFF22C55E);
const _kCancelledColor = Color(0xFFEF4444);

// ── Design tokens ─────────────────────────────────────────────────────────────
const _kCardRadius   = 16.0;
const _kCardPadding  = EdgeInsets.all(20.0);
const _kSectionGap   = SizedBox(height: 16);
const _kCardShadow   = [
  BoxShadow(
    color:  Color(0x0F000000),
    blurRadius: 8,
    offset: Offset(0, 2),
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// Data models
// ─────────────────────────────────────────────────────────────────────────────

class _MonthlyEntry {
  const _MonthlyEntry({
    required this.month,
    required this.income,
    required this.expenses,
  });
  final String month;   // "2025-01"
  final double income;
  final double expenses;
}

class _AnalyticsData {
  const _AnalyticsData({
    required this.monthly,
    required this.incomeByType,
    required this.expenseByCategory,
    required this.orderStats,
    required this.topAnimalTypes,
  });

  final List<_MonthlyEntry>         monthly;
  final Map<String, double>         incomeByType;
  final Map<String, double>         expenseByCategory;
  final Map<String, int>            orderStats;
  final List<Map<String, dynamic>>  topAnimalTypes;

  double get totalIncome   => monthly.fold(0, (s, e) => s + e.income);
  double get totalExpenses => monthly.fold(0, (s, e) => s + e.expenses);
  double get netProfit     => totalIncome - totalExpenses;
}

// ─────────────────────────────────────────────────────────────────────────────
// Riverpod provider
// ─────────────────────────────────────────────────────────────────────────────

final analyticsProvider =
    FutureProvider.family<_AnalyticsData, int>((ref, months) async {
  final dio = ref.read(dioProvider);
  final res = await dio.get(
    ApiEndpoints.financeAnalytics,
    queryParameters: {'months': months},
  );

  final body = res.data as Map<String, dynamic>;

  // monthly
  final rawMonthly = (body['monthly'] as List?) ?? [];
  final monthly = rawMonthly.map((m) {
    return _MonthlyEntry(
      month:    m['month'] as String,
      income:   (m['income']   as num).toDouble(),
      expenses: (m['expenses'] as num).toDouble(),
    );
  }).toList();

  // incomeByType
  final rawIncome = (body['incomeByType'] as Map?) ?? {};
  final incomeByType = rawIncome.map<String, double>(
    (k, v) => MapEntry(k as String, (v as num).toDouble()),
  );

  // expenseByCategory
  final rawExp = (body['expenseByCategory'] as Map?) ?? {};
  final expenseByCategory = rawExp.map<String, double>(
    (k, v) => MapEntry(k as String, (v as num).toDouble()),
  );

  // orderStats
  final rawStats = (body['orderStats'] as Map?) ?? {};
  final orderStats = rawStats.map<String, int>(
    (k, v) => MapEntry(k as String, (v as num).toInt()),
  );

  // topAnimalTypes
  final rawTop = (body['topAnimalTypes'] as List?) ?? [];
  final topAnimalTypes = rawTop
      .map((t) => Map<String, dynamic>.from(t as Map))
      .toList();

  return _AnalyticsData(
    monthly:           monthly,
    incomeByType:      incomeByType,
    expenseByCategory: expenseByCategory,
    orderStats:        orderStats,
    topAnimalTypes:    topAnimalTypes,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

class SellerAnalyticsScreen extends ConsumerStatefulWidget {
  const SellerAnalyticsScreen({super.key});

  @override
  ConsumerState<SellerAnalyticsScreen> createState() =>
      _SellerAnalyticsScreenState();
}

class _SellerAnalyticsScreenState
    extends ConsumerState<SellerAnalyticsScreen> {
  int _selectedMonths = 6;
  int? _touchedBarIndex;   // for bar chart tap
  int? _touchedPieIndex;   // for pie chart tap

  static const List<int> _periodOptions = [3, 6, 12];
  static const Map<int, String> _periodLabels = {
    3:  '٣ أشهر',
    6:  '٦ أشهر',
    12: '١٢ شهراً',
  };

  // ── helpers ────────────────────────────────────────────────────────────────

  /// e.g. "2025-01" → "يناير"
  String _monthAbbr(String iso) {
    final parts = iso.split('-');
    if (parts.length < 2) return iso;
    final m = int.tryParse(parts[1]) ?? 0;
    if (m < 1 || m > 12) return iso;
    return _kMonthsAr[m];
  }

  String _fmt(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}م';
    if (v >= 1000)    return '${(v / 1000).toStringAsFixed(1)}ك';
    return v.toStringAsFixed(0);
  }

  String _fmtFull(double v) =>
      v.toStringAsFixed(0).replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+$)'),
        (m) => '${m[1]},',
      );

  // ── build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final analyticsAsync = ref.watch(analyticsProvider(_selectedMonths));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.bg,
        appBar: _buildAppBar(),
        body: analyticsAsync.when(
          loading: _buildLoading,
          error:   _buildError,
          data:    _buildContent,
        ),
      ),
    );
  }

  AppBar _buildAppBar() {
    return AppBar(
      backgroundColor: AppColors.white,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      title: const Text(
        'التحليلات المالية',
        style: TextStyle(
          fontFamily: 'Cairo',
          fontWeight: FontWeight.w700,
          fontSize: 18,
          color: AppColors.text,
        ),
      ),
      centerTitle: true,
      iconTheme: const IconThemeData(color: AppColors.text),
    );
  }

  // ── loading ────────────────────────────────────────────────────────────────

  Widget _buildLoading() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildPeriodSelector(),
        const SizedBox(height: 16),
        const ShimmerCard(height: 110),
        const ShimmerCard(height: 260),
        const ShimmerCard(height: 200),
        const ShimmerCard(height: 220),
        const ShimmerCard(height: 180),
      ],
    );
  }

  // ── error ──────────────────────────────────────────────────────────────────

  Widget _buildError(Object error, StackTrace _) {
    return EmptyState(
      icon: Icons.error_outline,
      title: 'تعذّر تحميل التحليلات',
      subtitle: 'تحقق من الاتصال وحاول مجدداً',
      actionLabel: 'إعادة المحاولة',
      action: () => ref.invalidate(analyticsProvider(_selectedMonths)),
    );
  }

  // ── content ────────────────────────────────────────────────────────────────

  Widget _buildContent(_AnalyticsData data) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        _buildPeriodSelector(),
        _kSectionGap,
        _buildKpiStrip(data),
        _kSectionGap,
        _buildBarChartCard(data),
        _kSectionGap,
        _buildExpenseBreakdownCard(data),
        _kSectionGap,
        _buildOrderDonutCard(data),
        _kSectionGap,
        _buildTopAnimalTypesCard(data),
      ],
    );
  }

  // ── period selector ────────────────────────────────────────────────────────

  Widget _buildPeriodSelector() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.start,
      children: _periodOptions.map((m) {
        final selected = m == _selectedMonths;
        return Padding(
          padding: const EdgeInsets.only(left: 8),
          child: GestureDetector(
            onTap: () {
              if (!selected) {
                setState(() {
                  _selectedMonths = m;
                  _touchedBarIndex = null;
                  _touchedPieIndex = null;
                });
              }
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color:        selected ? AppColors.green : AppColors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: selected ? AppColors.green : AppColors.border,
                ),
                boxShadow: selected ? _kCardShadow : null,
              ),
              child: Text(
                _periodLabels[m]!,
                style: TextStyle(
                  fontFamily:  'Cairo',
                  fontWeight:  FontWeight.w600,
                  fontSize:    13,
                  color:       selected ? AppColors.white : AppColors.muted,
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  // ── KPI strip ──────────────────────────────────────────────────────────────

  Widget _buildKpiStrip(_AnalyticsData data) {
    final net = data.netProfit;
    return Row(
      children: [
        _KpiTile(
          label: 'إجمالي الدخل',
          value: _fmtFull(data.totalIncome),
          unit:  'ج.م',
          color: AppColors.green,
          bgColor: AppColors.greenBg,
          icon:  Icons.trending_up,
        ),
        const SizedBox(width: 8),
        _KpiTile(
          label: 'إجمالي المصروفات',
          value: _fmtFull(data.totalExpenses),
          unit:  'ج.م',
          color: AppColors.red,
          bgColor: AppColors.redBg,
          icon:  Icons.trending_down,
        ),
        const SizedBox(width: 8),
        _KpiTile(
          label: 'صافي الربح',
          value: _fmtFull(net.abs()),
          unit:  'ج.م',
          color:   net >= 0 ? AppColors.blue : AppColors.red,
          bgColor: net >= 0 ? AppColors.blueBg : AppColors.redBg,
          icon:  net >= 0 ? Icons.account_balance_wallet : Icons.warning_amber,
        ),
      ],
    );
  }

  // ── grouped bar chart ──────────────────────────────────────────────────────

  Widget _buildBarChartCard(_AnalyticsData data) {
    return _ChartCard(
      title: 'الدخل مقابل المصروفات الشهرية',
      child: data.monthly.isEmpty
          ? const _EmptyChart()
          : Column(
              children: [
                _buildBarChartLegend(),
                const SizedBox(height: 12),
                SizedBox(
                  height: 220,
                  child: _buildBarChart(data.monthly),
                ),
              ],
            ),
    );
  }

  Widget _buildBarChartLegend() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _LegendDot(color: AppColors.green, label: 'دخل'),
        const SizedBox(width: 20),
        _LegendDot(color: AppColors.amber, label: 'مصروفات'),
      ],
    );
  }

  Widget _buildBarChart(List<_MonthlyEntry> monthly) {
    // Find max for y-axis scaling
    double maxY = 0;
    for (final e in monthly) {
      if (e.income   > maxY) maxY = e.income;
      if (e.expenses > maxY) maxY = e.expenses;
    }
    maxY = maxY == 0 ? 1000 : (maxY * 1.2);

    final groups = monthly.asMap().entries.map((entry) {
      final i = entry.key;
      final e = entry.value;
      final touched = _touchedBarIndex == i;
      return BarChartGroupData(
        x: i,
        groupVertically: false,
        barRods: [
          BarChartRodData(
            toY:      e.income,
            color:    AppColors.green,
            width:    touched ? 12 : 9,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
            backDrawRodData: BackgroundBarChartRodData(
              show:  true,
              toY:   maxY,
              color: AppColors.grey100,
            ),
          ),
          BarChartRodData(
            toY:    e.expenses,
            color:  AppColors.amber,
            width:  touched ? 12 : 9,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
            backDrawRodData: BackgroundBarChartRodData(
              show:  true,
              toY:   maxY,
              color: AppColors.grey100,
            ),
          ),
        ],
        barsSpace: 4,
      );
    }).toList();

    return BarChart(
      BarChartData(
        maxY: maxY,
        barGroups: groups,
        titlesData: FlTitlesData(
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles:   true,
              reservedSize: 30,
              getTitlesWidget: (value, meta) {
                final idx = value.toInt();
                if (idx < 0 || idx >= monthly.length) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    _monthAbbr(monthly[idx].month),
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize:   10,
                      color:      AppColors.muted,
                    ),
                  ),
                );
              },
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles:   true,
              reservedSize: 48,
              getTitlesWidget: (value, meta) {
                if (value == meta.min || value == meta.max) {
                  return const SizedBox.shrink();
                }
                return Text(
                  _fmt(value),
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize:   10,
                    color:      AppColors.muted,
                  ),
                );
              },
            ),
          ),
          topTitles:   const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        gridData: FlGridData(
          show:                true,
          drawVerticalLine:    false,
          horizontalInterval:  maxY / 4,
          getDrawingHorizontalLine: (_) => FlLine(
            color: AppColors.border,
            strokeWidth: 1,
            dashArray: [4, 4],
          ),
        ),
        borderData: FlBorderData(show: false),
        barTouchData: BarTouchData(
          touchTooltipData: BarTouchTooltipData(
            getTooltipColor: (_) => AppColors.grey800.withValues(alpha: 0.85),
            tooltipPadding: const EdgeInsets.symmetric(
              horizontal: 10, vertical: 6,
            ),
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              final label  = rodIndex == 0 ? 'دخل' : 'مصروفات';
              final amount = _fmtFull(rod.toY);
              return BarTooltipItem(
                '$label\n$amount ج.م',
                const TextStyle(
                  fontFamily:  'Cairo',
                  color:       AppColors.white,
                  fontSize:    12,
                  fontWeight:  FontWeight.w600,
                  height:      1.5,
                ),
              );
            },
          ),
          touchCallback: (event, response) {
            setState(() {
              if (response == null ||
                  response.spot == null ||
                  event is FlTapUpEvent) {
                _touchedBarIndex = null;
              } else {
                _touchedBarIndex = response.spot!.touchedBarGroupIndex;
              }
            });
          },
        ),
      ),
    );
  }

  // ── expense breakdown ──────────────────────────────────────────────────────

  Widget _buildExpenseBreakdownCard(_AnalyticsData data) {
    final expenses = data.expenseByCategory;
    if (expenses.isEmpty) {
      return _ChartCard(
        title: 'توزيع المصروفات',
        child: const _EmptyChart(),
      );
    }

    final total = expenses.values.fold<double>(0, (s, v) => s + v);
    final sorted = expenses.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return _ChartCard(
      title: 'توزيع المصروفات',
      child: Column(
        children: sorted.map((entry) {
          final pct     = total > 0 ? (entry.value / total) * 100 : 0.0;
          final color   = _kCatColors[entry.key] ?? AppColors.muted;
          final icon    = _kCatIcons[entry.key]  ?? Icons.more_horiz;
          final label   = _kCatAr[entry.key]     ?? entry.key;
          return _ExpenseRow(
            icon:    icon,
            color:   color,
            label:   label,
            amount:  _fmtFull(entry.value),
            percent: pct.toDouble(),
          );
        }).toList(),
      ),
    );
  }

  // ── order donut chart ──────────────────────────────────────────────────────

  Widget _buildOrderDonutCard(_AnalyticsData data) {
    final stats    = data.orderStats;
    final pending   = stats['pending']   ?? 0;
    final confirmed = stats['confirmed'] ?? 0;
    final completed = stats['completed'] ?? 0;
    final cancelled = stats['cancelled'] ?? 0;
    final total     = pending + confirmed + completed + cancelled;

    return _ChartCard(
      title: 'حالة الطلبات',
      child: total == 0
          ? const _EmptyChart()
          : Row(
              children: [
                Expanded(
                  flex: 5,
                  child: SizedBox(
                    height: 180,
                    child: _buildPieChart(
                      pending:   pending,
                      confirmed: confirmed,
                      completed: completed,
                      cancelled: cancelled,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  flex: 5,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _PieLegendRow(
                        color: _kPendingColor,
                        label: 'قيد الانتظار',
                        count: pending,
                        total: total,
                      ),
                      const SizedBox(height: 10),
                      _PieLegendRow(
                        color: _kConfirmedColor,
                        label: 'مؤكّد',
                        count: confirmed,
                        total: total,
                      ),
                      const SizedBox(height: 10),
                      _PieLegendRow(
                        color: _kCompletedColor,
                        label: 'مكتمل',
                        count: completed,
                        total: total,
                      ),
                      const SizedBox(height: 10),
                      _PieLegendRow(
                        color: _kCancelledColor,
                        label: 'ملغي',
                        count: cancelled,
                        total: total,
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildPieChart({
    required int pending,
    required int confirmed,
    required int completed,
    required int cancelled,
  }) {
    final sections = <PieChartSectionData>[
      _pieSection(pending.toDouble(),   _kPendingColor,   0, 'قيد الانتظار'),
      _pieSection(confirmed.toDouble(), _kConfirmedColor, 1, 'مؤكّد'),
      _pieSection(completed.toDouble(), _kCompletedColor, 2, 'مكتمل'),
      _pieSection(cancelled.toDouble(), _kCancelledColor, 3, 'ملغي'),
    ].where((s) => s.value > 0).toList();

    return PieChart(
      PieChartData(
        sections:          sections,
        centerSpaceRadius: 44,
        sectionsSpace:     3,
        pieTouchData: PieTouchData(
          touchCallback: (event, response) {
            setState(() {
              if (response == null ||
                  response.touchedSection == null ||
                  event is FlTapUpEvent) {
                _touchedPieIndex = null;
              } else {
                _touchedPieIndex =
                    response.touchedSection!.touchedSectionIndex;
              }
            });
          },
        ),
      ),
    );
  }

  PieChartSectionData _pieSection(
    double value,
    Color color,
    int index,
    String label,
  ) {
    final touched = _touchedPieIndex == index;
    return PieChartSectionData(
      value:         value,
      color:         color,
      radius:        touched ? 58 : 50,
      title:         value > 0 ? value.toInt().toString() : '',
      titleStyle: const TextStyle(
        fontFamily:  'Cairo',
        fontSize:    13,
        fontWeight:  FontWeight.w700,
        color:       AppColors.white,
      ),
    );
  }

  // ── top animal types ───────────────────────────────────────────────────────

  Widget _buildTopAnimalTypesCard(_AnalyticsData data) {
    return _ChartCard(
      title: 'أكثر أنواع الحيوانات',
      child: data.topAnimalTypes.isEmpty
          ? const _EmptyChart()
          : Column(
              children: data.topAnimalTypes.map((entry) {
                final type  = (entry['type'] as String?) ?? 'other';
                final count = (entry['count'] as num?)?.toInt() ?? 0;
                final max   = (data.topAnimalTypes.first['count'] as num?)
                        ?.toInt() ?? 1;
                final pct   = max > 0 ? count / max : 0.0;
                return _AnimalTypeRow(
                  emoji: _kAnimalEmoji[type] ?? '🐾',
                  label: _kAnimalTypeAr[type] ?? type,
                  count: count,
                  barFraction: pct.toDouble(),
                );
              }).toList(),
            ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable sub-widgets
// ─────────────────────────────────────────────────────────────────────────────

/// Single KPI tile in the horizontal strip.
class _KpiTile extends StatelessWidget {
  const _KpiTile({
    required this.label,
    required this.value,
    required this.unit,
    required this.color,
    required this.bgColor,
    required this.icon,
  });

  final String  label;
  final String  value;
  final String  unit;
  final Color   color;
  final Color   bgColor;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color:        AppColors.white,
          borderRadius: BorderRadius.circular(_kCardRadius),
          boxShadow:    _kCardShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width:  36,
              height: 36,
              decoration: BoxDecoration(
                color:       bgColor,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(height: 10),
            Text(
              value,
              style: TextStyle(
                fontFamily:  'Cairo',
                fontWeight:  FontWeight.w700,
                fontSize:    15,
                color:       color,
              ),
              maxLines:  1,
              overflow:  TextOverflow.ellipsis,
            ),
            Text(
              unit,
              style: const TextStyle(
                fontFamily: 'Cairo',
                fontSize:   10,
                color:      AppColors.muted,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(
                fontFamily: 'Cairo',
                fontSize:   11,
                color:      AppColors.muted,
              ),
              maxLines: 2,
            ),
          ],
        ),
      ),
    );
  }
}

/// Card wrapper with a title and optional padding around child.
class _ChartCard extends StatelessWidget {
  const _ChartCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color:        AppColors.white,
        borderRadius: BorderRadius.circular(_kCardRadius),
        boxShadow:    _kCardShadow,
      ),
      child: Padding(
        padding: _kCardPadding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontFamily:  'Cairo',
                fontWeight:  FontWeight.w700,
                fontSize:    15,
                color:       AppColors.text,
              ),
            ),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }
}

/// Small colored dot + label — used in bar chart legend.
class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});

  final Color  color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width:  10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Cairo',
            fontSize:   12,
            color:      AppColors.muted,
          ),
        ),
      ],
    );
  }
}

/// One horizontal bar row for expense breakdown.
class _ExpenseRow extends StatelessWidget {
  const _ExpenseRow({
    required this.icon,
    required this.color,
    required this.label,
    required this.amount,
    required this.percent,
  });

  final IconData icon;
  final Color    color;
  final String   label;
  final String   amount;
  final double   percent;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width:  32,
                height: 32,
                decoration: BoxDecoration(
                  color:       color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 16),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontFamily:  'Cairo',
                    fontWeight:  FontWeight.w600,
                    fontSize:    13,
                    color:       AppColors.text,
                  ),
                ),
              ),
              Text(
                '$amount ج.م',
                style: const TextStyle(
                  fontFamily:  'Cairo',
                  fontWeight:  FontWeight.w700,
                  fontSize:    13,
                  color:       AppColors.text,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${percent.toStringAsFixed(1)}%',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize:   12,
                  color:      AppColors.muted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value:           percent / 100,
              minHeight:       6,
              backgroundColor: AppColors.grey100,
              valueColor:      AlwaysStoppedAnimation<Color>(color),
            ),
          ),
        ],
      ),
    );
  }
}

/// One legend row inside the pie/donut chart panel.
class _PieLegendRow extends StatelessWidget {
  const _PieLegendRow({
    required this.color,
    required this.label,
    required this.count,
    required this.total,
  });

  final Color  color;
  final String label;
  final int    count;
  final int    total;

  @override
  Widget build(BuildContext context) {
    final pct = total > 0 ? (count / total * 100).toStringAsFixed(0) : '0';
    return Row(
      children: [
        Container(
          width:  12,
          height: 12,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize:   12,
              color:      AppColors.text,
            ),
          ),
        ),
        Text(
          '$count ($pct%)',
          style: TextStyle(
            fontFamily:  'Cairo',
            fontSize:    12,
            fontWeight:  FontWeight.w700,
            color:       color,
          ),
        ),
      ],
    );
  }
}

/// One row for the top animal types list.
class _AnimalTypeRow extends StatelessWidget {
  const _AnimalTypeRow({
    required this.emoji,
    required this.label,
    required this.count,
    required this.barFraction,
  });

  final String emoji;
  final String label;
  final int    count;
  final double barFraction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        children: [
          Row(
            children: [
              Text(emoji, style: const TextStyle(fontSize: 22)),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontFamily:  'Cairo',
                    fontWeight:  FontWeight.w600,
                    fontSize:    13,
                    color:       AppColors.text,
                  ),
                ),
              ),
              Text(
                '$count رأس',
                style: const TextStyle(
                  fontFamily:  'Cairo',
                  fontWeight:  FontWeight.w700,
                  fontSize:    13,
                  color:       AppColors.green,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value:           barFraction,
              minHeight:       6,
              backgroundColor: AppColors.grey100,
              valueColor:      const AlwaysStoppedAnimation<Color>(AppColors.green),
            ),
          ),
        ],
      ),
    );
  }
}

/// Placeholder shown when a dataset is empty.
class _EmptyChart extends StatelessWidget {
  const _EmptyChart();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.bar_chart_outlined, size: 40, color: AppColors.midMuted),
            const SizedBox(height: 8),
            const Text(
              'لا توجد بيانات كافية',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize:   13,
                color:      AppColors.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
