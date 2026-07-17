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

/** Default dashboard landing path after login / guest-guard redirect. */
export function getDashboardHomePath(role?: string | null): string {
  if (isUserBusiness(role) && !isUserAdmin(role)) {
    return paths.dashboard.community.brandsBoulevard.myStore;
  }

  return paths.dashboard.root;
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
