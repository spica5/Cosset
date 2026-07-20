import { paths } from 'src/routes/paths';

export function isUserAdmin(role?: string | null): boolean {
  return String(role || '')
    .trim()
    .toLowerCase() === 'admin';
}

export function isUserBusiness(role?: string | null): boolean {
  return String(role || '')
    .trim()
    .toLowerCase() === 'business';
}

/** My Universe setup (Welcome Guest Area) — first destination for new personal accounts. */
export function getMyUniversePath(): string {
  return paths.dashboard.homeSpace.guestArea;
}

/** Home Space preview — destination after the user has created their home page. */
export function getHomeSpacePath(): string {
  return paths.dashboard.preview;
}

/**
 * Default dashboard landing path after login / guest-guard redirect.
 * Personal accounts: My Universe until a home page exists, then Home Space.
 */
export function getDashboardHomePath(role?: string | null, hasHomePage = false): string {
  if (isUserBusiness(role) && !isUserAdmin(role)) {
    return paths.dashboard.community.brandsBoulevard.myStore;
  }

  return hasHomePage ? getHomeSpacePath() : getMyUniversePath();
}

/** Paths a business account may use in the dashboard. */
export function isBusinessAllowedDashboardPath(pathname: string): boolean {
  const path = String(pathname || '');
  const allowedPrefixes = [
    paths.dashboard.community.brandsBoulevard.root,
    paths.dashboard.community.post.root,
    paths.dashboard.mail,
    paths.dashboard.chat,
    paths.dashboard.settings.root,
    paths.dashboard.auth.signIn,
    paths.dashboard.auth.signUp,
    paths.dashboard.auth.resetPassword,
    paths.dashboard.auth.updatePassword,
  ];

  return allowedPrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)
  );
}

export const CUSTOMER_ROLE_OPTIONS = ['user', 'business', 'admin'] as const;
