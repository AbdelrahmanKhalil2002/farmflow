import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/dairy_product_model.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import 'dairy_service.dart';

class SellerDairyScreen extends ConsumerWidget {
  const SellerDairyScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncDairy = ref.watch(myDairyProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        title: const Text(
          'منتجاتي الألبانية',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w800,
            color: AppColors.white,
          ),
        ),
        leading: const BackButton(color: AppColors.white),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.green,
        onPressed: () => _showAddDairySheet(context, ref),
        icon: const Icon(Icons.add, color: AppColors.white),
        label: const Text(
          'إضافة منتج',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w700,
            color: AppColors.white,
          ),
        ),
      ),
      body: asyncDairy.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(16),
          child: ShimmerList(count: 4, cardHeight: 100),
        ),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: 'تعذّر التحميل',
          subtitle: e.toString(),
          actionLabel: 'إعادة المحاولة',
          action: () => ref.invalidate(myDairyProvider),
        ),
        data: (dairy) {
          if (dairy.isEmpty) {
            return EmptyState(
              icon: Icons.local_drink_outlined,
              title: 'لا توجد منتجات ألبان',
              subtitle: 'أضف أول منتج',
              actionLabel: 'إضافة منتج',
              action: () => _showAddDairySheet(context, ref),
            );
          }
          return RefreshIndicator(
            color: AppColors.green,
            onRefresh: () async => ref.invalidate(myDairyProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: dairy.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _DairyCard(
                product: dairy[i],
                onEdit: () => _showEditDairySheet(context, ref, dairy[i]),
                onDelete: () async {
                  final ok = await showConfirmDialog(
                    context,
                    title: 'حذف المنتج',
                    message: 'هل تريد حذف "${dairy[i].name}"؟',
                    confirmLabel: 'حذف',
                    dangerous: true,
                  );
                  if (ok) {
                    await deleteDairy(ref.read(dioProvider), dairy[i].id);
                    ref.invalidate(myDairyProvider);
                  }
                },
              ),
            ),
          );
        },
      ),
    );
  }

  void _showAddDairySheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _AddDairySheet(
        onCreated: () => ref.invalidate(myDairyProvider),
      ),
    );
  }

  void _showEditDairySheet(
      BuildContext context, WidgetRef ref, DairyProductModel product) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _EditDairySheet(
        product: product,
        onUpdated: () => ref.invalidate(myDairyProvider),
      ),
    );
  }
}

// ── Dairy card ────────────────────────────────────────────────────────────────

class _DairyCard extends StatelessWidget {
  const _DairyCard({
    required this.product,
    required this.onDelete,
    required this.onEdit,
  });
  final DairyProductModel product;
  final VoidCallback onDelete;
  final VoidCallback onEdit;

  static const _statusColor = {
    'pending':  Color(0xFFF59E0B),
    'approved': Color(0xFF22C55E),
    'rejected': Color(0xFFEF4444),
  };
  static const _statusBg = {
    'pending':  Color(0xFFFEF3C7),
    'approved': Color(0xFFF0FDF4),
    'rejected': Color(0xFFFEF2F2),
  };
  static const _statusAr = {
    'pending':  'قيد المراجعة',
    'approved': 'متاح',
    'rejected': 'مرفوض',
  };
  static const _emojis = {
    'milk':   '🥛', 'cheese': '🧀', 'yogurt': '🥣',
    'butter': '🧈', 'cream':  '🍦', 'ghee':   '🫙', 'other': '🏺',
  };

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor[product.status] ?? AppColors.muted;
    final statusBg    = _statusBg[product.status]    ?? AppColors.bg;
    final statusAr    = _statusAr[product.status]    ?? product.status;
    final fmt = NumberFormat('#,##0', 'ar');
    final dateFmt = DateFormat('d MMM', 'ar');

    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(color: Color(0x08000000), blurRadius: 6, offset: Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          // Emoji icon
          Container(
            width: 80,
            height: 90,
            decoration: BoxDecoration(
              color: const Color(0xFFFFF7ED),
              borderRadius:
                  const BorderRadius.horizontal(right: Radius.circular(13)),
            ),
            child: Center(
              child: Text(_emojis[product.type] ?? '🥛',
                  style: const TextStyle(fontSize: 32)),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          product.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppColors.text,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: statusBg,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          statusAr,
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: statusColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${product.typeAr}  •  ${product.quantity.toStringAsFixed(0)} ${product.unitAr}',
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 12,
                      color: AppColors.muted,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${fmt.format(product.pricePerUnit)} ج.م / ${product.unitAr}',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppColors.green,
                        ),
                      ),
                      if (product.expiryDate != null)
                        Text(
                          'ينتهي ${dateFmt.format(product.expiryDate!)}',
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 10,
                            color: AppColors.amber,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.edit_outlined,
                    color: AppColors.muted, size: 20),
                onPressed: onEdit,
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline,
                    color: AppColors.red, size: 20),
                onPressed: onDelete,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Add Dairy bottom sheet ─────────────────────────────────────────────────────

class _AddDairySheet extends ConsumerStatefulWidget {
  const _AddDairySheet({required this.onCreated});
  final VoidCallback onCreated;

  @override
  ConsumerState<_AddDairySheet> createState() => _AddDairySheetState();
}

class _AddDairySheetState extends ConsumerState<_AddDairySheet> {
  final _nameCtrl  = TextEditingController();
  final _qtyCtrl   = TextEditingController();
  final _priceCtrl = TextEditingController();

  String _type = 'milk';
  String _unit = 'liter';
  bool   _delivery = false;
  bool   _loading  = false;
  String? _error;

  static const _types = [
    ('milk', '🥛 لبن'), ('cheese', '🧀 جبنة'), ('yogurt', '🥣 زبادي'),
    ('butter', '🧈 زبد'), ('cream', '🍦 قشطة'), ('ghee', '🫙 سمن'),
    ('other', '🏺 أخرى'),
  ];
  static const _units = [
    ('liter', 'لتر'), ('kg', 'كجم'), ('piece', 'قطعة'),
    ('pack', 'عبوة'), ('dozen', 'دزينة'),
  ];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _qtyCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_nameCtrl.text.trim().isEmpty ||
        _qtyCtrl.text.trim().isEmpty ||
        _priceCtrl.text.trim().isEmpty) {
      setState(() => _error = 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await createDairy(ref.read(dioProvider), {
        'name':             _nameCtrl.text.trim(),
        'type':             _type,
        'quantity':         double.tryParse(_qtyCtrl.text) ?? 0,
        'unit':             _unit,
        'pricePerUnit':     double.tryParse(_priceCtrl.text) ?? 0,
        'deliveryAvailable': _delivery,
      });
      widget.onCreated();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _error = 'فشل في إضافة المنتج. حاول مجدداً.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const Text('إضافة منتج ألبان',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 17,
                    fontWeight: FontWeight.w800, color: AppColors.text)),
            const SizedBox(height: 16),
            // Type picker
            const Text('النوع', style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                fontWeight: FontWeight.w700, color: AppColors.muted)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8, runSpacing: 8,
              children: _types.map((t) => GestureDetector(
                onTap: () => setState(() => _type = t.$1),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _type == t.$1 ? AppColors.green : AppColors.bg,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _type == t.$1 ? AppColors.green : AppColors.border),
                  ),
                  child: Text(t.$2,
                    style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                      color: _type == t.$1 ? AppColors.white : AppColors.text)),
                ),
              )).toList(),
            ),
            const SizedBox(height: 14),
            _Field(controller: _nameCtrl, label: 'اسم المنتج *',
                hint: 'مثال: لبن بقري طازج'),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: _Field(
                  controller: _qtyCtrl, label: 'الكمية *',
                  hint: '0', keyboardType: TextInputType.number)),
              const SizedBox(width: 10),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('الوحدة', style: TextStyle(fontFamily: 'Cairo',
                      fontSize: 12, fontWeight: FontWeight.w600,
                      color: AppColors.muted)),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: AppColors.bg,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _unit,
                        isExpanded: true,
                        style: const TextStyle(fontFamily: 'Cairo',
                            fontSize: 13, color: AppColors.text),
                        onChanged: (v) => setState(() => _unit = v!),
                        items: _units.map((u) => DropdownMenuItem(
                          value: u.$1,
                          child: Text(u.$2),
                        )).toList(),
                      ),
                    ),
                  ),
                ],
              )),
            ]),
            const SizedBox(height: 10),
            _Field(controller: _priceCtrl, label: 'السعر لكل وحدة (ج.م) *',
                hint: '0', keyboardType: TextInputType.number),
            const SizedBox(height: 10),
            Row(children: [
              Switch(
                value: _delivery,
                onChanged: (v) => setState(() => _delivery = v),
                activeColor: AppColors.green,
              ),
              const SizedBox(width: 8),
              const Text('توصيل متاح',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                      color: AppColors.text)),
            ]),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(fontFamily: 'Cairo',
                  fontSize: 12, color: AppColors.red)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loading ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.green,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _loading
                  ? const SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(
                          color: AppColors.white, strokeWidth: 2))
                  : const Text('إضافة المنتج',
                      style: TextStyle(fontFamily: 'Cairo',
                          fontWeight: FontWeight.w700, color: AppColors.white)),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Edit Dairy bottom sheet (M12.3) ──────────────────────────────────────────

class _EditDairySheet extends ConsumerStatefulWidget {
  const _EditDairySheet({required this.product, required this.onUpdated});
  final DairyProductModel product;
  final VoidCallback onUpdated;

  @override
  ConsumerState<_EditDairySheet> createState() => _EditDairySheetState();
}

class _EditDairySheetState extends ConsumerState<_EditDairySheet> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _qtyCtrl;
  late final TextEditingController _priceCtrl;

  late String _type;
  late String _unit;
  late bool   _delivery;
  bool _loading = false;
  String? _error;

  static const _types = [
    ('milk', '🥛 لبن'), ('cheese', '🧀 جبنة'), ('yogurt', '🥣 زبادي'),
    ('butter', '🧈 زبد'), ('cream', '🍦 قشطة'), ('ghee', '🫙 سمن'),
    ('other', '🏺 أخرى'),
  ];
  static const _units = [
    ('liter', 'لتر'), ('kg', 'كجم'), ('piece', 'قطعة'),
    ('pack', 'عبوة'), ('dozen', 'دزينة'),
  ];

  @override
  void initState() {
    super.initState();
    _nameCtrl  = TextEditingController(text: widget.product.name);
    _qtyCtrl   = TextEditingController(
        text: widget.product.quantity.toStringAsFixed(0));
    _priceCtrl = TextEditingController(
        text: widget.product.pricePerUnit.toStringAsFixed(0));
    _type     = widget.product.type;
    _unit     = widget.product.unit;
    _delivery = widget.product.deliveryAvailable;
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _qtyCtrl.dispose(); _priceCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_nameCtrl.text.trim().isEmpty ||
        _qtyCtrl.text.trim().isEmpty ||
        _priceCtrl.text.trim().isEmpty) {
      setState(() => _error = 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await updateDairy(ref.read(dioProvider), widget.product.id, {
        'name':              _nameCtrl.text.trim(),
        'type':              _type,
        'quantity':          double.tryParse(_qtyCtrl.text) ?? 0,
        'unit':              _unit,
        'pricePerUnit':      double.tryParse(_priceCtrl.text) ?? 0,
        'deliveryAvailable': _delivery,
      });
      widget.onUpdated();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() { _error = 'فشل في التحديث. حاول مجدداً.'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(child: Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40, height: 4,
              decoration: BoxDecoration(color: AppColors.border,
                  borderRadius: BorderRadius.circular(2)))),
            const Text('تعديل المنتج',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 17,
                    fontWeight: FontWeight.w800, color: AppColors.text)),
            const SizedBox(height: 16),
            const Text('النوع', style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                fontWeight: FontWeight.w700, color: AppColors.muted)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8, runSpacing: 8,
              children: _types.map((t) => GestureDetector(
                onTap: () => setState(() => _type = t.$1),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _type == t.$1 ? AppColors.green : AppColors.bg,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: _type == t.$1 ? AppColors.green : AppColors.border),
                  ),
                  child: Text(t.$2, style: TextStyle(fontFamily: 'Cairo',
                      fontSize: 12,
                      color: _type == t.$1 ? AppColors.white : AppColors.text)),
                ),
              )).toList(),
            ),
            const SizedBox(height: 14),
            _Field(controller: _nameCtrl, label: 'اسم المنتج *',
                hint: 'مثال: لبن بقري طازج'),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: _Field(controller: _qtyCtrl, label: 'الكمية *',
                  hint: '0', keyboardType: TextInputType.number)),
              const SizedBox(width: 10),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('الوحدة', style: TextStyle(fontFamily: 'Cairo',
                      fontSize: 12, fontWeight: FontWeight.w600,
                      color: AppColors.muted)),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(color: AppColors.bg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.border)),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _unit,
                        isExpanded: true,
                        style: const TextStyle(fontFamily: 'Cairo',
                            fontSize: 13, color: AppColors.text),
                        onChanged: (v) => setState(() => _unit = v!),
                        items: _units.map((u) => DropdownMenuItem(
                          value: u.$1, child: Text(u.$2))).toList(),
                      ),
                    ),
                  ),
                ],
              )),
            ]),
            const SizedBox(height: 10),
            _Field(controller: _priceCtrl, label: 'السعر لكل وحدة (ج.م) *',
                hint: '0', keyboardType: TextInputType.number),
            const SizedBox(height: 10),
            Row(children: [
              Switch(value: _delivery,
                onChanged: (v) => setState(() => _delivery = v),
                activeColor: AppColors.green),
              const SizedBox(width: 8),
              const Text('توصيل متاح',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                      color: AppColors.text)),
            ]),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(fontFamily: 'Cairo',
                  fontSize: 12, color: AppColors.red)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loading ? null : _submit,
              style: FilledButton.styleFrom(backgroundColor: AppColors.green,
                  padding: const EdgeInsets.symmetric(vertical: 14)),
              child: _loading
                  ? const SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(
                          color: AppColors.white, strokeWidth: 2))
                  : const Text('حفظ التعديلات',
                      style: TextStyle(fontFamily: 'Cairo',
                          fontWeight: FontWeight.w700, color: AppColors.white)),
            ),
          ],
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.label,
    required this.hint,
    this.keyboardType = TextInputType.text,
  });
  final TextEditingController controller;
  final String label;
  final String hint;
  final TextInputType keyboardType;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
          fontWeight: FontWeight.w600, color: AppColors.muted)),
      const SizedBox(height: 4),
      TextField(
        controller: controller,
        keyboardType: keyboardType,
        style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
            color: AppColors.text),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
              color: AppColors.muted),
          filled: true,
          fillColor: AppColors.bg,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: AppColors.border),
          ),
        ),
      ),
    ],
  );
}
