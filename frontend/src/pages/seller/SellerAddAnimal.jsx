import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAnimal } from '../../services/animalService';

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
  textMuted:'#6B8F71',
  shadow:   '0 2px 8px rgba(26,46,28,0.08)',
  red:      '#DC2626',
  redBg:    '#FEF2F2',
  amberBg:  '#FEF9C3',
  amberText:'#92400E',
};

const TYPES = [
  { val: 'sheep',   label: 'أغنام',   emoji: '🐑' },
  { val: 'cattle',  label: 'بقر',     emoji: '🐄' },
  { val: 'goat',    label: 'ماعز',    emoji: '🐐' },
  { val: 'buffalo', label: 'جاموس',   emoji: '🐃' },
  { val: 'camel',   label: 'إبل',     emoji: '🐪' },
  { val: 'horse',   label: 'خيول',    emoji: '🎠' },
  { val: 'poultry', label: 'دواجن',   emoji: '🐔' },
  { val: 'rabbit',  label: 'أرانب',   emoji: '🐇' },
  { val: 'other',   label: 'أخرى',    emoji: '🐾' },
];

const HEALTH_OPTIONS = [
  { val: 'healthy',    label: 'بصحة جيدة', color: '#16A34A' },
  { val: 'sick',       label: 'مريض',       color: '#DC2626' },
  { val: 'quarantine', label: 'حجر صحي',    color: '#D97706' },
];

const PREGNANCY_OPTIONS = [
  { val: 'none',                label: 'غير حامل',    color: '#6B7280' },
  { val: 'pregnant',            label: '🤰 حامل',      color: '#D97706' },
  { val: 'recently_gave_birth', label: '🐣 وضعت مؤخرًا', color: '#16A34A' },
];

const Lbl = ({ children, req }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
    {children}{req && <span style={{ color: C.red, marginRight: 2 }}>*</span>}
  </label>
);

const FocusInput = ({ style, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: `1.5px solid ${focused ? C.green : C.border}`, background: '#fff', fontSize: 14, color: C.text, outline: 'none', transition: 'border-color 0.15s', fontFamily: 'inherit', ...style }}
    />
  );
};

const ErrMsg = ({ msg }) => msg ? <p style={{ color: C.red, fontSize: 12, margin: '4px 0 0' }}>{msg}</p> : null;

const SellerAddAnimal = () => {
  const navigate = useNavigate();
  const photoInputRef = useRef(null);

  const [form, setForm] = useState({
    type: 'sheep', breed: '', gender: 'unknown',
    tagId: '', dob: '', color: '',
    currentWeight: '', healthStatus: 'healthy',
    notes: '',
    pregnancyStatus: 'none', pregnancyDate: '', expectedBirthDate: '', birthCount: '',
  });
  const [photoFiles,    setPhotoFiles]    = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [dragOver,      setDragOver]      = useState(false);
  const [errors,        setErrors]        = useState({});
  const [submitErr,     setSubmitErr]     = useState('');
  const [submitting,    setSubmitting]    = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.type) e.type = 'اختر نوع الحيوان';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePhotos = (files) => {
    const valid = [...files].filter(f => f.type.startsWith('image/')).slice(0, 4 - photoFiles.length);
    setPhotoFiles(p => [...p, ...valid]);
    valid.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setPhotoPreviews(p => [...p, e.target.result]);
      reader.readAsDataURL(f);
    });
  };

  const removePhoto = (i) => {
    setPhotoFiles(p => p.filter((_, idx) => idx !== i));
    setPhotoPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitErr('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null) fd.append(k, v); });
      photoFiles.forEach(f => fd.append('images', f));
      await createAnimal(fd);
      navigate('/seller/herd');
    } catch (err) {
      setSubmitErr(err?.response?.data?.message || 'حدث خطأ. حاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", maxWidth: 680, margin: '0 auto' }} dir="rtl">
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenDk} 100%)`, borderRadius: 16, padding: '20px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', right: -10, top: -20, fontSize: 110, opacity: 0.06, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>🐾</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>إضافة حيوان جديد 🐾</h1>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>سجّل حيوانًا جديدًا في قطيعك</p>
          </div>
          <button type="button" onClick={() => navigate('/seller/herd')}
            style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ← العودة للقطيع
          </button>
        </div>
      </div>

      <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Type picker */}
        <div>
          <Lbl req>نوع الحيوان</Lbl>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TYPES.map(t => {
              const active = form.type === t.val;
              return (
                <button key={t.val} type="button" onClick={() => set('type', t.val)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 14px', borderRadius: 12, border: `2px solid ${active ? C.green : C.border}`, background: active ? C.greenLt : C.card, cursor: 'pointer', transition: 'all 0.15s', minWidth: 68 }}>
                  <span style={{ fontSize: 22 }}>{t.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? C.green : C.muted }}>{t.label}</span>
                </button>
              );
            })}
          </div>
          <ErrMsg msg={errors.type} />
        </div>

        {/* Breed + Tag row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Lbl>السلالة</Lbl>
            <FocusInput value={form.breed} onChange={e => set('breed', e.target.value)} placeholder="مثال: بلدي، عواسي…" />
          </div>
          <div>
            <Lbl>رقم الأذن / الوسم</Lbl>
            <FocusInput value={form.tagId} onChange={e => set('tagId', e.target.value)} placeholder="مثال: A-001" />
          </div>
        </div>

        {/* Gender + DOB row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Lbl>الجنس</Lbl>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['male','♂ ذكر'],['female','♀ أنثى'],['unknown','غير محدد']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set('gender', v)}
                  style={{ flex: 1, padding: '10px 8px', borderRadius: 9, border: `1.5px solid ${form.gender === v ? C.green : C.border}`, background: form.gender === v ? C.greenLt : C.card, fontSize: 12, fontWeight: form.gender === v ? 700 : 500, color: form.gender === v ? C.green : C.muted, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Lbl>تاريخ الميلاد</Lbl>
            <FocusInput type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
          </div>
        </div>

        {/* Weight + Color row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Lbl>الوزن الحالي (كجم)</Lbl>
            <div style={{ position: 'relative' }}>
              <FocusInput type="number" min="0" step="0.1" value={form.currentWeight} onChange={e => set('currentWeight', e.target.value)} placeholder="مثال: 45" style={{ paddingLeft: 60 }} />
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: C.textMuted, pointerEvents: 'none' }}>كجم</span>
            </div>
          </div>
          <div>
            <Lbl>اللون / المظهر</Lbl>
            <FocusInput value={form.color} onChange={e => set('color', e.target.value)} placeholder="مثال: أبيض، بني فاتح…" />
          </div>
        </div>

        {/* Health status */}
        <div>
          <Lbl>الحالة الصحية</Lbl>
          <div style={{ display: 'flex', gap: 10 }}>
            {HEALTH_OPTIONS.map(h => (
              <button key={h.val} type="button" onClick={() => set('healthStatus', h.val)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${form.healthStatus === h.val ? h.color : C.border}`, background: form.healthStatus === h.val ? `${h.color}15` : C.card, color: form.healthStatus === h.val ? h.color : C.muted, fontSize: 13, fontWeight: form.healthStatus === h.val ? 800 : 500, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pregnancy (females only) */}
        {form.gender === 'female' && (
          <div style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: 12, padding: '16px 18px' }}>
            <Lbl>حالة الحمل</Lbl>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PREGNANCY_OPTIONS.map(p => {
                const active = form.pregnancyStatus === p.val;
                return (
                  <button key={p.val} type="button" onClick={() => set('pregnancyStatus', p.val)}
                    style={{ padding: '9px 16px', borderRadius: 10, border: `2px solid ${active ? p.color : '#FED7AA'}`, background: active ? `${p.color}18` : '#fff', color: active ? p.color : '#92400E', fontSize: 13, fontWeight: active ? 800 : 500, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                    {p.label}
                  </button>
                );
              })}
            </div>

            {form.pregnancyStatus === 'pregnant' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <Lbl>تاريخ بداية الحمل</Lbl>
                  <FocusInput type="date" value={form.pregnancyDate} onChange={e => set('pregnancyDate', e.target.value)} />
                </div>
                <div>
                  <Lbl>الموعد المتوقع للولادة</Lbl>
                  <FocusInput type="date" value={form.expectedBirthDate} onChange={e => set('expectedBirthDate', e.target.value)} />
                </div>
              </div>
            )}

            {form.pregnancyStatus === 'recently_gave_birth' && (
              <div style={{ marginTop: 12, maxWidth: 200 }}>
                <Lbl>عدد المواليد</Lbl>
                <FocusInput type="number" min="0" step="1" value={form.birthCount} onChange={e => set('birthCount', e.target.value)} placeholder="مثال: 1" />
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <Lbl>ملاحظات</Lbl>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="أي ملاحظات إضافية عن الحيوان…"
            rows={3}
            dir="rtl"
            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: 14, color: C.text, resize: 'vertical', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = C.green}
            onBlur={e => e.target.style.borderColor = C.border}
          />
        </div>

        {/* Photo upload */}
        <div>
          <Lbl>صور الحيوان <span style={{ fontWeight: 400, color: C.textMuted, fontSize: 11 }}>(حتى 4 صور — اختياري)</span></Lbl>
          <div
            onClick={() => photoInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handlePhotos(e.dataTransfer.files); }}
            style={{ border: `2px dashed ${dragOver ? C.green : C.border}`, borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer', background: dragOver ? C.greenLt : '#FAFAFA', transition: 'all 0.15s' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
            <div style={{ fontSize: 13, color: C.muted }}>اسحب الصور هنا أو <span style={{ color: C.green, fontWeight: 700 }}>اختر من الجهاز</span></div>
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handlePhotos(e.target.files)} />

          {photoPreviews.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {photoPreviews.map((src, i) => (
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
          <button type="button" onClick={() => navigate('/seller/herd')}
            style={{ padding: '12px 20px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            إلغاء
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: submitting ? '#A7C4AD' : C.green, color: '#fff', fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
            {submitting ? 'جاري الحفظ…' : 'حفظ الحيوان ✓'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerAddAnimal;
