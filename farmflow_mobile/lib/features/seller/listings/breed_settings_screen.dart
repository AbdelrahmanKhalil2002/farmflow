import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import 'breed_service.dart';

const _kTypes = [
  ('cattle',  '🐄', 'أبقار'),
  ('buffalo', '🐃', 'جاموس'),
  ('sheep',   '🐑', 'خراف'),
  ('goat',    '🐐', 'ماعز'),
  ('camel',   '🐪', 'إبل'),
  ('horse',   '🐴', 'خيول'),
  ('poultry', '🐔', 'دواجن'),
  ('rabbit',  '🐇', 'أرانب'),
];

class BreedSettingsScreen extends ConsumerStatefulWidget {
  const BreedSettingsScreen({super.key});

  @override
  ConsumerState<BreedSettingsScreen> createState() =>
      _BreedSettingsScreenState();
}

class _BreedSettingsScreenState extends ConsumerState<BreedSettingsScreen> {
  String _selectedType = 'cattle';
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    final name = _ctrl.text.trim();
    if (name.isEmpty) return;
    await ref.read(breedNotifierProvider.notifier).addBreed(_selectedType, name);
    _ctrl.clear();
  }

  @override
  Widget build(BuildContext context) {
    final notifier = ref.read(breedNotifierProvider.notifier);
    // watch so UI rebuilds on changes
    ref.watch(breedNotifierProvider);
    final breeds = notifier.breedsFor(_selectedType);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        leading: const BackButton(color: AppColors.white),
        title: const Text(
          'إعدادات السلالات',
          style: TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w800,
              color: AppColors.white),
        ),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Type selector ───────────────────────────────────────────────────
          Container(
            color: AppColors.card,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _kTypes.map((t) {
                  final selected = _selectedType == t.$1;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedType = t.$1),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      margin: const EdgeInsets.only(left: 8),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 7),
                      decoration: BoxDecoration(
                        color: selected ? AppColors.green : AppColors.bg,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: selected
                              ? AppColors.green
                              : AppColors.border,
                        ),
                      ),
                      child: Text(
                        '${t.$2} ${t.$3}',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: selected ? AppColors.white : AppColors.text,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          const Divider(height: 1),

          // ── Breed chips ─────────────────────────────────────────────────────
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'السلالات المتاحة',
                    style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.muted),
                    textAlign: TextAlign.right,
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: breeds.map((b) {
                      final isCustom = notifier.isCustom(_selectedType, b);
                      return Chip(
                        label: Text(
                          b,
                          style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 13,
                              color: AppColors.text),
                        ),
                        backgroundColor: isCustom
                            ? AppColors.greenLight
                            : AppColors.bg,
                        side: BorderSide(
                          color:
                              isCustom ? AppColors.green : AppColors.border,
                        ),
                        deleteIcon: isCustom
                            ? const Icon(Icons.close_rounded, size: 16)
                            : null,
                        onDeleted: isCustom
                            ? () => ref
                                .read(breedNotifierProvider.notifier)
                                .removeCustomBreed(_selectedType, b)
                            : null,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 4, vertical: 2),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 8),
                  if (breeds.isNotEmpty)
                    Text(
                      'السلالات باللون الأخضر هي سلالات مضافة منك',
                      style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
                          color: AppColors.muted),
                      textAlign: TextAlign.right,
                    ),
                ],
              ),
            ),
          ),

          // ── Add breed ───────────────────────────────────────────────────────
          Container(
            color: AppColors.card,
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 12,
              bottom: MediaQuery.of(context).viewInsets.bottom + 12,
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    textDirection: TextDirection.rtl,
                    style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 13,
                        color: AppColors.text),
                    decoration: InputDecoration(
                      hintText: 'أضف سلالة جديدة...',
                      hintStyle: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 13,
                          color: AppColors.muted),
                      filled: true,
                      fillColor: AppColors.bg,
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide:
                              const BorderSide(color: AppColors.border)),
                      enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide:
                              const BorderSide(color: AppColors.border)),
                      focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(
                              color: AppColors.green, width: 1.5)),
                    ),
                    onSubmitted: (_) => _add(),
                  ),
                ),
                const SizedBox(width: 10),
                FilledButton(
                  onPressed: _add,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.green,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text(
                    'إضافة',
                    style: TextStyle(
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.w700,
                        color: AppColors.white),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
