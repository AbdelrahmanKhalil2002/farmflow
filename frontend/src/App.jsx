import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { CartProvider } from './context/CartContext';

// Guards
import ProtectedRoute from './components/ProtectedRoute';
import RoleRouter     from './components/RoleRouter';

// Layouts
import SellerLayout from './layouts/SellerLayout';
import BuyerLayout  from './layouts/BuyerLayout';
import AdminLayout  from './layouts/AdminLayout';

// Public pages
import Login      from './pages/Login';
import Register   from './pages/Register';
import AdminLogin from './pages/AdminLogin';

// Seller pages
import SellerDashboard  from './pages/seller/SellerDashboard';
import SellerListings   from './pages/seller/SellerListings';
import SellerAddListing from './pages/seller/SellerAddListing';
import SellerExpenses    from './pages/seller/SellerExpenses';
import SellerIncome      from './pages/seller/SellerIncome';
import SellerEditListing from './pages/seller/SellerEditListing';
import SellerDairy       from './pages/seller/SellerDairy';
import SellerAddDairy    from './pages/seller/SellerAddDairy';
import SellerEditDairy    from './pages/seller/SellerEditDairy';
import SellerStatements   from './pages/seller/SellerStatements';
import SellerHerd         from './pages/seller/SellerHerd';
import SellerAddAnimal    from './pages/seller/SellerAddAnimal';
import SellerAnimalDetail from './pages/seller/SellerAnimalDetail';
import SellerSupplies     from './pages/seller/SellerSupplies';
import SellerAddSupply    from './pages/seller/SellerAddSupply';
import SellerEditSupply   from './pages/seller/SellerEditSupply';
import SellerBudget       from './pages/seller/SellerBudget';

// Buyer pages
import BuyerBrowse        from './pages/buyer/BuyerBrowse';
import BuyerListingDetail from './pages/buyer/BuyerListingDetail';
import BuyerOrders        from './pages/buyer/BuyerOrders';
import BuyerFarmDetail    from './pages/buyer/BuyerFarmDetail';
import BuyerFavorites     from './pages/buyer/BuyerFavorites';
import BuyerSupplyDetail  from './pages/buyer/BuyerSupplyDetail';
import BuyerCart          from './pages/buyer/BuyerCart';

// Shared pages
import Settings from './pages/Settings';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers     from './pages/admin/AdminUsers';
import AdminListings  from './pages/admin/AdminListings';
import AdminOrders    from './pages/admin/AdminOrders';
import AdminDairy     from './pages/admin/AdminDairy';
import AdminSupplies  from './pages/admin/AdminSupplies';
import AdminReviews   from './pages/admin/AdminReviews';

const App = () => (
  <BrowserRouter>
    <ToastProvider>
    <CartProvider>
    <AuthProvider>
      <Routes>

        {/* ── Public ─────────────────────────────────────────────────────── */}
        <Route path="/"         element={<Navigate to="/login" replace />} />
        <Route path="/login"        element={<Login />} />
        <Route path="/register"     element={<Register />} />
        <Route path="/admin-login"  element={<AdminLogin />} />

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
          <Route index               element={<SellerDashboard />} />
          <Route path="listings"     element={<SellerListings />} />
          <Route path="add-listing"  element={<SellerAddListing />} />
          <Route path="expenses"          element={<SellerExpenses />} />
          <Route path="income"            element={<SellerIncome />} />
          <Route path="edit-listing/:id"  element={<SellerEditListing />} />
          <Route path="dairy"             element={<SellerDairy />} />
          <Route path="add-dairy"         element={<SellerAddDairy />} />
          <Route path="edit-dairy/:id"    element={<SellerEditDairy />} />
          <Route path="statements"        element={<SellerStatements />} />
          <Route path="herd"              element={<SellerHerd />} />
          <Route path="herd/add"          element={<SellerAddAnimal />} />
          <Route path="herd/:id"          element={<SellerAnimalDetail />} />
          <Route path="supplies"          element={<SellerSupplies />} />
          <Route path="supplies/add"      element={<SellerAddSupply />} />
          <Route path="supplies/edit/:id" element={<SellerEditSupply />} />
          <Route path="budget"            element={<SellerBudget />} />
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
          <Route index              element={<AdminDashboard />} />
          <Route path="users"       element={<AdminUsers />} />
          <Route path="listings"    element={<AdminListings />} />
          <Route path="dairy"       element={<AdminDairy />} />
          <Route path="orders"      element={<AdminOrders />} />
          <Route path="supplies"    element={<AdminSupplies />} />
          <Route path="reviews"     element={<AdminReviews />} />
        </Route>

        {/* ── Catch-all ───────────────────────────────────────────────────*/}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </AuthProvider>
    </CartProvider>
    </ToastProvider>
  </BrowserRouter>
);

export default App;
