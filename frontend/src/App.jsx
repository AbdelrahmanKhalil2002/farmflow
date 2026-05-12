import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }      from './context/AuthContext';
import { FarmProvider }      from './context/FarmContext';
import { MsgUnreadProvider } from './context/MsgUnreadContext';
import { ToastProvider }     from './components/Toast';
import { CartProvider }      from './context/CartContext';
import { ThemeProvider }     from './context/ThemeContext';
import { LangProvider }      from './context/LangContext';

// Guards & layouts load eagerly (tiny, needed immediately)
import ProtectedRoute  from './components/ProtectedRoute';
import RoleRouter      from './components/RoleRouter';
import SellerLayout    from './layouts/SellerLayout';
import BuyerLayout     from './layouts/BuyerLayout';
import AdminLayout     from './layouts/AdminLayout';
import DeepLinkHandler from './components/DeepLinkHandler';
import CommandPalette  from './components/CommandPalette';
import OfflineBanner   from './components/OfflineBanner';

// ── Lazy-loaded pages (each becomes its own chunk) ────────────────────────────

// Public
const Login            = lazy(() => import('./pages/Login'));
const Register         = lazy(() => import('./pages/Register'));
const AdminLogin       = lazy(() => import('./pages/AdminLogin'));
const ForgotPassword   = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword    = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail      = lazy(() => import('./pages/VerifyEmail'));
const TermsOfService   = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy    = lazy(() => import('./pages/PrivacyPolicy'));

// Shared
const Settings = lazy(() => import('./pages/Settings'));

// Seller
const SellerDashboard   = lazy(() => import('./pages/seller/SellerDashboard'));
const SellerListings    = lazy(() => import('./pages/seller/SellerListings'));
const SellerDrafts      = lazy(() => import('./pages/seller/SellerDrafts'));
const SellerAddListing  = lazy(() => import('./pages/seller/SellerAddListing'));
const SellerEditListing = lazy(() => import('./pages/seller/SellerEditListing'));
const SellerFinance     = lazy(() => import('./pages/seller/SellerFinance'));
const SellerExpenses    = lazy(() => import('./pages/seller/SellerExpenses'));
const SellerIncome      = lazy(() => import('./pages/seller/SellerIncome'));
const SellerDairy       = lazy(() => import('./pages/seller/SellerDairy'));
const SellerAddDairy    = lazy(() => import('./pages/seller/SellerAddDairy'));
const SellerEditDairy   = lazy(() => import('./pages/seller/SellerEditDairy'));
const SellerStatements  = lazy(() => import('./pages/seller/SellerStatements'));
const SellerHerd        = lazy(() => import('./pages/seller/SellerHerd'));
const SellerAddAnimal   = lazy(() => import('./pages/seller/SellerAddAnimal'));
const SellerAnimalDetail= lazy(() => import('./pages/seller/SellerAnimalDetail'));
const SellerSupplies    = lazy(() => import('./pages/seller/SellerSupplies'));
const SellerMarketplace    = lazy(() => import('./pages/seller/SellerMarketplace'));
const SellerFarmSupplies   = lazy(() => import('./pages/seller/SellerFarmSupplies'));
const SellerAddSupply   = lazy(() => import('./pages/seller/SellerAddSupply'));
const SellerEditSupply  = lazy(() => import('./pages/seller/SellerEditSupply'));
const SellerBudget      = lazy(() => import('./pages/seller/SellerBudget'));
const SellerOrders      = lazy(() => import('./pages/seller/SellerOrders'));
const SellerAnalytics   = lazy(() => import('./pages/seller/SellerAnalytics'));
const SellerMessages    = lazy(() => import('./pages/seller/SellerMessages'));
const SellerFarms       = lazy(() => import('./pages/seller/SellerFarms'));

// Buyer
const BuyerBrowse        = lazy(() => import('./pages/buyer/BuyerBrowse'));
const BuyerListingDetail = lazy(() => import('./pages/buyer/BuyerListingDetail'));
const BuyerFarmDetail    = lazy(() => import('./pages/buyer/BuyerFarmDetail'));
const BuyerSupplyDetail  = lazy(() => import('./pages/buyer/BuyerSupplyDetail'));
const BuyerOrders        = lazy(() => import('./pages/buyer/BuyerOrders'));
const BuyerFavorites     = lazy(() => import('./pages/buyer/BuyerFavorites'));
const BuyerCart          = lazy(() => import('./pages/buyer/BuyerCart'));
const BuyerMessages      = lazy(() => import('./pages/buyer/BuyerMessages'));

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers     = lazy(() => import('./pages/admin/AdminUsers'));
const AdminListings  = lazy(() => import('./pages/admin/AdminListings'));
const AdminOrders    = lazy(() => import('./pages/admin/AdminOrders'));
const AdminDairy     = lazy(() => import('./pages/admin/AdminDairy'));
const AdminSupplies  = lazy(() => import('./pages/admin/AdminSupplies'));
const AdminReviews   = lazy(() => import('./pages/admin/AdminReviews'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));

// ── Page loading fallback ─────────────────────────────────────────────────────
const PageLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: 'var(--bg-page, #F8F4EE)',
  }}>
    <div style={{
      width: '32px', height: '32px', borderRadius: '50%',
      border: '3px solid var(--primary-light, #BBF7D0)',
      borderTopColor: 'var(--primary, #3A7D44)',
      animation: 'ff-spin 0.7s linear infinite',
    }} />
    <style>{`@keyframes ff-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ── App ───────────────────────────────────────────────────────────────────────
const App = () => (
  <ThemeProvider>
  <LangProvider>
  <BrowserRouter>
    <ToastProvider>
    <CartProvider>
    <AuthProvider>
    <FarmProvider>
    <MsgUnreadProvider>
      <DeepLinkHandler />
      <CommandPalette />
      <OfflineBanner />
      <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* ── Public ─────────────────────────────────────────────────────── */}
        <Route path="/"                  element={<Navigate to="/login" replace />} />
        <Route path="/login"             element={<Login />} />
        <Route path="/register"          element={<Register />} />
        <Route path="/admin-login"       element={<AdminLogin />} />
        <Route path="/forgot-password"   element={<ForgotPassword />} />
        <Route path="/reset-password"    element={<ResetPassword />} />
        <Route path="/verify-email"      element={<VerifyEmail />} />
        <Route path="/terms"             element={<TermsOfService />} />
        <Route path="/privacy"           element={<PrivacyPolicy />} />

        {/* ── Role entry point ─────────────────────────────────────────── */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleRouter />
            </ProtectedRoute>
          }
        />

        {/* ── Seller ──────────────────────────────────────────────────────*/}
        <Route
          path="/seller"
          element={
            <ProtectedRoute roles={['seller']}>
              <SellerLayout />
            </ProtectedRoute>
          }
        >
          <Route index                    element={<SellerDashboard />} />
          <Route path="listings"          element={<SellerListings />} />
          <Route path="listings/:id"      element={<BuyerListingDetail />} />
          <Route path="drafts"            element={<SellerDrafts />} />
          <Route path="add-listing"       element={<SellerAddListing />} />
          <Route path="edit-listing/:id"  element={<SellerEditListing />} />
          <Route path="finance"           element={<SellerFinance />} />
          <Route path="expenses"          element={<SellerExpenses />} />
          <Route path="income"            element={<SellerIncome />} />
          <Route path="dairy"             element={<SellerDairy />} />
          <Route path="add-dairy"         element={<SellerAddDairy />} />
          <Route path="edit-dairy/:id"    element={<SellerEditDairy />} />
          <Route path="statements"        element={<SellerStatements />} />
          <Route path="herd"              element={<SellerHerd />} />
          <Route path="herd/add"          element={<SellerAddAnimal />} />
          <Route path="herd/:id"          element={<SellerAnimalDetail />} />
          <Route path="supplies"             element={<SellerSupplies />} />
          <Route path="supplies/add"         element={<SellerAddSupply />} />
          <Route path="supplies/edit/:id"    element={<SellerEditSupply />} />
          <Route path="marketplace"                    element={<SellerMarketplace />} />
          <Route path="marketplace/farm/:sellerId"   element={<SellerFarmSupplies />} />
          <Route path="marketplace/:id"              element={<BuyerSupplyDetail />} />
          <Route path="budget"            element={<SellerBudget />} />
          <Route path="orders"            element={<SellerOrders />} />
          <Route path="analytics"         element={<SellerAnalytics />} />
          <Route path="messages"          element={<SellerMessages />} />
          <Route path="farms"             element={<SellerFarms />} />
          <Route path="settings"          element={<Settings />} />
        </Route>

        {/* ── Buyer ───────────────────────────────────────────────────────*/}
        <Route
          path="/buyer"
          element={
            <ProtectedRoute roles={['buyer']}>
              <BuyerLayout />
            </ProtectedRoute>
          }
        >
          <Route index                  element={<BuyerBrowse />} />
          <Route path="listings/:id"    element={<BuyerListingDetail />} />
          <Route path="farms/:id"       element={<BuyerFarmDetail />} />
          <Route path="supplies/:id"    element={<BuyerSupplyDetail />} />
          <Route path="orders"          element={<BuyerOrders />} />
          <Route path="favorites"       element={<BuyerFavorites />} />
          <Route path="cart"            element={<BuyerCart />} />
          <Route path="messages"        element={<BuyerMessages />} />
          <Route path="settings"        element={<Settings />} />
        </Route>

        {/* ── Admin ───────────────────────────────────────────────────────*/}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index             element={<AdminDashboard />} />
          <Route path="users"      element={<AdminUsers />} />
          <Route path="listings"   element={<AdminListings />} />
          <Route path="dairy"      element={<AdminDairy />} />
          <Route path="orders"     element={<AdminOrders />} />
          <Route path="supplies"   element={<AdminSupplies />} />
          <Route path="reviews"    element={<AdminReviews />} />
          <Route path="analytics"  element={<AdminAnalytics />} />
        </Route>

        {/* ── Catch-all ───────────────────────────────────────────────────*/}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
      </Suspense>
    </MsgUnreadProvider>
    </FarmProvider>
    </AuthProvider>
    </CartProvider>
    </ToastProvider>
  </BrowserRouter>
  </LangProvider>
  </ThemeProvider>
);

export default App;
