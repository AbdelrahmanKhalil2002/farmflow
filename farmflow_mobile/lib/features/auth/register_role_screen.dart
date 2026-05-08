import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/providers/locale_provider.dart';
import '../../core/l10n/l10n_ext.dart';

class RegisterRoleScreen extends ConsumerWidget {
  const RegisterRoleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final isAr   = locale.languageCode == 'ar';

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.text),
          onPressed: () => context.pop(),
        ),
        actions: [
          TextButton(
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
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 16),
              Text(
                context.l10n.registerTitle,
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: AppColors.text,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                context.l10n.registerSubtitle,
                style: const TextStyle(fontSize: 15, color: AppColors.muted),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),

              _RoleCard(
                emoji: '🌾',
                title: context.l10n.sellerRoleTitle,
                subtitle: context.l10n.sellerRoleSubtitle,
                accentColor: AppColors.green,
                accentBg: AppColors.greenLight,
                onTap: () => context.push('/register/seller'),
              ),
              const SizedBox(height: 16),
              _RoleCard(
                emoji: '🛒',
                title: context.l10n.buyerRoleTitle,
                subtitle: context.l10n.buyerRoleSubtitle,
                accentColor: AppColors.blue,
                accentBg: AppColors.blueBg,
                onTap: () => context.push('/register/buyer'),
              ),
              const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(context.l10n.alreadyHaveAccount, style: const TextStyle(color: AppColors.muted, fontSize: 14)),
                  TextButton(
                    onPressed: () => context.go('/login'),
                    child: Text(
                      context.l10n.loginLink,
                      style: const TextStyle(color: AppColors.green, fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.emoji,
    required this.title,
    required this.subtitle,
    required this.accentColor,
    required this.accentBg,
    required this.onTap,
  });

  final String emoji;
  final String title;
  final String subtitle;
  final Color accentColor;
  final Color accentBg;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: accentBg,
                shape: BoxShape.circle,
              ),
              child: Center(child: Text(emoji, style: const TextStyle(fontSize: 30))),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: accentColor,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 13, color: AppColors.muted, height: 1.5),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios, size: 16, color: accentColor),
          ],
        ),
      ),
    );
  }
}
