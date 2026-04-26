import { useEffect, useState } from 'react';
import { getAllOrders } from '../../services/adminService';
import { fmt } from '../../utils/format';

const STATUS_COLOR = {
  pending:   '#888',
  confirmed: '#1a73e8',
  completed: '#2e7d32',
  cancelled: '#c62828',
};

const AdminOrders = () => {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    getAllOrders()
      .then(({ data }) => setOrders(data))
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error)   return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Orders ({orders.length})</h2>

      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px 8px 0' }}>Listing</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Buyer</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Seller</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Payment</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Total</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Status</th>
              <th style={{ padding: '8px 0' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px 12px 10px 0', textTransform: 'capitalize' }}>
                  {o.listing?.type ?? '—'}{o.listing?.breed ? ` · ${o.listing.breed}` : ''}
                </td>
                <td style={{ padding: '10px 12px 10px 0' }}>{o.buyer?.name ?? '—'}</td>
                <td style={{ padding: '10px 12px 10px 0' }}>{o.seller?.name ?? '—'}</td>
                <td style={{ padding: '10px 12px 10px 0', textTransform: 'capitalize' }}>
                  {o.paymentType}
                </td>
                <td style={{ padding: '10px 12px 10px 0' }}>{fmt(o.totalAmount)}</td>
                <td style={{ padding: '10px 12px 10px 0', color: STATUS_COLOR[o.status], textTransform: 'capitalize' }}>
                  {o.status}
                </td>
                <td style={{ padding: '10px 0' }}>
                  {new Date(o.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminOrders;
