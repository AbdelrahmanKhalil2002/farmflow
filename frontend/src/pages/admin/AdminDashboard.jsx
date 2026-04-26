import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../../services/adminService';

const StatCard = ({ label, value, to }) => (
  <div style={{ border: '1px solid #ccc', padding: '16px', minWidth: '160px' }}>
    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>{label}</p>
    <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 'bold' }}>{value}</p>
    {to && <Link to={to} style={{ fontSize: '13px' }}>View →</Link>}
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    getStats()
      .then(({ data }) => setStats(data))
      .catch(() => setError('Failed to load stats.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error)   return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <StatCard label="Total Users"       value={stats.totalUsers}       to="/admin/users" />
        <StatCard label="Pending Listings"  value={stats.pendingListings}  to="/admin/listings" />
        <StatCard label="Active Listings"   value={stats.activeListings}   to="/admin/listings" />
        <StatCard label="Total Orders"      value={stats.totalOrders}      to="/admin/orders" />
      </div>
    </div>
  );
};

export default AdminDashboard;
