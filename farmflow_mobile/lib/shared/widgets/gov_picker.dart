import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../core/theme/app_colors.dart';

// 27 Egyptian governorates
const List<String> kGovernorates = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية',
  'القليوبية', 'كفر الشيخ', 'الغربية', 'المنوفية', 'البحيرة',
  'الإسماعيلية', 'السويس', 'بور سعيد', 'دمياط', 'الفيوم',
  'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا',
  'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح',
  'شمال سيناء', 'جنوب سيناء',
];

// Approximate centroids — same order as kGovernorates
const List<List<double>> _kCentroids = [
  [30.0444, 31.2357], // القاهرة
  [29.9870, 31.1118], // الجيزة
  [31.2001, 29.9187], // الإسكندرية
  [31.0333, 31.3667], // الدقهلية
  [30.7500, 31.7000], // الشرقية
  [30.3333, 31.2167], // القليوبية
  [31.1167, 30.9333], // كفر الشيخ
  [30.8667, 31.0333], // الغربية
  [30.5833, 30.9333], // المنوفية
  [30.8667, 30.3333], // البحيرة
  [30.5965, 32.2715], // الإسماعيلية
  [29.9668, 32.5498], // السويس
  [31.2653, 32.3019], // بور سعيد
  [31.4167, 31.8167], // دمياط
  [29.3084, 30.8428], // الفيوم
  [29.0667, 31.0833], // بني سويف
  [28.0833, 30.7500], // المنيا
  [27.1833, 31.1833], // أسيوط
  [26.5500, 31.7000], // سوهاج
  [26.1667, 32.7167], // قنا
  [25.6872, 32.6396], // الأقصر
  [24.0889, 32.8998], // أسوان
  [26.5000, 33.5000], // البحر الأحمر
  [25.0000, 29.0000], // الوادي الجديد
  [31.3525, 27.2453], // مطروح
  [30.9167, 33.6500], // شمال سيناء
  [29.0000, 34.0000], // جنوب سيناء
];

String _nearestGovernorate(double lat, double lng) {
  double minDist = double.infinity;
  int minIdx = 0;
  for (int i = 0; i < _kCentroids.length; i++) {
    final dLat = lat - _kCentroids[i][0];
    final dLng = lng - _kCentroids[i][1];
    final dist = dLat * dLat + dLng * dLng;
    if (dist < minDist) {
      minDist = dist;
      minIdx = i;
    }
  }
  return kGovernorates[minIdx];
}

/// Opens a searchable governorate picker as a bottom sheet.
/// Returns the selected governorate string, or null if dismissed.
Future<String?> showGovPicker(
  BuildContext context, {
  String? selected,
}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.card,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _GovPickerSheet(selected: selected),
  );
}

class _GovPickerSheet extends StatefulWidget {
  const _GovPickerSheet({this.selected});
  final String? selected;

  @override
  State<_GovPickerSheet> createState() => _GovPickerSheetState();
}

class _GovPickerSheetState extends State<_GovPickerSheet> {
  final _searchCtrl = TextEditingController();
  String _query = '';
  bool _locating = false;
  String? _locationError;

  List<String> get _filtered => _query.isEmpty
      ? kGovernorates
      : kGovernorates.where((g) => g.contains(_query)).toList();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _detectLocation() async {
    setState(() {
      _locating = true;
      _locationError = null;
    });
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) setState(() => _locationError = 'يرجى تفعيل خدمة الموقع في الإعدادات');
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        if (mounted) setState(() => _locationError = 'لم يتم منح إذن الوصول للموقع');
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
      ).timeout(const Duration(seconds: 12));

      if (mounted) Navigator.pop(context, _nearestGovernorate(pos.latitude, pos.longitude));
    } catch (_) {
      if (mounted) setState(() => _locationError = 'تعذّر تحديد الموقع، حاول مرة أخرى');
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.65,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      expand: false,
      builder: (_, scrollCtrl) => Column(
        children: [
          // Handle
          Center(
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'اختر المحافظة',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: AppColors.text,
                  ),
                ),
                const SizedBox(height: 12),
                // Detect location button
                GestureDetector(
                  onTap: _locating ? null : _detectLocation,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    decoration: BoxDecoration(
                      color: AppColors.greenBg,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: AppColors.green.withValues(alpha: 0.35)),
                    ),
                    child: _locating
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.green,
                                ),
                              ),
                              SizedBox(width: 8),
                              Text(
                                'جاري تحديد الموقع...',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  fontSize: 13,
                                  color: AppColors.greenText,
                                ),
                              ),
                            ],
                          )
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.my_location,
                                  color: AppColors.green, size: 16),
                              SizedBox(width: 6),
                              Text(
                                'استخدام موقعي الحالي',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.greenText,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
                if (_locationError != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    _locationError!,
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 12,
                      color: AppColors.red,
                    ),
                  ),
                ],
                const SizedBox(height: 10),
                // Search field
                TextField(
                  controller: _searchCtrl,
                  textDirection: TextDirection.rtl,
                  onChanged: (v) => setState(() => _query = v),
                  decoration: InputDecoration(
                    hintText: 'ابحث عن محافظة...',
                    hintStyle: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 13,
                      color: AppColors.muted,
                    ),
                    prefixIcon: const Icon(Icons.search,
                        color: AppColors.muted, size: 20),
                    filled: true,
                    fillColor: AppColors.bg,
                    contentPadding:
                        const EdgeInsets.symmetric(vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(
                          color: AppColors.green, width: 1.5),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // List
          Expanded(
            child: ListView.builder(
              controller: scrollCtrl,
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              itemCount: _filtered.length,
              itemBuilder: (_, i) {
                final gov = _filtered[i];
                final isSelected = gov == widget.selected;
                return ListTile(
                  onTap: () => Navigator.pop(context, gov),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                  tileColor: isSelected
                      ? AppColors.greenBg
                      : Colors.transparent,
                  title: Text(
                    gov,
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 14,
                      fontWeight: isSelected
                          ? FontWeight.w700
                          : FontWeight.w400,
                      color: isSelected
                          ? AppColors.greenText
                          : AppColors.text,
                    ),
                  ),
                  trailing: isSelected
                      ? const Icon(Icons.check_circle,
                          color: AppColors.green, size: 18)
                      : null,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 12),
                  dense: true,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// A tappable field that shows the selected governorate and opens the picker.
class GovPickerField extends StatelessWidget {
  const GovPickerField({
    super.key,
    required this.value,
    required this.onChanged,
    this.label = 'المحافظة',
  });

  final String? value;
  final ValueChanged<String?> onChanged;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Cairo',
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.muted,
          ),
        ),
        const SizedBox(height: 6),
        GestureDetector(
          onTap: () async {
            final result =
                await showGovPicker(context, selected: value);
            if (result != null) onChanged(result);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(
                horizontal: 14, vertical: 13),
            decoration: BoxDecoration(
              color: AppColors.bg,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                  color: value != null
                      ? AppColors.green
                      : AppColors.border),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    value ?? 'اختر المحافظة',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 13,
                      color: value != null
                          ? AppColors.text
                          : AppColors.muted,
                    ),
                  ),
                ),
                const Icon(Icons.keyboard_arrow_down,
                    color: AppColors.muted, size: 20),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
