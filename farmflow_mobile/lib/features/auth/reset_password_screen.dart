import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/app_text_field.dart';
import '../../shared/widgets/primary_button.dart';

class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  ConsumerState<ResetPasswordScreen> createState() =>
      _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _formKey   = GlobalKey<FormState>();
  final _pwCtrl    = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool  _loading   = false;
  bool  _success   = false;
  String? _errorMsg;

  @override
  void dispose() {
    _pwCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit(String token) async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _loading  = true;
      _errorMsg = null;
      _success  = false;
    });
    try {
      final dio = ref.watch(dioProvider);
      await dio.post(
        ApiEndpoints.resetPassword,
        data: {
          'token':    token,
          'password': _pwCtrl.text,
        },
      );
      if (mounted) {
        setState(() => _success = true);
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) context.go('/login');
        });
      }
    } on DioException catch (e) {
      if (mounted) setState(() => _errorMsg = dioErrorMessage(e));
    } catch (e) {
      if (mounted) setState(() => _errorMsg = 'حدث خطأ غير متوقع. حاول مجدداً.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final token =
        GoRouterState.of(context).uri.queryParameters['token'];
    final tokenInvalid = token == null || token.trim().isEmpty;
    final safeToken = token ?? '';

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.bg,
        appBar: AppBar(
          backgroundColor: AppColors.bg,
          elevation: 0,
          automaticallyImplyLeading: false,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded,
                color: AppColors.text, size: 20),
            onPressed: () => context.go('/login'),
          ),
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: tokenInvalid
                ? _buildInvalidToken(context)
                : Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SizedBox(height: 16),

                        // Logo / brand
                        const Center(
                          child: Text(
                            'FarmFlow',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: AppColors.green,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Center(
                          child: Text('🌾', style: TextStyle(fontSize: 40)),
                        ),
                        const SizedBox(height: 32),

                        // Title
                        const Text(
                          'تعيين كلمة مرور جديدة',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: AppColors.text,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'أدخل كلمة المرور الجديدة وتأكيدها لإتمام عملية الاستعادة.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 13,
                            color: AppColors.muted,
                            height: 1.6,
                          ),
                        ),
                        const SizedBox(height: 36),

                        // Success state
                        if (_success) ...[
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFFD1FAE5),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                  color:
                                      AppColors.green.withValues(alpha: 0.4)),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.check_circle_outline_rounded,
                                    color: AppColors.green, size: 22),
                                SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    'تم تغيير كلمة المرور بنجاح. جارٍ تحويلك إلى صفحة الدخول…',
                                    style: TextStyle(
                                      fontFamily: 'Cairo',
                                      fontSize: 13,
                                      color: AppColors.green,
                                      height: 1.5,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),
                          const Center(
                            child: SizedBox(
                              width: 28,
                              height: 28,
                              child: CircularProgressIndicator(
                                color: AppColors.green,
                                strokeWidth: 2.5,
                              ),
                            ),
                          ),
                        ] else ...[
                          // New password field
                          AppTextField(
                            label: 'كلمة المرور الجديدة',
                            hint: '••••••••',
                            controller: _pwCtrl,
                            obscureText: true,
                            textInputAction: TextInputAction.next,
                            autofillHints: const [AutofillHints.newPassword],
                            validator: (v) {
                              if (v == null || v.isEmpty) {
                                return 'هذا الحقل مطلوب';
                              }
                              if (v.length < 8) {
                                return 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // Confirm password field
                          AppTextField(
                            label: 'تأكيد كلمة المرور',
                            hint: '••••••••',
                            controller: _confirmCtrl,
                            obscureText: true,
                            textInputAction: TextInputAction.done,
                            autofillHints: const [AutofillHints.newPassword],
                            validator: (v) {
                              if (v == null || v.isEmpty) {
                                return 'هذا الحقل مطلوب';
                              }
                              if (v != _pwCtrl.text) {
                                return 'كلمتا المرور غير متطابقتين';
                              }
                              return null;
                            },
                            onFieldSubmitted: (_) => _submit(safeToken),
                          ),
                          const SizedBox(height: 20),

                          // Error message
                          if (_errorMsg != null) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEE2E2),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                    color: const Color(0xFFDC2626)
                                        .withValues(alpha: 0.3)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline_rounded,
                                      color: Color(0xFFDC2626), size: 18),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _errorMsg!,
                                      style: const TextStyle(
                                        fontFamily: 'Cairo',
                                        color: Color(0xFFDC2626),
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],

                          PrimaryButton(
                            label: 'تعيين كلمة المرور',
                            onPressed: () => _submit(safeToken),
                            loading: _loading,
                          ),
                          const SizedBox(height: 20),

                          // Back to login link
                          Center(
                            child: TextButton(
                              onPressed: () => context.go('/login'),
                              child: const Text(
                                'العودة إلى تسجيل الدخول',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  color: AppColors.green,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ),
                        ],

                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildInvalidToken(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 40),
        const Center(
          child: Icon(
            Icons.link_off_rounded,
            size: 64,
            color: AppColors.muted,
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'رابط غير صالح أو منتهي الصلاحية',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: 'Cairo',
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: AppColors.text,
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'انتهت صلاحية رابط استعادة كلمة المرور أو أنه غير صالح. يرجى طلب رابط جديد.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: 'Cairo',
            fontSize: 13,
            color: AppColors.muted,
            height: 1.6,
          ),
        ),
        const SizedBox(height: 36),
        PrimaryButton(
          label: 'طلب رابط جديد',
          onPressed: () => context.go('/forgot-password'),
        ),
        const SizedBox(height: 12),
        Center(
          child: TextButton(
            onPressed: () => context.go('/login'),
            child: const Text(
              'العودة إلى تسجيل الدخول',
              style: TextStyle(
                fontFamily: 'Cairo',
                color: AppColors.green,
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
