import { useEffect, useState } from 'react';
import { getMyOrders } from '../../services/orderService';
import { fmt } from '../../utils/format';

const STATUS_META = {
  pending:   { label: 'Pending',   color: '#888' },
  confirmed: { label: 'Confirmed', color: '#1a73e8' },
  completed: { label: 'Completed', color: '#2e7d32' },
  cancelled: { label: 'Cancelled', color: '#c62828' },
};

const BuyerOrders = () => {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    getMyOrders()
      .then(({ data }) => setOrders(data))
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error)   return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>My Orders</h2>

      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px 8px 0' }}>Livestock</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Payment</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Deposit</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Total</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Seller</th>
              <th style={{ padding: '8px 0' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const meta = STATUS_META[o.status] ?? { label: o.status, color: '#333' };
              const listing = o.listing;
              return (
                <tr key={o._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 12px 10px 0', textTransform: 'capitalize' }}>
                    {listing?.type ?? '—'}
                    {listing?.breed ? ` (${listing.breed})` : ''}
                  </td>
                  <td style={{ padding: '10px 12px 10px 0' }}>
                    {o.paymentType === 'cod' ? 'Cash on Delivery' : 'Deposit'}
                  </td>
                  <td style={{ padding: '10px 12px 10px 0' }}>
                    {o.paymentType === 'deposit' ? fmt(o.depositAmount) : '—'}
                  </td>
                  <td style={{ padding: '10px 12px 10px 0' }}>{fmt(o.totalAmount)}</td>
                  <td style={{ padding: '10px 12px 10px 0' }}>{o.seller?.name ?? '—'}</td>
                  <td style={{ padding: '10px 0', color: meta.color, fontWeight: 'bold' }}>
                    {meta.label}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default BuyerOrders;
