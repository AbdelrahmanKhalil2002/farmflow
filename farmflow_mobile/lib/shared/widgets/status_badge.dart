import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

/// Colour-coded badge for listing/order/animal statuses.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status, this.small = false});
  final String status;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final meta = _meta[status] ?? _meta['default']!;
    final fs    = small ? 10.0 : 11.0;
    final px    = small ? 7.0 : 10.0;
    final py    = small ? 2.0 : 3.0;

    return Container(
      padding: EdgeInsets.symmetric(horizontal: px, vertical: py),
      decoration: BoxDecoration(
        color:        meta.bg,
        borderRadius: BorderRadius.circular(20),
        border:       Border.all(color: meta.border),
      ),
      child: Text(
        meta.label,
        style: TextStyle(
          fontSize:   fs,
          fontWeight: FontWeight.w700,
          color:      meta.color,
        ),
      ),
    );
  }

  static const _meta = <String, _StatusMeta>{
    // Listing / dairy / supply statuses
    'pending':   _StatusMeta('قيد المراجعة', AppColors.amber,    AppColors.amberBg,   AppColors.amberLight),
    'approved':  _StatusMeta('مُعتمد',       AppColors.green,    AppColors.greenBg,   AppColors.greenBorder),
    'rejected':  _StatusMeta('مرفوض',        AppColors.red,      AppColors.redBg,     Color(0xFFFCA5A5)),
    'sold_out':  _StatusMeta('نفد المخزون',  AppColors.midMuted, AppColors.grey100,   AppColors.grey200),
    // Order statuses
    'placed':      _StatusMeta('تم الطلب',    AppColors.blue,     AppColors.blueBg,    Color(0xFFBFDBFE)),
    'confirmed':   _StatusMeta('مؤكد',        AppColors.green,    AppColors.greenBg,   AppColors.greenBorder),
    'in_transit':  _StatusMeta('جاري التوصيل',AppColors.amber,    AppColors.amberBg,   AppColors.amberLight),
    'completed':   _StatusMeta('مكتمل',       AppColors.green,    AppColors.greenBg,   AppColors.greenBorder),
    'cancelled':   _StatusMeta('ملغي',        AppColors.red,      AppColors.redBg,     Color(0xFFFCA5A5)),
    // Animal health
    'healthy':     _StatusMeta('بصحة جيدة',  AppColors.green,    AppColors.greenBg,   AppColors.greenBorder),
    'sick':        _StatusMeta('مريض',        AppColors.red,      AppColors.redBg,     Color(0xFFFCA5A5)),
    'quarantine':  _StatusMeta('حجر صحي',    AppColors.amber,    AppColors.amberBg,   AppColors.amberLight),
    'deceased':    _StatusMeta('نافق',        AppColors.midMuted, AppColors.grey100,   AppColors.grey200),
    // Animal status
    'active':      _StatusMeta('نشط',        AppColors.green,    AppColors.greenBg,   AppColors.greenBorder),
    'sold':        _StatusMeta('مُباع',       AppColors.midMuted, AppColors.grey100,   AppColors.grey200),
    // Default fallback
    'default':     _StatusMeta('غير معروف',  AppColors.muted,    AppColors.grey100,   AppColors.grey200),
  };
}

class _StatusMeta {
  const _StatusMeta(this.label, this.color, this.bg, this.border);
  final String label;
  final Color color;
  final Color bg;
  final Color border;
}
