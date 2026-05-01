import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/auth/auth_notifier.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/user_model.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/gov_picker.dart';

class BuyerProfileScreen extends ConsumerWidget {
  const BuyerProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).valueOrNull;

    if (user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.green)),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 180,
            pinned: true,
            backgroundColor: AppColors.green,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: AppColors.green,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    const CircleAvatar(
                      radius: 40,
                      backgroundColor: AppColors.white,
                      child: Icon(Icons.person, color: AppColors.green,
                          size: 44),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      user.name,
                      style: const TextStyle(
                        fontFamily: 'Cairo', fontSize: 18,
                        fontWeight: FontWeight.w800, color: AppColors.white,
                      ),
                    ),
                    Text(
                      user.phone ?? user.email ?? '',
                      style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                          color: AppColors.white.withValues(alpha: 0.75)),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _ProfileCard(user: user),
                  const SizedBox(height: 12),
                  _MenuItem(
                    icon: Icons.edit_outlined,
                    label: 'تعديل الملف الشخصي',
                    onTap: () => _showEditProfile(context, ref, user),
                  ),
                  _MenuItem(
                    icon: Icons.receipt_long_outlined,
                    label: 'طلباتي',
                    onTap: () => context.go('/buyer/orders'),
                  ),
                  _MenuItem(
                    icon: Icons.favorite_outline,
                    label: 'المفضلة',
                    onTap: () => context.go('/buyer/favorites'),
                  ),
                  _MenuItem(
                    icon: Icons.notifications_outlined,
                    label: 'الإشعارات',
                    onTap: () => context.push('/buyer/notifications'),
                  ),
                  _MenuItem(
                    icon: Icons.lock_outline,
                    label: 'تغيير كلمة المرور',
                    onTap: () => _showChangePassword(context, ref),
                  ),
                  const SizedBox(height: 8),
                  _LogoutButton(),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showEditProfile(
      BuildContext context, WidgetRef ref, UserModel user) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _EditProfileSheet(user: user, ref: ref),
    );
  }

  void _showChangePassword(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _ChangePasswordSheet(ref: ref),
    );
  }
}

// ── Profile card ──────────────────────────────────────────────────────────────

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({required this.user});
  final UserModel user;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('بياناتك',
              style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                  fontWeight: FontWeight.w700, color: AppColors.muted)),
          const SizedBox(height: 10),
          if (user.email != null)
            _InfoRow(icon: Icons.email_outlined, label: 'البريد',
                value: user.email!),
          if (user.phone != null)
            _InfoRow(icon: Icons.phone_outlined, label: 'الهاتف',
                value: user.phone!),
          if (user.governorate != null)
            _InfoRow(icon: Icons.location_on_outlined, label: 'المحافظة',
                value: user.governorate!),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label,
      required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(children: [
      Icon(icon, size: 16, color: AppColors.green),
      const SizedBox(width: 8),
      Text('$label: ', style: const TextStyle(fontFamily: 'Cairo',
          fontSize: 13, color: AppColors.muted)),
      Expanded(
        child: Text(value, style: const TextStyle(fontFamily: 'Cairo',
            fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.text)),
      ),
    ]),
  );
}

// ── Menu item ─────────────────────────────────────────────────────────────────

class _MenuItem extends StatelessWidget {
  const _MenuItem({required this.icon, required this.label,
      required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        leading: Icon(icon, color: AppColors.green, size: 22),
        title: Text(label, style: const TextStyle(fontFamily: 'Cairo',
            fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.text)),
        trailing: const Icon(Icons.arrow_forward_ios, size: 14,
            color: AppColors.muted),
        onTap: onTap,
      ),
    );
  }
}

// ── Logout button ─────────────────────────────────────────────────────────────

class _LogoutButton extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () async {
          final ok = await showConfirmDialog(
            context,
            title: 'تسجيل الخروج',
            message: 'هل أنت متأكد من تسجيل الخروج؟',
            confirmLabel: 'خروج',
            dangerous: true,
          );
          if (ok && context.mounted) {
            await ref.read(authNotifierProvider.notifier).logout();
          }
        },
        icon: const Icon(Icons.logout, color: AppColors.red),
        label: const Text('تسجيل الخروج',
            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
                color: AppColors.red)),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: AppColors.red),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }
}

// ── Edit profile bottom sheet ─────────────────────────────────────────────────

class _EditProfileSheet extends StatefulWidget {
  const _EditProfileSheet({required this.user, required this.ref});
  final UserModel user;
  final WidgetRef ref;

  @override
  State<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends State<_EditProfileSheet> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _phoneCtrl;
  String? _governorate;
  bool _loading = false;
  String? _error;


  @override
  void initState() {
    super.initState();
    _nameCtrl  = TextEditingController(text: widget.user.name);
    _phoneCtrl = TextEditingController(
        text: widget.user.phone ?? widget.user.personalPhone ?? '');
    _governorate = widget.user.governorate;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_nameCtrl.text.trim().isEmpty) {
      setState(() => _error = 'الاسم مطلوب');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final dio = widget.ref.read(dioProvider);
      final res = await dio.put(ApiEndpoints.profile, data: {
        'name': _nameCtrl.text.trim(),
        if (_phoneCtrl.text.trim().isNotEmpty) 'phone': _phoneCtrl.text.trim(),
        if (_governorate != null) 'governorate': _governorate,
      });
      final updated =
          UserModel.fromJson(res.data as Map<String, dynamic>);
      await widget.ref
          .read(authNotifierProvider.notifier)
          .updateUser(updated);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _error = 'فشل في تحديث البيانات. حاول مجدداً.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40, height: 4,
                decoration: BoxDecoration(color: AppColors.border,
                    borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const Text('تعديل الملف الشخصي',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 17,
                    fontWeight: FontWeight.w800, color: AppColors.text)),
            const SizedBox(height: 16),

            // Name
            _SheetField(controller: _nameCtrl, label: 'الاسم',
                hint: 'اسمك الكامل'),
            const SizedBox(height: 12),

            // Phone
            _SheetField(controller: _phoneCtrl, label: 'رقم الهاتف',
                hint: '01XXXXXXXXX',
                keyboardType: TextInputType.phone),
            const SizedBox(height: 12),

            // Governorate
            GovPickerField(
              value: _governorate,
              onChanged: (v) => setState(() => _governorate = v),
            ),

            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!,
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                      color: AppColors.red)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loading ? null : _submit,
              style: FilledButton.styleFrom(
                  backgroundColor: AppColors.green,
                  padding: const EdgeInsets.symmetric(vertical: 14)),
              child: _loading
                  ? const SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(
                          color: AppColors.white, strokeWidth: 2))
                  : const Text('حفظ التعديلات',
                      style: TextStyle(fontFamily: 'Cairo',
                          fontWeight: FontWeight.w700, color: AppColors.white)),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Change password bottom sheet ──────────────────────────────────────────────

class _ChangePasswordSheet extends StatefulWidget {
  const _ChangePasswordSheet({required this.ref});
  final WidgetRef ref;

  @override
  State<_ChangePasswordSheet> createState() => _ChangePasswordSheetState();
}

class _ChangePasswordSheetState extends State<_ChangePasswordSheet> {
  final _currentCtrl = TextEditingController();
  final _newCtrl     = TextEditingController();
  final _confirmCtrl = TextEditingController();

  bool _showCurrent = false;
  bool _showNew     = false;
  bool _showConfirm = false;
  bool _loading     = false;
  String? _error;
  bool _success     = false;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_currentCtrl.text.trim().isEmpty ||
        _newCtrl.text.trim().isEmpty ||
        _confirmCtrl.text.trim().isEmpty) {
      setState(() => _error = 'يرجى ملء جميع الحقول');
      return;
    }
    if (_newCtrl.text != _confirmCtrl.text) {
      setState(() => _error = 'كلمتا المرور الجديدتان غير متطابقتين');
      return;
    }
    if (_newCtrl.text.length < 6) {
      setState(() => _error = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final dio = widget.ref.read(dioProvider);
      await dio.put(ApiEndpoints.password, data: {
        'currentPassword': _currentCtrl.text,
        'newPassword':     _newCtrl.text,
      });
      setState(() { _success = true; _loading = false; });
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _error = 'كلمة المرور الحالية غير صحيحة';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40, height: 4,
                decoration: BoxDecoration(color: AppColors.border,
                    borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const Text('تغيير كلمة المرور',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 17,
                    fontWeight: FontWeight.w800, color: AppColors.text)),
            const SizedBox(height: 16),

            _PasswordField(
              controller: _currentCtrl,
              label: 'كلمة المرور الحالية',
              visible: _showCurrent,
              onToggle: () => setState(() => _showCurrent = !_showCurrent),
            ),
            const SizedBox(height: 12),
            _PasswordField(
              controller: _newCtrl,
              label: 'كلمة المرور الجديدة',
              visible: _showNew,
              onToggle: () => setState(() => _showNew = !_showNew),
            ),
            const SizedBox(height: 12),
            _PasswordField(
              controller: _confirmCtrl,
              label: 'تأكيد كلمة المرور الجديدة',
              visible: _showConfirm,
              onToggle: () => setState(() => _showConfirm = !_showConfirm),
            ),

            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!,
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                      color: AppColors.red)),
            ],
            if (_success) ...[
              const SizedBox(height: 10),
              const Text('تم تغيير كلمة المرور بنجاح ✅',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                      color: AppColors.green, fontWeight: FontWeight.w700)),
            ],

            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loading || _success ? null : _submit,
              style: FilledButton.styleFrom(
                  backgroundColor: AppColors.green,
                  padding: const EdgeInsets.symmetric(vertical: 14)),
              child: _loading
                  ? const SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(
                          color: AppColors.white, strokeWidth: 2))
                  : const Text('تغيير كلمة المرور',
                      style: TextStyle(fontFamily: 'Cairo',
                          fontWeight: FontWeight.w700, color: AppColors.white)),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Shared sheet widgets ──────────────────────────────────────────────────────

class _SheetField extends StatelessWidget {
  const _SheetField({required this.controller, required this.label,
      required this.hint, this.keyboardType = TextInputType.text});
  final TextEditingController controller;
  final String label, hint;
  final TextInputType keyboardType;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
          fontWeight: FontWeight.w700, color: AppColors.muted)),
      const SizedBox(height: 6),
      TextField(
        controller: controller,
        keyboardType: keyboardType,
        style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
            color: AppColors.text),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
              color: AppColors.muted),
          filled: true, fillColor: AppColors.bg,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border)),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border)),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(
                  color: AppColors.green, width: 1.5)),
        ),
      ),
    ],
  );
}

class _PasswordField extends StatelessWidget {
  const _PasswordField({required this.controller, required this.label,
      required this.visible, required this.onToggle});
  final TextEditingController controller;
  final String label;
  final bool visible;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
          fontWeight: FontWeight.w700, color: AppColors.muted)),
      const SizedBox(height: 6),
      TextField(
        controller: controller,
        obscureText: !visible,
        style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
            color: AppColors.text),
        decoration: InputDecoration(
          hintText: '••••••••',
          hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
              color: AppColors.muted),
          filled: true, fillColor: AppColors.bg,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          suffixIcon: IconButton(
            icon: Icon(
                visible ? Icons.visibility_off : Icons.visibility,
                color: AppColors.muted, size: 20),
            onPressed: onToggle,
          ),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border)),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border)),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(
                  color: AppColors.green, width: 1.5)),
        ),
      ),
    ],
  );
}
