import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAvailableListings } from '../../services/listingService';
import { fmt, getImageUrl } from '../../utils/format';

const BuyerBrowse = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    getAvailableListings()
      .then(({ data }) => setListings(data))
      .catch(() => setError('Failed to load listings.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error)   return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Browse Livestock</h2>

      {listings.length === 0 ? (
        <p>No livestock available right now. Check back soon.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {listings.map((l) => (
            <div key={l._id} style={{ border: '1px solid #ccc', padding: '16px' }}>
              {l.images?.[0] && (
                <img
                  src={getImageUrl(l.images[0])}
                  alt={l.type}
                  style={{ width: '100%', height: '140px', objectFit: 'cover', marginBottom: '8px' }}
                />
              )}
              <p style={{ margin: '0 0 4px', fontWeight: 'bold', textTransform: 'capitalize' }}>
                {l.type}{l.breed ? ` — ${l.breed}` : ''}
              </p>
              <p style={{ margin: '0 0 4px', fontSize: '13px' }}>
                Age: {l.age} mo &nbsp;|&nbsp; Weight: {l.weight} kg
              </p>
              {l.location && (
                <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#555' }}>{l.location}</p>
              )}
              <p style={{ margin: '8px 0', fontSize: '18px', fontWeight: 'bold' }}>{fmt(l.price)}</p>
              <Link to={`/buyer/listings/${l._id}`}>View Details →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuyerBrowse;
