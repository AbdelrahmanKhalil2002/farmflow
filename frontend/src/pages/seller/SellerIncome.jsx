import { useEffect, useState } from 'react';
import { getIncome, addIncome } from '../../services/financeService';
import { fmt } from '../../utils/format';

const TYPES = ['sale', 'deposit'];

const EMPTY_FORM = { type: 'sale', amount: '', date: '', note: '' };

const parseError = (err) => {
  const data = err.response?.data;
  if (!data) return 'Network error. Try again.';
  if (data.errors?.length) return data.errors[0].msg;
  return data.message || 'Something went wrong.';
};

const SellerIncome = () => {
  const [income, setIncome]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [form, setForm]             = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');

  useEffect(() => {
    getIncome()
      .then(({ data }) => setIncome(data))
      .catch(() => setFetchError('Failed to load income.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const { data } = await addIncome({
        ...form,
        date: form.date || undefined,
      });
      setIncome((prev) => [data, ...prev]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(parseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Income</h2>

      {/* ── Add income form ── */}
      <section>
        <h3>Add Income</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>

          <label>
            Type *
            <br />
            <select name="type" value={form.type} onChange={handleChange} required>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label>
            Amount *
            <br />
            <input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={handleChange} required />
          </label>

          <label>
            Date
            <br />
            <input name="date" type="date" value={form.date} onChange={handleChange} />
          </label>

          <label>
            Note
            <br />
            <input name="note" value={form.note} onChange={handleChange} />
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Add'}
          </button>

        </form>
        {formError && <p style={{ color: 'red' }}>{formError}</p>}
      </section>

      <hr />

      {/* ── Income list ── */}
      <section>
        <h3>History</h3>
        {loading && <p>Loading...</p>}
        {fetchError && <p style={{ color: 'red' }}>{fetchError}</p>}
        {!loading && !fetchError && income.length === 0 && <p>No income recorded yet.</p>}
        {income.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                <th>Type</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {income.map((i) => (
                <tr key={i._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>{i.type}</td>
                  <td>{fmt(i.amount)}</td>
                  <td>{new Date(i.date).toLocaleDateString()}</td>
                  <td>{i.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default SellerIncome;
