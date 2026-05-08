/**
 * Shared design tokens — all values are CSS variables so ThemeContext
 * can swap them for dark mode / color scheme changes at runtime.
 *
 * Pages import this and remove their local `const C = { ... }`.
 * Page-specific semantic colors (animal types, expense categories, etc.)
 * stay local in each page.
 */

export const C = {
  // ── Backgrounds ──────────────────────────────────────────────
  bg:       'var(--bg-page,   #F8F4EE)',
  card:     'var(--bg-card,   #FFFFFF)',
  white:    'var(--bg-card,   #FFFFFF)',
  card2:    'var(--bg-subtle, #F9FAFB)',
  panel:    'var(--bg-subtle, #F9FAFB)',

  // ── Text ─────────────────────────────────────────────────────
  text:     'var(--text-primary, #2C1810)',
  muted:    'var(--text-muted,   #8B6B5A)',
  midMuted: 'var(--text-dim,     #9CA3AF)',
  textMuted:'var(--text-muted,   #8B6B5A)',
  textDim:  'var(--text-dim,     #9CA3AF)',
  textMid:  'var(--text-dim,     #9CA3AF)',
  slate:    'var(--text-dim,     #64748B)',
  tan:      'var(--text-muted,   #C49A6C)',

  // ── Borders ───────────────────────────────────────────────────
  border:   'var(--border,        #E8D5C0)',
  border2:  'var(--border-subtle, #F3F4F6)',

  // ── Shadows ───────────────────────────────────────────────────
  shadow:   'var(--shadow,    0 1px 3px rgba(0,0,0,0.07), 0 4px 14px rgba(0,0,0,0.06))',
  shadowMd: 'var(--shadow-md, 0 4px 20px rgba(0,0,0,0.10))',
  shadowHv: 'var(--shadow-hv, 0 8px 30px rgba(0,0,0,0.14))',
  shadowLg: 'var(--shadow-hv, 0 8px 30px rgba(0,0,0,0.14))',

  // ── Primary / Green (follows color scheme) ───────────────────
  green:    'var(--primary,        #3A7D44)',
  greenDk:  'var(--primary-dark,   #2D6235)',
  greenDark:'var(--primary-dark,   #2D6235)',
  greenBg:  'var(--primary-light,  #DCFCE7)',
  greenLt:  'var(--primary-light,  #F0F7F1)',
  greenBd:  'var(--primary-border, #BBF7D0)',
  greenText:'var(--primary-text,   #166534)',
  greenDim: 'var(--primary-light,  #F0FDF4)',

  // ── Amber / Warning ───────────────────────────────────────────
  amber:    '#D97706',
  amberBg:  '#FEF3C7',
  amberText:'#92400E',
  amberDim: '#FFFBEB',

  // ── Red / Danger ──────────────────────────────────────────────
  red:       '#DC2626',
  danger:    '#DC2626',
  redBg:     '#FEF2F2',
  dangerBg:  '#FEF2F2',
  redText:   '#B91C1C',
  redDim:    '#FEF2F2',
  errorBg:      '#FFF5F5',
  errorBorder:  '#FECACA',
  errorText:    '#B91C1C',

  // ── Blue / Info ────────────────────────────────────────────────
  blue:     '#2563EB',
  blueBg:   '#DBEAFE',
  blueText: '#1E3A5F',
  blueDim:  '#EFF6FF',

  // ── Purple ────────────────────────────────────────────────────
  purple:     '#7C3AED',
  purpleBg:   '#F3E8FF',
  purpleText: '#581C87',
  purpleDim:  '#F5F3FF',
};
