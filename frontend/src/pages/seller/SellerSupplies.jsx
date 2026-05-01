import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupplies, deleteSupply } from '../../services/supplyService';

const C = {
  bg:       '#F7FBF7',
  card:     '#FFFFFF',
  green:    '#3A7D44',
  greenDk:  '#2D6235',
  greenLt:  '#F0F7F1',
  greenBg:  '#DCFCE7',
  greenText:'#166534',
  border:   '#D4E8D6',
  text:     '#1A2E1C',
  muted:    '#4B6B4E',
  shadow:   '0 2px 8px rgba(26,46,28,0.08)',
  red:      '#DC2626',
  redBg:    '#FEF2F2',
  amber:    '#D97706',
  amberBg:  '#FEF9C3',
  amberText:'#92400E',
};

const CAT_AR    = { feed:'علف', veterinary:'بيطري', equipment:'معدات', seeds:'بذور', other:'أخرى' };
const CAT_EMOJI = { feed:'🌾', veterinary:'💊', equipment:'🔧', seeds:'🌱', other:'📦' };
const STATUS_STYLES = {
  pending:  { bg: '#FEF9C3', color: '#92400E', label: 'قيد المراجعة' },
  approved: { bg: '#DCFCE7', color: '#166534', label: 'مُعتمد'       },
  rejected: { bg: '#FEE2E2', color: '#DC2626', label: 'مرفوض'        },
  sold_out: { bg: '#F3F4F6', color: '#6B7280', label: 'نفذت الكمية'  },
};

const SK = { background:'linear-gradient(90deg,#E8F5E9 0%,#F0FAF1 50%,#E8F5E9 100%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s ease-in-out infinite', borderRadius:8 };

const SellerSupplies = () => {
  const navigate = useNavigate();
  const [supplies, setSupplies] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    getSupplies()
      .then(r => setSupplies(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteSupply(id);
      setSupplies(p => p.filter(s => s._id !== id));
      setToDelete(null);
    } catch {}
  };

  const pending   = supplies.filter(s => s.status === 'pending').length;
  const approved  = supplies.filter(s => s.status === 'approved').length;

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }} dir="rtl">
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 800, color: C.text }}>مستلزماتي 🛒</h1>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
            {loading ? 'جاري التحميل…' : `${supplies.length} منتج · ${approved} مُعتمد · ${pending} قيد المراجعة`}
          </p>
        </div>
        <button type="button" onClick={() => navigate('/seller/supplies/add')}
          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          + إضافة منتج
        </button>
      </div>

      {/* Skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18, display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, ...SK }} />
              <div style={{ flex: 1 }}><div style={{ height: 18, width: '50%', ...SK, marginBottom: 8 }} /><div style={{ height: 13, width: '30%', ...SK }} /></div>
              <div style={{ height: 32, width: 80, ...SK, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && supplies.length === 0 && (
        <div style={{ textAlign: 'center', padding: '56px 24px', background: C.card, borderRadius: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>لا توجد منتجات بعد</h3>
          <p style={{ color: C.muted, fontSize: 13, margin: '0 0 16px' }}>أضف علفًا أو مستلزمات بيطرية أو معدات للبيع</p>
          <button type="button" onClick={() => navigate('/seller/supplies/add')}
            style={{ padding: '10px 22px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
            إضافة أول منتج
          </button>
        </div>
      )}

      {/* List */}
      {!loading && supplies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {supplies.map(s => {
            const st = STATUS_STYLES[s.status] || STATUS_STYLES.pending;
            return (
              <div key={s._id} style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: C.shadow }}>
                {/* Category icon */}
                <div style={{ width: 48, height: 48, borderRadius: 12, background: C.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {CAT_EMOJI[s.category] || '📦'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    {CAT_AR[s.category]} · {s.quantity} {s.unit} · {s.pricePerUnit} ج.م/{s.unit}
                  </div>
                  {s.status === 'rejected' && s.rejectionReason && (
                    <div style={{ fontSize: 11, color: C.red, marginTop: 3 }}>سبب الرفض: {s.rejectionReason}</div>
                  )}
                </div>

                {/* Status badge */}
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: st.bg, color: st.color, flexShrink: 0 }}>
                  {st.label}
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={() => navigate(`/seller/supplies/edit/${s._id}`)}
                    style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    تعديل
                  </button>
                  {toDelete === s._id ? (
                    <button type="button" onClick={() => handleDelete(s._id)}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #FECACA', background: C.redBg, color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      تأكيد
                    </button>
                  ) : (
                    <button type="button" onClick={() => setToDelete(s._id)}
                      style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 14, cursor: 'pointer' }}>
                      🗑
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel delete on outside click */}
      {toDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: -1 }} onClick={() => setToDelete(null)} />
      )}
    </div>
  );
};

export default SellerSupplies;
