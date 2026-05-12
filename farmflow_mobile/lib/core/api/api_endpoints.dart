/// All backend route strings in one place.
/// Base URL is injected by ApiClient from the environment.
abstract class ApiEndpoints {
  // ── Auth ────────────────────────────────────────────────────────────────────
  static const String login         = '/auth/login';
  static const String register      = '/auth/register';
  static const String me            = '/auth/me';
  static const String profile       = '/auth/profile';
  static const String password      = '/auth/password';
  static const String verifyId      = '/auth/verify-id';
  static const String fcmToken      = '/auth/fcm-token';

  // ── Sellers (public) ────────────────────────────────────────────────────────
  static const String sellers       = '/sellers';
  static String sellerById(String id) => '/sellers/$id';

  // ── Listings ────────────────────────────────────────────────────────────────
  static const String listings      = '/listings';
  static const String myListings    = '/listings/my';
  static String listingById(String id) => '/listings/$id';
  static String listingStatus(String id) => '/listings/$id/status';

  // ── Orders ──────────────────────────────────────────────────────────────────
  static const String orders        = '/orders';
  static const String myOrders      = '/orders/my';
  static String orderById(String id) => '/orders/$id';
  static String orderStatus(String id) => '/orders/$id/status';

  // ── Animals ─────────────────────────────────────────────────────────────────
  static const String animals       = '/animals';
  static const String animalSummary = '/animals/summary';
  static const String weighingDue   = '/animals/weighing-due';
  static const String followUpsDue  = '/animals/follow-ups-due';
  static String animalById(String id) => '/animals/$id';
  static String animalWeight(String id) => '/animals/$id/weight';
  static String animalWeightEntry(String id, String eid) => '/animals/$id/weight/$eid';
  static String animalVaccination(String id) => '/animals/$id/vaccination';
  static String animalVaccinationEntry(String id, String eid) => '/animals/$id/vaccination/$eid';
  static String animalMedical(String id) => '/animals/$id/medical';
  static String animalMedicalRecord(String id, String rid) => '/animals/$id/medical/$rid';

  // ── Finance ─────────────────────────────────────────────────────────────────
  static const String financeSummary = '/finance/summary';
  static const String expenses       = '/finance/expenses';
  static const String income         = '/finance/income';
  static String expenseById(String id) => '/finance/expenses/$id';
  static String incomeById(String id)  => '/finance/income/$id';
  static const String budget         = '/budget';

  // ── Statements ──────────────────────────────────────────────────────────────
  static const String statements     = '/statements';
  static const String transactions   = '/statements/transactions';

  // ── Notifications ────────────────────────────────────────────────────────────
  static const String notifications  = '/notifications';
  static const String unreadCount    = '/notifications/unread-count';
  static const String markAllRead    = '/notifications/read-all';
  static String markRead(String id)  => '/notifications/$id/read';

  // ── Reviews ──────────────────────────────────────────────────────────────────
  static const String reviews              = '/reviews';
  static String reviewsBySeller(String id) => '/reviews/seller/$id';

  // ── Favorites ────────────────────────────────────────────────────────────────
  static const String favorites            = '/favorites';
  static String favoriteById(String id)    => '/favorites/$id';

  // ── Dairy ────────────────────────────────────────────────────────────────────
  static const String dairy              = '/dairy';
  static const String myDairy            = '/dairy/my';
  static String dairyById(String id)     => '/dairy/$id';
  static String dairyStatus(String id)   => '/dairy/$id/status';

  // ── Supplies ─────────────────────────────────────────────────────────────────
  static const String supplies           = '/supplies';
  static String supplyById(String id)    => '/supplies/$id';
  static String supplyStatus(String id)  => '/supplies/$id/status';

  // ── Market prices ────────────────────────────────────────────────────────────
  static const String marketPrices       = '/market-prices';

  // ── Eid ──────────────────────────────────────────────────────────────────────
  static const String eidConfig          = '/eid/config';
  static const String eidListings        = '/eid/listings';

  // ── Admin ────────────────────────────────────────────────────────────────────
  static const String adminStats         = '/admin/stats';
  static const String adminUsers         = '/admin/users';
  static String adminUserById(String id) => '/admin/users/$id';

  // ── Admin — dairy ─────────────────────────────────────────────────────────
  static const String adminDairyAll           = '/dairy/admin/all';
  static String adminApproveDairy(String id)  => '/dairy/$id/approve';

  // ── Vet records (cross-herd) ─────────────────────────────────────────────
  static const String vetMedical      = '/animals/vet/medical';
  static const String vetVaccinations = '/animals/vet/vaccinations';

  // ── Admin — reviews ──────────────────────────────────────────────────────
  static const String adminAllReviews         = '/reviews/admin/all';
  static String reviewById(String id)         => '/reviews/$id';

  // ── Orders — delivery ────────────────────────────────────────────────────
  static String orderDelivery(String id)      => '/orders/$id/delivery';

  // ── Auth — forgot / reset / verify ───────────────────────────────────────
  static const String forgotPassword          = '/auth/forgot-password';
  static const String resetPassword           = '/auth/reset-password';
  static const String verifyEmail             = '/auth/verify-email';
  static const String notifPrefs              = '/auth/notif-prefs';

  // ── Finance — analytics ──────────────────────────────────────────────────
  static const String financeAnalytics        = '/finance/analytics';

  // ── Listings — drafts ────────────────────────────────────────────────────
  static const String myDraftListings         = '/listings/my?status=draft';
  static String publishListing(String id)     => '/listings/$id/publish';

  // ── Messages ─────────────────────────────────────────────────────────────
  static const String conversations           = '/messages/conversations';
  static String conversationMessages(String id) => '/messages/conversations/$id';
  static const String sendMessageUrl          = '/messages/send';
  static String getOrCreateConversation(String userId) => '/messages/get-or-create/$userId';

  // ── Farms ────────────────────────────────────────────────────────────────
  static const String farms                   = '/farms';
  static String farmById(String id)           => '/farms/$id';

  // ── Admin — analytics ────────────────────────────────────────────────────
  static const String adminAnalytics          = '/admin/analytics';

  // ── Marketplace (supplies from other sellers) ─────────────────────────────
  static const String marketplaceSupplies     = '/supplies/marketplace';
  static String marketplaceFarmSupplies(String sellerId) => '/supplies/marketplace/$sellerId';
}
