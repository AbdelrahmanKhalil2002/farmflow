import 'dart:convert';
import 'dart:io';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import 'finance_service.dart';

class StatementsScreen extends ConsumerStatefulWidget {
  const StatementsScreen({super.key});

  @override
  ConsumerState<StatementsScreen> createState() => _StatementsScreenState();
}

class _StatementsScreenState extends ConsumerState<StatementsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _exportCsv() async {
    final expenses = ref.read(recentExpensesProvider).valueOrNull ?? [];
    final income   = ref.read(recentIncomeProvider).valueOrNull ?? [];
    final dateFmt  = DateFormat('yyyy-MM-dd');

    final buf = StringBuffer();
    buf.writeln('النوع,التاريخ,الفئة/المصدر,المبلغ (ج.م),ملاحظة');
    for (final e in expenses) {
      buf.writeln('مصروف,${dateFmt.format(e.date)},${e.categoryAr},${e.amount.toStringAsFixed(2)},${e.note ?? ''}');
    }
    for (final i in income) {
      buf.writeln('إيراد,${dateFmt.format(i.date)},${i.source ?? 'بيع'},${i.amount.toStringAsFixed(2)},${i.note ?? ''}');
    }

    final dir  = await getTemporaryDirectory();
    final file = File('${dir.path}/farmflow_accounts.csv');
    await file.writeAsString(buf.toString(), encoding: utf8);
    await Share.shareXFiles(
      [XFile(file.path)],
      text: 'كشف حسابات FarmFlow',
    );
  }

  Future<void> _exportPdf() async {
    final expenses = ref.read(recentExpensesProvider).valueOrNull ?? [];
    final income   = ref.read(recentIncomeProvider).valueOrNull ?? [];
    final dateFmt  = DateFormat('yyyy-MM-dd');
    final fmt      = NumberFormat('#,##0.00');

    final totalExpenses = expenses.fold<double>(0, (s, e) => s + e.amount);
    final totalIncome   = income.fold<double>(0, (s, i) => s + i.amount);
    final net           = totalIncome - totalExpenses;

    final doc = pw.Document();

    // Load Arabic-compatible font (falls back to built-in if not available)
    pw.Font? arabicFont;
    try {
      final fontData = await rootBundle.load('assets/fonts/Cairo-Regular.ttf');
      arabicFont = pw.Font.ttf(fontData);
    } catch (_) {}

    final baseStyle = pw.TextStyle(font: arabicFont, fontSize: 10);
    final boldStyle = pw.TextStyle(font: arabicFont, fontSize: 10, fontWeight: pw.FontWeight.bold);
    final titleStyle = pw.TextStyle(font: arabicFont, fontSize: 16, fontWeight: pw.FontWeight.bold);
    final headerStyle = pw.TextStyle(font: arabicFont, fontSize: 10, fontWeight: pw.FontWeight.bold,
        color: PdfColors.white);

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        textDirection: pw.TextDirection.rtl,
        margin: const pw.EdgeInsets.all(32),
        build: (ctx) => [
          // Title
          pw.Center(
            child: pw.Text('كشف حسابات FarmFlow', style: titleStyle),
          ),
          pw.SizedBox(height: 4),
          pw.Center(
            child: pw.Text(
              DateFormat('yyyy/MM/dd').format(DateTime.now()),
              style: baseStyle.copyWith(color: PdfColors.grey600),
            ),
          ),
          pw.SizedBox(height: 16),

          // KPI strip
          pw.Container(
            padding: const pw.EdgeInsets.all(12),
            decoration: pw.BoxDecoration(
              color: const PdfColor.fromInt(0xFF3A7D44),
              borderRadius: pw.BorderRadius.circular(8),
            ),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceAround,
              children: [
                _pdfKpi('إجمالي الإيرادات', '${fmt.format(totalIncome)} ج.م', headerStyle),
                _pdfKpi('إجمالي المصروفات', '${fmt.format(totalExpenses)} ج.م', headerStyle),
                _pdfKpi('صافي الربح', '${fmt.format(net)} ج.م', headerStyle),
              ],
            ),
          ),
          pw.SizedBox(height: 20),

          // Expenses table
          if (expenses.isNotEmpty) ...[
            pw.Text('المصروفات', style: boldStyle.copyWith(fontSize: 13)),
            pw.SizedBox(height: 8),
            pw.TableHelper.fromTextArray(
              headers: ['الملاحظة', 'المبلغ (ج.م)', 'الفئة', 'التاريخ'],
              data: expenses.map((e) => [
                e.note ?? '',
                fmt.format(e.amount),
                e.categoryAr,
                dateFmt.format(e.date),
              ]).toList(),
              headerStyle: headerStyle,
              headerDecoration: const pw.BoxDecoration(color: PdfColor.fromInt(0xFF3A7D44)),
              cellStyle: baseStyle,
              cellAlignments: {0: pw.Alignment.centerRight, 1: pw.Alignment.centerLeft,
                               2: pw.Alignment.centerRight, 3: pw.Alignment.centerLeft},
              border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
            ),
            pw.SizedBox(height: 20),
          ],

          // Income table
          if (income.isNotEmpty) ...[
            pw.Text('الإيرادات', style: boldStyle.copyWith(fontSize: 13)),
            pw.SizedBox(height: 8),
            pw.TableHelper.fromTextArray(
              headers: ['الملاحظة', 'المبلغ (ج.م)', 'المصدر', 'التاريخ'],
              data: income.map((i) => [
                i.note ?? '',
                fmt.format(i.amount),
                i.source ?? 'بيع',
                dateFmt.format(i.date),
              ]).toList(),
              headerStyle: headerStyle,
              headerDecoration: const pw.BoxDecoration(color: PdfColor.fromInt(0xFF3A7D44)),
              cellStyle: baseStyle,
              cellAlignments: {0: pw.Alignment.centerRight, 1: pw.Alignment.centerLeft,
                               2: pw.Alignment.centerRight, 3: pw.Alignment.centerLeft},
              border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
            ),
          ],
        ],
      ),
    );

    await Printing.sharePdf(
      bytes: await doc.save(),
      filename: 'farmflow_accounts.pdf',
    );
  }

  static pw.Widget _pdfKpi(String label, String value, pw.TextStyle style) =>
    pw.Column(
      children: [
        pw.Text(label, style: style.copyWith(fontSize: 9)),
        pw.SizedBox(height: 4),
        pw.Text(value, style: style.copyWith(fontSize: 11)),
      ],
    );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        title: const Text(
          'الحسابات',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w800,
            color: AppColors.white,
          ),
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.download_outlined, color: AppColors.white),
            color: AppColors.card,
            onSelected: (v) {
              if (v == 'csv') _exportCsv();
              if (v == 'pdf') _exportPdf();
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                value: 'csv',
                child: Row(children: const [
                  Icon(Icons.table_chart_outlined, size: 18, color: AppColors.green),
                  SizedBox(width: 8),
                  Text('تصدير CSV', style: TextStyle(fontFamily: 'Cairo', fontSize: 14)),
                ]),
              ),
              PopupMenuItem(
                value: 'pdf',
                child: Row(children: const [
                  Icon(Icons.picture_as_pdf_outlined, size: 18, color: AppColors.red),
                  SizedBox(width: 8),
                  Text('تصدير PDF', style: TextStyle(fontFamily: 'Cairo', fontSize: 14)),
                ]),
              ),
            ],
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.white,
          unselectedLabelColor: AppColors.white.withValues(alpha: 0.6),
          indicatorColor: AppColors.white,
          indicatorWeight: 3,
          labelStyle: const TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w700,
            fontSize: 13,
          ),
          tabs: const [
            Tab(text: 'الملخص'),
            Tab(text: 'المصروفات'),
            Tab(text: 'الإيرادات'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: const [
          _SummaryTab(),
          _ExpensesTab(),
          _IncomeTab(),
        ],
      ),
    );
  }
}

// ── Summary tab ───────────────────────────────────────────────────────────────

class _SummaryTab extends ConsumerWidget {
  const _SummaryTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncSummary = ref.watch(financeSummaryProvider);

    return asyncSummary.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            ShimmerCard(height: 100),
            SizedBox(height: 16),
            ShimmerCard(height: 260),
          ],
        ),
      ),
      error: (e, _) => EmptyState(
        icon: Icons.wifi_off_rounded,
        title: 'تعذّر التحميل',
        subtitle: e.toString(),
        actionLabel: 'إعادة المحاولة',
        action: () => ref.invalidate(financeSummaryProvider),
      ),
      data: (summary) => RefreshIndicator(
        color: AppColors.green,
        onRefresh: () async => ref.invalidate(financeSummaryProvider),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _TotalsCard(summary: summary),
              const SizedBox(height: 16),
              if (summary.monthly.isNotEmpty) ...[
                const Text(
                  'آخر 6 أشهر',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.text,
                  ),
                ),
                const SizedBox(height: 10),
                _MonthlyChart(points: summary.monthly),
                const SizedBox(height: 16),
                const _ProfitLegend(),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _TotalsCard extends StatelessWidget {
  const _TotalsCard({required this.summary});
  final FinanceSummary summary;

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'ar');
    final profitColor = summary.netProfit >= 0 ? AppColors.green : AppColors.red;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(color: Color(0x08000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          Expanded(child: _TotalItem(
            label: 'الإيرادات',
            value: '${fmt.format(summary.totalIncome)} ج.م',
            color: AppColors.green,
            icon: Icons.trending_up,
          )),
          Container(width: 1, height: 48, color: AppColors.border),
          Expanded(child: _TotalItem(
            label: 'المصروفات',
            value: '${fmt.format(summary.totalExpenses)} ج.م',
            color: AppColors.red,
            icon: Icons.trending_down,
          )),
          Container(width: 1, height: 48, color: AppColors.border),
          Expanded(child: _TotalItem(
            label: 'الربح الصافي',
            value: '${fmt.format(summary.netProfit)} ج.م',
            color: profitColor,
            icon: Icons.account_balance_wallet_outlined,
          )),
        ],
      ),
    );
  }
}

class _TotalItem extends StatelessWidget {
  const _TotalItem({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });
  final String label;
  final String value;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Icon(icon, size: 18, color: color),
      const SizedBox(height: 4),
      Text(
        value,
        textAlign: TextAlign.center,
        style: TextStyle(
          fontFamily: 'Cairo',
          fontSize: 12,
          fontWeight: FontWeight.w800,
          color: color,
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
  );
}

// ── Monthly bar chart ─────────────────────────────────────────────────────────

class _MonthlyChart extends StatelessWidget {
  const _MonthlyChart({required this.points});
  final List<MonthlyPoint> points;

  @override
  Widget build(BuildContext context) {
    final maxY = points
        .map((p) => p.income > p.expenses ? p.income : p.expenses)
        .fold<double>(0, (a, b) => a > b ? a : b);

    return Container(
      height: 220,
      padding: const EdgeInsets.fromLTRB(8, 16, 8, 8),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: BarChart(
        BarChartData(
          maxY: maxY > 0 ? maxY * 1.2 : 1,
          minY: 0,
          gridData: FlGridData(
            drawHorizontalLine: true,
            drawVerticalLine: false,
            horizontalInterval: maxY > 0 ? maxY / 4 : 1,
            getDrawingHorizontalLine: (_) => FlLine(
              color: AppColors.border,
              strokeWidth: 1,
            ),
          ),
          borderData: FlBorderData(show: false),
          titlesData: FlTitlesData(
            rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (x, _) {
                  final i = x.toInt();
                  if (i < 0 || i >= points.length) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      points[i].label,
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 9,
                        color: AppColors.muted,
                      ),
                    ),
                  );
                },
                reservedSize: 22,
              ),
            ),
            leftTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
          ),
          barGroups: List.generate(points.length, (i) {
            final p = points[i];
            return BarChartGroupData(
              x: i,
              barsSpace: 4,
              barRods: [
                BarChartRodData(
                  toY: p.income,
                  color: AppColors.green,
                  width: 8,
                  borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(4)),
                ),
                BarChartRodData(
                  toY: p.expenses,
                  color: AppColors.red.withValues(alpha: 0.7),
                  width: 8,
                  borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(4)),
                ),
              ],
            );
          }),
        ),
      ),
    );
  }
}

class _ProfitLegend extends StatelessWidget {
  const _ProfitLegend();

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      _LegendDot(color: AppColors.green, label: 'الإيرادات'),
      const SizedBox(width: 20),
      _LegendDot(
          color: AppColors.red.withValues(alpha: 0.7),
          label: 'المصروفات'),
    ],
  );
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 10,
        height: 10,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      ),
      const SizedBox(width: 4),
      Text(label,
          style: const TextStyle(
              fontFamily: 'Cairo', fontSize: 12, color: AppColors.muted)),
    ],
  );
}

// ── Expenses tab ──────────────────────────────────────────────────────────────

void _showCategoryDrill(
    BuildContext context, String category, List<ExpenseEntry> all) {
  final filtered = all.where((e) => e.category == category).toList();
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.card,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _CategoryDrillSheet(category: category, entries: filtered),
  );
}

class _CategoryDrillSheet extends StatelessWidget {
  const _CategoryDrillSheet(
      {required this.category, required this.entries});
  final String category;
  final List<ExpenseEntry> entries;

  static const _catAr = {
    'feed': 'علف', 'doctor': 'بيطري', 'transport': 'نقل',
    'electricity': 'كهرباء', 'salary': 'رواتب', 'rent': 'إيجار',
    'water': 'مياه', 'maintenance': 'صيانة', 'other': 'أخرى',
  };
  static const _catColors = {
    'feed': Color(0xFF22C55E), 'doctor': Color(0xFFEF4444),
    'transport': Color(0xFF3B82F6), 'electricity': Color(0xFFF59E0B),
    'salary': Color(0xFF8B5CF6), 'rent': Color(0xFF06B6D4),
    'water': Color(0xFF0EA5E9), 'maintenance': Color(0xFF6B7280),
    'other': Color(0xFFD97706),
  };

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'ar');
    final dateFmt = DateFormat('d MMM yyyy', 'ar');
    final total = entries.fold<double>(0, (s, e) => s + e.amount);
    final color = _catColors[category] ?? AppColors.muted;
    final titleAr = _catAr[category] ?? category;

    return DraggableScrollableSheet(
      initialChildSize: 0.55,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      expand: false,
      builder: (_, scrollCtrl) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
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
            Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                ),
                const SizedBox(width: 8),
                Text(
                  titleAr,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: AppColors.text,
                  ),
                ),
                const Spacer(),
                Text(
                  '${fmt.format(total)} ج.م',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: color,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Expanded(
              child: ListView.separated(
                controller: scrollCtrl,
                itemCount: entries.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) {
                  final e = entries[i];
                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.bg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                e.note ?? titleAr,
                                style: const TextStyle(
                                  fontFamily: 'Cairo',
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.text,
                                ),
                              ),
                              Text(
                                dateFmt.format(e.date),
                                style: const TextStyle(
                                  fontFamily: 'Cairo',
                                  fontSize: 11,
                                  color: AppColors.muted,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '${fmt.format(e.amount)} ج.م',
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: AppColors.red,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ExpensesTab extends ConsumerWidget {
  const _ExpensesTab();

  static const _catColors = {
    'feed':        Color(0xFF22C55E),
    'doctor':      Color(0xFFEF4444),
    'transport':   Color(0xFF3B82F6),
    'electricity': Color(0xFFF59E0B),
    'salary':      Color(0xFF8B5CF6),
    'rent':        Color(0xFF06B6D4),
    'water':       Color(0xFF0EA5E9),
    'maintenance': Color(0xFF6B7280),
    'other':       Color(0xFFD97706),
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncExpenses = ref.watch(recentExpensesProvider);

    return asyncExpenses.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(16),
        child: ShimmerList(count: 5, cardHeight: 64),
      ),
      error: (_, __) => const EmptyState(
        icon: Icons.trending_down_outlined,
        title: 'تعذّر تحميل المصروفات',
      ),
      data: (expenses) {
        if (expenses.isEmpty) {
          return const EmptyState(
            icon: Icons.receipt_outlined,
            title: 'لا توجد مصروفات مسجّلة',
          );
        }

        // Category totals for mini chart
        final totals = <String, double>{};
        for (final e in expenses) {
          totals[e.category] = (totals[e.category] ?? 0) + e.amount;
        }
        final grandTotal = totals.values.fold<double>(0, (a, b) => a + b);

        return RefreshIndicator(
          color: AppColors.green,
          onRefresh: () async => ref.invalidate(recentExpensesProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Category breakdown
              if (grandTotal > 0) ...[
                const Text(
                  'توزيع المصروفات',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.text,
                  ),
                ),
                const SizedBox(height: 10),
                _CategoryBreakdown(
                  totals: totals,
                  grandTotal: grandTotal,
                  onCategoryTap: (cat) => _showCategoryDrill(context, cat, expenses),
                ),
                const SizedBox(height: 20),
                const Text(
                  'آخر المصروفات',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.text,
                  ),
                ),
                const SizedBox(height: 10),
              ],
              ...expenses.map((e) => _ExpenseRow(
                    expense: e,
                    color: _catColors[e.category] ?? AppColors.muted,
                  )),
            ],
          ),
        );
      },
    );
  }
}

class _CategoryBreakdown extends StatelessWidget {
  const _CategoryBreakdown({
    required this.totals,
    required this.grandTotal,
    this.onCategoryTap,
  });
  final Map<String, double> totals;
  final double grandTotal;
  final void Function(String category)? onCategoryTap;

  static const _catAr = {
    'feed':        'علف',
    'doctor':      'بيطري',
    'transport':   'نقل',
    'electricity': 'كهرباء',
    'salary':      'رواتب',
    'rent':        'إيجار',
    'water':       'مياه',
    'maintenance': 'صيانة',
    'other':       'أخرى',
  };

  static const _catColors = {
    'feed':        Color(0xFF22C55E),
    'doctor':      Color(0xFFEF4444),
    'transport':   Color(0xFF3B82F6),
    'electricity': Color(0xFFF59E0B),
    'salary':      Color(0xFF8B5CF6),
    'rent':        Color(0xFF06B6D4),
    'water':       Color(0xFF0EA5E9),
    'maintenance': Color(0xFF6B7280),
    'other':       Color(0xFFD97706),
  };

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'ar');
    final sorted = totals.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: sorted.map((entry) {
          final pct = entry.value / grandTotal;
          final color = _catColors[entry.key] ?? AppColors.muted;
          return GestureDetector(
            onTap: onCategoryTap != null
                ? () => onCategoryTap!(entry.key)
                : null,
            child: Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: color,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          _catAr[entry.key] ?? entry.key,
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 12,
                            color: AppColors.text,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '${fmt.format(entry.value)} ج.م  (${(pct * 100).toStringAsFixed(0)}%)',
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 11,
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: pct,
                    backgroundColor: color.withValues(alpha: 0.15),
                    valueColor: AlwaysStoppedAnimation<Color>(color),
                    minHeight: 6,
                  ),
                ),
              ],
            ),
          ));
        }).toList(),
      ),
    );
  }
}

class _ExpenseRow extends StatelessWidget {
  const _ExpenseRow({required this.expense, required this.color});
  final ExpenseEntry expense;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final fmt    = NumberFormat('#,##0', 'ar');
    final dateFmt = DateFormat('d MMM', 'ar');

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
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.receipt_outlined, size: 16, color: color),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  expense.categoryAr,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.text,
                  ),
                ),
                if (expense.note != null)
                  Text(
                    expense.note!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
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
                '${fmt.format(expense.amount)} ج.م',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: AppColors.red,
                ),
              ),
              Text(
                dateFmt.format(expense.date),
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 10,
                  color: AppColors.muted,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Income tab ────────────────────────────────────────────────────────────────

class _IncomeTab extends ConsumerWidget {
  const _IncomeTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncIncome = ref.watch(recentIncomeProvider);

    return asyncIncome.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(16),
        child: ShimmerList(count: 5, cardHeight: 64),
      ),
      error: (_, __) => const EmptyState(
        icon: Icons.trending_up_outlined,
        title: 'تعذّر تحميل الإيرادات',
      ),
      data: (income) {
        if (income.isEmpty) {
          return const EmptyState(
            icon: Icons.payments_outlined,
            title: 'لا توجد إيرادات مسجّلة',
          );
        }

        final fmt = NumberFormat('#,##0', 'ar');
        final total = income.fold<double>(0, (s, e) => s + e.amount);

        return RefreshIndicator(
          color: AppColors.green,
          onRefresh: () async => ref.invalidate(recentIncomeProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Total header
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.greenBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.greenBorder),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.trending_up,
                        color: AppColors.green, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'إجمالي الإيرادات',
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 13,
                        color: AppColors.greenText,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '${fmt.format(total)} ج.م',
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.green,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              ...income.map((e) => _IncomeRow(entry: e)),
            ],
          ),
        );
      },
    );
  }
}

class _IncomeRow extends StatelessWidget {
  const _IncomeRow({required this.entry});
  final IncomeEntry entry;

  @override
  Widget build(BuildContext context) {
    final fmt     = NumberFormat('#,##0', 'ar');
    final dateFmt = DateFormat('d MMM', 'ar');

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
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: AppColors.green.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.payments_outlined,
                size: 16, color: AppColors.green),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.source ?? 'بيع ماشية',
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.text,
                  ),
                ),
                if (entry.note != null)
                  Text(
                    entry.note!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
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
                '${fmt.format(entry.amount)} ج.م',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: AppColors.green,
                ),
              ),
              Text(
                dateFmt.format(entry.date),
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 10,
                  color: AppColors.muted,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
