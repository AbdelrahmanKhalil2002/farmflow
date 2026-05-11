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
  final int?    recurringDay;
  final String? animalId;    // linked animal _id
  final String? animalLabel; // "رقم الوسم / النوع" for display

  const ExpenseEntry({
    required this.id,
    required this.category,
    required this.amount,
    required this.date,
    this.note,
    this.recurringDay,
    this.animalId,
    this.animalLabel,
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

  factory ExpenseEntry.fromJson(Map<String, dynamic> json) {
    // animal field comes populated from backend as object or just an id string
    final animalObj = json['animal'];
    String? aId;
    String? aLabel;
    if (animalObj is Map<String, dynamic>) {
      aId    = animalObj['_id'] as String?;
      final tag   = animalObj['tagNumber'] as String? ?? '';
      final breed = animalObj['breed']     as String? ?? '';
      final type  = animalObj['type']      as String? ?? '';
      aLabel = [if (tag.isNotEmpty) tag, if (breed.isNotEmpty) breed, if (type.isNotEmpty) type]
                 .take(2).join(' — ');
    } else if (animalObj is String) {
      aId = animalObj;
    }
    return ExpenseEntry(
      id:           json['_id'] as String? ?? json['id'] as String? ?? '',
      category:     json['category'] as String? ?? 'other',
      amount:       (json['amount'] as num?)?.toDouble() ?? 0,
      date:         DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
      note:         json['note'] as String?,
      recurringDay: (json['recurringDay'] as num?)?.toInt(),
      animalId:     aId,
      animalLabel:  aLabel,
    );
  }

  Map<String, dynamic> toJson() => {
    'category':    category,
    'amount':      amount,
    'date':        date.toIso8601String(),
    if (note != null && note!.isNotEmpty) 'note': note,
    if (recurringDay != null) 'recurringDay': recurringDay,
    if (animalId != null) 'animalId': animalId,
  };
}

// ── Seller animals (for expense picker) ──────────────────────────────────────

class AnimalPickerItem {
  final String id;
  final String label; // "رقم الوسم — النوع"

  const AnimalPickerItem({required this.id, required this.label});

  factory AnimalPickerItem.fromJson(Map<String, dynamic> json) {
    final tag   = json['tagNumber'] as String? ?? '';
    final breed = json['breed']     as String? ?? '';
    final type  = json['type']      as String? ?? '';
    final label = [if (tag.isNotEmpty) tag, if (breed.isNotEmpty) breed, if (type.isNotEmpty) type]
                    .take(2).join(' — ');
    return AnimalPickerItem(
      id:    json['_id'] as String? ?? '',
      label: label.isEmpty ? 'حيوان' : label,
    );
  }
}

final sellerAnimalsProvider = FutureProvider<List<AnimalPickerItem>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(ApiEndpoints.animals, queryParameters: {'limit': 200});
  final data = (res.data is Map ? res.data['items'] : res.data) as List? ?? [];
  return data.map((e) => AnimalPickerItem.fromJson(e as Map<String, dynamic>)).toList();
});

final recentExpensesProvider = FutureProvider<List<ExpenseEntry>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.expenses, queryParameters: {'limit': 100});
  final data = res.data as List? ?? [];
  return data.map((e) => ExpenseEntry.fromJson(e as Map<String, dynamic>)).toList();
});

// ── Income entry ──────────────────────────────────────────────────────────────

class IncomeEntry {
  final String  id;
  final String  type;          // 'sale' | 'dairy' | 'feed' | 'other'
  final double  amount;
  final DateTime date;
  final String? note;
  final String? buyerName;
  final String  paymentStatus; // 'received' | 'pending'
  final String  paymentMethod; // 'cash' | 'transfer' | 'instapay' | 'auto'
  final bool    fromOrder;     // true = auto-generated from a completed order

  const IncomeEntry({
    required this.id,
    required this.type,
    required this.amount,
    required this.date,
    this.note,
    this.buyerName,
    this.paymentStatus = 'received',
    this.paymentMethod = 'cash',
    this.fromOrder = false,
  });

  String get sourceAr => const {
    'sale':  'بيع ماشية',
    'dairy': 'منتجات ألبان',
    'feed':  'منتجات علف',
    'other': 'دخل آخر',
  }[type] ?? type;

  String get paymentMethodAr => const {
    'cash':     'كاش',
    'transfer': 'تحويل بنكي',
    'instapay': 'انستاباي',
    'auto':     'تلقائي',
  }[paymentMethod] ?? paymentMethod;

  bool get isPending => paymentStatus == 'pending';

  factory IncomeEntry.fromJson(Map<String, dynamic> json) => IncomeEntry(
    id:            json['_id'] as String? ?? json['id'] as String? ?? '',
    type:          json['type'] as String? ?? 'sale',
    amount:        (json['amount'] as num?)?.toDouble() ?? 0,
    date:          DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
    note:          json['note'] as String?,
    buyerName:     json['buyerName'] as String?,
    paymentStatus: json['paymentStatus'] as String? ?? 'received',
    paymentMethod: json['paymentMethod'] as String? ?? 'cash',
    fromOrder:     json['fromOrder'] as bool? ?? false,
  );

  Map<String, dynamic> toJson() => {
    'type':          type,
    'amount':        amount,
    'date':          date.toIso8601String(),
    'paymentStatus': paymentStatus,
    'paymentMethod': paymentMethod,
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
