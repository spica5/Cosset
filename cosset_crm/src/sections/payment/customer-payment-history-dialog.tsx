'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { useGetCustomerBilling } from 'src/actions/billing';

// ----------------------------------------------------------------------

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type Props = {
  open: boolean;
  customerId: string;
  customerName: string;
  onClose: () => void;
};

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

function formatDateLabel(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

export function CustomerPaymentHistoryDialog({
  open,
  customerId,
  customerName,
  onClose,
}: Props) {
  const theme = useTheme();
  const { payments, paymentsLoading, paymentsError, billing } = useGetCustomerBilling(
    customerId,
    open && Boolean(customerId)
  );

  const paidPayments = useMemo(
    () =>
      [...payments]
        .filter(
          (payment) =>
            (payment.status === 'active' || payment.status === 'completed') &&
            Number(payment.amountCents || 0) > 0 &&
            String(payment.plan || '').toUpperCase() !== 'FREE'
        )
        .sort((left, right) => {
          const leftTime = new Date(String(left.createdAt || 0)).getTime();
          const rightTime = new Date(String(right.createdAt || 0)).getTime();
          return leftTime - rightTime;
        }),
    [payments]
  );

  const currency = billing?.paidCurrency || paidPayments[0]?.currency || 'usd';

  const totalPaidCents = useMemo(
    () => paidPayments.reduce((sum, payment) => sum + Number(payment.amountCents || 0), 0),
    [paidPayments]
  );

  const chart = useMemo(() => {
    const categories = paidPayments.map((payment) => formatDateLabel(payment.createdAt));
    const amounts = paidPayments.map((payment) => Number(payment.amountCents || 0) / 100);
    const runningTotals: number[] = [];
    paidPayments.reduce((sum, payment) => {
      const next = sum + Number(payment.amountCents || 0) / 100;
      runningTotals.push(Number(next.toFixed(2)));
      return next;
    }, 0);

    return {
      categories,
      series: [
        { name: 'Payment', type: 'column', data: amounts },
        { name: 'Total amount', type: 'line', data: runningTotals },
      ],
    };
  }, [paidPayments]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Paid history · {customerName}</DialogTitle>
      <DialogContent dividers>
        {paymentsLoading ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : paymentsError ? (
          <Typography variant="body2" color="error">
            Failed to load payment history for this customer.
          </Typography>
        ) : !paidPayments.length ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No paid history recorded for this customer yet.
          </Typography>
        ) : (
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Total amount
                </Typography>
                <Typography variant="h4">{formatMoney(totalPaidCents, currency)}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Payments
                </Typography>
                <Typography variant="h4">{paidPayments.length}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Latest payment
                </Typography>
                <Typography variant="subtitle1">
                  {formatDateLabel(paidPayments[paidPayments.length - 1]?.createdAt)}
                </Typography>
              </Box>
            </Stack>

            <Box sx={{ minHeight: 320 }}>
              <Chart
                type="line"
                height={320}
                series={chart.series}
                options={{
                  chart: {
                    toolbar: { show: false },
                    fontFamily: theme.typography.fontFamily,
                    foreColor: theme.palette.text.disabled,
                    stacked: false,
                  },
                  colors: [theme.palette.primary.main, theme.palette.warning.main],
                  stroke: {
                    width: [0, 3],
                    curve: 'smooth',
                  },
                  dataLabels: { enabled: false },
                  plotOptions: {
                    bar: {
                      borderRadius: 6,
                      columnWidth: '45%',
                    },
                  },
                  grid: {
                    borderColor: theme.palette.divider,
                    strokeDashArray: 3,
                  },
                  xaxis: {
                    categories: chart.categories,
                    labels: { rotate: -25 },
                  },
                  yaxis: {
                    labels: {
                      formatter: (value: number) =>
                        formatMoney(Math.round(value * 100), currency),
                    },
                  },
                  tooltip: {
                    theme: theme.palette.mode,
                    y: {
                      formatter: (value: number) => formatMoney(Math.round(value * 100), currency),
                    },
                  },
                  legend: { position: 'top' },
                }}
              />
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
