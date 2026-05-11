import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/auth/auth_notifier.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../core/l10n/l10n_ext.dart';
import '../../core/providers/locale_provider.dart';
import '../../shared/widgets/app_text_field.dart';
import '../../shared/widgets/primary_button.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey     = GlobalKey<FormState>();
  final _idCtrl      = TextEditingController();
  final _pwCtrl      = TextEditingController();
  bool _loading      = false;
  String? _errorMsg;

  @override
  void dispose() {
    _idCtrl.dispose();
    _pwCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() { _loading = true; _errorMsg = null; });
    try {
      await ref.read(authNotifierProvider.notifier).login(
        _idCtrl.text.trim(),
        _pwCtrl.text,
      );
      // GoRouter redirect handles navigation
    } on DioException catch (e) {
      setState(() => _errorMsg = dioErrorMessage(e));
    } catch (e) {
      setState(() => _errorMsg = '[${e.runtimeType}] $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    final isAr   = locale.languageCode == 'ar';

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Language toggle
                Align(
                  alignment: AlignmentDirectional.topEnd,
                  child: TextButton(
                    onPressed: () => ref.read(localeProvider.notifier).state =
                        isAr ? const Locale('en') : const Locale('ar'),
                    child: Text(
                      isAr ? 'English' : 'عربي',
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        color: AppColors.green,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                // Header
                const Center(
                  child: Text('🌾', style: TextStyle(fontSize: 52)),
                ),
                const SizedBox(height: 16),
                Center(
                  child: Text(
                    context.l10n.loginTitle,
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: AppColors.text,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Center(
                  child: Text(
                    context.l10n.loginWelcome,
                    style: const TextStyle(fontSize: 14, color: AppColors.muted),
                  ),
                ),
                const SizedBox(height: 40),

                // Fields
                AppTextField(
                  label: context.l10n.loginIdLabel,
                  hint:  context.l10n.loginIdHint,
                  controller: _idCtrl,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  textDirection: TextDirection.ltr,
                  autofillHints: const [AutofillHints.username, AutofillHints.email],
                  validator: (v) => (v == null || v.trim().isEmpty) ? context.l10n.fieldRequired : null,
                ),
                const SizedBox(height: 16),
                AppTextField(
                  label: context.l10n.loginPasswordLabel,
                  hint:  '••••••••',
                  controller: _pwCtrl,
                  obscureText: true,
                  textInputAction: TextInputAction.done,
                  autofillHints: const [AutofillHints.password],
                  validator: (v) => (v == null || v.isEmpty) ? context.l10n.loginPasswordRequired : null,
                  onFieldSubmitted: (_) => _submit(),
                ),
                const SizedBox(height: 20),

                // Error message
                if (_errorMsg != null) ...[
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
                        Expanded(
                          child: Text(
                            _errorMsg!,
                            style: const TextStyle(color: AppColors.red, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                PrimaryButton(
                  label: context.l10n.loginButton,
                  onPressed: _submit,
                  loading: _loading,
                ),
                const SizedBox(height: 24),

                // Register link
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(context.l10n.loginNoAccount, style: const TextStyle(color: AppColors.muted, fontSize: 14)),
                    TextButton(
                      onPressed: () => context.push('/register'),
                      child: Text(
                        context.l10n.loginRegisterLink,
                        style: const TextStyle(
                          color: AppColors.green,
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
