import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/api/api_client.dart';
import '../../../core/l10n/l10n_ext.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/dairy_product_model.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import 'dairy_service.dart';

// ── Odoo-style design tokens (local) ─────────────────────────────────────────
const _kBg      = Color(0xFFF7F8FA);
const _kCard    = Colors.white;
const _kDivider = Color(0xFFEEEEEE);
const _kMuted   = Color(0xFF6B7280);
const _kBorder  = Color(0xFFE5E7EB);
const _kText    = Color(0xFF111827);

class SellerDairyScreen extends ConsumerStatefulWidget {
  const SellerDairyScreen({super.key});

  @override
  ConsumerState<SellerDairyScreen> createState() => _SellerDairyScreenState();
}

class _SellerDairyScreenState extends ConsumerState<SellerDairyScreen> {
  String _typeFilter   = 'all';
  String _statusFilter = 'all';

  static const _types = [
    ('all',    'الكل'),
    ('milk',   '🥛 لبن'),
    ('cheese', '🧀 جبنة'),
    ('yogurt', '🥣 زبادي'),
    ('butter', '🧈 زبد'),
    ('cream',  '🍦 قشطة'),
    ('ghee',   '🫙 سمن'),
    ('other',  '🏺 أخرى'),
  ];

  static const _statuses = [
    ('all',      'الكل'),
    ('pending',  'قيد المراجعة'),
    ('approved', 'متاح'),
    ('rejected', 'مرفوض'),
  ];

  List<DairyProductModel> _filtered(List<DairyProductModel> all) {
    return all.where((p) {
      final matchesType   = _typeFilter == 'all' || p.type == _typeFilter;
      final matchesStatus = _statusFilter == 'all' || p.status == _statusFilter;
      return matchesType && matchesStatus;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final asyncDairy = ref.watch(myDairyProvider);

    return Scaffold(
      backgroundColor: _kBg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        title: Text(
          context.l10n.dairyTitle,
          style: const TextStyle(
            fontFamily: 'Cairo', fontWeight: FontWeight.w800, color: AppColors.white,
          ),
        ),
        leading: const BackButton(color: AppColors.white),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(44),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: Row(
              children: _types.map((t) {
                final sel = _typeFilter == t.$1;
                return GestureDetector(
                  onTap: () => setState(() => _typeFilter = t.$1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    margin: const EdgeInsets.only(left: 6),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: sel ? AppColors.white : AppColors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(t.$2, style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: sel ? AppColors.green : AppColors.white)),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.green,
        onPressed: () => _showAddDairySheet(context, ref),
        icon: const Icon(Icons.add, color: AppColors.white),
        label: Text(context.l10n.addDairyProduct,
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                color: AppColors.white)),
      ),
      body: asyncDairy.when(
        loading: () => const Padding(padding: EdgeInsets.all(16),
            child: ShimmerList(count: 4, cardHeight: 100)),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: context.l10n.loadDairyFailed,
          subtitle: e.toString(),
          actionLabel: context.l10n.retry,
          action: () => ref.invalidate(myDairyProvider),
        ),
        data: (dairy) {
          final filtered = _filtered(dairy);
          if (dairy.isEmpty) {
            return EmptyState(
              icon: Icons.local_drink_outlined,
              title: context.l10n.noDairyProducts2,
              subtitle: context.l10n.addFirstDairy,
              actionLabel: context.l10n.addDairyProduct,
              action: () => _showAddDairySheet(context, ref),
            );
          }
          return Column(children: [
            // Status filter row
            Container(
              color: Colors.white,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: Row(
                  children: _statuses.map((s) {
                    final sel = _statusFilter == s.$1;
                    return GestureDetector(
                      onTap: () => setState(() => _statusFilter = s.$1),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        margin: const EdgeInsets.only(left: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: sel ? AppColors.green : const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(s.$2, style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: sel ? Colors.white : const Color(0xFF6B7280))),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
            if (filtered.isEmpty)
              const Expanded(child: Center(child: Text('لا توجد منتجات تطابق الفلتر',
                  style: TextStyle(fontFamily: 'Cairo', color: Color(0xFF9CA3AF)))))
            else
              Expanded(
                child: RefreshIndicator(
                  color: AppColors.green,
                  onRefresh: () async => ref.invalidate(myDairyProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) => _DairyCard(
                      product: filtered[i],
                      onEdit: () => _showEditDairySheet(context, ref, filtered[i]),
                      onUpdateStock: () => _showStockUpdateSheet(context, ref, filtered[i]),
                      onDelete: () async {
                        final ok = await showConfirmDialog(context,
                            title: context.l10n.deleteDairyTitle,
                            message: context.l10n.deleteDairyMessage(filtered[i].name),
                            confirmLabel: context.l10n.delete, dangerous: true);
                        if (ok) {
                          await deleteDairy(ref.read(dioProvider), filtered[i].id);
                          ref.invalidate(myDairyProvider);
                        }
                      },
                    ),
                  ),
                ),
              ),
          ]);
        },
      ),
    );
  }

  void _showAddDairySheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context, isScrollControlled: true, backgroundColor: _kCard,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _AddDairySheet(onCreated: () => ref.invalidate(myDairyProvider)),
    );
  }

  void _showEditDairySheet(BuildContext context, WidgetRef ref, DairyProductModel product) {
    showModalBottomSheet(
      context: context, isScrollControlled: true, backgroundColor: _kCard,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _EditDairySheet(
          product: product, onUpdated: () => ref.invalidate(myDairyProvider)),
    );
  }

  void _showStockUpdateSheet(BuildContext context, WidgetRef ref, DairyProductModel product) {
    showModalBottomSheet(
      context: context, isScrollControlled: true, backgroundColor: _kCard,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _StockUpdateSheet(
          product: product, onUpdated: () => ref.invalidate(myDairyProvider)),
    );
  }
}

// ── Dairy card ────────────────────────────────────────────────────────────────

class _DairyCard extends StatelessWidget {
  const _DairyCard({
    required this.product,
    required this.onDelete,
    required this.onEdit,
    required this.onUpdateStock,
  });
  final DairyProductModel product;
  final VoidCallback onDelete;
  final VoidCallback onEdit;
  final VoidCallback onUpdateStock;

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
        color: _kCard,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [
          BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: const Color(0xFFFFF7ED),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Text(_emojis[product.type] ?? '🥛',
                    style: const TextStyle(fontSize: 22)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Expanded(
                      child: Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontFamily: 'Cairo', fontSize: 14, fontWeight: FontWeight.w700, color: _kText)),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(8)),
                      child: Text(statusAr,
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 10, fontWeight: FontWeight.w700, color: statusColor)),
                    ),
                  ]),
                  const SizedBox(height: 3),
                  Text('${product.typeAr}  •  ${product.quantity.toStringAsFixed(0)} ${product.unitAr}',
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: _kMuted)),
                  const SizedBox(height: 3),
                  Row(children: [
                    Text('${fmt.format(product.pricePerUnit)} ج.م / ${product.unitAr}',
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.green)),
                    if (product.expiryDate != null) ...[
                      const Spacer(),
                      Text(context.l10n.expiresOn(dateFmt.format(product.expiryDate!)),
                          style: const TextStyle(fontFamily: 'Cairo', fontSize: 10, color: AppColors.amber)),
                    ],
                  ]),
                ],
              ),
            ),
            const SizedBox(width: 4),
            Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              IconButton(icon: const Icon(Icons.edit_outlined, color: _kMuted, size: 19), onPressed: onEdit),
              IconButton(
                  icon: const Icon(Icons.inventory_2_outlined, color: Color(0xFF6366F1), size: 19),
                  tooltip: 'تحديث المخزون',
                  onPressed: onUpdateStock),
              IconButton(icon: const Icon(Icons.delete_outline, color: AppColors.red, size: 19), onPressed: onDelete),
            ]),
          ],
        ),
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
      setState(() => _error = context.l10n.allFields);
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
        _error = context.l10n.dairyAddFailed;
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
                  color: _kDivider,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Text(context.l10n.addDairyTitle,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 17,
                    fontWeight: FontWeight.w800, color: AppColors.text)),
            const SizedBox(height: 16),
            // Type picker
            Text(context.l10n.dairyType, style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
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
            _Field(controller: _nameCtrl, label: context.l10n.dairyProductName,
                hint: context.l10n.dairyProductNameHint),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: _Field(
                  controller: _qtyCtrl, label: context.l10n.dairyQuantity,
                  hint: '0', keyboardType: TextInputType.number)),
              const SizedBox(width: 10),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(context.l10n.dairyUnit, style: const TextStyle(fontFamily: 'Cairo',
                      fontSize: 12, fontWeight: FontWeight.w600,
                      color: _kMuted)),
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
                            fontSize: 13, color: _kText),
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
            _Field(controller: _priceCtrl, label: context.l10n.dairyPricePerUnit,
                hint: '0', keyboardType: TextInputType.number),
            const SizedBox(height: 10),
            Row(children: [
              Switch(
                value: _delivery,
                onChanged: (v) => setState(() => _delivery = v),
                activeColor: AppColors.green,
              ),
              const SizedBox(width: 8),
              Text(context.l10n.dairyDelivery,
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
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
                  : Text(context.l10n.addDairyButton,
                      style: const TextStyle(fontFamily: 'Cairo',
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
      setState(() => _error = context.l10n.allFields);
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
      setState(() { _error = context.l10n.dairyUpdateFailed; _loading = false; });
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
            Text(context.l10n.editDairyTitle,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 17,
                    fontWeight: FontWeight.w800, color: AppColors.text)),
            const SizedBox(height: 16),
            Text(context.l10n.dairyType, style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
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
            _Field(controller: _nameCtrl, label: context.l10n.dairyProductName,
                hint: context.l10n.dairyProductNameHint),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: _Field(controller: _qtyCtrl, label: context.l10n.dairyQuantity,
                  hint: '0', keyboardType: TextInputType.number)),
              const SizedBox(width: 10),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(context.l10n.dairyUnit, style: const TextStyle(fontFamily: 'Cairo',
                      fontSize: 12, fontWeight: FontWeight.w600,
                      color: _kMuted)),
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
                            fontSize: 13, color: _kText),
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
            _Field(controller: _priceCtrl, label: context.l10n.dairyPricePerUnit,
                hint: '0', keyboardType: TextInputType.number),
            const SizedBox(height: 10),
            Row(children: [
              Switch(value: _delivery,
                onChanged: (v) => setState(() => _delivery = v),
                activeColor: AppColors.green),
              const SizedBox(width: 8),
              Text(context.l10n.dairyDelivery,
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
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
                  : Text(context.l10n.saveDairyButton,
                      style: const TextStyle(fontFamily: 'Cairo',
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
          fillColor: _kBg,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: _kBorder),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: _kBorder),
          ),
        ),
      ),
    ],
  );
}

// ── Stock Update Sheet ────────────────────────────────────────────────────────

class _StockUpdateSheet extends ConsumerStatefulWidget {
  const _StockUpdateSheet({required this.product, required this.onUpdated});
  final DairyProductModel product;
  final VoidCallback onUpdated;

  @override
  ConsumerState<_StockUpdateSheet> createState() => _StockUpdateSheetState();
}

class _StockUpdateSheetState extends ConsumerState<_StockUpdateSheet> {
  late final TextEditingController _qtyCtrl;
  final _noteCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _qtyCtrl = TextEditingController(
        text: widget.product.quantity.toStringAsFixed(0));
  }

  @override
  void dispose() {
    _qtyCtrl.dispose(); _noteCtrl.dispose(); super.dispose();
  }

  Future<void> _submit() async {
    final qty = double.tryParse(_qtyCtrl.text);
    if (qty == null || qty < 0) {
      setState(() => _error = 'أدخل كمية صحيحة');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(dioProvider).put(
        '/dairy/${widget.product.id}',
        data: {
          'quantity': qty,
          if (_noteCtrl.text.trim().isNotEmpty) 'stockNote': _noteCtrl.text.trim(),
        },
      );
      widget.onUpdated();
      if (mounted) Navigator.pop(context);
    } catch (_) {
      setState(() { _error = 'فشل تحديث المخزون'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
    child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Center(child: Container(margin: const EdgeInsets.symmetric(vertical: 12),
          width: 40, height: 4,
          decoration: BoxDecoration(color: _kBorder, borderRadius: BorderRadius.circular(2)))),
      Text('تحديث المخزون — ${widget.product.name}',
          style: const TextStyle(fontFamily: 'Cairo', fontSize: 16,
              fontWeight: FontWeight.w800, color: _kText)),
      const SizedBox(height: 14),
      TextField(
        controller: _qtyCtrl,
        keyboardType: TextInputType.number,
        autofocus: true,
        decoration: InputDecoration(
          labelText: 'الكمية الجديدة (${widget.product.unitAr})',
          labelStyle: const TextStyle(fontFamily: 'Cairo', color: _kMuted),
          filled: true, fillColor: const Color(0xFFF9FAFB),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: _kBorder)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: _kBorder)),
        ),
      ),
      const SizedBox(height: 10),
      TextField(
        controller: _noteCtrl,
        maxLines: 2,
        decoration: InputDecoration(
          hintText: 'ملاحظة (اختياري) — سبب التعديل...',
          hintStyle: const TextStyle(fontFamily: 'Cairo', color: _kMuted),
          filled: true, fillColor: const Color(0xFFF9FAFB),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: _kBorder)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: _kBorder)),
        ),
      ),
      if (_error != null) ...[
        const SizedBox(height: 6),
        Text(_error!, style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: AppColors.red)),
      ],
      const SizedBox(height: 16),
      FilledButton(
        onPressed: _loading ? null : _submit,
        style: FilledButton.styleFrom(backgroundColor: const Color(0xFF6366F1),
            padding: const EdgeInsets.symmetric(vertical: 14)),
        child: _loading
            ? const SizedBox(width: 20, height: 20,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : const Text('حفظ المخزون', style: TextStyle(fontFamily: 'Cairo',
                fontWeight: FontWeight.w700, color: Colors.white)),
      ),
    ]),
  );
}
