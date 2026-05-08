import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/l10n/l10n_ext.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/shimmer_widget.dart';

// ── Provider ──────────────────────────────────────────────────────────────────

final adminUsersProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.adminUsers);
  final data = res.data as List? ?? [];
  return data.cast<Map<String, dynamic>>();
});

// ── Screen ────────────────────────────────────────────────────────────────────

class AdminUsersScreen extends ConsumerStatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  ConsumerState<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends ConsumerState<AdminUsersScreen> {
  String _roleFilter = 'all';
  String _search     = '';
  String _sortBy     = 'name'; // name | date | listings

  @override
  Widget build(BuildContext context) {
    final asyncUsers = ref.watch(adminUsersProvider);

    final roles = [
      ('all',    context.l10n.allFilter),
      ('seller', context.l10n.sellerBadge),
      ('buyer',  context.l10n.buyerBadge),
      ('admin',  context.l10n.admin),
    ];

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Text(context.l10n.adminUsersTitle,
            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                color: AppColors.white)),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.sort, color: AppColors.white),
            tooltip: 'ترتيب',
            onSelected: (v) => setState(() => _sortBy = v),
            itemBuilder: (_) => [
              const PopupMenuItem(
                value: 'name',
                child: Text('ترتيب بالاسم',
                    style: TextStyle(fontFamily: 'Cairo')),
              ),
              const PopupMenuItem(
                value: 'date',
                child: Text('ترتيب بتاريخ التسجيل',
                    style: TextStyle(fontFamily: 'Cairo')),
              ),
              const PopupMenuItem(
                value: 'listings',
                child: Text('ترتيب بعدد الإعلانات',
                    style: TextStyle(fontFamily: 'Cairo')),
              ),
            ],
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(44),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: Row(
              children: roles.map((r) {
                final sel = _roleFilter == r.$1;
                return GestureDetector(
                  onTap: () => setState(() => _roleFilter = r.$1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    margin: const EdgeInsets.only(left: 6),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: sel
                          ? AppColors.white
                          : AppColors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(r.$2,
                        style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: sel
                                ? AppColors.green : AppColors.white)),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
      body: asyncUsers.when(
        loading: () => const Padding(
            padding: EdgeInsets.all(16),
            child: ShimmerList(count: 6, cardHeight: 80)),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: context.l10n.loadingFailed,
          subtitle: e.toString(),
          actionLabel: context.l10n.retry,
          action: () => ref.invalidate(adminUsersProvider),
        ),
        data: (users) {
          // Stats
          final total    = users.length;
          final sellers  = users.where((u) => u['role'] == 'seller').length;
          final buyers   = users.where((u) => u['role'] == 'buyer').length;
          final inactive = users.where((u) =>
              !(u['isActive'] as bool? ?? true)).length;

          var filtered = users.where((u) {
            final role = u['role'] as String? ?? '';
            final name = ((u['name'] as String? ?? '') +
                (u['farmName'] as String? ?? '') +
                (u['email'] as String? ?? '') +
                (u['phone'] as String? ?? '')).toLowerCase();
            return (_roleFilter == 'all' || role == _roleFilter)
                && (_search.isEmpty || name.contains(_search));
          }).toList();

          // Sort
          filtered.sort((a, b) {
            switch (_sortBy) {
              case 'date':
                final da = a['createdAt'] as String? ?? '';
                final db = b['createdAt'] as String? ?? '';
                return db.compareTo(da);
              case 'listings':
                final la = (a['listingsCount'] as int?) ?? 0;
                final lb = (b['listingsCount'] as int?) ?? 0;
                return lb.compareTo(la);
              default:
                final na = a['farmName'] as String?
                    ?? a['name'] as String? ?? '';
                final nb = b['farmName'] as String?
                    ?? b['name'] as String? ?? '';
                return na.compareTo(nb);
            }
          });

          return Column(children: [
            // ── Search bar ──────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.all(12),
              child: TextField(
                onChanged: (v) => setState(() => _search = v.toLowerCase()),
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
                    color: AppColors.text),
                decoration: InputDecoration(
                  hintText: context.l10n.userSearchHint,
                  hintStyle: const TextStyle(fontFamily: 'Cairo',
                      fontSize: 13, color: AppColors.muted),
                  prefixIcon: const Icon(Icons.search,
                      color: AppColors.muted, size: 20),
                  filled: true, fillColor: AppColors.card,
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          const BorderSide(color: AppColors.border)),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          const BorderSide(color: AppColors.border)),
                  focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(
                          color: AppColors.green, width: 1.5)),
                ),
              ),
            ),

            // ── Stats strip ─────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              child: Row(children: [
                _StatChip(label: 'الكل',    value: '$total',    color: AppColors.blue),
                const SizedBox(width: 8),
                _StatChip(label: 'بائعين',  value: '$sellers',  color: AppColors.green),
                const SizedBox(width: 8),
                _StatChip(label: 'مشترين',  value: '$buyers',   color: AppColors.amber),
                const SizedBox(width: 8),
                _StatChip(label: 'غير نشط', value: '$inactive', color: AppColors.red),
              ]),
            ),

            // ── List ────────────────────────────────────────────────────
            Expanded(
              child: filtered.isEmpty
                  ? EmptyState(
                      icon: Icons.people_outline,
                      title: context.l10n.noUsersFound,
                      subtitle: context.l10n.noUsersFoundSubtitle,
                    )
                  : RefreshIndicator(
                      color: AppColors.green,
                      onRefresh: () async =>
                          ref.invalidate(adminUsersProvider),
                      child: ListView.separated(
                        padding:
                            const EdgeInsets.fromLTRB(12, 0, 12, 24),
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 8),
                        itemBuilder: (_, i) => GestureDetector(
                          onTap: () =>
                              _showProfileDrawer(context, filtered[i]),
                          child: _UserCard(
                            user: filtered[i],
                            onToggle: () =>
                                ref.invalidate(adminUsersProvider),
                          ),
                        ),
                      ),
                    ),
            ),
          ]);
        },
      ),
    );
  }

  void _showProfileDrawer(BuildContext context, Map<String, dynamic> user) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _UserProfileSheet(
        user: user,
        onToggle: () => ref.invalidate(adminUsersProvider),
      ),
    );
  }
}

// ── User profile sheet ────────────────────────────────────────────────────────

class _UserProfileSheet extends ConsumerStatefulWidget {
  const _UserProfileSheet({required this.user, required this.onToggle});
  final Map<String, dynamic> user;
  final VoidCallback onToggle;

  @override
  ConsumerState<_UserProfileSheet> createState() =>
      _UserProfileSheetState();
}

class _UserProfileSheetState extends ConsumerState<_UserProfileSheet> {
  bool _toggling = false;

  static const _roleColor = {
    'seller': AppColors.green,
    'buyer':  AppColors.blue,
    'admin':  AppColors.rose,
  };

  Future<void> _toggle() async {
    final u      = widget.user;
    final id     = u['_id'] as String? ?? '';
    final active = u['isActive'] as bool? ?? true;
    setState(() => _toggling = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.patch(ApiEndpoints.adminUserById(id),
          data: {'isActive': !active});
      widget.onToggle();
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted) setState(() => _toggling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final u         = widget.user;
    final name      = u['farmName'] as String? ?? u['name'] as String? ?? '—';
    final email     = u['email'] as String? ?? '';
    final phone     = u['phone'] as String?
        ?? u['personalPhone'] as String? ?? '';
    final role      = u['role'] as String? ?? 'buyer';
    final active    = u['isActive'] as bool? ?? true;
    final color     = _roleColor[role] ?? AppColors.muted;
    final createdAt = u['createdAt'] as String?;
    final lastLogin = u['lastLogin'] as String?;
    final listingsCount = (u['listingsCount'] as int?) ?? 0;
    final ordersCount   = (u['ordersCount'] as int?) ?? 0;
    final fmt = DateFormat('d MMM yyyy', 'ar');
    final roleAr = {
      'seller': context.l10n.sellerBadge,
      'buyer':  context.l10n.buyerBadge,
      'admin':  context.l10n.admin,
    };

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.92,
      minChildSize: 0.4,
      builder: (_, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(children: [
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 6),
            width: 36, height: 4,
            decoration: BoxDecoration(color: AppColors.border,
                borderRadius: BorderRadius.circular(2)),
          ),
          Expanded(
            child: ListView(
              controller: scrollCtrl,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              children: [
                const SizedBox(height: 10),
                // Avatar + name + role badge
                Center(
                  child: Column(children: [
                    Container(
                      width: 70, height: 70,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.14),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          name.isNotEmpty ? name[0] : '?',
                          style: TextStyle(fontFamily: 'Cairo',
                              fontSize: 28, fontWeight: FontWeight.w800,
                              color: color),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(name,
                        style: const TextStyle(fontFamily: 'Cairo',
                            fontSize: 18, fontWeight: FontWeight.w800,
                            color: AppColors.text)),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(roleAr[role] ?? role,
                          style: TextStyle(fontFamily: 'Cairo',
                              fontSize: 12, fontWeight: FontWeight.w700,
                              color: color)),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: active
                            ? AppColors.greenBg
                            : AppColors.redBg,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(active ? 'نشط' : 'غير نشط',
                          style: TextStyle(fontFamily: 'Cairo',
                              fontSize: 11,
                              color: active
                                  ? AppColors.green
                                  : AppColors.red)),
                    ),
                  ]),
                ),
                const SizedBox(height: 20),

                // Contact info
                _ProfileRow(Icons.email_outlined, 'البريد الإلكتروني',
                    email.isNotEmpty ? email : '—'),
                _ProfileRow(Icons.phone_outlined, 'الهاتف',
                    phone.isNotEmpty ? phone : '—'),

                const SizedBox(height: 12),

                // Stats
                Row(children: [
                  Expanded(
                    child: _StatsBox(
                      label: 'الإعلانات',
                      value: '$listingsCount',
                      color: AppColors.green,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatsBox(
                      label: 'الطلبات',
                      value: '$ordersCount',
                      color: AppColors.blue,
                    ),
                  ),
                ]),
                const SizedBox(height: 12),

                if (createdAt != null)
                  _ProfileRow(Icons.calendar_today_outlined,
                      'تاريخ التسجيل',
                      fmt.format(DateTime.parse(createdAt))),
                if (lastLogin != null)
                  _ProfileRow(Icons.access_time_outlined,
                      'آخر تسجيل دخول',
                      fmt.format(DateTime.parse(lastLogin))),
                const SizedBox(height: 24),

                // Activate / Deactivate
                if (role != 'admin')
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _toggling ? null : _toggle,
                      style: FilledButton.styleFrom(
                        backgroundColor:
                            active ? AppColors.red : AppColors.green,
                        padding:
                            const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: _toggling
                          ? const SizedBox(
                              width: 16, height: 16,
                              child: CircularProgressIndicator(
                                  color: AppColors.white, strokeWidth: 2))
                          : Icon(
                              active
                                  ? Icons.block_outlined
                                  : Icons.check_circle_outline,
                              size: 18, color: AppColors.white),
                      label: Text(
                        active ? 'تعطيل الحساب' : 'تفعيل الحساب',
                        style: const TextStyle(fontFamily: 'Cairo',
                            fontSize: 14, fontWeight: FontWeight.w700,
                            color: AppColors.white),
                      ),
                    ),
                  ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ]),
      ),
    );
  }
}

class _ProfileRow extends StatelessWidget {
  const _ProfileRow(this.icon, this.label, this.value);
  final IconData icon;
  final String label, value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(children: [
      Icon(icon, size: 16, color: AppColors.muted),
      const SizedBox(width: 10),
      Text(label,
          style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
              color: AppColors.muted)),
      const Spacer(),
      Text(value,
          style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
              fontWeight: FontWeight.w600, color: AppColors.text)),
    ]),
  );
}

class _StatsBox extends StatelessWidget {
  const _StatsBox({required this.label, required this.value, required this.color});
  final String label, value;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 12),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: color.withValues(alpha: 0.2)),
    ),
    child: Column(children: [
      Text(value, style: TextStyle(fontFamily: 'Cairo', fontSize: 20,
          fontWeight: FontWeight.w800, color: color)),
      Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 11,
          color: AppColors.muted)),
    ]),
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

class _StatChip extends StatelessWidget {
  const _StatChip({
    required this.label,
    required this.value,
    required this.color,
  });
  final String label, value;
  final Color  color;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Text(value, style: TextStyle(fontFamily: 'Cairo', fontSize: 14,
            fontWeight: FontWeight.w800, color: color)),
        Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 9,
            color: AppColors.muted), textAlign: TextAlign.center),
      ]),
    ),
  );
}

// ── User card ─────────────────────────────────────────────────────────────────

class _UserCard extends ConsumerStatefulWidget {
  const _UserCard({required this.user, required this.onToggle});
  final Map<String, dynamic> user;
  final VoidCallback onToggle;

  @override
  ConsumerState<_UserCard> createState() => _UserCardState();
}

class _UserCardState extends ConsumerState<_UserCard> {
  bool _toggling = false;

  static const _roleColor = {
    'seller': AppColors.green,
    'buyer':  AppColors.blue,
    'admin':  AppColors.rose,
  };

  Future<void> _toggle() async {
    final u      = widget.user;
    final id     = u['_id'] as String? ?? '';
    final active = u['isActive'] as bool? ?? true;
    setState(() => _toggling = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.patch(ApiEndpoints.adminUserById(id),
          data: {'isActive': !active});
      widget.onToggle();
    } catch (_) {
      if (mounted) setState(() => _toggling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final u      = widget.user;
    final name   = u['farmName'] as String? ?? u['name'] as String? ?? '—';
    final sub    = u['email'] as String?
        ?? u['phone'] as String?
        ?? u['personalPhone'] as String? ?? '';
    final role   = u['role'] as String? ?? 'buyer';
    final active = u['isActive'] as bool? ?? true;
    final color  = _roleColor[role] ?? AppColors.muted;
    final roleAr = {
      'seller': context.l10n.sellerBadge,
      'buyer':  context.l10n.buyerBadge,
      'admin':  context.l10n.admin,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(children: [
        // Avatar
        Container(
          width: 42, height: 42,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(name.isNotEmpty ? name[0] : '?',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 16,
                    fontWeight: FontWeight.w800, color: color)),
          ),
        ),
        const SizedBox(width: 12),
        // Info
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(name, maxLines: 1, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
                    fontWeight: FontWeight.w700, color: AppColors.text)),
            if (sub.isNotEmpty)
              Text(sub, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 11,
                      color: AppColors.muted)),
          ],
        )),
        // Role badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(roleAr[role] ?? role,
              style: TextStyle(fontFamily: 'Cairo', fontSize: 10,
                  fontWeight: FontWeight.w700, color: color)),
        ),
        const SizedBox(width: 8),
        // Active toggle
        _toggling
            ? const SizedBox(width: 24, height: 24,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: AppColors.green))
            : GestureDetector(
                onTap: role == 'admin' ? null : _toggle,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 40, height: 22,
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: active ? AppColors.green : AppColors.grey200,
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: AnimatedAlign(
                    duration: const Duration(milliseconds: 200),
                    alignment: active
                        ? Alignment.centerRight
                        : Alignment.centerLeft,
                    child: Container(
                      width: 18, height: 18,
                      decoration: const BoxDecoration(
                          color: AppColors.white, shape: BoxShape.circle),
                    ),
                  ),
                ),
              ),
      ]),
    );
  }
}
