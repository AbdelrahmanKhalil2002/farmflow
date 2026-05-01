import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/image_compress_util.dart';
import '../../../shared/widgets/image_picker_grid.dart';
import 'seller_listings_service.dart';

class AddListingScreen extends ConsumerStatefulWidget {
  const AddListingScreen({super.key, this.prefillType, this.prefillBreed,
      this.prefillWeight});
  final String? prefillType;
  final String? prefillBreed;
  final String? prefillWeight;

  @override
  ConsumerState<AddListingScreen> createState() => _AddListingScreenState();
}

class _AddListingScreenState extends ConsumerState<AddListingScreen> {
  String _type         = 'cattle';
  String _deliveryType = 'none';

  late final TextEditingController _breedCtrl;
  late final TextEditingController _weightCtrl;
  final _ageCtrl      = TextEditingController();
  final _priceCtrl    = TextEditingController();
  final _descCtrl     = TextEditingController();

  List<XFile> _images    = [];
  bool _eidAvailable     = false;
  bool _slaughterService = false;
  bool _loading          = false;
  String? _error;

  final _scrollCtrl  = ScrollController();
  final _priceKey    = GlobalKey();

  static const _types = [
    ('cattle',  '🐄', 'أبقار'),  ('buffalo', '🐃', 'جاموس'),
    ('sheep',   '🐑', 'خراف'),   ('goat',    '🐐', 'ماعز'),
    ('camel',   '🐪', 'إبل'),    ('horse',   '🐴', 'خيول'),
    ('poultry', '🐔', 'دواجن'),  ('rabbit',  '🐇', 'أرانب'),
  ];
  static const _deliveryTypes = [
    ('none',  '🚫 بدون توصيل'),
    ('farm',  '🚛 توصيل من المزرعة'),
    ('admin', '📦 توصيل من المنصة'),
  ];

  @override
  void initState() {
    super.initState();
    _type         = widget.prefillType ?? 'cattle';
    _breedCtrl    = TextEditingController(text: widget.prefillBreed ?? '');
    _weightCtrl   = TextEditingController(text: widget.prefillWeight ?? '');
  }

  @override
  void dispose() {
    _breedCtrl.dispose(); _weightCtrl.dispose(); _ageCtrl.dispose();
    _priceCtrl.dispose(); _descCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _scrollTo(GlobalKey key) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ctx = key.currentContext;
      if (ctx != null) {
        Scrollable.ensureVisible(ctx,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut);
      }
    });
  }

  Future<void> _submit() async {
    if (_weightCtrl.text.trim().isEmpty || _priceCtrl.text.trim().isEmpty) {
      setState(() => _error = 'الوزن والسعر مطلوبان');
      _scrollTo(_priceKey);
      return;
    }
    final weight = double.tryParse(_weightCtrl.text);
    final price  = double.tryParse(_priceCtrl.text);
    final age    = int.tryParse(_ageCtrl.text);
    if (weight == null || price == null) {
      setState(() => _error = 'أدخل أرقاماً صحيحة للوزن والسعر');
      _scrollTo(_priceKey);
      return;
    }

    setState(() { _loading = true; _error = null; });
    try {
      final dio = ref.read(dioProvider);
      if (_images.isEmpty) {
        await dio.post(ApiEndpoints.listings, data: {
          'type':             _type,
          'weight':           weight,
          'price':            price,
          'deliveryType':     _deliveryType,
          'eidAvailable':     _eidAvailable,
          'slaughterService': _slaughterService,
          if (_breedCtrl.text.trim().isNotEmpty)
            'breed': _breedCtrl.text.trim(),
          if (age != null) 'age': age,
          if (_descCtrl.text.trim().isNotEmpty)
            'description': _descCtrl.text.trim(),
        });
      } else {
        final formData = FormData.fromMap({
          'type':             _type,
          'weight':           weight.toString(),
          'price':            price.toString(),
          'deliveryType':     _deliveryType,
          'eidAvailable':     _eidAvailable.toString(),
          'slaughterService': _slaughterService.toString(),
          if (_breedCtrl.text.trim().isNotEmpty)
            'breed': _breedCtrl.text.trim(),
          if (age != null) 'age': age.toString(),
          if (_descCtrl.text.trim().isNotEmpty)
            'description': _descCtrl.text.trim(),
        });
        for (final f in _images) {
          final c = await compressImage(f);
          formData.files.add(MapEntry('images',
              await MultipartFile.fromFile(c.path, filename: c.name)));
        }
        await dio.post(ApiEndpoints.listings, data: formData);
      }
      ref.invalidate(myListingsProvider);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() { _error = 'فشل في نشر الإعلان. حاول مجدداً.'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        leading: const BackButton(color: AppColors.white),
        title: const Text('إضافة إعلان',
            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                color: AppColors.white)),
      ),
      body: SingleChildScrollView(
        controller: _scrollCtrl,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Type ─────────────────────────────────────────────────────────
            _Label('نوع الحيوان'),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8, runSpacing: 8,
              children: _types.map((t) => GestureDetector(
                onTap: () => setState(() => _type = t.$1),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: _type == t.$1 ? AppColors.green : AppColors.card,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: _type == t.$1
                        ? AppColors.green : AppColors.border),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Text(t.$2, style: const TextStyle(fontSize: 18)),
                    const SizedBox(width: 6),
                    Text(t.$3, style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: _type == t.$1 ? AppColors.white : AppColors.text)),
                  ]),
                ),
              )).toList(),
            ),
            const SizedBox(height: 20),

            // ── Breed & Age ───────────────────────────────────────────────────
            Row(children: [
              Expanded(child: _Field(controller: _breedCtrl, label: 'السلالة',
                  hint: 'مثال: فريزيان')),
              const SizedBox(width: 12),
              Expanded(child: _Field(controller: _ageCtrl, label: 'العمر (شهور)',
                  hint: '0', keyboardType: TextInputType.number)),
            ]),
            const SizedBox(height: 14),

            // ── Weight & Price ────────────────────────────────────────────────
            KeyedSubtree(
              key: _priceKey,
              child: Row(children: [
                Expanded(child: _Field(controller: _weightCtrl, label: 'الوزن (كجم) *',
                    hint: '0', keyboardType: TextInputType.number)),
                const SizedBox(width: 12),
                Expanded(child: _Field(controller: _priceCtrl, label: 'السعر (ج.م) *',
                    hint: '0', keyboardType: TextInputType.number)),
              ]),
            ),
            const SizedBox(height: 14),

            // ── Delivery ──────────────────────────────────────────────────────
            _Label('طريقة التسليم'),
            const SizedBox(height: 8),
            ...(_deliveryTypes.map((d) => RadioListTile<String>(
              value: d.$1,
              groupValue: _deliveryType,
              onChanged: (v) => setState(() => _deliveryType = v!),
              title: Text(d.$2, style: const TextStyle(fontFamily: 'Cairo',
                  fontSize: 13, color: AppColors.text)),
              activeColor: AppColors.green,
              contentPadding: EdgeInsets.zero,
              dense: true,
            ))),
            const SizedBox(height: 14),

            // ── Eid options ───────────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFEF3C7)),
              ),
              child: Column(
                children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('🌙 متاح للعيد',
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.amber)),
                      Switch(value: _eidAvailable,
                          onChanged: (v) => setState(() => _eidAvailable = v),
                          activeColor: AppColors.amber),
                    ]),
                  if (_eidAvailable) ...[
                    const Divider(height: 12),
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('🔪 خدمة ذبح',
                            style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                                color: AppColors.text)),
                        Switch(value: _slaughterService,
                            onChanged: (v) =>
                                setState(() => _slaughterService = v),
                            activeColor: AppColors.green),
                      ]),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),

            // ── Description ───────────────────────────────────────────────────
            _Field(controller: _descCtrl, label: 'الوصف',
                hint: 'أي تفاصيل إضافية...', maxLines: 3),
            const SizedBox(height: 20),

            // ── Photos ────────────────────────────────────────────────────────
            _Label('صور الإعلان'),
            const SizedBox(height: 10),
            ImagePickerGrid(
              images: _images,
              onChanged: (imgs) => setState(() => _images = imgs),
            ),
            const SizedBox(height: 20),

            if (_error != null)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(color: AppColors.redBg,
                    borderRadius: BorderRadius.circular(10)),
                child: Text(_error!, style: const TextStyle(fontFamily: 'Cairo',
                    fontSize: 13, color: AppColors.red)),
              ),

            FilledButton(
              onPressed: _loading ? null : _submit,
              style: FilledButton.styleFrom(backgroundColor: AppColors.green,
                  padding: const EdgeInsets.symmetric(vertical: 15)),
              child: _loading
                  ? const SizedBox(width: 22, height: 22,
                      child: CircularProgressIndicator(
                          color: AppColors.white, strokeWidth: 2))
                  : const Text('نشر الإعلان',
                      style: TextStyle(fontFamily: 'Cairo', fontSize: 15,
                          fontWeight: FontWeight.w700, color: AppColors.white)),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Text(text,
    style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
        fontWeight: FontWeight.w700, color: AppColors.muted));
}

class _Field extends StatelessWidget {
  const _Field({required this.controller, required this.label, required this.hint,
      this.keyboardType = TextInputType.text, this.maxLines = 1});
  final TextEditingController controller;
  final String label, hint;
  final TextInputType keyboardType;
  final int maxLines;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
          fontWeight: FontWeight.w700, color: AppColors.muted)),
      const SizedBox(height: 6),
      TextField(
        controller: controller,
        keyboardType: keyboardType,
        maxLines: maxLines,
        style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: AppColors.text),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: AppColors.muted),
          filled: true, fillColor: AppColors.card,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.green, width: 1.5)),
        ),
      ),
    ],
  );
}
