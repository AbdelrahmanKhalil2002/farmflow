import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/l10n/l10n_ext.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import 'herd_service.dart';

// ── Models ─────────────────────────────────────────────────────────────────────

class VetAnimalRef {
  final String id;
  final String type;
  final String? breed;
  final String tagId;

  const VetAnimalRef({
    required this.id,
    required this.type,
    this.breed,
    required this.tagId,
  });

  static const _typeAr = {
    'cattle': 'أبقار', 'buffalo': 'جاموس', 'sheep': 'خراف',
    'goat':   'ماعز',  'camel':   'إبل',    'horse': 'خيول',
    'poultry': 'دواجن', 'rabbit': 'أرانب',  'other': 'أخرى',
  };
  static const _emojis = {
    'cattle': '🐄', 'buffalo': '🐃', 'sheep': '🐑', 'goat': '🐐',
    'camel':  '🐪', 'horse':   '🐴', 'poultry': '🐔', 'rabbit': '🐇',
  };

  String get typeAr    => _typeAr[type] ?? type;
  String get typeEmoji => _emojis[type] ?? '🐾';
  String get label     => tagId.isNotEmpty ? '#$tagId' : typeAr;

  factory VetAnimalRef.fromJson(Map<String, dynamic> j) => VetAnimalRef(
    id:    j['_id'] as String? ?? '',
    type:  j['type'] as String? ?? 'other',
    breed: j['breed'] as String?,
    tagId: j['tagId'] as String? ?? '',
  );
}

class VetMedicalRecord {
  final String id;
  final DateTime date;
  final String? diagnosis;
  final String? treatment;
  final String? medication;
  final String? vet;
  final double? cost;
  final DateTime? followUpDate;
  final bool resolved;
  final String? notes;
  final VetAnimalRef animal;

  const VetMedicalRecord({
    required this.id,
    required this.date,
    this.diagnosis,
    this.treatment,
    this.medication,
    this.vet,
    this.cost,
    this.followUpDate,
    this.resolved = false,
    this.notes,
    required this.animal,
  });

  factory VetMedicalRecord.fromJson(Map<String, dynamic> j) => VetMedicalRecord(
    id:           j['_id'] as String? ?? '',
    date:         DateTime.tryParse(j['date'] as String? ?? '') ?? DateTime.now(),
    diagnosis:    j['diagnosis'] as String?,
    treatment:    j['treatment'] as String?,
    medication:   j['medication'] as String?,
    vet:          j['vet'] as String?,
    cost:         (j['cost'] as num?)?.toDouble(),
    followUpDate: j['followUpDate'] != null
        ? DateTime.tryParse(j['followUpDate'].toString())
        : null,
    resolved:     j['resolved'] as bool? ?? false,
    notes:        j['notes'] as String?,
    animal:       VetAnimalRef.fromJson(j['animal'] as Map<String, dynamic>? ?? {}),
  );
}

class VetVaccinationEntry {
  final String id;
  final String vaccine;
  final DateTime date;
  final DateTime? nextDueDate;
  final String? vet;
  final String? notes;
  final VetAnimalRef animal;

  const VetVaccinationEntry({
    required this.id,
    required this.vaccine,
    required this.date,
    this.nextDueDate,
    this.vet,
    this.notes,
    required this.animal,
  });

  factory VetVaccinationEntry.fromJson(Map<String, dynamic> j) => VetVaccinationEntry(
    id:          j['_id'] as String? ?? '',
    vaccine:     j['vaccine'] as String? ?? '',
    date:        DateTime.tryParse(j['date'] as String? ?? '') ?? DateTime.now(),
    nextDueDate: j['nextDueDate'] != null
        ? DateTime.tryParse(j['nextDueDate'].toString())
        : null,
    vet:         j['vet'] as String?,
    notes:       j['notes'] as String?,
    animal:      VetAnimalRef.fromJson(j['animal'] as Map<String, dynamic>? ?? {}),
  );
}

// ── Providers ──────────────────────────────────────────────────────────────────

final vetMedicalProvider = FutureProvider<List<VetMedicalRecord>>((ref) async {
  final res = await ref.watch(dioProvider).get(ApiEndpoints.vetMedical);
  final data = res.data as List? ?? [];
  return data
      .map((e) => VetMedicalRecord.fromJson(e as Map<String, dynamic>))
      .toList();
});

final vetVaccinationsProvider =
    FutureProvider<List<VetVaccinationEntry>>((ref) async {
  final res = await ref.watch(dioProvider).get(ApiEndpoints.vetVaccinations);
  final data = res.data as List? ?? [];
  return data
      .map((e) => VetVaccinationEntry.fromJson(e as Map<String, dynamic>))
      .toList();
});

// ── Screen ─────────────────────────────────────────────────────────────────────

class VetRecordsScreen extends ConsumerStatefulWidget {
  const VetRecordsScreen({super.key});

  @override
  ConsumerState<VetRecordsScreen> createState() => _VetRecordsScreenState();
}

class _VetRecordsScreenState extends ConsumerState<VetRecordsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        leading: const BackButton(color: AppColors.white),
        title: Text(
          context.l10n.vetRecordsTitle,
          style: const TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w800,
              color: AppColors.white),
        ),
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.white,
          unselectedLabelColor: AppColors.white.withValues(alpha: 0.6),
          indicatorColor: AppColors.white,
          indicatorWeight: 3,
          labelStyle: const TextStyle(
              fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 13),
          tabs: [
            Tab(text: '🏥 ${context.l10n.medicalTab}'),
            Tab(text: '💉 ${context.l10n.vaccinationsTab}'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          const _MedicalTab(),
          const _VaccinationsTab(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddMedSheet(context),
        backgroundColor: AppColors.rose,
        icon: const Icon(Icons.add, color: AppColors.white),
        label: Text(
          context.l10n.newMedRecord,
          style: const TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w700,
              color: AppColors.white),
        ),
      ),
    );
  }

  void _showAddMedSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _AddMedWithAnimalSheet(
        onAdded: () {
          ref.invalidate(vetMedicalProvider);
        },
      ),
    );
  }
}

// ── Medical tab ────────────────────────────────────────────────────────────────

class _MedicalTab extends ConsumerWidget {
  const _MedicalTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(vetMedicalProvider);
    return async.when(
      loading: () => const Padding(
          padding: EdgeInsets.all(16),
          child: ShimmerList(count: 4, cardHeight: 100)),
      error: (_, __) => EmptyState(
        icon: Icons.medical_services_outlined,
        title: context.l10n.loadVetFailed,
        actionLabel: context.l10n.retry,
        action: () => ref.invalidate(vetMedicalProvider),
      ),
      data: (records) => RefreshIndicator(
        color: AppColors.green,
        onRefresh: () async => ref.invalidate(vetMedicalProvider),
        child: records.isEmpty
            ? SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Padding(
                  padding: const EdgeInsets.only(top: 60),
                  child: EmptyState(
                    icon: Icons.medical_services_outlined,
                    title: context.l10n.noMedRecords,
                    subtitle: context.l10n.addMedRecordHint,
                  ),
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                itemCount: records.length,
                itemBuilder: (ctx, i) =>
                    _MedicalCard(record: records[i]),
              ),
      ),
    );
  }
}

class _MedicalCard extends StatelessWidget {
  const _MedicalCard({required this.record});
  final VetMedicalRecord record;

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('d MMM yyyy', 'ar');
    final now     = DateTime.now();
    final hasDue  = record.followUpDate != null;
    final isOverdue = hasDue && record.followUpDate!.isBefore(now);
    final isSoon  = hasDue && !isOverdue &&
        record.followUpDate!.isBefore(now.add(const Duration(days: 7)));

    return GestureDetector(
      onTap: () => context.push('/seller/herd/${record.animal.id}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isOverdue
                ? AppColors.rose.withValues(alpha: 0.5)
                : AppColors.border,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Animal chip + date
            Row(children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.greenBg,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${record.animal.typeEmoji} ${record.animal.label}',
                  style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.greenText),
                ),
              ),
              const Spacer(),
              Text(
                dateFmt.format(record.date),
                style: const TextStyle(
                    fontFamily: 'Cairo', fontSize: 11, color: AppColors.muted),
              ),
            ]),
            const SizedBox(height: 8),
            // Diagnosis
            Text(
              record.diagnosis ?? context.l10n.medCheckup,
              style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: AppColors.text),
            ),
            if (record.treatment != null) ...[
              const SizedBox(height: 3),
              Text(
                context.l10n.treatmentPrefix(record.treatment!),
                style: const TextStyle(
                    fontFamily: 'Cairo', fontSize: 12, color: AppColors.muted),
              ),
            ],
            if (record.medication != null) ...[
              const SizedBox(height: 2),
              Text(
                context.l10n.medicationPrefix(record.medication!),
                style: const TextStyle(
                    fontFamily: 'Cairo', fontSize: 12, color: AppColors.muted),
              ),
            ],
            if (record.vet != null) ...[
              const SizedBox(height: 2),
              Text(
                context.l10n.doctorPrefix(record.vet!),
                style: const TextStyle(
                    fontFamily: 'Cairo', fontSize: 12, color: AppColors.muted),
              ),
            ],
            const SizedBox(height: 6),
            // Cost + follow-up row
            Row(children: [
              if (record.cost != null && record.cost! > 0)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${record.cost!.toStringAsFixed(0)} ج.م',
                    style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.rose),
                  ),
                ),
              if (record.cost != null && record.cost! > 0 && hasDue)
                const SizedBox(width: 8),
              if (hasDue)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isOverdue
                        ? const Color(0xFFFEE2E2)
                        : isSoon
                            ? const Color(0xFFFEF3C7)
                            : AppColors.greenBg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.schedule,
                        size: 11,
                        color: isOverdue
                            ? AppColors.rose
                            : isSoon
                                ? AppColors.amber
                                : AppColors.greenText,
                      ),
                      const SizedBox(width: 3),
                      Text(
                        isOverdue
                            ? context.l10n.overdueDate(dateFmt.format(record.followUpDate!))
                            : context.l10n.followUpDate(dateFmt.format(record.followUpDate!)),
                        style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: isOverdue
                                ? AppColors.rose
                                : isSoon
                                    ? AppColors.amber
                                    : AppColors.greenText),
                      ),
                    ],
                  ),
                ),
            ]),
          ],
        ),
      ),
    );
  }
}

// ── Vaccinations tab ───────────────────────────────────────────────────────────

class _VaccinationsTab extends ConsumerWidget {
  const _VaccinationsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(vetVaccinationsProvider);
    return async.when(
      loading: () => const Padding(
          padding: EdgeInsets.all(16),
          child: ShimmerList(count: 4, cardHeight: 90)),
      error: (_, __) => EmptyState(
        icon: Icons.vaccines_outlined,
        title: context.l10n.loadVacFailed,
        actionLabel: context.l10n.retry,
        action: () => ref.invalidate(vetVaccinationsProvider),
      ),
      data: (records) => RefreshIndicator(
        color: AppColors.green,
        onRefresh: () async => ref.invalidate(vetVaccinationsProvider),
        child: records.isEmpty
            ? SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Padding(
                  padding: const EdgeInsets.only(top: 60),
                  child: EmptyState(
                    icon: Icons.vaccines_outlined,
                    title: context.l10n.noVacRecords,
                    subtitle: context.l10n.vacRecordHint,
                  ),
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                itemCount: records.length,
                itemBuilder: (ctx, i) =>
                    _VaccinationCard(entry: records[i]),
              ),
      ),
    );
  }
}

class _VaccinationCard extends StatelessWidget {
  const _VaccinationCard({required this.entry});
  final VetVaccinationEntry entry;

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('d MMM yyyy', 'ar');
    final now     = DateTime.now();
    final hasDue  = entry.nextDueDate != null;
    final isOverdue = hasDue && entry.nextDueDate!.isBefore(now);
    final isSoon  = hasDue && !isOverdue &&
        entry.nextDueDate!.isBefore(now.add(const Duration(days: 14)));

    return GestureDetector(
      onTap: () => context.push('/seller/herd/${entry.animal.id}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isOverdue
                ? AppColors.amber.withValues(alpha: 0.5)
                : AppColors.border,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Animal chip + date
            Row(children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.greenBg,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${entry.animal.typeEmoji} ${entry.animal.label}',
                  style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.greenText),
                ),
              ),
              const Spacer(),
              Text(
                dateFmt.format(entry.date),
                style: const TextStyle(
                    fontFamily: 'Cairo', fontSize: 11, color: AppColors.muted),
              ),
            ]),
            const SizedBox(height: 8),
            // Vaccine name
            Row(children: [
              const Text('💉', style: TextStyle(fontSize: 14)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  entry.vaccine,
                  style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: AppColors.text),
                ),
              ),
            ]),
            if (entry.vet != null) ...[
              const SizedBox(height: 3),
              Text(
                context.l10n.doctorPrefix(entry.vet!),
                style: const TextStyle(
                    fontFamily: 'Cairo', fontSize: 12, color: AppColors.muted),
              ),
            ],
            if (hasDue) ...[
              const SizedBox(height: 6),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isOverdue
                      ? const Color(0xFFFEE2E2)
                      : isSoon
                          ? const Color(0xFFFEF3C7)
                          : AppColors.greenBg,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.event_outlined,
                      size: 11,
                      color: isOverdue
                          ? AppColors.rose
                          : isSoon
                              ? AppColors.amber
                              : AppColors.greenText,
                    ),
                    const SizedBox(width: 3),
                    Text(
                      isOverdue
                          ? context.l10n.overdueDate(dateFmt.format(entry.nextDueDate!))
                          : context.l10n.nextDose(dateFmt.format(entry.nextDueDate!)),
                      style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: isOverdue
                              ? AppColors.rose
                              : isSoon
                                  ? AppColors.amber
                                  : AppColors.greenText),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Add medical record with animal picker ──────────────────────────────────────

class _AddMedWithAnimalSheet extends ConsumerStatefulWidget {
  const _AddMedWithAnimalSheet({required this.onAdded});
  final VoidCallback onAdded;

  @override
  ConsumerState<_AddMedWithAnimalSheet> createState() =>
      _AddMedWithAnimalSheetState();
}

class _AddMedWithAnimalSheetState
    extends ConsumerState<_AddMedWithAnimalSheet> {
  AnimalModel? _selectedAnimal;
  final _diagCtrl  = TextEditingController();
  final _treatCtrl = TextEditingController();
  final _medCtrl   = TextEditingController();
  final _vetCtrl   = TextEditingController();
  final _costCtrl  = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _diagCtrl.dispose();
    _treatCtrl.dispose();
    _medCtrl.dispose();
    _vetCtrl.dispose();
    _costCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_selectedAnimal == null) {
      setState(() => _error = context.l10n.selectAnimalFirst);
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(dioProvider).post(
        ApiEndpoints.animalMedical(_selectedAnimal!.id),
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
      setState(() { _error = context.l10n.addMedFailed; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final asyncAnimals = ref.watch(myAnimalsProvider);

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
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2)),
              ),
            ),
            Text(
              context.l10n.addMedTitle,
              style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: AppColors.text),
            ),
            const SizedBox(height: 14),
            // Animal picker
            Text(
              context.l10n.pickAnimalLabel,
              style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.muted),
            ),
            const SizedBox(height: 4),
            asyncAnimals.when(
              loading: () => const SizedBox(
                height: 48,
                child: Center(
                    child: CircularProgressIndicator(
                        color: AppColors.green, strokeWidth: 2)),
              ),
              error: (_, __) => Text(context.l10n.loadAnimalsFailed,
                  style: const TextStyle(fontFamily: 'Cairo', color: AppColors.red)),
              data: (animals) => GestureDetector(
                onTap: () => _showAnimalPicker(context, animals),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 13),
                  decoration: BoxDecoration(
                    color: AppColors.bg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _selectedAnimal != null
                          ? AppColors.green
                          : AppColors.border,
                    ),
                  ),
                  child: Row(
                    children: [
                      if (_selectedAnimal != null) ...[
                        Text(_selectedAnimal!.typeEmoji,
                            style: const TextStyle(fontSize: 16)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${_selectedAnimal!.typeAr}${_selectedAnimal!.tagId.isNotEmpty ? ' — #${_selectedAnimal!.tagId}' : ''}',
                            style: const TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 13,
                                color: AppColors.text),
                          ),
                        ),
                      ] else
                        Expanded(
                          child: Text(
                            context.l10n.selectAnimal,
                            style: const TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 13,
                                color: AppColors.muted),
                          ),
                        ),
                      const Icon(Icons.expand_more,
                          color: AppColors.muted, size: 18),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            _SheetField(
                controller: _diagCtrl,
                label: context.l10n.diagnosisLabel,
                hint: context.l10n.diagnosisHint),
            const SizedBox(height: 10),
            _SheetField(
                controller: _treatCtrl,
                label: context.l10n.treatmentLabel,
                hint: context.l10n.treatmentHint),
            const SizedBox(height: 10),
            _SheetField(
                controller: _medCtrl,
                label: context.l10n.medicationLabel,
                hint: context.l10n.medicationHint),
            const SizedBox(height: 10),
            _SheetField(
                controller: _vetCtrl,
                label: context.l10n.vetName,
                hint: context.l10n.vetHint),
            const SizedBox(height: 10),
            _SheetField(
                controller: _costCtrl,
                label: context.l10n.costLabel,
                hint: context.l10n.costHint,
                keyboardType: TextInputType.number),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!,
                  style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 12,
                      color: AppColors.red)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loading ? null : _submit,
              style: FilledButton.styleFrom(
                  backgroundColor: AppColors.rose,
                  padding: const EdgeInsets.symmetric(vertical: 14)),
              child: _loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          color: AppColors.white, strokeWidth: 2))
                  : Text(
                      context.l10n.addMedButton,
                      style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontWeight: FontWeight.w700,
                          color: AppColors.white),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAnimalPicker(BuildContext context, List<AnimalModel> animals) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _AnimalPickerSheet(
        animals: animals,
        selected: _selectedAnimal,
        onSelect: (a) => setState(() => _selectedAnimal = a),
      ),
    );
  }
}

// ── Animal picker bottom sheet ─────────────────────────────────────────────────

class _AnimalPickerSheet extends StatelessWidget {
  const _AnimalPickerSheet({
    required this.animals,
    required this.onSelect,
    this.selected,
  });

  final List<AnimalModel> animals;
  final AnimalModel? selected;
  final ValueChanged<AnimalModel> onSelect;

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.55,
      maxChildSize: 0.85,
      builder: (_, scrollCtrl) => Column(
        children: [
          Center(
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
            child: Text(
              context.l10n.chooseAnimal,
              style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: AppColors.text),
            ),
          ),
          Expanded(
            child: animals.isEmpty
                ? Center(
                    child: Text(context.l10n.noAnimalsInHerd,
                        style: const TextStyle(fontFamily: 'Cairo', color: AppColors.muted)))
                : ListView.builder(
                    controller: scrollCtrl,
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                    itemCount: animals.length,
                    itemBuilder: (_, i) {
                      final a = animals[i];
                      final isSelected = selected?.id == a.id;
                      return GestureDetector(
                        onTap: () {
                          onSelect(a);
                          Navigator.pop(context);
                        },
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppColors.greenBg
                                : AppColors.bg,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? AppColors.green
                                  : AppColors.border,
                            ),
                          ),
                          child: Row(children: [
                            Text(a.typeEmoji,
                                style: const TextStyle(fontSize: 20)),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    a.typeAr +
                                        (a.breed != null
                                            ? ' — ${a.breed}'
                                            : ''),
                                    style: const TextStyle(
                                        fontFamily: 'Cairo',
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.text),
                                  ),
                                  if (a.tagId.isNotEmpty)
                                    Text(
                                      '#${a.tagId}',
                                      style: const TextStyle(
                                          fontFamily: 'Cairo',
                                          fontSize: 11,
                                          color: AppColors.muted),
                                    ),
                                ],
                              ),
                            ),
                            if (isSelected)
                              const Icon(Icons.check_circle,
                                  color: AppColors.green, size: 20),
                          ]),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

// ── Reusable sheet field ───────────────────────────────────────────────────────

class _SheetField extends StatelessWidget {
  const _SheetField({
    required this.controller,
    required this.label,
    required this.hint,
    this.keyboardType = TextInputType.text,
  });

  final TextEditingController controller;
  final String label, hint;
  final TextInputType keyboardType;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label,
          style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.muted)),
      const SizedBox(height: 4),
      TextField(
        controller: controller,
        keyboardType: keyboardType,
        style: const TextStyle(
            fontFamily: 'Cairo', fontSize: 13, color: AppColors.text),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(
              fontFamily: 'Cairo', fontSize: 13, color: AppColors.muted),
          filled: true,
          fillColor: AppColors.bg,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border)),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border)),
        ),
      ),
    ],
  );
}
