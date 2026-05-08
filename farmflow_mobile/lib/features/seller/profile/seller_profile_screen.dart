import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/api/image_helper.dart';
import '../../../core/auth/auth_notifier.dart';
import '../../../core/auth/auth_repository.dart';
import '../../../core/l10n/l10n_ext.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/image_compress_util.dart';
import '../../../shared/models/user_model.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/gov_picker.dart';

// Animal type chips (same as AddAnimalScreen)
const _kAnimalTypes = [
  ('cattle',  '🐄 أبقار'),
  ('buffalo', '🐃 جاموس'),
  ('sheep',   '🐑 خراف'),
  ('goat',    '🐐 ماعز'),
  ('camel',   '🐪 إبل'),
  ('horse',   '🐴 خيول'),
  ('poultry', '🐔 دواجن'),
  ('rabbit',  '🐇 أرانب'),
];

const _kCertificates = [
  'شهادة صحة حيوانية',
  'شهادة خلو من الأمراض',
  'مزرعة معتمدة',
  'منتجات عضوية',
  'شهادة التعامل البيطري',
  'تصريح وزارة الزراعة',
];

class SellerProfileScreen extends ConsumerWidget {
  const SellerProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).valueOrNull;

    if (user == null) {
      return const Scaffold(
        body: Center(
            child: CircularProgressIndicator(color: AppColors.green)),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: AppColors.green,
            flexibleSpace: FlexibleSpaceBar(
              background: _BannerHeader(user: user),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _InfoCard(user: user),
                  const SizedBox(height: 12),
                  _MenuItem(
                    icon: Icons.edit_outlined,
                    label: context.l10n.editProfile,
                    onTap: () => _showEditProfile(context, ref, user),
                  ),
                  _MenuItem(
                    icon: Icons.photo_camera_outlined,
                    label: context.l10n.editFarmBanner,
                    onTap: () => _changeBanner(context, ref),
                  ),
                  _MenuItem(
                    icon: Icons.lock_outline,
                    label: context.l10n.changePassword,
                    onTap: () => _showChangePassword(context, ref),
                  ),
                  _MenuItem(
                    icon: Icons.notifications_outlined,
                    label: context.l10n.notificationsTitle,
                    onTap: () => context.push('/seller/notifications'),
                  ),
                  _MenuItem(
                    icon: Icons.pets_outlined,
                    label: 'إعدادات السلالات',
                    onTap: () => context.push('/seller/breed-settings'),
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

  // ── Banner upload ─────────────────────────────────────────────────────────
  Future<void> _changeBanner(BuildContext context, WidgetRef ref) async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery);
    if (file == null) return;
    try {
      final compressed = await compressImage(file);
      final formData = FormData.fromMap({});
      formData.files.add(MapEntry('farmBanner',
          await MultipartFile.fromFile(compressed.path,
              filename: compressed.name)));
      final updated =
          await ref.read(authRepositoryProvider).updateProfile(formData);
      ref.read(authNotifierProvider.notifier).updateUser(updated);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(context.l10n.profileUpdateSuccess,
              style: const TextStyle(fontFamily: 'Cairo')),
          backgroundColor: AppColors.green,
        ));
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(context.l10n.profileUpdateFailed,
              style: const TextStyle(fontFamily: 'Cairo')),
          backgroundColor: AppColors.red,
        ));
      }
    }
  }

  void _showEditProfile(
      BuildContext context, WidgetRef ref, UserModel user) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _EditProfileSheet(
        user: user,
        onSaved: (updated) =>
            ref.read(authNotifierProvider.notifier).updateUser(updated),
      ),
    );
  }

  void _showChangePassword(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => const _ChangePasswordSheet(),
    );
  }
}

// ── Banner header ─────────────────────────────────────────────────────────────

class _BannerHeader extends StatelessWidget {
  const _BannerHeader({required this.user});
  final UserModel user;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        if (user.farmBanner != null)
          Image.network(imageUrl(user.farmBanner!), fit: BoxFit.cover,
              errorBuilder: (_, __, ___) =>
                  Container(color: AppColors.green))
        else
          Container(color: AppColors.green),
        // Gradient overlay
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.transparent,
                Colors.black.withValues(alpha: 0.5),
              ],
            ),
          ),
        ),
        // Name + rating
        Positioned(
          bottom: 16,
          right: 16,
          left: 16,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                user.farmName ?? user.name,
                style: const TextStyle(
                  fontFamily: 'Cairo', fontSize: 20,
                  fontWeight: FontWeight.w800, color: AppColors.white,
                ),
              ),
              Row(
                children: [
                  const Icon(Icons.star, color: Color(0xFFF59E0B), size: 14),
                  const SizedBox(width: 4),
                  Text(
                    '${user.averageRating.toStringAsFixed(1)} (${context.l10n.reviewCount(user.reviewCount)})',
                    style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                        color: AppColors.white),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Info card ─────────────────────────────────────────────────────────────────

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.user});
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
          if (user.bio != null && user.bio!.isNotEmpty) ...[
            Text(user.bio!,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
                    color: AppColors.text)),
            const SizedBox(height: 12),
          ],
          _InfoRow(icon: Icons.person_outline, label: user.name),
          if (user.farmPhone != null)
            _InfoRow(icon: Icons.phone_outlined, label: user.farmPhone!),
          if (user.governorate != null)
            _InfoRow(icon: Icons.location_on_outlined, label: user.governorate!),
          if (user.experience != null)
            _InfoRow(icon: Icons.work_history_outlined,
                label: '${user.experience} ${context.l10n.experience}'),
          if (user.animalTypes.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 6, runSpacing: 6,
              children: user.animalTypes.map((t) {
                final entry = _kAnimalTypes
                    .firstWhere((e) => e.$1 == t, orElse: () => (t, t));
                return Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.greenBg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(entry.$2,
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.greenText)),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(
      children: [
        Icon(icon, size: 16, color: AppColors.muted),
        const SizedBox(width: 8),
        Expanded(child: Text(label,
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
                color: AppColors.text))),
      ],
    ),
  );
}

// ── Menu item ─────────────────────────────────────────────────────────────────

class _MenuItem extends StatelessWidget {
  const _MenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.green),
          const SizedBox(width: 12),
          Expanded(child: Text(label,
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 14,
                  color: AppColors.text))),
          const Icon(Icons.chevron_left, size: 20, color: AppColors.muted),
        ],
      ),
    ),
  );
}

// ── Logout button ─────────────────────────────────────────────────────────────

class _LogoutButton extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) => OutlinedButton.icon(
    onPressed: () async {
      final ok = await showConfirmDialog(
        context,
        title: context.l10n.logoutConfirmTitle,
        message: context.l10n.logoutConfirmMessage,
        confirmLabel: context.l10n.logoutConfirmButton,
        dangerous: false,
      );
      if (ok) {
        await ref.read(authNotifierProvider.notifier).logout();
      }
    },
    icon: const Icon(Icons.logout, color: AppColors.red),
    label: Text(context.l10n.logoutButton,
        style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700,
            color: AppColors.red)),
    style: OutlinedButton.styleFrom(
      side: const BorderSide(color: AppColors.red),
      padding: const EdgeInsets.symmetric(vertical: 12),
      minimumSize: const Size.fromHeight(48),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  );
}

// ── Edit profile bottom sheet ─────────────────────────────────────────────────

class _EditProfileSheet extends ConsumerStatefulWidget {
  const _EditProfileSheet({required this.user, required this.onSaved});
  final UserModel user;
  final void Function(UserModel) onSaved;

  @override
  ConsumerState<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends ConsumerState<_EditProfileSheet> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _farmNameCtrl;
  late final TextEditingController _farmPhoneCtrl;
  late final TextEditingController _personalPhoneCtrl;
  late final TextEditingController _expCtrl;
  late final TextEditingController _bioCtrl;
  late final TextEditingController _descCtrl;

  late String? _governorate;
  late List<String> _animalTypes;
  late List<String> _certificates;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final u = widget.user;
    _nameCtrl         = TextEditingController(text: u.name);
    _farmNameCtrl     = TextEditingController(text: u.farmName ?? '');
    _farmPhoneCtrl    = TextEditingController(text: u.farmPhone ?? '');
    _personalPhoneCtrl = TextEditingController(text: u.personalPhone ?? '');
    _expCtrl          = TextEditingController(text: u.experience ?? '');
    _bioCtrl          = TextEditingController(text: u.bio ?? '');
    _descCtrl         = TextEditingController(text: u.farmDescription ?? '');
    _governorate      = u.governorate;
    _animalTypes      = List<String>.from(u.animalTypes);
    _certificates     = List<String>.from(u.farmCertificates);
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _farmNameCtrl.dispose(); _farmPhoneCtrl.dispose();
    _personalPhoneCtrl.dispose(); _expCtrl.dispose();
    _bioCtrl.dispose(); _descCtrl.dispose();
    super.dispose();
  }

  void _toggleType(String t) => setState(() {
    if (_animalTypes.contains(t)) {
      _animalTypes.remove(t);
    } else {
      _animalTypes.add(t);
    }
  });

  void _toggleCert(String c) => setState(() {
    if (_certificates.contains(c)) {
      _certificates.remove(c);
    } else {
      _certificates.add(c);
    }
  });

  Future<void> _submit() async {
    if (_nameCtrl.text.trim().isEmpty ||
        _farmNameCtrl.text.trim().isEmpty) {
      setState(() => _error = context.l10n.farmNameRequired);
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final updated =
          await ref.read(authRepositoryProvider).updateProfile({
        'name':             _nameCtrl.text.trim(),
        'farmName':         _farmNameCtrl.text.trim(),
        if (_farmPhoneCtrl.text.trim().isNotEmpty)
          'farmPhone':      _farmPhoneCtrl.text.trim(),
        if (_personalPhoneCtrl.text.trim().isNotEmpty)
          'personalPhone':  _personalPhoneCtrl.text.trim(),
        if (_expCtrl.text.trim().isNotEmpty)
          'experience':     _expCtrl.text.trim(),
        if (_bioCtrl.text.trim().isNotEmpty)
          'bio':            _bioCtrl.text.trim(),
        if (_descCtrl.text.trim().isNotEmpty)
          'farmDescription': _descCtrl.text.trim(),
        if (_governorate != null)
          'governorate':    _governorate,
        'animalTypes':      _animalTypes,
        'farmCertificates': _certificates,
      });
      widget.onSaved(updated);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      setState(() {
        _error = context.l10n.updateFailed;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (_, ctrl) => Padding(
        padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom),
        child: ListView(
          controller: ctrl,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          children: [
            Center(child: Container(margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40, height: 4,
                decoration: BoxDecoration(color: AppColors.border,
                    borderRadius: BorderRadius.circular(2)))),
            Text(context.l10n.editProfileTitle,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 17,
                    fontWeight: FontWeight.w800, color: AppColors.text)),
            const SizedBox(height: 16),
            _PField(ctrl: _nameCtrl, label: context.l10n.fullName),
            const SizedBox(height: 10),
            _PField(ctrl: _farmNameCtrl, label: context.l10n.farmName),
            const SizedBox(height: 10),
            _PField(ctrl: _farmPhoneCtrl, label: context.l10n.farmPhoneLabel,
                keyboard: TextInputType.phone),
            const SizedBox(height: 10),
            _PField(ctrl: _personalPhoneCtrl, label: context.l10n.personalPhoneLabel,
                keyboard: TextInputType.phone),
            const SizedBox(height: 10),
            _PField(ctrl: _expCtrl, label: context.l10n.experience,
                keyboard: TextInputType.number),
            const SizedBox(height: 10),
            // Governorate picker
            _PLabel(context.l10n.governorate),
            const SizedBox(height: 6),
            GovPickerField(
              value: _governorate,
              onChanged: (v) => setState(() => _governorate = v),
            ),
            const SizedBox(height: 10),
            _PField(ctrl: _bioCtrl, label: context.l10n.bio,
                maxLines: 3),
            const SizedBox(height: 10),
            _PField(ctrl: _descCtrl, label: context.l10n.listingDescription,
                maxLines: 4),
            const SizedBox(height: 16),
            // Animal types
            _PLabel(context.l10n.animalType),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8, runSpacing: 8,
              children: _kAnimalTypes.map((t) {
                final selected = _animalTypes.contains(t.$1);
                return GestureDetector(
                  onTap: () => _toggleType(t.$1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: selected ? AppColors.green : AppColors.bg,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: selected ? AppColors.green : AppColors.border),
                    ),
                    child: Text(t.$2, style: TextStyle(fontFamily: 'Cairo',
                        fontSize: 12,
                        color: selected ? AppColors.white : AppColors.text)),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            // Certificates
            _PLabel(context.l10n.certificatesSection),
            const SizedBox(height: 8),
            ..._kCertificates.map((c) {
              final selected = _certificates.contains(c);
              return GestureDetector(
                onTap: () => _toggleCert(c),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: selected ? AppColors.greenBg : AppColors.bg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: selected ? AppColors.green : AppColors.border),
                  ),
                  child: Row(children: [
                    Icon(
                      selected
                          ? Icons.check_circle_outline
                          : Icons.circle_outlined,
                      size: 18,
                      color: selected ? AppColors.green : AppColors.muted,
                    ),
                    const SizedBox(width: 10),
                    Expanded(child: Text(c,
                        style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                            color: selected ? AppColors.greenText : AppColors.text))),
                  ]),
                ),
              );
            }),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(fontFamily: 'Cairo',
                  fontSize: 12, color: AppColors.red)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loading ? null : _submit,
              style: FilledButton.styleFrom(backgroundColor: AppColors.green,
                  padding: const EdgeInsets.symmetric(vertical: 14)),
              child: _loading
                  ? const SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(
                          color: AppColors.white, strokeWidth: 2))
                  : Text(context.l10n.saveChanges,
                      style: const TextStyle(fontFamily: 'Cairo',
                          fontWeight: FontWeight.w700, color: AppColors.white)),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Change password sheet ─────────────────────────────────────────────────────

class _ChangePasswordSheet extends ConsumerStatefulWidget {
  const _ChangePasswordSheet();

  @override
  ConsumerState<_ChangePasswordSheet> createState() =>
      _ChangePasswordSheetState();
}

class _ChangePasswordSheetState extends ConsumerState<_ChangePasswordSheet> {
  final _currentCtrl = TextEditingController();
  final _newCtrl     = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _showCurrent = false;
  bool _showNew     = false;
  bool _showConfirm = false;
  bool _loading     = false;
  String? _error;

  @override
  void dispose() {
    _currentCtrl.dispose(); _newCtrl.dispose(); _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_currentCtrl.text.isEmpty || _newCtrl.text.isEmpty) {
      setState(() => _error = context.l10n.fillAllFields);
      return;
    }
    if (_newCtrl.text != _confirmCtrl.text) {
      setState(() => _error = context.l10n.newPasswordMismatch);
      return;
    }
    if (_newCtrl.text.length < 8) {
      setState(() => _error = context.l10n.passwordMinLength);
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(dioProvider).put(ApiEndpoints.password, data: {
        'currentPassword': _currentCtrl.text,
        'newPassword':     _newCtrl.text,
      });
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(context.l10n.passwordChangedSuccess,
              style: const TextStyle(fontFamily: 'Cairo')),
          backgroundColor: AppColors.green,
        ));
      }
    } catch (_) {
      setState(() {
        _error = context.l10n.currentPasswordWrong;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
        20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
    child: SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(child: Container(margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40, height: 4,
              decoration: BoxDecoration(color: AppColors.border,
                  borderRadius: BorderRadius.circular(2)))),
          Text(context.l10n.changePasswordTitle,
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 17,
                  fontWeight: FontWeight.w800, color: AppColors.text)),
          const SizedBox(height: 16),
          _PwField(
            controller: _currentCtrl,
            label: context.l10n.currentPassword,
            show: _showCurrent,
            onToggle: () => setState(() => _showCurrent = !_showCurrent),
          ),
          const SizedBox(height: 10),
          _PwField(
            controller: _newCtrl,
            label: context.l10n.newPassword,
            show: _showNew,
            onToggle: () => setState(() => _showNew = !_showNew),
          ),
          const SizedBox(height: 10),
          _PwField(
            controller: _confirmCtrl,
            label: context.l10n.confirmNewPassword,
            show: _showConfirm,
            onToggle: () => setState(() => _showConfirm = !_showConfirm),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(fontFamily: 'Cairo',
                fontSize: 12, color: AppColors.red)),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _loading ? null : _submit,
            style: FilledButton.styleFrom(backgroundColor: AppColors.green,
                padding: const EdgeInsets.symmetric(vertical: 14)),
            child: _loading
                ? const SizedBox(width: 20, height: 20,
                    child: CircularProgressIndicator(
                        color: AppColors.white, strokeWidth: 2))
                : Text(context.l10n.changePassword,
                    style: const TextStyle(fontFamily: 'Cairo',
                        fontWeight: FontWeight.w700, color: AppColors.white)),
          ),
        ],
      ),
    ),
  );
}

// ── Small helper widgets ──────────────────────────────────────────────────────

class _PLabel extends StatelessWidget {
  const _PLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(text,
      style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
          fontWeight: FontWeight.w700, color: AppColors.muted));
}

class _PField extends StatelessWidget {
  const _PField({
    required this.ctrl,
    required this.label,
    this.keyboard = TextInputType.text,
    this.maxLines = 1,
  });
  final TextEditingController ctrl;
  final String label;
  final TextInputType keyboard;
  final int maxLines;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _PLabel(label),
      const SizedBox(height: 4),
      TextField(
        controller: ctrl,
        keyboardType: keyboard,
        maxLines: maxLines,
        style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
            color: AppColors.text),
        decoration: InputDecoration(
          filled: true, fillColor: AppColors.bg,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border)),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.border)),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.green, width: 1.5)),
        ),
      ),
    ],
  );
}

class _PwField extends StatelessWidget {
  const _PwField({
    required this.controller,
    required this.label,
    required this.show,
    required this.onToggle,
  });
  final TextEditingController controller;
  final String label;
  final bool show;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _PLabel(label),
      const SizedBox(height: 4),
      TextField(
        controller: controller,
        obscureText: !show,
        style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
            color: AppColors.text),
        decoration: InputDecoration(
          filled: true, fillColor: AppColors.bg,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          suffixIcon: IconButton(
            icon: Icon(show ? Icons.visibility_off : Icons.visibility,
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
              borderSide: const BorderSide(color: AppColors.green, width: 1.5)),
        ),
      ),
    ],
  );
}
