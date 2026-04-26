import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Guards
import ProtectedRoute from './components/ProtectedRoute';
import RoleRouter     from './components/RoleRouter';

// Layouts
import SellerLayout from './layouts/SellerLayout';
import BuyerLayout  from './layouts/BuyerLayout';
import AdminLayout  from './layouts/AdminLayout';

// Public pages
import Login    from './pages/Login';
import Register from './pages/Register';

// Seller pages
import SellerDashboard  from './pages/seller/SellerDashboard';
import SellerListings   from './pages/seller/SellerListings';
import SellerAddListing from './pages/seller/SellerAddListing';
import SellerExpenses   from './pages/seller/SellerExpenses';
import SellerIncome     from './pages/seller/SellerIncome';

// Buyer pages
import BuyerBrowse        from './pages/buyer/BuyerBrowse';
import BuyerListingDetail from './pages/buyer/BuyerListingDetail';
import BuyerOrders        from './pages/buyer/BuyerOrders';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers     from './pages/admin/AdminUsers';
import AdminListings  from './pages/admin/AdminListings';
import AdminOrders    from './pages/admin/AdminOrders';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>

        {/* ── Public ─────────────────────────────────────────────────────── */}
        <Route path="/"         element={<Navigate to="/login" replace />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

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
          <Route path="expenses"     element={<SellerExpenses />} />
          <Route path="income"       element={<SellerIncome />} />
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
          <Route path="orders"          element={<BuyerOrders />} />
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
          <Route index           element={<AdminDashboard />} />
          <Route path="users"    element={<AdminUsers />} />
          <Route path="listings" element={<AdminListings />} />
          <Route path="orders"   element={<AdminOrders />} />
        </Route>

        {/* ── Catch-all ───────────────────────────────────────────────────*/}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
