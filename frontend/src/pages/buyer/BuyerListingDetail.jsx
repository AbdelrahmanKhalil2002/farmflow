import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getListingById } from '../../services/listingService';
import { createOrder } from '../../services/orderService';
import { fmt, getImageUrl } from '../../utils/format';

const parseError = (err) => {
  const data = err.response?.data;
  if (!data) return 'Network error. Try again.';
  if (data.errors?.length) return data.errors[0].msg;
  return data.message || 'Something went wrong.';
};

const EMPTY_ORDER = { paymentType: 'cod', depositAmount: '', notes: '' };

const BuyerListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [listing, setListing]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [order, setOrder]           = useState(EMPTY_ORDER);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [ordered, setOrdered]       = useState(false);

  useEffect(() => {
    getListingById(id)
      .then(({ data }) => setListing(data))
      .catch(() => setFetchError('Listing not found or unavailable.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Redirect after order — cleaned up if the component unmounts before the timer fires.
  useEffect(() => {
    if (!ordered) return;
    const timer = setTimeout(() => navigate('/buyer/orders'), 1500);
    return () => clearTimeout(timer);
  }, [ordered, navigate]);

  const handleOrderChange = (e) =>
    setOrder((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleOrder = async (e) => {
    e.preventDefault();
    setOrderError('');

    // Client-side deposit validation
    if (order.paymentType === 'deposit') {
      const dep = Number(order.depositAmount);
      if (!dep || dep <= 0) {
        setOrderError('Enter a valid deposit amount.');
        return;
      }
      if (dep >= listing.price) {
        setOrderError('Deposit must be less than the total price.');
        return;
      }
    }

    setSubmitting(true);
    try {
      await createOrder({
        listingId:     listing._id,
        paymentType:   order.paymentType,
        depositAmount: order.paymentType === 'deposit' ? Number(order.depositAmount) : undefined,
        notes:         order.notes || undefined,
      });
      setOrdered(true); // useEffect above handles the timed redirect
    } catch (err) {
      setOrderError(parseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)    return <p>Loading...</p>;
  if (fetchError) return <p style={{ color: 'red' }}>{fetchError}</p>;
  if (!listing)   return null;

  return (
    <div style={{ maxWidth: '640px' }}>
      <p><Link to="/buyer">← Back to browse</Link></p>

      {/* ── Listing details ── */}
      <h2 style={{ textTransform: 'capitalize' }}>
        {listing.type}{listing.breed ? ` — ${listing.breed}` : ''}
      </h2>

      {listing.images?.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {listing.images.map((src, i) => (
            <img key={i} src={getImageUrl(src)} alt="" style={{ width: '180px', height: '130px', objectFit: 'cover' }} />
          ))}
        </div>
      )}

      <table style={{ borderCollapse: 'collapse', marginBottom: '16px' }}>
        <tbody>
          {[
            ['Age',      `${listing.age} months`],
            ['Weight',   `${listing.weight} kg`],
            ['Price',    fmt(listing.price)],
            ['Location', listing.location || '—'],
            ['Seller',   listing.seller?.name],
            ['Contact',  listing.seller?.phone || '—'],
          ].map(([label, value]) => (
            <tr key={label}>
              <td style={{ padding: '4px 16px 4px 0', color: '#555', whiteSpace: 'nowrap' }}>{label}</td>
              <td style={{ padding: '4px 0' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {listing.description && <p style={{ marginBottom: '24px' }}>{listing.description}</p>}

      {/* ── Order form ── */}
      {ordered ? (
        <p style={{ color: 'green' }}>Order placed! Redirecting to your orders…</p>
      ) : (
        <section>
          <h3>Place Order</h3>
          <form onSubmit={handleOrder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            <label>
              Payment Type *
              <br />
              <select name="paymentType" value={order.paymentType} onChange={handleOrderChange}>
                <option value="cod">Cash on Delivery</option>
                <option value="deposit">Deposit</option>
              </select>
            </label>

            {order.paymentType === 'deposit' && (
              <label>
                Deposit Amount * (total: {fmt(listing.price)})
                <br />
                <input
                  name="depositAmount"
                  type="number"
                  min="1"
                  max={listing.price - 1}
                  step="0.01"
                  value={order.depositAmount}
                  onChange={handleOrderChange}
                  required
                />
              </label>
            )}

            <label>
              Notes
              <br />
              <textarea
                name="notes"
                value={order.notes}
                onChange={handleOrderChange}
                rows={3}
              />
            </label>

            {orderError && <p style={{ color: 'red', margin: 0 }}>{orderError}</p>}

            <button type="submit" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
              {submitting ? 'Placing order…' : 'Place Order'}
            </button>

          </form>
        </section>
      )}
    </div>
  );
};

export default BuyerListingDetail;
