import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/image_helper.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import 'herd_service.dart';
import 'package:cached_network_image/cached_network_image.dart';

class HerdScreen extends ConsumerStatefulWidget {
  const HerdScreen({super.key});

  @override
  ConsumerState<HerdScreen> createState() => _HerdScreenState();
}

class _HerdScreenState extends ConsumerState<HerdScreen> {
  String _typeFilter = 'all';
  final  _scrollCtrl = ScrollController();

  static const _types = [
    ('all',     'الكل'),
    ('cattle',  'أبقار'),
    ('buffalo', 'جاموس'),
    ('sheep',   'خراف'),
    ('goat',    'ماعز'),
    ('camel',   'إبل'),
    ('horse',   'خيول'),
    ('poultry', 'دواجن'),
    ('rabbit',  'أرانب'),
  ];

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollCtrl.position.pixels >=
        _scrollCtrl.position.maxScrollExtent - 200) {
      ref.read(paginatedAnimalsProvider.notifier).loadMore();
    }
  }

  void _setTypeFilter(String f) {
    setState(() => _typeFilter = f);
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final asyncAnimals = ref.watch(paginatedAnimalsProvider);
    final asyncSummary = ref.watch(animalSummaryProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        title: const Text(
          'إدارة القطيع',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w800,
            color: AppColors.white,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(44),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: Row(
              children: _types.map((t) {
                final selected = _typeFilter == t.$1;
                return GestureDetector(
                  onTap: () => _setTypeFilter(t.$1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    margin: const EdgeInsets.only(left: 6),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: selected
                          ? AppColors.white
                          : AppColors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      t.$2,
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: selected ? AppColors.green : AppColors.white,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.green,
        onPressed: () => context.push('/seller/herd/add'),
        icon: const Icon(Icons.add, color: AppColors.white),
        label: const Text(
          'إضافة حيوان',
          style: TextStyle(
              fontFamily: 'Cairo', fontWeight: FontWeight.w700,
              color: AppColors.white),
        ),
      ),
      body: asyncAnimals.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(16),
          child: ShimmerList(count: 5, cardHeight: 90),
        ),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: 'تعذّر التحميل',
          subtitle: e.toString(),
          actionLabel: 'إعادة المحاولة',
          action: () => ref.read(paginatedAnimalsProvider.notifier).refresh(),
        ),
        data: (state) {
          final filtered = _typeFilter == 'all'
              ? state.items
              : state.items.where((a) => a.type == _typeFilter).toList();

          return RefreshIndicator(
            color: AppColors.green,
            onRefresh: () async {
              await ref.read(paginatedAnimalsProvider.notifier).refresh();
              ref.invalidate(animalSummaryProvider);
            },
            child: ListView(
              controller: _scrollCtrl,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              children: [
                // Summary strip
                asyncSummary.when(
                  loading: () => const ShimmerCard(height: 60),
                  error: (_, __) => const SizedBox.shrink(),
                  data: (s) => _SummaryStrip(summary: s),
                ),
                const SizedBox(height: 14),
                if (filtered.isEmpty)
                  const EmptyState(
                    icon: Icons.pets_outlined,
                    title: 'لا توجد حيوانات',
                    subtitle: 'سجّل حيوانك الأول في القطيع',
                  )
                else ...[
                  ...filtered.map((a) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _AnimalCard(animal: a),
                  )),
                  if (state.hasMore)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Center(child: CircularProgressIndicator(
                        color: AppColors.green, strokeWidth: 2.5)),
                    ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

// ── Summary strip ─────────────────────────────────────────────────────────────

class _SummaryStrip extends StatelessWidget {
  const _SummaryStrip({required this.summary});
  final AnimalSummary summary;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(child: _SummaryChip(
        label: 'الإجمالي', value: summary.total, color: AppColors.green)),
      const SizedBox(width: 8),
      Expanded(child: _SummaryChip(
        label: 'ذكور', value: summary.male, color: AppColors.blue)),
      const SizedBox(width: 8),
      Expanded(child: _SummaryChip(
        label: 'إناث', value: summary.female, color: AppColors.rose)),
      if (summary.pregnant > 0) ...[
        const SizedBox(width: 8),
        Expanded(child: _SummaryChip(
          label: 'حوامل', value: summary.pregnant, color: AppColors.amber)),
      ],
    ],
  );
}

class _SummaryChip extends StatelessWidget {
  const _SummaryChip({
    required this.label,
    required this.value,
    required this.color,
  });
  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.10),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: color.withValues(alpha: 0.25)),
    ),
    child: Column(
      children: [
        Text(
          '$value',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: color,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Cairo',
            fontSize: 10,
            color: AppColors.muted,
          ),
        ),
      ],
    ),
  );
}

// ── Animal card ───────────────────────────────────────────────────────────────

class _AnimalCard extends StatelessWidget {
  const _AnimalCard({required this.animal});
  final AnimalModel animal;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/seller/herd/${animal.id}'),
      child: Container(
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
          // Image / emoji
          ClipRRect(
            borderRadius:
                const BorderRadius.horizontal(right: Radius.circular(13)),
            child: SizedBox(
              width: 80,
              height: 80,
              child: animal.images.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: imageUrl(animal.images.first),
                      fit: BoxFit.cover,
                      placeholder: (_, __) => const ShimmerFill(),
                      errorWidget: (_, __, ___) =>
                          _AnimalPlaceholder(emoji: animal.typeEmoji),
                    )
                  : _AnimalPlaceholder(emoji: animal.typeEmoji),
            ),
          ),
          // Info
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
                          animal.breed ?? animal.typeAr,
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppColors.text,
                          ),
                        ),
                      ),
                      // Medical badge
                      if (animal.medicalBadge)
                        const Padding(
                          padding: EdgeInsets.only(left: 4),
                          child: Text('🏥', style: TextStyle(fontSize: 14)),
                        ),
                      // Pregnancy badge
                      if (animal.isPregnant)
                        const Padding(
                          padding: EdgeInsets.only(left: 4),
                          child: Text('🤰', style: TextStyle(fontSize: 14)),
                        )
                      else if (animal.recentlyGaveBirth)
                        const Padding(
                          padding: EdgeInsets.only(left: 4),
                          child: Text('🐣', style: TextStyle(fontSize: 14)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${animal.genderAr}  •  ${animal.ageText}',
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 12,
                      color: AppColors.muted,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      // Tag
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.greenBg,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '# ${animal.tagId}',
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: AppColors.greenText,
                          ),
                        ),
                      ),
                      if (animal.weight != null) ...[
                        const SizedBox(width: 8),
                        Text(
                          '${animal.weight!.toStringAsFixed(0)} كجم',
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 12,
                            color: AppColors.muted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ));
  }
}

class _AnimalPlaceholder extends StatelessWidget {
  const _AnimalPlaceholder({required this.emoji});
  final String emoji;

  @override
  Widget build(BuildContext context) => Container(
    color: AppColors.greenBg,
    child: Center(child: Text(emoji, style: const TextStyle(fontSize: 32))),
  );
}
