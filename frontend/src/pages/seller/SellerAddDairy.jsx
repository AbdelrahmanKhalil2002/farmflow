import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDairy } from '../../services/dairyService';
import { useToast } from '../../components/Toast';

const C = {
  bg: '#FEFAF5', card: '#FFFFFF', green: '#3A7D44', greenDk: '#2D6235',
  greenBg: '#DCFCE7', greenText: '#166534', amber: '#D97706', amberBg: '#FEF3C7',
  amberText: '#92400E', red: '#DC2626', redBg: '#FEF2F2', redText: '#B91C1C',
  border: '#E8D5C0', text: '#2C1810', muted: '#8B6B5A',
  shadow: '0 1px 3px rgba(44,24,16,0.08), 0 4px 12px rgba(44,24,16,0.06)',
};

const TYPES = [
  { value: 'milk',   emoji: '🥛', label: 'لبن' },
  { value: 'cheese', emoji: '🧀', label: 'جبنة' },
  { value: 'yogurt', emoji: '🫙', label: 'زبادي' },
  { value: 'butter', emoji: '🧈', label: 'زبدة' },
  { value: 'cream',  emoji: '🍦', label: 'قشطة' },
  { value: 'ghee',   emoji: '🫕', label: 'سمن' },
  { value: 'other',  emoji: '📦', label: 'أخرى' },
];

const UNITS = [
  { value: 'liter', label: 'لتر' },
  { value: 'kg',    label: 'كجم' },
  { value: 'piece', label: 'قطعة' },
  { value: 'pack',  label: 'عبوة' },
  { value: 'dozen', label: 'دزينة' },
];

const EMPTY = {
  name: '', type: 'milk', quantity: '', unit: 'liter',
  pricePerUnit: '', productionDate: '', expiryDate: '',
  description: '', deliveryAvailable: false, deliveryCost: '',
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

const SellerAddDairy = () => {
  const navigate = useNavigate();
  const toast    = useToast();

  const [form,     setForm]     = useState(EMPTY);
  const [images,   setImages]   = useState([]);
  const [previews, setPreviews] = useState([]);
  const [errors,   setErrors]   = useState({});
  const [saving,   setSaving]   = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  const handleImages = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())       e.name         = 'الاسم مطلوب';
    if (!form.quantity || Number(form.quantity) < 0)
                                 e.quantity      = 'الكمية مطلوبة';
    if (!form.pricePerUnit || Number(form.pricePerUnit) < 0)
                                 e.pricePerUnit  = 'السعر مطلوب';
    if (form.deliveryAvailable && !form.deliveryCost)
                                 e.deliveryCost  = 'أدخل تكلفة التوصيل';
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
      images.forEach(img => fd.append('images', img));

      await createDairy(fd);
      toast.success('تم إضافة المنتج بنجاح. في انتظار الموافقة.');
      navigate('/seller/dairy');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'فشل إضافة المنتج.');
    } finally {
      setSaving(false);
    }
  };

  const selectedType = TYPES.find(t => t.value === form.type);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0C4A6E 0%, #0E7490 55%, #0891B2 100%)', padding: '24px 32px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', right: -8, top: -20, fontSize: '110px', opacity: 0.07, lineHeight: 1, pointerEvents: 'none' }}>🥛</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="button" onClick={() => navigate('/seller/dairy')}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', backdropFilter: 'blur(4px)' }}>
            ← رجوع
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff' }}>إضافة منتج ألبان</h1>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>سيُراجع المنتج قبل النشر</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '28px 32px 56px', maxWidth: '700px', margin: '0 auto' }}>

        {/* Type selector */}
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px', marginBottom: '16px', boxShadow: C.shadow }}>
          <div style={labelStyle}>نوع المنتج</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {TYPES.map(t => (
              <button key={t.value} type="button"
                onClick={() => set('type', t.value)}
                style={{
                  padding: '10px 16px', borderRadius: '10px', border: `2px solid`,
                  borderColor: form.type === t.value ? C.green : C.border,
                  background: form.type === t.value ? C.greenBg : '#fff',
                  color: form.type === t.value ? C.greenText : C.muted,
                  fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Basic info */}
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px', marginBottom: '16px', boxShadow: C.shadow }}>
          <div style={{ fontSize: '15px', fontWeight: '800', color: C.text, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {selectedType?.emoji} معلومات المنتج
          </div>

          {/* Name */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>اسم المنتج <span style={{ color: C.red }}>*</span></label>
            <input
              style={{ ...inputStyle, borderColor: errors.name ? C.red : C.border }}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder={`مثال: ${selectedType?.label} بلدي طازج`}
            />
            {errors.name && <div style={{ color: C.red, fontSize: '12px', marginTop: '4px' }}>{errors.name}</div>}
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>وصف المنتج <span style={{ color: C.muted, fontWeight: '400' }}>(اختياري)</span></label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="أضف تفاصيل إضافية: مصدر المنتج، طريقة التحضير، مميزات خاصة…"
            />
          </div>
        </div>

        {/* Quantity & Price */}
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px', marginBottom: '16px', boxShadow: C.shadow }}>
          <div style={{ fontSize: '15px', fontWeight: '800', color: C.text, marginBottom: '16px' }}>📦 الكمية والسعر</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            {/* Quantity */}
            <div>
              <label style={labelStyle}>الكمية المتاحة <span style={{ color: C.red }}>*</span></label>
              <input
                type="number" min="0" step="0.01"
                style={{ ...inputStyle, borderColor: errors.quantity ? C.red : C.border }}
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
                placeholder="0"
              />
              {errors.quantity && <div style={{ color: C.red, fontSize: '12px', marginTop: '4px' }}>{errors.quantity}</div>}
            </div>

            {/* Unit */}
            <div>
              <label style={labelStyle}>وحدة القياس</label>
              <select style={inputStyle} value={form.unit} onChange={e => set('unit', e.target.value)}>
                {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>

          {/* Price per unit */}
          <div>
            <label style={labelStyle}>السعر لكل {UNITS.find(u => u.value === form.unit)?.label} <span style={{ color: C.red }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                type="number" min="0" step="0.01"
                style={{ ...inputStyle, paddingLeft: '52px', borderColor: errors.pricePerUnit ? C.red : C.border }}
                value={form.pricePerUnit}
                onChange={e => set('pricePerUnit', e.target.value)}
                placeholder="0.00"
              />
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: C.muted, fontWeight: '700' }}>ج.م</span>
            </div>
            {errors.pricePerUnit && <div style={{ color: C.red, fontSize: '12px', marginTop: '4px' }}>{errors.pricePerUnit}</div>}
          </div>
        </div>

        {/* Dates */}
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px', marginBottom: '16px', boxShadow: C.shadow }}>
          <div style={{ fontSize: '15px', fontWeight: '800', color: C.text, marginBottom: '16px' }}>📅 التواريخ</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>تاريخ الإنتاج <span style={{ color: C.muted, fontWeight: '400' }}>(اختياري)</span></label>
              <input type="date" style={inputStyle} value={form.productionDate} onChange={e => set('productionDate', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>تاريخ الانتهاء <span style={{ color: C.muted, fontWeight: '400' }}>(اختياري)</span></label>
              <input type="date" style={inputStyle} value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Delivery */}
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px', marginBottom: '16px', boxShadow: C.shadow }}>
          <div style={{ fontSize: '15px', fontWeight: '800', color: C.text, marginBottom: '16px' }}>🚚 التوصيل</div>

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
              {form.deliveryAvailable ? 'التوصيل متاح' : 'بدون توصيل (استلام من المزرعة)'}
            </span>
          </label>

          {form.deliveryAvailable && (
            <div>
              <label style={labelStyle}>تكلفة التوصيل (ج.م) <span style={{ color: C.red }}>*</span></label>
              <input
                type="number" min="0" step="0.5"
                style={{ ...inputStyle, borderColor: errors.deliveryCost ? C.red : C.border }}
                value={form.deliveryCost}
                onChange={e => set('deliveryCost', e.target.value)}
                placeholder="0"
              />
              {errors.deliveryCost && <div style={{ color: C.red, fontSize: '12px', marginTop: '4px' }}>{errors.deliveryCost}</div>}
            </div>
          )}
        </div>

        {/* Images */}
        <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '20px', marginBottom: '24px', boxShadow: C.shadow }}>
          <div style={{ fontSize: '15px', fontWeight: '800', color: C.text, marginBottom: '16px' }}>📷 صور المنتج <span style={{ color: C.muted, fontWeight: '400', fontSize: '13px' }}>(اختياري، حتى 5 صور)</span></div>

          <label style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            border: `2px dashed ${C.border}`, borderRadius: '12px', padding: '28px', cursor: 'pointer',
            background: '#FAFAF7', marginBottom: previews.length ? '12px' : 0,
          }}>
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImages} />
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: C.text }}>اضغط لاختيار الصور</div>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>PNG, JPG, WEBP — حتى 5 صور</div>
          </label>

          {previews.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {previews.map((src, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={src} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: `1px solid ${C.border}` }} />
                  <button type="button"
                    onClick={() => {
                      setImages(imgs => imgs.filter((_, j) => j !== i));
                      setPreviews(ps => ps.filter((_, j) => j !== i));
                    }}
                    style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: C.red, border: 'none', color: '#fff', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => navigate('/seller/dairy')}
            style={{ padding: '12px 24px', borderRadius: '10px', border: `1px solid ${C.border}`, background: '#fff', color: C.text, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            إلغاء
          </button>
          <button type="submit" disabled={saving}
            style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: saving ? '#9CA3AF' : C.green, color: '#fff', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'جاري الإضافة…' : '+ إضافة المنتج'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default SellerAddDairy;
