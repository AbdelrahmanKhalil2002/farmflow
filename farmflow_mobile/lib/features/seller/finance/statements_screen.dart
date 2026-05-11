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
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/l10n/l10n_ext.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import '../herd/herd_service.dart';
import 'finance_service.dart';

// ── Odoo-style design tokens ──────────────────────────────────────────────────
const _kBg      = Color(0xFFF7F8FA);
const _kCard    = Colors.white;
const _kDivider = Color(0xFFEEEEEE);
const _kMuted   = Color(0xFF6B7280);
const _kBorder  = Color(0xFFE5E7EB);
const _kText    = Color(0xFF111827);

// ── Category metadata ─────────────────────────────────────────────────────────
const _catAr = {
  'feed': 'علف', 'doctor': 'بيطري', 'transport': 'نقل',
  'electricity': 'كهرباء', 'salary': 'رواتب', 'rent': 'إيجار',
  'water': 'مياه', 'maintenance': 'صيانة', 'other': 'أخرى',
};
const _catColors = {
  'feed': Color(0xFF22C55E), 'doctor': Color(0xFFEF4444),
  'transport': Color(0xFF3B82F6), 'electricity': Color(0xFFF59E0B),
  'salary': Color(0xFF8B5CF6), 'rent': Color(0xFF06B6D4),
  'water': Color(0xFF0EA5E9), 'maintenance': Color(0xFF6B7280),
  'other': Color(0xFFD97706),
};
const _catIcons = {
  'feed': Icons.grass_outlined,
  'doctor': Icons.medical_services_outlined,
  'transport': Icons.local_shipping_outlined,
  'electricity': Icons.bolt_outlined,
  'salary': Icons.people_outline,
  'rent': Icons.home_outlined,
  'water': Icons.water_drop_outlined,
  'maintenance': Icons.build_outlined,
  'other': Icons.more_horiz,
};

// ── Main screen ───────────────────────────────────────────────────────────────

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
    _tabs = TabController(length: 4, vsync: this);
    _tabs.addListener(() {
      if (!_tabs.indexIsChanging) setState(() {});
    });
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  void _invalidateFinanceProviders() {
    ref.invalidate(recentExpensesProvider);
    ref.invalidate(recentIncomeProvider);
    ref.invalidate(financeSummaryProvider);
    ref.invalidate(currentYearStatementsProvider);
    ref.invalidate(currentYearBudgetProvider);
  }

  void _showAddExpense() {
    showAddExpenseSheet(context, onCreated: _invalidateFinanceProviders);
  }

  void _showAddIncome() {
    showAddIncomeSheet(context, onCreated: _invalidateFinanceProviders);
  }

  void _showQuickAddFinance() {
    showModalBottomSheet(
      context: context,
      backgroundColor: _kCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 36),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SheetHandle(),
            Text(
              context.l10n.addFinanceTitle,
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 17,
                  fontWeight: FontWeight.w800, color: _kText),
            ),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(child: _AddChoiceCard(
                icon: Icons.remove_circle_outline,
                label: context.l10n.quickAddExpense,
                color: AppColors.red,
                bg: AppColors.redBg,
                onTap: () { Navigator.pop(context); _showAddExpense(); },
              )),
              const SizedBox(width: 12),
              Expanded(child: _AddChoiceCard(
                icon: Icons.add_circle_outline,
                label: context.l10n.quickAddIncome,
                color: AppColors.green,
                bg: AppColors.greenBg,
                onTap: () { Navigator.pop(context); _showAddIncome(); },
              )),
            ]),
          ],
        ),
      ),
    );
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
      buf.writeln('إيراد,${dateFmt.format(i.date)},${i.sourceAr},${i.amount.toStringAsFixed(2)},${i.note ?? ''}');
    }

    final dir  = await getTemporaryDirectory();
    final file = File('${dir.path}/farmflow_accounts.csv');
    await file.writeAsString(buf.toString(), encoding: utf8);
    await Share.shareXFiles([XFile(file.path)], text: 'كشف حسابات FarmFlow');
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

    pw.Font? arabicFont;
    try {
      final fontData = await rootBundle.load('assets/fonts/Cairo-Regular.ttf');
      arabicFont = pw.Font.ttf(fontData);
    } catch (_) {}

    final baseStyle   = pw.TextStyle(font: arabicFont, fontSize: 10);
    final boldStyle   = pw.TextStyle(font: arabicFont, fontSize: 10, fontWeight: pw.FontWeight.bold);
    final titleStyle  = pw.TextStyle(font: arabicFont, fontSize: 16, fontWeight: pw.FontWeight.bold);
    final headerStyle = pw.TextStyle(font: arabicFont, fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.white);

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        textDirection: pw.TextDirection.rtl,
        margin: const pw.EdgeInsets.all(32),
        build: (ctx) => [
          pw.Center(child: pw.Text('كشف حسابات FarmFlow', style: titleStyle)),
          pw.SizedBox(height: 4),
          pw.Center(child: pw.Text(DateFormat('yyyy/MM/dd').format(DateTime.now()),
              style: baseStyle.copyWith(color: PdfColors.grey600))),
          pw.SizedBox(height: 16),
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
          if (expenses.isNotEmpty) ...[
            pw.Text('المصروفات', style: boldStyle.copyWith(fontSize: 13)),
            pw.SizedBox(height: 8),
            pw.TableHelper.fromTextArray(
              headers: ['الملاحظة', 'المبلغ (ج.م)', 'الفئة', 'التاريخ'],
              data: expenses.map((e) => [e.note ?? '', fmt.format(e.amount), e.categoryAr, dateFmt.format(e.date)]).toList(),
              headerStyle: headerStyle,
              headerDecoration: const pw.BoxDecoration(color: PdfColor.fromInt(0xFF3A7D44)),
              cellStyle: baseStyle,
              border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
            ),
            pw.SizedBox(height: 20),
          ],
          if (income.isNotEmpty) ...[
            pw.Text('الإيرادات', style: boldStyle.copyWith(fontSize: 13)),
            pw.SizedBox(height: 8),
            pw.TableHelper.fromTextArray(
              headers: ['الملاحظة', 'المبلغ (ج.م)', 'المصدر', 'التاريخ'],
              data: income.map((i) => [i.note ?? '', fmt.format(i.amount), i.sourceAr, dateFmt.format(i.date)]).toList(),
              headerStyle: headerStyle,
              headerDecoration: const pw.BoxDecoration(color: PdfColor.fromInt(0xFF3A7D44)),
              cellStyle: baseStyle,
              border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
            ),
          ],
        ],
      ),
    );

    await Printing.sharePdf(bytes: await doc.save(), filename: 'farmflow_accounts.pdf');
  }

  static pw.Widget _pdfKpi(String label, String value, pw.TextStyle style) =>
      pw.Column(children: [
        pw.Text(label, style: style.copyWith(fontSize: 9)),
        pw.SizedBox(height: 4),
        pw.Text(value, style: style.copyWith(fontSize: 11)),
      ]);

  Future<void> _pickAndExportQuarterlyPdf() async {
    int? quarter;
    await showDialog<int>(
      context: context,
      builder: (dCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('اختر الربع', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, color: _kText)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(4, (i) => ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text('الربع ${i + 1}  (${_quarterMonthsAr(i + 1)})',
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 14, color: _kText)),
            onTap: () { quarter = i + 1; Navigator.pop(dCtx); },
          )),
        ),
      ),
    );
    if (quarter == null) return;
    await _exportQuarterlyPdf(quarter!);
  }

  static String _quarterMonthsAr(int q) {
    const ranges = ['يناير–مارس', 'أبريل–يونيو', 'يوليو–سبتمبر', 'أكتوبر–ديسمبر'];
    return ranges[q - 1];
  }

  Future<void> _exportQuarterlyPdf(int quarter) async {
    final expenses = ref.read(recentExpensesProvider).valueOrNull ?? [];
    final income   = ref.read(recentIncomeProvider).valueOrNull ?? [];
    final firstM   = (quarter - 1) * 3 + 1;
    final lastM    = quarter * 3;

    final qExpenses = expenses.where((e) => e.date.month >= firstM && e.date.month <= lastM).toList();
    final qIncome   = income.where((i) => i.date.month >= firstM && i.date.month <= lastM).toList();

    final dateFmt = DateFormat('yyyy-MM-dd');
    final fmt     = NumberFormat('#,##0.00');
    final totalExp = qExpenses.fold<double>(0, (s, e) => s + e.amount);
    final totalInc = qIncome.fold<double>(0, (s, i) => s + i.amount);
    final net      = totalInc - totalExp;

    final doc = pw.Document();
    pw.Font? arabicFont;
    try {
      final fontData = await rootBundle.load('assets/fonts/Cairo-Regular.ttf');
      arabicFont = pw.Font.ttf(fontData);
    } catch (_) {}

    final baseStyle   = pw.TextStyle(font: arabicFont, fontSize: 10);
    final boldStyle   = pw.TextStyle(font: arabicFont, fontSize: 10, fontWeight: pw.FontWeight.bold);
    final titleStyle  = pw.TextStyle(font: arabicFont, fontSize: 16, fontWeight: pw.FontWeight.bold);
    final headerStyle = pw.TextStyle(font: arabicFont, fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColors.white);

    doc.addPage(pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      textDirection: pw.TextDirection.rtl,
      margin: const pw.EdgeInsets.all(32),
      build: (ctx) => [
        pw.Center(child: pw.Text('تقرير الربع $quarter — ${_quarterMonthsAr(quarter)}', style: titleStyle)),
        pw.Center(child: pw.Text('FarmFlow  |  ${DateFormat('yyyy').format(DateTime.now())}',
            style: baseStyle.copyWith(color: PdfColors.grey600))),
        pw.SizedBox(height: 16),
        pw.Container(
          padding: const pw.EdgeInsets.all(12),
          decoration: pw.BoxDecoration(color: const PdfColor.fromInt(0xFF3A7D44), borderRadius: pw.BorderRadius.circular(8)),
          child: pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceAround, children: [
            _pdfKpi('الإيرادات', '${fmt.format(totalInc)} ج.م', headerStyle),
            _pdfKpi('المصروفات', '${fmt.format(totalExp)} ج.م', headerStyle),
            _pdfKpi('صافي الربح', '${fmt.format(net)} ج.م', headerStyle),
          ]),
        ),
        pw.SizedBox(height: 20),
        if (qExpenses.isNotEmpty) ...[
          pw.Text('المصروفات', style: boldStyle.copyWith(fontSize: 13)),
          pw.SizedBox(height: 8),
          pw.TableHelper.fromTextArray(
            headers: ['الملاحظة', 'المبلغ (ج.م)', 'الفئة', 'التاريخ'],
            data: qExpenses.map((e) => [e.note ?? '', fmt.format(e.amount), e.categoryAr, dateFmt.format(e.date)]).toList(),
            headerStyle: headerStyle,
            headerDecoration: const pw.BoxDecoration(color: PdfColor.fromInt(0xFF3A7D44)),
            cellStyle: baseStyle,
            border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
          ),
          pw.SizedBox(height: 20),
        ],
        if (qIncome.isNotEmpty) ...[
          pw.Text('الإيرادات', style: boldStyle.copyWith(fontSize: 13)),
          pw.SizedBox(height: 8),
          pw.TableHelper.fromTextArray(
            headers: ['الملاحظة', 'المبلغ (ج.م)', 'المصدر', 'التاريخ'],
            data: qIncome.map((i) => [i.note ?? '', fmt.format(i.amount), i.sourceAr, dateFmt.format(i.date)]).toList(),
            headerStyle: headerStyle,
            headerDecoration: const pw.BoxDecoration(color: PdfColor.fromInt(0xFF3A7D44)),
            cellStyle: baseStyle,
            border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
          ),
        ],
      ],
    ));

    await Printing.sharePdf(
        bytes: await doc.save(),
        filename: 'farmflow_q${quarter}_${DateFormat('yyyy').format(DateTime.now())}.pdf');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _kBg,
      floatingActionButton: _tabs.index != 3
          ? FloatingActionButton.extended(
              heroTag: 'add_finance',
              onPressed: _showQuickAddFinance,
              backgroundColor: AppColors.green,
              icon: const Icon(Icons.add, color: Colors.white),
              label: Text(context.l10n.addButton,
                  style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: Colors.white)),
            )
          : null,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        title: Text(
          context.l10n.statementsTitle,
          style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, color: Colors.white),
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.download_outlined, color: Colors.white),
            color: _kCard,
            onSelected: (v) {
              if (v == 'csv')      _exportCsv();
              if (v == 'pdf')      _exportPdf();
              if (v == 'quarterly') _pickAndExportQuarterlyPdf();
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                value: 'csv',
                child: Row(children: [
                  const Icon(Icons.table_chart_outlined, size: 18, color: AppColors.green),
                  const SizedBox(width: 8),
                  Text(context.l10n.exportCsv, style: const TextStyle(fontFamily: 'Cairo', fontSize: 14)),
                ]),
              ),
              PopupMenuItem(
                value: 'pdf',
                child: Row(children: [
                  const Icon(Icons.picture_as_pdf_outlined, size: 18, color: AppColors.red),
                  const SizedBox(width: 8),
                  Text(context.l10n.exportPdf, style: const TextStyle(fontFamily: 'Cairo', fontSize: 14)),
                ]),
              ),
              const PopupMenuItem(
                value: 'quarterly',
                child: Row(children: [
                  Icon(Icons.calendar_view_month_outlined, size: 18, color: Color(0xFF7C3AED)),
                  SizedBox(width: 8),
                  Text('تقرير ربع سنوي', style: TextStyle(fontFamily: 'Cairo', fontSize: 14)),
                ]),
              ),
            ],
          ),
        ],
        bottom: TabBar(
          controller: _tabs,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white.withValues(alpha: 0.6),
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 12),
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: [
            Tab(text: context.l10n.tabSummary),
            Tab(text: context.l10n.tabExpenses),
            Tab(text: context.l10n.tabIncome),
            Tab(text: context.l10n.tabBudget),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: const [_SummaryTab(), _ExpensesTab(), _IncomeTab(), _BudgetTab()],
      ),
    );
  }
}

// ── Summary tab ───────────────────────────────────────────────────────────────

// ── Year + Quarter selector providers ────────────────────────────────────────

final statementsYearProvider   = StateProvider<int>((ref) => DateTime.now().year);
final statementsQuarterProvider = StateProvider<int?>((ref) => null); // null = all

final statementsForYearProvider =
    FutureProvider.family<List<StatementMonth>, int>((ref, year) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(ApiEndpoints.statements, queryParameters: {'year': year});
  final data = res.data as List? ?? [];
  return data.map((e) => StatementMonth.fromJson(e as Map<String, dynamic>)).toList();
});

class _SummaryTab extends ConsumerStatefulWidget {
  const _SummaryTab();

  @override
  ConsumerState<_SummaryTab> createState() => _SummaryTabState();
}

class _SummaryTabState extends ConsumerState<_SummaryTab> {
  @override
  Widget build(BuildContext context) {
    final year            = ref.watch(statementsYearProvider);
    final quarter         = ref.watch(statementsQuarterProvider);
    final asyncSummary    = ref.watch(financeSummaryProvider);
    final asyncStatements = ref.watch(statementsForYearProvider(year));
    final currentYear     = DateTime.now().year;

    return Column(
      children: [
        // ── Year / Quarter selector ──────────────────────────────────────
        Container(
          color: AppColors.card,
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
          child: Column(children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_right_rounded),
                  color: AppColors.green,
                  onPressed: () =>
                      ref.read(statementsYearProvider.notifier).state = year - 1,
                ),
                Text('$year',
                    style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.text)),
                IconButton(
                  icon: Icon(Icons.chevron_left_rounded,
                      color: year < currentYear ? AppColors.green : AppColors.muted),
                  onPressed: year < currentYear
                      ? () => ref.read(statementsYearProvider.notifier).state = year + 1
                      : null,
                ),
              ],
            ),
            const SizedBox(height: 4),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _QChip(
                    label: 'كل السنة',
                    selected: quarter == null,
                    onTap: () =>
                        ref.read(statementsQuarterProvider.notifier).state = null,
                  ),
                  for (var q = 1; q <= 4; q++) ...[
                    const SizedBox(width: 6),
                    _QChip(
                      label: 'ر $q',
                      selected: quarter == q,
                      onTap: () => ref.read(statementsQuarterProvider.notifier).state =
                          quarter == q ? null : q,
                    ),
                  ],
                ],
              ),
            ),
          ]),
        ),
        const Divider(height: 1),
        // ── Content ──────────────────────────────────────────────────────
        Expanded(
          child: asyncSummary.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(16),
              child: Column(children: [
                ShimmerCard(height: 96),
                SizedBox(height: 12),
                ShimmerCard(height: 240),
              ]),
            ),
            error: (e, _) => EmptyState(
              icon: Icons.wifi_off_rounded,
              title: context.l10n.loadingFailed,
              subtitle: e.toString(),
              actionLabel: context.l10n.retry,
              action: () {
                ref.invalidate(financeSummaryProvider);
                ref.invalidate(statementsForYearProvider(year));
              },
            ),
            data: (summary) {
              final stmtList = asyncStatements.valueOrNull ?? [];
              final filtered = quarter == null
                  ? stmtList
                  : stmtList.where((s) {
                      final m = s.month + 1;
                      return m >= (quarter - 1) * 3 + 1 && m <= quarter * 3;
                    }).toList();
              final chartPoints = filtered
                  .where((s) => s.income > 0 || s.totalExpenses > 0)
                  .map((s) => s.toMonthlyPoint(year))
                  .toList();
              final displayPoints = chartPoints.length > 6
                  ? chartPoints.sublist(chartPoints.length - 6)
                  : chartPoints;

              // ── Pending income ───────────────────────────────────────────
              final allIncome  = ref.watch(recentIncomeProvider).valueOrNull ?? [];
              final pendingTotal = allIncome.where((e) => e.isPending).fold<double>(0, (s, e) => s + e.amount);

              // ── Month-over-month ─────────────────────────────────────────
              final now       = DateTime.now();
              final curMonth  = now.month - 1; // StatementMonth.month is 0-based
              final prevMonth = curMonth - 1;
              final curStmt   = stmtList.where((s) => s.month == curMonth).isNotEmpty
                                  ? stmtList.firstWhere((s) => s.month == curMonth)
                                  : null;
              final prevStmt  = prevMonth >= 0 && stmtList.where((s) => s.month == prevMonth).isNotEmpty
                                  ? stmtList.firstWhere((s) => s.month == prevMonth)
                                  : null;
              double? incomeChg, expenseChg, profitChg;
              if (curStmt != null && prevStmt != null) {
                if (prevStmt.income > 0) incomeChg = (curStmt.income - prevStmt.income) / prevStmt.income * 100;
                if (prevStmt.totalExpenses > 0) expenseChg = (curStmt.totalExpenses - prevStmt.totalExpenses) / prevStmt.totalExpenses * 100;
                final curP = curStmt.income - curStmt.totalExpenses;
                final preP = prevStmt.income - prevStmt.totalExpenses;
                if (preP.abs() > 0) profitChg = (curP - preP) / preP.abs() * 100;
              }

              // ── Margin % ────────────────────────────────────────────────
              final margin = summary.totalIncome > 0
                  ? summary.netProfit / summary.totalIncome * 100
                  : null;

              // ── Cost per animal ──────────────────────────────────────────
              final animalSummary = ref.watch(animalSummaryProvider).valueOrNull;
              final costPerHead = (animalSummary != null && animalSummary.total > 0 && summary.totalExpenses > 0)
                  ? summary.totalExpenses / animalSummary.total
                  : null;

              // ── Budget exceeded ──────────────────────────────────────────
              final allExpenses   = ref.watch(recentExpensesProvider).valueOrNull ?? [];
              final budgets       = ref.watch(currentYearBudgetProvider).valueOrNull ?? [];
              final monthBudgets  = budgets.where((b) => b.month == now.month).toList();
              final monthExpMap   = <String, double>{};
              for (final e in allExpenses.where((e) => e.date.month == now.month && e.date.year == now.year)) {
                monthExpMap[e.category] = (monthExpMap[e.category] ?? 0) + e.amount;
              }
              final exceeded = monthBudgets.where((b) =>
                  b.targetAmount > 0 && (monthExpMap[b.category] ?? 0) > b.targetAmount).toList();

              // ── Top expense category (this month) ────────────────────────
              String? topCat;
              double topAmt = 0;
              for (final entry in monthExpMap.entries) {
                if (entry.value > topAmt) { topAmt = entry.value; topCat = entry.key; }
              }
              final totalMonthExp = monthExpMap.values.fold<double>(0, (a, b) => a + b);

              return RefreshIndicator(
                color: AppColors.green,
                onRefresh: () async {
                  ref.invalidate(financeSummaryProvider);
                  ref.invalidate(statementsForYearProvider(year));
                  ref.invalidate(recentIncomeProvider);
                  ref.invalidate(recentExpensesProvider);
                  ref.invalidate(currentYearBudgetProvider);
                  ref.invalidate(animalSummaryProvider);
                },
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Pending income banner
                      if (pendingTotal > 0) ...[
                        _PendingIncomeBanner(total: pendingTotal),
                        const SizedBox(height: 12),
                      ],

                      // KPI strip with month-over-month arrows
                      _KpiStrip(
                        summary: summary,
                        incomeChange: incomeChg,
                        expenseChange: expenseChg,
                        profitChange: profitChg,
                      ),
                      const SizedBox(height: 10),

                      // Margin % + Cost per animal
                      if (margin != null || costPerHead != null) ...[
                        Row(children: [
                          if (margin != null)
                            Expanded(child: _MarginCard(margin: margin)),
                          if (margin != null && costPerHead != null)
                            const SizedBox(width: 8),
                          if (costPerHead != null)
                            Expanded(child: _CostPerHeadCard(
                              cost: costPerHead, count: animalSummary!.total)),
                        ]),
                        const SizedBox(height: 14),
                      ],

                      // Budget exceeded warning
                      if (exceeded.isNotEmpty) ...[
                        _BudgetExceededWarning(
                            exceeded: exceeded, actualByCategory: monthExpMap),
                        const SizedBox(height: 14),
                      ],

                      // Chart + insight
                      if (displayPoints.isNotEmpty) ...[
                        _SectionHeader(title: context.l10n.last6Months),
                        const SizedBox(height: 10),
                        _MonthlyChart(points: displayPoints),
                        const SizedBox(height: 12),
                        const _ProfitLegend(),
                        if (topCat != null && totalMonthExp > 0) ...[
                          const SizedBox(height: 12),
                          _TopExpenseInsight(
                              category: topCat, amount: topAmt, total: totalMonthExp),
                        ],
                      ] else
                        EmptyState(
                          icon: Icons.bar_chart_outlined,
                          title: 'لا توجد بيانات',
                          subtitle: 'لا توجد معاملات لهذه الفترة',
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _QChip extends StatelessWidget {
  const _QChip({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: selected ? AppColors.green : AppColors.bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: selected ? AppColors.green : AppColors.border),
      ),
      child: Text(label,
          style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: selected ? AppColors.white : AppColors.text)),
    ),
  );
}

// ── KPI strip (3 separate tiles) ──────────────────────────────────────────────

class _KpiStrip extends StatelessWidget {
  const _KpiStrip({
    required this.summary,
    this.incomeChange,
    this.expenseChange,
    this.profitChange,
  });
  final FinanceSummary summary;
  final double? incomeChange;
  final double? expenseChange;
  final double? profitChange;

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'ar');
    final profitColor = summary.netProfit >= 0 ? AppColors.green : AppColors.red;

    return Row(children: [
      Expanded(child: _KpiTile(
        label: context.l10n.incomeLabel,
        value: fmt.format(summary.totalIncome),
        color: AppColors.green,
        icon: Icons.arrow_upward_rounded,
        change: incomeChange,
        positiveIsGood: true,
      )),
      const SizedBox(width: 8),
      Expanded(child: _KpiTile(
        label: context.l10n.expensesLabel,
        value: fmt.format(summary.totalExpenses),
        color: AppColors.red,
        icon: Icons.arrow_downward_rounded,
        change: expenseChange,
        positiveIsGood: false,
      )),
      const SizedBox(width: 8),
      Expanded(child: _KpiTile(
        label: context.l10n.netProfitLabel,
        value: fmt.format(summary.netProfit),
        color: profitColor,
        icon: Icons.account_balance_wallet_outlined,
        change: profitChange,
        positiveIsGood: true,
      )),
    ]);
  }
}

class _KpiTile extends StatelessWidget {
  const _KpiTile({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
    this.change,
    this.positiveIsGood = true,
  });
  final String   label;
  final String   value;
  final Color    color;
  final IconData icon;
  final double?  change;        // month-over-month %
  final bool     positiveIsGood;

  @override
  Widget build(BuildContext context) {
    Color? changeColor;
    IconData? changeIcon;
    String? changeTxt;
    if (change != null) {
      final isGood = positiveIsGood ? change! > 0 : change! < 0;
      changeColor = isGood ? AppColors.green : AppColors.red;
      changeIcon  = change! > 0 ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded;
      changeTxt   = '${change!.abs().toStringAsFixed(0)}%';
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _kCard,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Container(
              width: 28, height: 28,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Icon(icon, size: 15, color: color),
            ),
            if (changeColor != null) ...[
              const Spacer(),
              Icon(changeIcon, size: 10, color: changeColor),
              Text(changeTxt!,
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 9, fontWeight: FontWeight.w700, color: changeColor)),
            ],
          ]),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(fontFamily: 'Cairo', fontSize: 14, fontWeight: FontWeight.w800, color: color),
          ),
          Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: _kMuted)),
          const Text('ج.م', style: TextStyle(fontFamily: 'Cairo', fontSize: 10, color: _kMuted)),
        ],
      ),
    );
  }
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
        color: _kCard,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: BarChart(
        BarChartData(
          maxY: maxY > 0 ? maxY * 1.2 : 1,
          minY: 0,
          gridData: FlGridData(
            drawHorizontalLine: true,
            drawVerticalLine: false,
            horizontalInterval: maxY > 0 ? maxY / 4 : 1,
            getDrawingHorizontalLine: (_) => const FlLine(color: _kDivider, strokeWidth: 1),
          ),
          borderData: FlBorderData(show: false),
          titlesData: FlTitlesData(
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (x, _) {
                  final i = x.toInt();
                  if (i < 0 || i >= points.length) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(points[i].label,
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 9, color: _kMuted)),
                  );
                },
                reservedSize: 22,
              ),
            ),
          ),
          barGroups: List.generate(points.length, (i) {
            final p = points[i];
            return BarChartGroupData(
              x: i,
              barsSpace: 4,
              barRods: [
                BarChartRodData(toY: p.income, color: AppColors.green, width: 8,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(4))),
                BarChartRodData(toY: p.expenses, color: AppColors.red.withValues(alpha: 0.7), width: 8,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(4))),
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
      _LegendDot(color: AppColors.green, label: context.l10n.incomeLabel),
      const SizedBox(width: 20),
      _LegendDot(color: AppColors.red.withValues(alpha: 0.7), label: context.l10n.expensesLabel),
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
      Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
      const SizedBox(width: 4),
      Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: _kMuted)),
    ],
  );
}

// ── Pending income banner ─────────────────────────────────────────────────────

class _PendingIncomeBanner extends StatelessWidget {
  const _PendingIncomeBanner({required this.total});
  final double total;

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'ar');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF3E0),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFFA000).withValues(alpha: 0.4)),
      ),
      child: Row(children: [
        const Icon(Icons.schedule_rounded, size: 18, color: Color(0xFFF57C00)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            'لديك ${fmt.format(total)} ج.م إيرادات لم تُستلم بعد',
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFE65100)),
          ),
        ),
      ]),
    );
  }
}

// ── Margin % card ─────────────────────────────────────────────────────────────

class _MarginCard extends StatelessWidget {
  const _MarginCard({required this.margin});
  final double margin;

  @override
  Widget build(BuildContext context) {
    final color = margin >= 30
        ? AppColors.green
        : margin >= 10
            ? const Color(0xFFF57C00)
            : AppColors.red;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('هامش الربح',
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: _kMuted)),
        const SizedBox(height: 4),
        Text('${margin.toStringAsFixed(1)}%',
            style: TextStyle(fontFamily: 'Cairo', fontSize: 18, fontWeight: FontWeight.w900, color: color)),
      ]),
    );
  }
}

// ── Cost per animal card ──────────────────────────────────────────────────────

class _CostPerHeadCard extends StatelessWidget {
  const _CostPerHeadCard({required this.cost, required this.count});
  final double cost;
  final int    count;

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'ar');
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.green.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.green.withValues(alpha: 0.2)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('تكلفة الرأس الواحد',
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: _kMuted)),
        const SizedBox(height: 4),
        Text('${fmt.format(cost)} ج.م',
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 15, fontWeight: FontWeight.w900, color: AppColors.green)),
        Text('من $count رأس',
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 10, color: _kMuted)),
      ]),
    );
  }
}

// ── Budget exceeded warning ───────────────────────────────────────────────────

class _BudgetExceededWarning extends StatelessWidget {
  const _BudgetExceededWarning({required this.exceeded, required this.actualByCategory});
  final List<BudgetEntry>      exceeded;
  final Map<String, double>    actualByCategory;

  static const _catAr = {
    'feed': 'علف', 'doctor': 'بيطري', 'transport': 'نقل',
    'electricity': 'كهرباء', 'salary': 'رواتب', 'rent': 'إيجار',
    'water': 'مياه', 'maintenance': 'صيانة', 'other': 'أخرى',
  };

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'ar');
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.red.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.red.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [
            Icon(Icons.warning_amber_rounded, size: 16, color: AppColors.red),
            SizedBox(width: 6),
            Text('تجاوزت الميزانية الشهرية في:',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.red)),
          ]),
          const SizedBox(height: 8),
          ...exceeded.map((b) {
            final actual = actualByCategory[b.category] ?? 0;
            return Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(children: [
                const SizedBox(width: 22),
                Expanded(
                  child: Text(_catAr[b.category] ?? b.category,
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: _kText)),
                ),
                Text('${fmt.format(actual)} / ${fmt.format(b.targetAmount)} ج.م',
                    style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: AppColors.red, fontWeight: FontWeight.w700)),
              ]),
            );
          }),
        ],
      ),
    );
  }
}

// ── Top expense insight chip ──────────────────────────────────────────────────

class _TopExpenseInsight extends StatelessWidget {
  const _TopExpenseInsight({required this.category, required this.amount, required this.total});
  final String category;
  final double amount;
  final double total;

  static const _catAr = {
    'feed': 'العلف', 'doctor': 'الطبيب البيطري', 'transport': 'النقل',
    'electricity': 'الكهرباء', 'salary': 'الرواتب', 'rent': 'الإيجار',
    'water': 'المياه', 'maintenance': 'الصيانة', 'other': 'أخرى',
  };

  @override
  Widget build(BuildContext context) {
    final pct = (amount / total * 100).toStringAsFixed(0);
    final name = _catAr[category] ?? category;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: _kBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _kBorder),
      ),
      child: Row(children: [
        const Icon(Icons.lightbulb_outline_rounded, size: 15, color: _kMuted),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            'معظم مصاريفك هذا الشهر على $name ($pct%)',
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: _kMuted),
          ),
        ),
      ]),
    );
  }
}

// ── Expenses tab ──────────────────────────────────────────────────────────────

class _ExpensesTab extends ConsumerStatefulWidget {
  const _ExpensesTab();

  @override
  ConsumerState<_ExpensesTab> createState() => _ExpensesTabState();
}

class _ExpensesTabState extends ConsumerState<_ExpensesTab> {
  String? _catFilter;

  void _invalidate() {
    ref.invalidate(recentExpensesProvider);
    ref.invalidate(financeSummaryProvider);
  }

  @override
  Widget build(BuildContext context) {
    final asyncExpenses = ref.watch(recentExpensesProvider);

    return asyncExpenses.when(
      loading: () => const Padding(padding: EdgeInsets.all(16), child: ShimmerList(count: 5, cardHeight: 64)),
      error: (_, __) => EmptyState(icon: Icons.trending_down_outlined, title: context.l10n.loadExpensesFailed),
      data: (allExpenses) {
        final expenses = _catFilter == null
            ? allExpenses
            : allExpenses.where((e) => e.category == _catFilter).toList();

        if (allExpenses.isEmpty) {
          return EmptyState(
            icon: Icons.receipt_outlined,
            title: context.l10n.noExpenses,
            subtitle: context.l10n.noExpensesSubtitle,
          );
        }

        final totals = <String, double>{};
        for (final e in allExpenses) {
          totals[e.category] = (totals[e.category] ?? 0) + e.amount;
        }
        final grandTotal = totals.values.fold<double>(0, (a, b) => a + b);

        return RefreshIndicator(
          color: AppColors.green,
          onRefresh: () async => ref.invalidate(recentExpensesProvider),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
            children: [
              _CatFilterRow(
                selected: _catFilter,
                onChanged: (cat) => setState(() => _catFilter = cat),
              ),
              const SizedBox(height: 16),
              if (_catFilter == null && grandTotal > 0) ...[
                _SectionHeader(title: context.l10n.expensesBreakdown),
                const SizedBox(height: 10),
                _CategoryBreakdown(
                  totals: totals,
                  grandTotal: grandTotal,
                  onCategoryTap: (cat) => _showCategoryDrill(context, cat, allExpenses),
                ),
                const SizedBox(height: 20),
              ],
              _SectionHeader(
                title: _catFilter == null
                    ? context.l10n.recentExpenses
                    : _catAr[_catFilter] ?? _catFilter!,
              ),
              const SizedBox(height: 10),
              if (expenses.isEmpty)
                EmptyState(icon: Icons.receipt_outlined, title: 'لا توجد نتائج')
              else
                _TransactionList(
                  children: List.generate(expenses.length, (i) => _ExpenseRow(
                    expense: expenses[i],
                    color: _catColors[expenses[i].category] ?? _kMuted,
                    isLast: i == expenses.length - 1,
                    onMutated: _invalidate,
                  )),
                ),
            ],
          ),
        );
      },
    );
  }
}

void _showCategoryDrill(BuildContext context, String category, List<ExpenseEntry> all) {
  final filtered = all.where((e) => e.category == category).toList();
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: _kCard,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => _CategoryDrillSheet(category: category, entries: filtered),
  );
}

class _CategoryBreakdown extends StatelessWidget {
  const _CategoryBreakdown({required this.totals, required this.grandTotal, this.onCategoryTap});
  final Map<String, double> totals;
  final double grandTotal;
  final void Function(String)? onCategoryTap;

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'ar');
    final sorted = totals.entries.toList()..sort((a, b) => b.value.compareTo(a.value));

    return Container(
      decoration: BoxDecoration(
        color: _kCard,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Column(
        children: List.generate(sorted.length, (idx) {
          final entry = sorted[idx];
          final pct   = entry.value / grandTotal;
          final color = _catColors[entry.key] ?? _kMuted;
          final isLast = idx == sorted.length - 1;
          return GestureDetector(
            onTap: onCategoryTap != null ? () => onCategoryTap!(entry.key) : null,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                        const SizedBox(width: 8),
                        Text(_catAr[entry.key] ?? entry.key,
                            style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kText)),
                        const Spacer(),
                        Text('${fmt.format(entry.value)} ج.م  (${(pct * 100).toStringAsFixed(0)}%)',
                            style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: _kMuted)),
                      ]),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: pct,
                          backgroundColor: color.withValues(alpha: 0.12),
                          valueColor: AlwaysStoppedAnimation<Color>(color),
                          minHeight: 5,
                        ),
                      ),
                    ],
                  ),
                ),
                if (!isLast) const Divider(height: 1, thickness: 1, indent: 16, endIndent: 16, color: _kDivider),
              ],
            ),
          );
        }),
      ),
    );
  }
}

class _ExpenseRow extends StatelessWidget {
  const _ExpenseRow({required this.expense, required this.color, required this.isLast, this.onMutated});
  final ExpenseEntry expense;
  final Color color;
  final bool isLast;
  final VoidCallback? onMutated;

  @override
  Widget build(BuildContext context) {
    final fmt     = NumberFormat('#,##0', 'ar');
    final dateFmt = DateFormat('d MMM', 'ar');

    return Column(children: [
      InkWell(
        onLongPress: () => _showExpenseActions(context, expense, onMutated),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(children: [
            Container(
              width: 38, height: 38,
              decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
              child: Icon(_catIcons[expense.category] ?? Icons.receipt_outlined, size: 17, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(expense.categoryAr,
                    style: const TextStyle(fontFamily: 'Cairo', fontSize: 14, fontWeight: FontWeight.w700, color: _kText)),
                if (expense.note != null)
                  Text(expense.note!, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: _kMuted)),
              ],
            )),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('${fmt.format(expense.amount)} ج.م',
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.red)),
              Text(dateFmt.format(expense.date),
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: _kMuted)),
            ]),
          ]),
        ),
      ),
      if (!isLast) const Divider(height: 1, thickness: 1, indent: 66, color: _kDivider),
    ]);
  }
}

void _showExpenseActions(BuildContext outerCtx, ExpenseEntry expense, VoidCallback? onMutated) {
  showModalBottomSheet(
    context: outerCtx,
    backgroundColor: _kCard,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (sheetCtx) => Consumer(
      builder: (_, ref, __) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SheetHandle(),
            Text(expense.categoryAr,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 16, fontWeight: FontWeight.w800, color: _kText)),
            const SizedBox(height: 2),
            Text('${NumberFormat('#,##0', 'ar').format(expense.amount)} ج.م',
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kMuted)),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () {
                Navigator.pop(sheetCtx);
                if (!outerCtx.mounted) return;
                showModalBottomSheet(
                  context: outerCtx,
                  isScrollControlled: true,
                  backgroundColor: _kCard,
                  shape: const RoundedRectangleBorder(
                      borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
                  builder: (_) => _EditExpenseSheet(expense: expense, onUpdated: onMutated ?? () {}),
                );
              },
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: const Text('تعديل', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.green,
                side: const BorderSide(color: AppColors.green),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: () async {
                Navigator.pop(sheetCtx);
                if (!outerCtx.mounted) return;
                final confirmed = await showDialog<bool>(
                  context: outerCtx,
                  builder: (dCtx) => AlertDialog(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    title: const Text('حذف المصروف',
                        style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, color: _kText)),
                    content: const Text('هل أنت متأكد من حذف هذا المصروف؟',
                        style: TextStyle(fontFamily: 'Cairo', color: _kMuted)),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(dCtx, false),
                          child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo', color: _kMuted))),
                      FilledButton(
                        onPressed: () => Navigator.pop(dCtx, true),
                        style: FilledButton.styleFrom(
                            backgroundColor: AppColors.red,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                        child: const Text('حذف',
                            style: TextStyle(fontFamily: 'Cairo', color: Colors.white, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                );
                if (confirmed == true) {
                  try {
                    await deleteExpense(ref.read(dioProvider), expense.id);
                    onMutated?.call();
                  } catch (_) {}
                }
              },
              icon: const Icon(Icons.delete_outline, size: 18),
              label: const Text('حذف', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.red,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _CatFilterRow extends StatelessWidget {
  const _CatFilterRow({required this.selected, required this.onChanged});
  final String? selected;
  final void Function(String?) onChanged;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    child: Row(
      children: [
        _QChip(label: 'الكل', selected: selected == null, onTap: () => onChanged(null)),
        ..._catAr.entries.map((e) => Padding(
          padding: const EdgeInsets.only(right: 6),
          child: _QChip(
            label: e.value,
            selected: selected == e.key,
            onTap: () => onChanged(selected == e.key ? null : e.key),
          ),
        )),
      ],
    ),
  );
}

class _CategoryDrillSheet extends StatelessWidget {
  const _CategoryDrillSheet({required this.category, required this.entries});
  final String category;
  final List<ExpenseEntry> entries;

  @override
  Widget build(BuildContext context) {
    final fmt     = NumberFormat('#,##0', 'ar');
    final dateFmt = DateFormat('d MMM yyyy', 'ar');
    final total   = entries.fold<double>(0, (s, e) => s + e.amount);
    final color   = _catColors[category] ?? _kMuted;
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
            Center(child: Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40, height: 4,
              decoration: BoxDecoration(color: _kDivider, borderRadius: BorderRadius.circular(2)),
            )),
            Row(children: [
              Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Text(titleAr, style: const TextStyle(fontFamily: 'Cairo', fontSize: 17, fontWeight: FontWeight.w800, color: _kText)),
              const Spacer(),
              Text('${fmt.format(total)} ج.م',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 15, fontWeight: FontWeight.w800, color: color)),
            ]),
            const SizedBox(height: 14),
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: _kCard,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))],
                ),
                child: ListView.separated(
                  controller: scrollCtrl,
                  itemCount: entries.length,
                  separatorBuilder: (_, __) => const Divider(height: 1, thickness: 1, indent: 16, endIndent: 16, color: _kDivider),
                  itemBuilder: (_, i) {
                    final e = entries[i];
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Row(children: [
                        Expanded(child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(e.note ?? titleAr,
                                style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.w600, color: _kText)),
                            Text(dateFmt.format(e.date),
                                style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: _kMuted)),
                          ],
                        )),
                        Text('${fmt.format(e.amount)} ج.م',
                            style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.red)),
                      ]),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
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
      loading: () => const Padding(padding: EdgeInsets.all(16), child: ShimmerList(count: 5, cardHeight: 64)),
      error: (_, __) => EmptyState(icon: Icons.trending_up_outlined, title: context.l10n.loadIncomeFailed),
      data: (income) {
        if (income.isEmpty) {
          return EmptyState(
            icon: Icons.payments_outlined,
            title: context.l10n.noIncome,
            subtitle: context.l10n.noIncomeSubtitle,
          );
        }

        final fmt   = NumberFormat('#,##0', 'ar');
        final total = income.fold<double>(0, (s, e) => s + e.amount);

        return RefreshIndicator(
          color: AppColors.green,
          onRefresh: () async => ref.invalidate(recentIncomeProvider),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.green,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(children: [
                  const Icon(Icons.trending_up, color: Colors.white, size: 20),
                  const SizedBox(width: 10),
                  Text(context.l10n.totalIncome,
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: Colors.white)),
                  const Spacer(),
                  Text('${fmt.format(total)} ج.م',
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
                ]),
              ),
              const SizedBox(height: 16),
              _SectionHeader(title: context.l10n.recentIncome),
              const SizedBox(height: 10),
              _TransactionList(
                children: List.generate(income.length, (i) => _IncomeRow(
                  entry: income[i],
                  isLast: i == income.length - 1,
                  onMutated: () {
                    ref.invalidate(recentIncomeProvider);
                    ref.invalidate(financeSummaryProvider);
                  },
                )),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _IncomeRow extends StatelessWidget {
  const _IncomeRow({required this.entry, required this.isLast, this.onMutated});
  final IncomeEntry entry;
  final bool isLast;
  final VoidCallback? onMutated;

  @override
  Widget build(BuildContext context) {
    final fmt     = NumberFormat('#,##0', 'ar');
    final dateFmt = DateFormat('d MMM', 'ar');

    return Column(children: [
      InkWell(
        onLongPress: () => _showIncomeActions(context, entry, onMutated),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(children: [
            Container(
              width: 38, height: 38,
              decoration: BoxDecoration(
                color: entry.fromOrder
                    ? AppColors.green.withValues(alpha: 0.18)
                    : AppColors.green.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                entry.fromOrder ? Icons.storefront_outlined : Icons.payments_outlined,
                size: 17, color: AppColors.green,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Text(entry.sourceAr,
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 14, fontWeight: FontWeight.w700, color: _kText)),
                  const SizedBox(width: 6),
                  _PayStatusChip(isPending: entry.isPending),
                  if (entry.fromOrder) ...[
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.green.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(5),
                      ),
                      child: const Text('من التطبيق',
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 9, fontWeight: FontWeight.w700, color: AppColors.green)),
                    ),
                  ],
                ]),
                Text(
                  entry.fromOrder
                      ? entry.paymentMethodAr
                      : (entry.buyerName?.isNotEmpty == true
                          ? entry.buyerName!
                          : (entry.note ?? entry.paymentMethodAr)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: _kMuted),
                ),
              ],
            )),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('${fmt.format(entry.amount)} ج.م',
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.green)),
              Text(dateFmt.format(entry.date),
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: _kMuted)),
            ]),
          ]),
        ),
      ),
      if (!isLast) const Divider(height: 1, thickness: 1, indent: 66, color: _kDivider),
    ]);
  }
}

class _PayStatusChip extends StatelessWidget {
  const _PayStatusChip({required this.isPending});
  final bool isPending;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
    decoration: BoxDecoration(
      color: isPending ? const Color(0xFFFFF3E0) : AppColors.green.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(6),
    ),
    child: Text(
      isPending ? 'معلق' : 'مُستلم',
      style: TextStyle(
        fontFamily: 'Cairo', fontSize: 10, fontWeight: FontWeight.w700,
        color: isPending ? const Color(0xFFF57C00) : AppColors.green,
      ),
    ),
  );
}

void _showIncomeActions(BuildContext outerCtx, IncomeEntry entry, VoidCallback? onMutated) {
  showModalBottomSheet(
    context: outerCtx,
    backgroundColor: _kCard,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (sheetCtx) => Consumer(
      builder: (_, ref, __) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SheetHandle(),
            Text(entry.sourceAr,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 16, fontWeight: FontWeight.w800, color: _kText)),
            const SizedBox(height: 2),
            Text('${NumberFormat('#,##0', 'ar').format(entry.amount)} ج.م',
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kMuted)),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () {
                Navigator.pop(sheetCtx);
                if (!outerCtx.mounted) return;
                showModalBottomSheet(
                  context: outerCtx,
                  isScrollControlled: true,
                  backgroundColor: _kCard,
                  shape: const RoundedRectangleBorder(
                      borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
                  builder: (_) => _EditIncomeSheet(entry: entry, onUpdated: onMutated ?? () {}),
                );
              },
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: const Text('تعديل', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.green,
                side: const BorderSide(color: AppColors.green),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: () async {
                Navigator.pop(sheetCtx);
                if (!outerCtx.mounted) return;
                final confirmed = await showDialog<bool>(
                  context: outerCtx,
                  builder: (dCtx) => AlertDialog(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    title: const Text('حذف الإيراد',
                        style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, color: _kText)),
                    content: Text(
                      entry.fromOrder
                          ? 'الإيراد ده مرتبط بأوردر من التطبيق، مؤكد تحذفه؟'
                          : 'هل أنت متأكد من حذف هذا الإيراد؟',
                      style: const TextStyle(fontFamily: 'Cairo', color: _kMuted),
                    ),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(dCtx, false),
                          child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo', color: _kMuted))),
                      FilledButton(
                        onPressed: () => Navigator.pop(dCtx, true),
                        style: FilledButton.styleFrom(
                            backgroundColor: AppColors.red,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                        child: const Text('حذف',
                            style: TextStyle(fontFamily: 'Cairo', color: Colors.white, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                );
                if (confirmed == true) {
                  try {
                    await deleteIncome(ref.read(dioProvider), entry.id);
                    onMutated?.call();
                  } catch (_) {}
                }
              },
              icon: const Icon(Icons.delete_outline, size: 18),
              label: const Text('حذف', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.red,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

// ── Shared layout helpers ─────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) => Row(children: [
    Container(width: 3, height: 16, decoration: BoxDecoration(color: AppColors.green, borderRadius: BorderRadius.circular(2))),
    const SizedBox(width: 8),
    Text(title, style: const TextStyle(fontFamily: 'Cairo', fontSize: 14, fontWeight: FontWeight.w800, color: _kText)),
  ]);
}

class _TransactionList extends StatelessWidget {
  const _TransactionList({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: _kCard,
      borderRadius: BorderRadius.circular(12),
      boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))],
    ),
    child: Column(children: children),
  );
}

// ── Add Expense sheet ─────────────────────────────────────────────────────────

class _AddExpenseSheet extends ConsumerStatefulWidget {
  const _AddExpenseSheet({required this.onCreated});
  final VoidCallback onCreated;

  @override
  ConsumerState<_AddExpenseSheet> createState() => _AddExpenseSheetState();
}

class _AddExpenseSheetState extends ConsumerState<_AddExpenseSheet> {
  final _amountCtrl = TextEditingController();
  final _noteCtrl   = TextEditingController();
  String   _category          = 'feed';
  DateTime _date              = DateTime.now();
  bool     _loading           = false;
  String?  _error;
  String?  _selectedAnimalId;
  String?  _selectedAnimalLabel;

  static const _categories = [
    ('feed',        'علف',     Icons.grass_outlined),
    ('doctor',      'بيطري',   Icons.medical_services_outlined),
    ('transport',   'نقل',     Icons.local_shipping_outlined),
    ('electricity', 'كهرباء',  Icons.bolt_outlined),
    ('salary',      'رواتب',   Icons.people_outline),
    ('rent',        'إيجار',   Icons.home_outlined),
    ('water',       'مياه',    Icons.water_drop_outlined),
    ('maintenance', 'صيانة',   Icons.build_outlined),
    ('other',       'أخرى',    Icons.more_horiz),
  ];

  @override
  void dispose() {
    _amountCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountCtrl.text.trim().replaceAll(',', ''));
    if (amount == null || amount <= 0) {
      setState(() => _error = context.l10n.amountInvalid);
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await addExpense(ref.read(dioProvider), {
        'category': _category,
        'amount':   amount,
        'date':     _date.toIso8601String(),
        if (_noteCtrl.text.trim().isNotEmpty) 'note': _noteCtrl.text.trim(),
        if (_selectedAnimalId != null) 'animalId': _selectedAnimalId,
      });
      widget.onCreated();
      if (mounted) Navigator.pop(context);
    } catch (_) {
      setState(() { _error = context.l10n.addExpenseFailed; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('d MMMM yyyy', 'ar');
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SheetHandle(),
            Text(context.l10n.addExpenseTitle,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 17, fontWeight: FontWeight.w800, color: _kText)),
            const SizedBox(height: 16),

            // Amount
            _FieldLabel(context.l10n.amountLabel),
            const SizedBox(height: 6),
            TextField(
              controller: _amountCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              textAlign: TextAlign.center,
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.red),
              decoration: InputDecoration(
                hintText: '0.00',
                hintStyle: TextStyle(fontFamily: 'Cairo', fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.red.withValues(alpha: 0.3)),
                filled: true,
                fillColor: AppColors.redBg,
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),

            // Category
            _FieldLabel(context.l10n.categoryLabel),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8, runSpacing: 8,
              children: _categories.map((c) => GestureDetector(
                onTap: () => setState(() => _category = c.$1),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _category == c.$1 ? AppColors.red : _kBg,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _category == c.$1 ? AppColors.red : _kBorder),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(c.$3, size: 13, color: _category == c.$1 ? Colors.white : _kMuted),
                    const SizedBox(width: 4),
                    Text(c.$2, style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                        color: _category == c.$1 ? Colors.white : _kText)),
                  ]),
                ),
              )).toList(),
            ),
            const SizedBox(height: 16),

            // Date
            _FieldLabel(context.l10n.dateLabel2),
            const SizedBox(height: 6),
            GestureDetector(
              onTap: _pickDate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                decoration: BoxDecoration(
                  color: _kBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _kBorder),
                ),
                child: Row(children: [
                  const Icon(Icons.calendar_today_outlined, size: 16, color: _kMuted),
                  const SizedBox(width: 8),
                  Text(dateFmt.format(_date),
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kText)),
                ]),
              ),
            ),
            const SizedBox(height: 12),

            // Animal picker (optional)
            const _FieldLabel('ربط بحيوان (اختياري)'),
            const SizedBox(height: 6),
            _AnimalPickerRow(
              selectedId:    _selectedAnimalId,
              selectedLabel: _selectedAnimalLabel,
              onSelected: (id, label) => setState(() {
                _selectedAnimalId    = id;
                _selectedAnimalLabel = label;
              }),
            ),
            const SizedBox(height: 12),

            // Note
            _FieldLabel(context.l10n.noteOptional),
            const SizedBox(height: 6),
            TextField(
              controller: _noteCtrl,
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kText),
              decoration: InputDecoration(
                hintText: context.l10n.noteHint,
                hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kMuted),
                filled: true,
                fillColor: _kBg,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _kBorder)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _kBorder)),
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: AppColors.red)),
            ],
            const SizedBox(height: 20),

            FilledButton(
              onPressed: _loading ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.red,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _loading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(context.l10n.submitExpense,
                      style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: Colors.white, fontSize: 15)),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Add Income sheet ──────────────────────────────────────────────────────────

class _AddIncomeSheet extends ConsumerStatefulWidget {
  const _AddIncomeSheet({required this.onCreated});
  final VoidCallback onCreated;

  @override
  ConsumerState<_AddIncomeSheet> createState() => _AddIncomeSheetState();
}

class _AddIncomeSheetState extends ConsumerState<_AddIncomeSheet> {
  final _amountCtrl = TextEditingController();
  final _noteCtrl   = TextEditingController();
  String   _type          = 'sale';
  String   _paymentMethod = 'cash';
  DateTime _date          = DateTime.now();
  bool     _loading       = false;
  String?  _error;

  static const _types = [
    ('sale',  'بيع ماشية',    Icons.storefront_outlined),
    ('dairy', 'منتجات ألبان', Icons.water_drop_outlined),
    ('feed',  'منتجات علف',   Icons.grass_outlined),
    ('other', 'دخل آخر',      Icons.more_horiz),
  ];

  static const _paymentMethods = [
    ('cash',     'كاش',        Icons.payments_outlined),
    ('transfer', 'تحويل بنكي', Icons.account_balance_outlined),
    ('instapay', 'انستاباي',   Icons.flash_on_outlined),
  ];

  @override
  void dispose() {
    _amountCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountCtrl.text.trim().replaceAll(',', ''));
    if (amount == null || amount <= 0) {
      setState(() => _error = context.l10n.amountInvalid);
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await addIncome(ref.read(dioProvider), {
        'type':          _type,
        'amount':        amount,
        'date':          _date.toIso8601String(),
        'paymentMethod': _paymentMethod,
        if (_noteCtrl.text.trim().isNotEmpty) 'note': _noteCtrl.text.trim(),
      });
      widget.onCreated();
      if (mounted) Navigator.pop(context);
    } catch (_) {
      setState(() { _error = context.l10n.addIncomeFailed; _loading = false; });
    }
  }

  Widget _buildSelectorGrid<T>({
    required List<(T, String, IconData)> items,
    required T selected,
    required void Function(T) onSelect,
  }) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: items.map((t) => GestureDetector(
        onTap: () => onSelect(t.$1),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: (MediaQuery.of(context).size.width - 56) / 2,
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected == t.$1 ? AppColors.green : _kBg,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: selected == t.$1 ? AppColors.green : _kBorder),
          ),
          child: Column(children: [
            Icon(t.$3, size: 20, color: selected == t.$1 ? Colors.white : _kMuted),
            const SizedBox(height: 4),
            Text(t.$2, textAlign: TextAlign.center,
                style: TextStyle(fontFamily: 'Cairo', fontSize: 11,
                    color: selected == t.$1 ? Colors.white : _kText)),
          ]),
        ),
      )).toList(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('d MMMM yyyy', 'ar');
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SheetHandle(),
            Text(context.l10n.addIncomeTitle,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 17, fontWeight: FontWeight.w800, color: _kText)),
            const SizedBox(height: 16),

            // Amount
            _FieldLabel(context.l10n.amountLabel),
            const SizedBox(height: 6),
            TextField(
              controller: _amountCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              textAlign: TextAlign.center,
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.green),
              decoration: InputDecoration(
                hintText: '0.00',
                hintStyle: TextStyle(fontFamily: 'Cairo', fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.green.withValues(alpha: 0.3)),
                filled: true,
                fillColor: AppColors.greenBg,
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),

            // Source type
            const _FieldLabel('مصدر الإيراد'),
            const SizedBox(height: 8),
            _buildSelectorGrid(
              items: _types,
              selected: _type,
              onSelect: (v) => setState(() => _type = v),
            ),
            const SizedBox(height: 16),

            // Payment method
            const _FieldLabel('طريقة الدفع'),
            const SizedBox(height: 8),
            Row(children: _paymentMethods.map((m) => Expanded(
              child: Padding(
                padding: EdgeInsets.only(left: m.$1 == _paymentMethods.last.$1 ? 0 : 8),
                child: GestureDetector(
                  onTap: () => setState(() => _paymentMethod = m.$1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: _paymentMethod == m.$1 ? AppColors.green : _kBg,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: _paymentMethod == m.$1 ? AppColors.green : _kBorder),
                    ),
                    child: Column(children: [
                      Icon(m.$3, size: 20, color: _paymentMethod == m.$1 ? Colors.white : _kMuted),
                      const SizedBox(height: 4),
                      Text(m.$2, textAlign: TextAlign.center,
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 11,
                              color: _paymentMethod == m.$1 ? Colors.white : _kText)),
                    ]),
                  ),
                ),
              ),
            )).toList()),
            const SizedBox(height: 16),

            // Date
            _FieldLabel(context.l10n.dateLabel2),
            const SizedBox(height: 6),
            GestureDetector(
              onTap: _pickDate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                decoration: BoxDecoration(
                  color: _kBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _kBorder),
                ),
                child: Row(children: [
                  const Icon(Icons.calendar_today_outlined, size: 16, color: _kMuted),
                  const SizedBox(width: 8),
                  Text(dateFmt.format(_date),
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kText)),
                ]),
              ),
            ),
            const SizedBox(height: 12),

            // Note
            _FieldLabel(context.l10n.noteOptional),
            const SizedBox(height: 6),
            TextField(
              controller: _noteCtrl,
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kText),
              decoration: InputDecoration(
                hintText: context.l10n.noteHint,
                hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kMuted),
                filled: true,
                fillColor: _kBg,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _kBorder)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _kBorder)),
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: AppColors.red)),
            ],
            const SizedBox(height: 20),

            FilledButton(
              onPressed: _loading ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.green,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _loading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(context.l10n.submitIncome,
                      style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: Colors.white, fontSize: 15)),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Edit Expense sheet ────────────────────────────────────────────────────────

class _EditExpenseSheet extends ConsumerStatefulWidget {
  const _EditExpenseSheet({required this.expense, required this.onUpdated});
  final ExpenseEntry expense;
  final VoidCallback onUpdated;

  @override
  ConsumerState<_EditExpenseSheet> createState() => _EditExpenseSheetState();
}

class _EditExpenseSheetState extends ConsumerState<_EditExpenseSheet> {
  late final TextEditingController _amountCtrl;
  late final TextEditingController _noteCtrl;
  late String   _category;
  late DateTime _date;
  bool     _loading             = false;
  String?  _error;
  String?  _selectedAnimalId;
  String?  _selectedAnimalLabel;

  static const _categories = [
    ('feed',        'علف',     Icons.grass_outlined),
    ('doctor',      'بيطري',   Icons.medical_services_outlined),
    ('transport',   'نقل',     Icons.local_shipping_outlined),
    ('electricity', 'كهرباء',  Icons.bolt_outlined),
    ('salary',      'رواتب',   Icons.people_outline),
    ('rent',        'إيجار',   Icons.home_outlined),
    ('water',       'مياه',    Icons.water_drop_outlined),
    ('maintenance', 'صيانة',   Icons.build_outlined),
    ('other',       'أخرى',    Icons.more_horiz),
  ];

  @override
  void initState() {
    super.initState();
    _amountCtrl          = TextEditingController(text: widget.expense.amount.toStringAsFixed(0));
    _noteCtrl            = TextEditingController(text: widget.expense.note ?? '');
    _category            = widget.expense.category;
    _date                = widget.expense.date;
    _selectedAnimalId    = widget.expense.animalId;
    _selectedAnimalLabel = widget.expense.animalLabel;
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountCtrl.text.trim().replaceAll(',', ''));
    if (amount == null || amount <= 0) {
      setState(() => _error = context.l10n.amountInvalid);
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await updateExpense(ref.read(dioProvider), widget.expense.id, {
        'category': _category,
        'amount':   amount,
        'date':     _date.toIso8601String(),
        if (_noteCtrl.text.trim().isNotEmpty) 'note': _noteCtrl.text.trim(),
        'animalId': _selectedAnimalId,
      });
      widget.onUpdated();
      if (mounted) Navigator.pop(context);
    } catch (_) {
      setState(() { _error = context.l10n.addExpenseFailed; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('d MMMM yyyy', 'ar');
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SheetHandle(),
            const Text('تعديل المصروف',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 17, fontWeight: FontWeight.w800, color: _kText)),
            const SizedBox(height: 16),
            _FieldLabel(context.l10n.amountLabel),
            const SizedBox(height: 6),
            TextField(
              controller: _amountCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              textAlign: TextAlign.center,
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.red),
              decoration: InputDecoration(
                hintText: '0.00',
                hintStyle: TextStyle(fontFamily: 'Cairo', fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.red.withValues(alpha: 0.3)),
                filled: true,
                fillColor: AppColors.redBg,
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),
            _FieldLabel(context.l10n.categoryLabel),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8, runSpacing: 8,
              children: _categories.map((c) => GestureDetector(
                onTap: () => setState(() => _category = c.$1),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _category == c.$1 ? AppColors.red : _kBg,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _category == c.$1 ? AppColors.red : _kBorder),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(c.$3, size: 13, color: _category == c.$1 ? Colors.white : _kMuted),
                    const SizedBox(width: 4),
                    Text(c.$2, style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                        color: _category == c.$1 ? Colors.white : _kText)),
                  ]),
                ),
              )).toList(),
            ),
            const SizedBox(height: 16),
            _FieldLabel(context.l10n.dateLabel2),
            const SizedBox(height: 6),
            GestureDetector(
              onTap: _pickDate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                decoration: BoxDecoration(
                  color: _kBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _kBorder),
                ),
                child: Row(children: [
                  const Icon(Icons.calendar_today_outlined, size: 16, color: _kMuted),
                  const SizedBox(width: 8),
                  Text(dateFmt.format(_date),
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kText)),
                ]),
              ),
            ),
            const SizedBox(height: 12),

            // Animal picker (optional)
            const _FieldLabel('ربط بحيوان (اختياري)'),
            const SizedBox(height: 6),
            _AnimalPickerRow(
              selectedId:    _selectedAnimalId,
              selectedLabel: _selectedAnimalLabel,
              onSelected: (id, label) => setState(() {
                _selectedAnimalId    = id;
                _selectedAnimalLabel = label;
              }),
            ),
            const SizedBox(height: 12),

            _FieldLabel(context.l10n.noteOptional),
            const SizedBox(height: 6),
            TextField(
              controller: _noteCtrl,
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kText),
              decoration: InputDecoration(
                hintText: context.l10n.noteHint,
                hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kMuted),
                filled: true,
                fillColor: _kBg,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _kBorder)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _kBorder)),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: AppColors.red)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _loading ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.red,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _loading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('حفظ التعديلات',
                      style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: Colors.white, fontSize: 15)),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Edit Income sheet ─────────────────────────────────────────────────────────

class _EditIncomeSheet extends ConsumerStatefulWidget {
  const _EditIncomeSheet({required this.entry, required this.onUpdated});
  final IncomeEntry entry;
  final VoidCallback onUpdated;

  @override
  ConsumerState<_EditIncomeSheet> createState() => _EditIncomeSheetState();
}

class _EditIncomeSheetState extends ConsumerState<_EditIncomeSheet> {
  late final TextEditingController _amountCtrl;
  late final TextEditingController _noteCtrl;
  late final TextEditingController _buyerCtrl;
  late String   _type;
  late DateTime _date;
  late String   _paymentStatus;
  late String   _paymentMethod;
  bool     _loading = false;
  String?  _error;

  static const _types = [
    ('sale',  'بيع ماشية',    Icons.storefront_outlined),
    ('dairy', 'منتجات ألبان', Icons.water_drop_outlined),
    ('feed',  'منتجات علف',   Icons.grass_outlined),
    ('other', 'دخل آخر',      Icons.more_horiz),
  ];

  static const _paymentMethods = [
    ('cash',     'كاش',        Icons.payments_outlined),
    ('transfer', 'تحويل بنكي', Icons.account_balance_outlined),
    ('instapay', 'انستاباي',   Icons.flash_on_outlined),
  ];

  @override
  void initState() {
    super.initState();
    _amountCtrl    = TextEditingController(text: widget.entry.amount.toStringAsFixed(0));
    _noteCtrl      = TextEditingController(text: widget.entry.note ?? '');
    _buyerCtrl     = TextEditingController(text: widget.entry.buyerName ?? '');
    _type          = _types.any((t) => t.$1 == widget.entry.type)
                       ? widget.entry.type : 'sale';
    _date          = widget.entry.date;
    _paymentStatus = widget.entry.paymentStatus;
    _paymentMethod = _paymentMethods.any((m) => m.$1 == widget.entry.paymentMethod)
                       ? widget.entry.paymentMethod : 'cash';
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _noteCtrl.dispose();
    _buyerCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountCtrl.text.trim().replaceAll(',', ''));
    if (amount == null || amount <= 0) {
      setState(() => _error = context.l10n.amountInvalid);
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await updateIncome(ref.read(dioProvider), widget.entry.id, {
        'type':          _type,
        'amount':        amount,
        'date':          _date.toIso8601String(),
        'paymentStatus': _paymentStatus,
        'paymentMethod': _paymentMethod,
        if (_noteCtrl.text.trim().isNotEmpty) 'note': _noteCtrl.text.trim(),
        if (_buyerCtrl.text.trim().isNotEmpty) 'buyerName': _buyerCtrl.text.trim(),
      });
      widget.onUpdated();
      if (mounted) Navigator.pop(context);
    } catch (_) {
      setState(() { _error = context.l10n.addIncomeFailed; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('d MMMM yyyy', 'ar');
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SheetHandle(),
            const Text('تعديل الإيراد',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 17, fontWeight: FontWeight.w800, color: _kText)),
            const SizedBox(height: 16),
            _FieldLabel(context.l10n.amountLabel),
            const SizedBox(height: 6),
            TextField(
              controller: _amountCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              textAlign: TextAlign.center,
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.green),
              decoration: InputDecoration(
                hintText: '0.00',
                hintStyle: TextStyle(fontFamily: 'Cairo', fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.green.withValues(alpha: 0.3)),
                filled: true,
                fillColor: AppColors.greenBg,
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),
            const _FieldLabel('مصدر الإيراد'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _types.map((t) => GestureDetector(
                onTap: () => setState(() => _type = t.$1),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  width: (MediaQuery.of(context).size.width - 56) / 2,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: _type == t.$1 ? AppColors.green : _kBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: _type == t.$1 ? AppColors.green : _kBorder),
                  ),
                  child: Column(children: [
                    Icon(t.$3, size: 20, color: _type == t.$1 ? Colors.white : _kMuted),
                    const SizedBox(height: 4),
                    Text(t.$2, textAlign: TextAlign.center,
                        style: TextStyle(fontFamily: 'Cairo', fontSize: 11,
                            color: _type == t.$1 ? Colors.white : _kText)),
                  ]),
                ),
              )).toList(),
            ),
            const SizedBox(height: 16),
            const _FieldLabel('طريقة الدفع'),
            const SizedBox(height: 8),
            Row(children: _paymentMethods.map((m) => Expanded(
              child: Padding(
                padding: EdgeInsets.only(left: m.$1 == _paymentMethods.last.$1 ? 0 : 8),
                child: GestureDetector(
                  onTap: () => setState(() => _paymentMethod = m.$1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: _paymentMethod == m.$1 ? AppColors.green : _kBg,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: _paymentMethod == m.$1 ? AppColors.green : _kBorder),
                    ),
                    child: Column(children: [
                      Icon(m.$3, size: 20, color: _paymentMethod == m.$1 ? Colors.white : _kMuted),
                      const SizedBox(height: 4),
                      Text(m.$2, textAlign: TextAlign.center,
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 11,
                              color: _paymentMethod == m.$1 ? Colors.white : _kText)),
                    ]),
                  ),
                ),
              ),
            )).toList()),
            const SizedBox(height: 16),
            _FieldLabel('حالة الدفع'),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: GestureDetector(
                onTap: () => setState(() => _paymentStatus = 'received'),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: _paymentStatus == 'received' ? AppColors.green : _kBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: _paymentStatus == 'received' ? AppColors.green : _kBorder),
                  ),
                  child: Text('مُستلم', textAlign: TextAlign.center,
                      style: TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w700,
                          color: _paymentStatus == 'received' ? Colors.white : _kText)),
                ),
              )),
              const SizedBox(width: 8),
              Expanded(child: GestureDetector(
                onTap: () => setState(() => _paymentStatus = 'pending'),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: _paymentStatus == 'pending' ? const Color(0xFFF57C00) : _kBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: _paymentStatus == 'pending' ? const Color(0xFFF57C00) : _kBorder),
                  ),
                  child: Text('معلق', textAlign: TextAlign.center,
                      style: TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w700,
                          color: _paymentStatus == 'pending' ? Colors.white : _kText)),
                ),
              )),
            ]),
            const SizedBox(height: 16),
            _FieldLabel('اسم المشتري (اختياري)'),
            const SizedBox(height: 6),
            TextField(
              controller: _buyerCtrl,
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kText),
              decoration: InputDecoration(
                hintText: 'اسم العميل',
                hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kMuted),
                filled: true,
                fillColor: _kBg,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _kBorder)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _kBorder)),
              ),
            ),
            const SizedBox(height: 12),
            _FieldLabel(context.l10n.dateLabel2),
            const SizedBox(height: 6),
            GestureDetector(
              onTap: _pickDate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                decoration: BoxDecoration(
                  color: _kBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _kBorder),
                ),
                child: Row(children: [
                  const Icon(Icons.calendar_today_outlined, size: 16, color: _kMuted),
                  const SizedBox(width: 8),
                  Text(dateFmt.format(_date),
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kText)),
                ]),
              ),
            ),
            const SizedBox(height: 12),
            _FieldLabel(context.l10n.noteOptional),
            const SizedBox(height: 6),
            TextField(
              controller: _noteCtrl,
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kText),
              decoration: InputDecoration(
                hintText: context.l10n.noteHint,
                hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kMuted),
                filled: true,
                fillColor: _kBg,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _kBorder)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _kBorder)),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: AppColors.red)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _loading ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.green,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _loading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('حفظ التعديلات',
                      style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: Colors.white, fontSize: 15)),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Animal picker row ─────────────────────────────────────────────────────────

class _AnimalPickerRow extends ConsumerWidget {
  const _AnimalPickerRow({
    required this.selectedId,
    required this.selectedLabel,
    required this.onSelected,
  });
  final String? selectedId;
  final String? selectedLabel;
  final void Function(String? id, String? label) onSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () => _openPicker(context, ref),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: _kBg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: selectedId != null ? AppColors.green : _kBorder),
        ),
        child: Row(children: [
          Icon(Icons.pets_outlined, size: 16,
              color: selectedId != null ? AppColors.green : _kMuted),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              selectedLabel ?? 'اختر حيوان (اختياري)',
              style: TextStyle(
                fontFamily: 'Cairo', fontSize: 13,
                color: selectedId != null ? _kText : _kMuted,
              ),
            ),
          ),
          if (selectedId != null)
            GestureDetector(
              onTap: () => onSelected(null, null),
              child: const Icon(Icons.close_rounded, size: 16, color: _kMuted),
            )
          else
            const Icon(Icons.chevron_left_rounded, size: 18, color: _kMuted),
        ]),
      ),
    );
  }

  void _openPicker(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _AnimalPickerSheet(
        onSelected: (id, label) {
          Navigator.pop(context);
          onSelected(id, label);
        },
      ),
    );
  }
}

class _AnimalPickerSheet extends ConsumerStatefulWidget {
  const _AnimalPickerSheet({required this.onSelected});
  final void Function(String id, String label) onSelected;

  @override
  ConsumerState<_AnimalPickerSheet> createState() => _AnimalPickerSheetState();
}

class _AnimalPickerSheetState extends ConsumerState<_AnimalPickerSheet> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final asyncAnimals = ref.watch(sellerAnimalsProvider);
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      builder: (_, ctrl) => Column(children: [
        const SizedBox(height: 8),
        Container(width: 36, height: 4, decoration: BoxDecoration(color: _kBorder, borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: TextField(
            autofocus: true,
            onChanged: (v) => setState(() => _search = v),
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
            decoration: InputDecoration(
              hintText: 'ابحث برقم الوسم أو النوع...',
              hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: _kMuted),
              prefixIcon: const Icon(Icons.search_rounded, size: 18),
              filled: true,
              fillColor: _kBg,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: asyncAnimals.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error:   (_, __) => const Center(child: Text('فشل تحميل الحيوانات', style: TextStyle(fontFamily: 'Cairo'))),
            data: (animals) {
              final filtered = _search.isEmpty
                  ? animals
                  : animals.where((a) => a.label.contains(_search)).toList();
              if (filtered.isEmpty) {
                return const Center(child: Text('لا توجد نتائج', style: TextStyle(fontFamily: 'Cairo', color: _kMuted)));
              }
              return ListView.separated(
                controller: ctrl,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                itemCount: filtered.length,
                separatorBuilder: (_, __) => const Divider(height: 1, color: _kDivider),
                itemBuilder: (_, i) {
                  final a = filtered[i];
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    leading: Container(
                      width: 34, height: 34,
                      decoration: BoxDecoration(color: AppColors.green.withValues(alpha: 0.1), shape: BoxShape.circle),
                      child: const Icon(Icons.pets_outlined, size: 16, color: AppColors.green),
                    ),
                    title: Text(a.label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.w600)),
                    onTap: () => widget.onSelected(a.id, a.label),
                  );
                },
              );
            },
          ),
        ),
      ]),
    );
  }
}

// ── Shared sheet widgets ──────────────────────────────────────────────────────

class _SheetHandle extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Center(
    child: Container(
      margin: const EdgeInsets.symmetric(vertical: 12),
      width: 40, height: 4,
      decoration: BoxDecoration(color: _kDivider, borderRadius: BorderRadius.circular(2)),
    ),
  );
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w600, color: _kMuted),
  );
}

// ── Budget tab ────────────────────────────────────────────────────────────────

class _BudgetTab extends ConsumerStatefulWidget {
  const _BudgetTab();

  @override
  ConsumerState<_BudgetTab> createState() => _BudgetTabState();
}

class _BudgetTabState extends ConsumerState<_BudgetTab> {
  int _selectedMonth = DateTime.now().month; // 1-based
  final int _currentYear = DateTime.now().year;
  String _otherLabel = 'أخرى';

  static const _prefKeyOtherLabel = 'budget_other_label';

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((prefs) {
      final saved = prefs.getString(_prefKeyOtherLabel);
      if (saved != null && saved.isNotEmpty && mounted) {
        setState(() => _otherLabel = saved);
      }
    });
  }

  Future<void> _renameOther() async {
    final ctrl = TextEditingController(text: _otherLabel == 'أخرى' ? '' : _otherLabel);
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('تسمية فئة "أخرى"',
            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, color: _kText, fontSize: 16)),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          textAlign: TextAlign.right,
          style: const TextStyle(fontFamily: 'Cairo', fontSize: 16, color: _kText),
          decoration: InputDecoration(
            hintText: 'مثال: مصاريف تسويق',
            hintStyle: TextStyle(fontFamily: 'Cairo', color: _kMuted.withValues(alpha: 0.5)),
            filled: true,
            fillColor: _kBg,
            contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _kBorder)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: _kBorder)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.green, width: 2)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo', color: _kMuted)),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, ctrl.text.trim().isEmpty ? 'أخرى' : ctrl.text.trim()),
            style: FilledButton.styleFrom(backgroundColor: AppColors.green, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
            child: const Text('حفظ', style: TextStyle(fontFamily: 'Cairo', color: Colors.white, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    ctrl.dispose();
    if (result == null || !mounted) return;
    setState(() => _otherLabel = result);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKeyOtherLabel, result);
  }

  static const _monthNames = [
    '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ];

  static const _categories = [
    ('feed',        'علف',     Icons.grass_outlined,            Color(0xFF22C55E)),
    ('doctor',      'بيطري',   Icons.medical_services_outlined, Color(0xFFEF4444)),
    ('transport',   'نقل',     Icons.local_shipping_outlined,   Color(0xFF3B82F6)),
    ('electricity', 'كهرباء',  Icons.bolt_outlined,             Color(0xFFF59E0B)),
    ('salary',      'رواتب',   Icons.people_outline,            Color(0xFF8B5CF6)),
    ('rent',        'إيجار',   Icons.home_outlined,             Color(0xFF06B6D4)),
    ('water',       'مياه',    Icons.water_drop_outlined,       Color(0xFF0EA5E9)),
    ('maintenance', 'صيانة',   Icons.build_outlined,            Color(0xFF6B7280)),
    ('other',       'أخرى',    Icons.more_horiz,               Color(0xFFD97706)),
  ];

  Future<void> _editBudget(String category, String categoryAr, double current) async {
    final ctrl = TextEditingController(
        text: current > 0 ? current.toStringAsFixed(0) : '');
    final result = await showDialog<double>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          context.l10n.editBudgetTitle(categoryAr),
          style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, color: _kText, fontSize: 16),
        ),
        content: TextField(
          controller: ctrl,
          keyboardType: const TextInputType.numberWithOptions(decimal: false),
          autofocus: true,
          textAlign: TextAlign.center,
          style: const TextStyle(fontFamily: 'Cairo', fontSize: 22, fontWeight: FontWeight.w800, color: _kText),
          decoration: InputDecoration(
            hintText: '0',
            hintStyle: TextStyle(fontFamily: 'Cairo', fontSize: 22, color: _kMuted.withValues(alpha: 0.4)),
            suffixText: 'ج.م',
            suffixStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 14, color: _kMuted),
            filled: true,
            fillColor: _kBg,
            contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: _kBorder)),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: _kBorder)),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.green, width: 2)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(context.l10n.cancel, style: const TextStyle(fontFamily: 'Cairo', color: _kMuted)),
          ),
          FilledButton(
            onPressed: () {
              final v = double.tryParse(ctrl.text.trim().replaceAll(',', ''));
              if (v != null && v >= 0) Navigator.pop(ctx, v);
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.green,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text(context.l10n.save,
                style: const TextStyle(fontFamily: 'Cairo', color: Colors.white, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    ctrl.dispose();
    if (result == null || !mounted) return;
    try {
      await upsertBudget(
        ref.read(dioProvider),
        year: _currentYear,
        month: _selectedMonth,
        category: category,
        targetAmount: result,
      );
      ref.invalidate(currentYearBudgetProvider);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final asyncStatements = ref.watch(currentYearStatementsProvider);
    final asyncBudget     = ref.watch(currentYearBudgetProvider);

    // Actuals for selected month (month is 0-based in statements, 1-based in _selectedMonth)
    StatementMonth? stmt;
    final stmtList = asyncStatements.valueOrNull;
    if (stmtList != null) {
      for (final s in stmtList) {
        if (s.month == _selectedMonth - 1) { stmt = s; break; }
      }
    }

    // Budget targets for selected month (1-based)
    final budgets = asyncBudget.valueOrNull ?? [];
    final budgetMap = <String, double>{
      for (final b in budgets.where((b) => b.month == _selectedMonth))
        b.category: b.targetAmount,
    };

    final fmt          = NumberFormat('#,##0', 'ar');
    final totalActual  = stmt?.totalExpenses ?? 0.0;
    final totalTarget  = budgetMap.values.fold(0.0, (a, b) => a + b);
    final isLoading    = asyncStatements.isLoading || asyncBudget.isLoading;

    return RefreshIndicator(
      color: AppColors.green,
      onRefresh: () async {
        ref.invalidate(currentYearStatementsProvider);
        ref.invalidate(currentYearBudgetProvider);
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        children: [
          // Month selector
          _MonthSelector(
            selected: _selectedMonth,
            onChanged: (m) => setState(() => _selectedMonth = m),
          ),
          const SizedBox(height: 14),

          if (isLoading) ...[
            const ShimmerCard(height: 90),
            const SizedBox(height: 12),
            const ShimmerList(count: 5, cardHeight: 72),
          ] else ...[
            // Summary header
            _BudgetSummaryHeader(
              actual: totalActual,
              budgeted: totalTarget,
              fmt: fmt,
            ),
            const SizedBox(height: 14),

            _SectionHeader(title: context.l10n.budgetFor(_monthNames[_selectedMonth])),
            const SizedBox(height: 10),

            Container(
              decoration: BoxDecoration(
                color: _kCard,
                borderRadius: BorderRadius.circular(12),
                boxShadow: const [
                  BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2)),
                ],
              ),
              child: Column(
                children: List.generate(_categories.length, (i) {
                  final cat       = _categories[i];
                  final isOther   = cat.$1 == 'other';
                  final label     = isOther ? _otherLabel : cat.$2;
                  final actual    = stmt?.expenses[cat.$1] ?? 0.0;
                  final target    = budgetMap[cat.$1] ?? 0.0;
                  return _BudgetRow(
                    categoryAr: label,
                    icon:       cat.$3,
                    color:      cat.$4,
                    actual:     actual,
                    target:     target,
                    fmt:        fmt,
                    isLast:     i == _categories.length - 1,
                    onEdit:     () => _editBudget(cat.$1, label, target),
                    onRename:   isOther ? _renameOther : null,
                  );
                }),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ── Month selector chip row ───────────────────────────────────────────────────

class _MonthSelector extends StatelessWidget {
  const _MonthSelector({required this.selected, required this.onChanged});
  final int selected;
  final void Function(int) onChanged;

  static const _months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ];

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 34,
    child: ListView.builder(
      scrollDirection: Axis.horizontal,
      itemCount: 12,
      itemBuilder: (_, i) {
        final month      = i + 1;
        final isSelected = month == selected;
        return GestureDetector(
          onTap: () => onChanged(month),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            margin: const EdgeInsets.only(left: 6),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: isSelected ? AppColors.green : _kCard,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: isSelected ? AppColors.green : _kBorder),
            ),
            child: Text(
              _months[i],
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: isSelected ? Colors.white : _kMuted,
              ),
            ),
          ),
        );
      },
    ),
  );
}

// ── Budget summary header ─────────────────────────────────────────────────────

class _BudgetSummaryHeader extends StatelessWidget {
  const _BudgetSummaryHeader({
    required this.actual,
    required this.budgeted,
    required this.fmt,
  });
  final double actual;
  final double budgeted;
  final NumberFormat fmt;

  @override
  Widget build(BuildContext context) {
    final hasTarget = budgeted > 0;
    final pct       = hasTarget ? (actual / budgeted).clamp(0.0, 1.5) : 0.0;
    final over      = hasTarget && actual > budgeted;
    final color     = over ? AppColors.red : AppColors.green;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _kCard,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Column(children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(context.l10n.actualSpending,
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: _kMuted)),
              Text('${fmt.format(actual)} ج.م',
                  style: TextStyle(
                    fontFamily: 'Cairo', fontSize: 18, fontWeight: FontWeight.w800, color: color)),
            ]),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(context.l10n.totalBudget,
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: _kMuted)),
              Text(
                hasTarget ? '${fmt.format(budgeted)} ج.م' : context.l10n.notSet,
                style: TextStyle(
                  fontFamily: 'Cairo', fontSize: 18, fontWeight: FontWeight.w800,
                  color: hasTarget ? _kText : _kMuted,
                ),
              ),
            ]),
          ],
        ),
        if (hasTarget) ...[
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: pct.clamp(0.0, 1.0),
              backgroundColor: color.withValues(alpha: 0.12),
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 6),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(
              over
                  ? context.l10n.budgetExceededBy(fmt.format(actual - budgeted))
                  : context.l10n.remaining(fmt.format(budgeted - actual)),
              style: TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w700, color: color),
            ),
            Text(
              '${(pct * 100).toStringAsFixed(0)}%',
              style: TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w700, color: color),
            ),
          ]),
        ],
      ]),
    );
  }
}

// ── Budget row (per category) ─────────────────────────────────────────────────

class _BudgetRow extends StatelessWidget {
  const _BudgetRow({
    required this.categoryAr,
    required this.icon,
    required this.color,
    required this.actual,
    required this.target,
    required this.fmt,
    required this.isLast,
    required this.onEdit,
    this.onRename,
  });
  final String categoryAr;
  final IconData icon;
  final Color color;
  final double actual;
  final double target;
  final NumberFormat fmt;
  final bool isLast;
  final VoidCallback onEdit;
  final VoidCallback? onRename;

  @override
  Widget build(BuildContext context) {
    final hasTarget = target > 0;
    final pct       = hasTarget ? (actual / target).clamp(0.0, 1.5) : 0.0;
    final over      = hasTarget && actual > target;
    final barColor  = over ? AppColors.red : color;

    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
              child: Icon(icon, size: 15, color: color),
            ),
            const SizedBox(width: 10),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onTap: onRename,
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Text(categoryAr,
                        style: const TextStyle(
                            fontFamily: 'Cairo', fontSize: 13,
                            fontWeight: FontWeight.w700, color: _kText)),
                    if (onRename != null) ...[
                      const SizedBox(width: 4),
                      Icon(Icons.edit_outlined, size: 12, color: _kMuted.withValues(alpha: 0.6)),
                    ],
                  ]),
                ),
                Text(
                  hasTarget
                      ? '${fmt.format(actual)} / ${fmt.format(target)} ج.م'
                      : actual > 0
                          ? '${fmt.format(actual)} ج.م  (${context.l10n.noTarget})'
                          : context.l10n.noSpending,
                  style: const TextStyle(
                      fontFamily: 'Cairo', fontSize: 11, color: _kMuted),
                ),
              ],
            )),
            if (over)
              Container(
                margin: const EdgeInsets.only(left: 4),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.redBg,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(context.l10n.budgetExceeded,
                    style: const TextStyle(
                        fontFamily: 'Cairo', fontSize: 10,
                        fontWeight: FontWeight.w700, color: AppColors.red)),
              ),
            const SizedBox(width: 6),
            GestureDetector(
              onTap: onEdit,
              child: Container(
                width: 30, height: 30,
                decoration: BoxDecoration(
                  color: _kBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: _kBorder),
                ),
                child: const Icon(Icons.edit_outlined, size: 14, color: _kMuted),
              ),
            ),
          ]),
          if (hasTarget || actual > 0) ...[
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: pct.clamp(0.0, 1.0),
                backgroundColor: barColor.withValues(alpha: 0.12),
                valueColor: AlwaysStoppedAnimation<Color>(barColor),
                minHeight: 5,
              ),
            ),
          ],
        ]),
      ),
      if (!isLast)
        const Divider(height: 1, thickness: 1, indent: 16, endIndent: 16, color: _kDivider),
    ]);
  }
}

// ── Add choice card (expense / income picker) ─────────────────────────────────

class _AddChoiceCard extends StatelessWidget {
  const _AddChoiceCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.bg,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final Color color;
  final Color bg;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 22),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(children: [
        Icon(icon, size: 28, color: color),
        const SizedBox(height: 8),
        Text(label,
            style: TextStyle(fontFamily: 'Cairo', fontSize: 15,
                fontWeight: FontWeight.w800, color: color)),
      ]),
    ),
  );
}

// ── Public helpers — callable from any screen ─────────────────────────────────

/// Opens the expense add form from any screen context.
void showAddExpenseSheet(
  BuildContext context, {
  required VoidCallback onCreated,
}) =>
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: _kCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _AddExpenseSheet(onCreated: onCreated),
    );

/// Opens the income add form from any screen context.
void showAddIncomeSheet(
  BuildContext context, {
  required VoidCallback onCreated,
}) =>
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: _kCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _AddIncomeSheet(onCreated: onCreated),
    );
