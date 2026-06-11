export type MailLayoutMode = 'sidebar' | 'horizontal';

export const MAIL_LAYOUT_MODE_KEY = 'cosset-mail-layout-mode';

export const DEFAULT_MAIL_LAYOUT_MODE: MailLayoutMode = 'horizontal';

export function getStoredMailLayoutMode(): MailLayoutMode {
  if (typeof window === 'undefined') {
    return DEFAULT_MAIL_LAYOUT_MODE;
  }

  const stored = window.localStorage.getItem(MAIL_LAYOUT_MODE_KEY);
  if (stored === 'sidebar' || stored === 'horizontal') {
    return stored;
  }

  return DEFAULT_MAIL_LAYOUT_MODE;
}

export function setStoredMailLayoutMode(mode: MailLayoutMode) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(MAIL_LAYOUT_MODE_KEY, mode);
}
