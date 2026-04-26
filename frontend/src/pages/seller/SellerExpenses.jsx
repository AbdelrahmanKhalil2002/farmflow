import { useEffect, useState } from 'react';
import { getExpenses, addExpense } from '../../services/financeService';
import { fmt } from '../../utils/format';

const CATEGORIES = ['feed', 'doctor', 'transport', 'other'];

const EMPTY_FORM = { category: 'feed', amount: '', date: '', note: '' };

const parseError = (err) => {
  const data = err.response?.data;
  if (!data) return 'Network error. Try again.';
  if (data.errors?.length) return data.errors[0].msg;
  return data.message || 'Something went wrong.';
};

const SellerExpenses = () => {
  const [expenses, setExpenses]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [form, setForm]           = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');

  useEffect(() => {
    getExpenses()
      .then(({ data }) => setExpenses(data))
      .catch(() => setFetchError('Failed to load expenses.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const { data } = await addExpense({
        ...form,
        date: form.date || undefined,
      });
      setExpenses((prev) => [data, ...prev]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(parseError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Expenses</h2>

      {/* ── Add expense form ── */}
      <section>
        <h3>Add Expense</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>

          <label>
            Category *
            <br />
            <select name="category" value={form.category} onChange={handleChange} required>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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

      {/* ── Expenses list ── */}
      <section>
        <h3>History</h3>
        {loading && <p>Loading...</p>}
        {fetchError && <p style={{ color: 'red' }}>{fetchError}</p>}
        {!loading && !fetchError && expenses.length === 0 && <p>No expenses recorded yet.</p>}
        {expenses.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                <th>Category</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>{e.category}</td>
                  <td>{fmt(e.amount)}</td>
                  <td>{new Date(e.date).toLocaleDateString()}</td>
                  <td>{e.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default SellerExpenses;
