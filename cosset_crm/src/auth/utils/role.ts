export function isUserAdmin(role?: string | null): boolean {
  return String(role || '')
    .trim()
    .toLowerCase() === 'admin';
}
