import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import 'animal_detail_service.dart';
import 'herd_service.dart';

class AnimalDetailScreen extends ConsumerStatefulWidget {
  const AnimalDetailScreen({super.key, required this.animalId});
  final String animalId;

  @override
  ConsumerState<AnimalDetailScreen> createState() => _AnimalDetailScreenState();
}

class _AnimalDetailScreenState extends ConsumerState<AnimalDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final asyncAnimal = ref.watch(animalDetailProvider(widget.animalId));

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: asyncAnimal.when(
        loading: () => Scaffold(
          appBar: AppBar(backgroundColor: AppColors.green,
              leading: const BackButton(color: AppColors.white)),
          body: const Center(
            child: CircularProgressIndicator(color: AppColors.green)),
        ),
        error: (e, _) => Scaffold(
          appBar: AppBar(backgroundColor: AppColors.green,
              leading: BackButton(color: AppColors.white,
                  onPressed: () => Navigator.pop(context))),
          body: EmptyState(
            icon: Icons.wifi_off_rounded,
            title: 'تعذّر التحميل',
            subtitle: e.toString(),
            actionLabel: 'إعادة المحاولة',
            action: () => ref.invalidate(animalDetailProvider(widget.animalId)),
          ),
        ),
        data: (animal) => NestedScrollView(
          headerSliverBuilder: (_, __) => [
            SliverAppBar(
              pinned: true,
              backgroundColor: AppColors.green,
              leading: const BackButton(color: AppColors.white),
              actions: [
                IconButton(
                  icon: const Icon(Icons.edit_outlined,
                      color: AppColors.white),
                  onPressed: () => context.push(
                      '/seller/herd/${widget.animalId}/edit'),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline,
                      color: AppColors.white),
                  onPressed: () async {
                    final ok = await showConfirmDialog(
                      context,
                      title: 'حذف الحيوان',
                      message: 'هل تريد حذف هذا الحيوان من القطيع؟\nلا يمكن التراجع عن هذا الإجراء.',
                      confirmLabel: 'حذف',
                      dangerous: true,
                    );
                    if (ok && mounted) {
                      await deleteAnimal(ref.read(dioProvider), widget.animalId);
                      ref.invalidate(myAnimalsProvider);
                      ref.invalidate(animalSummaryProvider);
                      if (mounted) context.pop();
                    }
                  },
                ),
              ],
              expandedHeight: 160,
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  color: AppColors.green,
                  child: Center(
                    child: Text(animal.typeEmoji,
                        style: const TextStyle(fontSize: 72)),
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(child: _HeaderCard(animal: animal)),
            SliverToBoxAdapter(
              child: TabBar(
                controller: _tabs,
                labelColor: AppColors.green,
                unselectedLabelColor: AppColors.muted,
                indicatorColor: AppColors.green,
                indicatorWeight: 3,
                labelStyle: const TextStyle(fontFamily: 'Cairo',
                    fontWeight: FontWeight.w700, fontSize: 13),
                tabs: const [
                  Tab(text: '📈 النمو'),
                  Tab(text: '💉 التطعيمات'),
                  Tab(text: '🏥 الطب'),
                ],
              ),
            ),
          ],
          body: TabBarView(
            controller: _tabs,
            children: [
              _WeightTab(animal: animal),
              _VaccinationsTab(animal: animal, animalId: widget.animalId),
              _MedicalTab(animalId: widget.animalId),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Header card ───────────────────────────────────────────────────────────────

class _HeaderCard extends ConsumerWidget {
  const _HeaderCard({required this.animal});
  final AnimalDetail animal;

  static const _pregnancyAr = {
    'pregnant':             '🤰 حامل',
    'recently_gave_birth':  '🐣 ولدت حديثاً',
    'none':                 '—',
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dateFmt = DateFormat('d MMM yyyy', 'ar');
    final prAr = _pregnancyAr[animal.pregnancyStatus] ?? '';

    return Container(
      color: AppColors.card,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                animal.breed ?? animal.typeAr,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 20,
                    fontWeight: FontWeight.w800, color: AppColors.text),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.greenBg,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '# ${animal.tagId}',
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                      fontWeight: FontWeight.w700, color: AppColors.greenText),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 12,
            children: [
              _InfoChip(
                  icon: Icons.calendar_today_outlined,
                  label: dateFmt.format(animal.birthDate)),
              _InfoChip(
                  icon: animal.gender == 'male'
                      ? Icons.male_outlined
                      : Icons.female_outlined,
                  label: animal.genderAr),
              if (animal.currentWeight != null)
                _InfoChip(
                    icon: Icons.monitor_weight_outlined,
                    label: '${animal.currentWeight!.toStringAsFixed(0)} كجم'),
              if (animal.color != null)
                _InfoChip(
                    icon: Icons.palette_outlined, label: animal.color!),
            ],
          ),
          if (animal.targetWeight != null) ...[
            const SizedBox(height: 10),
            _WeightProgressBar(
              current: animal.currentWeight ?? 0,
              target: animal.targetWeight!,
            ),
          ],
          // Pregnancy row — females only
          if (animal.gender == 'female') ...[
            const SizedBox(height: 10),
            Row(
              children: [
                if (prAr.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: animal.pregnancyStatus == 'pregnant'
                          ? const Color(0xFFFCE7F3)
                          : AppColors.greenBg,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(prAr,
                        style: TextStyle(
                          fontFamily: 'Cairo', fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: animal.pregnancyStatus == 'pregnant'
                              ? const Color(0xFFBE185D)
                              : AppColors.greenText,
                        )),
                  ),
                const Spacer(),
                TextButton.icon(
                  onPressed: () => _showPregnancyEditor(context, ref),
                  icon: const Icon(Icons.edit_outlined, size: 14,
                      color: AppColors.green),
                  label: const Text('تعديل الحمل',
                      style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                          color: AppColors.green)),
                  style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8)),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  void _showPregnancyEditor(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _PregnancyEditorSheet(
        animal: animal,
        onSaved: () => ref.invalidate(animalDetailProvider(animal.id)),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 13, color: AppColors.muted),
      const SizedBox(width: 4),
      Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
          color: AppColors.muted)),
    ],
  );
}

class _WeightProgressBar extends StatelessWidget {
  const _WeightProgressBar({required this.current, required this.target});
  final double current, target;

  @override
  Widget build(BuildContext context) {
    final pct = (current / target).clamp(0.0, 1.0);
    final fmt = NumberFormat('#,##0.#', 'ar');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('تقدم الوزن نحو الهدف',
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                    color: AppColors.muted)),
            Text('${fmt.format(current)} / ${fmt.format(target)} كجم',
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                    fontWeight: FontWeight.w700, color: AppColors.green)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct,
            backgroundColor: AppColors.greenBg,
            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.green),
            minHeight: 8,
          ),
        ),
      ],
    );
  }
}

// ── Weight chart tab ──────────────────────────────────────────────────────────

class _WeightTab extends ConsumerWidget {
  const _WeightTab({required this.animal});
  final AnimalDetail animal;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entries = animal.weightHistory;
    final dateFmt = DateFormat('d/M', 'ar');

    if (entries.isEmpty) {
      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const EmptyState(
              icon: Icons.monitor_weight_outlined,
              title: 'لا توجد إدخالات وزن',
              subtitle: 'سجّل أول وزن للحيوان',
            ),
            const SizedBox(height: 16),
            _WeightGoalCard(animal: animal),
          ],
        ),
      );
    }

    // Sort by date
    final sorted = [...entries]..sort((a, b) => a.date.compareTo(b.date));
    final spots = sorted.asMap().entries.map((e) =>
        FlSpot(e.key.toDouble(), e.value.weightKg)).toList();
    final maxY = sorted.map((e) => e.weightKg).reduce((a, b) => a > b ? a : b);
    final minY = sorted.map((e) => e.weightKg).reduce((a, b) => a < b ? a : b);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Chart
          Container(
            height: 220,
            padding: const EdgeInsets.fromLTRB(8, 16, 16, 8),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: LineChart(
              LineChartData(
                minY: (minY * 0.9).floorToDouble(),
                maxY: (maxY * 1.1).ceilToDouble(),
                gridData: FlGridData(
                  drawHorizontalLine: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (_) => FlLine(
                    color: AppColors.border, strokeWidth: 1),
                ),
                borderData: FlBorderData(show: false),
                titlesData: FlTitlesData(
                  rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false)),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 36,
                      getTitlesWidget: (v, _) => Text(
                        v.toStringAsFixed(0),
                        style: const TextStyle(fontFamily: 'Cairo',
                            fontSize: 9, color: AppColors.muted),
                      ),
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 22,
                      getTitlesWidget: (x, _) {
                        final i = x.toInt();
                        if (i < 0 || i >= sorted.length) return const SizedBox();
                        return Text(dateFmt.format(sorted[i].date),
                          style: const TextStyle(fontFamily: 'Cairo',
                              fontSize: 9, color: AppColors.muted));
                      },
                    ),
                  ),
                ),
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    color: AppColors.green,
                    barWidth: 3,
                    dotData: FlDotData(
                      getDotPainter: (_, __, ___, ____) => FlDotCirclePainter(
                        radius: 4,
                        color: AppColors.white,
                        strokeColor: AppColors.green,
                        strokeWidth: 2,
                      ),
                    ),
                    belowBarData: BarAreaData(
                      show: true,
                      color: AppColors.green.withValues(alpha: 0.08),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Weight history list
          ...sorted.reversed.take(10).map((e) => _WeightRow(entry: e)),
          // Add weight button
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () => _showAddWeightSheet(context, ref, animal.id),
            icon: const Icon(Icons.add, color: AppColors.green, size: 18),
            label: const Text('تسجيل وزن جديد',
                style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                    color: AppColors.green)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.green),
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 16),
          _WeightGoalCard(animal: animal),
        ],
      ),
    );
  }

  void _showAddWeightSheet(
      BuildContext context, WidgetRef ref, String animalId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _AddWeightSheet(
        animalId: animalId,
        onAdded: () => ref.invalidate(animalDetailProvider(animalId)),
      ),
    );
  }
}

class _WeightRow extends StatelessWidget {
  const _WeightRow({required this.entry});
  final WeightEntry entry;

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('d MMM yyyy', 'ar');
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.monitor_weight_outlined,
              size: 16, color: AppColors.green),
          const SizedBox(width: 8),
          Text(fmt.format(entry.date),
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                  color: AppColors.muted)),
          const Spacer(),
          Text('${entry.weightKg.toStringAsFixed(1)} كجم',
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 14,
                  fontWeight: FontWeight.w800, color: AppColors.text)),
        ],
      ),
    );
  }
}

class _AddWeightSheet extends ConsumerStatefulWidget {
  const _AddWeightSheet({required this.animalId, required this.onAdded});
  final String animalId;
  final VoidCallback onAdded;

  @override
  ConsumerState<_AddWeightSheet> createState() => _AddWeightSheetState();
}

class _AddWeightSheetState extends ConsumerState<_AddWeightSheet> {
  final _weightCtrl = TextEditingController();
  final _notesCtrl  = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _weightCtrl.dispose(); _notesCtrl.dispose(); super.dispose();
  }

  Future<void> _submit() async {
    final w = double.tryParse(_weightCtrl.text);
    if (w == null || w <= 0) {
      setState(() => _error = 'أدخل وزناً صحيحاً');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final dio = ref.read(dioProvider);
      await dio.post(ApiEndpoints.animalWeight(widget.animalId), data: {
        'weightKg': w,
        if (_notesCtrl.text.trim().isNotEmpty)
          'notes': _notesCtrl.text.trim(),
        'date': DateTime.now().toIso8601String(),
      });
      widget.onAdded();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() { _error = 'فشل في التسجيل'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
        20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(child: Container(margin: const EdgeInsets.symmetric(vertical: 12),
            width: 40, height: 4,
            decoration: BoxDecoration(color: AppColors.border,
                borderRadius: BorderRadius.circular(2)))),
        const Text('تسجيل وزن جديد',
            style: TextStyle(fontFamily: 'Cairo', fontSize: 17,
                fontWeight: FontWeight.w800, color: AppColors.text)),
        const SizedBox(height: 16),
        TextField(
          controller: _weightCtrl,
          keyboardType: TextInputType.number,
          autofocus: true,
          decoration: InputDecoration(
            labelText: 'الوزن (كجم)',
            labelStyle: const TextStyle(fontFamily: 'Cairo', color: AppColors.muted),
            filled: true, fillColor: AppColors.bg,
            suffixText: 'كجم',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.border)),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.border)),
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _notesCtrl,
          decoration: InputDecoration(
            hintText: 'ملاحظة (اختياري)',
            hintStyle: const TextStyle(fontFamily: 'Cairo', color: AppColors.muted),
            filled: true, fillColor: AppColors.bg,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.border)),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.border)),
          ),
        ),
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
              : const Text('تسجيل',
                  style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                      color: AppColors.white)),
        ),
      ],
    ),
  );
}

// ── Vaccinations tab ──────────────────────────────────────────────────────────

class _VaccinationsTab extends ConsumerWidget {
  const _VaccinationsTab({required this.animal, required this.animalId});
  final AnimalDetail animal;
  final String animalId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vaccinations = animal.vaccinations;
    final dateFmt = DateFormat('d MMM yyyy', 'ar');

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (vaccinations.isEmpty)
          const EmptyState(
            icon: Icons.vaccines_outlined,
            title: 'لا توجد تطعيمات مسجّلة',
          )
        else ...[
          ...vaccinations.reversed.map((v) => Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  const Text('💉', style: TextStyle(fontSize: 16)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(v.vaccine,
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 14,
                          fontWeight: FontWeight.w700, color: AppColors.text))),
                  Text(dateFmt.format(v.date),
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 11,
                          color: AppColors.muted)),
                ]),
                if (v.vet != null) ...[
                  const SizedBox(height: 4),
                  Text('د. ${v.vet}', style: const TextStyle(fontFamily: 'Cairo',
                      fontSize: 12, color: AppColors.muted)),
                ],
                if (v.nextDueDate != null) ...[
                  const SizedBox(height: 6),
                  Row(children: [
                    const Icon(Icons.schedule, size: 12, color: AppColors.amber),
                    const SizedBox(width: 4),
                    Text('الجرعة القادمة: ${dateFmt.format(v.nextDueDate!)}',
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 11,
                            color: AppColors.amber, fontWeight: FontWeight.w700)),
                  ]),
                ],
              ],
            ),
          )),
          const SizedBox(height: 8),
        ],
        OutlinedButton.icon(
          onPressed: () => _showAddVacSheet(context, ref),
          icon: const Icon(Icons.add, color: AppColors.green, size: 18),
          label: const Text('إضافة تطعيم',
              style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                  color: AppColors.green)),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: AppColors.green),
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ],
    );
  }

  void _showAddVacSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _AddVacSheet(
        animalId: animalId,
        onAdded: () => ref.invalidate(animalDetailProvider(animalId)),
      ),
    );
  }
}

class _AddVacSheet extends ConsumerStatefulWidget {
  const _AddVacSheet({required this.animalId, required this.onAdded});
  final String animalId;
  final VoidCallback onAdded;

  @override
  ConsumerState<_AddVacSheet> createState() => _AddVacSheetState();
}

class _AddVacSheetState extends ConsumerState<_AddVacSheet> {
  final _vaccineCtrl = TextEditingController();
  final _vetCtrl     = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() { _vaccineCtrl.dispose(); _vetCtrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (_vaccineCtrl.text.trim().isEmpty) {
      setState(() => _error = 'اسم اللقاح مطلوب');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(dioProvider).post(
        ApiEndpoints.animalVaccination(widget.animalId),
        data: {
          'vaccine': _vaccineCtrl.text.trim(),
          'date': DateTime.now().toIso8601String(),
          if (_vetCtrl.text.trim().isNotEmpty) 'vet': _vetCtrl.text.trim(),
        },
      );
      widget.onAdded();
      if (mounted) Navigator.pop(context);
    } catch (_) {
      setState(() { _error = 'فشل في الإضافة'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
        20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(child: Container(margin: const EdgeInsets.symmetric(vertical: 12),
            width: 40, height: 4,
            decoration: BoxDecoration(color: AppColors.border,
                borderRadius: BorderRadius.circular(2)))),
        const Text('إضافة تطعيم',
            style: TextStyle(fontFamily: 'Cairo', fontSize: 17,
                fontWeight: FontWeight.w800, color: AppColors.text)),
        const SizedBox(height: 14),
        _SheetField(controller: _vaccineCtrl, label: 'اسم اللقاح *', hint: 'مثال: FMD، PPR...'),
        const SizedBox(height: 10),
        _SheetField(controller: _vetCtrl, label: 'اسم الطبيب البيطري', hint: 'اختياري'),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: AppColors.red)),
        ],
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _loading ? null : _submit,
          style: FilledButton.styleFrom(backgroundColor: AppColors.green,
              padding: const EdgeInsets.symmetric(vertical: 14)),
          child: _loading
              ? const SizedBox(width: 20, height: 20,
                  child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2))
              : const Text('إضافة',
                  style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: AppColors.white)),
        ),
      ],
    ),
  );
}

// ── Medical tab ───────────────────────────────────────────────────────────────

class _MedicalTab extends ConsumerWidget {
  const _MedicalTab({required this.animalId});
  final String animalId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncMedical = ref.watch(animalMedicalProvider(animalId));
    final dateFmt = DateFormat('d MMM yyyy', 'ar');

    return asyncMedical.when(
      loading: () => const Padding(padding: EdgeInsets.all(16),
          child: ShimmerList(count: 3, cardHeight: 90)),
      error: (_, __) => const EmptyState(
          icon: Icons.medical_services_outlined,
          title: 'تعذّر تحميل السجلات الطبية'),
      data: (records) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (records.isEmpty)
            const EmptyState(
              icon: Icons.medical_services_outlined,
              title: 'لا توجد سجلات طبية',
            )
          else ...[
            ...records.reversed.map((r) => Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    const Text('🏥', style: TextStyle(fontSize: 16)),
                    const SizedBox(width: 8),
                    Expanded(child: Text(r.diagnosis ?? 'فحص طبي',
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 14,
                            fontWeight: FontWeight.w700, color: AppColors.text))),
                    Text(dateFmt.format(r.date),
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 11,
                            color: AppColors.muted)),
                  ]),
                  if (r.treatment != null) ...[
                    const SizedBox(height: 4),
                    Text('العلاج: ${r.treatment}',
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                            color: AppColors.muted)),
                  ],
                  if (r.medication != null) ...[
                    const SizedBox(height: 2),
                    Text('الدواء: ${r.medication}',
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                            color: AppColors.muted)),
                  ],
                  if (r.cost != null && r.cost! > 0) ...[
                    const SizedBox(height: 4),
                    Text(
                      'التكلفة: ${r.cost!.toStringAsFixed(0)} ج.م',
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                          fontWeight: FontWeight.w700, color: AppColors.red),
                    ),
                  ],
                  if (r.followUpDate != null) ...[
                    const SizedBox(height: 6),
                    Row(children: [
                      const Icon(Icons.schedule, size: 12, color: AppColors.amber),
                      const SizedBox(width: 4),
                      Text('متابعة: ${dateFmt.format(r.followUpDate!)}',
                          style: const TextStyle(fontFamily: 'Cairo', fontSize: 11,
                              color: AppColors.amber, fontWeight: FontWeight.w700)),
                    ]),
                  ],
                ],
              ),
            )),
            const SizedBox(height: 8),
          ],
          OutlinedButton.icon(
            onPressed: () => _showAddMedSheet(context, ref),
            icon: const Icon(Icons.add, color: AppColors.rose, size: 18),
            label: const Text('إضافة سجل طبي',
                style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                    color: AppColors.rose)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.rose),
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }

  void _showAddMedSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _AddMedSheet(
        animalId: animalId,
        onAdded: () => ref.invalidate(animalMedicalProvider(animalId)),
      ),
    );
  }
}

class _AddMedSheet extends ConsumerStatefulWidget {
  const _AddMedSheet({required this.animalId, required this.onAdded});
  final String animalId;
  final VoidCallback onAdded;

  @override
  ConsumerState<_AddMedSheet> createState() => _AddMedSheetState();
}

class _AddMedSheetState extends ConsumerState<_AddMedSheet> {
  final _diagCtrl  = TextEditingController();
  final _treatCtrl = TextEditingController();
  final _medCtrl   = TextEditingController();
  final _costCtrl  = TextEditingController();
  final _vetCtrl   = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _diagCtrl.dispose(); _treatCtrl.dispose(); _medCtrl.dispose();
    _costCtrl.dispose(); _vetCtrl.dispose(); super.dispose();
  }

  Future<void> _submit() async {
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(dioProvider).post(
        ApiEndpoints.animalMedical(widget.animalId),
        data: {
          'date': DateTime.now().toIso8601String(),
          if (_diagCtrl.text.trim().isNotEmpty)  'diagnosis':  _diagCtrl.text.trim(),
          if (_treatCtrl.text.trim().isNotEmpty) 'treatment':  _treatCtrl.text.trim(),
          if (_medCtrl.text.trim().isNotEmpty)   'medication': _medCtrl.text.trim(),
          if (_vetCtrl.text.trim().isNotEmpty)   'vet':        _vetCtrl.text.trim(),
          if (_costCtrl.text.trim().isNotEmpty)
            'cost': double.tryParse(_costCtrl.text) ?? 0,
        },
      );
      widget.onAdded();
      if (mounted) Navigator.pop(context);
    } catch (_) {
      setState(() { _error = 'فشل في الإضافة'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
        20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
    child: SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(child: Container(margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40, height: 4,
              decoration: BoxDecoration(color: AppColors.border,
                  borderRadius: BorderRadius.circular(2)))),
          const Text('إضافة سجل طبي',
              style: TextStyle(fontFamily: 'Cairo', fontSize: 17,
                  fontWeight: FontWeight.w800, color: AppColors.text)),
          const SizedBox(height: 14),
          _SheetField(controller: _diagCtrl, label: 'التشخيص', hint: 'المرض أو الحالة'),
          const SizedBox(height: 10),
          _SheetField(controller: _treatCtrl, label: 'العلاج', hint: 'طريقة العلاج'),
          const SizedBox(height: 10),
          _SheetField(controller: _medCtrl, label: 'الدواء', hint: 'اسم الدواء'),
          const SizedBox(height: 10),
          _SheetField(controller: _vetCtrl, label: 'الطبيب البيطري', hint: 'اختياري'),
          const SizedBox(height: 10),
          _SheetField(controller: _costCtrl, label: 'التكلفة (ج.م)',
              hint: '0', keyboardType: TextInputType.number),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(fontFamily: 'Cairo',
                fontSize: 12, color: AppColors.red)),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _loading ? null : _submit,
            style: FilledButton.styleFrom(backgroundColor: AppColors.rose,
                padding: const EdgeInsets.symmetric(vertical: 14)),
            child: _loading
                ? const SizedBox(width: 20, height: 20,
                    child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2))
                : const Text('إضافة السجل',
                    style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                        color: AppColors.white)),
          ),
        ],
      ),
    ),
  );
}

// ── Weight Goal Card (M10.8) ──────────────────────────────────────────────────

class _WeightGoalCard extends ConsumerWidget {
  const _WeightGoalCard({required this.animal});
  final AnimalDetail animal;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.flag_outlined, size: 18, color: AppColors.green),
              const SizedBox(width: 8),
              const Text('هدف الوزن',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 14,
                      fontWeight: FontWeight.w700, color: AppColors.text)),
              const Spacer(),
              TextButton.icon(
                onPressed: () => _showGoalSheet(context, ref),
                icon: const Icon(Icons.edit_outlined, size: 14,
                    color: AppColors.green),
                label: const Text('تعديل',
                    style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                        color: AppColors.green)),
                style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 8)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (animal.targetWeight != null)
            Text(
              'الهدف: ${animal.targetWeight!.toStringAsFixed(0)} كجم',
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 14,
                  fontWeight: FontWeight.w800, color: AppColors.green),
            )
          else
            const Text('لم يُحدَّد هدف بعد',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                    color: AppColors.muted)),
        ],
      ),
    );
  }

  void _showGoalSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _WeightGoalSheet(
        animalId: animal.id,
        current: animal.targetWeight,
        onSaved: () => ref.invalidate(animalDetailProvider(animal.id)),
      ),
    );
  }
}

class _WeightGoalSheet extends ConsumerStatefulWidget {
  const _WeightGoalSheet({
    required this.animalId,
    required this.onSaved,
    this.current,
  });
  final String animalId;
  final double? current;
  final VoidCallback onSaved;

  @override
  ConsumerState<_WeightGoalSheet> createState() => _WeightGoalSheetState();
}

class _WeightGoalSheetState extends ConsumerState<_WeightGoalSheet> {
  late final TextEditingController _ctrl;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(
        text: widget.current != null
            ? widget.current!.toStringAsFixed(0)
            : '');
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    final v = double.tryParse(_ctrl.text);
    if (v == null || v <= 0) {
      setState(() => _error = 'أدخل وزناً صحيحاً');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(dioProvider).put(
        ApiEndpoints.animalById(widget.animalId),
        data: {'targetWeight': v},
      );
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (_) {
      setState(() { _error = 'فشل في الحفظ'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
        20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(child: Container(margin: const EdgeInsets.symmetric(vertical: 12),
            width: 40, height: 4,
            decoration: BoxDecoration(color: AppColors.border,
                borderRadius: BorderRadius.circular(2)))),
        const Text('تعديل هدف الوزن',
            style: TextStyle(fontFamily: 'Cairo', fontSize: 17,
                fontWeight: FontWeight.w800, color: AppColors.text)),
        const SizedBox(height: 16),
        TextField(
          controller: _ctrl,
          keyboardType: TextInputType.number,
          autofocus: true,
          decoration: InputDecoration(
            labelText: 'الوزن المستهدف (كجم)',
            labelStyle: const TextStyle(fontFamily: 'Cairo', color: AppColors.muted),
            filled: true, fillColor: AppColors.bg,
            suffixText: 'كجم',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.border)),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.border)),
          ),
        ),
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
                  child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2))
              : const Text('حفظ الهدف',
                  style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                      color: AppColors.white)),
        ),
      ],
    ),
  );
}

// ── Pregnancy editor sheet (M10.12) ──────────────────────────────────────────

class _PregnancyEditorSheet extends ConsumerStatefulWidget {
  const _PregnancyEditorSheet({required this.animal, required this.onSaved});
  final AnimalDetail animal;
  final VoidCallback onSaved;

  @override
  ConsumerState<_PregnancyEditorSheet> createState() =>
      _PregnancyEditorSheetState();
}

class _PregnancyEditorSheetState extends ConsumerState<_PregnancyEditorSheet> {
  late String _status;
  DateTime? _expectedDate;
  bool _loading = false;
  String? _error;

  static const _statuses = [
    ('none',                'لا حمل'),
    ('pregnant',            '🤰 حامل'),
    ('recently_gave_birth', '🐣 ولدت حديثاً'),
  ];

  @override
  void initState() {
    super.initState();
    _status = widget.animal.pregnancyStatus ?? 'none';
    _expectedDate = widget.animal.expectedBirthDate;
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _expectedDate ??
          DateTime.now().add(const Duration(days: 60)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      locale: const Locale('ar'),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(primary: AppColors.green),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _expectedDate = picked);
  }

  Future<void> _submit() async {
    setState(() { _loading = true; _error = null; });
    try {
      final body = <String, dynamic>{'pregnancyStatus': _status};
      if (_status == 'pregnant' && _expectedDate != null) {
        body['expectedBirthDate'] = _expectedDate!.toIso8601String();
      }
      await ref.read(dioProvider).put(
        ApiEndpoints.animalById(widget.animal.id),
        data: body,
      );
      widget.onSaved();
      if (mounted) Navigator.pop(context);
    } catch (_) {
      setState(() { _error = 'فشل في الحفظ'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('d MMMM yyyy', 'ar');
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(child: Container(margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40, height: 4,
              decoration: BoxDecoration(color: AppColors.border,
                  borderRadius: BorderRadius.circular(2)))),
          const Text('حالة الحمل',
              style: TextStyle(fontFamily: 'Cairo', fontSize: 17,
                  fontWeight: FontWeight.w800, color: AppColors.text)),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8, runSpacing: 8,
            children: _statuses.map((s) => GestureDetector(
              onTap: () => setState(() => _status = s.$1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: _status == s.$1 ? AppColors.green : AppColors.bg,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: _status == s.$1 ? AppColors.green : AppColors.border),
                ),
                child: Text(s.$2, style: TextStyle(fontFamily: 'Cairo',
                    fontSize: 13, fontWeight: FontWeight.w700,
                    color: _status == s.$1 ? AppColors.white : AppColors.text)),
              ),
            )).toList(),
          ),
          if (_status == 'pregnant') ...[
            const SizedBox(height: 14),
            const Text('تاريخ الولادة المتوقع (اختياري)',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                    fontWeight: FontWeight.w700, color: AppColors.muted)),
            const SizedBox(height: 6),
            GestureDetector(
              onTap: _pickDate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                decoration: BoxDecoration(
                  color: AppColors.bg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _expectedDate != null
                      ? AppColors.green : AppColors.border),
                ),
                child: Row(
                  children: [
                    Icon(Icons.calendar_today_outlined, size: 16,
                        color: _expectedDate != null ? AppColors.green : AppColors.muted),
                    const SizedBox(width: 8),
                    Text(
                      _expectedDate != null
                          ? dateFmt.format(_expectedDate!)
                          : 'اختر التاريخ',
                      style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                          color: _expectedDate != null
                              ? AppColors.text : AppColors.muted),
                    ),
                  ],
                ),
              ),
            ),
          ],
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
                    child: CircularProgressIndicator(color: AppColors.white, strokeWidth: 2))
                : const Text('حفظ',
                    style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                        color: AppColors.white)),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

// ── Reusable sheet field ──────────────────────────────────────────────────────

class _SheetField extends StatelessWidget {
  const _SheetField({required this.controller, required this.label,
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
        style: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: AppColors.text),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 13, color: AppColors.muted),
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
