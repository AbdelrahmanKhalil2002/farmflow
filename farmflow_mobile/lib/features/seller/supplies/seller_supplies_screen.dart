import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/api/api_client.dart';
import '../../../core/l10n/l10n_ext.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/supply_model.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import 'supplies_service.dart';

class SellerSuppliesScreen extends ConsumerStatefulWidget {
  const SellerSuppliesScreen({super.key});

  @override
  ConsumerState<SellerSuppliesScreen> createState() => _SellerSuppliesScreenState();
}

class _SellerSuppliesScreenState extends ConsumerState<SellerSuppliesScreen> {
  String _statusFilter = 'all';

  static const _statuses = [
    ('all',       'الكل'),
    ('pending',   'قيد المراجعة'),
    ('approved',  'متاح'),
    ('rejected',  'مرفوض'),
    ('sold_out',  'نفذ المخزون'),
  ];

  @override
  Widget build(BuildContext context) {
    final asyncSupplies = ref.watch(mySuppliesProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        leading: const BackButton(color: AppColors.white),
        title: Text(context.l10n.suppliesTitle,
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                color: AppColors.white)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(44),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
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
                      color: sel ? AppColors.white : AppColors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(s.$2, style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
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
        onPressed: () => _showAddSheet(context, ref),
        icon: const Icon(Icons.add, color: AppColors.white),
        label: Text(context.l10n.addSupply,
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                color: AppColors.white)),
      ),
      body: asyncSupplies.when(
        loading: () => const Padding(padding: EdgeInsets.all(16),
            child: ShimmerList(count: 4, cardHeight: 100)),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: context.l10n.loadSuppliesFailed,
          subtitle: e.toString(),
          actionLabel: context.l10n.retry,
          action: () => ref.invalidate(mySuppliesProvider),
        ),
        data: (supplies) {
          final filtered = _statusFilter == 'all'
              ? supplies
              : supplies.where((s) => s.status == _statusFilter).toList();
          if (supplies.isEmpty) {
            return EmptyState(
              icon: Icons.inventory_2_outlined,
              title: context.l10n.noSupplyItems,
              subtitle: context.l10n.addFirstSupply,
              actionLabel: context.l10n.addSupply,
              action: () => _showAddSheet(context, ref),
            );
          }
          if (filtered.isEmpty) {
            return const Center(child: Text('لا توجد مستلزمات بهذه الحالة',
                style: TextStyle(fontFamily: 'Cairo', color: Color(0xFF9CA3AF))));
          }
          return RefreshIndicator(
            color: AppColors.green,
            onRefresh: () async => ref.invalidate(mySuppliesProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: filtered.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _SupplyCard(
                supply: filtered[i],
                onEdit: () => _showEditSheet(context, ref, filtered[i]),
                onDelete: () async {
                  final ok = await showConfirmDialog(context,
                      title: context.l10n.deleteSupplyTitle,
                      message: context.l10n.deleteSupplyMessage,
                      confirmLabel: context.l10n.delete, dangerous: true);
                  if (ok) {
                    await deleteSupply(ref.read(dioProvider), filtered[i].id);
                    ref.invalidate(mySuppliesProvider);
                  }
                },
              ),
            ),
          );
        },
      ),
    );
  }

  void _showAddSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _AddSupplySheet(
        onCreated: () => ref.invalidate(mySuppliesProvider),
      ),
    );
  }

  void _showEditSheet(
      BuildContext context, WidgetRef ref, SupplyModel supply) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _EditSupplySheet(
        supply: supply,
        onUpdated: () => ref.invalidate(mySuppliesProvider),
      ),
    );
  }
}

// ── Supply card ───────────────────────────────────────────────────────────────

class _SupplyCard extends StatelessWidget {
  const _SupplyCard({
    required this.supply,
    required this.onDelete,
    required this.onEdit,
  });
  final SupplyModel supply;
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
  // statusAr built dynamically in build() using context.l10n
  static const _catColors = {
    'feed':       Color(0xFF22C55E),
    'veterinary': Color(0xFFEF4444),
    'equipment':  Color(0xFF3B82F6),
    'seeds':      Color(0xFF10B981),
    'other':      Color(0xFF6B7280),
  };
  static const _catEmojis = {
    'feed': '🌾', 'veterinary': '💉',
    'equipment': '🔧', 'seeds': '🌱', 'other': '📦',
  };

  @override
  Widget build(BuildContext context) {
    final statusAr = {
      'pending':  context.l10n.pendingStatus,
      'approved': context.l10n.approvedStatus,
      'rejected': context.l10n.rejectedStatus,
    };
    final statusColor = _statusColor[supply.status] ?? AppColors.muted;
    final statusBg    = _statusBg[supply.status]    ?? AppColors.bg;
    final statusLabel = statusAr[supply.status]     ?? supply.status;
    final catColor    = _catColors[supply.category] ?? AppColors.muted;
    final fmt = NumberFormat('#,##0', 'ar');

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [
          BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 70,
            height: 80,
            decoration: BoxDecoration(
              color: catColor.withValues(alpha: 0.10),
              borderRadius:
                  const BorderRadius.horizontal(right: Radius.circular(11)),
            ),
            child: Center(
              child: Text(_catEmojis[supply.category] ?? '📦',
                  style: const TextStyle(fontSize: 30)),
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
                          supply.name,
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
                        child: Text(statusLabel,
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 10,
                              fontWeight: FontWeight.w700, color: statusColor)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${supply.categoryAr}  •  ${supply.quantity.toStringAsFixed(0)} ${supply.unit}',
                    style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                        color: AppColors.muted),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${fmt.format(supply.pricePerUnit)} ج.م / ${supply.unit}',
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 14,
                            fontWeight: FontWeight.w800, color: AppColors.green),
                      ),
                      if (supply.deliveryAvailable)
                        Text('🚚 ${context.l10n.deliveryAvailable}',
                            style: const TextStyle(fontFamily: 'Cairo', fontSize: 10,
                                color: AppColors.blue)),
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

// ── Add Supply bottom sheet ───────────────────────────────────────────────────

class _AddSupplySheet extends ConsumerStatefulWidget {
  const _AddSupplySheet({required this.onCreated});
  final VoidCallback onCreated;

  @override
  ConsumerState<_AddSupplySheet> createState() => _AddSupplySheetState();
}

class _AddSupplySheetState extends ConsumerState<_AddSupplySheet> {
  final _nameCtrl  = TextEditingController();
  final _qtyCtrl   = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _unitCtrl  = TextEditingController(text: 'كيلو');

  String _category = 'feed';
  bool   _delivery = false;
  bool   _loading  = false;
  String? _error;

  static const _categories = [
    ('feed',       '🌾 علف'),
    ('veterinary', '💉 بيطري'),
    ('equipment',  '🔧 معدات'),
    ('seeds',      '🌱 بذور'),
    ('other',      '📦 أخرى'),
  ];

  @override
  void dispose() {
    _nameCtrl.dispose(); _qtyCtrl.dispose();
    _priceCtrl.dispose(); _unitCtrl.dispose();
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
      await createSupply(ref.read(dioProvider), {
        'name':             _nameCtrl.text.trim(),
        'category':         _category,
        'quantity':         double.tryParse(_qtyCtrl.text) ?? 0,
        'unit':             _unitCtrl.text.trim().isEmpty ? 'قطعة' : _unitCtrl.text.trim(),
        'pricePerUnit':     double.tryParse(_priceCtrl.text) ?? 0,
        'deliveryAvailable': _delivery,
      });
      widget.onCreated();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _error = context.l10n.addExpenseFailed;
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
                decoration: BoxDecoration(color: AppColors.border,
                    borderRadius: BorderRadius.circular(2)),
              ),
            ),
            Text(context.l10n.addSupply,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 17,
                    fontWeight: FontWeight.w800, color: AppColors.text)),
            const SizedBox(height: 16),
            Text(context.l10n.supplyCategory, style: const TextStyle(fontFamily: 'Cairo',
                fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.muted)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8, runSpacing: 8,
              children: _categories.map((c) => GestureDetector(
                onTap: () => setState(() => _category = c.$1),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _category == c.$1 ? AppColors.green : AppColors.bg,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _category == c.$1
                        ? AppColors.green : AppColors.border),
                  ),
                  child: Text(c.$2, style: TextStyle(fontFamily: 'Cairo',
                    fontSize: 12,
                    color: _category == c.$1 ? AppColors.white : AppColors.text)),
                ),
              )).toList(),
            ),
            const SizedBox(height: 14),
            _Field(controller: _nameCtrl, label: context.l10n.supplyName, hint: ''),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: _Field(controller: _qtyCtrl, label: context.l10n.supplyQuantity,
                  hint: '0', keyboardType: TextInputType.number)),
              const SizedBox(width: 10),
              Expanded(child: _Field(controller: _unitCtrl, label: context.l10n.supplyUnit,
                  hint: '')),
            ]),
            const SizedBox(height: 10),
            _Field(controller: _priceCtrl, label: context.l10n.supplyPrice,
                hint: '0', keyboardType: TextInputType.number),
            const SizedBox(height: 10),
            Row(children: [
              Switch(value: _delivery,
                onChanged: (v) => setState(() => _delivery = v),
                activeColor: AppColors.green),
              const SizedBox(width: 8),
              Text(context.l10n.supplyDelivery, style: const TextStyle(fontFamily: 'Cairo',
                  fontSize: 13, color: AppColors.text)),
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
                  : Text(context.l10n.addSupplyButton,
                      style: const TextStyle(fontFamily: 'Cairo',
                          fontWeight: FontWeight.w700, color: AppColors.white)),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Edit Supply bottom sheet (M13.3) ─────────────────────────────────────────

class _EditSupplySheet extends ConsumerStatefulWidget {
  const _EditSupplySheet({required this.supply, required this.onUpdated});
  final SupplyModel supply;
  final VoidCallback onUpdated;

  @override
  ConsumerState<_EditSupplySheet> createState() => _EditSupplySheetState();
}

class _EditSupplySheetState extends ConsumerState<_EditSupplySheet> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _qtyCtrl;
  late final TextEditingController _priceCtrl;
  late final TextEditingController _unitCtrl;

  late String _category;
  late bool   _delivery;
  bool _loading = false;
  String? _error;

  static const _categories = [
    ('feed',       '🌾 علف'),
    ('veterinary', '💉 بيطري'),
    ('equipment',  '🔧 معدات'),
    ('seeds',      '🌱 بذور'),
    ('other',      '📦 أخرى'),
  ];

  @override
  void initState() {
    super.initState();
    _nameCtrl  = TextEditingController(text: widget.supply.name);
    _qtyCtrl   = TextEditingController(
        text: widget.supply.quantity.toStringAsFixed(0));
    _priceCtrl = TextEditingController(
        text: widget.supply.pricePerUnit.toStringAsFixed(0));
    _unitCtrl  = TextEditingController(text: widget.supply.unit);
    _category  = widget.supply.category;
    _delivery  = widget.supply.deliveryAvailable;
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _qtyCtrl.dispose();
    _priceCtrl.dispose(); _unitCtrl.dispose();
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
      await updateSupply(ref.read(dioProvider), widget.supply.id, {
        'name':              _nameCtrl.text.trim(),
        'category':          _category,
        'quantity':          double.tryParse(_qtyCtrl.text) ?? 0,
        'unit':              _unitCtrl.text.trim().isEmpty
            ? 'قطعة' : _unitCtrl.text.trim(),
        'pricePerUnit':      double.tryParse(_priceCtrl.text) ?? 0,
        'deliveryAvailable': _delivery,
      });
      widget.onUpdated();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() { _error = context.l10n.updateFailed; _loading = false; });
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
            Text(context.l10n.editListingTitle,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 17,
                    fontWeight: FontWeight.w800, color: AppColors.text)),
            const SizedBox(height: 16),
            Text(context.l10n.supplyCategory, style: const TextStyle(fontFamily: 'Cairo',
                fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.muted)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8, runSpacing: 8,
              children: _categories.map((c) => GestureDetector(
                onTap: () => setState(() => _category = c.$1),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _category == c.$1 ? AppColors.green : AppColors.bg,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _category == c.$1
                        ? AppColors.green : AppColors.border),
                  ),
                  child: Text(c.$2, style: TextStyle(fontFamily: 'Cairo',
                      fontSize: 12,
                      color: _category == c.$1 ? AppColors.white : AppColors.text)),
                ),
              )).toList(),
            ),
            const SizedBox(height: 14),
            _Field(controller: _nameCtrl, label: context.l10n.supplyName,
                hint: ''),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: _Field(controller: _qtyCtrl, label: context.l10n.supplyQuantity,
                  hint: '0', keyboardType: TextInputType.number)),
              const SizedBox(width: 10),
              Expanded(child: _Field(controller: _unitCtrl, label: context.l10n.supplyUnit,
                  hint: '')),
            ]),
            const SizedBox(height: 10),
            _Field(controller: _priceCtrl, label: context.l10n.supplyPrice,
                hint: '0', keyboardType: TextInputType.number),
            const SizedBox(height: 10),
            Row(children: [
              Switch(value: _delivery,
                onChanged: (v) => setState(() => _delivery = v),
                activeColor: AppColors.green),
              const SizedBox(width: 8),
              Text(context.l10n.supplyDelivery, style: const TextStyle(fontFamily: 'Cairo',
                  fontSize: 13, color: AppColors.text)),
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
                  : Text(context.l10n.saveSupplyButton,
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
  const _Field({required this.controller, required this.label,
      required this.hint, this.keyboardType = TextInputType.text});
  final TextEditingController controller;
  final String label, hint;
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
          filled: true, fillColor: AppColors.bg,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border)),
        ),
      ),
    ],
  );
}
