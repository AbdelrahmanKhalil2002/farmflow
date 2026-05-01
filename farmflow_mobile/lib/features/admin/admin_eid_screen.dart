import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/shimmer_widget.dart';

// ── Provider ──────────────────────────────────────────────────────────────────

final eidConfigProvider =
    FutureProvider<Map<String, dynamic>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.eidConfig);
  return res.data as Map<String, dynamic>? ?? {};
});

// ── Screen ────────────────────────────────────────────────────────────────────

class AdminEidScreen extends ConsumerStatefulWidget {
  const AdminEidScreen({super.key});

  @override
  ConsumerState<AdminEidScreen> createState() => _AdminEidScreenState();
}

class _AdminEidScreenState extends ConsumerState<AdminEidScreen> {
  bool?     _eidMode;
  DateTime? _eidDate;
  bool      _loading     = false;
  bool      _initialized = false;

  void _initFrom(Map<String, dynamic> cfg) {
    if (_initialized) return;
    _initialized = true;
    _eidMode = cfg['eidMode'] as bool? ?? false;
    final rawDate = cfg['eidDate'] as String?;
    _eidDate =
        rawDate != null && rawDate.isNotEmpty
            ? DateTime.tryParse(rawDate)
            : null;
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _eidDate ?? now,
      firstDate: now.subtract(const Duration(days: 365)),
      lastDate: now.add(const Duration(days: 365 * 2)),
      locale: const Locale('ar'),
      helpText: 'اختر تاريخ العيد',
      confirmText: 'تأكيد',
      cancelText: 'إلغاء',
    );
    if (picked != null) setState(() => _eidDate = picked);
  }

  Future<void> _save() async {
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.patch(ApiEndpoints.eidConfig, data: {
        'eidMode': _eidMode ?? false,
        'eidDate': _eidDate?.toIso8601String(),
      });
      ref.invalidate(eidConfigProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('تم الحفظ بنجاح',
              style: TextStyle(fontFamily: 'Cairo')),
          backgroundColor: AppColors.green,
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('فشل في الحفظ',
              style: TextStyle(fontFamily: 'Cairo')),
          backgroundColor: AppColors.red,
        ));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final asyncCfg = ref.watch(eidConfigProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text('إعدادات العيد',
            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                color: AppColors.white)),
      ),
      body: asyncCfg.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(16),
          child: Column(children: [
            ShimmerCard(height: 100),
            SizedBox(height: 12),
            ShimmerCard(height: 80),
            SizedBox(height: 12),
            ShimmerCard(height: 80),
            SizedBox(height: 12),
            ShimmerCard(height: 56),
          ]),
        ),
        error: (e, _) => Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.wifi_off_rounded,
                size: 48, color: AppColors.muted),
            const SizedBox(height: 10),
            const Text('تعذّر التحميل',
                style: TextStyle(
                    fontFamily: 'Cairo', color: AppColors.muted)),
            TextButton(
              onPressed: () => ref.invalidate(eidConfigProvider),
              child: const Text('إعادة المحاولة',
                  style: TextStyle(
                      fontFamily: 'Cairo', color: AppColors.green)),
            ),
          ]),
        ),
        data: (cfg) {
          _initFrom(cfg);
          final dateStr = _eidDate != null
              ? DateFormat('d MMMM yyyy', 'ar').format(_eidDate!)
              : 'لم يُحدَّد';

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // ── Banner ───────────────────────────────────────────────
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF7B3F00), Color(0xFFC97B2E)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Row(children: [
                  Text('🌙', style: TextStyle(fontSize: 38)),
                  SizedBox(width: 14),
                  Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text('وضع العيد',
                          style: TextStyle(fontFamily: 'Cairo',
                              fontSize: 17, fontWeight: FontWeight.w800,
                              color: Colors.white)),
                      SizedBox(height: 4),
                      Text(
                          'يُفعِّل تصنيف مواشي العيد '
                          'ويُظهر مرشّح الأضاحي للمشترين',
                          style: TextStyle(fontFamily: 'Cairo',
                              fontSize: 12,
                              color: Color(0xCCFFFFFF))),
                    ]),
                  ),
                ]),
              ),
              const SizedBox(height: 20),

              // ── Eid Mode ─────────────────────────────────────────────
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(children: [
                  const Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text('تفعيل وضع العيد',
                          style: TextStyle(fontFamily: 'Cairo',
                              fontSize: 14, fontWeight: FontWeight.w700,
                              color: AppColors.text)),
                      SizedBox(height: 2),
                      Text('يُضيف تصنيف "مواشي العيد" في الواجهة',
                          style: TextStyle(fontFamily: 'Cairo',
                              fontSize: 12, color: AppColors.muted)),
                    ]),
                  ),
                  Switch(
                    value: _eidMode ?? false,
                    onChanged: (v) => setState(() => _eidMode = v),
                    activeColor: AppColors.green,
                  ),
                ]),
              ),
              const SizedBox(height: 12),

              // ── Eid Date ──────────────────────────────────────────────
              GestureDetector(
                onTap: _pickDate,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(children: [
                    const Icon(Icons.calendar_today_outlined,
                        size: 20, color: AppColors.green),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                          crossAxisAlignment:
                              CrossAxisAlignment.start,
                          children: [
                        const Text('تاريخ العيد',
                            style: TextStyle(fontFamily: 'Cairo',
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: AppColors.text)),
                        const SizedBox(height: 2),
                        Text(dateStr,
                            style: TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 12,
                                color: _eidDate != null
                                    ? AppColors.text
                                    : AppColors.muted)),
                      ]),
                    ),
                    const Icon(Icons.chevron_right,
                        size: 18, color: AppColors.muted),
                  ]),
                ),
              ),
              const SizedBox(height: 28),

              // ── Save ──────────────────────────────────────────────────
              FilledButton(
                onPressed: _loading ? null : _save,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.green,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
                child: _loading
                    ? const SizedBox(
                        width: 22, height: 22,
                        child: CircularProgressIndicator(
                            color: AppColors.white, strokeWidth: 2.5))
                    : const Text('حفظ الإعدادات',
                        style: TextStyle(fontFamily: 'Cairo',
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.white)),
              ),
            ],
          );
        },
      ),
    );
  }
}
