import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/l10n/l10n_ext.dart';
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

  static const _routes = [
    ('/buyer',           Icons.storefront_outlined,   Icons.storefront),
    ('/buyer/orders',    Icons.receipt_long_outlined,  Icons.receipt_long),
    ('/buyer/favorites', Icons.favorite_outline,       Icons.favorite),
    ('/buyer/profile',   Icons.person_outline,         Icons.person),
  ];

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final labels = [l10n.navHome, l10n.navOrders, l10n.navFavorites, l10n.navProfile];
    final location = GoRouterState.of(context).matchedLocation;
    final idx = _routes.indexWhere((t) => location.startsWith(t.$1));
    final current = idx < 0 ? 0 : idx;

    return Scaffold(
      body: ConnectivityBanner(child: child),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: current,
        onTap: (i) => context.go(_routes[i].$1),
        items: List.generate(_routes.length, (i) => BottomNavigationBarItem(
          icon:       Icon(_routes[i].$2),
          activeIcon: Icon(_routes[i].$3),
          label:      labels[i],
        )),
      ),
    );
  }
}

// ── Admin bottom nav ──────────────────────────────────────────────────────────
class _AdminShell extends StatelessWidget {
  const _AdminShell({required this.child});
  final Widget child;

  static const _routes = [
    ('/admin',          Icons.dashboard_outlined,      Icons.dashboard),
    ('/admin/listings', Icons.pending_outlined,         Icons.pending),
    ('/admin/orders',   Icons.receipt_long_outlined,    Icons.receipt_long),
    ('/admin/dairy',    Icons.local_drink_outlined,     Icons.local_drink),
    ('/admin/users',    Icons.people_outline,           Icons.people),
  ];

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final labels = [
      l10n.navAdminHome, l10n.navAdminListings, l10n.navAdminOrders,
      l10n.navAdminDairy, l10n.navAdminUsers,
    ];
    final location = GoRouterState.of(context).matchedLocation;
    final idx = _routes.indexWhere((t) => location.startsWith(t.$1));
    final current = idx < 0 ? 0 : idx;

    return Scaffold(
      body: ConnectivityBanner(child: child),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: current,
        onTap: (i) => context.go(_routes[i].$1),
        selectedItemColor: AppColors.green,
        items: List.generate(_routes.length, (i) => BottomNavigationBarItem(
          icon:       Icon(_routes[i].$2),
          activeIcon: Icon(_routes[i].$3, color: AppColors.green),
          label:      labels[i],
        )),
      ),
    );
  }
}

// ── Seller bottom nav ─────────────────────────────────────────────────────────
class _SellerShell extends StatelessWidget {
  const _SellerShell({required this.child});
  final Widget child;

  static const _routes = [
    ('/seller',            Icons.dashboard_outlined,  Icons.dashboard),
    ('/seller/herd',       Icons.pets_outlined,       Icons.pets),
    ('/seller/listings',   Icons.sell_outlined,       Icons.sell),
    ('/seller/statements', Icons.bar_chart_outlined,  Icons.bar_chart),
    ('/seller/profile',    Icons.person_outline,      Icons.person),
  ];

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final labels = [
      l10n.navDashboard, l10n.navHerd, l10n.navListings,
      l10n.navStatements, l10n.navProfile,
    ];
    final location = GoRouterState.of(context).matchedLocation;
    final idx = _routes.indexWhere((t) => location.startsWith(t.$1));
    final current = idx < 0 ? 0 : idx;

    return Scaffold(
      body: ConnectivityBanner(child: child),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: current,
        onTap: (i) => context.go(_routes[i].$1),
        selectedItemColor: AppColors.green,
        items: List.generate(_routes.length, (i) => BottomNavigationBarItem(
          icon:       Icon(_routes[i].$2),
          activeIcon: Icon(_routes[i].$3, color: AppColors.green),
          label:      labels[i],
        )),
      ),
    );
  }
}
