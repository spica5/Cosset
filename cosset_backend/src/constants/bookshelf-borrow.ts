/** Default borrow period in days when the borrower does not choose one. */
export const BOOKSHELF_BORROW_PERIOD_DAYS = 30;

export const BOOKSHELF_BORROW_PERIOD_MIN_DAYS = 1;

export const BOOKSHELF_BORROW_PERIOD_MAX_DAYS = 90;

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
