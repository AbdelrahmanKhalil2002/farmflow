import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import 'connectivity_banner.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.role, required this.child});

  final String role;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return switch (role) {
      'seller' => _SellerShell(child: child),
      'admin'  => _AdminShell(child: child),
      _        => _BuyerShell(child: child),
    };
  }
}

// ── Buyer bottom nav ──────────────────────────────────────────────────────────
class _BuyerShell extends StatelessWidget {
  const _BuyerShell({required this.child});
  final Widget child;

  static const _tabs = [
    ('/buyer',           Icons.storefront_outlined,   Icons.storefront,   'المزارع'),
    ('/buyer/orders',    Icons.receipt_long_outlined,  Icons.receipt_long, 'طلباتي'),
    ('/buyer/favorites', Icons.favorite_outline,       Icons.favorite,     'المفضلة'),
    ('/buyer/profile',   Icons.person_outline,         Icons.person,       'حسابي'),
  ];

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final idx = _tabs.indexWhere((t) => location.startsWith(t.$1));
    final current = idx < 0 ? 0 : idx;

    return Scaffold(
      body: ConnectivityBanner(child: child),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: current,
        onTap: (i) => context.go(_tabs[i].$1),
        items: _tabs.map((t) => BottomNavigationBarItem(
          icon:      Icon(t.$2),
          activeIcon: Icon(t.$3),
          label:     t.$4,
        )).toList(),
      ),
    );
  }
}

// ── Admin bottom nav ──────────────────────────────────────────────────────────
class _AdminShell extends StatelessWidget {
  const _AdminShell({required this.child});
  final Widget child;

  static const _tabs = [
    ('/admin',          Icons.dashboard_outlined,      Icons.dashboard,      'الرئيسية'),
    ('/admin/listings', Icons.pending_outlined,         Icons.pending,         'الإعلانات'),
    ('/admin/orders',   Icons.receipt_long_outlined,    Icons.receipt_long,    'الطلبات'),
    ('/admin/dairy',    Icons.local_drink_outlined,     Icons.local_drink,     'الألبان'),
    ('/admin/users',    Icons.people_outline,           Icons.people,          'المستخدمون'),
  ];

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final idx = _tabs.indexWhere((t) => location.startsWith(t.$1));
    final current = idx < 0 ? 0 : idx;

    return Scaffold(
      body: ConnectivityBanner(child: child),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: current,
        onTap: (i) => context.go(_tabs[i].$1),
        selectedItemColor: AppColors.green,
        items: _tabs.map((t) => BottomNavigationBarItem(
          icon:       Icon(t.$2),
          activeIcon: Icon(t.$3, color: AppColors.green),
          label:      t.$4,
        )).toList(),
      ),
    );
  }
}

// ── Seller bottom nav ─────────────────────────────────────────────────────────
class _SellerShell extends StatelessWidget {
  const _SellerShell({required this.child});
  final Widget child;

  static const _tabs = [
    ('/seller',            Icons.dashboard_outlined,  Icons.dashboard,   'لوحتي'),
    ('/seller/herd',       Icons.pets_outlined,       Icons.pets,        'القطيع'),
    ('/seller/listings',   Icons.sell_outlined,       Icons.sell,        'إعلاناتي'),
    ('/seller/statements', Icons.bar_chart_outlined,  Icons.bar_chart,   'الحسابات'),
    ('/seller/profile',    Icons.person_outline,      Icons.person,      'حسابي'),
  ];

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final idx = _tabs.indexWhere((t) => location.startsWith(t.$1));
    final current = idx < 0 ? 0 : idx;

    return Scaffold(
      body: ConnectivityBanner(child: child),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: current,
        onTap: (i) => context.go(_tabs[i].$1),
        selectedItemColor: AppColors.green,
        items: _tabs.map((t) => BottomNavigationBarItem(
          icon:      Icon(t.$2),
          activeIcon: Icon(t.$3, color: AppColors.green),
          label:     t.$4,
        )).toList(),
      ),
    );
  }
}
