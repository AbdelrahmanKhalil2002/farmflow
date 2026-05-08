import { createContext, useContext, useState, useEffect } from 'react';
import { COLOR_SCHEMES, DENSITIES, FONT_SIZES, BORDER_RADII, FONT_FAMILIES, DEFAULT_THEME as DEFAULT } from '../themes/presets';

const ThemeContext = createContext({
  theme: DEFAULT,
  updateTheme: () => {},
  resolvedMode: 'light',
});

const getSystemMode = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('farmflow_theme');
      return saved ? { ...DEFAULT, ...JSON.parse(saved) } : DEFAULT;
    } catch {
      return DEFAULT;
    }
  });

  const [systemMode, setSystemMode] = useState(getSystemMode);

  // track OS dark/light changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemMode(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedMode = theme.mode === 'system' ? systemMode : theme.mode;

  useEffect(() => {
    const scheme  = COLOR_SCHEMES[theme.colorScheme] || COLOR_SCHEMES.green;
    const density = DENSITIES[theme.density]         || DENSITIES.comfortable;
    const root    = document.documentElement;

    root.style.setProperty('--sidebar-bg',           scheme.sidebarBg);
    root.style.setProperty('--sidebar-border',       scheme.sidebarBorder);
    root.style.setProperty('--sidebar-active-bg',    scheme.sidebarActiveBg);
    root.style.setProperty('--sidebar-active-color', scheme.primary);
    root.style.setProperty('--sidebar-dim-color',    scheme.dimColor);
    root.style.setProperty('--sidebar-text',         scheme.sidebarText);
    root.style.setProperty('--main-bg',              scheme.mainBg);
    root.style.setProperty('--primary',              scheme.primary);
    root.style.setProperty('--primary-dark',         scheme.primaryDark);
    root.style.setProperty('--primary-light',        scheme.primaryLight);

    root.style.setProperty('--nav-link-padding', density.navPadding);
    root.style.setProperty('--font-size-base',   FONT_SIZES[theme.fontSize]?.size || '14px');

    const cardShadow  = { shadow: '0 2px 8px rgba(0,0,0,0.08)', flat: 'none', bordered: 'none' };
    const cardBorderW = { shadow: '1px', flat: '1px', bordered: '2px' };
    root.style.setProperty('--card-shadow',   cardShadow[theme.cardStyle]   || cardShadow.shadow);
    root.style.setProperty('--card-border-w', cardBorderW[theme.cardStyle] || '1px');

    root.setAttribute('data-table', theme.tableStyle);
    root.setAttribute('data-icon', theme.iconStyle || 'rounded');

    const br = BORDER_RADII[theme.borderRadius]?.value || '10px';
    root.style.setProperty('--radius-base', br);
    root.style.setProperty('--radius-sm',   br === '20px' ? '12px' : br === '4px' ? '2px' : '6px');
    root.style.setProperty('--radius-lg',   br === '4px'  ? '6px'  : br === '20px' ? '28px' : '16px');

    const ff = FONT_FAMILIES[theme.fontFamily]?.value || FONT_FAMILIES.cairo.value;
    root.style.setProperty('--font-family', ff);
    document.body.style.fontFamily = ff;

    if (resolvedMode === 'dark') {
      root.setAttribute('data-theme', 'dark');
      // Layout vars
      root.style.setProperty('--main-bg',          '#0F172A');
      root.style.setProperty('--sidebar-bg',        '#1E293B');
      root.style.setProperty('--sidebar-border',    '#334155');
      root.style.setProperty('--sidebar-text',      '#E2E8F0');
      root.style.setProperty('--sidebar-dim-color', '#94A3B8');
      root.style.setProperty('--sidebar-active-bg', 'rgba(96,165,250,0.15)');
      // Content tokens (used by tokens.js → pages)
      root.style.setProperty('--bg-page',          '#0F172A');
      root.style.setProperty('--bg-card',          '#1E293B');
      root.style.setProperty('--bg-subtle',        '#0F172A');
      root.style.setProperty('--bg-input',         '#0F172A');
      root.style.setProperty('--text-primary',     '#E2E8F0');
      root.style.setProperty('--text-muted',       '#94A3B8');
      root.style.setProperty('--text-dim',         '#64748B');
      root.style.setProperty('--border',           '#334155');
      root.style.setProperty('--border-subtle',    '#1E293B');
      root.style.setProperty('--shadow',           '0 1px 3px rgba(0,0,0,0.3), 0 4px 14px rgba(0,0,0,0.2)');
      root.style.setProperty('--shadow-md',        '0 4px 20px rgba(0,0,0,0.35)');
      root.style.setProperty('--shadow-hv',        '0 8px 30px rgba(0,0,0,0.4)');
      root.style.setProperty('--primary-border',   '#166534');
      root.style.setProperty('--primary-text',     '#86EFAC');
    } else {
      root.removeAttribute('data-theme');
      // Re-apply scheme colors
      root.style.setProperty('--main-bg',          scheme.mainBg);
      root.style.setProperty('--sidebar-bg',        scheme.sidebarBg);
      root.style.setProperty('--sidebar-border',    scheme.sidebarBorder);
      root.style.setProperty('--sidebar-text',      scheme.sidebarText);
      root.style.setProperty('--sidebar-dim-color', scheme.dimColor);
      // Content tokens — warm earthy light mode defaults
      root.style.setProperty('--bg-page',      '#F8F4EE');
      root.style.setProperty('--bg-card',      '#FFFFFF');
      root.style.setProperty('--bg-subtle',    '#F9FAFB');
      root.style.setProperty('--bg-input',     '#FFFFFF');
      root.style.setProperty('--text-primary', '#2C1810');
      root.style.setProperty('--text-muted',   '#8B6B5A');
      root.style.setProperty('--text-dim',     '#9CA3AF');
      root.style.setProperty('--border',       '#E8D5C0');
      root.style.setProperty('--border-subtle','#F3F4F6');
      root.style.setProperty('--shadow',       '0 1px 3px rgba(44,24,16,0.07), 0 4px 14px rgba(44,24,16,0.06)');
      root.style.setProperty('--shadow-md',    '0 4px 20px rgba(44,24,16,0.10)');
      root.style.setProperty('--shadow-hv',    '0 8px 30px rgba(44,24,16,0.14)');
      root.style.setProperty('--primary-border', scheme.sidebarBorder);
      root.style.setProperty('--primary-text',   scheme.sidebarText);
    }

    localStorage.setItem('farmflow_theme', JSON.stringify(theme));
  }, [theme, resolvedMode]);

  const updateTheme = (updates) => setTheme(prev => ({ ...prev, ...updates }));

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resolvedMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
