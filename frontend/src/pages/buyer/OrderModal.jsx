import { useState, useEffect } from 'react';
import { createOrder } from '../../services/orderService';
import { fmt, getImageUrl } from '../../utils/format';
import LocationPicker from '../../components/LocationPicker';
import { useLang } from '../../context/LangContext';

import { C } from '../../tokens';

const TYPE_META = {
  cattle: { emoji: '🐄', color: '#92400E', bg: '#FEF3C7', typeKey: 'herd.type.cattle' },
  sheep:  { emoji: '🐑', color: '#0369A1', bg: '#DBEAFE', typeKey: 'herd.type.sheep'  },
  goat:   { emoji: '🐐', color: '#166534', bg: '#DCFCE7', typeKey: 'herd.type.goat'   },
  camel:  { emoji: '🐫', color: '#9A3412', bg: '#FFEDD5', typeKey: 'herd.type.camel'  },
  horse:  { emoji: '🐎', color: '#5B21B6', bg: '#EDE9FE', typeKey: 'herd.type.horse'  },
  other:  { emoji: '🐾', color: '#374151', bg: '#F3F4F6', typeKey: 'herd.type.other'  },
};

const AVATAR_COLORS = ['#E17055','#00B894','#0984E3','#6C5CE7','#D4A017','#d63031','#74B9FF','#00CEC9'];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const initials    = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const parseError = (err) => {
  const data = err.response?.data;
  if (!data) return null; // caller will use t() fallback
  if (data.errors?.length) return data.errors[0].msg;
  return data.message || null;
};

// ─── Shared input style helper ────────────────────────────────────────────────
const inp = (extra = {}) => ({
  width: '100%', padding: '11px 14px', boxSizing: 'border-box',
  border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '14px',
  color: C.text, background: C.white, fontFamily: 'inherit',
  ...extra,
});

// ─── ProgressBar ─────────────────────────────────────────────────────────────
const ProgressBar = ({ step, tFn }) => {
  const STEPS = [
    { n: 1, labelKey: 'modal.step.details'  },
    { n: 2, labelKey: 'modal.step.payment'  },
    { n: 3, labelKey: 'modal.step.delivery' },
    { n: 4, labelKey: 'modal.step.confirm'  },
  ];
  return (
    <div>
      <div style={{ display: 'flex', gap: '5px', marginBottom: '6px' }}>
        {STEPS.map(s => (
          <div key={s.n} style={{ flex: 1, height: '5px', borderRadius: '3px', background: step >= s.n ? C.green : C.border, transition: 'background 0.35s ease' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '5px' }}>
        {STEPS.map(s => (
          <div key={s.n} style={{ flex: 1, textAlign: 'center', fontSize: '10px', fontWeight: step === s.n ? '700' : '500', color: step > s.n ? C.green : step === s.n ? C.text : C.border, transition: 'color 0.2s' }}>
            {step > s.n ? '✓ ' : `${s.n}. `}{tFn(s.labelKey)}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── TrustStrip ───────────────────────────────────────────────────────────────
const TrustStrip = ({ tFn }) => (
  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
    {[
      ['🔒', 'lst.trust.secure'],
      ['✅', 'lst.trust.verifiedSeller'],
      ['📞', 'lst.trust.directContact'],
      ['🛡', 'lst.trust.protected'],
    ].map(([icon, key]) => (
      <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: C.green, fontWeight: '700', background: C.greenLt, padding: '4px 9px', borderRadius: '20px', border: `1px solid ${C.green}30` }}>
        {icon} {tFn(key)}
      </span>
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const OrderModal = ({ listing, onClose, onSuccess }) => {
  const { t, isRTL } = useLang();
  const [step, setStep]           = useState(1);
  const autoDepositAmount = listing.depositRequired && listing.depositPercentage
    ? Math.round((listing.price || 0) * listing.depositPercentage / 100)
    : null;
  const [payment, setPayment]     = useState(() => listing.depositRequired
    ? { type: 'deposit', depositAmount: String(autoDepositAmount || ''), instapayRef: '' }
    : { type: 'cod', depositAmount: '', instapayRef: '' }
  );
  const [delivery, setDelivery]       = useState({ option: listing.deliveryType === 'none' ? 'pickup' : 'pickup', address: '', city: '', region: '', date: '', instructions: '' });
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [agreed, setAgreed]       = useState(false);
  const [submitting, setSubmit]   = useState(false);
  const [stepError, setStepError] = useState('');
  const isMobile                  = window.innerWidth < 600;

  // Delivery options driven by listing.deliveryType
  const DELIVERY_OPTIONS = (() => {
    const opts = [
      { id: 'pickup', label: `🚶 ${t('modal.deliv.pickup')}`,     sub: t('modal.deliv.pickupSub'),  extra: 0, days: t('modal.deliv.withSeller') }
    ];
    if (listing.deliveryType === 'farm') {
      opts.push({ id: 'farm',  label: `🚚 ${t('modal.deliv.farm')}`,    sub: t('modal.deliv.farmSub'),    extra: listing.deliveryCost || 0, days: t('modal.deliv.withSeller') });
    }
    if (listing.deliveryType === 'admin') {
      opts.push({ id: 'admin', label: `📦 ${t('modal.deliv.admin')}`, sub: t('modal.deliv.adminSub'), extra: listing.deliveryCost || 0, days: t('modal.deliv.adminDays') });
    }
    return opts;
  })();

  // Lock body scroll + ESC to close
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  // Derived
  const meta       = TYPE_META[listing.type] || TYPE_META.other;
  const seller     = listing.seller || {};
  const delivOpt   = DELIVERY_OPTIONS.find(d => d.id === delivery.option);
  const delivExtra = delivOpt?.extra ?? 0;
  const totalPrice = listing.price + delivExtra;
  const depositNum = Number(payment.depositAmount) || 0;

  // ── Navigation ──────────────────────────────────────────────────────────────
  const validate = () => {
    if (step === 2 && payment.type === 'instapay') {
      if (!payment.instapayRef.trim()) { setStepError(t('modal.err.instapayRef')); return false; }
    }
    if (step === 2 && payment.type === 'deposit') {
      const dep = Number(payment.depositAmount);
      if (!dep || dep <= 0)          { setStepError(t('modal.err.depositInvalid')); return false; }
      if (dep >= listing.price)      { setStepError(t('modal.err.depositTooHigh')); return false; }
    }
    if (step === 3) {
      if (delivery.option !== 'pickup') {
        if (!delivery.address.trim()) { setStepError(t('modal.err.addressRequired')); return false; }
        if (!delivery.city.trim())    { setStepError(t('modal.err.cityRequired')); return false; }
      }
      if (!delivery.date)             { setStepError(t('modal.err.dateRequired')); return false; }
    }
    setStepError('');
    return true;
  };

  const next = () => { if (validate()) setStep(p => p + 1); };
  const back = () => { setStepError(''); setStep(p => p - 1); };

  const submit = async () => {
    if (!agreed) { setStepError(t('modal.err.termsRequired')); return; }
    setSubmit(true); setStepError('');
    try {
      const noteParts = [
        delivery.option !== 'pickup' && `Address: ${delivery.address}, ${delivery.city}${delivery.region ? ', ' + delivery.region : ''}`,
        delivery.date                && `Preferred date: ${delivery.date}`,
        delivery.option !== 'pickup' && `Delivery: ${delivOpt?.label}`,
        delivery.instructions        && `Note: ${delivery.instructions}`,
        payment.type === 'instapay' && payment.instapayRef && `InstaPay Ref: ${payment.instapayRef}`,
      ].filter(Boolean);

      await createOrder({
        listingId:        listing._id,
        paymentType:      payment.type,
        depositAmount:    payment.type === 'deposit' ? depositNum : undefined,
        notes:            noteParts.join(' | ') || undefined,
        deliveryLocation: deliveryLocation?.lat != null ? deliveryLocation : undefined,
      });
      onSuccess();
    } catch (err) {
      const msg = parseError(err);
      setStepError(msg || t('modal.err.submitFailed'));
    } finally {
      setSubmit(false);
    }
  };

  // ══ STEP 1: Confirm Details ════════════════════════════════════════════════
  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Hero recap */}
      <div style={{ display: 'flex', gap: '14px', padding: '16px', background: '#F9F5F0', borderRadius: '14px', alignItems: 'center' }}>
        <div style={{ width: '84px', height: '72px', borderRadius: '12px', background: meta.bg, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>
          {listing.images?.length > 0
            ? <img src={getImageUrl(listing.images[0])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : meta.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ background: meta.bg, color: meta.color, fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '8px', display: 'inline-block', marginBottom: '5px' }}>
            {meta.emoji} {t(meta.typeKey)}
          </span>
          <div style={{ fontSize: '18px', fontWeight: '800', color: C.text, textTransform: 'capitalize', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {listing.breed || t(meta.typeKey)}
          </div>
          <div style={{ fontSize: '12px', color: C.muted, marginTop: '3px' }}>
            {listing.age} {t('common.month')} · {listing.weight} {t('common.kg')} · {listing.location || t('lst.unknown')}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: C.text, letterSpacing: '-0.5px', lineHeight: 1 }}>{fmt(listing.price)}</div>
          <div style={{ fontSize: '12px', color: C.muted }}>{t('common.egp')}</div>
        </div>
      </div>

      {/* Spec chips */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {[
          ['📅', t('lst.spec.age'),      `${listing.age} ${t('common.month')}`],
          ['⚖️', t('lst.spec.weight'),   `${listing.weight} ${t('common.kg')}`],
          ['📍', t('lst.spec.location'), listing.location || t('lst.unknown')],
          ['📞', t('modal.contact'),     seller.phone || t('modal.na')],
        ].map(([icon, label, val]) => (
          <div key={label} style={{ background: '#F9F5F0', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px', color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>{icon} {label}</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Seller */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 15px', background: C.greenLt, borderRadius: '12px', border: `1px solid ${C.green}30` }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: avatarColor(seller.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
          {initials(seller.name || '')}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>{seller.name || t('orders.seller')}</div>
          <div style={{ fontSize: '11px', color: C.muted }}>{t('modal.sellerOfListing')}</div>
        </div>
        <span style={{ background: '#DCFCE7', color: '#166534', fontSize: '11px', fontWeight: '700', padding: '4px 9px', borderRadius: '8px', flexShrink: 0 }}>✓ {t('buyer.browse.verified').replace(' ✓', '')}</span>
      </div>

      <TrustStrip tFn={t} />
    </div>
  );

  // ══ STEP 2: Payment Method ═════════════════════════════════════════════════
  const renderStep2 = () => {
    const dep = Number(payment.depositAmount) || 0;
    const isDeposit = payment.type === 'deposit';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* COD */}
        <label style={{ display: 'flex', gap: '13px', padding: '16px', border: `2px solid ${!isDeposit ? C.green : C.border}`, borderRadius: '14px', cursor: 'pointer', background: !isDeposit ? C.greenLt : C.white, transition: 'all 0.15s', alignItems: 'flex-start' }}>
          <input type="radio" name="pmt" value="cod" checked={!isDeposit}
            onChange={() => setPayment(p => ({ ...p, type: 'cod' }))}
            style={{ accentColor: C.green, flexShrink: 0, marginTop: '3px', cursor: 'pointer' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '15px', color: !isDeposit ? C.green : C.text, marginBottom: '4px' }}>💵 {t('cart.pay.cod')}</div>
            <div style={{ fontSize: '13px', color: C.muted, lineHeight: 1.55 }}>
              {t('modal.pay.codDesc')}
            </div>
            {!isDeposit && (
              <div style={{ marginTop: '10px', padding: '10px 12px', background: C.white, borderRadius: '9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: C.muted, fontWeight: '500' }}>{t('modal.pay.amountOnDelivery')}</span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: C.green }}>{fmt(listing.price)} {t('common.egp')}</span>
              </div>
            )}
          </div>
        </label>

        {/* Deposit notice */}
        {listing.depositRequired && autoDepositAmount && (
          <div style={{ padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '10px', fontSize: '13px', color: '#92400E', fontWeight: '600', marginBottom: '4px' }}>
            🏦 {t('modal.pay.depositRequired')} {listing.depositPercentage}% ({fmt(autoDepositAmount)} {t('common.egp')}) {t('modal.pay.depositReserve')}
          </div>
        )}

        {/* Deposit */}
        <label style={{ display: 'flex', gap: '13px', padding: '16px', border: `2px solid ${isDeposit ? C.green : C.border}`, borderRadius: '14px', cursor: 'pointer', background: isDeposit ? C.greenLt : C.white, transition: 'all 0.15s', alignItems: 'flex-start' }}>
          <input type="radio" name="pmt" value="deposit" checked={isDeposit}
            onChange={() => setPayment(p => ({ ...p, type: 'deposit', depositAmount: autoDepositAmount ? String(autoDepositAmount) : p.depositAmount }))}
            style={{ accentColor: C.green, flexShrink: 0, marginTop: '3px', cursor: 'pointer' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '15px', color: isDeposit ? C.green : C.text, marginBottom: '4px' }}>🏦 {t('modal.pay.depositTitle')}</div>
            <div style={{ fontSize: '13px', color: C.muted, lineHeight: 1.55 }}>
              {t('modal.pay.depositDesc')}
            </div>

            {isDeposit && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}
                onClick={e => e.preventDefault()}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{t('modal.pay.depositAmount')} ({t('common.egp')})</div>
                  <input
                    type="number" min="1" max={listing.price - 1} step="0.01"
                    placeholder={`${t('modal.pay.example')}: ${autoDepositAmount || Math.round(listing.price * 0.2)}`}
                    value={payment.depositAmount}
                    readOnly={!!autoDepositAmount}
                    onChange={e => !autoDepositAmount && setPayment(p => ({ ...p, depositAmount: e.target.value }))}
                    style={{ ...inp(), background: autoDepositAmount ? '#F9F5F0' : undefined }}
                  />
                  {autoDepositAmount && (
                    <div style={{ fontSize: '11px', color: '#92400E', marginTop: '4px' }}>
                      * {t('modal.pay.depositPreset')} ({listing.depositPercentage}% {t('modal.pay.depositOfTotal')})
                    </div>
                  )}
                </div>

                {dep > 0 && dep < listing.price && (
                  <div style={{ background: C.white, borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: C.muted }}>{t('modal.pay.depositNow')}</span>
                      <span style={{ fontWeight: '800', color: C.green }}>{fmt(dep)} {t('common.egp')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingTop: '7px', borderTop: `1px dashed ${C.border}` }}>
                      <span style={{ color: C.muted }}>{t('modal.pay.balanceOnDelivery')}</span>
                      <span style={{ fontWeight: '800', color: C.text }}>{fmt(listing.price - dep)} {t('common.egp')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '7px', borderTop: `1px solid ${C.border}` }}>
                      <span style={{ color: C.muted, fontWeight: '600' }}>{t('common.total')}</span>
                      <span style={{ fontWeight: '800', color: C.text }}>{fmt(listing.price)} {t('common.egp')}</span>
                    </div>
                  </div>
                )}

                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#92400E', lineHeight: 1.55 }}>
                  ℹ️ {t('modal.pay.depositTerms')}
                </div>
              </div>
            )}
          </div>
        </label>

        {/* InstaPay */}
        <label style={{ display: 'flex', gap: '13px', padding: '16px', border: `2px solid ${payment.type === 'instapay' ? C.green : C.border}`, borderRadius: '14px', cursor: 'pointer', background: payment.type === 'instapay' ? C.greenLt : C.white, transition: 'all 0.15s', alignItems: 'flex-start' }}>
          <input type="radio" name="pmt" value="instapay" checked={payment.type === 'instapay'}
            onChange={() => setPayment(p => ({ ...p, type: 'instapay' }))}
            style={{ accentColor: C.green, flexShrink: 0, marginTop: '3px', cursor: 'pointer' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '15px', color: payment.type === 'instapay' ? C.green : C.text, marginBottom: '4px' }}>📱 {t('cart.pay.instapay')}</div>
            <div style={{ fontSize: '13px', color: C.muted, lineHeight: 1.55 }}>
              {t('modal.pay.instapayDesc')}
            </div>
            {payment.type === 'instapay' && (
              <div style={{ marginTop: '12px' }} onClick={e => e.preventDefault()}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>{t('modal.pay.instapayRef')}</div>
                <input
                  type="text"
                  placeholder={t('cart.instaRefPlaceholder')}
                  value={payment.instapayRef}
                  onChange={e => setPayment(p => ({ ...p, instapayRef: e.target.value }))}
                  style={inp()}
                />
                <div style={{ marginTop: '8px', padding: '10px 12px', background: C.white, borderRadius: '9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: C.muted }}>{t('modal.pay.amountToTransfer')}</span>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: C.green }}>{fmt(listing.price)} {t('common.egp')}</span>
                </div>
              </div>
            )}
          </div>
        </label>

        {/* Security badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '13px 15px', background: C.greenLt, borderRadius: '12px', border: `1px solid ${C.green}30` }}>
          <span style={{ fontSize: '22px', flexShrink: 0, marginTop: '1px' }}>🛡</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: C.greenDk }}>{t('modal.pay.secureTitle')}</div>
            <div style={{ fontSize: '12px', color: C.green, marginTop: '2px', lineHeight: 1.5 }}>
              {t('modal.pay.secureBody')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ══ STEP 3: Delivery & Date ════════════════════════════════════════════════
  const renderStep3 = () => {
    const needsAddress = delivery.option !== 'pickup';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Delivery options */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{t('modal.deliv.method')}</div>
          {listing.deliveryType === 'none' ? (
            <div style={{ padding: '12px 14px', background: '#F0F7F1', borderRadius: '10px', border: `1px solid ${C.green}30`, fontSize: '13px', color: C.greenDk, fontWeight: '600' }}>
              🏠 {t('modal.deliv.pickupOnly')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {DELIVERY_OPTIONS.map(opt => (
                <label key={opt.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', border: `2px solid ${delivery.option === opt.id ? C.green : C.border}`, borderRadius: '12px', cursor: 'pointer', background: delivery.option === opt.id ? C.greenLt : C.white, transition: 'all 0.15s' }}>
                  <input type="radio" name="delivOpt" value={opt.id} checked={delivery.option === opt.id}
                    onChange={() => setDelivery(p => ({ ...p, option: opt.id }))}
                    style={{ accentColor: C.green, flexShrink: 0, cursor: 'pointer' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: delivery.option === opt.id ? C.green : C.text }}>{opt.label}</div>
                    <div style={{ fontSize: '11px', color: C.muted, marginTop: '1px' }}>{opt.sub} · {opt.days}</div>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: opt.extra === 0 ? C.green : C.text, flexShrink: 0 }}>
                    {opt.extra === 0 ? t('modal.deliv.free') : `+${fmt(opt.extra)} ${t('common.egp')}`}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Address form */}
        {needsAddress && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('modal.deliv.addressTitle')}</div>

            {/* Decorative map tile */}
            <div style={{ height: '96px', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: `1px solid ${C.border}`, background: 'linear-gradient(135deg, #DBEAFE 0%, #DCFCE7 60%, #FEF9C3 100%)' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(44,24,16,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(44,24,16,0.06) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '3px', background: 'rgba(255,255,255,0.75)', transform: 'translateY(-50%)' }} />
              <div style={{ position: 'absolute', left: '36%', top: 0, bottom: 0, width: '3px', background: 'rgba(255,255,255,0.75)' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px', zIndex: 1 }}>
                <span style={{ fontSize: '24px', lineHeight: 1 }}>📍</span>
                <div style={{ fontSize: '11px', fontWeight: '700', color: C.text, background: 'rgba(255,255,255,0.92)', padding: '3px 10px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}>
                  {delivery.city || t('modal.deliv.enterCity')}
                </div>
              </div>
            </div>

            <input placeholder={`${t('modal.deliv.streetAddress')} *`} value={delivery.address}
              onChange={e => setDelivery(p => ({ ...p, address: e.target.value }))}
              style={inp()} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input placeholder={`${t('modal.deliv.city')} *`} value={delivery.city}
                onChange={e => setDelivery(p => ({ ...p, city: e.target.value }))}
                style={inp()} />
              <input placeholder={t('modal.deliv.region')} value={delivery.region}
                onChange={e => setDelivery(p => ({ ...p, region: e.target.value }))}
                style={inp()} />
            </div>

            {/* Map location picker */}
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, marginBottom: '8px' }}>
                📍 {t('modal.deliv.mapTitle')}
                <span style={{ color: C.muted, fontWeight: '400', fontSize: '11px', marginRight: '6px' }}>({t('modal.deliv.mapHint')})</span>
              </div>
              <LocationPicker
                value={deliveryLocation}
                onChange={loc => {
                  setDeliveryLocation(loc);
                  if (loc?.address && !delivery.address) {
                    setDelivery(p => ({ ...p, address: loc.address }));
                  }
                }}
                label={t('modal.deliv.mapLabel')}
                height={240}
              />
            </div>
          </div>
        )}

        {/* Date picker */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            {delivery.option === 'pickup' ? `${t('modal.deliv.pickupDate')} *` : `${t('modal.deliv.deliveryDate')} *`}
          </div>
          <input type="date" min={tomorrow()} value={delivery.date}
            onChange={e => setDelivery(p => ({ ...p, date: e.target.value }))}
            style={inp()} />
          {delivOpt && (
            <div style={{ marginTop: '6px', fontSize: '12px', color: C.muted, display: 'flex', alignItems: 'center', gap: '5px' }}>
              📦 {t('modal.deliv.estimated')}: <strong style={{ color: C.text }}>{delivOpt.days}</strong> {t('modal.deliv.afterConfirm')}
            </div>
          )}
        </div>

        {/* Special instructions */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            {t('modal.deliv.instructions')}
            <span style={{ color: C.muted, fontWeight: '400', textTransform: 'none', fontSize: '11px', marginLeft: '6px' }}>({t('modal.optional')})</span>
          </div>
          <textarea rows={2} placeholder={t('modal.deliv.instructionsPlaceholder')}
            value={delivery.instructions}
            onChange={e => setDelivery(p => ({ ...p, instructions: e.target.value }))}
            style={inp({ resize: 'vertical' })} />
        </div>

        {/* Seller confirms note */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', background: '#FFFBEB', borderRadius: '10px', border: '1px solid #FDE68A' }}>
          <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>✅</span>
          <div style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.55 }}>
            <strong>{t('modal.deliv.sellerConfirmTitle')}.</strong> {t('modal.deliv.sellerConfirmBody')}
          </div>
        </div>
      </div>
    );
  };

  // ══ STEP 4: Review & Confirm ═══════════════════════════════════════════════
  const renderStep4 = () => {
    const dep = Number(payment.depositAmount) || 0;
    const total = listing.price + delivExtra;

    const rows = [
      { label: t('modal.sum.animal'),       val: `${listing.breed || t(meta.typeKey)}`,      bold: true  },
      { label: t('modal.sum.type'),         val: t(meta.typeKey),                              bold: false },
      { label: t('modal.sum.ageWeight'),    val: `${listing.age} ${t('common.month')} · ${listing.weight} ${t('common.kg')}`, bold: false },
      ...(listing.location ? [{ label: t('modal.sum.location'), val: listing.location, bold: false }] : []),
      null,
      { label: t('modal.sum.delivery'),     val: delivOpt?.label ?? '—',                       bold: false },
      ...(delivery.option !== 'pickup' && delivery.city
          ? [{ label: t('modal.sum.deliverTo'), val: `${delivery.address ? delivery.address + ', ' : ''}${delivery.city}${delivery.region ? ', ' + delivery.region : ''}`, bold: false }]
          : []),
      ...(deliveryLocation?.lat != null
          ? [{ label: '📍 Pin', val: `${deliveryLocation.lat.toFixed(5)}, ${deliveryLocation.lng.toFixed(5)}`, bold: false }]
          : []),
      ...(delivery.date ? [{ label: t('modal.sum.prefDate'), val: delivery.date, bold: false }] : []),
      null,
      { label: t('modal.sum.animalPrice'), val: `${fmt(listing.price)} ${t('common.egp')}`,    bold: false },
      ...(delivExtra > 0 ? [{ label: t('modal.sum.delivFee'), val: `+${fmt(delivExtra)} ${t('common.egp')}`, bold: false }] : []),
      null,
      ...(payment.type === 'deposit' && dep > 0
          ? [
              { label: t('modal.sum.depositNow'),     val: `${fmt(dep)} ${t('common.egp')}`,           bold: false },
              { label: t('modal.sum.balanceOnDelivery'), val: `${fmt(total - dep)} ${t('common.egp')}`, bold: false },
            ]
          : [
              { label: t('modal.sum.payMethod'),      val: t('cart.pay.cod'),                         bold: false },
            ]),
      { label: t('common.total'),           val: `${fmt(total)} ${t('common.egp')}`,                  bold: true  },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Summary table */}
        <div style={{ borderRadius: '14px', overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <div style={{ padding: '11px 16px', background: C.text, color: '#fff', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📋 {t('modal.sum.title')}
          </div>
          <div style={{ background: C.white }}>
            {rows.map((row, i) => {
              if (row === null) return <div key={i} style={{ height: '1px', background: C.border }} />;
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '9px 16px', background: row.bold ? C.greenLt : 'transparent' }}>
                  <span style={{ fontSize: row.bold ? '14px' : '12px', color: row.bold ? C.text : C.muted, fontWeight: row.bold ? '700' : '500', flexShrink: 0 }}>
                    {row.label}
                  </span>
                  <span style={{ fontSize: row.bold ? '15px' : '13px', color: row.bold ? C.green : C.text, fontWeight: row.bold ? '800' : '600', textAlign: 'right', textTransform: 'none' }}>
                    {row.val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '15px 16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            📦 {t('modal.timeline.title')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {[
              { icon: '✅', title: t('modal.timeline.confirmed'),  sub: t('modal.timeline.confirmedSub'),                           color: C.green },
              { icon: '📞', title: t('modal.timeline.sellerReview'), sub: t('modal.timeline.sellerReviewSub'),                     color: C.tan   },
              { icon: '🚚', title: delivOpt?.days ?? t('modal.deliv.withSeller'), sub: delivery.option === 'pickup' ? t('modal.timeline.pickupReady') : t('modal.timeline.deliveryArrives'), color: C.green },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px', flexShrink: 0 }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, marginTop: '4px' }} />
                  {i < 2 && <div style={{ width: '2px', background: C.border, flex: 1, minHeight: '18px', margin: '3px 0' }} />}
                </div>
                <div style={{ paddingBottom: i < 2 ? '6px' : '0' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{item.title}</div>
                  <div style={{ fontSize: '11px', color: C.muted, marginTop: '1px' }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Seller contact */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            {t('modal.sellerContact')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: avatarColor(seller.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
              {initials(seller.name || '')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>{seller.name || t('orders.seller')}</div>
              {seller.phone && <div style={{ fontSize: '12px', color: C.muted, marginTop: '1px' }}>📞 {seller.phone}</div>}
            </div>
            {seller.phone && (
              <a href={`https://wa.me/${seller.phone.replace(/\D/g, '')}`}
                target="_blank" rel="noreferrer"
                style={{ padding: '8px 14px', background: '#DCFCE7', color: '#166534', textDecoration: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '12px', flexShrink: 0, border: '1px solid #16653425' }}>
                💬 {t('orders.whatsapp')}
              </a>
            )}
          </div>
        </div>

        {/* Refund & cancellation policy */}
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            📜 {t('modal.policy.title')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              ['✅', t('modal.policy.line1')],
              ['⚠️', t('modal.policy.line2')],
              ['🚚', t('modal.policy.line3')],
              ['🛡', t('modal.policy.line4')],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', flexShrink: 0, marginTop: '0px' }}>{icon}</span>
                <span style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.55 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Terms */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '4px 0' }}>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
            style={{ width: '17px', height: '17px', accentColor: C.green, cursor: 'pointer', flexShrink: 0, marginTop: '1px' }} />
          <span style={{ fontSize: '13px', color: C.muted, lineHeight: 1.55, userSelect: 'none' }}>
            {t('modal.terms.agree')}{' '}
            <a href="/terms" target="_blank" rel="noreferrer" style={{ color: C.green, fontWeight: '700', textDecoration: 'none' }}>
              {t('modal.terms.link')}
            </a>.
            {' '}{t('modal.terms.note')}
          </span>
        </label>
      </div>
    );
  };

  // ── Panel positioning ────────────────────────────────────────────────────────
  const panelStyle = isMobile
    ? {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        maxHeight: '92vh', borderRadius: '24px 24px 0 0',
        background: C.white, zIndex: 201,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 -8px 40px rgba(44,24,16,0.2)',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      }
    : {
        position: 'fixed', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(560px, calc(100vw - 32px))',
        maxHeight: '90vh', borderRadius: '24px',
        background: C.white, zIndex: 201,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: C.shadowHv,
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      };

  const STEP_TITLES = [
    '',
    t('modal.title.step1'),
    t('modal.title.step2'),
    t('modal.title.step3'),
    t('modal.title.step4'),
  ];

  return (
    <>
      <style>{`
        @keyframes ffModalIn { from { opacity: 0; transform: translate(-50%, -46%); } to { opacity: 1; transform: translate(-50%, -50%); } }
        @keyframes ffDrawerIn { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.6)', zIndex: 200, backdropFilter: 'blur(2px)' }}
      />

      {/* Panel */}
      <div role="dialog" aria-modal="true" aria-labelledby="order-modal-title" dir={isRTL ? 'rtl' : 'ltr'}
        style={{ ...panelStyle, animation: isMobile ? 'ffDrawerIn 0.28s ease-out' : 'ffModalIn 0.22s ease-out' }}>

        {/* Handle (mobile only) */}
        {isMobile && (
          <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: C.border }} />
          </div>
        )}

        {/* Header */}
        <div style={{ padding: isMobile ? '8px 20px 0' : '22px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 id="order-modal-title" style={{ fontSize: '18px', fontWeight: '800', color: C.text, margin: 0, letterSpacing: '-0.3px' }}>
              {STEP_TITLES[step]}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.cancel')}
              style={{ background: '#F3EDE5', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: '20px', flexShrink: 0 }}
            ><span aria-hidden="true">×</span></button>
          </div>
          <ProgressBar step={step} tFn={t} />
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 20px' : '18px 24px' }}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          {stepError && (
            <div role="alert" style={{ marginTop: '12px', background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: '10px', padding: '11px 14px', color: '#B91C1C', fontSize: '13px', lineHeight: 1.5 }}>
              <span aria-hidden="true">⚠️ </span>{stepError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: isMobile ? '14px 20px 22px' : '16px 24px 22px', flexShrink: 0, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '11px', color: C.muted, textAlign: 'center', marginBottom: '10px', fontWeight: '600' }}>
            {t('modal.step')} {step} {t('modal.of')} 4
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {step > 1 && (
              <button type="button" onClick={back}
                style={{ flex: 1, padding: '13px', background: '#F3EDE5', color: C.text, border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
                ← {t('common.back')}
              </button>
            )}

            {step < 4 ? (
              <button type="button" onClick={next}
                style={{ flex: step > 1 ? 2 : 1, padding: '13px', background: C.green, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', letterSpacing: '-0.2px' }}
                onMouseEnter={e => e.currentTarget.style.background = C.greenDk}
                onMouseLeave={e => e.currentTarget.style.background = C.green}
              >
                {t('modal.continue')} →
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={submitting || !agreed}
                aria-busy={submitting || undefined}
                style={{ flex: 2, padding: '13px', background: submitting ? '#6AAF74' : !agreed ? '#A3C9A8' : C.green, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '800', cursor: submitting || !agreed ? 'not-allowed' : 'pointer', transition: 'background 0.15s', letterSpacing: '-0.2px' }}
                onMouseEnter={e => { if (!submitting && agreed) e.currentTarget.style.background = C.greenDk; }}
                onMouseLeave={e => { if (!submitting && agreed) e.currentTarget.style.background = C.green; }}
              >
                {submitting ? t('modal.placing') : `✓ ${t('cart.confirmOrder')}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderModal;
