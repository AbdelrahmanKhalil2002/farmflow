import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getDairyById, updateDairy } from '../../services/dairyService';
import { useToast } from '../../components/Toast';
import { useLang } from '../../context/LangContext';
import { C } from '../../tokens';

const TYPES = [
  { value: 'milk',   emoji: '🥛', labelKey: 'dairy.type.milk' },
  { value: 'cheese', emoji: '🧀', labelKey: 'dairy.type.cheese' },
  { value: 'yogurt', emoji: '🫙', labelKey: 'dairy.type.yogurt' },
  { value: 'butter', emoji: '🧈', labelKey: 'dairy.type.butter' },
  { value: 'cream',  emoji: '🍦', labelKey: 'dairy.type.cream' },
  { value: 'ghee',   emoji: '🫕', labelKey: 'dairy.type.ghee' },
  { value: 'other',  emoji: '📦', labelKey: 'dairy.type.other' },
];

const UNITS = [
  { value: 'liter', labelKey: 'dairy.unit.liter' },
  { value: 'kg',    labelKey: 'dairy.unit.kg' },
  { value: 'piece', labelKey: 'dairy.unit.piece' },
  { value: 'pack',  labelKey: 'dairy.unit.pack' },
  { value: 'dozen', labelKey: 'dairy.unit.dozen' },
];

const toDateInput = (d) => {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
};

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: '10px',
  border: `1.5px solid ${C.border}`, background: '#fff',
  color: C.text, fontSize: '14px', boxSizing: 'border-box',
  outline: 'none', fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: '700',
  color: C.text, marginBottom: '6px',
};

const SellerEditDairy = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const toast    = useToast();
  const { t, isRTL } = useLang();

  const [form,     setForm]     = useState(null);
  const [newImages,   setNewImages]   = useState([]);
  const [previews,    setPreviews]    = useState([]);
  const [errors,   setErrors]   = useState({});
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getDairyById(id)
      .then(r => {
        const p = r.data;
        setForm({
          name:              p.name        || '',
          type:              p.type        || 'milk',
          quantity:          p.quantity    ?? '',
          unit:              p.unit        || 'liter',
          pricePerUnit:      p.pricePerUnit ?? '',
          productionDate:    toDateInput(p.productionDate),
          expiryDate:        toDateInput(p.expiryDate),
          description:       p.description || '',
          deliveryAvailable: p.deliveryAvailable || false,
          deliveryCost:      p.deliveryCost ?? '',
          existingImages:    p.images      || [],
        });
      })
      .catch(() => { toast.error(t('editDairy.loadErr')); navigate('/seller/dairy'); })
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  const handleImages = (e) => {
    const files = Array.from(e.target.files).slice(0, 5 - (form?.existingImages?.length || 0));
    setNewImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const removeExisting = (url) => set('existingImages', form.existingImages.filter(u => u !== url));

  const validate = () => {
    const e = {};
    if (!form.name.trim())      e.name        = t('addDairy.err.name');
    if (!form.quantity || Number(form.quantity) < 0)
                                e.quantity     = t('addDairy.err.quantity');
    if (!form.pricePerUnit || Number(form.pricePerUnit) < 0)
                                e.pricePerUnit = t('addDairy.err.price');
    if (form.deliveryAvailable && !form.deliveryCost)
                                e.deliveryCost = t('addDairy.err.deliveryCost');
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name',         form.name.trim());
      fd.append('type',         form.type);
      fd.append('quantity',     form.quantity);
      fd.append('unit',         form.unit);
      fd.append('pricePerUnit', form.pricePerUnit);
      if (form.productionDate) fd.append('productionDate', form.productionDate);
      if (form.expiryDate)     fd.append('expiryDate',     form.expiryDate);
      if (form.description)    fd.append('description',    form.description.trim());
      fd.append('deliveryAvailable', form.deliveryAvailable);
      if (form.deliveryAvailable && form.deliveryCost)
        fd.append('deliveryCost', form.deliveryCost);
      form.existingImages.forEach(url => fd.append('keepImages', url));
      newImages.forEach(img => fd.append('images', img));

      await updateDairy(id, fd);
      toast.success(t('editDairy.success'));
      navigate('/seller/dairy');
    } catch (err) {
      toast.error(err?.response?.data?.message || t('editDairy.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: '15px' }}>
        {t('editDairy.loading')}
      </div>
    );
  }

  if (!form) return null;

  const selectedType = TYPES.find(tp => tp.value === form.type);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0C4A6E 0%, #0E7490 55%, #0891B2 100%)', padding: '24px 32px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', right: -8, top: -20, fontSize: '110px', opacity: 0.07, lineHeight: 1, pointerEvents: 'none' }}>🥛</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="button" onClick={() => navigate('/seller/dairy')}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', backdropFilter: 'blur(4px)' }}>
            ← {t('common.back')}
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff' }}>{t('editDairy.title')}</h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>{form.name}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '28px 32px 56px', maxWidth: '700px', margin: '0 auto' }}>

        {/* Type selector */}
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px', marginBottom: '16px', boxShadow: C.shadow }}>
          <div style={labelStyle}>{t('dairy.form.type')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {TYPES.map(tp => (
              <button key={tp.value} type="button"
                onClick={() => set('type', tp.value)}
                style={{
                  padding: '10px 16px', borderRadius: '10px', border: `2px solid`,
                  borderColor: form.type === tp.value ? C.green : C.border,
                  background: form.type === tp.value ? C.greenBg : '#fff',
                  color: form.type === tp.value ? C.greenText : C.muted,
                  fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                {tp.emoji} {t(tp.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Basic info */}
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px', marginBottom: '16px', boxShadow: C.shadow }}>
          <div style={{ fontSize: '15px', fontWeight: '800', color: C.text, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {selectedType?.emoji} {t('addDairy.productInfo')}
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>{t('dairy.form.name')} <span style={{ color: C.red }}>*</span></label>
            <input
              style={{ ...inputStyle, borderColor: errors.name ? C.red : C.border }}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder={t('addDairy.namePlaceholder')}
            />
            {errors.name && <div style={{ color: C.red, fontSize: '12px', marginTop: '4px' }}>{errors.name}</div>}
          </div>

          <div>
            <label style={labelStyle}>{t('dairy.form.description')} <span style={{ color: C.muted, fontWeight: '400' }}>{t('common.optional')}</span></label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder={t('addDairy.descPlaceholder')}
            />
          </div>
        </div>

        {/* Quantity & Price */}
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px', marginBottom: '16px', boxShadow: C.shadow }}>
          <div style={{ fontSize: '15px', fontWeight: '800', color: C.text, marginBottom: '16px' }}>📦 {t('addDairy.quantityPrice')}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>{t('dairy.form.quantity')} <span style={{ color: C.red }}>*</span></label>
              <input
                type="number" min="0" step="0.01"
                style={{ ...inputStyle, borderColor: errors.quantity ? C.red : C.border }}
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
              />
              {errors.quantity && <div style={{ color: C.red, fontSize: '12px', marginTop: '4px' }}>{errors.quantity}</div>}
            </div>
            <div>
              <label style={labelStyle}>{t('dairy.form.unit')}</label>
              <select style={inputStyle} value={form.unit} onChange={e => set('unit', e.target.value)}>
                {UNITS.map(u => <option key={u.value} value={u.value}>{t(u.labelKey)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t('dairy.form.price')} / {t(UNITS.find(u => u.value === form.unit)?.labelKey)} <span style={{ color: C.red }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                type="number" min="0" step="0.01"
                style={{ ...inputStyle, paddingLeft: '52px', borderColor: errors.pricePerUnit ? C.red : C.border }}
                value={form.pricePerUnit}
                onChange={e => set('pricePerUnit', e.target.value)}
              />
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: C.muted, fontWeight: '700' }}>{t('common.egp')}</span>
            </div>
            {errors.pricePerUnit && <div style={{ color: C.red, fontSize: '12px', marginTop: '4px' }}>{errors.pricePerUnit}</div>}
          </div>
        </div>

        {/* Dates */}
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px', marginBottom: '16px', boxShadow: C.shadow }}>
          <div style={{ fontSize: '15px', fontWeight: '800', color: C.text, marginBottom: '16px' }}>📅 {t('addDairy.dates')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>{t('dairy.form.prodDate')}</label>
              <input type="date" style={inputStyle} value={form.productionDate} onChange={e => set('productionDate', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>{t('dairy.form.expDate')}</label>
              <input type="date" style={inputStyle} value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Delivery */}
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px', marginBottom: '16px', boxShadow: C.shadow }}>
          <div style={{ fontSize: '15px', fontWeight: '800', color: C.text, marginBottom: '16px' }}>🚚 {t('addDairy.delivery')}</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '12px' }}>
            <div
              onClick={() => set('deliveryAvailable', !form.deliveryAvailable)}
              style={{
                width: '44px', height: '24px', borderRadius: '12px',
                background: form.deliveryAvailable ? C.green : '#D1D5DB',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer',
              }}>
              <div style={{
                position: 'absolute', top: '3px',
                right: form.deliveryAvailable ? '3px' : '17px',
                width: '18px', height: '18px', borderRadius: '50%',
                background: '#fff', transition: 'right 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
            <span style={{ fontSize: '14px', color: C.text, fontWeight: '600' }}>
              {form.deliveryAvailable ? t('dairy.deliveryAvailable') : t('dairy.noDelivery')}
            </span>
          </label>
          {form.deliveryAvailable && (
            <div>
              <label style={labelStyle}>{t('dairy.form.deliveryCost')} <span style={{ color: C.red }}>*</span></label>
              <input
                type="number" min="0" step="0.5"
                style={{ ...inputStyle, borderColor: errors.deliveryCost ? C.red : C.border }}
                value={form.deliveryCost}
                onChange={e => set('deliveryCost', e.target.value)}
              />
              {errors.deliveryCost && <div style={{ color: C.red, fontSize: '12px', marginTop: '4px' }}>{errors.deliveryCost}</div>}
            </div>
          )}
        </div>

        {/* Images */}
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px', marginBottom: '24px', boxShadow: C.shadow }}>
          <div style={{ fontSize: '15px', fontWeight: '800', color: C.text, marginBottom: '16px' }}>📷 {t('addDairy.photos')}</div>

          {form.existingImages.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {form.existingImages.map((url, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={url} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: `1px solid ${C.border}` }} />
                  <button type="button"
                    onClick={() => removeExisting(url)}
                    style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: C.red, border: 'none', color: '#fff', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {(form.existingImages.length + newImages.length) < 5 && (
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: `2px dashed ${C.border}`, borderRadius: '12px', padding: '20px', cursor: 'pointer',
              background: '#FAFAF7', marginBottom: previews.length ? '12px' : 0,
            }}>
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImages} />
              <div style={{ fontSize: '13px', color: C.muted }}>+ {t('editDairy.addPhotos')} ({t('editDairy.upTo')} {5 - form.existingImages.length} {t('editDairy.photosLabel')})</div>
            </label>
          )}

          {previews.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {previews.map((src, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={src} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: `1px solid ${C.border}`, opacity: 0.8 }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', borderRadius: '0 0 10px 10px', fontSize: '10px', color: '#fff', textAlign: 'center', padding: '2px' }}>{t('editDairy.newLabel')}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => navigate('/seller/dairy')}
            style={{ padding: '12px 24px', borderRadius: '10px', border: `1px solid ${C.border}`, background: '#fff', color: C.text, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={saving}
            style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: saving ? '#9CA3AF' : C.green, color: '#fff', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? t('editDairy.saving') : t('editDairy.saveBtn')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SellerEditDairy;
