import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  { to: '/seller',             label: 'Dashboard',     end: true },
  { to: '/seller/listings',    label: 'My Livestock' },
  { to: '/seller/add-listing', label: 'Add Livestock' },
  { to: '/seller/expenses',    label: 'Expenses' },
  { to: '/seller/income',      label: 'Income' },
];

const SellerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: '200px', borderRight: '1px solid #ccc', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <strong>FarmFlow</strong>
        <small>{user?.name}</small>
        <hr />
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal' })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <hr />
        <button type="button" onClick={handleLogout}>Logout</button>
      </aside>

      {/* ── Page content ── */}
      <main style={{ flex: 1, padding: '24px' }}>
        <Outlet />
      </main>

    </div>
  );
};

export default SellerLayout;
