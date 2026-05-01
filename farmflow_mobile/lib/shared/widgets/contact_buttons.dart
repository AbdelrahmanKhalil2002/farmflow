import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher_string.dart';
import '../../core/theme/app_colors.dart';

/// Reusable contact action row: WhatsApp · Call · Copy.
/// Pass [phone] as an Egyptian number (01XXXXXXXXX or +201XXXXXXXXX).
class ContactButtons extends StatelessWidget {
  const ContactButtons({super.key, required this.phone});
  final String phone;

  // ── Helpers ────────────────────────────────────────────────────────────────

  /// Strip non-digits, normalise to Egyptian WhatsApp number (20XXXXXXXXX).
  String get _waNumber {
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    if (digits.startsWith('20')) return digits;
    if (digits.startsWith('0'))  return '20${digits.substring(1)}';
    return '20$digits';
  }

  Future<void> _openWhatsApp(BuildContext ctx) async {
    final url = 'https://wa.me/$_waNumber';
    final ok  = await launchUrlString(url,
        mode: LaunchMode.externalApplication);
    if (!ok && ctx.mounted) {
      ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(
        content: Text('واتساب غير مثبّت',
            style: TextStyle(fontFamily: 'Cairo')),
      ));
    }
  }

  Future<void> _call(BuildContext ctx) async {
    final ok = await launchUrlString('tel:$phone');
    if (!ok && ctx.mounted) {
      ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(
        content: Text('تعذّر إجراء الاتصال',
            style: TextStyle(fontFamily: 'Cairo')),
      ));
    }
  }

  void _copy(BuildContext ctx) {
    Clipboard.setData(ClipboardData(text: phone));
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(ctx).showSnackBar(
      const SnackBar(
        content: Text('تم نسخ رقم الهاتف',
            style: TextStyle(fontFamily: 'Cairo')),
        duration: Duration(seconds: 2),
        backgroundColor: AppColors.green,
      ),
    );
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(
        child: _CtaButton(
          label: 'واتساب',
          icon:  Icons.chat_outlined,
          color: const Color(0xFF25D366),
          onTap: () {
            HapticFeedback.lightImpact();
            _openWhatsApp(context);
          },
        ),
      ),
      const SizedBox(width: 8),
      Expanded(
        child: _CtaButton(
          label: 'اتصال',
          icon:  Icons.phone_outlined,
          color: AppColors.blue,
          onTap: () {
            HapticFeedback.lightImpact();
            _call(context);
          },
        ),
      ),
      const SizedBox(width: 8),
      _CopyButton(onTap: () => _copy(context)),
    ]);
  }
}

// ── Internal widgets ──────────────────────────────────────────────────────────

class _CtaButton extends StatelessWidget {
  const _CtaButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });
  final String   label;
  final IconData icon;
  final Color    color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 6),
        Text(label,
            style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                fontWeight: FontWeight.w700, color: color)),
      ]),
    ),
  );
}

class _CopyButton extends StatelessWidget {
  const _CopyButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 42, height: 42,
      decoration: BoxDecoration(
        color: AppColors.muted.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: const Icon(Icons.copy_outlined,
          size: 18, color: AppColors.muted),
    ),
  );
}
