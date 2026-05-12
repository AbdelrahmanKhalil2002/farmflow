import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/primary_button.dart';

class VerifyEmailScreen extends ConsumerStatefulWidget {
  const VerifyEmailScreen({super.key});

  @override
  ConsumerState<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends ConsumerState<VerifyEmailScreen> {
  _Status _status = _Status.loading;
  String  _errorMsg = '';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _verify();
  }

  Future<void> _verify() async {
    final token = GoRouterState.of(context).uri.queryParameters['token'] ?? '';
    if (token.isEmpty) {
      if (mounted) {
        setState(() {
          _status   = _Status.error;
          _errorMsg = 'رابط التحقق غير صالح.';
        });
      }
      return;
    }
    try {
      await ref.read(dioProvider).post(
        ApiEndpoints.verifyEmail,
        data: {'token': token},
      );
      if (mounted) setState(() => _status = _Status.success);
    } on DioException catch (e) {
      if (mounted) {
        setState(() {
          _status   = _Status.error;
          _errorMsg = dioErrorMessage(e);
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _status   = _Status.error;
          _errorMsg = 'الرابط غير صالح أو منتهي الصلاحية.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.bg,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Brand
                  const Text(
                    'FarmFlow',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: AppColors.green,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text('🌾', style: TextStyle(fontSize: 40)),
                  const SizedBox(height: 40),

                  _buildCard(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE5E5DC)),
        boxShadow: const [
          BoxShadow(color: Color(0x0F000000), blurRadius: 16, offset: Offset(0, 4)),
        ],
      ),
      child: switch (_status) {
        _Status.loading => _buildLoading(),
        _Status.success => _buildSuccess(),
        _Status.error   => _buildError(),
      },
    );
  }

  Widget _buildLoading() {
    return const Column(
      children: [
        SizedBox(
          width: 44,
          height: 44,
          child: CircularProgressIndicator(color: AppColors.green, strokeWidth: 3),
        ),
        SizedBox(height: 20),
        Text(
          'جارٍ التحقق…',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontSize: 15,
            color: AppColors.muted,
          ),
        ),
      ],
    );
  }

  Widget _buildSuccess() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFFF0FDF4),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFBBF7D0)),
          ),
          child: const Column(
            children: [
              Text('✅', style: TextStyle(fontSize: 40)),
              SizedBox(height: 12),
              Text(
                'تم تأكيد البريد الإلكتروني',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF16A34A),
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 8),
              Text(
                'بريدك الإلكتروني مؤكد الآن. يمكنك تسجيل الدخول للمتابعة.',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 13,
                  color: AppColors.muted,
                  height: 1.6,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        PrimaryButton(
          label: 'تسجيل الدخول',
          onPressed: () => context.go('/login'),
        ),
      ],
    );
  }

  Widget _buildError() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFFFEF2F2),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFFECACA)),
          ),
          child: Column(
            children: [
              const Text('❌', style: TextStyle(fontSize: 40)),
              const SizedBox(height: 12),
              const Text(
                'فشل التحقق',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFFDC2626),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                _errorMsg,
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 13,
                  color: AppColors.muted,
                  height: 1.6,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Center(
          child: TextButton(
            onPressed: () => context.go('/login'),
            child: const Text(
              'العودة لتسجيل الدخول',
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

enum _Status { loading, success, error }
