export type WalletSummary = {
  balanceCents: number;
  currency: string;
};

export type WalletLedgerKind = 'topup' | 'cinema_watch' | 'refund';

export type WalletLedgerEntry = {
  id: number;
  customerId: string;
  deltaCents: number;
  balanceAfterCents: number;
  kind: WalletLedgerKind;
  status: string;
  description?: string | null;
  refType?: string | null;
  refId?: string | null;
  createdAt?: string | null;
};

export type CinemaWatchQuote = {
  screeningId: number;
  filmId: number;
  filmTitle: string;
  pricingType: 'free' | 'paid';
  baseFeeCents: number;
  chargeCents: number;
  discounted: boolean;
};
