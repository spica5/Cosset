'use client';

import type { WalletLedgerKind } from 'src/types/wallet';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import CardContent from '@mui/material/CardContent';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { getS3SignedUrl } from 'src/actions/user';

import {
  formatWalletMoney,
  adjustCustomerWallet,
  useGetCustomerWallet,
} from 'src/actions/wallet';
import {
  type AccountPlanType,
  useGetCustomerBilling,
  useGetPaymentCustomers,
  updateCustomerBillingPlan,
  type CustomerPaymentOverview,
} from 'src/actions/billing';

import { useAuthContext } from 'src/auth/hooks';

import { CustomerPaymentHistoryDialog } from '../customer-payment-history-dialog';

// ----------------------------------------------------------------------

const TOPUP_PRESETS = [500, 1000, 2500, 5000];

// Temporarily hidden — restore Paid/All tabs when needed.
// type PaymentTab = 'paid' | 'all';
// const PAYMENT_TABS: Array<{ value: PaymentTab; label: string }> = [
//   { value: 'paid', label: 'Paid' },
//   { value: 'all', label: 'All' },
// ];

type PeriodPreset = '1d' | '1w' | '1m' | '3m' | 'all' | 'custom';

const PERIOD_PRESETS: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: '1d', label: '1 day' },
  { value: '1w', label: '1 week' },
  { value: '1m', label: '1 month' },
  { value: '3m', label: '3 months' },
  { value: 'custom', label: 'Custom' },
];

const DEFAULT_PERIOD_PRESET: PeriodPreset = 'all';

type PlanKey = AccountPlanType;

const PLAN_LABELS: Record<PlanKey, string> = {
  FREE: 'Free Account',
  PAID: 'Paid Account',
  'EXTRA-PAID': 'Extra-paid Account',
};

function isUserAdmin(role?: string | null) {
  return String(role || '')
    .trim()
    .toLowerCase() === 'admin';
}

function normalizePlan(value: unknown): PlanKey {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');

  if (normalized === 'PAID' || normalized === 'EXTRA-PAID') {
    return normalized;
  }

  return 'FREE';
}

function resolveAccountPlan(
  user?: Record<string, any> | null,
  billingSummary?: Record<string, any> | null
): PlanKey {
  const userPlan = normalizePlan(user?.plan);
  const billingPlan = normalizePlan(billingSummary?.plan);
  const hasActiveBilling = Boolean(
    billingSummary?.payment &&
      (billingSummary.status === 'active' || billingSummary.status === 'completed')
  );

  if (hasActiveBilling) {
    return billingPlan;
  }

  if (userPlan !== 'FREE') {
    return userPlan;
  }

  return billingPlan;
}

function getCustomerLabel(customer: Record<string, any>) {
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return fullName || customer.email || customer.id || 'Customer';
}

function getCustomerPhoto(customer: Record<string, any>) {
  return customer.photoURL || customer.avatarUrl || customer.avatar || '';
}

function formatBillingDate(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function formatPaidPeriod(start?: unknown, end?: unknown) {
  if (!start && !end) return '—';
  return `${formatBillingDate(start)} → ${formatBillingDate(end)}`;
}

function isPaidPeriodExpired(
  plan: PlanKey | string | null | undefined,
  periodEnd?: unknown,
  flag?: boolean | null
) {
  if (typeof flag === 'boolean') return flag;
  if (normalizePlan(plan) === 'FREE' || !periodEnd) return false;
  const end = new Date(String(periodEnd));
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() < Date.now();
}

function formatMoney(amountCents: number, currency = 'usd') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format((amountCents || 0) / 100);
  } catch {
    return `$${((amountCents || 0) / 100).toFixed(2)}`;
  }
}

function kindLabel(kind: WalletLedgerKind | string) {
  switch (kind) {
    case 'topup':
      return 'Top-up';
    case 'cinema_watch':
      return 'Cinema';
    case 'refund':
      return 'Refund / Adjust';
    default:
      return kind;
  }
}

function CustomerAvatar({ customer, name }: { customer: Record<string, any>; name: string }) {
  const [avatarUrl, setAvatarUrl] = useState('');
  const photo = getCustomerPhoto(customer);

  useEffect(() => {
    let mounted = true;

    const resolveAvatar = async () => {
      if (!photo) {
        if (mounted) setAvatarUrl('');
        return;
      }

      const normalizedPhoto = photo.replace(/^public:/, '');

      if (
        normalizedPhoto.startsWith('http://') ||
        normalizedPhoto.startsWith('https://') ||
        normalizedPhoto.startsWith('data:') ||
        normalizedPhoto.startsWith('blob:')
      ) {
        if (mounted) setAvatarUrl(normalizedPhoto);
        return;
      }

      const signedUrl = await getS3SignedUrl(normalizedPhoto);
      if (mounted) setAvatarUrl(signedUrl || '');
    };

    resolveAvatar();

    return () => {
      mounted = false;
    };
  }, [photo]);

  return (
    <Avatar src={avatarUrl} alt={name} sx={{ width: 36, height: 36 }}>
      {name.charAt(0).toUpperCase()}
    </Avatar>
  );
}

function resolveOverviewPlan(customer: CustomerPaymentOverview): PlanKey {
  return resolveAccountPlan(
    { plan: customer.plan },
    customer.billingProvider
      ? {
          plan: customer.billingPlan,
          status: customer.billingStatus,
          payment: customer.billingStatus
            ? { status: customer.billingStatus, plan: customer.billingPlan }
            : null,
        }
      : null
  );
}

function isPaidOverviewPlan(customer: CustomerPaymentOverview) {
  return resolveOverviewPlan(customer) !== 'FREE';
}

function hasWalletBalance(customer: CustomerPaymentOverview) {
  return Number(customer.walletBalanceCents || 0) > 0;
}

function isPaymentListCustomer(customer: CustomerPaymentOverview) {
  return isPaidOverviewPlan(customer) || hasWalletBalance(customer);
}

function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function toDateInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateInputValue(value: string, endOfDay = false): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return endOfDay ? endOfLocalDay(date) : startOfLocalDay(date);
}

function getPeriodRange(
  preset: PeriodPreset,
  customFrom: string,
  customTo: string,
  now = new Date()
): { from: Date | null; to: Date | null } {
  if (preset === 'all') {
    return { from: null, to: null };
  }

  if (preset === 'custom') {
    return {
      from: parseDateInputValue(customFrom, false),
      to: parseDateInputValue(customTo, true),
    };
  }

  const to = endOfLocalDay(now);
  const from = startOfLocalDay(now);

  if (preset === '1d') {
    return { from, to };
  }

  if (preset === '1w') {
    from.setDate(from.getDate() - 6);
    return { from, to };
  }

  if (preset === '1m') {
    from.setMonth(from.getMonth() - 1);
    return { from, to };
  }

  // 3m
  from.setMonth(from.getMonth() - 3);
  return { from, to };
}

function isCustomerInPeriod(
  customer: CustomerPaymentOverview,
  from: Date | null,
  to: Date | null
) {
  if (!from && !to) return true;

  if (!customer.paidAt) return false;
  const paidAt = new Date(customer.paidAt);
  if (Number.isNaN(paidAt.getTime())) return false;

  if (from && paidAt < from) return false;
  if (to && paidAt > to) return false;
  return true;
}

// ----------------------------------------------------------------------

export function PaymentView() {
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const canManage = isUserAdmin(user?.role);

  const { customers, customersLoading, customersError, refreshCustomers } = useGetPaymentCustomers(
    200,
    0,
    canManage
  );

  const initialCustomerId = searchParams.get('customerId') || '';
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [historyCustomer, setHistoryCustomer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(DEFAULT_PERIOD_PRESET);
  const [customFrom, setCustomFrom] = useState(() =>
    toDateInputValue(startOfLocalDay(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)))
  );
  const [customTo, setCustomTo] = useState(() => toDateInputValue(new Date()));
  const [amountCents, setAmountCents] = useState(1000);
  const [customAmount, setCustomAmount] = useState('10');
  const [walletDirection, setWalletDirection] = useState<'credit' | 'debit'>('credit');
  const [walletLoading, setWalletActionLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState<PlanKey | null>(null);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' | 'info' } | null>(
    null
  );

  useEffect(() => {
    const fromQuery = searchParams.get('customerId') || '';
    if (fromQuery && fromQuery !== selectedCustomerId) {
      setSelectedCustomerId(fromQuery);
    }
    // Only sync from URL on mount / external query changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const selectedCustomer = useMemo(
    () => customers.find((item) => String(item.id) === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const periodRange = useMemo(
    () => getPeriodRange(periodPreset, customFrom, customTo),
    [customFrom, customTo, periodPreset]
  );

  const visibleCustomers = useMemo(
    () =>
      customers.filter(
        (customer) =>
          isPaymentListCustomer(customer) &&
          isCustomerInPeriod(customer, periodRange.from, periodRange.to)
      ),
    [customers, periodRange.from, periodRange.to]
  );

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return visibleCustomers.filter((customer) => {
      if (!query) return true;

      const name = getCustomerLabel(customer).toLowerCase();
      const email = String(customer.email || '').toLowerCase();
      const plan = resolveOverviewPlan(customer).toLowerCase();
      const provider = String(customer.billingProvider || '').toLowerCase();
      const status = String(customer.billingStatus || customer.state || '').toLowerCase();

      return (
        name.includes(query) ||
        email.includes(query) ||
        plan.includes(query) ||
        provider.includes(query) ||
        status.includes(query)
      );
    });
  }, [searchQuery, visibleCustomers]);

  const filteredTotalPaidAmountCents = useMemo(
    () =>
      filteredCustomers.reduce(
        (sum, customer) => sum + Number(customer.totalPaidAmountCents || 0),
        0
      ),
    [filteredCustomers]
  );

  const handlePeriodPresetChange = useCallback((value: PeriodPreset) => {
    setPeriodPreset(value);

    if (value === 'custom') {
      const range = getPeriodRange('1w', '', '');
      if (range.from) setCustomFrom(toDateInputValue(range.from));
      if (range.to) setCustomTo(toDateInputValue(range.to));
    }
  }, []);

  const {
    wallet,
    ledger,
    walletLoading: walletDataLoading,
    refreshWallet,
  } = useGetCustomerWallet(selectedCustomerId, canManage && Boolean(selectedCustomerId));

  const {
    customer: billingCustomer,
    billing,
    payments,
    paymentsLoading,
    refreshBilling,
  } = useGetCustomerBilling(selectedCustomerId, canManage && Boolean(selectedCustomerId));

  const customerProfile = billingCustomer || selectedCustomer;
  const plan = resolveAccountPlan(customerProfile, billing);
  const accountType = PLAN_LABELS[plan];
  const billingEmail = customerProfile?.email || '';
  const billingCycle = plan === 'FREE' ? '—' : 'Monthly';
  const paidDate = formatBillingDate(
    billing?.paidAt ||
      (selectedCustomer as CustomerPaymentOverview | null)?.paidAt ||
      billing?.payment?.createdAt
  );
  const paidAmountLabel =
    billing?.paidAmountCents != null
      ? formatMoney(billing.paidAmountCents, billing.paidCurrency || 'usd')
      : billing?.payment?.amountCents != null
        ? formatMoney(billing.payment.amountCents, billing.payment.currency || 'usd')
        : selectedCustomer?.billingAmountCents != null
          ? formatMoney(
              selectedCustomer.billingAmountCents,
              selectedCustomer.walletCurrency || 'usd'
            )
          : '—';
  const paidPeriodLabel = formatPaidPeriod(
    billing?.currentPeriodStart || billing?.payment?.currentPeriodStart || selectedCustomer?.currentPeriodStart,
    billing?.currentPeriodEnd || billing?.payment?.currentPeriodEnd || selectedCustomer?.currentPeriodEnd
  );
  const nextBillingDate = formatBillingDate(billing?.currentPeriodEnd);
  const paidPeriodExpired = isPaidPeriodExpired(
    plan,
    billing?.currentPeriodEnd || selectedCustomer?.currentPeriodEnd,
    billing?.isPaidPeriodExpired ?? selectedCustomer?.isPaidPeriodExpired
  );
  const billingProvider = billing?.provider || null;
  const isFreeAccount = plan === 'FREE';
  const hasBusinessAccount = String(customerProfile?.role || '').toLowerCase() === 'business';
  const requestedAt =
    customerProfile?.businessAccountRequestedAt ||
    (selectedCustomer as any)?.businessAccountRequestedAt ||
    null;
  const hasPendingBusinessRequest = Boolean(requestedAt) && !hasBusinessAccount;

  const handleSelectCustomer = useCallback(
    (customerId: string) => {
      setSelectedCustomerId(customerId);
      const next = customerId
        ? `${paths.payment.root}?customerId=${encodeURIComponent(customerId)}`
        : paths.payment.root;
      router.replace(next);
    },
    [router]
  );

  const handleSelectPreset = useCallback((value: number) => {
    setAmountCents(value);
    setCustomAmount(String(value / 100));
  }, []);

  const handleCustomAmount = useCallback((raw: string) => {
    setCustomAmount(raw);
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      setAmountCents(Math.round(parsed * 100));
    }
  }, []);

  const handleWalletAdjust = useCallback(async () => {
    if (!selectedCustomerId) return;

    try {
      setWalletActionLoading(true);
      await adjustCustomerWallet(selectedCustomerId, {
        amountCents,
        direction: walletDirection,
        description:
          walletDirection === 'credit' ? 'Admin wallet credit' : 'Admin wallet debit',
      });
      await Promise.all([refreshWallet(), refreshCustomers()]);
      setToast({
        message:
          walletDirection === 'credit'
            ? `Added ${formatWalletMoney(amountCents)} to wallet`
            : `Removed ${formatWalletMoney(amountCents)} from wallet`,
        severity: 'success',
      });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Unable to update wallet',
        severity: 'error',
      });
    } finally {
      setWalletActionLoading(false);
    }
  }, [amountCents, refreshCustomers, refreshWallet, selectedCustomerId, walletDirection]);

  const handleSetPlan = useCallback(
    async (nextPlan: PlanKey) => {
      if (!selectedCustomerId || nextPlan === plan) return;

      try {
        setPlanLoading(nextPlan);
        const data = await updateCustomerBillingPlan(selectedCustomerId, nextPlan);
        await Promise.all([refreshBilling(), refreshCustomers()]);
        setToast({
          message: data.message || `Plan updated to ${nextPlan}`,
          severity: 'success',
        });
      } catch (error) {
        setToast({
          message: error instanceof Error ? error.message : 'Unable to update plan',
          severity: 'error',
        });
      } finally {
        setPlanLoading(null);
      }
    },
    [plan, refreshBilling, refreshCustomers, selectedCustomerId]
  );

  const getAccountTypeColor = (type: PlanKey) => {
    switch (type) {
      case 'EXTRA-PAID':
        return 'success';
      case 'PAID':
        return 'info';
      default:
        return 'default';
    }
  };

  if (!canManage) {
    return (
      <DashboardContent maxWidth="lg">
        <Alert severity="warning">Only admins can manage customer payments.</Alert>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: { xs: 3, md: 5 } }}
      >
        <Stack spacing={1}>
          <Typography variant="h4">Payment</Typography>
          <Breadcrumbs>
            <Link
              component={RouterLink}
              href={paths.dashboard.root}
              color="inherit"
              underline="hover"
            >
              Dashboard
            </Link>
            <Typography color="text.primary">Payment</Typography>
          </Breadcrumbs>
        </Stack>

        {selectedCustomerId ? (
          <Button variant="outlined" color="inherit" onClick={() => handleSelectCustomer('')}>
            Back to list
          </Button>
        ) : null}
      </Stack>

      <Stack spacing={4}>
        {!selectedCustomerId ? (
          <Stack spacing={3}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ md: 'center' }}
              flexWrap="wrap"
              useFlexGap
            >
              <TextField
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, email, plan, provider, or status..."
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Iconify icon="eva:search-fill" width={20} sx={{ color: 'text.disabled' }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ maxWidth: { sm: 420 }, flex: 1 }}
              />

              <TextField
                select
                label="Period"
                value={periodPreset}
                onChange={(event) =>
                  handlePeriodPresetChange(event.target.value as PeriodPreset)
                }
                sx={{ minWidth: 160 }}
              >
                {PERIOD_PRESETS.map((preset) => (
                  <MenuItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </MenuItem>
                ))}
              </TextField>

              {periodPreset === 'custom' ? (
                <>
                  <TextField
                    label="From"
                    type="date"
                    value={customFrom}
                    onChange={(event) => setCustomFrom(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 160 }}
                  />
                  <TextField
                    label="To"
                    type="date"
                    value={customTo}
                    onChange={(event) => setCustomTo(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 160 }}
                  />
                </>
              ) : null}

              <Paper
                variant="outlined"
                sx={{
                  px: 2,
                  py: 1.25,
                  minWidth: { sm: 200 },
                  ml: { md: 'auto' },
                }}
              >
                <Typography variant="caption" color="text.secondary" display="block">
                  Total amount ({filteredCustomers.length} customers)
                </Typography>
                <Typography variant="h6">
                  {formatMoney(filteredTotalPaidAmountCents, 'usd')}
                </Typography>
              </Paper>
            </Stack>

            {customersError ? (
              <Alert
                severity="error"
                action={
                  <Button color="inherit" size="small" onClick={() => refreshCustomers()}>
                    Retry
                  </Button>
                }
              >
                {customersError instanceof Error
                  ? customersError.message
                  : 'Failed to load payment customers'}
              </Alert>
            ) : null}

            {customersLoading ? (
              <Typography variant="body2" color="text.secondary">
                Loading customers...
              </Typography>
            ) : filteredCustomers.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{ py: 8, px: 3, textAlign: 'center', borderStyle: 'dashed' }}
              >
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {visibleCustomers.length
                    ? 'No matching customers'
                    : customers.length
                      ? 'No customers in this period'
                      : 'No customers found'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {visibleCustomers.length
                    ? 'Try a different search.'
                    : customers.length
                      ? 'Try another period, or choose All time. Only paid customers or customers with a wallet balance are listed.'
                      : 'Customers will appear here once accounts exist.'}
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 1100 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Wallet</TableCell>
                      <TableCell>Plan</TableCell>
                      <TableCell>Payment</TableCell>
                      <TableCell>Paid amount</TableCell>
                      <TableCell>Total amount</TableCell>
                      <TableCell>Paid period</TableCell>
                      <TableCell>Paid date</TableCell>
                      <TableCell>Next billing</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCustomers.map((customer) => {
                      const customerId = String(customer.id);
                      const customerName = getCustomerLabel(customer);
                      const overviewPlan = resolveOverviewPlan(customer);
                      const hasBilling = Boolean(customer.billingProvider);
                      const expired = isPaidPeriodExpired(
                        overviewPlan,
                        customer.currentPeriodEnd,
                        customer.isPaidPeriodExpired
                      );

                      return (
                        <TableRow key={customerId} hover>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                              <CustomerAvatar customer={customer} name={customerName} />
                              <Stack spacing={0.25}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {customerName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {customer.role || 'user'}
                                  {customer.state ? ` · ${customer.state}` : ''}
                                </Typography>
                              </Stack>
                            </Stack>
                          </TableCell>
                          <TableCell>{customer.email || '—'}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatWalletMoney(
                                customer.walletBalanceCents || 0,
                                customer.walletCurrency || 'usd'
                              )}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={PLAN_LABELS[overviewPlan]}
                              color={
                                overviewPlan === 'EXTRA-PAID'
                                  ? 'success'
                                  : overviewPlan === 'PAID'
                                    ? 'info'
                                    : 'default'
                              }
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {hasBilling ? (
                              <Stack spacing={0.5}>
                                <Typography
                                  variant="body2"
                                  sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                                >
                                  {customer.billingProvider}
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Chip
                                    size="small"
                                    label={customer.billingStatus || '—'}
                                    color={
                                      customer.billingStatus === 'active' ||
                                      customer.billingStatus === 'completed'
                                        ? 'success'
                                        : customer.billingStatus === 'pending'
                                          ? 'warning'
                                          : 'default'
                                    }
                                    variant="outlined"
                                  />
                                  {customer.billingAmountCents != null ? (
                                    <Typography variant="caption" color="text.secondary">
                                      {formatMoney(
                                        customer.billingAmountCents,
                                        customer.walletCurrency || 'usd'
                                      )}
                                    </Typography>
                                  ) : null}
                                </Stack>
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No subscription
                              </Typography>
                            )}
                            {expired ? (
                              <Chip
                                size="small"
                                color="error"
                                label="Period expired — pay to renew"
                                sx={{ mt: 0.75 }}
                              />
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {customer.billingAmountCents != null
                              ? formatMoney(
                                  customer.billingAmountCents,
                                  customer.walletCurrency || 'usd'
                                )
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatMoney(
                                customer.totalPaidAmountCents || 0,
                                customer.walletCurrency || 'usd'
                              )}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {formatPaidPeriod(
                              customer.currentPeriodStart,
                              customer.currentPeriodEnd
                            )}
                          </TableCell>
                          <TableCell>{formatBillingDate(customer.paidAt)}</TableCell>
                          <TableCell>{formatBillingDate(customer.currentPeriodEnd)}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="Paid history chart">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() =>
                                    setHistoryCustomer({
                                      id: customerId,
                                      name: customerName,
                                    })
                                  }
                                  aria-label="Paid history chart"
                                >
                                  <Iconify icon="solar:chart-square-outline" width={18} />
                                </IconButton>
                              </Tooltip>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleSelectCustomer(customerId)}
                              >
                                Manage
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        ) : (
          <>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  {selectedCustomer ? (
                    <CustomerAvatar
                      customer={selectedCustomer}
                      name={getCustomerLabel(selectedCustomer)}
                    />
                  ) : null}
                  <Box>
                    <Typography variant="h6">
                      {selectedCustomer
                        ? getCustomerLabel(selectedCustomer)
                        : billingEmail || 'Customer'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {billingEmail || selectedCustomer?.email || '—'}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {toast ? (
              <Alert severity={toast.severity} onClose={() => setToast(null)}>
                {toast.message}
              </Alert>
            ) : null}

            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={3}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Digital wallet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Add or remove wallet balance for cinema and other small payments.
                      </Typography>
                    </Box>
                    <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Available balance
                      </Typography>
                      {walletDataLoading ? (
                        <CircularProgress size={22} />
                      ) : (
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {formatWalletMoney(wallet.balanceCents, wallet.currency)}
                        </Typography>
                      )}
                    </Stack>
                  </Stack>

                  <Divider />

                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                      Adjust balance
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                      {TOPUP_PRESETS.map((value) => (
                        <Chip
                          key={value}
                          label={formatWalletMoney(value)}
                          color={amountCents === value ? 'primary' : 'default'}
                          variant={amountCents === value ? 'filled' : 'outlined'}
                          onClick={() => handleSelectPreset(value)}
                        />
                      ))}
                    </Stack>

                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={2}
                      alignItems={{ sm: 'flex-end' }}
                    >
                      <TextField
                        select
                        label="Action"
                        value={walletDirection}
                        onChange={(event) =>
                          setWalletDirection(event.target.value as 'credit' | 'debit')
                        }
                        sx={{ minWidth: 160 }}
                      >
                        <MenuItem value="credit">Add money</MenuItem>
                        <MenuItem value="debit">Remove money</MenuItem>
                      </TextField>
                      <TextField
                        label="Amount (USD)"
                        value={customAmount}
                        onChange={(event) => handleCustomAmount(event.target.value)}
                        type="number"
                        slotProps={{ htmlInput: { min: 1, step: '0.01' } }}
                        sx={{ maxWidth: 220 }}
                      />
                      <Button
                        variant="contained"
                        loading={walletLoading}
                        onClick={handleWalletAdjust}
                        startIcon={<Iconify icon="solar:wad-of-money-bold" />}
                      >
                        {walletDirection === 'credit' ? 'Add' : 'Remove'}{' '}
                        {formatWalletMoney(amountCents)}
                      </Button>
                    </Stack>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 1 }}
                    >
                      Admin adjustments update the customer wallet directly. Maximum $200.00 per
                      action.
                    </Typography>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                      Recent activity
                    </Typography>
                    {walletDataLoading ? (
                      <CircularProgress size={22} />
                    ) : ledger.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No wallet activity yet.
                      </Typography>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Description</TableCell>
                              <TableCell align="right">Amount</TableCell>
                              <TableCell align="right">Balance</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {ledger.map((row) => (
                              <TableRow key={row.id}>
                                <TableCell>
                                  {row.createdAt
                                    ? new Date(row.createdAt).toLocaleString()
                                    : '—'}
                                </TableCell>
                                <TableCell>{kindLabel(row.kind)}</TableCell>
                                <TableCell>{row.description || '—'}</TableCell>
                                <TableCell
                                  align="right"
                                  sx={{
                                    color: row.deltaCents < 0 ? 'error.main' : 'success.main',
                                  }}
                                >
                                  {row.deltaCents < 0 ? '−' : '+'}
                                  {formatWalletMoney(Math.abs(row.deltaCents), wallet.currency)}
                                </TableCell>
                                <TableCell align="right">
                                  {formatWalletMoney(row.balanceAfterCents, wallet.currency)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      Current Account Type
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        label={accountType}
                        color={getAccountTypeColor(plan)}
                        variant="outlined"
                        size="medium"
                        icon={
                          <Iconify
                            icon={plan === 'FREE' ? 'solar:user-id-bold' : 'solar:star-bold'}
                          />
                        }
                      />
                      <Typography variant="body2" color="text.secondary">
                        {plan === 'FREE'
                          ? 'Limited features on the free plan.'
                          : plan === 'PAID'
                            ? 'Premium features on the paid plan.'
                            : 'All premium features on the extra-paid plan.'}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      Available Plans
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Setting a plan here updates Cosset account access. Stripe/PayPal subscriptions
                      are not changed automatically.
                    </Typography>
                    <Grid container spacing={2}>
                      {(
                        [
                          {
                            key: 'FREE' as PlanKey,
                            title: 'Free Account',
                            price: '$0',
                            description: 'Perfect for getting started',
                            features: ['Basic features', 'Limited storage'],
                          },
                          {
                            key: 'PAID' as PlanKey,
                            title: 'Paid Account',
                            price: '$9.99',
                            description: 'For most users',
                            features: ['All basic features', 'Unlimited storage', 'Priority support'],
                          },
                          {
                            key: 'EXTRA-PAID' as PlanKey,
                            title: 'Extra-paid Account',
                            price: '$19.99',
                            description: 'For power users',
                            features: [
                              'All paid features',
                              'Advanced analytics',
                              '24/7 dedicated support',
                              'Custom integrations',
                            ],
                            popular: true,
                          },
                        ] as const
                      ).map((item) => (
                        <Grid key={item.key} size={{ xs: 12, sm: 6, md: 4 }}>
                          <Card
                            variant="outlined"
                            sx={{
                              p: 2,
                              height: 1,
                              border:
                                plan === item.key
                                  ? `2px solid ${theme.vars.palette.primary.main}`
                                  : undefined,
                              bgcolor: plan === item.key ? 'action.selected' : undefined,
                            }}
                          >
                            <Stack spacing={2} sx={{ height: 1 }}>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                              >
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                  {item.title}
                                </Typography>
                                {'popular' in item && item.popular ? (
                                  <Chip label="Popular" size="small" color="primary" />
                                ) : null}
                              </Stack>
                              <Typography variant="body2" color="text.secondary">
                                {item.description}
                              </Typography>
                              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                {item.price}
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  /mo
                                </Typography>
                              </Typography>
                              <Stack spacing={1} sx={{ flex: 1 }}>
                                {item.features.map((feature) => (
                                  <Box key={feature} sx={{ display: 'flex', gap: 1 }}>
                                    <Iconify
                                      icon="solar:check-circle-bold"
                                      sx={{ color: 'success.main', flexShrink: 0 }}
                                    />
                                    <Typography variant="body2">{feature}</Typography>
                                  </Box>
                                ))}
                              </Stack>
                              <Button
                                fullWidth
                                variant={plan === item.key ? 'contained' : 'outlined'}
                                disabled={plan === item.key || Boolean(planLoading)}
                                loading={planLoading === item.key}
                                onClick={() => handleSetPlan(item.key)}
                              >
                                {plan === item.key ? 'Current Plan' : 'Set plan'}
                              </Button>
                            </Stack>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card
              sx={
                hasPendingBusinessRequest
                  ? {
                      borderColor: 'warning.main',
                      borderWidth: 1,
                      borderStyle: 'solid',
                    }
                  : undefined
              }
            >
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Account Role
                  </Typography>
                  <Stack direction="row" spacing={1.5} flexWrap="wrap">
                    {hasBusinessAccount ? (
                      <Chip label="Business account active" color="success" />
                    ) : hasPendingBusinessRequest ? (
                      <Chip label="Request pending review" color="warning" />
                    ) : (
                      <Chip
                        label={`${String(customerProfile?.role || 'user')} account`}
                        variant="outlined"
                      />
                    )}
                  </Stack>
                  {hasPendingBusinessRequest ? (
                    <Typography variant="body2" color="text.secondary">
                      Business request submitted
                      {requestedAt ? ` on ${new Date(String(requestedAt)).toLocaleString()}` : ''}.
                      Approve from the Customers list by setting role to business.
                    </Typography>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>

            {!isFreeAccount ? (
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={3}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Billing Information
                    </Typography>
                    {paidPeriodExpired ? (
                      <Alert severity="warning">
                        Paid period expired. Ask the customer to renew payment, or set a new paid
                        plan/period from this page.
                      </Alert>
                    ) : null}
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Billing Email
                        </Typography>
                        <Typography variant="body1">{billingEmail || '—'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Payment Provider
                        </Typography>
                        <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                          {billingProvider || '—'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Billing Cycle
                        </Typography>
                        <Typography variant="body1">{billingCycle}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Paid Date
                        </Typography>
                        <Typography variant="body1">{paidDate}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Paid Amount
                        </Typography>
                        <Typography variant="body1">{paidAmountLabel}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Paid Period
                        </Typography>
                        <Typography variant="body1">{paidPeriodLabel}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Next Billing Date
                        </Typography>
                        <Typography variant="body1">{nextBillingDate}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Status
                        </Typography>
                        <Chip
                          label={
                            paidPeriodExpired
                              ? 'Expired'
                              : billing?.status || 'Active'
                          }
                          color={paidPeriodExpired ? 'warning' : 'success'}
                          size="small"
                          variant="filled"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Provider Customer ID
                        </Typography>
                        <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                          {billing?.providerCustomerId ||
                            billing?.externalSubscriptionId ||
                            '—'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Payment history
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Subscription and checkout records for this customer.
                    </Typography>
                  </Box>

                  {paymentsLoading ? (
                    <Stack alignItems="center" sx={{ py: 3 }}>
                      <CircularProgress size={28} />
                    </Stack>
                  ) : payments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No payments yet.
                    </Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Provider</TableCell>
                            <TableCell>Plan</TableCell>
                            <TableCell>Paid amount</TableCell>
                            <TableCell>Paid period</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Reference</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {payments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>{formatBillingDate(payment.createdAt)}</TableCell>
                              <TableCell sx={{ textTransform: 'capitalize' }}>
                                {payment.provider}
                              </TableCell>
                              <TableCell>{payment.plan}</TableCell>
                              <TableCell>
                                {formatMoney(payment.amountCents, payment.currency)}
                              </TableCell>
                              <TableCell>
                                {formatPaidPeriod(
                                  payment.currentPeriodStart,
                                  payment.currentPeriodEnd
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={payment.status}
                                  color={
                                    payment.status === 'completed' || payment.status === 'active'
                                      ? 'success'
                                      : payment.status === 'pending'
                                        ? 'warning'
                                        : 'default'
                                  }
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell sx={{ maxWidth: 180 }}>
                                <Typography variant="body2" noWrap>
                                  {payment.externalPaymentId ||
                                    payment.externalSubscriptionId ||
                                    payment.externalCheckoutId ||
                                    '—'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </>
        )}
      </Stack>

      <CustomerPaymentHistoryDialog
        open={Boolean(historyCustomer)}
        customerId={historyCustomer?.id || ''}
        customerName={historyCustomer?.name || 'Customer'}
        onClose={() => setHistoryCustomer(null)}
      />
    </DashboardContent>
  );
}
