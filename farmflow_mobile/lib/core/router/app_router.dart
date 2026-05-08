import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../auth/auth_notifier.dart';
import '../../features/auth/splash_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/register_role_screen.dart';
import '../../features/auth/buyer_register_screen.dart';
import '../../features/auth/seller_register_screen.dart';
import '../../features/buyer/browse/buyer_home_screen.dart';
import '../../features/buyer/farm_detail/farm_detail_screen.dart';
import '../../features/buyer/orders/orders_screen.dart';
import '../../features/buyer/favorites/favorites_screen.dart';
import '../../features/buyer/profile/buyer_profile_screen.dart';
import '../../features/buyer/notifications/notifications_screen.dart';
import '../../features/buyer/farm_detail/listing_detail_screen.dart';
import '../../features/buyer/supplies/supply_detail_screen.dart';
import '../../features/seller/dashboard/seller_dashboard_screen.dart';
import '../../features/seller/herd/herd_screen.dart';
import '../../features/seller/herd/add_animal_screen.dart';
import '../../features/seller/herd/animal_detail_screen.dart';
import '../../features/seller/herd/edit_animal_screen.dart';
import '../../features/seller/herd/vet_records_screen.dart';
import '../../features/seller/listings/seller_listings_screen.dart';
import '../../features/seller/listings/add_listing_screen.dart';
import '../../features/seller/listings/breed_settings_screen.dart';
import '../../features/seller/listings/edit_listing_screen.dart';
import '../../shared/models/listing_model.dart';
import '../../features/seller/dairy/seller_dairy_screen.dart';
import '../../features/seller/supplies/seller_supplies_screen.dart';
import '../../features/seller/finance/statements_screen.dart';
import '../../features/seller/profile/seller_profile_screen.dart';
import '../../features/admin/admin_dashboard_screen.dart';
import '../../features/admin/admin_listings_screen.dart';
import '../../features/admin/admin_users_screen.dart';
import '../../features/admin/admin_dairy_screen.dart';
import '../../features/admin/admin_orders_screen.dart';
import '../../features/admin/admin_reviews_screen.dart';
import '../../features/admin/admin_eid_screen.dart';
import '../../features/admin/admin_supplies_screen.dart';
import '../../shared/widgets/app_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authNotifierProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isLoading  = authState.isLoading;
      final user       = authState.valueOrNull;
      final isSplash   = state.matchedLocation == '/splash';
      final isAuth     = state.matchedLocation.startsWith('/login') ||
                         state.matchedLocation.startsWith('/register');

      if (isLoading) return isSplash ? null : '/splash';
      if (user == null && !isAuth) return '/login';
      if (user != null && (isAuth || isSplash)) {
        return switch (user.role) {
          'seller' => '/seller',
          'admin'  => '/admin',
          _        => '/buyer',
        };
      }
      return null;
    },
    routes: [
      GoRoute(path: '/splash',   builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login',    builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterRoleScreen()),
      GoRoute(path: '/register/buyer',  builder: (_, __) => const BuyerRegisterScreen()),
      GoRoute(path: '/register/seller', builder: (_, __) => const SellerRegisterScreen()),

      // ── Buyer shell ────────────────────────────────────────────────────────
      ShellRoute(
        builder: (context, state, child) =>
            AppShell(role: 'buyer', child: child),
        routes: [
          GoRoute(
            path: '/buyer',
            builder: (_, __) => const BuyerHomeScreen(),
          ),
          GoRoute(
            path: '/buyer/farm/:id',
            builder: (_, state) =>
                FarmDetailScreen(sellerId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: '/buyer/orders',
            builder: (_, __) => const OrdersScreen(),
          ),
          GoRoute(
            path: '/buyer/favorites',
            builder: (_, __) => const FavoritesScreen(),
          ),
          GoRoute(
            path: '/buyer/profile',
            builder: (_, __) => const BuyerProfileScreen(),
          ),
          GoRoute(
            path: '/buyer/notifications',
            builder: (_, __) => const NotificationsScreen(),
          ),
          GoRoute(
            path: '/buyer/listing/:id',
            builder: (_, state) =>
                ListingDetailScreen(listingId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: '/buyer/supply/:id',
            builder: (_, state) =>
                SupplyDetailScreen(supplyId: state.pathParameters['id']!),
          ),
        ],
      ),

      // ── Seller shell ───────────────────────────────────────────────────────
      ShellRoute(
        builder: (context, state, child) =>
            AppShell(role: 'seller', child: child),
        routes: [
          GoRoute(
            path: '/seller',
            builder: (_, __) => const SellerDashboardScreen(),
          ),
          GoRoute(
            path: '/seller/herd',
            builder: (_, __) => const HerdScreen(),
          ),
          GoRoute(
            path: '/seller/listings',
            builder: (_, __) => const SellerListingsScreen(),
          ),
          GoRoute(
            path: '/seller/statements',
            builder: (_, __) => const StatementsScreen(),
          ),
          GoRoute(
            path: '/seller/herd/add',
            builder: (_, __) => const AddAnimalScreen(),
          ),
          GoRoute(
            path: '/seller/herd/:id',
            builder: (_, state) =>
                AnimalDetailScreen(animalId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: '/seller/herd/:id/edit',
            builder: (_, state) =>
                EditAnimalScreen(animalId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: '/seller/listings/add',
            builder: (_, __) => const AddListingScreen(),
          ),
          GoRoute(
            path: '/seller/listings/:id/edit',
            builder: (_, state) => EditListingScreen(
                listing: state.extra as ListingModel),
          ),
          GoRoute(
            path: '/seller/breed-settings',
            builder: (_, __) => const BreedSettingsScreen(),
          ),
          GoRoute(
            path: '/seller/dairy',
            builder: (_, __) => const SellerDairyScreen(),
          ),
          GoRoute(
            path: '/seller/supplies',
            builder: (_, __) => const SellerSuppliesScreen(),
          ),
          GoRoute(
            path: '/seller/profile',
            builder: (_, __) => const SellerProfileScreen(),
          ),
          GoRoute(
            path: '/seller/notifications',
            builder: (_, __) => const NotificationsScreen(),
          ),
          GoRoute(
            path: '/seller/vet-records',
            builder: (_, __) => const VetRecordsScreen(),
          ),
        ],
      ),

      // ── Admin shell ────────────────────────────────────────────────────────
      ShellRoute(
        builder: (context, state, child) =>
            AppShell(role: 'admin', child: child),
        routes: [
          GoRoute(
            path: '/admin',
            builder: (_, __) => const AdminDashboardScreen(),
          ),
          GoRoute(
            path: '/admin/listings',
            builder: (_, __) => const AdminListingsScreen(),
          ),
          GoRoute(
            path: '/admin/orders',
            builder: (_, __) => const AdminOrdersScreen(),
          ),
          GoRoute(
            path: '/admin/dairy',
            builder: (_, __) => const AdminDairyScreen(),
          ),
          GoRoute(
            path: '/admin/users',
            builder: (_, __) => const AdminUsersScreen(),
          ),
          GoRoute(
            path: '/admin/reviews',
            builder: (_, __) => const AdminReviewsScreen(),
          ),
          GoRoute(
            path: '/admin/eid',
            builder: (_, __) => const AdminEidScreen(),
          ),
          GoRoute(
            path: '/admin/supplies',
            builder: (_, __) => const AdminSuppliesScreen(),
          ),
        ],
      ),
    ],
    errorBuilder: (_, state) => Scaffold(
      body: Center(child: Text('صفحة غير موجودة: ${state.error}')),
    ),
  );
});
