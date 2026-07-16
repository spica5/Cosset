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

export const CUSTOMER_ROLE_OPTIONS = ['user', 'business', 'admin'] as const;
