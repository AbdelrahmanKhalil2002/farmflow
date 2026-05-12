import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/auth/auth_notifier.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/primary_button.dart';

// ── Notif prefs provider ───────────────────────────────────────────────────────

final notifPrefsProvider = FutureProvider.autoDispose<Map<String, bool>>((ref) async {
  final res = await ref.watch(dioProvider).get(ApiEndpoints.notifPrefs);
  final data = res.data as Map<String, dynamic>? ?? {};
  return {
    'orders':    data['orders']    as bool? ?? true,
    'reminders': data['reminders'] as bool? ?? true,
    'dairy':     data['dairy']     as bool? ?? true,
    'messages':  data['messages']  as bool? ?? true,
  };
});

// ── Screen ─────────────────────────────────────────────────────────────────────

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  _Section _active = _Section.profile;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'الإعدادات',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w800,
            color: AppColors.white,
            fontSize: 18,
          ),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Tab bar
            _SectionTabBar(
              active: _active,
              onTap: (s) => setState(() => _active = s),
            ),
            // Content
            Expanded(
              child: switch (_active) {
                _Section.profile       => const _ProfileSection(),
                _Section.security      => const _SecuritySection(),
                _Section.notifications => const _NotificationsSection(),
                _Section.support       => const _SupportSection(),
                _Section.logout        => const _LogoutSection(),
              },
            ),
          ],
        ),
      ),
    );
  }
}

// ── Section enum ──────────────────────────────────────────────────────────────

enum _Section { profile, security, notifications, support, logout }

// ── Tab bar ───────────────────────────────────────────────────────────────────

class _SectionTabBar extends StatelessWidget {
  const _SectionTabBar({required this.active, required this.onTap});
  final _Section active;
  final void Function(_Section) onTap;

  static const _tabs = [
    (_Section.profile,       Icons.person_outline_rounded,       'الملف'),
    (_Section.security,      Icons.lock_outline_rounded,         'الأمان'),
    (_Section.notifications, Icons.notifications_none_rounded,   'الإشعارات'),
    (_Section.support,       Icons.help_outline_rounded,         'الدعم'),
    (_Section.logout,        Icons.logout_rounded,               'خروج'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.white,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        child: Row(
          children: _tabs.map((t) {
            final (sec, icon, label) = t;
            final isActive = active == sec;
            final isDanger = sec == _Section.logout;
            return GestureDetector(
              onTap: () => onTap(sec),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                margin: const EdgeInsets.symmetric(horizontal: 4),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: isActive
                      ? (isDanger ? const Color(0xFFFEE2E2) : AppColors.greenBg)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isActive
                        ? (isDanger ? AppColors.red : AppColors.green)
                        : const Color(0xFFE5E5DC),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      icon,
                      size: 16,
                      color: isActive
                          ? (isDanger ? AppColors.red : AppColors.green)
                          : AppColors.muted,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      label,
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        fontWeight: isActive ? FontWeight.w700 : FontWeight.w600,
                        color: isActive
                            ? (isDanger ? AppColors.red : AppColors.green)
                            : AppColors.muted,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Profile
// ═══════════════════════════════════════════════════════════════════════════════

class _ProfileSection extends ConsumerStatefulWidget {
  const _ProfileSection();

  @override
  ConsumerState<_ProfileSection> createState() => _ProfileSectionState();
}

class _ProfileSectionState extends ConsumerState<_ProfileSection> {
  final _nameCtrl  = TextEditingController();
  final _govCtrl   = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _loading    = false;
  bool _init       = false;

  static const _govs = [
    'القاهرة','الجيزة','الإسكندرية','الدقهلية','البحيرة','الشرقية','القليوبية',
    'المنوفية','الغربية','كفر الشيخ','دمياط','بورسعيد','الإسماعيلية','السويس',
    'شمال سيناء','جنوب سيناء','الفيوم','بني سويف','المنيا','أسيوط','سوهاج',
    'قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد','مطروح',
  ];

  String _selectedGov = '';

  @override
  void dispose() {
    _nameCtrl.dispose();
    _govCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  void _initFromUser() {
    if (_init) return;
    final user = ref.read(authNotifierProvider).valueOrNull;
    if (user == null) return;
    _nameCtrl.text  = user.name;
    _phoneCtrl.text = user.phone ?? user.farmPhone ?? '';
    _selectedGov    = user.governorate ?? '';
    _init = true;
  }

  Future<void> _save() async {
    final user = ref.read(authNotifierProvider).valueOrNull;
    if (user == null) return;
    setState(() => _loading = true);
    try {
      await ref.read(dioProvider).put(ApiEndpoints.profile, data: {
        'name':        _nameCtrl.text.trim(),
        'governorate': _selectedGov,
        if (user.isBuyer) 'phone': _phoneCtrl.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تم حفظ البيانات بنجاح', style: TextStyle(fontFamily: 'Cairo')),
            backgroundColor: AppColors.green,
            behavior: SnackBarBehavior.floating,
            duration: Duration(seconds: 2),
          ),
        );
        ref.read(authNotifierProvider.notifier).refresh();
      }
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(dioErrorMessage(e), style: const TextStyle(fontFamily: 'Cairo')),
            backgroundColor: AppColors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final userAsync = ref.watch(authNotifierProvider);
    final user = userAsync.valueOrNull;
    _initFromUser();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Avatar + role badge
          if (user != null) ...[
            Center(
              child: CircleAvatar(
                radius: 38,
                backgroundColor: AppColors.green,
                child: Text(
                  (user.name.isNotEmpty ? user.name[0] : '?').toUpperCase(),
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: AppColors.white,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Center(
              child: Text(
                user.name,
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppColors.text,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Center(
              child: _RoleBadge(role: user.role),
            ),
            if (user.email != null) ...[
              const SizedBox(height: 4),
              Center(
                child: Text(
                  user.email!,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 12,
                    color: AppColors.muted,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 28),
          ],

          _SectionHeading('البيانات الأساسية'),
          const SizedBox(height: 12),

          AppTextField(
            label: 'الاسم',
            hint: 'اسمك الكامل',
            controller: _nameCtrl,
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 14),

          // Governorate picker
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'المحافظة',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.text,
                ),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: _selectedGov.isEmpty ? null : _selectedGov,
                hint: const Text('اختر المحافظة',
                    style: TextStyle(fontFamily: 'Cairo', color: AppColors.muted, fontSize: 14)),
                decoration: InputDecoration(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE5E5DC)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFE5E5DC)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.green, width: 1.5),
                  ),
                  filled: true,
                  fillColor: AppColors.white,
                ),
                items: _govs
                    .map((g) => DropdownMenuItem(value: g, child: Text(g, style: const TextStyle(fontFamily: 'Cairo', fontSize: 14))))
                    .toList(),
                onChanged: (v) => setState(() => _selectedGov = v ?? ''),
              ),
            ],
          ),

          if (user?.isBuyer == true) ...[
            const SizedBox(height: 14),
            AppTextField(
              label: 'رقم الهاتف',
              hint: '01X XXXX XXXX',
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.done,
            ),
          ],

          const SizedBox(height: 24),
          PrimaryButton(
            label: 'حفظ التغييرات',
            onPressed: _save,
            loading: _loading,
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Security (change password)
// ═══════════════════════════════════════════════════════════════════════════════

class _SecuritySection extends ConsumerStatefulWidget {
  const _SecuritySection();

  @override
  ConsumerState<_SecuritySection> createState() => _SecuritySectionState();
}

class _SecuritySectionState extends ConsumerState<_SecuritySection> {
  final _formKey     = GlobalKey<FormState>();
  final _currentCtrl = TextEditingController();
  final _newCtrl     = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _loading      = false;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _loading = true);
    try {
      await ref.read(dioProvider).put(ApiEndpoints.password, data: {
        'currentPassword': _currentCtrl.text,
        'newPassword':     _newCtrl.text,
      });
      if (mounted) {
        _currentCtrl.clear();
        _newCtrl.clear();
        _confirmCtrl.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تم تغيير كلمة المرور بنجاح', style: TextStyle(fontFamily: 'Cairo')),
            backgroundColor: AppColors.green,
            behavior: SnackBarBehavior.floating,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(dioErrorMessage(e), style: const TextStyle(fontFamily: 'Cairo')),
            backgroundColor: AppColors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SectionHeading('تغيير كلمة المرور'),
            const SizedBox(height: 16),

            AppTextField(
              label: 'كلمة المرور الحالية',
              hint: '••••••••',
              controller: _currentCtrl,
              obscureText: true,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.password],
              validator: (v) =>
                  (v == null || v.isEmpty) ? 'هذا الحقل مطلوب' : null,
            ),
            const SizedBox(height: 14),

            AppTextField(
              label: 'كلمة المرور الجديدة',
              hint: '••••••••',
              controller: _newCtrl,
              obscureText: true,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.newPassword],
              validator: (v) {
                if (v == null || v.isEmpty) return 'هذا الحقل مطلوب';
                if (v.length < 8) return 'يجب أن تتكون من 8 أحرف على الأقل';
                return null;
              },
            ),
            const SizedBox(height: 14),

            AppTextField(
              label: 'تأكيد كلمة المرور الجديدة',
              hint: '••••••••',
              controller: _confirmCtrl,
              obscureText: true,
              textInputAction: TextInputAction.done,
              autofillHints: const [AutofillHints.newPassword],
              validator: (v) {
                if (v == null || v.isEmpty) return 'هذا الحقل مطلوب';
                if (v != _newCtrl.text) return 'كلمتا المرور غير متطابقتين';
                return null;
              },
              onFieldSubmitted: (_) => _save(),
            ),
            const SizedBox(height: 24),

            PrimaryButton(
              label: 'حفظ كلمة المرور',
              onPressed: _save,
              loading: _loading,
            ),
            const SizedBox(height: 20),

            // Security tip
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.greenBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.green.withValues(alpha: 0.25)),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.shield_outlined, color: AppColors.green, size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'استخدم كلمة مرور قوية تتضمن أحرفاً وأرقاماً ورموزاً للحفاظ على أمان حسابك.',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        color: AppColors.green,
                        height: 1.6,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Notifications
// ═══════════════════════════════════════════════════════════════════════════════

class _NotificationsSection extends ConsumerStatefulWidget {
  const _NotificationsSection();

  @override
  ConsumerState<_NotificationsSection> createState() => _NotificationsSectionState();
}

class _NotificationsSectionState extends ConsumerState<_NotificationsSection> {
  Map<String, bool>? _prefs;
  bool _dirty   = false;
  bool _saving  = false;

  static const _items = [
    ('orders',    Icons.local_shipping_outlined, 'تحديثات الطلبات',
        'تأكيد الطلب والإلغاء واكتمال التسليم'),
    ('reminders', Icons.vaccines_outlined, 'تذكيرات القطيع',
        'مواعيد التطعيم والوزن والمتابعات الطبية'),
    ('dairy',     Icons.water_drop_outlined, 'تنبيهات منتجات الألبان',
        'تحذير عند اقتراب منتج من تاريخ انتهاء صلاحيته'),
    ('messages',  Icons.chat_bubble_outline_rounded, 'الرسائل الجديدة',
        'إشعار عند وصول رسالة جديدة'),
  ];

  void _toggle(String key) {
    if (_prefs == null) return;
    setState(() {
      _prefs = {..._prefs!, key: !(_prefs![key] ?? true)};
      _dirty = true;
    });
  }

  Future<void> _save() async {
    if (_prefs == null) return;
    setState(() => _saving = true);
    try {
      await ref.read(dioProvider).put(ApiEndpoints.notifPrefs, data: _prefs);
      if (mounted) {
        setState(() => _dirty = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تم حفظ تفضيلات الإشعارات', style: TextStyle(fontFamily: 'Cairo')),
            backgroundColor: AppColors.green,
            behavior: SnackBarBehavior.floating,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تعذّر حفظ التفضيلات. حاول مرة أخرى.', style: TextStyle(fontFamily: 'Cairo')),
            backgroundColor: AppColors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final asyncPrefs = ref.watch(notifPrefsProvider);

    return asyncPrefs.when(
      loading: () => const Center(child: CircularProgressIndicator(color: AppColors.green)),
      error: (_, __) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('تعذّر تحميل التفضيلات', style: TextStyle(fontFamily: 'Cairo', color: AppColors.muted)),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => ref.invalidate(notifPrefsProvider),
              child: const Text('إعادة المحاولة', style: TextStyle(fontFamily: 'Cairo', color: AppColors.green)),
            ),
          ],
        ),
      ),
      data: (prefs) {
        _prefs ??= prefs;
        final current = _prefs!;

        return SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _SectionHeading('تفضيلات الإشعارات'),
              const SizedBox(height: 12),

              ..._items.map((item) {
                final (key, icon, label, sub) = item;
                final isOn = current[key] ?? true;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: GestureDetector(
                    onTap: () => _toggle(key),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isOn ? AppColors.greenBg : AppColors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isOn
                              ? AppColors.green.withValues(alpha: 0.35)
                              : const Color(0xFFE5E5DC),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(icon,
                              size: 22,
                              color: isOn ? AppColors.green : AppColors.muted),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  label,
                                  style: TextStyle(
                                    fontFamily: 'Cairo',
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: isOn ? AppColors.green : AppColors.text,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  sub,
                                  style: const TextStyle(
                                    fontFamily: 'Cairo',
                                    fontSize: 11,
                                    color: AppColors.muted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Switch(
                            value: isOn,
                            onChanged: (_) => _toggle(key),
                            activeColor: AppColors.green,
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),

              const SizedBox(height: 8),
              PrimaryButton(
                label: 'حفظ التفضيلات',
                onPressed: _dirty ? _save : null,
                loading: _saving,
              ),
            ],
          ),
        );
      },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Support
// ═══════════════════════════════════════════════════════════════════════════════

class _SupportSection extends StatelessWidget {
  const _SupportSection();

  static const _faqs = [
    ('كيف يمكنني تغيير كلمة المرور؟',
        'انتقل إلى إعدادات → الأمان واتبع خطوات تغيير كلمة المرور.'),
    ('كيف أتواصل مع المشترين؟',
        'يمكنك فتح المحادثات من قسم الرسائل أو من صفحة تفاصيل الطلب.'),
    ('كيف أنشر إعلاناً؟',
        'انتقل إلى قائمة إعلاناتي واضغط على زر إضافة إعلان جديد.'),
    ('ما هي طرق الدفع المتاحة؟',
        'ندعم الدفع عند الاستلام (COD) والدفع عبر InstaPay.'),
    ('كيف أتواصل مع الدعم الفني؟',
        'يمكنك التواصل معنا عبر واتساب أو البريد الإلكتروني أدناه.'),
  ];

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _SectionHeading('تواصل مع الدعم'),
          const SizedBox(height: 12),

          // WhatsApp
          _SupportCard(
            icon: Icons.phone_rounded,
            label: 'واتساب',
            sub: 'تواصل معنا مباشرة عبر واتساب',
            color: const Color(0xFF16A34A),
            bg: const Color(0xFFDCFCE7),
            border: const Color(0xFFBBF7D0),
            onTap: () => launchUrl(Uri.parse('https://wa.me/201000000000')),
          ),
          const SizedBox(height: 10),

          // Email
          _SupportCard(
            icon: Icons.email_outlined,
            label: 'البريد الإلكتروني',
            sub: 'support@farmflow.com.eg',
            color: const Color(0xFF2563EB),
            bg: const Color(0xFFDBEAFE),
            border: const Color(0xFFBFDBFE),
            onTap: () => launchUrl(Uri.parse('mailto:support@farmflow.com.eg')),
          ),
          const SizedBox(height: 24),

          _SectionHeading('الأسئلة الشائعة'),
          const SizedBox(height: 12),

          ..._faqs.map((faq) => _FaqItem(q: faq.$1, a: faq.$2)),

          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.greenBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.green.withValues(alpha: 0.25)),
            ),
            child: const Row(
              children: [
                Text('🌾', style: TextStyle(fontSize: 16)),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'ساعات الدعم: السبت – الخميس، من ٩ ص حتى ٦ م',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 12,
                      color: AppColors.muted,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SupportCard extends StatelessWidget {
  const _SupportCard({
    required this.icon,
    required this.label,
    required this.sub,
    required this.color,
    required this.bg,
    required this.border,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String sub;
  final Color color;
  final Color bg;
  final Color border;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: border),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 26),
            const SizedBox(width: 14),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: color)),
                const SizedBox(height: 2),
                Text(sub,
                    style: TextStyle(
                        fontFamily: 'Cairo', fontSize: 11, color: color.withValues(alpha: 0.75))),
              ],
            ),
            const Spacer(),
            Icon(Icons.arrow_back_ios_rounded, size: 14, color: color),
          ],
        ),
      ),
    );
  }
}

class _FaqItem extends StatefulWidget {
  const _FaqItem({required this.q, required this.a});
  final String q;
  final String a;

  @override
  State<_FaqItem> createState() => _FaqItemState();
}

class _FaqItemState extends State<_FaqItem> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Column(
          children: [
            GestureDetector(
              onTap: () => setState(() => _open = !_open),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                color: _open ? AppColors.greenBg : AppColors.white,
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        widget.q,
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.text,
                        ),
                      ),
                    ),
                    Icon(
                      _open
                          ? Icons.keyboard_arrow_up_rounded
                          : Icons.keyboard_arrow_down_rounded,
                      color: AppColors.muted,
                      size: 20,
                    ),
                  ],
                ),
              ),
            ),
            if (_open)
              Container(
                width: double.infinity,
                color: const Color(0xFFFAFDF9),
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
                child: Text(
                  widget.a,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 12,
                    color: AppColors.muted,
                    height: 1.7,
                  ),
                ),
              ),
            Container(height: 1, color: const Color(0xFFE5E5DC)),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: Logout
// ═══════════════════════════════════════════════════════════════════════════════

class _LogoutSection extends ConsumerWidget {
  const _LogoutSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.logout_rounded, size: 64, color: AppColors.muted),
            const SizedBox(height: 20),
            const Text(
              'تسجيل الخروج',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: AppColors.text,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'هل أنت متأكد من أنك تريد تسجيل الخروج من حسابك؟',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 14,
                color: AppColors.muted,
                height: 1.65,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton(
                  onPressed: () => context.pop(),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    side: const BorderSide(color: Color(0xFFE5E5DC)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text(
                    'إلغاء',
                    style: TextStyle(fontFamily: 'Cairo', color: AppColors.text, fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: () async {
                    final confirmed = await showConfirmDialog(
                      context,
                      title: 'تسجيل الخروج',
                      message: 'هل تريد تسجيل الخروج من حسابك؟',
                      confirmLabel: 'خروج',
                      dangerous: true,
                    );
                    if (confirmed) {
                      await ref.read(authNotifierProvider.notifier).logout();
                      if (context.mounted) context.go('/login');
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.red,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text(
                    'تسجيل الخروج',
                    style: TextStyle(fontFamily: 'Cairo', color: AppColors.white, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Shared widgets ─────────────────────────────────────────────────────────────

class _SectionHeading extends StatelessWidget {
  const _SectionHeading(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontFamily: 'Cairo',
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: AppColors.muted,
        letterSpacing: 0.5,
      ),
    );
  }
}

class _RoleBadge extends StatelessWidget {
  const _RoleBadge({required this.role});
  final String role;

  @override
  Widget build(BuildContext context) {
    final (label, icon, color, bg, border) = switch (role) {
      'seller' => ('بائع', '🌾', const Color(0xFFD97706), const Color(0xFFFFFBEB), const Color(0xFFFDE68A)),
      'admin'  => ('مشرف', '⚙️', const Color(0xFF7C3AED), const Color(0xFFF5F3FF), const Color(0xFFDDD6FE)),
      _        => ('مشترٍ', '🛒', const Color(0xFF2563EB), const Color(0xFFEFF6FF), const Color(0xFFBFDBFE)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(icon, style: const TextStyle(fontSize: 12)),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
