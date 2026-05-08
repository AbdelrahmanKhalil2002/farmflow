import 'package:dio/dio.dart';
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
  final String  id;
  final String  category;
  final double  amount;
  final DateTime date;
  final String? note;
  // Extended fields (web parity)
  final int?    recurringDay;  // day-of-month (1-31) for recurring expenses
  final String? animalNote;   // optional linked animal description

  const ExpenseEntry({
    required this.id,
    required this.category,
    required this.amount,
    required this.date,
    this.note,
    this.recurringDay,
    this.animalNote,
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
    id:           json['_id'] as String? ?? json['id'] as String? ?? '',
    category:     json['category'] as String? ?? 'other',
    amount:       (json['amount'] as num?)?.toDouble() ?? 0,
    date:         DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
    note:         json['note'] as String?,
    recurringDay: (json['recurringDay'] as num?)?.toInt(),
    animalNote:   json['animalNote'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'category':    category,
    'amount':      amount,
    'date':        date.toIso8601String(),
    if (note != null && note!.isNotEmpty) 'note': note,
    if (recurringDay != null) 'recurringDay': recurringDay,
    if (animalNote != null && animalNote!.isNotEmpty) 'animalNote': animalNote,
  };
}

final recentExpensesProvider = FutureProvider<List<ExpenseEntry>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.expenses, queryParameters: {'limit': 100});
  final data = res.data as List? ?? [];
  return data.map((e) => ExpenseEntry.fromJson(e as Map<String, dynamic>)).toList();
});

// ── Income entry ──────────────────────────────────────────────────────────────

class IncomeEntry {
  final String  id;
  final String  type;          // 'sale' | 'deposit'
  final double  amount;
  final DateTime date;
  final String? note;
  // Extended fields (web parity)
  final String? buyerName;     // optional buyer name
  final String  paymentStatus; // 'received' | 'pending'

  const IncomeEntry({
    required this.id,
    required this.type,
    required this.amount,
    required this.date,
    this.note,
    this.buyerName,
    this.paymentStatus = 'received',
  });

  String get sourceAr => type == 'deposit' ? 'إيداع / تحويل' : 'بيع ماشية';

  bool get isPending => paymentStatus == 'pending';

  factory IncomeEntry.fromJson(Map<String, dynamic> json) => IncomeEntry(
    id:            json['_id'] as String? ?? json['id'] as String? ?? '',
    type:          json['type'] as String? ?? 'sale',
    amount:        (json['amount'] as num?)?.toDouble() ?? 0,
    date:          DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
    note:          json['note'] as String?,
    buyerName:     json['buyerName'] as String?,
    paymentStatus: json['paymentStatus'] as String? ?? 'received',
  );

  Map<String, dynamic> toJson() => {
    'type':          type,
    'amount':        amount,
    'date':          date.toIso8601String(),
    'paymentStatus': paymentStatus,
    if (note != null && note!.isNotEmpty) 'note': note,
    if (buyerName != null && buyerName!.isNotEmpty) 'buyerName': buyerName,
  };
}

// ── Monthly statements (from /statements endpoint) ────────────────────────────

class StatementMonth {
  final int month; // 0-based (Jan = 0)
  final double income;
  final Map<String, double> expenses;

  const StatementMonth({
    required this.month,
    required this.income,
    required this.expenses,
  });

  double get totalExpenses =>
      expenses.values.fold(0.0, (a, b) => a + b);

  MonthlyPoint toMonthlyPoint(int year) {
    final mm = (month + 1).toString().padLeft(2, '0');
    return MonthlyPoint(
      month:    '$year-$mm',
      income:   income,
      expenses: totalExpenses,
    );
  }

  factory StatementMonth.fromJson(Map<String, dynamic> json) => StatementMonth(
    month:  (json['month'] as num?)?.toInt() ?? 0,
    income: (json['income'] as num?)?.toDouble() ?? 0,
    expenses: (json['expenses'] as Map<String, dynamic>? ?? {}).map(
      (k, v) => MapEntry(k, (v as num?)?.toDouble() ?? 0.0),
    ),
  );
}

final currentYearStatementsProvider =
    FutureProvider<List<StatementMonth>>((ref) async {
  final dio  = ref.watch(dioProvider);
  final year = DateTime.now().year;
  final res  = await dio.get(ApiEndpoints.statements,
      queryParameters: {'year': year});
  final data = res.data as List? ?? [];
  return data
      .map((e) => StatementMonth.fromJson(e as Map<String, dynamic>))
      .toList();
});

// ── Budget entries ────────────────────────────────────────────────────────────

class BudgetEntry {
  final String? id;
  final int year;
  final int month; // 1-based
  final String category;
  final double targetAmount;

  const BudgetEntry({
    this.id,
    required this.year,
    required this.month,
    required this.category,
    required this.targetAmount,
  });

  factory BudgetEntry.fromJson(Map<String, dynamic> json) => BudgetEntry(
    id:           json['_id'] as String?,
    year:         (json['year'] as num?)?.toInt() ?? DateTime.now().year,
    month:        (json['month'] as num?)?.toInt() ?? 1,
    category:     json['category'] as String? ?? 'other',
    targetAmount: (json['targetAmount'] as num?)?.toDouble() ?? 0,
  );
}

final currentYearBudgetProvider =
    FutureProvider<List<BudgetEntry>>((ref) async {
  final dio  = ref.watch(dioProvider);
  final year = DateTime.now().year;
  final res  = await dio.get(ApiEndpoints.budget,
      queryParameters: {'year': year});
  final data = res.data as List? ?? [];
  return data
      .map((e) => BudgetEntry.fromJson(e as Map<String, dynamic>))
      .toList();
});

final recentIncomeProvider = FutureProvider<List<IncomeEntry>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.income, queryParameters: {'limit': 100});
  final data = res.data as List? ?? [];
  return data.map((e) => IncomeEntry.fromJson(e as Map<String, dynamic>)).toList();
});

// ── API mutators ──────────────────────────────────────────────────────────────

Future<void> addExpense(Dio dio, Map<String, dynamic> data) async {
  await dio.post(ApiEndpoints.expenses, data: data);
}

Future<void> updateExpense(Dio dio, String id, Map<String, dynamic> data) async {
  await dio.put(ApiEndpoints.expenseById(id), data: data);
}

Future<void> deleteExpense(Dio dio, String id) async {
  await dio.delete(ApiEndpoints.expenseById(id));
}

Future<void> addIncome(Dio dio, Map<String, dynamic> data) async {
  await dio.post(ApiEndpoints.income, data: data);
}

Future<void> updateIncome(Dio dio, String id, Map<String, dynamic> data) async {
  await dio.put(ApiEndpoints.incomeById(id), data: data);
}

Future<void> deleteIncome(Dio dio, String id) async {
  await dio.delete(ApiEndpoints.incomeById(id));
}

Future<void> upsertBudget(
  Dio dio, {
  required int year,
  required int month,
  required String category,
  required double targetAmount,
}) async {
  await dio.put(ApiEndpoints.budget, data: {
    'year': year,
    'month': month,
    'category': category,
    'targetAmount': targetAmount,
  });
}
