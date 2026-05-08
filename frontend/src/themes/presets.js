export const COLOR_SCHEMES = {
  green: {
    name: 'Forest Green', nameAr: 'أخضر الغابة',
    swatch: '#3A7D44',
    sidebarBg: '#F0F7F1', sidebarBorder: '#D4E8D6',
    sidebarActiveBg: 'rgba(58,125,68,0.09)',
    primary: '#3A7D44', primaryDark: '#2D6235', primaryLight: '#F0F7F1',
    dimColor: '#4B6B4E', sidebarText: '#1A2E1C', mainBg: '#F7FBF7',
  },
  blue: {
    name: 'Ocean Blue', nameAr: 'أزرق المحيط',
    swatch: '#2563EB',
    sidebarBg: '#EFF6FF', sidebarBorder: '#BFDBFE',
    sidebarActiveBg: 'rgba(37,99,235,0.09)',
    primary: '#2563EB', primaryDark: '#1D4ED8', primaryLight: '#EFF6FF',
    dimColor: '#3B5EA6', sidebarText: '#1E3A5F', mainBg: '#F0F7FF',
  },
  purple: {
    name: 'Royal Purple', nameAr: 'بنفسجي ملكي',
    swatch: '#7C3AED',
    sidebarBg: '#F5F3FF', sidebarBorder: '#DDD6FE',
    sidebarActiveBg: 'rgba(124,58,237,0.09)',
    primary: '#7C3AED', primaryDark: '#6D28D9', primaryLight: '#F5F3FF',
    dimColor: '#6B5B99', sidebarText: '#2E1065', mainBg: '#FAF5FF',
  },
  orange: {
    name: 'Sunset Orange', nameAr: 'برتقالي الغروب',
    swatch: '#EA580C',
    sidebarBg: '#FFF7ED', sidebarBorder: '#FED7AA',
    sidebarActiveBg: 'rgba(234,88,12,0.09)',
    primary: '#EA580C', primaryDark: '#C2410C', primaryLight: '#FFF7ED',
    dimColor: '#9A5B3A', sidebarText: '#431407', mainBg: '#FFFBF5',
  },
  teal: {
    name: 'Deep Teal', nameAr: 'فيروزي',
    swatch: '#0D9488',
    sidebarBg: '#F0FDFA', sidebarBorder: '#99F6E4',
    sidebarActiveBg: 'rgba(13,148,136,0.09)',
    primary: '#0D9488', primaryDark: '#0F766E', primaryLight: '#F0FDFA',
    dimColor: '#2D7A74', sidebarText: '#134E4A', mainBg: '#F5FFFD',
  },
  midnight: {
    name: 'Midnight', nameAr: 'منتصف الليل',
    swatch: '#334155',
    sidebarBg: '#1E293B', sidebarBorder: '#334155',
    sidebarActiveBg: 'rgba(96,165,250,0.15)',
    primary: '#60A5FA', primaryDark: '#3B82F6', primaryLight: 'rgba(96,165,250,0.1)',
    dimColor: '#94A3B8', sidebarText: '#E2E8F0', mainBg: '#0F172A',
  },
};

export const DENSITIES = {
  compact:     { label: 'Compact',     labelAr: 'مضغوط',   navPadding: '7px 10px',  fontSize: '13px' },
  comfortable: { label: 'Comfortable', labelAr: 'مريح',    navPadding: '10px 12px', fontSize: '14px' },
  spacious:    { label: 'Spacious',    labelAr: 'واسع',    navPadding: '14px 16px', fontSize: '15px' },
};

export const FONT_SIZES = {
  small:  { label: 'Small',  labelAr: 'صغير', size: '13px' },
  normal: { label: 'Normal', labelAr: 'عادي', size: '14px' },
  large:  { label: 'Large',  labelAr: 'كبير', size: '16px' },
};

export const ICON_STYLES = {
  rounded: { label: 'Rounded', labelAr: 'مدوّر'  },
  sharp:   { label: 'Sharp',   labelAr: 'حاد'    },
  outline: { label: 'Outline', labelAr: 'خطوط'   },
};

export const TABLE_STYLES = {
  default:    { label: 'Default',    labelAr: 'افتراضي'   },
  striped:    { label: 'Striped',    labelAr: 'مخطط'      },
  borderless: { label: 'Borderless', labelAr: 'بدون حدود' },
};

export const CARD_STYLES = {
  shadow:   { label: 'Shadow',   labelAr: 'ظل'    },
  flat:     { label: 'Flat',     labelAr: 'مسطح'  },
  bordered: { label: 'Bordered', labelAr: 'محدود' },
};

export const FONT_FAMILIES = {
  cairo:   { label: 'Cairo',           labelAr: 'Cairo',          value: "'Cairo', 'Tajawal', sans-serif" },
  system:  { label: 'System UI',       labelAr: 'نظام التشغيل',  value: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  ibm:     { label: 'IBM Plex Arabic', labelAr: 'IBM Plex',       value: "'IBM Plex Arabic', 'Cairo', sans-serif" },
};

export const BORDER_RADII = {
  sharp:   { label: 'Sharp',   labelAr: 'حاد',      value: '4px'  },
  rounded: { label: 'Rounded', labelAr: 'مدوّر',    value: '10px' },
  pill:    { label: 'Pill',    labelAr: 'بيضاوي',   value: '20px' },
};

export const DEFAULT_THEME = {
  colorScheme:  'green',
  mode:         'light',
  density:      'comfortable',
  fontSize:     'normal',
  iconStyle:    'rounded',
  tableStyle:   'default',
  cardStyle:    'shadow',
  borderRadius: 'rounded',
  fontFamily:   'cairo',
};
