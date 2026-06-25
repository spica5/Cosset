/** Default borrow period in days when the borrower does not choose one. */
export const BOOKSHELF_BORROW_PERIOD_DAYS = 30;

export const BOOKSHELF_BORROW_PERIOD_MIN_DAYS = 1;

export const BOOKSHELF_BORROW_PERIOD_MAX_DAYS = 90;

export const BOOKSHELF_BORROW_PERIOD_PRESETS = [7, 14, 30, 60] as const;

export const normalizeBorrowPeriodDays = (value: unknown): number => {
  const parsed =
    typeof value === 'number' && Number.isFinite(value)
      ? Math.trunc(value)
      : Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed)) {
    return BOOKSHELF_BORROW_PERIOD_DAYS;
  }

  return Math.min(
    BOOKSHELF_BORROW_PERIOD_MAX_DAYS,
    Math.max(BOOKSHELF_BORROW_PERIOD_MIN_DAYS, parsed),
  );
};

export const formatBorrowExpiryDate = (value?: string | Date | null) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString();
};

export const isBorrowExpired = (expiresAt?: string | Date | null) => {
  if (!expiresAt) {
    return false;
  }

  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getTime() < Date.now();
};
