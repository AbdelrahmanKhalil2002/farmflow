import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/shimmer_widget.dart';

// ── Design tokens ─────────────────────────────────────────────────────────────

const _kCellW      = 90.0;  // month column width
const _kLabelW     = 130.0; // fixed category column width
const _kRowH       = 52.0;  // row height
const _kHeaderH    = 44.0;  // header row height
const _kBorderSide = BorderSide(color: Color(0xFFE5E5DC));

// ── Category metadata ─────────────────────────────────────────────────────────

class _CatMeta {
  final String key;
  final String label;
  final String emoji;
  final bool isIncome;

  const _CatMeta({
    required this.key,
    required this.label,
    required this.emoji,
    this.isIncome = false,
  });
}

const _kCategories = <_CatMeta>[
  _CatMeta(key: 'feed',          label: 'علف',      emoji: '🌾'),
  _CatMeta(key: 'doctor',        label: 'بيطري',    emoji: '🩺'),
  _CatMeta(key: 'transport',     label: 'نقل',      emoji: '🚛'),
  _CatMeta(key: 'electricity',   label: 'كهرباء',   emoji: '⚡'),
  _CatMeta(key: 'salary',        label: 'رواتب',    emoji: '👷'),
  _CatMeta(key: 'rent',          label: 'إيجار',    emoji: '🏠'),
  _CatMeta(key: 'water',         label: 'مياه',     emoji: '💧'),
  _CatMeta(key: 'maintenance',   label: 'صيانة',    emoji: '🔧'),
  _CatMeta(key: 'other',         label: 'أخرى',     emoji: '📦'),
  _CatMeta(key: 'income',        label: 'دخل',      emoji: '💰', isIncome: true),
];

const _kMonthNames = <String>[
  'يناير', 'فبراير', 'مارس',    'أبريل',
  'مايو',  'يونيو',  'يوليو',   'أغسطس',
  'سبتمبر','أكتوبر', 'نوفمبر',  'ديسمبر',
];

// ── Budget entry model ────────────────────────────────────────────────────────

class _BudgetEntry {
  final String  category;
  final int     year;
  final int     month;   // 1-based
  final double  budgeted;
  final double  actual;

  const _BudgetEntry({
    required this.category,
    required this.year,
    required this.month,
    required this.budgeted,
    this.actual = 0,
  });

  factory _BudgetEntry.fromJson(Map<String, dynamic> json) => _BudgetEntry(
    category: json['category'] as String? ?? 'other',
    year:     (json['year']  as num?)?.toInt()    ?? DateTime.now().year,
    month:    (json['month'] as num?)?.toInt()    ?? 1,
    budgeted: (json['budgeted']     as num?)?.toDouble() ??
              (json['targetAmount'] as num?)?.toDouble() ?? 0,
    actual:   (json['actual'] as num?)?.toDouble() ?? 0,
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

/// Returns a nested map: category → month(1-based) → budgeted amount.
final budgetProvider = FutureProvider.family<Map<String, Map<int, double>>, int>(
  (ref, year) async {
    final dio = ref.watch(dioProvider);
    final res = await dio.get(
      ApiEndpoints.budget,
      queryParameters: {'year': year},
    );

    // API may return a List or a Map — handle both gracefully.
    final List<dynamic> entries;
    if (res.data is List) {
      entries = res.data as List<dynamic>;
    } else if (res.data is Map) {
      // Some backends return { category: { month: amount } } maps directly.
      final raw = res.data as Map<String, dynamic>;
      final out = <String, Map<int, double>>{};
      for (final cat in raw.keys) {
        final inner = raw[cat];
        if (inner is Map) {
          out[cat] = inner.map(
            (k, v) => MapEntry(int.tryParse(k.toString()) ?? 0,
                               (v as num?)?.toDouble() ?? 0),
          );
        }
      }
      return out;
    } else {
      entries = [];
    }

    // Build category → month → budgeted
    final result = <String, Map<int, double>>{};
    for (final raw in entries) {
      if (raw is! Map<String, dynamic>) continue;
      final entry = _BudgetEntry.fromJson(raw);
      result.putIfAbsent(entry.category, () => {});
      result[entry.category]![entry.month] = entry.budgeted;
    }
    return result;
  },
);

// ── Screen ────────────────────────────────────────────────────────────────────

class SellerBudgetScreen extends ConsumerStatefulWidget {
  const SellerBudgetScreen({super.key});

  @override
  ConsumerState<SellerBudgetScreen> createState() => _SellerBudgetScreenState();
}

class _SellerBudgetScreenState extends ConsumerState<SellerBudgetScreen> {
  late int _selectedYear;

  // Local cache of edits: category → month → amount.
  // Starts empty; populated from the provider response and updated on save.
  final Map<String, Map<int, double>> _localBudget = {};

  // Track cells currently being saved (to show a spinner).
  final Set<String> _saving = {};

  // Horizontal scroll controller shared between the header row and body rows.
  final ScrollController _headerScroll   = ScrollController();
  final ScrollController _bodyHScroll    = ScrollController();

  @override
  void initState() {
    super.initState();
    _selectedYear = DateTime.now().year;
    // Sync header and body horizontal scrolling.
    _bodyHScroll.addListener(() {
      if (_headerScroll.hasClients &&
          _headerScroll.offset != _bodyHScroll.offset) {
        _headerScroll.jumpTo(_bodyHScroll.offset);
      }
    });
  }

  @override
  void dispose() {
    _headerScroll.dispose();
    _bodyHScroll.dispose();
    super.dispose();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  String _cellKey(String cat, int month) => '$cat:$month';

  double _cellValue(String cat, int month) =>
      _localBudget[cat]?[month] ?? 0;

  void _mergeServerData(Map<String, Map<int, double>> serverData) {
    for (final cat in serverData.keys) {
      _localBudget.putIfAbsent(cat, () => {});
      serverData[cat]!.forEach((month, amount) {
        _localBudget[cat]![month] = amount;
      });
    }
  }

  // ── Save (PUT /budget) ─────────────────────────────────────────────────────

  Future<void> _saveCell(String cat, int month, double value) async {
    final key = _cellKey(cat, month);
    setState(() => _saving.add(key));
    try {
      final dio = ref.read(dioProvider);
      await dio.put(ApiEndpoints.budget, data: {
        'category': cat,
        'year':     _selectedYear,
        'month':    month,
        'budgeted': value,
      });
      // Update local cache on success.
      _localBudget.putIfAbsent(cat, () => {});
      _localBudget[cat]![month] = value;
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'فشل الحفظ. حاول مجدداً.',
              style: TextStyle(fontFamily: 'Cairo'),
            ),
            backgroundColor: AppColors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving.remove(key));
    }
  }

  // ── Edit dialog ────────────────────────────────────────────────────────────

  Future<void> _showEditDialog({
    required String catKey,
    required String catLabel,
    required int month,
  }) async {
    final current = _cellValue(catKey, month);
    final ctrl = TextEditingController(
      text: current == 0 ? '' : current.toStringAsFixed(0),
    );

    final result = await showDialog<double?>(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          backgroundColor: AppColors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: Text(
            '$catLabel — ${_kMonthNames[month - 1]}',
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1A2E1A),
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'القيمة المخططة (ج.م)',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 13,
                  color: Color(0xFF9CA3AF),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: ctrl,
                autofocus: true,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[\d.]')),
                ],
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1A2E1A),
                ),
                decoration: InputDecoration(
                  hintText: '0',
                  suffixText: 'ج.م',
                  suffixStyle: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 14,
                    color: Color(0xFF9CA3AF),
                  ),
                  filled: true,
                  fillColor: AppColors.bg,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE5E5DC)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: AppColors.green, width: 2),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE5E5DC)),
                  ),
                ),
              ),
            ],
          ),
          actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, null),
              child: const Text(
                'إلغاء',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: Color(0xFF9CA3AF),
                ),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.green,
                foregroundColor: AppColors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
              onPressed: () {
                final v = double.tryParse(ctrl.text.trim());
                Navigator.pop(ctx, v);
              },
              child: const Text(
                'حفظ',
                style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
    );

    ctrl.dispose();
    if (result != null && result >= 0) {
      await _saveCell(catKey, month, result);
    }
  }

  // ── Year selector ──────────────────────────────────────────────────────────

  Widget _buildYearSelector() {
    final currentYear = DateTime.now().year;
    final years = [currentYear - 1, currentYear, currentYear + 1];

    return Container(
      color: AppColors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Row(
        children: years.map((y) {
          final selected = y == _selectedYear;
          return Expanded(
            child: GestureDetector(
              onTap: () {
                if (_selectedYear == y) return;
                setState(() {
                  _selectedYear = y;
                  _localBudget.clear();
                });
                ref.invalidate(budgetProvider(y));
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(bottom: 0),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: selected ? AppColors.green : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$y',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: selected ? AppColors.white : const Color(0xFF9CA3AF),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ── Table header row ───────────────────────────────────────────────────────

  Widget _buildTableHeader() {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(bottom: _kBorderSide),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Fixed label column header
          Container(
            width: _kLabelW,
            height: _kHeaderH,
            decoration: const BoxDecoration(
              color: AppColors.white,
              border: Border(left: _kBorderSide),
            ),
            alignment: Alignment.centerRight,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: const Text(
              'الفئة',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1A2E1A),
              ),
            ),
          ),
          // Scrollable month headers
          Expanded(
            child: SingleChildScrollView(
              controller: _headerScroll,
              scrollDirection: Axis.horizontal,
              physics: const NeverScrollableScrollPhysics(),
              child: Row(
                children: List.generate(12, (i) {
                  return Container(
                    width: _kCellW,
                    height: _kHeaderH,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8F4EE),
                      border: Border(
                        right: i < 11
                            ? _kBorderSide
                            : BorderSide.none,
                      ),
                    ),
                    child: Text(
                      _kMonthNames[i],
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1A2E1A),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Single category row ────────────────────────────────────────────────────

  Widget _buildCategoryRow(_CatMeta meta, bool isLast) {
    final bgColor = meta.isIncome
        ? const Color(0xFFDCFCE7)   // green tint for income
        : AppColors.white;

    return Container(
      height: _kRowH,
      decoration: BoxDecoration(
        color: bgColor,
        border: Border(
          bottom: isLast ? BorderSide.none : _kBorderSide,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Fixed label cell
          Container(
            width: _kLabelW,
            decoration: const BoxDecoration(
              border: Border(left: _kBorderSide),
            ),
            alignment: Alignment.centerRight,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  meta.label,
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: meta.isIncome
                        ? const Color(0xFF166534)
                        : const Color(0xFF1A2E1A),
                  ),
                ),
                const SizedBox(width: 4),
                Text(meta.emoji, style: const TextStyle(fontSize: 14)),
              ],
            ),
          ),
          // Scrollable month cells
          Expanded(
            child: SingleChildScrollView(
              controller: _bodyHScroll,
              scrollDirection: Axis.horizontal,
              child: Row(
                children: List.generate(12, (i) {
                  final month = i + 1;
                  final key   = _cellKey(meta.key, month);
                  final isSaving = _saving.contains(key);
                  final value    = _cellValue(meta.key, month);
                  final hasValue = value > 0;

                  return GestureDetector(
                    onTap: isSaving
                        ? null
                        : () => _showEditDialog(
                              catKey:   meta.key,
                              catLabel: meta.label,
                              month:    month,
                            ),
                    child: Container(
                      width: _kCellW,
                      height: _kRowH,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: isSaving
                            ? AppColors.grey100
                            : (meta.isIncome && hasValue
                                ? const Color(0xFFDCFCE7)
                                : (!meta.isIncome && hasValue
                                    ? AppColors.white
                                    : Colors.transparent)),
                        border: Border(
                          right: i < 11
                              ? _kBorderSide
                              : BorderSide.none,
                        ),
                      ),
                      child: isSaving
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(
                                strokeWidth: 1.8,
                                valueColor: AlwaysStoppedAnimation(
                                    AppColors.green),
                              ),
                            )
                          : hasValue
                              ? Text(
                                  _formatAmount(value),
                                  style: TextStyle(
                                    fontFamily: 'Cairo',
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: meta.isIncome
                                        ? const Color(0xFF166534)
                                        : const Color(0xFF1A2E1A),
                                  ),
                                )
                              : Icon(
                                  Icons.add,
                                  size: 14,
                                  color: const Color(0xFF9CA3AF)
                                      .withValues(alpha: 0.5),
                                ),
                    ),
                  );
                }),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.table_chart_outlined,
            size: 64,
            color: const Color(0xFF9CA3AF).withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          const Text(
            'لا توجد بيانات للميزانية',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: Color(0xFF9CA3AF),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'ابدأ بإضافة قيم عبر النقر على أي خلية',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 13,
              color: Color(0xFF9CA3AF),
            ),
          ),
        ],
      ),
    );
  }

  // ── Shimmer skeleton ───────────────────────────────────────────────────────

  Widget _buildShimmer() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: List.generate(
          _kCategories.length,
          (_) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: ShimmerBox(
              width: double.infinity,
              height: _kRowH,
              borderRadius: 8,
            ),
          ),
        ),
      ),
    );
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final asyncData = ref.watch(budgetProvider(_selectedYear));

    // Once data arrives, merge into local cache (without clobbering pending edits).
    asyncData.whenData((serverData) {
      if (_localBudget.isEmpty) {
        _mergeServerData(serverData);
      }
    });

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.bg,
        appBar: AppBar(
          title: const Text(
            'ميزانية المزرعة',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.white,
            ),
          ),
          backgroundColor: AppColors.green,
          foregroundColor: AppColors.white,
          elevation: 0,
          centerTitle: true,
          actions: [
            if (asyncData.isLoading)
              const Padding(
                padding: EdgeInsets.only(left: 16),
                child: Center(
                  child: SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation(AppColors.white),
                    ),
                  ),
                ),
              )
            else
              IconButton(
                icon: const Icon(Icons.refresh_rounded),
                tooltip: 'تحديث',
                onPressed: () {
                  _localBudget.clear();
                  ref.invalidate(budgetProvider(_selectedYear));
                },
              ),
          ],
        ),
        body: Column(
          children: [
            // ── Year tabs ────────────────────────────────────────────────────
            _buildYearSelector(),

            // ── Subtle divider ───────────────────────────────────────────────
            const Divider(height: 1, thickness: 1, color: Color(0xFFE5E5DC)),

            // ── Table header ─────────────────────────────────────────────────
            _buildTableHeader(),

            // ── Table body ───────────────────────────────────────────────────
            Expanded(
              child: asyncData.when(
                loading: _buildShimmer,
                error: (e, _) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline,
                            size: 48, color: AppColors.red),
                        const SizedBox(height: 12),
                        Text(
                          'حدث خطأ أثناء تحميل الميزانية',
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1A2E1A),
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        OutlinedButton.icon(
                          onPressed: () {
                            _localBudget.clear();
                            ref.invalidate(budgetProvider(_selectedYear));
                          },
                          icon: const Icon(Icons.refresh_rounded,
                              color: AppColors.green),
                          label: const Text(
                            'إعادة المحاولة',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              color: AppColors.green,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.green),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                data: (serverData) {
                  // Merge on first paint if cache is still empty.
                  if (_localBudget.isEmpty && serverData.isNotEmpty) {
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      if (mounted) setState(() => _mergeServerData(serverData));
                    });
                  }

                  final hasAnyData = serverData.isNotEmpty ||
                      _localBudget.values.any((m) => m.isNotEmpty);

                  return hasAnyData
                      ? _buildTable()
                      : Column(
                          children: [
                            Expanded(child: _buildEmptyState()),
                          ],
                        );
                },
              ),
            ),

            // ── Legend footer ─────────────────────────────────────────────────
            _buildLegend(),
          ],
        ),
      ),
    );
  }

  // ── Scrollable table body ──────────────────────────────────────────────────

  Widget _buildTable() {
    return ListView.builder(
      padding: EdgeInsets.zero,
      itemCount: _kCategories.length,
      itemBuilder: (_, idx) {
        final meta   = _kCategories[idx];
        final isLast = idx == _kCategories.length - 1;
        return _buildCategoryRow(meta, isLast);
      },
    );
  }

  // ── Legend ─────────────────────────────────────────────────────────────────

  Widget _buildLegend() {
    return Container(
      color: AppColors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: const Row(
        children: [
          _LegendDot(color: Color(0xFFDCFCE7), label: 'دخل'),
          SizedBox(width: 16),
          _LegendDot(color: AppColors.white, label: 'مصروفات'),
          SizedBox(width: 16),
          Icon(Icons.touch_app_rounded, size: 14, color: Color(0xFF9CA3AF)),
          SizedBox(width: 4),
          Text(
            'اضغط على الخلية للتعديل',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 11,
              color: Color(0xFF9CA3AF),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Legend dot widget ─────────────────────────────────────────────────────────

class _LegendDot extends StatelessWidget {
  final Color  color;
  final String label;

  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
            border: Border.all(color: const Color(0xFFE5E5DC)),
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Cairo',
            fontSize: 11,
            color: Color(0xFF9CA3AF),
          ),
        ),
      ],
    );
  }
}

// ── Amount formatter ──────────────────────────────────────────────────────────

String _formatAmount(double v) {
  if (v >= 1000000) {
    return '${(v / 1000000).toStringAsFixed(1)}م';
  } else if (v >= 1000) {
    return '${(v / 1000).toStringAsFixed(1)}ك';
  }
  // Show as integer if no fractional part, else 1 decimal.
  return v == v.truncateToDouble()
      ? v.toInt().toString()
      : v.toStringAsFixed(1);
}
