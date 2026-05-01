import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/auth/auth_notifier.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/confirm_dialog.dart';
import '../../shared/widgets/shimmer_widget.dart';

// ── Stats provider ────────────────────────────────────────────────────────────

final adminStatsProvider =
    FutureProvider<Map<String, dynamic>>((ref) async {
  final dio  = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.adminStats);
  return res.data as Map<String, dynamic>? ?? {};
});

// ── Screen ────────────────────────────────────────────────────────────────────

class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncStats = ref.watch(adminStatsProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text('لوحة تحكم المشرف',
            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800,
                color: AppColors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.white),
            onPressed: () async {
              final ok = await showConfirmDialog(
                context,
                title: 'تسجيل الخروج',
                message: 'هل أنت متأكد؟',
                confirmLabel: 'خروج',
                dangerous: true,
              );
              if (ok && context.mounted) {
                await ref.read(authNotifierProvider.notifier).logout();
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.green,
        onRefresh: () async => ref.invalidate(adminStatsProvider),
        child: asyncStats.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(16),
            child: Column(children: [
              ShimmerCard(height: 120),
              SizedBox(height: 12),
              ShimmerCard(height: 120),
              SizedBox(height: 12),
              ShimmerCard(height: 180),
            ]),
          ),
          error: (e, _) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.wifi_off_rounded, size: 48,
                    color: AppColors.muted),
                const SizedBox(height: 10),
                const Text('تعذّر التحميل', style: TextStyle(
                    fontFamily: 'Cairo', color: AppColors.muted)),
                TextButton(
                  onPressed: () => ref.invalidate(adminStatsProvider),
                  child: const Text('إعادة المحاولة',
                      style: TextStyle(fontFamily: 'Cairo',
                          color: AppColors.green)),
                ),
              ],
            ),
          ),
          data: (stats) => _StatsBody(stats: stats),
        ),
      ),
    );
  }
}

class _StatsBody extends StatelessWidget {
  const _StatsBody({required this.stats});
  final Map<String, dynamic> stats;

  int _get(String key) {
    final v = stats[key];
    if (v is int)    return v;
    if (v is double) return v.toInt();
    if (v is Map)    return 0; // nested — handled separately
    return 0;
  }

  double _getDouble(String key) {
    final v = stats[key];
    if (v is num) return v.toDouble();
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final fmt     = NumberFormat('#,##0', 'ar');
    final fmtMony = NumberFormat('#,##0', 'ar');

    // Support both flat and nested response shapes
    final counts  = stats['counts'] as Map? ?? stats;
    final revenue = stats['revenue'] as Map?;
    final pending = stats['pending'] as Map?;

    int getC(String k) {
      final v = counts[k];
      if (v is int)    return v;
      if (v is double) return v.toInt();
      return 0;
    }

    final totalUsers    = getC('users')    > 0 ? getC('users')    : _get('totalUsers');
    final totalSellers  = getC('sellers')  > 0 ? getC('sellers')  : _get('totalSellers');
    final totalBuyers   = getC('buyers')   > 0 ? getC('buyers')   : _get('totalBuyers');
    final totalListings = getC('listings') > 0 ? getC('listings') : _get('totalListings');
    final totalOrders   = getC('orders')   > 0 ? getC('orders')   : _get('totalOrders');
    final totalRevenue  = revenue != null
        ? (revenue['total'] as num?)?.toDouble() ?? 0.0
        : _getDouble('totalRevenue');
    final pendingListings = pending != null
        ? (pending['listings'] as int?) ?? 0
        : _get('pendingListings');
    final pendingDairy    = pending != null
        ? (pending['dairy'] as int?) ?? 0
        : _get('pendingDairy');
    final pendingSupplies = pending != null
        ? (pending['supplies'] as int?) ?? 0
        : _get('pendingSupplies');

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // ── Revenue highlight ────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.green, AppColors.greenDark],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('إجمالي الإيرادات',
                      style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                          color: Color(0xCCFFFFFF))),
                  const SizedBox(height: 4),
                  Text('${fmtMony.format(totalRevenue)} ج.م',
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 22,
                          fontWeight: FontWeight.w800, color: AppColors.white)),
                  const SizedBox(height: 6),
                  Text('${fmt.format(totalOrders)} طلب مكتمل',
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
                          color: Color(0xCCFFFFFF))),
                ]),
            ),
            const Icon(Icons.account_balance_wallet_outlined,
                size: 44, color: Color(0x66FFFFFF)),
          ]),
        ),
        const SizedBox(height: 16),

        // ── User KPIs ────────────────────────────────────────────────────
        Row(children: [
          Expanded(child: _KpiCard(label: 'إجمالي المستخدمين',
              value: fmt.format(totalUsers),
              icon: Icons.people_outline, color: AppColors.blue)),
          const SizedBox(width: 10),
          Expanded(child: _KpiCard(label: 'البائعون',
              value: fmt.format(totalSellers),
              icon: Icons.storefront_outlined, color: AppColors.green)),
          const SizedBox(width: 10),
          Expanded(child: _KpiCard(label: 'المشترون',
              value: fmt.format(totalBuyers),
              icon: Icons.person_outline, color: AppColors.amber)),
        ]),
        const SizedBox(height: 10),

        // ── Listing KPI ──────────────────────────────────────────────────
        Row(children: [
          Expanded(child: _KpiCard(label: 'إجمالي الإعلانات',
              value: fmt.format(totalListings),
              icon: Icons.sell_outlined, color: AppColors.green)),
          const SizedBox(width: 10),
          Expanded(child: _KpiCard(label: 'إجمالي الطلبات',
              value: fmt.format(totalOrders),
              icon: Icons.receipt_long_outlined, color: AppColors.blue)),
          const SizedBox(width: 10),
          Expanded(child: const SizedBox()),
        ]),
        const SizedBox(height: 20),

        // ── Pending approvals ─────────────────────────────────────────────
        if (pendingListings + pendingDairy + pendingSupplies > 0) ...[
          const Text('قيد الموافقة',
              style: TextStyle(fontFamily: 'Cairo', fontSize: 15,
                  fontWeight: FontWeight.w800, color: AppColors.text)),
          const SizedBox(height: 10),
          _PendingCard(
            label: 'إعلانات مواشي',
            count: pendingListings,
            icon: Icons.pets_outlined,
            color: AppColors.green,
            onTap: () => context.go('/admin/listings'),
          ),
          const SizedBox(height: 8),
          _PendingCard(
            label: 'منتجات ألبان',
            count: pendingDairy,
            icon: Icons.local_drink_outlined,
            color: AppColors.blue,
            onTap: () => context.go('/admin/dairy'),
          ),
          const SizedBox(height: 8),
          _PendingCard(
            label: 'مستلزمات',
            count: pendingSupplies,
            icon: Icons.inventory_2_outlined,
            color: AppColors.amber,
            onTap: () => context.go('/admin/listings'),
          ),
        ],

        // ── Quick actions ──────────────────────────────────────────────────
        const SizedBox(height: 24),
        const Text('أدوات الإدارة',
            style: TextStyle(fontFamily: 'Cairo', fontSize: 15,
                fontWeight: FontWeight.w800, color: AppColors.text)),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
            child: _QuickAction(
              label: 'التقييمات',
              icon: Icons.star_outline_rounded,
              color: AppColors.amber,
              onTap: () => context.go('/admin/reviews'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _QuickAction(
              label: 'إعدادات العيد',
              icon: Icons.celebration_outlined,
              color: const Color(0xFFC97B2E),
              onTap: () => context.go('/admin/eid'),
            ),
          ),
        ]),
      ],
    );
  }
}

// ── Widgets ───────────────────────────────────────────────────────────────────

class _KpiCard extends StatelessWidget {
  const _KpiCard({required this.label, required this.value,
      required this.icon, required this.color});
  final String label, value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: color.withValues(alpha: 0.2)),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, size: 18, color: color),
      const SizedBox(height: 6),
      Text(value, style: TextStyle(fontFamily: 'Cairo', fontSize: 16,
          fontWeight: FontWeight.w800, color: color)),
      Text(label, style: const TextStyle(fontFamily: 'Cairo', fontSize: 10,
          color: AppColors.muted)),
    ]),
  );
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });
  final String   label;
  final IconData icon;
  final Color    color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Icon(icon, size: 22, color: color),
        const SizedBox(height: 6),
        Text(label,
            style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                fontWeight: FontWeight.w700, color: color)),
      ]),
    ),
  );
}

class _PendingCard extends StatelessWidget {
  const _PendingCard({required this.label, required this.count,
      required this.icon, required this.color, required this.onTap});
  final String label;
  final int count;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    if (count == 0) return const SizedBox.shrink();
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                shape: BoxShape.circle),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(label,
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
                  fontWeight: FontWeight.w600, color: AppColors.text))),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12)),
            child: Text('$count',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                    fontWeight: FontWeight.w800, color: color)),
          ),
          const SizedBox(width: 6),
          Icon(Icons.chevron_right, size: 16, color: color),
        ]),
      ),
    );
  }
}
