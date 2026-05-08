import { useEffect, useState } from 'react';
import { getSupplies, updateSupplyStatus } from '../../services/supplyService';

import { C as _C } from '../../tokens';

const C = {
  ..._C,
  dim:        '#6B7280',
  cardBorder: '#E5E7EB',
  header:     '#F9FAFB',
};

const CAT_AR    = { feed:'علف', veterinary:'مستلزمات بيطرية', equipment:'معدات ومستلزمات', seeds:'بذور ونباتات', other:'أخرى' };
const CAT_EMOJI = { feed:'🌾', veterinary:'💊', equipment:'🔧', seeds:'🌱', other:'📦' };

const STATUS_STYLES = {
  pending:  { bg: C.amberBg, color: C.amber, label: 'قيد المراجعة' },
  approved: { bg: C.greenBg, color: C.green, label: 'مُعتمد'        },
  rejected: { bg: C.redBg,   color: C.red,   label: 'مرفوض'         },
  sold_out: { bg: 'rgba(107,114,128,0.12)', color: '#9CA3AF', label: 'نفذت الكمية' },
};

const SK = { background: 'linear-gradient(90deg,#F3F4F6 0%,#E9EAEC 50%,#F3F4F6 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite', borderRadius: 8 };

const TABS = [
  { val: 'pending',  label: 'قيد المراجعة' },
  { val: 'approved', label: 'مُعتمد'        },
  { val: 'rejected', label: 'مرفوض'         },
  { val: 'all',      label: 'الكل'           },
];

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const AdminSupplies = () => {
  const [supplies,   setSupplies]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('pending');
  const [modal,      setModal]      = useState(null);  // { supply, action: 'approve'|'reject' }
  const [rejectNote, setRejectNote] = useState('');
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    getSupplies()
      .then(r => setSupplies(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === 'all' ? supplies : supplies.filter(s => s.status === tab);

  const counts = {
    pending:  supplies.filter(s => s.status === 'pending').length,
    approved: supplies.filter(s => s.status === 'approved').length,
    rejected: supplies.filter(s => s.status === 'rejected').length,
    all:      supplies.length,
  };

  const openModal = (supply, action) => {
    setModal({ supply, action });
    setRejectNote('');
  };

  const handleAction = async () => {
    if (!modal) return;
    const { supply, action } = modal;
    setSaving(true);
    try {
      const status = action === 'approve' ? 'approved' : 'rejected';
      const body   = { status };
      if (action === 'reject' && rejectNote.trim()) body.rejectionReason = rejectNote.trim();
      await updateSupplyStatus(supply._id, body);
      setSupplies(p => p.map(s => s._id === supply._id ? { ...s, status, rejectionReason: body.rejectionReason } : s));
      setModal(null);
    } catch {}
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '28px 32px', fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif", color: C.text, minHeight: '100vh' }} dir="rtl">
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>مراجعة المستلزمات 🛒</h1>
        <p style={{ margin: 0, fontSize: 13, color: C.dim }}>
          {loading ? 'جاري التحميل…' : `${counts.all} منتج · ${counts.pending} قيد المراجعة`}
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F3F4F6', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.val} type="button" onClick={() => setTab(t.val)}
            style={{ padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
              background: tab === t.val ? C.greenBg : 'transparent',
              color: tab === t.val ? C.green : C.dim }}>
            {t.label}
            {counts[t.val] > 0 && (
              <span style={{ marginRight: 6, background: tab === t.val ? C.green : '#D1D5DB', color: tab === t.val ? '#fff' : C.dim, fontSize: 11, fontWeight: 800, borderRadius: '50%', minWidth: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                {counts[t.val]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.cardBorder}`, padding: 18, display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, ...SK }} />
              <div style={{ flex: 1 }}><div style={{ height: 18, width: '45%', ...SK, marginBottom: 8 }} /><div style={{ height: 13, width: '60%', ...SK }} /></div>
              <div style={{ display: 'flex', gap: 8 }}><div style={{ height: 34, width: 88, ...SK, borderRadius: 8 }} /><div style={{ height: 34, width: 88, ...SK, borderRadius: 8 }} /></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '56px 24px', background: C.card, borderRadius: 16, border: `1px solid ${C.cardBorder}` }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>لا توجد منتجات في هذا القسم</h3>
          <p style={{ color: C.dim, fontSize: 13, margin: 0 }}>
            {tab === 'pending' ? 'جميع المنتجات تمت مراجعتها' : 'لا توجد منتجات هنا حتى الآن'}
          </p>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(s => {
            const st   = STATUS_STYLES[s.status] || STATUS_STYLES.pending;
            const seller = s.seller || {};
            return (
              <div key={s._id} style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.cardBorder}`, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, animation: 'fadeIn 0.3s ease' }}>

                {/* Thumbnail or emoji */}
                <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: `1px solid ${C.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, overflow: 'hidden' }}>
                  {s.images?.[0]
                    ? <img src={`${BASE_URL}${s.images[0]}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : CAT_EMOJI[s.category] || '📦'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 3 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: C.dim }}>
                    {CAT_AR[s.category]} · {s.quantity} {s.unit} · {s.pricePerUnit} ج.م/{s.unit}
                    {seller.name && <> · {seller.name}</>}
                    {seller.governorate && <> · 📍 {seller.governorate}</>}
                  </div>
                  {s.description && (
                    <div style={{ fontSize: 12, color: C.dim, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60ch' }}>
                      {s.description}
                    </div>
                  )}
                  {s.status === 'rejected' && s.rejectionReason && (
                    <div style={{ fontSize: 11, color: C.red, marginTop: 4, background: C.redBg, padding: '4px 8px', borderRadius: 6, display: 'inline-block' }}>
                      سبب الرفض: {s.rejectionReason}
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: st.bg, color: st.color, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {st.label}
                </span>

                {/* Actions */}
                {s.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button type="button" onClick={() => openModal(s, 'approve')}
                      style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid rgba(34,197,94,0.25)`, background: C.greenBg, color: C.green, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      ✓ قبول
                    </button>
                    <button type="button" onClick={() => openModal(s, 'reject')}
                      style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid rgba(239,68,68,0.25)`, background: C.redBg, color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      ✕ رفض
                    </button>
                  </div>
                )}
                {s.status === 'approved' && (
                  <button type="button" onClick={() => openModal(s, 'reject')}
                    style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid rgba(239,68,68,0.2)`, background: C.redBg, color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    إلغاء الاعتماد
                  </button>
                )}
                {s.status === 'rejected' && (
                  <button type="button" onClick={() => openModal(s, 'approve')}
                    style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid rgba(34,197,94,0.2)`, background: C.greenBg, color: C.green, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    إعادة القبول
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (
        <>
          <div onClick={() => !saving && setModal(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            background: '#FFFFFF', border: `1px solid ${C.cardBorder}`,
            borderRadius: 18, padding: '28px 32px', width: 'min(440px, 92vw)',
            zIndex: 101, animation: 'fadeIn 0.2s ease',
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: C.text }}>
              {modal.action === 'approve' ? '✓ قبول المنتج' : '✕ رفض المنتج'}
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: C.dim }}>
              {modal.action === 'approve'
                ? `سيتم اعتماد "${modal.supply.name}" وسيظهر للمشترين.`
                : `سيتم رفض "${modal.supply.name}" وإشعار البائع.`}
            </p>

            {modal.action === 'reject' && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.dim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  سبب الرفض <span style={{ fontWeight: 400, opacity: 0.6 }}>(اختياري)</span>
                </label>
                <textarea
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  rows={3} dir="rtl"
                  placeholder="مثال: الصور غير واضحة، الوصف ناقص…"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 13px', borderRadius: 10, border: `1.5px solid ${C.cardBorder}`, background: '#F9FAFB', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = C.green}
                  onBlur={e => e.target.style.borderColor = C.cardBorder}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => !saving && setModal(null)} disabled={saving}
                style={{ padding: '11px 20px', borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: 'transparent', color: C.dim, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                إلغاء
              </button>
              <button type="button" onClick={handleAction} disabled={saving}
                style={{
                  flex: 1, padding: 11, borderRadius: 10, border: 'none',
                  background: saving ? 'rgba(34,197,94,0.3)' : (modal.action === 'approve' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'),
                  color: modal.action === 'approve' ? C.green : C.red,
                  fontSize: 13, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}>
                {saving ? 'جاري الحفظ…' : (modal.action === 'approve' ? '✓ تأكيد القبول' : '✕ تأكيد الرفض')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminSupplies;
