export const isDesktop   = !!window.electron?.isDesktop;
export const isMacDesktop = window.electron?.platform === 'darwin';
