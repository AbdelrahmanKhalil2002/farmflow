import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import '../../../core/api/image_helper.dart';
import '../../../core/l10n/l10n_ext.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import 'herd_service.dart';

class HerdScreen extends ConsumerStatefulWidget {
  const HerdScreen({super.key});

  @override
  ConsumerState<HerdScreen> createState() => _HerdScreenState();
}

class _HerdScreenState extends ConsumerState<HerdScreen> {
  String _typeFilter   = 'all';
  String _statusFilter = 'active';
  final  _scrollCtrl   = ScrollController();

  static const _types = [
    ('all',     'الكل'),
    ('cattle',  'أبقار 🐄'),
    ('buffalo', 'جاموس 🐃'),
    ('sheep',   'خراف 🐑'),
    ('goat',    'ماعز 🐐'),
    ('camel',   'إبل 🐪'),
    ('horse',   'خيول 🐴'),
    ('poultry', 'دواجن 🐔'),
    ('rabbit',  'أرانب 🐇'),
  ];

  static const _statuses = [
    ('active',   'نشط'),
    ('sold',     'مُباع'),
    ('deceased', 'متوفى'),
    ('all',      'الكل'),
  ];

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollCtrl.position.pixels >= _scrollCtrl.position.maxScrollExtent - 200) {
      ref.read(paginatedAnimalsProvider.notifier).loadMore();
    }
  }

  List<AnimalModel> _applyFilters(List<AnimalModel> all) {
    return all.where((a) {
      final matchesType   = _typeFilter == 'all' || a.type == _typeFilter;
      final matchesStatus = _statusFilter == 'all' || a.status == _statusFilter;
      return matchesType && matchesStatus;
    }).toList();
  }

  void _exportCsv(List<AnimalModel> animals) {
    final buf = StringBuffer('الرقم,النوع,السلالة,الجنس,العمر (شهر),الوزن (كجم),الحالة\n');
    for (final a in animals) {
      buf.writeln(
        '"${a.tagId}","${a.typeAr}","${a.breed ?? ""}","${a.genderAr}","${a.ageMonths}","${a.weight?.toStringAsFixed(1) ?? ""}","${_statusAr(a.status)}"',
      );
    }
    Share.share(buf.toString(), subject: 'قطيعي - FarmFlow');
  }

  String _statusAr(String s) => const {
    'active': 'نشط', 'sold': 'مُباع', 'deceased': 'متوفى',
  }[s] ?? s;

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
      backgroundColor: const Color(0xFFF7F8FA),
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        title: Text(context.l10n.herdTitle,
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                color: AppColors.white)),
        actions: [
          asyncAnimals.maybeWhen(
            data: (state) => IconButton(
              icon: const Icon(Icons.download_outlined, color: Colors.white),
              tooltip: 'تصدير CSV',
              onPressed: () => _exportCsv(_applyFilters(state.items)),
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(44),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: Row(
              children: _types.map((t) {
                final selected = _typeFilter == t.$1;
                return GestureDetector(
                  onTap: () => setState(() => _typeFilter = t.$1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    margin: const EdgeInsets.only(left: 6),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: selected ? AppColors.white : AppColors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(t.$2,
                        style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: selected ? AppColors.green : AppColors.white)),
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
        label: Text(context.l10n.addAnimalTitle,
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                color: AppColors.white)),
      ),
      body: asyncAnimals.when(
        loading: () => const Padding(padding: EdgeInsets.all(16),
            child: ShimmerList(count: 5, cardHeight: 90)),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: context.l10n.loadHerdFailed,
          subtitle: e.toString(),
          actionLabel: context.l10n.retry,
          action: () => ref.read(paginatedAnimalsProvider.notifier).refresh(),
        ),
        data: (state) {
          final filtered = _applyFilters(state.items);

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
                  loading: () => const ShimmerCard(height: 70),
                  error: (_, __) => const SizedBox.shrink(),
                  data: (s) => _SummaryStrip(summary: s),
                ),
                const SizedBox(height: 10),

                // Status filter chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
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
                            color: sel ? AppColors.green : Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: sel ? AppColors.green : const Color(0xFFE5E7EB)),
                          ),
                          child: Text(s.$2,
                              style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: sel ? Colors.white : const Color(0xFF6B7280))),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 12),

                // Results info
                Text('${filtered.length} حيوان',
                    style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                        color: Color(0xFF9CA3AF))),
                const SizedBox(height: 8),

                if (filtered.isEmpty)
                  EmptyState(
                    icon: Icons.pets_outlined,
                    title: context.l10n.noAnimals,
                    subtitle: context.l10n.noAnimalsSubtitle,
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
  Widget build(BuildContext context) {
    final avgAgeText = summary.avgAge > 0
        ? summary.avgAge < 12
            ? '${summary.avgAge.toStringAsFixed(0)} شهر'
            : '${(summary.avgAge / 12).toStringAsFixed(1)} سنة'
        : '—';
    final avgWtText = summary.avgWeight > 0
        ? '${summary.avgWeight.toStringAsFixed(0)} كجم'
        : '—';

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Expanded(child: _SummaryChip(label: context.l10n.herdTotal,
            value: summary.total.toString(), color: AppColors.green)),
        const SizedBox(width: 8),
        Expanded(child: _SummaryChip(label: context.l10n.herdMale,
            value: summary.male.toString(), color: AppColors.blue)),
        const SizedBox(width: 8),
        Expanded(child: _SummaryChip(label: context.l10n.herdFemale,
            value: summary.female.toString(), color: AppColors.rose)),
        if (summary.pregnant > 0) ...[
          const SizedBox(width: 8),
          Expanded(child: _SummaryChip(label: context.l10n.herdPregnant,
              value: summary.pregnant.toString(), color: AppColors.amber)),
        ],
      ]),
      if (summary.avgAge > 0 || summary.avgWeight > 0) ...[
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: _SummaryChip(label: 'متوسط العمر',
              value: avgAgeText, color: const Color(0xFF8B5CF6))),
          const SizedBox(width: 8),
          Expanded(child: _SummaryChip(label: 'متوسط الوزن',
              value: avgWtText, color: const Color(0xFF0EA5E9))),
          const SizedBox(width: 8),
          const Expanded(child: SizedBox.shrink()),
        ]),
      ],
    ]);
  }
}

class _SummaryChip extends StatelessWidget {
  const _SummaryChip({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
    decoration: BoxDecoration(
      color: Colors.white, borderRadius: BorderRadius.circular(10),
      boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 6, offset: Offset(0, 2))],
    ),
    child: Column(children: [
      Text(value, style: TextStyle(fontFamily: 'Cairo', fontSize: 16,
          fontWeight: FontWeight.w800, color: color)),
      Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 9,
          color: AppColors.muted), textAlign: TextAlign.center),
    ]),
  );
}

// ── Animal card ───────────────────────────────────────────────────────────────

class _AnimalCard extends StatelessWidget {
  const _AnimalCard({required this.animal});
  final AnimalModel animal;

  @override
  Widget build(BuildContext context) {
    final isVaxDue = animal.vaccinationDue;
    final nextVax  = animal.nextVaccinationDate;
    final dateFmt  = DateFormat('d MMM', 'ar');

    return GestureDetector(
      onTap: () => context.push('/seller/herd/${animal.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(12),
          border: isVaxDue ? Border.all(color: const Color(0xFFF59E0B), width: 1.5) : null,
          boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            // Image / emoji
            ClipRRect(
              borderRadius: const BorderRadius.horizontal(right: Radius.circular(13)),
              child: SizedBox(
                width: 80, height: 80,
                child: animal.images.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: imageUrl(animal.images.first), fit: BoxFit.cover,
                        placeholder: (_, __) => const ShimmerFill(),
                        errorWidget: (_, __, ___) => _AnimalPlaceholder(emoji: animal.typeEmoji))
                    : _AnimalPlaceholder(emoji: animal.typeEmoji),
              ),
            ),
            // Info
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text(animal.breed ?? animal.typeAr,
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 14,
                            fontWeight: FontWeight.w700, color: AppColors.text))),
                    if (animal.medicalBadge)
                      const Padding(padding: EdgeInsets.only(left: 4),
                          child: Text('🏥', style: TextStyle(fontSize: 13))),
                    if (animal.isPregnant)
                      const Padding(padding: EdgeInsets.only(left: 4),
                          child: Text('🤰', style: TextStyle(fontSize: 13)))
                    else if (animal.recentlyGaveBirth)
                      const Padding(padding: EdgeInsets.only(left: 4),
                          child: Text('🐣', style: TextStyle(fontSize: 13))),
                    if (isVaxDue)
                      const Padding(padding: EdgeInsets.only(left: 4),
                          child: Text('💉', style: TextStyle(fontSize: 13))),
                  ]),
                  const SizedBox(height: 3),
                  Text('${animal.genderAr}  •  ${animal.ageText}',
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: AppColors.muted)),
                  const SizedBox(height: 3),
                  Row(children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: AppColors.greenBg,
                          borderRadius: BorderRadius.circular(6)),
                      child: Text('# ${animal.tagId}',
                          style: const TextStyle(fontFamily: 'Cairo', fontSize: 10,
                              fontWeight: FontWeight.w700, color: AppColors.greenText)),
                    ),
                    if (animal.weight != null) ...[
                      const SizedBox(width: 8),
                      Text('${animal.weight!.toStringAsFixed(0)} كجم',
                          style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: AppColors.muted)),
                    ],
                    const Spacer(),
                    // Status badge for non-active
                    if (animal.status != 'active')
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: animal.status == 'sold'
                              ? const Color(0xFFF3F4F6)
                              : const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          animal.status == 'sold' ? 'مُباع' : 'متوفى',
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: animal.status == 'sold'
                                  ? const Color(0xFF6B7280)
                                  : AppColors.red),
                        ),
                      ),
                  ]),
                ]),
              ),
            ),
          ]),

          // Vaccination alert
          if (isVaxDue && nextVax != null) ...[
            const Divider(height: 1),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
              decoration: const BoxDecoration(
                color: Color(0xFFFEF3C7),
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(12)),
              ),
              child: Row(children: [
                const Icon(Icons.vaccines_outlined, size: 13, color: Color(0xFFF59E0B)),
                const SizedBox(width: 6),
                Text(
                  'تطعيم مستحق: ${dateFmt.format(nextVax)}',
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 11,
                      color: Color(0xFF92400E), fontWeight: FontWeight.w600),
                ),
              ]),
            ),
          ],
        ]),
      ),
    );
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
