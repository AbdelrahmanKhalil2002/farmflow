import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/l10n/l10n_ext.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/image_compress_util.dart';
import '../../../shared/widgets/image_picker_grid.dart';
import 'animal_detail_service.dart';
import 'herd_service.dart';

class EditAnimalScreen extends ConsumerStatefulWidget {
  const EditAnimalScreen({super.key, required this.animalId});
  final String animalId;

  @override
  ConsumerState<EditAnimalScreen> createState() => _EditAnimalScreenState();
}

class _EditAnimalScreenState extends ConsumerState<EditAnimalScreen> {
  String _type   = 'cattle';
  String _gender = 'male';

  final _breedCtrl  = TextEditingController();
  final _tagCtrl    = TextEditingController();
  final _weightCtrl = TextEditingController();
  final _colorCtrl  = TextEditingController();
  final _notesCtrl  = TextEditingController();

  DateTime? _birthDate;
  List<XFile> _images = [];
  bool _loading     = false;
  bool _initialized = false;
  String? _error;

  static const _types = [
    ('cattle',  '🐄', 'أبقار'),  ('buffalo', '🐃', 'جاموس'),
    ('sheep',   '🐑', 'خراف'),   ('goat',    '🐐', 'ماعز'),
    ('camel',   '🐪', 'إبل'),    ('horse',   '🐴', 'خيول'),
    ('poultry', '🐔', 'دواجن'),  ('rabbit',  '🐇', 'أرانب'),
  ];

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      try {
        final animal =
            await ref.read(animalDetailProvider(widget.animalId).future);
        if (mounted) {
          setState(() {
            _type            = animal.type;
            _gender          = animal.gender;
            _tagCtrl.text    = animal.tagId;
            _breedCtrl.text  = animal.breed ?? '';
            _weightCtrl.text = animal.currentWeight?.toStringAsFixed(0) ?? '';
            _colorCtrl.text  = animal.color ?? '';
            _notesCtrl.text  = animal.notes ?? '';
            _birthDate       = animal.birthDate;
            _initialized     = true;
          });
        }
      } catch (_) {
        if (mounted) setState(() => _error = context.l10n.loadAnimalFailed);
      }
    });
  }

  @override
  void dispose() {
    _breedCtrl.dispose(); _tagCtrl.dispose(); _weightCtrl.dispose();
    _colorCtrl.dispose(); _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() { _loading = true; _error = null; });
    try {
      final dio = ref.read(dioProvider);
      if (_images.isEmpty) {
        await dio.put(ApiEndpoints.animalById(widget.animalId), data: {
          'type':   _type,
          'gender': _gender,
          if (_breedCtrl.text.trim().isNotEmpty)
            'breed':         _breedCtrl.text.trim(),
          if (_weightCtrl.text.trim().isNotEmpty)
            'currentWeight': double.tryParse(_weightCtrl.text),
          if (_colorCtrl.text.trim().isNotEmpty)
            'color':         _colorCtrl.text.trim(),
          if (_notesCtrl.text.trim().isNotEmpty)
            'notes':         _notesCtrl.text.trim(),
        });
      } else {
        final formData = FormData.fromMap({
          'type':   _type,
          'gender': _gender,
          if (_breedCtrl.text.trim().isNotEmpty)
            'breed':         _breedCtrl.text.trim(),
          if (_weightCtrl.text.trim().isNotEmpty)
            'currentWeight': _weightCtrl.text.trim(),
          if (_colorCtrl.text.trim().isNotEmpty)
            'color':         _colorCtrl.text.trim(),
          if (_notesCtrl.text.trim().isNotEmpty)
            'notes':         _notesCtrl.text.trim(),
        });
        for (final f in _images) {
          final c = await compressImage(f);
          formData.files.add(MapEntry('images',
              await MultipartFile.fromFile(c.path, filename: c.name)));
        }
        await dio.put(ApiEndpoints.animalById(widget.animalId), data: formData);
      }
      ref.invalidate(myAnimalsProvider);
      ref.invalidate(animalSummaryProvider);
      ref.invalidate(animalDetailProvider(widget.animalId));
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _error = context.l10n.editAnimalFailedMsg;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('d MMMM yyyy', 'ar');

    if (!_initialized) {
      return Scaffold(
        backgroundColor: AppColors.bg,
        appBar: AppBar(
          backgroundColor: AppColors.green,
          elevation: 0,
          leading: const BackButton(color: AppColors.white),
          title: Text(context.l10n.editAnimalTitle,
              style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                  color: AppColors.white)),
        ),
        body: _error != null
            ? Center(child: Text(_error!,
                style: const TextStyle(fontFamily: 'Cairo', color: AppColors.red)))
            : const Center(
                child: CircularProgressIndicator(color: AppColors.green)),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        leading: const BackButton(color: AppColors.white),
        title: Text(context.l10n.editAnimalTitle,
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                color: AppColors.white)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Tag (read-only) ───────────────────────────────────────────────
            _SectionLabel(context.l10n.tagId),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
              decoration: BoxDecoration(
                color: AppColors.bg,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: Text(_tagCtrl.text,
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
                      color: AppColors.muted, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(height: 14),

            // ── Birth date (read-only) ────────────────────────────────────────
            _SectionLabel(context.l10n.birthDateLabel),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
              decoration: BoxDecoration(
                color: AppColors.bg,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(children: [
                const Icon(Icons.calendar_today_outlined,
                    size: 16, color: AppColors.muted),
                const SizedBox(width: 8),
                Text(
                  _birthDate != null ? dateFmt.format(_birthDate!) : '—',
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
                      color: AppColors.muted),
                ),
              ]),
            ),
            const SizedBox(height: 20),

            // ── Type picker ───────────────────────────────────────────────────
            _SectionLabel(context.l10n.animalType),
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
                    border: Border.all(
                        color: _type == t.$1 ? AppColors.green : AppColors.border),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Text(t.$2, style: const TextStyle(fontSize: 18)),
                    const SizedBox(width: 6),
                    Text(t.$3, style: TextStyle(
                      fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w700,
                      color: _type == t.$1 ? AppColors.white : AppColors.text,
                    )),
                  ]),
                ),
              )).toList(),
            ),
            const SizedBox(height: 20),

            // ── Gender ────────────────────────────────────────────────────────
            _SectionLabel(context.l10n.animalGender),
            const SizedBox(height: 8),
            Row(children: [
              _GenderChip(label: '♂ ${context.l10n.male}', selected: _gender == 'male',
                  onTap: () => setState(() => _gender = 'male')),
              const SizedBox(width: 10),
              _GenderChip(label: '♀ ${context.l10n.female}', selected: _gender == 'female',
                  onTap: () => setState(() => _gender = 'female')),
            ]),
            const SizedBox(height: 20),

            // ── Breed ─────────────────────────────────────────────────────────
            _FormField(controller: _breedCtrl, label: context.l10n.breedLabel,
                hint: context.l10n.breedHint2),
            const SizedBox(height: 14),

            // ── Weight ────────────────────────────────────────────────────────
            _FormField(controller: _weightCtrl, label: context.l10n.currentWeightLabel,
                hint: '0', keyboardType: TextInputType.number),
            const SizedBox(height: 14),

            // ── Color ─────────────────────────────────────────────────────────
            _FormField(controller: _colorCtrl, label: context.l10n.colorLabel2,
                hint: context.l10n.colorHint2),
            const SizedBox(height: 14),

            // ── Notes ─────────────────────────────────────────────────────────
            _FormField(controller: _notesCtrl, label: context.l10n.notesLabel3,
                hint: context.l10n.notesHint2, maxLines: 3),
            const SizedBox(height: 20),

            // ── Photos ────────────────────────────────────────────────────────
            _SectionLabel(context.l10n.addPhotosLabel),
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
                decoration: BoxDecoration(
                    color: AppColors.redBg,
                    borderRadius: BorderRadius.circular(10)),
                child: Text(_error!, style: const TextStyle(
                    fontFamily: 'Cairo', fontSize: 13, color: AppColors.red)),
              ),

            FilledButton(
              onPressed: _loading ? null : _submit,
              style: FilledButton.styleFrom(
                  backgroundColor: AppColors.green,
                  padding: const EdgeInsets.symmetric(vertical: 15)),
              child: _loading
                  ? const SizedBox(width: 22, height: 22,
                      child: CircularProgressIndicator(
                          color: AppColors.white, strokeWidth: 2))
                  : Text(context.l10n.editAnimalButton,
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 15,
                          fontWeight: FontWeight.w700, color: AppColors.white)),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

// ── Shared widgets ────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Text(text,
    style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
        fontWeight: FontWeight.w700, color: AppColors.muted));
}

class _GenderChip extends StatelessWidget {
  const _GenderChip({required this.label, required this.selected,
      required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
      decoration: BoxDecoration(
        color: selected ? AppColors.green : AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: selected ? AppColors.green : AppColors.border),
      ),
      child: Text(label, style: TextStyle(
        fontFamily: 'Cairo', fontSize: 14, fontWeight: FontWeight.w700,
        color: selected ? AppColors.white : AppColors.text,
      )),
    ),
  );
}

class _FormField extends StatelessWidget {
  const _FormField({required this.controller, required this.label,
      required this.hint, this.keyboardType = TextInputType.text,
      this.maxLines = 1});
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
        style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
            color: AppColors.text),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
              color: AppColors.muted),
          filled: true, fillColor: AppColors.card,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border)),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border)),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(
                  color: AppColors.green, width: 1.5)),
        ),
      ),
    ],
  );
}
