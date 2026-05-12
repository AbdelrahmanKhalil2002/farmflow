import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/shimmer_widget.dart';

// ── Model ─────────────────────────────────────────────────────────────────────

class _WeekData {
  const _WeekData({
    required this.week,
    required this.buyers,
    required this.sellers,
    required this.listings,
    required this.orders,
    required this.gmv,
  });

  final String week;
  final int    buyers;
  final int    sellers;
  final int    listings;
  final int    orders;
  final double gmv;

  factory _WeekData.fromJson(Map<String, dynamic> j) => _WeekData(
    week:     j['week']     as String? ?? '',
    buyers:   (j['buyers']   as num?)?.toInt()    ?? 0,
    sellers:  (j['sellers']  as num?)?.toInt()    ?? 0,
    listings: (j['listings'] as num?)?.toInt()    ?? 0,
    orders:   (j['orders']   as num?)?.toInt()    ?? 0,
    gmv:      (j['gmv']      as num?)?.toDouble() ?? 0,
  );

  /// Returns MM-DD from an ISO date string like "2025-01-06".
  String get weekLabel {
    if (week.length >= 10) return week.substring(5, 10);
    return week;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

final adminAnalyticsProvider =
    FutureProvider.family<List<_WeekData>, int>((ref, weeks) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(
    ApiEndpoints.adminAnalytics,
    queryParameters: {'weeks': weeks},
  );
  final raw = res.data as List? ?? [];
  return raw
      .cast<Map<String, dynamic>>()
      .map(_WeekData.fromJson)
      .toList();
});

// ── Screen ────────────────────────────────────────────────────────────────────

class AdminAnalyticsScreen extends ConsumerStatefulWidget {
  const AdminAnalyticsScreen({super.key});

  @override
  ConsumerState<AdminAnalyticsScreen> createState() =>
      _AdminAnalyticsScreenState();
}

class _AdminAnalyticsScreenState
    extends ConsumerState<AdminAnalyticsScreen> {
  static const _periodOptions = [4, 8, 12, 24];
  int _selectedWeeks = 8;

  @override
  Widget build(BuildContext context) {
    final asyncData = ref.watch(adminAnalyticsProvider(_selectedWeeks));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.bg,
        appBar: AppBar(
          backgroundColor: AppColors.green,
          elevation: 0,
          automaticallyImplyLeading: false,
          title: const Text(
            'تحليلات المنصة',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w800,
              color: AppColors.white,
            ),
          ),
        ),
        body: RefreshIndicator(
          color: AppColors.green,
          onRefresh: () async =>
              ref.invalidate(adminAnalyticsProvider(_selectedWeeks)),
          child: asyncData.when(
            loading:  () => _LoadingBody(
              periodOptions: _periodOptions,
              selected: _selectedWeeks,
              onPeriodChanged: (w) => setState(() => _selectedWeeks = w),
            ),
            error: (e, _) => _ErrorBody(
              onRetry: () =>
                  ref.invalidate(adminAnalyticsProvider(_selectedWeeks)),
              periodOptions: _periodOptions,
              selected: _selectedWeeks,
              onPeriodChanged: (w) => setState(() => _selectedWeeks = w),
            ),
            data: (weeks) => _AnalyticsBody(
              weeks: weeks,
              periodOptions: _periodOptions,
              selected: _selectedWeeks,
              onPeriodChanged: (w) => setState(() => _selectedWeeks = w),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Period selector ───────────────────────────────────────────────────────────

class _PeriodSelector extends StatelessWidget {
  const _PeriodSelector({
    required this.options,
    required this.selected,
    required this.onChanged,
  });

  final List<int> options;
  final int       selected;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: options.map((w) {
          final isSelected = w == selected;
          return GestureDetector(
            onTap: () => onChanged(w),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(left: 8),
              padding: const EdgeInsets.symmetric(
                  horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.green
                    : AppColors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected
                      ? AppColors.green
                      : AppColors.border,
                ),
              ),
              child: Text(
                '$w أسابيع',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isSelected
                      ? AppColors.white
                      : AppColors.muted,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ── Loading state ─────────────────────────────────────────────────────────────

class _LoadingBody extends StatelessWidget {
  const _LoadingBody({
    required this.periodOptions,
    required this.selected,
    required this.onPeriodChanged,
  });

  final List<int> periodOptions;
  final int       selected;
  final ValueChanged<int> onPeriodChanged;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const SizedBox(height: 16),
        _PeriodSelector(
          options:   periodOptions,
          selected:  selected,
          onChanged: onPeriodChanged,
        ),
        const SizedBox(height: 16),
        // KPI shimmer row — 5 tiles in two rows (3 + 2)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(children: [
            Row(children: [
              for (var i = 0; i < 3; i++) ...[
                Expanded(child: ShimmerCard(height: 80)),
                if (i < 2) const SizedBox(width: 10),
              ],
            ]),
            Row(children: [
              for (var i = 0; i < 2; i++) ...[
                Expanded(child: ShimmerCard(height: 80)),
                if (i < 1) const SizedBox(width: 10),
              ],
              const Expanded(child: SizedBox()),
            ]),
          ]),
        ),
        const SizedBox(height: 8),
        // 4 chart shimmer cards
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(children: [
            for (var i = 0; i < 4; i++) ...[
              ShimmerCard(height: 200),
            ],
          ]),
        ),
      ],
    );
  }
}

// ── Error state ───────────────────────────────────────────────────────────────

class _ErrorBody extends StatelessWidget {
  const _ErrorBody({
    required this.onRetry,
    required this.periodOptions,
    required this.selected,
    required this.onPeriodChanged,
  });

  final VoidCallback onRetry;
  final List<int>    periodOptions;
  final int          selected;
  final ValueChanged<int> onPeriodChanged;

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      const SizedBox(height: 16),
      _PeriodSelector(
        options:   periodOptions,
        selected:  selected,
        onChanged: onPeriodChanged,
      ),
      const Spacer(),
      const Icon(
        Icons.wifi_off_rounded,
        size: 52,
        color: AppColors.muted,
      ),
      const SizedBox(height: 12),
      const Text(
        'تعذّر تحميل التحليلات',
        style: TextStyle(
          fontFamily: 'Cairo',
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: AppColors.muted,
        ),
      ),
      const SizedBox(height: 12),
      ElevatedButton.icon(
        onPressed: onRetry,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.green,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10)),
        ),
        icon: const Icon(Icons.refresh, size: 16, color: AppColors.white),
        label: const Text(
          'إعادة المحاولة',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w700,
            color: AppColors.white,
          ),
        ),
      ),
      const Spacer(),
    ]);
  }
}

// ── Data body ─────────────────────────────────────────────────────────────────

class _AnalyticsBody extends StatelessWidget {
  const _AnalyticsBody({
    required this.weeks,
    required this.periodOptions,
    required this.selected,
    required this.onPeriodChanged,
  });

  final List<_WeekData> weeks;
  final List<int>       periodOptions;
  final int             selected;
  final ValueChanged<int> onPeriodChanged;

  @override
  Widget build(BuildContext context) {
    // Aggregate KPI totals
    int    totalBuyers   = 0;
    int    totalSellers  = 0;
    int    totalListings = 0;
    int    totalOrders   = 0;
    double totalGmv      = 0;
    for (final w in weeks) {
      totalBuyers   += w.buyers;
      totalSellers  += w.sellers;
      totalListings += w.listings;
      totalOrders   += w.orders;
      totalGmv      += w.gmv;
    }

    return ListView(
      padding: const EdgeInsets.only(bottom: 32),
      children: [
        const SizedBox(height: 16),

        // ── Period selector ──────────────────────────────────────────────
        _PeriodSelector(
          options:   periodOptions,
          selected:  selected,
          onChanged: onPeriodChanged,
        ),
        const SizedBox(height: 20),

        // ── KPI strip ────────────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(children: [
            Row(children: [
              Expanded(
                child: _KpiTile(
                  label: 'مشترون جدد',
                  value: '$totalBuyers',
                  color: AppColors.blue,
                  icon:  Icons.person_add_outlined,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _KpiTile(
                  label: 'بائعون جدد',
                  value: '$totalSellers',
                  color: AppColors.green,
                  icon:  Icons.storefront_outlined,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _KpiTile(
                  label: 'إعلانات جديدة',
                  value: '$totalListings',
                  color: AppColors.amber,
                  icon:  Icons.sell_outlined,
                ),
              ),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(
                child: _KpiTile(
                  label: 'طلبات',
                  value: '$totalOrders',
                  color: const Color(0xFF7C3AED), // purple
                  icon:  Icons.receipt_long_outlined,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _KpiTile(
                  label: 'إجمالي الإيرادات',
                  value: '${_fmtGmv(totalGmv)} ج.م',
                  color: AppColors.green,
                  icon:  Icons.account_balance_wallet_outlined,
                ),
              ),
              const Expanded(child: SizedBox()),
            ]),
          ]),
        ),
        const SizedBox(height: 24),

        // ── Charts ───────────────────────────────────────────────────────
        if (weeks.isNotEmpty) ...[
          _ChartCard(
            title: 'تسجيل المشترين',
            color: AppColors.blue,
            data:  weeks.map((w) => _ChartPoint(w.weekLabel, w.buyers.toDouble())).toList(),
          ),
          _ChartCard(
            title: 'تسجيل البائعين',
            color: AppColors.green,
            data:  weeks.map((w) => _ChartPoint(w.weekLabel, w.sellers.toDouble())).toList(),
          ),
          _ChartCard(
            title: 'إعلانات جديدة',
            color: AppColors.amber,
            data:  weeks.map((w) => _ChartPoint(w.weekLabel, w.listings.toDouble())).toList(),
          ),
          _ChartCard(
            title: 'إيرادات (ج.م)',
            color: AppColors.green,
            data:  weeks.map((w) => _ChartPoint(w.weekLabel, w.gmv)).toList(),
            isGmv: true,
          ),
        ] else
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(
              child: Text(
                'لا توجد بيانات للفترة المحددة',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 14,
                  color: AppColors.muted,
                ),
              ),
            ),
          ),
      ],
    );
  }

  static String _fmtGmv(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}م';
    if (v >= 1000)    return '${(v / 1000).toStringAsFixed(1)}ك';
    return v.toStringAsFixed(0);
  }
}

// ── Chart data point ──────────────────────────────────────────────────────────

class _ChartPoint {
  const _ChartPoint(this.label, this.value);
  final String label;
  final double value;
}

// ── Chart card ────────────────────────────────────────────────────────────────

class _ChartCard extends StatefulWidget {
  const _ChartCard({
    required this.title,
    required this.color,
    required this.data,
    this.isGmv = false,
  });

  final String          title;
  final Color           color;
  final List<_ChartPoint> data;
  final bool            isGmv;

  @override
  State<_ChartCard> createState() => _ChartCardState();
}

class _ChartCardState extends State<_ChartCard> {
  int? _touchedIndex;

  @override
  Widget build(BuildContext context) {
    final maxY = widget.data.fold(0.0, (prev, p) => p.value > prev ? p.value : prev);
    final ceiling = maxY <= 0 ? 5.0 : maxY * 1.25;

    final bars = List.generate(widget.data.length, (i) {
      final isTouched = _touchedIndex == i;
      return BarChartGroupData(
        x: i,
        barRods: [
          BarChartRodData(
            toY: widget.data[i].value,
            color: isTouched
                ? widget.color
                : widget.color.withValues(alpha: 0.65),
            width: _barWidth(widget.data.length),
            borderRadius: const BorderRadius.vertical(
                top: Radius.circular(4)),
            backDrawRodData: BackgroundBarChartRodData(
              show: true,
              toY: ceiling,
              color: widget.color.withValues(alpha: 0.06),
            ),
          ),
        ],
      );
    });

    // X-axis: show label every N steps so they don't collide
    final step = widget.data.length > 12 ? 3 : (widget.data.length > 6 ? 2 : 1);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.fromLTRB(16, 16, 8, 12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title + colour dot
          Row(children: [
            Container(
              width: 10, height: 10,
              decoration: BoxDecoration(
                color: widget.color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              widget.title,
              style: const TextStyle(
                fontFamily: 'Cairo',
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: AppColors.text,
              ),
            ),
          ]),
          const SizedBox(height: 16),

          SizedBox(
            height: 170,
            child: BarChart(
              BarChartData(
                maxY: ceiling,
                barGroups: bars,
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: _yInterval(ceiling),
                  getDrawingHorizontalLine: (_) => const FlLine(
                    color: AppColors.border,
                    strokeWidth: 0.8,
                  ),
                ),
                borderData: FlBorderData(show: false),
                titlesData: FlTitlesData(
                  topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 36,
                      interval: _yInterval(ceiling),
                      getTitlesWidget: (val, meta) {
                        if (val == meta.max) {
                          return const SizedBox.shrink();
                        }
                        final label = widget.isGmv
                            ? _shortGmv(val)
                            : val.toInt().toString();
                        return Padding(
                          padding: const EdgeInsets.only(left: 4),
                          child: Text(
                            label,
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 9,
                              color: AppColors.muted,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 22,
                      getTitlesWidget: (val, meta) {
                        final idx = val.toInt();
                        if (idx < 0 || idx >= widget.data.length) {
                          return const SizedBox.shrink();
                        }
                        if (idx % step != 0) return const SizedBox.shrink();
                        return Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            widget.data[idx].label,
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 9,
                              color: AppColors.muted,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                barTouchData: BarTouchData(
                  touchTooltipData: BarTouchTooltipData(
                    getTooltipColor: (_) =>
                        AppColors.grey800.withValues(alpha: 0.88),
                    tooltipRoundedRadius: 8,
                    tooltipPadding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 6),
                    getTooltipItem: (group, groupIndex, rod, rodIndex) {
                      final pt = widget.data[group.x];
                      final valLabel = widget.isGmv
                          ? '${_shortGmv(rod.toY)} ج.م'
                          : rod.toY.toInt().toString();
                      return BarTooltipItem(
                        '${pt.label}\n$valLabel',
                        const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.white,
                        ),
                      );
                    },
                  ),
                  touchCallback: (event, response) {
                    final idx = response?.spot?.touchedBarGroupIndex;
                    setState(() {
                      _touchedIndex =
                          (event is FlTapUpEvent || event is FlPanEndEvent)
                              ? null
                              : idx;
                    });
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  static double _barWidth(int count) {
    if (count <= 6)  return 18;
    if (count <= 12) return 12;
    return 8;
  }

  static double _yInterval(double ceiling) {
    if (ceiling <= 0) return 1;
    final raw = ceiling / 4;
    if (raw < 1) return 1;
    final mag = _magnitude(raw);
    return (raw / mag).ceil() * mag;
  }

  static double _magnitude(double v) {
    if (v >= 10000) return 5000;
    if (v >= 1000)  return 500;
    if (v >= 100)   return 50;
    if (v >= 10)    return 5;
    return 1;
  }

  static String _shortGmv(double v) {
    if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(1)}م';
    if (v >= 1000)    return '${(v / 1000).toStringAsFixed(1)}ك';
    return v.toStringAsFixed(0);
  }
}

// ── KPI tile ──────────────────────────────────────────────────────────────────

class _KpiTile extends StatelessWidget {
  const _KpiTile({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  final String   label;
  final String   value;
  final Color    color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(height: 6),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
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
