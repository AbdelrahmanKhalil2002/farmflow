import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupplies, deleteSupply } from '../../services/supplyService';
import { generateWholesaleCode, getWholesaleRequests, updateWholesaleRequest } from '../../services/wholesaleService';
import { useLang } from '../../context/LangContext';
import { useFarm } from '../../context/FarmContext';

import { C } from '../../tokens';

const CAT_KEY   = { feed:'supplies.cat.feed', veterinary:'supplies.cat.veterinary', equipment:'supplies.cat.equipment', seeds:'supplies.cat.seeds', other:'supplies.cat.other' };
const CAT_EMOJI = { feed:'🌾', veterinary:'💊', equipment:'🔧', seeds:'🌱', other:'📦' };
const STATUS_KEY = {
  pending:  { bg: '#FEF9C3', color: '#92400E', labelKey: 'listings.status.pending' },
  approved: { bg: '#DCFCE7', color: '#166534', labelKey: 'listings.status.active'  },
  rejected: { bg: '#FEE2E2', color: '#DC2626', labelKey: 'listings.status.rejected'},
  sold_out: { bg: '#F3F4F6', color: '#6B7280', labelKey: 'supplies.status.out'     },
};

const SK = { background:'linear-gradient(90deg,#E8F5E9 0%,#F0FAF1 50%,#E8F5E9 100%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s ease-in-out infinite', borderRadius:8 };

const SellerSupplies = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLang();
  const { activeFarm } = useFarm();

  const [supplies, setSupplies] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [toDelete, setToDelete] = useState(null);

  // Wholesale state
  const [showWholesale,    setShowWholesale]    = useState(false);
  const [farmCode,         setFarmCode]         = useState('');
  const [genCodeLoading,   setGenCodeLoading]   = useState(false);
  const [copied,           setCopied]           = useState(false);
  const [wholesaleReqs,    setWholesaleReqs]    = useState([]);
  const [loadingReqs,      setLoadingReqs]      = useState(false);
  const [actioningReq,     setActioningReq]     = useState(null);

  useEffect(() => {
    const params = activeFarm?._id ? { farmId: activeFarm._id } : {};
    getSupplies(params)
      .then(r => setSupplies(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeFarm?._id]);

  useEffect(() => {
    if (activeFarm?.wholesaleCode) setFarmCode(activeFarm.wholesaleCode);
  }, [activeFarm]);

  useEffect(() => {
    if (!showWholesale) return;
    setLoadingReqs(true);
    getWholesaleRequests()
      .then(r => setWholesaleReqs(r.data))
      .catch(() => {})
      .finally(() => setLoadingReqs(false));
  }, [showWholesale]);

  const handleGenCode = async () => {
    if (!activeFarm?._id) return;
    setGenCodeLoading(true);
    try {
      const { data } = await generateWholesaleCode(activeFarm._id);
      setFarmCode(data.code);
    } catch {}
    setGenCodeLoading(false);
  };

  const handleCopy = () => {
    if (!farmCode) return;
    navigator.clipboard.writeText(farmCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const handleReqAction = async (reqId, status) => {
    setActioningReq(reqId);
    try {
      const { data } = await updateWholesaleRequest(reqId, status);
      setWholesaleReqs(p => p.map(r => r._id === reqId ? data : r));
    } catch {}
    setActioningReq(null);
  };

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
    <div style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }} dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 800, color: C.text }}>{t('supplies.title')} 🛒</h1>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
            {loading ? t('common.loading') : `${supplies.length} ${t('dairy.col.product')} · ${approved} ${t('listings.status.active')} · ${pending} ${t('listings.status.pending')}`}
          </p>
        </div>
        <button type="button" onClick={() => navigate('/seller/supplies/add')}
          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          + {t('supplies.addNew')}
        </button>
      </div>

      {/* Wholesale management accordion */}
      <div style={{ background: '#FFF8EC', border: `1px solid #FDE68A`, borderRadius: 14, marginBottom: 20, overflow: 'hidden' }}>
        <button type="button" onClick={() => setShowWholesale(p => !p)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🤝</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#92400E' }}>تجار الجملة</span>
            {wholesaleReqs.filter(r => r.status === 'pending').length > 0 && (
              <span style={{ background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>
                {wholesaleReqs.filter(r => r.status === 'pending').length}
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, color: '#B45309', transform: showWholesale ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
        </button>

        {showWholesale && (
          <div style={{ padding: '0 18px 18px', borderTop: '1px solid #FDE68A', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Farm code */}
            <div style={{ paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#B45309', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>كود الجملة للمزرعة</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 120, background: '#fff', border: '1.5px solid #FDE68A', borderRadius: 10, padding: '10px 16px', fontSize: 20, fontWeight: 900, letterSpacing: 3, color: '#92400E', textAlign: 'center', fontFamily: 'monospace' }}>
                  {farmCode || '——'}
                </div>
                <button type="button" onClick={handleCopy} disabled={!farmCode}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #FDE68A', background: copied ? '#D97706' : '#fff', color: copied ? '#fff' : '#92400E', fontSize: 13, fontWeight: 700, cursor: farmCode ? 'pointer' : 'not-allowed', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                  {copied ? '✓ تم النسخ' : '📋 نسخ'}
                </button>
                <button type="button" onClick={handleGenCode} disabled={genCodeLoading || !activeFarm?._id}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #FDE68A', background: '#FFF8EC', color: '#92400E', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {genCodeLoading ? '…' : '🔄 توليد جديد'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: '#B45309', margin: '6px 0 0' }}>
                أعطِ هذا الكود للتجار لكي يحصلوا على أسعار الجملة مباشرةً
              </p>
            </div>

            {/* Access requests */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#B45309', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>طلبات الوصول</div>
              {loadingReqs && <div style={{ fontSize: 13, color: '#B45309' }}>جاري التحميل…</div>}
              {!loadingReqs && wholesaleReqs.length === 0 && (
                <div style={{ fontSize: 13, color: '#B45309', padding: '10px 0' }}>لا توجد طلبات بعد</div>
              )}
              {!loadingReqs && wholesaleReqs.map(req => {
                const stBg    = req.status === 'approved' ? '#DCFCE7' : req.status === 'rejected' ? '#FEE2E2' : '#FEF9C3';
                const stColor = req.status === 'approved' ? '#166534' : req.status === 'rejected' ? '#DC2626' : '#92400E';
                const stLabel = req.status === 'approved' ? '✅ معتمد' : req.status === 'rejected' ? '❌ مرفوض' : '🕐 قيد المراجعة';
                return (
                  <div key={req._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fff', borderRadius: 10, border: '1px solid #FDE68A', marginBottom: 6 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#92400E', flexShrink: 0 }}>
                      {(req.buyer?.name?.[0] || '؟').toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{req.buyer?.name || 'تاجر'}</div>
                      {req.buyer?.phone && <div style={{ fontSize: 11, color: C.muted }}>{req.buyer.phone}</div>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: stBg, color: stColor, flexShrink: 0 }}>{stLabel}</span>
                    {req.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button type="button" disabled={actioningReq === req._id} onClick={() => handleReqAction(req._id, 'approved')}
                          style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          موافقة
                        </button>
                        <button type="button" disabled={actioningReq === req._id} onClick={() => handleReqAction(req._id, 'rejected')}
                          style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          رفض
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
          <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>{t('supplies.empty')}</h3>
          <p style={{ color: C.muted, fontSize: 13, margin: '0 0 16px' }}>{t('supplies.emptyHint')}</p>
          <button type="button" onClick={() => navigate('/seller/supplies/add')}
            style={{ padding: '10px 22px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
            {t('supplies.addNew')}
          </button>
        </div>
      )}

      {/* List */}
      {!loading && supplies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {supplies.map(s => {
            const st = STATUS_KEY[s.status] || STATUS_KEY.pending;
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
                    {t(CAT_KEY[s.category] || 'supplies.cat.other')} · {s.quantity} {s.unit} · {s.pricePerUnit} {t('common.egp')}/{s.unit}
                  </div>
                  {s.status === 'rejected' && s.rejectionReason && (
                    <div style={{ fontSize: 11, color: C.red, marginTop: 3 }}>{t('listings.rejectionReason')}: {s.rejectionReason}</div>
                  )}
                </div>

                {/* Status badge */}
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: st.bg, color: st.color, flexShrink: 0 }}>
                  {t(st.labelKey)}
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={() => navigate(`/seller/supplies/edit/${s._id}`)}
                    style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {t('supplies.editBtn')}
                  </button>
                  {toDelete === s._id ? (
                    <button type="button" onClick={() => handleDelete(s._id)}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #FECACA', background: C.redBg, color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {t('common.confirm')}
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
