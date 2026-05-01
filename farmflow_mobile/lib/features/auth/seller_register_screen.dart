import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart' hide TextDirection;
import '../../core/auth/auth_notifier.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/national_id_util.dart';
import '../../shared/widgets/app_text_field.dart';
import '../../shared/widgets/primary_button.dart';

class SellerRegisterScreen extends ConsumerStatefulWidget {
  const SellerRegisterScreen({super.key});

  @override
  ConsumerState<SellerRegisterScreen> createState() => _SellerRegisterScreenState();
}

class _SellerRegisterScreenState extends ConsumerState<SellerRegisterScreen> {
  final _formKey      = GlobalKey<FormState>();
  final _name         = TextEditingController();
  final _farmName     = TextEditingController();
  final _farmPhone    = TextEditingController();
  final _personalPhone= TextEditingController();
  final _email        = TextEditingController();
  final _natId        = TextEditingController();
  final _pw           = TextEditingController();
  final _pwConf       = TextEditingController();
  bool _loading       = false;
  String? _error;
  NationalIdInfo? _idInfo;

  @override
  void initState() {
    super.initState();
    _natId.addListener(_onIdChanged);
  }

  void _onIdChanged() {
    final v = _natId.text.trim();
    if (v.length == 14) {
      setState(() => _idInfo = parseNationalId(v));
    } else {
      setState(() => _idInfo = null);
    }
  }

  @override
  void dispose() {
    for (final c in [_name,_farmName,_farmPhone,_personalPhone,_email,_natId,_pw,_pwConf]) c.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(authNotifierProvider.notifier).register({
        'name':          _name.text.trim(),
        'farmName':      _farmName.text.trim(),
        'farmPhone':     _farmPhone.text.trim(),
        'personalPhone': _personalPhone.text.trim(),
        if (_email.text.trim().isNotEmpty) 'email': _email.text.trim(),
        'nationalId':    _natId.text.trim(),
        'password':      _pw.text,
        'role':          'seller',
      });
    } on DioException catch (e) {
      setState(() => _error = dioErrorMessage(e));
    } catch (e) {
      setState(() => _error = 'حدث خطأ غير متوقع');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.text),
          onPressed: () => context.pop(),
        ),
        title: const Text('تسجيل مزارع', style: TextStyle(color: AppColors.text, fontWeight: FontWeight.w800)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Center(child: Text('🌾', style: TextStyle(fontSize: 48))),
                const SizedBox(height: 24),

                _SectionLabel(label: 'البيانات الشخصية'),
                AppTextField(
                  label: 'الاسم الكامل',
                  hint:  'اسمك الثلاثي',
                  controller: _name,
                  textInputAction: TextInputAction.next,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'الاسم مطلوب' : null,
                ),
                const SizedBox(height: 14),
                AppTextField(
                  label: 'رقم الهوية الوطنية',
                  hint:  '14 رقم',
                  controller: _natId,
                  keyboardType: TextInputType.number,
                  textInputAction: TextInputAction.next,
                  textDirection: TextDirection.ltr,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(14),
                  ],
                  validator: (v) {
                    if (v == null || v.length != 14) return 'الهوية يجب أن تكون 14 رقم';
                    final info = parseNationalId(v);
                    if (!info.isValid) return info.error ?? 'رقم الهوية غير صحيح';
                    return null;
                  },
                ),
                if (_idInfo != null) ...[
                  const SizedBox(height: 8),
                  _NationalIdInfoCard(info: _idInfo!),
                ],
                const SizedBox(height: 20),

                _SectionLabel(label: 'بيانات المزرعة'),
                AppTextField(
                  label: 'اسم المزرعة',
                  hint:  'مزرعة الخير',
                  controller: _farmName,
                  textInputAction: TextInputAction.next,
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'اسم المزرعة مطلوب' : null,
                ),
                const SizedBox(height: 14),
                AppTextField(
                  label: 'رقم هاتف المزرعة',
                  hint:  '01X XXXX XXXX',
                  controller: _farmPhone,
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.next,
                  textDirection: TextDirection.ltr,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  validator: (v) => (v == null || v.trim().length < 10) ? 'رقم هاتف المزرعة غير صحيح' : null,
                ),
                const SizedBox(height: 14),
                AppTextField(
                  label: 'رقم هاتفك الشخصي',
                  hint:  '01X XXXX XXXX',
                  controller: _personalPhone,
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.next,
                  textDirection: TextDirection.ltr,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  validator: (v) => (v == null || v.trim().length < 10) ? 'رقم الهاتف الشخصي غير صحيح' : null,
                ),
                const SizedBox(height: 14),
                AppTextField(
                  label: 'البريد الإلكتروني (اختياري)',
                  hint:  'example@email.com',
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  textDirection: TextDirection.ltr,
                ),
                const SizedBox(height: 20),

                _SectionLabel(label: 'كلمة المرور'),
                AppTextField(
                  label: 'كلمة المرور',
                  hint:  '8 أحرف على الأقل',
                  controller: _pw,
                  obscureText: true,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.newPassword],
                  validator: (v) => (v == null || v.length < 8) ? 'كلمة المرور قصيرة جداً' : null,
                ),
                const SizedBox(height: 14),
                AppTextField(
                  label: 'تأكيد كلمة المرور',
                  hint:  'أعد كتابة كلمة المرور',
                  controller: _pwConf,
                  obscureText: true,
                  textInputAction: TextInputAction.done,
                  autofillHints: const [AutofillHints.newPassword],
                  validator: (v) => v != _pw.text ? 'كلمتا المرور غير متطابقتين' : null,
                  onFieldSubmitted: (_) => _submit(),
                ),

                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.redBg,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.red.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: AppColors.red, size: 18),
                        const SizedBox(width: 8),
                        Expanded(child: Text(_error!, style: const TextStyle(color: AppColors.red, fontSize: 13))),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                PrimaryButton(label: 'إنشاء حساب', onPressed: _submit, loading: _loading),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: Text(
      label,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: AppColors.muted,
        letterSpacing: 0.5,
      ),
    ),
  );
}

class _NationalIdInfoCard extends StatelessWidget {
  const _NationalIdInfoCard({required this.info});
  final NationalIdInfo info;

  @override
  Widget build(BuildContext context) {
    if (!info.isValid) {
      return Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.redBg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.red.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            const Icon(Icons.error_outline, color: AppColors.red, size: 16),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                info.error ?? 'رقم الهوية غير صحيح',
                style: const TextStyle(fontFamily: 'Cairo', color: AppColors.red, fontSize: 12),
              ),
            ),
          ],
        ),
      );
    }
    final dateFmt = DateFormat('d MMMM yyyy', 'ar');
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.greenBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.greenBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.check_circle_outline, color: AppColors.green, size: 16),
              SizedBox(width: 6),
              Text('تم التحقق من الهوية',
                  style: TextStyle(fontFamily: 'Cairo', color: AppColors.green,
                      fontWeight: FontWeight.w700, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 16,
            runSpacing: 4,
            children: [
              _InfoChip(label: 'تاريخ الميلاد', value: dateFmt.format(info.birthDate!)),
              _InfoChip(label: 'العمر', value: '${info.age} سنة'),
              _InfoChip(label: 'المحافظة', value: info.governorate!),
              _InfoChip(label: 'النوع', value: info.gender!),
            ],
          ),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => RichText(
    text: TextSpan(
      style: const TextStyle(fontFamily: 'Cairo', fontSize: 11),
      children: [
        TextSpan(text: '$label: ', style: const TextStyle(color: AppColors.muted)),
        TextSpan(text: value,
            style: const TextStyle(color: AppColors.text, fontWeight: FontWeight.w700)),
      ],
    ),
  );
}
