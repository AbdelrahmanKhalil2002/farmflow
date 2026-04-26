import { useEffect, useState } from 'react';
import { getSummary } from '../../services/financeService';
import { getMyListings } from '../../services/listingService';
import { fmt } from '../../utils/format';

const StatCard = ({ label, value }) => (
  <div style={{ border: '1px solid #ccc', padding: '16px', minWidth: '160px' }}>
    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>{label}</p>
    <p style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 'bold' }}>{value}</p>
  </div>
);

const SellerDashboard = () => {
  const [stats, setStats]     = useState(null);
  const [count, setCount]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    Promise.all([getSummary(), getMyListings()])
      .then(([summaryRes, listingsRes]) => {
        setStats(summaryRes.data);
        setCount(listingsRes.data.length);
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error)   return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Dashboard</h2>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <StatCard label="Total Livestock"  value={count ?? 0} />
        <StatCard label="Total Income"     value={fmt(stats?.totalIncome)} />
        <StatCard label="Total Expenses"   value={fmt(stats?.totalExpenses)} />
        <StatCard label="Net Profit"       value={fmt(stats?.netProfit)} />
      </div>
    </div>
  );
};

export default SellerDashboard;
