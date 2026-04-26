import { useEffect, useState } from 'react';
import { getAllListings, approveListing, rejectListing } from '../../services/adminService';
import { fmt } from '../../utils/format';

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected', 'sold'];

const STATUS_COLOR = {
  pending:  '#888',
  approved: '#2e7d32',
  rejected: '#c62828',
  sold:     '#1a73e8',
};

const AdminListings = () => {
  const [listings, setListings]   = useState([]);
  const [filter, setFilter]       = useState('pending'); // start on pending — most actionable
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [acting, setActing]       = useState(null); // id of listing being actioned

  useEffect(() => {
    getAllListings()
      .then(({ data }) => setListings(data))
      .catch(() => setError('Failed to load listings.'))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, action) => {
    setActing(id);
    try {
      const { data } = await action(id);
      setListings((prev) => prev.map((l) => (l._id === id ? data : l)));
    } catch {
      alert('Action failed.');
    } finally {
      setActing(null);
    }
  };

  const visible = filter === 'all' ? listings : listings.filter((l) => l.status === filter);

  const counts = STATUS_FILTERS.reduce((acc, s) => {
    acc[s] = s === 'all' ? listings.length : listings.filter((l) => l.status === s).length;
    return acc;
  }, {});

  if (loading) return <p>Loading...</p>;
  if (error)   return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Listings ({listings.length})</h2>

      {/* ── Filter tabs ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            style={{
              fontWeight:  filter === s ? 'bold' : 'normal',
              textDecoration: filter === s ? 'underline' : 'none',
              background: 'none', border: 'none', cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p>No {filter === 'all' ? '' : filter} listings.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px 8px 0' }}>Type</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Breed</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Seller</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Price</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Status</th>
              <th style={{ padding: '8px 0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((l) => (
              <tr key={l._id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px 12px 10px 0', textTransform: 'capitalize' }}>{l.type}</td>
                <td style={{ padding: '10px 12px 10px 0' }}>{l.breed || '—'}</td>
                <td style={{ padding: '10px 12px 10px 0' }}>{l.seller?.name ?? '—'}</td>
                <td style={{ padding: '10px 12px 10px 0' }}>{fmt(l.price)}</td>
                <td style={{ padding: '10px 12px 10px 0', color: STATUS_COLOR[l.status], textTransform: 'capitalize' }}>
                  {l.status}
                </td>
                <td style={{ padding: '10px 0' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {l.status !== 'approved' && l.status !== 'sold' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(l._id, approveListing)}
                        disabled={acting === l._id}
                        style={{ color: 'green' }}
                      >
                        {acting === l._id ? '...' : 'Approve'}
                      </button>
                    )}
                    {l.status !== 'rejected' && l.status !== 'sold' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(l._id, rejectListing)}
                        disabled={acting === l._id}
                        style={{ color: 'red' }}
                      >
                        {acting === l._id ? '...' : 'Reject'}
                      </button>
                    )}
                    {l.status === 'sold' && (
                      <span style={{ color: '#aaa', fontSize: '13px' }}>—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminListings;
