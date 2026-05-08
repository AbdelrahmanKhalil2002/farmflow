import { useTheme } from '../context/ThemeContext';
import { useLang } from '../context/LangContext';
import {
  COLOR_SCHEMES, DENSITIES, FONT_SIZES,
  ICON_STYLES, TABLE_STYLES, CARD_STYLES,
  BORDER_RADII, FONT_FAMILIES, DEFAULT_THEME,
} from '../themes/presets';

const Row = ({ label, children }) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{
      fontSize: '11px', fontWeight: '700', color: '#9CA3AF',
      textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px',
    }}>
      {label}
    </div>
    {children}
  </div>
);

const OptionBtn = ({ active, onClick, style = {}, children }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '8px 6px', borderRadius: '8px', cursor: 'pointer',
      border: active ? '2px solid var(--primary, #3A7D44)' : '2px solid #E5E7EB',
      background: active ? 'var(--primary-light, #F0F7F1)' : '#FAFAFA',
      color: active ? 'var(--primary, #3A7D44)' : '#6B7280',
      fontWeight: '600', fontSize: '12px', fontFamily: 'inherit',
      transition: 'all 0.15s', lineHeight: 1.2,
      ...style,
    }}
  >
    {children}
  </button>
);

const isChanged = (theme) =>
  Object.keys(DEFAULT_THEME).some(k => theme[k] !== DEFAULT_THEME[k]);

// ── Live preview strip ──────────────────────────────────────────
const ThemePreview = ({ theme, isAr }) => {
  const scheme = COLOR_SCHEMES[theme.colorScheme] || COLOR_SCHEMES.green;
  const br     = BORDER_RADII[theme.borderRadius]?.value  || '10px';
  const shadow = { shadow: '0 2px 8px rgba(0,0,0,0.1)', flat: 'none', bordered: 'none' }[theme.cardStyle] || '0 2px 8px rgba(0,0,0,0.1)';
  const border = theme.cardStyle === 'bordered' ? `2px solid ${scheme.primary}` : `1px solid ${scheme.sidebarBorder}`;

  return (
    <div style={{
      marginBottom: '20px', borderRadius: '12px', overflow: 'hidden',
      border: '1px solid #E5E7EB',
    }}>
      {/* Mini sidebar */}
      <div style={{ display: 'flex', height: '88px' }}>
        <div style={{ width: '52px', background: scheme.sidebarBg, borderRight: `1px solid ${scheme.sidebarBorder}`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: '8px' }}>
          {[scheme.primary, scheme.dimColor, scheme.dimColor].map((c, i) => (
            <div key={i} style={{ width: '28px', height: i === 0 ? '8px' : '6px', borderRadius: '3px', background: i === 0 ? c : scheme.sidebarBorder }} />
          ))}
        </div>
        {/* Mini content */}
        <div style={{ flex: 1, background: scheme.mainBg, padding: '10px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {/* Mini card */}
          <div style={{ background: '#fff', borderRadius: br, boxShadow: shadow, border, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: scheme.primary, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: '6px', borderRadius: '3px', background: '#E5E7EB', marginBottom: '4px', width: '60%' }} />
              <div style={{ height: '5px', borderRadius: '3px', background: '#F3F4F6', width: '40%' }} />
            </div>
            <div style={{ padding: '3px 8px', borderRadius: br, background: scheme.primary, height: '18px' }} />
          </div>
          {/* Mini button row */}
          <div style={{ display: 'flex', gap: '5px' }}>
            <div style={{ padding: '4px 10px', borderRadius: br, background: scheme.primary, height: '18px', width: '48px' }} />
            <div style={{ padding: '4px 10px', borderRadius: br, background: scheme.primaryLight, border: `1px solid ${scheme.sidebarBorder}`, height: '18px', width: '36px' }} />
          </div>
        </div>
      </div>
      {/* Label */}
      <div style={{ padding: '6px 10px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', fontSize: '10px', fontWeight: '700', color: '#9CA3AF', textAlign: 'center', letterSpacing: '0.5px' }}>
        {isAr ? 'معاينة مباشرة' : 'Live Preview'}
      </div>
    </div>
  );
};

const ThemePanel = ({ compact = false }) => {
  const { theme, updateTheme } = useTheme();
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const changed = isChanged(theme);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }} dir={isAr ? 'rtl' : 'ltr'}>

      {/* ── Live preview ── */}
      <ThemePreview theme={theme} isAr={isAr} />

      {/* ── Color themes ── */}
      <Row label={isAr ? 'نظام الألوان' : 'Color Theme'}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {Object.entries(COLOR_SCHEMES).map(([key, scheme]) => (
            <button
              key={key}
              type="button"
              onClick={() => updateTheme({ colorScheme: key })}
              title={isAr ? scheme.nameAr : scheme.name}
              style={{
                padding: '10px 8px', borderRadius: '10px', cursor: 'pointer',
                border: theme.colorScheme === key
                  ? `2px solid ${scheme.primary}`
                  : '2px solid #E5E7EB',
                background: theme.colorScheme === key ? scheme.sidebarBg : '#FAFAFA',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                transition: 'all 0.15s', fontFamily: 'inherit',
              }}
            >
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: scheme.swatch,
                boxShadow: theme.colorScheme === key ? `0 0 0 3px ${scheme.swatch}33` : 'none',
                transition: 'box-shadow 0.15s',
              }} />
              <span style={{
                fontSize: '10px', fontWeight: '600',
                color: theme.colorScheme === key ? scheme.primary : '#9CA3AF',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
              }}>
                {isAr ? scheme.nameAr : scheme.name}
              </span>
            </button>
          ))}
        </div>
      </Row>

      {/* ── Mode ── */}
      <Row label={isAr ? 'المظهر العام' : 'Appearance Mode'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {[
            { key: 'light',  icon: '☀️',  label: isAr ? 'فاتح'     : 'Light'  },
            { key: 'dark',   icon: '🌙',  label: isAr ? 'داكن'     : 'Dark'   },
            { key: 'system', icon: '💻',  label: isAr ? 'تلقائي'   : 'System' },
          ].map(({ key, icon, label }) => (
            <OptionBtn
              key={key}
              active={theme.mode === key}
              onClick={() => updateTheme({ mode: key })}
              style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
            >
              <span>{icon}</span>{label}
            </OptionBtn>
          ))}
        </div>
      </Row>

      {/* ── Density ── */}
      <Row label={isAr ? 'كثافة العرض' : 'Display Density'}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {Object.entries(DENSITIES).map(([key, d]) => (
            <OptionBtn key={key} active={theme.density === key} onClick={() => updateTheme({ density: key })}>
              {isAr ? d.labelAr : d.label}
            </OptionBtn>
          ))}
        </div>
      </Row>

      {/* ── Font size ── */}
      <Row label={isAr ? 'حجم الخط' : 'Font Size'}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {Object.entries(FONT_SIZES).map(([key, f]) => (
            <OptionBtn
              key={key}
              active={theme.fontSize === key}
              onClick={() => updateTheme({ fontSize: key })}
              style={{ fontSize: f.size }}
            >
              {isAr ? f.labelAr : f.label}
            </OptionBtn>
          ))}
        </div>
      </Row>

      {/* ── Border radius ── */}
      <Row label={isAr ? 'نصف قطر الحواف' : 'Corner Style'}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {Object.entries(BORDER_RADII).map(([key, r]) => (
            <button
              key={key}
              type="button"
              onClick={() => updateTheme({ borderRadius: key })}
              style={{
                padding: '10px 6px', borderRadius: '8px', cursor: 'pointer',
                border: theme.borderRadius === key
                  ? '2px solid var(--primary, #3A7D44)'
                  : '2px solid #E5E7EB',
                background: theme.borderRadius === key ? 'var(--primary-light, #F0F7F1)' : '#FAFAFA',
                color: theme.borderRadius === key ? 'var(--primary, #3A7D44)' : '#6B7280',
                fontWeight: '600', fontSize: '12px', fontFamily: 'inherit',
                transition: 'all 0.15s', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '6px',
              }}
            >
              <div style={{
                width: '28px', height: '16px',
                borderRadius: r.value,
                border: `2px solid ${theme.borderRadius === key ? 'var(--primary, #3A7D44)' : '#9CA3AF'}`,
                background: 'transparent',
              }} />
              <span>{isAr ? r.labelAr : r.label}</span>
            </button>
          ))}
        </div>
      </Row>

      {/* ── Full mode only ── */}
      {!compact && (
        <>
          {/* Icon style */}
          <Row label={isAr ? 'أسلوب الأيقونات' : 'Icon Style'}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {Object.entries(ICON_STYLES).map(([key, s]) => (
                <OptionBtn key={key} active={theme.iconStyle === key} onClick={() => updateTheme({ iconStyle: key })}>
                  {isAr ? s.labelAr : s.label}
                </OptionBtn>
              ))}
            </div>
          </Row>

          {/* Table style */}
          <Row label={isAr ? 'أسلوب الجداول' : 'Table Style'}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {Object.entries(TABLE_STYLES).map(([key, s]) => (
                <OptionBtn key={key} active={theme.tableStyle === key} onClick={() => updateTheme({ tableStyle: key })}>
                  {isAr ? s.labelAr : s.label}
                </OptionBtn>
              ))}
            </div>
          </Row>

          {/* Card style */}
          <Row label={isAr ? 'أسلوب البطاقات' : 'Card Style'}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {Object.entries(CARD_STYLES).map(([key, s]) => (
                <OptionBtn key={key} active={theme.cardStyle === key} onClick={() => updateTheme({ cardStyle: key })}>
                  {isAr ? s.labelAr : s.label}
                </OptionBtn>
              ))}
            </div>
          </Row>

          {/* Font family */}
          <Row label={isAr ? 'عائلة الخط' : 'Font Family'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(FONT_FAMILIES).map(([key, f]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateTheme({ fontFamily: key })}
                  style={{
                    padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                    border: theme.fontFamily === key
                      ? '2px solid var(--primary, #3A7D44)'
                      : '2px solid #E5E7EB',
                    background: theme.fontFamily === key ? 'var(--primary-light, #F0F7F1)' : '#FAFAFA',
                    color: theme.fontFamily === key ? 'var(--primary, #3A7D44)' : '#6B7280',
                    fontWeight: '600', fontSize: '13px', fontFamily: f.value,
                    transition: 'all 0.15s', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', textAlign: isAr ? 'right' : 'left',
                  }}
                >
                  <span>{isAr ? f.labelAr : f.label}</span>
                  <span style={{ fontSize: '11px', opacity: 0.6, fontFamily: f.value }}>
                    {isAr ? 'أبجد هوز' : 'Aa Bb'}
                  </span>
                </button>
              ))}
            </div>
          </Row>
        </>
      )}

      {/* ── Reset button ── */}
      {changed && (
        <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => updateTheme(DEFAULT_THEME)}
            style={{
              padding: '7px 16px', borderRadius: '8px', cursor: 'pointer',
              border: '1.5px solid #E5E7EB', background: '#FAFAFA',
              color: '#6B7280', fontWeight: '600', fontSize: '12px',
              fontFamily: 'inherit', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.color = '#374151'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280'; }}
          >
            ↺ {isAr ? 'استعادة الافتراضي' : 'Reset to Default'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ThemePanel;
