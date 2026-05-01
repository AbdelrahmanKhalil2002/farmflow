import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
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

  static const _roles = [
    ('all',    'الكل'),
    ('seller', 'بائع'),
    ('buyer',  'مشتري'),
    ('admin',  'مشرف'),
  ];

  @override
  Widget build(BuildContext context) {
    final asyncUsers = ref.watch(adminUsersProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text('إدارة المستخدمين',
            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                color: AppColors.white)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(44),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: Row(
              children: _roles.map((r) {
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
      body: Column(
        children: [
          // ── Search bar ──────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              onChanged: (v) => setState(() => _search = v.toLowerCase()),
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
                  color: AppColors.text),
              decoration: InputDecoration(
                hintText: 'بحث عن مستخدم...',
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

          // ── List ────────────────────────────────────────────────────────
          Expanded(
            child: asyncUsers.when(
              loading: () => const Padding(
                  padding: EdgeInsets.all(16),
                  child: ShimmerList(count: 6, cardHeight: 80)),
              error: (e, _) => EmptyState(
                icon: Icons.wifi_off_rounded,
                title: 'تعذّر التحميل',
                subtitle: e.toString(),
                actionLabel: 'إعادة المحاولة',
                action: () => ref.invalidate(adminUsersProvider),
              ),
              data: (users) {
                final filtered = users.where((u) {
                  final role = u['role'] as String? ?? '';
                  final name = ((u['name'] as String? ?? '') +
                      (u['farmName'] as String? ?? '') +
                      (u['email'] as String? ?? '') +
                      (u['phone'] as String? ?? '')).toLowerCase();
                  return (_roleFilter == 'all' || role == _roleFilter)
                      && (_search.isEmpty || name.contains(_search));
                }).toList();

                if (filtered.isEmpty) {
                  return const EmptyState(
                    icon: Icons.people_outline,
                    title: 'لا توجد نتائج',
                    subtitle: 'جرب تغيير الفلتر أو البحث',
                  );
                }

                return RefreshIndicator(
                  color: AppColors.green,
                  onRefresh: () async => ref.invalidate(adminUsersProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 24),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => _UserCard(
                      user: filtered[i],
                      onToggle: () => ref.invalidate(adminUsersProvider),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
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
  static const _roleAr = {
    'seller': 'بائع',
    'buyer':  'مشتري',
    'admin':  'مشرف',
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
          child: Text(_roleAr[role] ?? role,
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
