import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createListing } from '../../services/listingService';

const TYPES = ['cattle', 'sheep', 'goat', 'camel', 'horse', 'other'];

const parseError = (err) => {
  const data = err.response?.data;
  if (!data) return 'Network error. Try again.';
  if (data.errors?.length) return data.errors[0].msg;
  return data.message || 'Something went wrong.';
};

const SellerAddListing = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    type: 'sheep', breed: '', age: '', weight: '', price: '',
    description: '', location: '',
  });
  const [images, setImages]       = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Use FormData so Multer on the backend can parse the multipart request
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      Array.from(images).forEach((img) => fd.append('images', img));

      await createListing(fd);
      navigate('/seller/listings');
    } catch (err) {
      setError(parseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Add Livestock</h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px' }}>

        <label>
          Type *
          <br />
          <select name="type" value={form.type} onChange={handleChange} required>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label>
          Breed
          <br />
          <input name="breed" value={form.breed} onChange={handleChange} />
        </label>

        <label>
          Age (months) *
          <br />
          <input name="age" type="number" min="0" value={form.age} onChange={handleChange} required />
        </label>

        <label>
          Weight (kg) *
          <br />
          <input name="weight" type="number" min="0" step="0.1" value={form.weight} onChange={handleChange} required />
        </label>

        <label>
          Price *
          <br />
          <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} required />
        </label>

        <label>
          Location
          <br />
          <input name="location" value={form.location} onChange={handleChange} />
        </label>

        <label>
          Description
          <br />
          <textarea name="description" value={form.description} onChange={handleChange} rows={3} />
        </label>

        <label>
          Images (up to 5)
          <br />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => setImages(e.target.files)}
          />
        </label>

        {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Listing'}
          </button>
          <button type="button" onClick={() => navigate('/seller/listings')}>
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
};

export default SellerAddListing;
