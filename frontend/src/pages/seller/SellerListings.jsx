import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyListings, deleteListing } from '../../services/listingService';

const STATUS_LABELS = {
  pending:  'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  sold:     'Sold',
};

const SellerListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const load = () => {
    setLoading(true);
    getMyListings()
      .then(({ data }) => setListings(data))
      .catch(() => setError('Failed to load listings.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      await deleteListing(id);
      setListings((prev) => prev.filter((l) => l._id !== id));
    } catch {
      alert('Failed to delete listing.');
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error)   return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>My Livestock</h2>
        <Link to="/seller/add-listing">+ Add Livestock</Link>
      </div>

      {listings.length === 0 ? (
        <p>No listings yet. <Link to="/seller/add-listing">Add your first one.</Link></p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px 8px 0' }}>Type</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Breed</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Age (mo)</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Weight (kg)</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Price</th>
              <th style={{ padding: '8px 12px 8px 0' }}>Status</th>
              <th style={{ padding: '8px 0' }}></th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l._id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px 12px 10px 0', textTransform: 'capitalize' }}>{l.type}</td>
                <td style={{ padding: '10px 12px 10px 0' }}>{l.breed || '—'}</td>
                <td style={{ padding: '10px 12px 10px 0' }}>{l.age}</td>
                <td style={{ padding: '10px 12px 10px 0' }}>{l.weight}</td>
                <td style={{ padding: '10px 12px 10px 0' }}>{l.price.toLocaleString()}</td>
                <td style={{ padding: '10px 12px 10px 0' }}>{STATUS_LABELS[l.status] ?? l.status}</td>
                <td style={{ padding: '10px 0' }}>
                  <button
                    type="button"
                    onClick={() => handleDelete(l._id)}
                    style={{ color: 'red' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SellerListings;
