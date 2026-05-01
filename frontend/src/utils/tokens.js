/**
 * FarmFlow Design Tokens
 *
 * Two themes:
 *   LIGHT — buyer & seller pages (warm, marketplace feel)
 *   DARK  — admin pages (professional, data-dense)
 *
 * Import the theme your layout needs and pass it to <ThemeProvider>.
 */

export const LIGHT = {
  // Backgrounds
  bg:           '#F7FBF7',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F0F7F1',
  surfaceHover: '#E8F5EA',
  overlay:      'rgba(0,0,0,0.45)',

  // Borders
  border:       '#D4E8D6',
  borderFocus:  '#3A7D44',
  borderError:  '#FCA5A5',

  // Text
  text:         '#1A2E1C',
  textSub:      '#4B6B4E',
  textMuted:    '#7A9B7E',
  textPlaceholder: '#9EB8A1',

  // Primary green
  green:        '#3A7D44',
  greenDark:    '#2D6235',
  greenLight:   '#E8F5EA',
  greenBg:      'rgba(58,125,68,0.08)',

  // Semantic
  red:          '#DC2626',
  redLight:     '#FEF2F2',
  redBorder:    '#FECACA',

  amber:        '#D97706',
  amberLight:   '#FFFBEB',
  amberBorder:  '#FDE68A',

  blue:         '#2563EB',
  blueLight:    '#EFF6FF',
  blueBorder:   '#BFDBFE',

  slate:        '#64748B',
  slateLight:   '#F8FAFC',
  slateBorder:  '#E2E8F0',

  purple:       '#7C3AED',
  purpleLight:  '#F5F3FF',

  // Shadows
  shadow:       '0 1px 3px rgba(26,46,28,0.07), 0 1px 2px rgba(26,46,28,0.04)',
  shadowMd:     '0 4px 12px rgba(26,46,28,0.10), 0 2px 4px rgba(26,46,28,0.06)',
  shadowLg:     '0 10px 28px rgba(26,46,28,0.14), 0 4px 8px rgba(26,46,28,0.06)',
  shadowHover:  '0 8px 20px rgba(26,46,28,0.13), 0 3px 6px rgba(26,46,28,0.07)',

  // Radius (shared)
  radius:       '10px',
  radiusSm:     '7px',
  radiusLg:     '14px',
  radiusFull:   '9999px',
};

export const DARK = {
  // Backgrounds
  bg:           '#0B1410',
  surface:      '#0D1A14',
  surfaceAlt:   '#0D1117',
  surfaceHover: 'rgba(255,255,255,0.04)',
  overlay:      'rgba(0,0,0,0.65)',

  // Borders
  border:       'rgba(255,255,255,0.06)',
  borderFocus:  '#22C55E',
  borderError:  'rgba(239,68,68,0.35)',

  // Text
  text:         '#F1F5F9',
  textSub:      '#CBD5E1',
  textMuted:    '#64748B',
  textPlaceholder: '#4B6358',

  // Primary green
  green:        '#22C55E',
  greenDark:    '#16A34A',
  greenLight:   'rgba(34,197,94,0.12)',
  greenBg:      'rgba(34,197,94,0.08)',

  // Semantic
  red:          '#EF4444',
  redLight:     'rgba(239,68,68,0.10)',
  redBorder:    'rgba(239,68,68,0.28)',

  amber:        '#F59E0B',
  amberLight:   'rgba(245,158,11,0.10)',
  amberBorder:  'rgba(245,158,11,0.28)',

  blue:         '#3B82F6',
  blueLight:    'rgba(59,130,246,0.10)',
  blueBorder:   'rgba(59,130,246,0.28)',

  slate:        '#94A3B8',
  slateLight:   'rgba(148,163,184,0.08)',
  slateBorder:  'rgba(148,163,184,0.20)',

  purple:       '#A855F7',
  purpleLight:  'rgba(168,85,247,0.10)',

  // Shadows
  shadow:       '0 1px 3px rgba(0,0,0,0.3)',
  shadowMd:     '0 4px 12px rgba(0,0,0,0.4)',
  shadowLg:     '0 10px 28px rgba(0,0,0,0.5)',
  shadowHover:  '0 8px 24px rgba(0,0,0,0.5)',

  // Radius (shared)
  radius:       '10px',
  radiusSm:     '7px',
  radiusLg:     '14px',
  radiusFull:   '9999px',
};
