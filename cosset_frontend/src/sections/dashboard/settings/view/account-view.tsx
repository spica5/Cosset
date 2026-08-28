'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import LoadingButton from '@mui/lab/LoadingButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { useSearchParams, useRouter } from 'src/routes/hooks';

import { isUserBusiness } from 'src/auth/utils/role';
import { useAuthContext } from 'src/auth/hooks';

import {
  refreshBillingUser,
  useGetCustomerPayments,
  cancelPayPalSubscription,
  capturePayPalSubscription,
  createBillingPortalSession,
  createBillingCheckoutSession,
  type PaidPlanType,
  type BillingProvider,
} from 'src/actions/billing';
import { useGetCurrentUser } from 'src/actions/user';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { AccountWalletCard } from '../account-wallet';

// ---------------------------------------------------------------

type PlanKey = 'FREE' | 'PAID' | 'EXTRA-PAID';

const PLAN_LABELS: Record<PlanKey, string> = {
  FREE: 'Free Account',
  PAID: 'Paid Account',
  'EXTRA-PAID': 'Extra-paid Account',
};

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
  billingSummary?: Record<string, any> | null,
): PlanKey {
  const userPlan = normalizePlan(user?.plan);
  const billingPlan = normalizePlan(billingSummary?.plan);
  const hasActiveBilling = Boolean(
    billingSummary?.payment &&
      (billingSummary.status === 'active' || billingSummary.status === 'completed'),
  );

  if (hasActiveBilling) {
    return billingPlan;
  }

  if (userPlan !== 'FREE') {
    return userPlan;
  }

  return billingPlan;
}

function getBusinessRequestAt(user?: Record<string, any> | null) {
  return user?.businessAccountRequestedAt || user?.business_account_requested_at || null;
}

function formatRequestDate(value: unknown) {
  if (!value) {
    return '';
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString();
}

function formatBillingDate(value: unknown) {
  if (!value) {
    return '—';
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString();
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

export function AccountView() {
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkUserSession } = useAuthContext();
  const { user, userLoading } = useGetCurrentUser();
  const { payments, billing, paymentsLoading } = useGetCustomerPayments();

  const [checkoutLoading, setCheckoutLoading] = useState<PaidPlanType | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<BillingProvider>('stripe');

  const billingSummary = billing || user?.billing || null;
  const plan = resolveAccountPlan(user, billingSummary);
  const accountType = PLAN_LABELS[plan];
  const billingEmail = user?.email || '';
  const billingCycle = plan === 'FREE' ? '—' : 'Monthly';
  const nextBillingDate = formatBillingDate(billingSummary?.currentPeriodEnd);
  const hasBusinessAccount = isUserBusiness(user?.role);
  const requestedAt = getBusinessRequestAt(user);
  const hasPendingBusinessRequest = Boolean(requestedAt) && !hasBusinessAccount;
  const requestedAtLabel = formatRequestDate(requestedAt);
  const isFreeAccount = plan === 'FREE';
  const billingProvider = (billingSummary?.provider || null) as BillingProvider | null;
  const hasStripeCustomer = Boolean(
    billingProvider === 'stripe' &&
      (billingSummary?.providerCustomerId || billingSummary?.externalSubscriptionId),
  );
  const hasPayPalSubscription = Boolean(
    billingProvider === 'paypal' && billingSummary?.externalSubscriptionId,
  );

  const billingStatus = useMemo(() => {
    const status = searchParams.get('billing');
    if (status === 'success' || status === 'canceled' || status === 'paypal_success') {
      return status;
    }
    return null;
  }, [searchParams]);

  useEffect(() => {
    if (billingProvider === 'paypal' || billingProvider === 'stripe') {
      setPaymentProvider(billingProvider);
    }
  }, [billingProvider]);

  useEffect(() => {
    if (!billingStatus) {
      return undefined;
    }

    let active = true;

    const sync = async () => {
      try {
        if (billingStatus === 'paypal_success') {
          const subscriptionId =
            searchParams.get('subscription_id') ||
            searchParams.get('token') ||
            searchParams.get('ba_token') ||
            '';
          if (subscriptionId) {
            await capturePayPalSubscription(subscriptionId);
          }
        }

        await refreshBillingUser();
        await checkUserSession?.();
        if (!active) {
          return;
        }

        if (billingStatus === 'canceled') {
          toast.info('Checkout canceled. No changes were made.');
        } else {
          toast.success('Payment successful. Your plan is updated.');
        }
      } catch (error: any) {
        if (active) {
          toast.error(
            error?.response?.data?.message || error?.message || 'Unable to confirm payment.',
          );
        }
      } finally {
        if (active) {
          router.replace(paths.dashboard.settings.account);
        }
      }
    };

    sync();

    return () => {
      active = false;
    };
  }, [billingStatus, checkUserSession, router, searchParams]);

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

  const handleCheckout = useCallback(
    async (nextPlan: PaidPlanType) => {
      try {
        setCheckoutLoading(nextPlan);
        const data = await createBillingCheckoutSession(nextPlan, paymentProvider);

        if (data.updated) {
          await refreshBillingUser();
          await checkUserSession?.();
          toast.success(data.message || 'Plan updated.');
          setCheckoutLoading(null);
          return;
        }

        if (!data.url) {
          throw new Error(data.message || 'Unable to start checkout.');
        }
        window.location.href = data.url;
      } catch (error: any) {
        const message =
          error?.response?.data?.message || error?.message || 'Unable to start checkout.';
        toast.error(message);
        setCheckoutLoading(null);
      }
    },
    [checkUserSession, paymentProvider],
  );

  const handlePortal = useCallback(async () => {
    try {
      setPortalLoading(true);

      if (billingProvider === 'paypal' || (!hasStripeCustomer && hasPayPalSubscription)) {
        await cancelPayPalSubscription();
        await refreshBillingUser();
        await checkUserSession?.();
        toast.success('PayPal subscription canceled. Your plan is now Free.');
        setPortalLoading(false);
        return;
      }

      const data = await createBillingPortalSession();
      if (!data.url) {
        throw new Error(data.message || 'Unable to open the billing portal.');
      }
      window.location.href = data.url;
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Unable to manage billing.';
      toast.error(message);
      setPortalLoading(false);
    }
  }, [billingProvider, checkUserSession, hasPayPalSubscription, hasStripeCustomer]);

  const planActionLabel = (target: PlanKey) => {
    if (plan === target) {
      return 'Current Plan';
    }
    if (target === 'FREE') {
      return 'Manage / Cancel';
    }
    if (plan === 'FREE') {
      return 'Upgrade';
    }
    if (target === 'EXTRA-PAID' && plan === 'PAID') {
      return 'Upgrade';
    }
    if (target === 'PAID' && plan === 'EXTRA-PAID') {
      return 'Switch plan';
    }
    return 'Upgrade';
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Account Settings"
        links={[{ name: 'Dashboard', href: paths.dashboard.settings.root }, { name: 'Account' }]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={4}>
        {billingStatus === 'success' ? (
          <Alert severity="success">Payment received. Syncing your Cosset plan…</Alert>
        ) : null}
        {billingStatus === 'canceled' ? (
          <Alert severity="info">Checkout was canceled. You can try again anytime.</Alert>
        ) : null}

        <AccountWalletCard provider={paymentProvider} />

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Current Account Type
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {userLoading ? (
                    <CircularProgress size={22} />
                  ) : (
                    <Chip
                      label={accountType}
                      color={getAccountTypeColor(plan)}
                      variant="outlined"
                      size="medium"
                      icon={
                        plan === 'FREE' ? (
                          <Iconify icon="solar:key-bold" />
                        ) : (
                          <Iconify icon="solar:star-bold" />
                        )
                      }
                    />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {plan === 'FREE'
                      ? 'Enjoy limited features with our free plan.'
                      : plan === 'PAID'
                        ? 'Unlock premium features with our paid plan.'
                        : 'Enjoy all premium features with our extra-paid plan.'}
                  </Typography>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                  Payment method
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  color="primary"
                  size="small"
                  value={paymentProvider}
                  onChange={(_event, value: BillingProvider | null) => {
                    if (value) {
                      setPaymentProvider(value);
                    }
                  }}
                  sx={{ mb: 2.5 }}
                >
                  <ToggleButton value="stripe" sx={{ px: 2 }}>
                    <Iconify icon="solar:card-bold" width={18} sx={{ mr: 1 }} />
                    Stripe
                  </ToggleButton>
                  <ToggleButton value="paypal" sx={{ px: 2 }}>
                    <Iconify icon="solar:wallet-money-bold" width={18} sx={{ mr: 1 }} />
                    PayPal
                  </ToggleButton>
                </ToggleButtonGroup>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {paymentProvider === 'paypal'
                    ? 'Upgrade with PayPal Subscriptions. Manage or cancel from this page.'
                    : 'Upgrade with Stripe Checkout. Manage invoices and cards in the Stripe portal.'}
                </Typography>

                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Available Plans
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Card
                      variant="outlined"
                      sx={{
                        p: 2,
                        height: 1,
                        transition: 'all 0.3s ease',
                        border:
                          plan === 'FREE'
                            ? `2px solid ${theme.vars.palette.primary.main}`
                            : undefined,
                        bgcolor: plan === 'FREE' ? 'action.selected' : undefined,
                      }}
                    >
                      <Stack spacing={2} sx={{ height: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Free Account
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Perfect for getting started
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          $0
                          <Typography component="span" variant="body2" color="text.secondary">
                            /mo
                          </Typography>
                        </Typography>
                        <Stack spacing={1} sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify
                              icon="solar:check-circle-bold"
                              sx={{ color: 'success.main', flexShrink: 0 }}
                            />
                            <Typography variant="body2">Basic features</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify
                              icon="solar:check-circle-bold"
                              sx={{ color: 'success.main', flexShrink: 0 }}
                            />
                            <Typography variant="body2">Limited storage</Typography>
                          </Box>
                        </Stack>
                        <LoadingButton
                          fullWidth
                          variant={plan === 'FREE' ? 'contained' : 'outlined'}
                          disabled={
                            plan === 'FREE' || (!hasStripeCustomer && !hasPayPalSubscription)
                          }
                          onClick={() => handlePortal()}
                          loading={portalLoading && plan !== 'FREE'}
                        >
                          {planActionLabel('FREE')}
                        </LoadingButton>
                      </Stack>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <Card
                      variant="outlined"
                      sx={{
                        p: 2,
                        height: 1,
                        transition: 'all 0.3s ease',
                        border:
                          plan === 'PAID'
                            ? `2px solid ${theme.vars.palette.primary.main}`
                            : undefined,
                        bgcolor: plan === 'PAID' ? 'action.selected' : undefined,
                      }}
                    >
                      <Stack spacing={2} sx={{ height: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Paid Account
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          For most users
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          $9.99
                          <Typography component="span" variant="body2" color="text.secondary">
                            /mo
                          </Typography>
                        </Typography>
                        <Stack spacing={1} sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify
                              icon="solar:check-circle-bold"
                              sx={{ color: 'success.main', flexShrink: 0 }}
                            />
                            <Typography variant="body2">All basic features</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify
                              icon="solar:check-circle-bold"
                              sx={{ color: 'success.main', flexShrink: 0 }}
                            />
                            <Typography variant="body2">Unlimited storage</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify
                              icon="solar:check-circle-bold"
                              sx={{ color: 'success.main', flexShrink: 0 }}
                            />
                            <Typography variant="body2">Priority support</Typography>
                          </Box>
                        </Stack>
                        <LoadingButton
                          fullWidth
                          variant={plan === 'PAID' ? 'contained' : 'outlined'}
                          color="primary"
                          disabled={plan === 'PAID' || Boolean(checkoutLoading)}
                          loading={checkoutLoading === 'PAID'}
                          onClick={() => handleCheckout('PAID')}
                        >
                          {planActionLabel('PAID')}
                        </LoadingButton>
                      </Stack>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <Card
                      variant="outlined"
                      sx={{
                        p: 2,
                        height: 1,
                        transition: 'all 0.3s ease',
                        border:
                          plan === 'EXTRA-PAID'
                            ? `2px solid ${theme.vars.palette.primary.main}`
                            : undefined,
                        bgcolor: plan === 'EXTRA-PAID' ? 'action.selected' : undefined,
                      }}
                    >
                      <Stack spacing={2} sx={{ height: 1 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'start',
                          }}
                        >
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Extra-paid Account
                          </Typography>
                          <Chip label="Popular" size="small" color="primary" variant="filled" />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          For power users
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          $19.99
                          <Typography component="span" variant="body2" color="text.secondary">
                            /mo
                          </Typography>
                        </Typography>
                        <Stack spacing={1} sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify
                              icon="solar:check-circle-bold"
                              sx={{ color: 'success.main', flexShrink: 0 }}
                            />
                            <Typography variant="body2">All paid features</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify
                              icon="solar:check-circle-bold"
                              sx={{ color: 'success.main', flexShrink: 0 }}
                            />
                            <Typography variant="body2">Advanced analytics</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify
                              icon="solar:check-circle-bold"
                              sx={{ color: 'success.main', flexShrink: 0 }}
                            />
                            <Typography variant="body2">24/7 dedicated support</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify
                              icon="solar:check-circle-bold"
                              sx={{ color: 'success.main', flexShrink: 0 }}
                            />
                            <Typography variant="body2">Custom integrations</Typography>
                          </Box>
                        </Stack>
                        <LoadingButton
                          fullWidth
                          variant={plan === 'EXTRA-PAID' ? 'contained' : 'outlined'}
                          color="primary"
                          disabled={plan === 'EXTRA-PAID' || Boolean(checkoutLoading)}
                          loading={checkoutLoading === 'EXTRA-PAID'}
                          onClick={() => handleCheckout('EXTRA-PAID')}
                        >
                          {planActionLabel('EXTRA-PAID')}
                        </LoadingButton>
                      </Stack>
                    </Card>
                  </Grid>
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
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Account Role
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Business accounts unlock tools for managing media, reservations, and
                  customer-facing experiences.
                </Typography>
              </Box>

              <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                {hasBusinessAccount ? (
                  <Chip label="Business account active" color="success" variant="filled" />
                ) : hasPendingBusinessRequest ? (
                  <Chip label="Request pending review" color="warning" variant="filled" />
                ) : (
                  <Chip label="Standard account" color="default" variant="outlined" />
                )}
              </Stack>

              {hasPendingBusinessRequest ? (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    bgcolor: 'warning.lighter',
                    border: '1px solid',
                    borderColor: 'warning.light',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: 'warning.darker', mb: 0.5 }}>
                    Your request has been sent
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    An admin will review your business account request
                    {requestedAtLabel ? ` (submitted ${requestedAtLabel})` : ''}. You will get
                    access once it is approved.
                  </Typography>
                </Box>
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        {!isFreeAccount && (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    Billing Information
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Billing Email
                      </Typography>
                      <Typography variant="body1">{billingEmail}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Payment Provider
                      </Typography>
                      <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                        {billingProvider || paymentProvider}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Billing Cycle
                      </Typography>
                      <Typography variant="body1">{billingCycle}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Next Billing Date
                      </Typography>
                      <Typography variant="body1">{nextBillingDate}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Status
                      </Typography>
                      <Chip label="Active" color="success" size="small" variant="filled" />
                    </Box>
                  </Grid>
                </Grid>

                <Divider />

                <Stack direction="row" spacing={2} flexWrap="wrap">
                  {billingProvider === 'paypal' || hasPayPalSubscription ? (
                    <LoadingButton
                      variant="outlined"
                      color="error"
                      onClick={handlePortal}
                      loading={portalLoading}
                    >
                      Cancel PayPal Subscription
                    </LoadingButton>
                  ) : (
                    <>
                      <LoadingButton
                        variant="outlined"
                        onClick={handlePortal}
                        loading={portalLoading}
                      >
                        View Invoice History
                      </LoadingButton>
                      <LoadingButton
                        variant="outlined"
                        onClick={handlePortal}
                        loading={portalLoading}
                      >
                        Update Payment Method
                      </LoadingButton>
                    </>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Payment history
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Payment history stays in the payments table, while provider account links are
                  managed by customer id.
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
                        <TableCell>Amount</TableCell>
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

        <Card sx={{ borderColor: 'error.main', borderWidth: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'error.main', mb: 1 }}>
                  Danger Zone
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cancel Stripe via Customer Portal or cancel PayPal from here. Your plan returns to
                  Free when the subscription ends.
                </Typography>
              </Box>

              <LoadingButton
                variant="outlined"
                color="error"
                disabled={isFreeAccount && !hasStripeCustomer && !hasPayPalSubscription}
                onClick={handlePortal}
                loading={portalLoading}
              >
                Cancel Subscription
              </LoadingButton>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </DashboardContent>
  );
}
