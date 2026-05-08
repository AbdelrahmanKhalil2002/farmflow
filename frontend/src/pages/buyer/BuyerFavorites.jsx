import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFavorites, removeFavorite } from '../../services/favoritesService';
import { useLang } from '../../context/LangContext';

import { C } from '../../tokens';

const StarRating = ({ value }) => {
  const full = Math.floor(value);
  const half = value % 1 >= 0.5;
  return (
    <span style={{ fontSize: 13, color: '#F59E0B', letterSpacing: 1 }}>
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) return '★';
        if (i === full && half) return '½';
        return '☆';
      }).join('')}
    </span>
  );
};

const BuyerFavorites = () => {
  const { t, isRTL } = useLang();
  const [farms,   setFarms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getFavorites()
      .then(res => setFarms(res.data))
      .catch(() => setError(t('buyer.fav.loadErr')))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (sellerId) => {
    try {
      await removeFavorite(sellerId);
      setFarms(f => f.filter(s => s._id !== sellerId));
    } catch {
      setError(t('buyer.fav.removeErr'));
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#2C1810 0%,#5C3317 55%,#7C4A1E 100%)',
        padding: '24px 32px', position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden="true" style={{ position:'absolute', left:-8, top:-20, fontSize:120, opacity:0.06, lineHeight:1, pointerEvents:'none', userSelect:'none' }}>❤️</div>
        <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#fff' }}>{t('buyer.fav.title')}</h1>
        <p style={{ margin:'3px 0 0', fontSize:13, color:'rgba(255,255,255,0.5)' }}>{t('buyer.fav.subtitle')}</p>
      </div>

      <div style={{ padding:'24px 32px 56px', maxWidth:900, margin:'0 auto' }}>

        {error && (
          <div role="alert" style={{ background:C.redBg, border:`1px solid #FECACA`, borderRadius:10, padding:'11px 16px', color:C.red, fontSize:14, marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            {error}
            <button type="button" onClick={() => setError('')} style={{ background:'none', border:'none', color:C.red, cursor:'pointer', fontSize:16, padding:0 }}>✕</button>
          </div>
        )}

        {loading && (
          <div style={{ display:'flex', justifyContent:'center', padding:'56px', color:C.muted }}>
            {t('common.loading')}
          </div>
        )}

        {!loading && farms.length === 0 && (
          <div style={{ textAlign:'center', padding:'56px 24px' }}>
            <div style={{ fontSize:56, marginBottom:12 }}>💔</div>
            <p style={{ margin:'0 0 4px', fontSize:18, fontWeight:700, color:C.text }}>{t('buyer.fav.empty')}</p>
            <p style={{ margin:'0 0 20px', fontSize:13, color:C.muted }}>{t('buyer.fav.emptyHint')}</p>
            <button
              type="button"
              onClick={() => navigate('/buyer')}
              style={{ padding:'10px 24px', background:C.green, color:'#fff', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {t('buyer.browse.title')}
            </button>
          </div>
        )}

        {!loading && farms.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {farms.map(farm => (
              <div key={farm._id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'18px 20px', boxShadow:C.shadow, display:'flex', alignItems:'center', gap:16 }}>
                {/* Avatar */}
                <div style={{ width:52, height:52, borderRadius:'50%', background:C.greenLt, border:`2px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                  🌾
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:'0 0 2px', fontSize:16, fontWeight:800, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {farm.farmName || farm.name}
                  </p>
                  {farm.governorate && (
                    <p style={{ margin:'0 0 4px', fontSize:12, color:C.muted }}>📍 {farm.governorate}</p>
                  )}
                  {farm.reviewCount > 0 && (
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <StarRating value={farm.averageRating} />
                      <span style={{ fontSize:12, color:C.muted }}>({farm.reviewCount} {t('buyer.fav.reviews')})</span>
                      {farm.averageRating >= 4.5 && (
                        <span style={{ fontSize:11, background:'#FEF3C7', color:'#D97706', padding:'1px 7px', borderRadius:4, fontWeight:700 }}>{t('buyer.browse.trusted')}</span>
                      )}
                    </div>
                  )}
                  {farm.animalTypes?.length > 0 && (
                    <p style={{ margin:'4px 0 0', fontSize:12, color:C.muted }}>{farm.animalTypes.join(' · ')}</p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/buyer/farms/${farm._id}`)}
                    style={{ padding:'8px 16px', background:C.green, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    {t('buyer.fav.viewFarm')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(farm._id)}
                    title={t('buyer.fav.remove')}
                    style={{ padding:'8px 10px', background:'none', color:C.red, border:`1px solid rgba(220,38,38,0.25)`, borderRadius:8, fontSize:16, cursor:'pointer', lineHeight:1 }}>
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerFavorites;
