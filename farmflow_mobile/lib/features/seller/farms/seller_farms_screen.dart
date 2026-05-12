import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';

// ── Local design tokens ───────────────────────────────────────────────────────
const _kBg     = AppColors.bg;
const _kCard   = AppColors.white;
const _kBorder = Color(0xFFE5E7EB);
const _kMuted  = Color(0xFF9CA3AF);
const _kText   = Color(0xFF1A2E1A);

// ── Data model ────────────────────────────────────────────────────────────────

class FarmModel {
  const FarmModel({
    required this.id,
    required this.name,
    required this.type,
    required this.governorate,
    required this.farmPhone,
    required this.bio,
    required this.animalTypes,
  });

  final String id;
  final String name;
  final String type;
  final String governorate;
  final String farmPhone;
  final String bio;
  final List<String> animalTypes;

  factory FarmModel.fromJson(Map<String, dynamic> json) => FarmModel(
        id: (json['_id'] ?? json['id'] ?? '') as String,
        name: (json['name'] ?? '') as String,
        type: (json['type'] ?? '') as String,
        governorate: (json['governorate'] ?? '') as String,
        farmPhone: (json['farmPhone'] ?? '') as String,
        bio: (json['bio'] ?? '') as String,
        animalTypes: (json['animalTypes'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            [],
      );
}

// ── Provider ──────────────────────────────────────────────────────────────────

final sellerFarmsProvider = FutureProvider<List<FarmModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(ApiEndpoints.farms);
  final data = res.data as List<dynamic>;
  return data.map((e) => FarmModel.fromJson(e as Map<String, dynamic>)).toList();
});

// ── Farm type metadata ────────────────────────────────────────────────────────

const _kFarmTypes = <(String, String, Color, Color)>[
  ('livestock', 'مواشي',    Color(0xFF3A7D44), Color(0xFFDCFCE7)),
  ('horses',    'خيل',      Color(0xFF7C3AED), Color(0xFFEDE9FE)),
  ('poultry',   'دواجن',    Color(0xFFD97706), Color(0xFFFEF3C7)),
  ('exotic',    'نادر ونعام', Color(0xFFDB2777), Color(0xFFFCE7F3)),
];

String _farmTypeAr(String type) {
  for (final t in _kFarmTypes) {
    if (t.$1 == type) return t.$2;
  }
  return type;
}

Color _farmTypeColor(String type) {
  for (final t in _kFarmTypes) {
    if (t.$1 == type) return t.$3;
  }
  return AppColors.green;
}

Color _farmTypeBg(String type) {
  for (final t in _kFarmTypes) {
    if (t.$1 == type) return t.$4;
  }
  return AppColors.greenBg;
}

// ── Animal-type emoji map ─────────────────────────────────────────────────────

const _kAnimalEmoji = <String, String>{
  'cattle':  '🐄',
  'sheep':   '🐑',
  'goat':    '🐐',
  'camel':   '🐪',
  'horse':   '🐎',
  'poultry': '🐔',
  'buffalo': '🐃',
  'other':   '🐾',
};

const _kAnimalAr = <String, String>{
  'cattle':  'أبقار',
  'sheep':   'أغنام',
  'goat':    'ماعز',
  'camel':   'إبل',
  'horse':   'خيل',
  'poultry': 'دواجن',
  'buffalo': 'جاموس',
  'other':   'أخرى',
};

// ── Egyptian governorates ─────────────────────────────────────────────────────

const _kGovernorates = <String>[
  'القاهرة', 'الجيزة', 'الإسكندرية', 'المنوفية', 'الشرقية',
  'الدقهلية', 'الغربية', 'كفر الشيخ', 'البحيرة', 'الفيوم',
  'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا',
  'الأقصر', 'أسوان', 'البحر الأحمر', 'شمال سيناء', 'جنوب سيناء',
  'مطروح', 'الوادي الجديد', 'بورسعيد', 'الإسماعيلية', 'السويس',
  'دمياط', 'القليوبية',
];

// ── Screen ────────────────────────────────────────────────────────────────────

class SellerFarmsScreen extends ConsumerStatefulWidget {
  const SellerFarmsScreen({super.key});

  @override
  ConsumerState<SellerFarmsScreen> createState() => _SellerFarmsScreenState();
}

class _SellerFarmsScreenState extends ConsumerState<SellerFarmsScreen> {
  @override
  Widget build(BuildContext context) {
    final asyncFarms = ref.watch(sellerFarmsProvider);

    return Scaffold(
      backgroundColor: _kBg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        leading: const BackButton(color: AppColors.white),
        title: const Text(
          'مزارمي',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w800,
            color: AppColors.white,
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.green,
        onPressed: () => _showFarmSheet(context, farm: null),
        icon: const Icon(Icons.add, color: AppColors.white),
        label: const Text(
          'إضافة مزرعة',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w700,
            color: AppColors.white,
          ),
        ),
      ),
      body: asyncFarms.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(16),
          child: ShimmerList(count: 4, cardHeight: 160),
        ),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: 'تعذّر تحميل المزارع',
          subtitle: e.toString(),
          actionLabel: 'إعادة المحاولة',
          action: () => ref.invalidate(sellerFarmsProvider),
        ),
        data: (farms) {
          if (farms.isEmpty) {
            return EmptyState(
              icon: Icons.agriculture_outlined,
              title: 'لا توجد مزارع',
              subtitle: 'أضف مزرعتك الأولى للبدء في البيع',
              actionLabel: 'أضف مزرعتك الأولى',
              action: () => _showFarmSheet(context, farm: null),
            );
          }
          return RefreshIndicator(
            color: AppColors.green,
            onRefresh: () async => ref.invalidate(sellerFarmsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              itemCount: farms.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, i) => _FarmCard(
                farm: farms[i],
                onEdit: () => _showFarmSheet(context, farm: farms[i]),
                onDelete: () => _deleteFarm(context, farms[i]),
              ),
            ),
          );
        },
      ),
    );
  }

  void _showFarmSheet(BuildContext context, {required FarmModel? farm}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: _kCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _FarmFormSheet(
        farm: farm,
        onSaved: () => ref.invalidate(sellerFarmsProvider),
      ),
    );
  }

  Future<void> _deleteFarm(BuildContext context, FarmModel farm) async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'حذف المزرعة',
      message: 'هل أنت متأكد من حذف مزرعة "${farm.name}"؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmLabel: 'حذف',
      dangerous: true,
    );
    if (!confirmed) return;

    try {
      await ref.read(dioProvider).delete(ApiEndpoints.farmById(farm.id));
      ref.invalidate(sellerFarmsProvider);
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'فشل حذف المزرعة. حاول مجدداً.',
              style: TextStyle(fontFamily: 'Cairo'),
            ),
            backgroundColor: AppColors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }
}

// ── Farm card ─────────────────────────────────────────────────────────────────

class _FarmCard extends StatelessWidget {
  const _FarmCard({
    required this.farm,
    required this.onEdit,
    required this.onDelete,
  });

  final FarmModel farm;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final typeColor = _farmTypeColor(farm.type);
    final typeBg    = _farmTypeBg(farm.type);
    final typeAr    = _farmTypeAr(farm.type);

    return Container(
      decoration: BoxDecoration(
        color: _kCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _kBorder),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header row ─────────────────────────────────────────────────
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Farm icon
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: typeBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Icon(
                      Icons.agriculture_rounded,
                      color: typeColor,
                      size: 22,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                // Name + type badge
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        farm.name,
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: _kText,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 3),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: typeBg,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          typeAr,
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: typeColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // Action buttons
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _ActionButton(
                      icon: Icons.edit_outlined,
                      color: AppColors.green,
                      onTap: onEdit,
                      tooltip: 'تعديل',
                    ),
                    const SizedBox(width: 2),
                    _ActionButton(
                      icon: Icons.delete_outline_rounded,
                      color: AppColors.red,
                      onTap: onDelete,
                      tooltip: 'حذف',
                    ),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 10),

            // ── Info row (governorate + phone) ──────────────────────────────
            Row(
              children: [
                const Text('📍', style: TextStyle(fontSize: 13)),
                const SizedBox(width: 4),
                Text(
                  farm.governorate,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 12,
                    color: _kMuted,
                  ),
                ),
                if (farm.farmPhone.isNotEmpty) ...[
                  const SizedBox(width: 12),
                  const Icon(Icons.phone_outlined, size: 13, color: _kMuted),
                  const SizedBox(width: 3),
                  Flexible(
                    child: Text(
                      farm.farmPhone,
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        color: _kMuted,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ],
            ),

            // ── Bio ─────────────────────────────────────────────────────────
            if (farm.bio.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                farm.bio,
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 12,
                  color: _kMuted,
                  height: 1.5,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],

            // ── Animal type chips ────────────────────────────────────────────
            if (farm.animalTypes.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: farm.animalTypes.map((a) {
                  final emoji = _kAnimalEmoji[a] ?? '🐾';
                  final label = _kAnimalAr[a] ?? a;
                  return Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.greenBg,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: AppColors.greenBorder.withValues(alpha: 0.5)),
                    ),
                    child: Text(
                      '$emoji $label',
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.greenText,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.color,
    required this.onTap,
    required this.tooltip,
  });

  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final String tooltip;

  @override
  Widget build(BuildContext context) => Tooltip(
        message: tooltip,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.all(6),
            child: Icon(icon, color: color, size: 20),
          ),
        ),
      );
}

// ── Farm form bottom sheet ─────────────────────────────────────────────────────

class _FarmFormSheet extends ConsumerStatefulWidget {
  const _FarmFormSheet({required this.farm, required this.onSaved});

  /// null → create mode; non-null → edit mode
  final FarmModel? farm;
  final VoidCallback onSaved;

  @override
  ConsumerState<_FarmFormSheet> createState() => _FarmFormSheetState();
}

class _FarmFormSheetState extends ConsumerState<_FarmFormSheet> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _bioCtrl;

  late String  _type;
  String?      _governorate;
  late List<String> _animalTypes;
  bool         _loading = false;
  String?      _error;

  bool get _isEdit => widget.farm != null;

  static const _animalOptions = <(String, String)>[
    ('cattle',  '🐄 أبقار'),
    ('sheep',   '🐑 أغنام'),
    ('goat',    '🐐 ماعز'),
    ('camel',   '🐪 إبل'),
    ('horse',   '🐎 خيل'),
    ('poultry', '🐔 دواجن'),
    ('buffalo', '🐃 جاموس'),
    ('other',   '🐾 أخرى'),
  ];

  @override
  void initState() {
    super.initState();
    final f = widget.farm;
    _nameCtrl   = TextEditingController(text: f?.name ?? '');
    _phoneCtrl  = TextEditingController(text: f?.farmPhone ?? '');
    _bioCtrl    = TextEditingController(text: f?.bio ?? '');
    _type        = f?.type ?? 'livestock';
    _governorate = f?.governorate.isEmpty == true ? null : f?.governorate;
    _animalTypes = List<String>.from(f?.animalTypes ?? []);
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _bioCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'اسم المزرعة مطلوب');
      return;
    }
    if (_governorate == null) {
      setState(() => _error = 'يرجى اختيار المحافظة');
      return;
    }

    setState(() {
      _loading = true;
      _error   = null;
    });

    final payload = {
      'name':        name,
      'type':        _type,
      'governorate': _governorate,
      'farmPhone':   _phoneCtrl.text.trim(),
      'bio':         _bioCtrl.text.trim(),
      'animalTypes': _animalTypes,
    };

    try {
      final dio = ref.read(dioProvider);
      if (_isEdit) {
        await dio.put(ApiEndpoints.farmById(widget.farm!.id), data: payload);
      } else {
        await dio.post(ApiEndpoints.farms, data: payload);
      }
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (_) {
      setState(() {
        _error   = _isEdit ? 'فشل تحديث المزرعة. حاول مجدداً.' : 'فشل إنشاء المزرعة. حاول مجدداً.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          0,
          20,
          20 + MediaQuery.of(context).viewInsets.bottom,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Drag handle
              Center(
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: _kBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Title
              Text(
                _isEdit ? 'تعديل المزرعة' : 'إضافة مزرعة جديدة',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: _kText,
                ),
              ),
              const SizedBox(height: 18),

              // ── Farm name ─────────────────────────────────────────────────
              _SheetField(
                controller: _nameCtrl,
                label: 'اسم المزرعة',
                hint: 'مثال: مزرعة النيل',
              ),
              const SizedBox(height: 12),

              // ── Farm type dropdown ────────────────────────────────────────
              _DropdownSection<String>(
                label: 'نوع المزرعة',
                value: _type,
                items: _kFarmTypes
                    .map(
                      (t) => DropdownMenuItem<String>(
                        value: t.$1,
                        child: Text(
                          t.$2,
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 13,
                            color: _kText,
                          ),
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (v) => setState(() => _type = v!),
              ),
              const SizedBox(height: 12),

              // ── Governorate dropdown ──────────────────────────────────────
              _DropdownSection<String>(
                label: 'المحافظة',
                value: _governorate,
                hint: 'اختر المحافظة',
                items: _kGovernorates
                    .map(
                      (g) => DropdownMenuItem<String>(
                        value: g,
                        child: Text(
                          g,
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 13,
                            color: _kText,
                          ),
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (v) => setState(() => _governorate = v),
              ),
              const SizedBox(height: 12),

              // ── Phone ─────────────────────────────────────────────────────
              _SheetField(
                controller: _phoneCtrl,
                label: 'رقم الهاتف',
                hint: '01xxxxxxxxx',
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),

              // ── Bio ───────────────────────────────────────────────────────
              _SheetField(
                controller: _bioCtrl,
                label: 'نبذة عن المزرعة',
                hint: 'وصف مختصر عن المزرعة...',
                maxLines: 3,
              ),
              const SizedBox(height: 14),

              // ── Animal types ──────────────────────────────────────────────
              const Text(
                'أنواع الحيوانات',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: _kMuted,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _animalOptions.map((a) {
                  final selected = _animalTypes.contains(a.$1);
                  return GestureDetector(
                    onTap: () => setState(() {
                      if (selected) {
                        _animalTypes.remove(a.$1);
                      } else {
                        _animalTypes.add(a.$1);
                      }
                    }),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 11, vertical: 6),
                      decoration: BoxDecoration(
                        color: selected ? AppColors.green : AppColors.bg,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: selected
                              ? AppColors.green
                              : _kBorder,
                        ),
                      ),
                      child: Text(
                        a.$2,
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: selected ? AppColors.white : _kText,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),

              // ── Error ─────────────────────────────────────────────────────
              if (_error != null) ...[
                Text(
                  _error!,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 12,
                    color: AppColors.red,
                  ),
                ),
                const SizedBox(height: 10),
              ],

              // ── Save button ───────────────────────────────────────────────
              FilledButton(
                onPressed: _loading ? null : _submit,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.green,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _loading
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          color: AppColors.white,
                          strokeWidth: 2.5,
                        ),
                      )
                    : Text(
                        _isEdit ? 'حفظ التعديلات' : 'إضافة المزرعة',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.white,
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Helper widgets ─────────────────────────────────────────────────────────────

class _SheetField extends StatelessWidget {
  const _SheetField({
    required this.controller,
    required this.label,
    required this.hint,
    this.keyboardType = TextInputType.text,
    this.maxLines = 1,
  });

  final TextEditingController controller;
  final String label;
  final String hint;
  final TextInputType keyboardType;
  final int maxLines;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: _kMuted,
            ),
          ),
          const SizedBox(height: 5),
          TextField(
            controller: controller,
            keyboardType: keyboardType,
            maxLines: maxLines,
            textDirection: TextDirection.rtl,
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize: 13,
              color: _kText,
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(
                fontFamily: 'Cairo',
                fontSize: 13,
                color: _kMuted,
              ),
              filled: true,
              fillColor: AppColors.bg,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: _kBorder),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: _kBorder),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide:
                    const BorderSide(color: AppColors.green, width: 1.5),
              ),
            ),
          ),
        ],
      );
}

class _DropdownSection<T> extends StatelessWidget {
  const _DropdownSection({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    this.hint,
  });

  final String label;
  final T? value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;
  final String? hint;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: _kMuted,
            ),
          ),
          const SizedBox(height: 5),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 13),
            decoration: BoxDecoration(
              color: AppColors.bg,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: _kBorder),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<T>(
                value: value,
                isExpanded: true,
                hint: hint != null
                    ? Text(
                        hint!,
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 13,
                          color: _kMuted,
                        ),
                      )
                    : null,
                icon: const Icon(Icons.keyboard_arrow_down,
                    color: _kMuted, size: 20),
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 13,
                  color: _kText,
                ),
                onChanged: onChanged,
                items: items,
              ),
            ),
          ),
        ],
      );
}
