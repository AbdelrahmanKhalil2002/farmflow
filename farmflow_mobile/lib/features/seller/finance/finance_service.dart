import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

// ── Finance summary ───────────────────────────────────────────────────────────

class FinanceSummary {
  final double totalIncome;
  final double totalExpenses;
  final double netProfit;
  final List<MonthlyPoint> monthly; // last 6 months

  const FinanceSummary({
    required this.totalIncome,
    required this.totalExpenses,
    required this.netProfit,
    this.monthly = const [],
  });

  factory FinanceSummary.fromJson(Map<String, dynamic> json) {
    final rawMonthly = json['monthly'] as List? ?? [];
    return FinanceSummary(
      totalIncome:    (json['totalIncome']    as num?)?.toDouble() ?? 0,
      totalExpenses:  (json['totalExpenses']  as num?)?.toDouble() ?? 0,
      netProfit:      (json['netProfit']      as num?)?.toDouble() ?? 0,
      monthly: rawMonthly
          .map((e) => MonthlyPoint.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class MonthlyPoint {
  final String month; // "2025-03"
  final double income;
  final double expenses;

  const MonthlyPoint({
    required this.month,
    required this.income,
    required this.expenses,
  });

  double get net => income - expenses;

  String get label {
    final parts = month.split('-');
    if (parts.length < 2) return month;
    final m = int.tryParse(parts[1]) ?? 1;
    const names = [
      '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ];
    return names[m];
  }

  factory MonthlyPoint.fromJson(Map<String, dynamic> json) => MonthlyPoint(
    month:    json['month']    as String? ?? '',
    income:   (json['income']   as num?)?.toDouble() ?? 0,
    expenses: (json['expenses'] as num?)?.toDouble() ?? 0,
  );
}

final financeSummaryProvider = FutureProvider<FinanceSummary>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.financeSummary);
  return FinanceSummary.fromJson(res.data as Map<String, dynamic>);
});

// ── Expense entry ─────────────────────────────────────────────────────────────

class ExpenseEntry {
  final String id;
  final String category;
  final double amount;
  final DateTime date;
  final String? note;

  const ExpenseEntry({
    required this.id,
    required this.category,
    required this.amount,
    required this.date,
    this.note,
  });

  static const _catAr = {
    'feed':          'علف',
    'doctor':        'طبيب بيطري',
    'transport':     'نقل',
    'electricity':   'كهرباء',
    'salary':        'رواتب',
    'rent':          'إيجار',
    'water':         'مياه',
    'maintenance':   'صيانة',
    'other':         'أخرى',
  };

  String get categoryAr => _catAr[category] ?? category;

  factory ExpenseEntry.fromJson(Map<String, dynamic> json) => ExpenseEntry(
    id:       json['_id'] as String? ?? json['id'] as String? ?? '',
    category: json['category'] as String? ?? 'other',
    amount:   (json['amount'] as num?)?.toDouble() ?? 0,
    date:     DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
    note:     json['note'] as String?,
  );
}

final recentExpensesProvider = FutureProvider<List<ExpenseEntry>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.expenses, queryParameters: {'limit': 20});
  final data = res.data as List? ?? [];
  return data.map((e) => ExpenseEntry.fromJson(e as Map<String, dynamic>)).toList();
});

// ── Income entry ──────────────────────────────────────────────────────────────

class IncomeEntry {
  final String id;
  final double amount;
  final DateTime date;
  final String? source;
  final String? note;

  const IncomeEntry({
    required this.id,
    required this.amount,
    required this.date,
    this.source,
    this.note,
  });

  factory IncomeEntry.fromJson(Map<String, dynamic> json) => IncomeEntry(
    id:     json['_id'] as String? ?? json['id'] as String? ?? '',
    amount: (json['amount'] as num?)?.toDouble() ?? 0,
    date:   DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
    source: json['source'] as String?,
    note:   json['note'] as String?,
  );
}

final recentIncomeProvider = FutureProvider<List<IncomeEntry>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.income, queryParameters: {'limit': 20});
  final data = res.data as List? ?? [];
  return data.map((e) => IncomeEntry.fromJson(e as Map<String, dynamic>)).toList();
});
