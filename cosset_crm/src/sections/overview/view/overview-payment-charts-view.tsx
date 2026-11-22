'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import {
  useGetPaymentCustomers,
  type CustomerPaymentOverview,
} from 'src/actions/billing';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

function isUserAdmin(role?: string | null) {
  return String(role || '')
    .trim()
    .toLowerCase() === 'admin';
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

function getCustomerName(customer: CustomerPaymentOverview) {
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return fullName || customer.email || customer.id;
}

function isPaidCustomer(customer: CustomerPaymentOverview) {
  const plan = String(customer.plan || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');
  return plan === 'PAID' || plan === 'EXTRA-PAID' || Number(customer.totalPaidAmountCents || 0) > 0;
}

function buildLastNDates(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    dates.push(date.toISOString().slice(0, 10));
  }

  return dates;
}

// ----------------------------------------------------------------------

export function OverviewPaymentChartsView() {
  const theme = useTheme();
  const { user } = useAuthContext();
  const canView = isUserAdmin(user?.role);

  const { customers, customersLoading, customersError } = useGetPaymentCustomers(300, 0, canView);

  const paidCustomers = useMemo(
    () => customers.filter((customer) => isPaidCustomer(customer)),
    [customers]
  );

  const totalAmountCents = useMemo(
    () =>
      paidCustomers.reduce(
        (sum, customer) => sum + Number(customer.totalPaidAmountCents || 0),
        0
      ),
    [paidCustomers]
  );

  const expiredCount = useMemo(
    () => paidCustomers.filter((customer) => Boolean(customer.isPaidPeriodExpired)).length,
    [paidCustomers]
  );

  const planChart = useMemo(() => {
    const buckets = {
      PAID: 0,
      'EXTRA-PAID': 0,
      OTHER: 0,
    };

    paidCustomers.forEach((customer) => {
      const plan = String(customer.billingPlan || customer.plan || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '-');
      const amount = Number(customer.totalPaidAmountCents || 0);
      if (plan === 'PAID') buckets.PAID += amount;
      else if (plan === 'EXTRA-PAID') buckets['EXTRA-PAID'] += amount;
      else buckets.OTHER += amount;
    });

    return {
      categories: ['Paid', 'Extra-paid', 'Other'],
      series: [
        {
          name: 'Total amount',
          data: [buckets.PAID, buckets['EXTRA-PAID'], buckets.OTHER].map((cents) =>
            Number((cents / 100).toFixed(2))
          ),
        },
      ],
    };
  }, [paidCustomers]);

  const topCustomersChart = useMemo(() => {
    const top = [...paidCustomers]
      .sort(
        (left, right) =>
          Number(right.totalPaidAmountCents || 0) - Number(left.totalPaidAmountCents || 0)
      )
      .slice(0, 10);

    return {
      categories: top.map((customer) => getCustomerName(customer)),
      series: [
        {
          name: 'Total amount',
          data: top.map((customer) =>
            Number((Number(customer.totalPaidAmountCents || 0) / 100).toFixed(2))
          ),
        },
      ],
      rows: top,
    };
  }, [paidCustomers]);

  const dailyPaidChart = useMemo(() => {
    const dates = buildLastNDates(30);
    const totalsByDate = new Map(dates.map((date) => [date, 0]));

    paidCustomers.forEach((customer) => {
      if (!customer.paidAt) return;
      const paidDate = new Date(customer.paidAt);
      if (Number.isNaN(paidDate.getTime())) return;
      const key = paidDate.toISOString().slice(0, 10);
      if (!totalsByDate.has(key)) return;
      totalsByDate.set(
        key,
        (totalsByDate.get(key) || 0) + Number(customer.totalPaidAmountCents || 0)
      );
    });

    return {
      categories: dates.map((date) =>
        new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })
      ),
      series: [
        {
          name: 'Paid amount',
          data: dates.map((date) =>
            Number(((totalsByDate.get(date) || 0) / 100).toFixed(2))
          ),
        },
      ],
    };
  }, [paidCustomers]);

  const sharedChartOptions = {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: theme.typography.fontFamily,
      foreColor: theme.palette.text.disabled,
    },
    colors: [theme.palette.primary.main, theme.palette.info.main],
    dataLabels: { enabled: false },
    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 3,
    },
    tooltip: {
      theme: theme.palette.mode,
      y: {
        formatter: (value: number) => formatMoney(Math.round(value * 100)),
      },
    },
  };

  if (!canView) {
    return (
      <Typography variant="body2" color="text.secondary">
        Admin access is required to view payment analytics.
      </Typography>
    );
  }

  if (customersLoading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  if (customersError) {
    return (
      <Typography variant="body2" color="error">
        Failed to load payment analytics.
      </Typography>
    );
  }

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Total amount
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              {formatMoney(totalAmountCents)}
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Paid customers
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              {paidCustomers.length}
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Expired periods
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              {expiredCount}
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Average per customer
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              {formatMoney(
                paidCustomers.length
                  ? Math.round(totalAmountCents / paidCustomers.length)
                  : 0
              )}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardHeader title="Paid trend" subheader="Total amount by paid date · last 30 days" />
            <Box sx={{ p: 2.5, pt: 0, minHeight: 360 }}>
              <Chart
                type="area"
                height={320}
                series={dailyPaidChart.series}
                options={{
                  ...sharedChartOptions,
                  colors: [theme.palette.success.main],
                  stroke: { curve: 'smooth', width: 3 },
                  fill: {
                    type: 'gradient',
                    gradient: {
                      shadeIntensity: 1,
                      opacityFrom: 0.45,
                      opacityTo: 0.05,
                      stops: [0, 100],
                    },
                  },
                  xaxis: { categories: dailyPaidChart.categories },
                  yaxis: {
                    labels: {
                      formatter: (value: number) => formatMoney(Math.round(value * 100)),
                    },
                  },
                }}
              />
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card>
            <CardHeader title="Amount by plan" subheader="Paid vs Extra-paid totals" />
            <Box sx={{ p: 2.5, pt: 0, minHeight: 360 }}>
              <Chart
                type="bar"
                height={320}
                series={planChart.series}
                options={{
                  ...sharedChartOptions,
                  colors: [theme.palette.info.main],
                  plotOptions: {
                    bar: {
                      borderRadius: 6,
                      columnWidth: '45%',
                    },
                  },
                  xaxis: { categories: planChart.categories },
                  yaxis: {
                    labels: {
                      formatter: (value: number) => formatMoney(Math.round(value * 100)),
                    },
                  },
                }}
              />
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card>
            <CardHeader title="Top customers" subheader="By total paid amount" />
            <Box sx={{ p: 2.5, pt: 0, minHeight: 360 }}>
              {topCustomersChart.categories.length ? (
                <Chart
                  type="bar"
                  height={320}
                  series={topCustomersChart.series}
                  options={{
                    ...sharedChartOptions,
                    colors: [theme.palette.warning.main],
                    plotOptions: {
                      bar: {
                        horizontal: true,
                        borderRadius: 6,
                        barHeight: '70%',
                      },
                    },
                    xaxis: {
                      categories: topCustomersChart.categories,
                      labels: {
                        formatter: (value: string) => {
                          const numeric = Number(value);
                          return Number.isFinite(numeric)
                            ? formatMoney(Math.round(numeric * 100))
                            : value;
                        },
                      },
                    },
                    yaxis: {
                      labels: { maxWidth: 140 },
                    },
                  }}
                />
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ py: 8, textAlign: 'center' }}
                >
                  No paid customers yet.
                </Typography>
              )}
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardHeader title="Top payers" subheader="Customers with highest total amount" />
            <Box sx={{ p: 2.5, pt: 0 }}>
              {topCustomersChart.rows.length ? (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Customer</TableCell>
                        <TableCell>Plan</TableCell>
                        <TableCell align="right">Total amount</TableCell>
                        <TableCell>Paid date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topCustomersChart.rows.map((customer) => (
                        <TableRow key={customer.id} hover>
                          <TableCell>
                            <Typography variant="subtitle2">
                              {getCustomerName(customer)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {customer.email || customer.id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {customer.billingPlan || customer.plan || 'FREE'}
                          </TableCell>
                          <TableCell align="right">
                            {formatMoney(Number(customer.totalPaidAmountCents || 0))}
                          </TableCell>
                          <TableCell>
                            {customer.paidAt
                              ? new Date(customer.paidAt).toLocaleDateString()
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ py: 6, textAlign: 'center' }}
                >
                  Payment totals will appear after customers are marked paid.
                </Typography>
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
