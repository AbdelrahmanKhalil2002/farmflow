import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSupply } from '../../services/supplyService';
import { useLang } from '../../context/LangContext';
import { C } from '../../tokens';

const CATEGORIES = [
  { val: 'feed',       labelKey: 'supplies.cat.feed',       emoji: '🌾' },
  { val: 'veterinary', labelKey: 'supplies.cat.veterinary', emoji: '💊' },
  { val: 'equipment',  labelKey: 'supplies.cat.equipment',  emoji: '🔧' },
  { val: 'seeds',      labelKey: 'supplies.cat.seeds',      emoji: '🌱' },
  { val: 'other',      labelKey: 'supplies.cat.other',      emoji: '📦' },
];

const COMMON_UNITS = ['كجم', 'طن', 'كيس', 'قطعة', 'لتر', 'عبوة', 'جرة', 'كرتون'];

const Lbl = ({ children, req }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
    {children}{req && <span style={{ color: C.red, marginRight: 2 }}>*</span>}
  </label>
);

const FocusInput = ({ style, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <input {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: `1.5px solid ${focused ? C.green : C.border}`, background: '#fff', fontSize: 14, color: C.text, outline: 'none', transition: 'border-color 0.15s', fontFamily: 'inherit', ...style }}
    />
  );
};

const ErrMsg = ({ msg }) => msg ? <p style={{ color: C.red, fontSize: 12, margin: '4px 0 0' }}>{msg}</p> : null;

const SellerAddSupply = () => {
  const navigate = useNavigate();
  const photoRef = useRef(null);
  const { t, isRTL } = useLang();

  const [form, setForm] = useState({
    name: '', category: 'feed', description: '',
    quantity: '', unit: 'كجم', customUnit: false,
    pricePerUnit: '', minOrderQty: '1',
    location: '', deliveryAvailable: false, deliveryCost: '',
  });
  const [photoFiles, setPhotoFiles]   = useState([]);
  const [previews,   setPreviews]     = useState([]);
  const [dragOver,   setDragOver]     = useState(false);
  const [errors,     setErrors]       = useState({});
  const [submitErr,  setSubmitErr]    = useState('');
  const [submitting, setSubmitting]   = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())      e.name      = t('addSupply.err.name');
    if (!form.quantity || Number(form.quantity) <= 0) e.quantity = t('addSupply.err.quantity');
    if (!form.unit.trim())      e.unit      = t('addSupply.err.unit');
    if (!form.pricePerUnit || Number(form.pricePerUnit) < 0) e.pricePerUnit = t('addSupply.err.price');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePhotos = (files) => {
    const valid = [...files].filter(f => f.type.startsWith('image/')).slice(0, 5 - photoFiles.length);
    setPhotoFiles(p => [...p, ...valid]);
    valid.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setPreviews(p => [...p, e.target.result]);
      reader.readAsDataURL(f);
    });
  };

  const removePhoto = (i) => {
    setPhotoFiles(p => p.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true); setSubmitErr('');
    try {
      const fd = new FormData();
      fd.append('name',        form.name);
      fd.append('category',    form.category);
      if (form.description) fd.append('description', form.description);
      fd.append('quantity',    form.quantity);
      fd.append('unit',        form.unit);
      fd.append('pricePerUnit',form.pricePerUnit);
      if (form.minOrderQty) fd.append('minOrderQty', form.minOrderQty);
      if (form.location) fd.append('location', form.location);
      fd.append('deliveryAvailable', form.deliveryAvailable);
      if (form.deliveryAvailable && form.deliveryCost) fd.append('deliveryCost', form.deliveryCost);
      photoFiles.forEach(f => fd.append('images', f));
      await createSupply(fd);
      navigate('/seller/supplies');
    } catch (err) {
      setSubmitErr(err?.response?.data?.message || t('common.unknownErr'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", maxWidth: 680, margin: '0 auto' }} dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenDk} 100%)`, borderRadius: 16, padding: '20px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', right: -10, top: -20, fontSize: 100, opacity: 0.07, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>🛒</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>{t('addSupply.title')} 🛒</h1>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{t('addSupply.subtitle')}</p>
          </div>
          <button type="button" onClick={() => navigate('/seller/supplies')}
            style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ← {t('addSupply.back')}
          </button>
        </div>
      </div>

      <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Category picker */}
        <div>
          <Lbl req>{t('addSupply.cat')}</Lbl>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map(cat => {
              const active = form.category === cat.val;
              return (
                <button key={cat.val} type="button" onClick={() => set('category', cat.val)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenLt : C.card, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: active ? 800 : 500, color: active ? C.green : C.muted }}>{t(cat.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Name */}
        <div>
          <Lbl req>{t('addSupply.name')}</Lbl>
          <FocusInput value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('addSupply.namePlaceholder')} />
          <ErrMsg msg={errors.name} />
        </div>

        {/* Description */}
        <div>
          <Lbl>{t('addSupply.desc')} <span style={{ fontWeight: 400, color: C.textMuted, fontSize: 11 }}>({t('common.optional')})</span></Lbl>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder={t('addSupply.descPlaceholder')}
            rows={3} dir={isRTL ? 'rtl' : 'ltr'}
            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: 14, color: C.text, resize: 'vertical', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = C.green}
            onBlur={e => e.target.style.borderColor = C.border}
          />
        </div>

        {/* Quantity + Unit row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Lbl req>{t('addSupply.quantity')}</Lbl>
            <FocusInput type="number" min="0" step="0.1" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder={t('addSupply.quantityPlaceholder')} />
            <ErrMsg msg={errors.quantity} />
          </div>
          <div>
            <Lbl req>{t('addSupply.unit')}</Lbl>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {COMMON_UNITS.map(u => (
                <button key={u} type="button" onClick={() => set('unit', u)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${form.unit === u ? C.green : C.border}`, background: form.unit === u ? C.green : C.card, color: form.unit === u ? '#fff' : C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {u}
                </button>
              ))}
            </div>
            <FocusInput value={form.unit} onChange={e => set('unit', e.target.value)} placeholder={t('addSupply.unitPlaceholder')} />
            <ErrMsg msg={errors.unit} />
          </div>
        </div>

        {/* Price + Min order row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Lbl req>{t('addSupply.price')}</Lbl>
            <div style={{ position: 'relative' }}>
              <FocusInput type="number" min="0" step="0.01" value={form.pricePerUnit} onChange={e => set('pricePerUnit', e.target.value)} placeholder={t('addSupply.pricePlaceholder')} style={{ paddingLeft: 60 }} />
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: C.textMuted, pointerEvents: 'none' }}>ج.م</span>
            </div>
            <ErrMsg msg={errors.pricePerUnit} />
          </div>
          <div>
            <Lbl>{t('addSupply.minOrder')}</Lbl>
            <FocusInput type="number" min="1" step="1" value={form.minOrderQty} onChange={e => set('minOrderQty', e.target.value)} placeholder="1" />
          </div>
        </div>

        {/* Location */}
        <div>
          <Lbl>{t('addSupply.location')}</Lbl>
          <FocusInput value={form.location} onChange={e => set('location', e.target.value)} placeholder={t('addSupply.locationPlaceholder')} />
        </div>

        {/* Delivery toggle */}
        <div style={{ background: C.greenLt, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: form.deliveryAvailable ? 12 : 0 }}>
            <input type="checkbox" checked={form.deliveryAvailable} onChange={e => set('deliveryAvailable', e.target.checked)}
              style={{ marginTop: 2, accentColor: C.green, width: 16, height: 16, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t('addSupply.delivery')}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{t('addSupply.deliveryHint')}</div>
            </div>
          </label>
          {form.deliveryAvailable && (
            <div style={{ animation: 'slideDown 0.2s ease' }}>
              <Lbl>{t('addSupply.deliveryCost')} <span style={{ fontWeight: 400, color: C.textMuted, fontSize: 11 }}>({t('addSupply.deliveryCostHint')})</span></Lbl>
              <div style={{ position: 'relative' }}>
                <FocusInput type="number" min="0" step="1" value={form.deliveryCost} onChange={e => set('deliveryCost', e.target.value)} placeholder="مثال: 50" style={{ paddingLeft: 60 }} />
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: C.textMuted, pointerEvents: 'none' }}>ج.م</span>
              </div>
            </div>
          )}
        </div>

        {/* Photo upload */}
        <div>
          <Lbl>{t('addSupply.photos')} <span style={{ fontWeight: 400, color: C.textMuted, fontSize: 11 }}>({t('addSupply.photosHint')})</span></Lbl>
          <div
            onClick={() => photoRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handlePhotos(e.dataTransfer.files); }}
            style={{ border: `2px dashed ${dragOver ? C.green : C.border}`, borderRadius: 12, padding: 24, textAlign: 'center', cursor: 'pointer', background: dragOver ? C.greenLt : '#FAFAFA', transition: 'all 0.15s' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
            <div style={{ fontSize: 13, color: C.muted }}>{t('addSupply.photoDrag')} <span style={{ color: C.green, fontWeight: 700 }}>{t('addSupply.photoBrowse')}</span></div>
          </div>
          <input ref={photoRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handlePhotos(e.target.files)} />

          {previews.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {previews.map((src, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={src} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', border: `2px solid ${C.border}` }} />
                  <button type="button" onClick={() => removePhoto(i)}
                    style={{ position: 'absolute', top: -6, left: -6, width: 22, height: 22, borderRadius: '50%', background: C.red, border: '2px solid #fff', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', lineHeight: 1 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {submitErr && (
          <div role="alert" style={{ background: C.redBg, border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', color: C.red, fontSize: 13 }}>
            {submitErr}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
          <button type="button" onClick={() => navigate('/seller/supplies')}
            style={{ padding: '12px 20px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting}
            style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: submitting ? '#A7C4AD' : C.green, color: '#fff', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
            {submitting ? t('addSupply.saving') : t('addSupply.submit')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerAddSupply;
