'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import type { BillingProvider } from 'src/actions/billing';
import {
  confirmWalletTopup,
  createWalletTopupSession,
  formatWalletMoney,
  refreshWallet,
  useGetWallet,
} from 'src/actions/wallet';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';

import type { WalletLedgerKind } from 'src/types/wallet';

// ----------------------------------------------------------------------

const TOPUP_PRESETS = [500, 1000, 2500, 5000];

function kindLabel(kind: WalletLedgerKind | string) {
  switch (kind) {
    case 'topup':
      return 'Top-up';
    case 'cinema_watch':
      return 'Cinema';
    case 'refund':
      return 'Refund';
    default:
      return kind;
  }
}

type Props = {
  provider: BillingProvider;
};

export function AccountWalletCard({ provider }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { wallet, ledger, walletLoading } = useGetWallet();

  const [amountCents, setAmountCents] = useState(1000);
  const [customAmount, setCustomAmount] = useState('10');
  const [topupLoading, setTopupLoading] = useState(false);

  const walletStatus = useMemo(() => {
    const status = searchParams.get('wallet');
    if (status === 'success' || status === 'canceled' || status === 'paypal_success') {
      return status;
    }
    return null;
  }, [searchParams]);

  useEffect(() => {
    if (!walletStatus) {
      return undefined;
    }

    let active = true;

    const sync = async () => {
      try {
        if (walletStatus === 'canceled') {
          toast.info('Wallet top-up canceled. No money was added.');
        } else if (walletStatus === 'paypal_success') {
          const orderId =
            searchParams.get('token') ||
            searchParams.get('orderId') ||
            searchParams.get('subscription_id') ||
            '';
          if (orderId) {
            await confirmWalletTopup({ provider: 'paypal', orderId, token: orderId });
          }
          toast.success('Wallet topped up successfully.');
        } else {
          const sessionId = searchParams.get('session_id') || '';
          if (sessionId) {
            await confirmWalletTopup({ provider: 'stripe', sessionId });
          }
          toast.success('Wallet topped up successfully.');
        }

        await refreshWallet();
      } catch (error: any) {
        if (active) {
          toast.error(error?.message || 'Unable to confirm wallet top-up.');
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
  }, [router, searchParams, walletStatus]);

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

  const handleTopup = useCallback(async () => {
    try {
      setTopupLoading(true);
      const data = await createWalletTopupSession(amountCents, provider);
      if (!data.url) {
        throw new Error(data.message || 'Unable to start wallet checkout.');
      }
      window.location.href = data.url;
    } catch (error: any) {
      toast.error(error?.message || 'Unable to start wallet checkout.');
      setTopupLoading(false);
    }
  }, [amountCents, provider]);

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                Digital wallet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add money once, then pay small amounts for services such as watching a film.
              </Typography>
            </Box>
            <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Available balance
              </Typography>
              {walletLoading ? (
                <CircularProgress size={22} />
              ) : (
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {formatWalletMoney(wallet.balanceCents, wallet.currency)}
                </Typography>
              )}
            </Stack>
          </Stack>

          {walletStatus === 'success' || walletStatus === 'paypal_success' ? (
            <Alert severity="success">Payment received. Crediting your wallet…</Alert>
          ) : null}
          {walletStatus === 'canceled' ? (
            <Alert severity="info">Top-up was canceled. You can try again anytime.</Alert>
          ) : null}

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Add money
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-end' }}>
              <TextField
                label="Custom amount (USD)"
                value={customAmount}
                onChange={(event) => handleCustomAmount(event.target.value)}
                type="number"
                inputProps={{ min: 1, step: '0.01' }}
                sx={{ maxWidth: 220 }}
              />
              <LoadingButton
                variant="contained"
                loading={topupLoading}
                onClick={handleTopup}
                startIcon={<Iconify icon="solar:wallet-money-bold" />}
              >
                Add {formatWalletMoney(amountCents)} with {provider === 'paypal' ? 'PayPal' : 'Stripe'}
              </LoadingButton>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Uses the payment method selected above. Minimum $1.00, maximum $200.00.
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Recent activity
            </Typography>
            {walletLoading ? (
              <CircularProgress size={22} />
            ) : ledger.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No wallet activity yet. Add money to get started.
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
                          {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell>{kindLabel(row.kind)}</TableCell>
                        <TableCell>{row.description || '—'}</TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: row.deltaCents < 0 ? 'error.main' : 'success.main' }}
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
  );
}
