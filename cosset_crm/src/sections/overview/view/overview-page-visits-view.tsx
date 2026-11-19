'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetPageVisitStats } from 'src/actions/page-visit';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

function isUserAdmin(role?: string | null) {
  return String(role || '')
    .trim()
    .toLowerCase() === 'admin';
}

function fNumber(value: number) {
  return Number(value || 0).toLocaleString();
}

function formatUpdatedAt(value: string | number | Date | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function getCustomerName(customer: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  customerId: string;
}) {
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return fullName || customer.email || customer.customerId;
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

export function OverviewPageVisitsView() {
  const theme = useTheme();
  const { user } = useAuthContext();
  const canView = isUserAdmin(user?.role);
  const { stats, customers, daily, statsLoading, statsError, refreshStats } =
    useGetPageVisitStats(canView);

  const totalVisits = stats.reduce((sum, item) => sum + Number(item.totalVisits || 0), 0);
  const totalUniques = stats.reduce((sum, item) => sum + Number(item.uniqueVisitors || 0), 0);
  const customersWithVisits = customers.length;

  const pageBarChart = useMemo(() => {
    const categories = stats.map((item) => item.label);
    const visits = stats.map((item) => Number(item.totalVisits || 0));
    const uniques = stats.map((item) => Number(item.uniqueVisitors || 0));

    return {
      categories,
      series: [
        { name: 'Total visits', data: visits },
        { name: 'Unique visitors', data: uniques },
      ],
    };
  }, [stats]);

  const dailyTrendChart = useMemo(() => {
    const dates = buildLastNDates(14);
    const totalsByDate = new Map(dates.map((date) => [date, 0]));

    daily.forEach((item) => {
      const current = totalsByDate.get(item.visitDate) || 0;
      totalsByDate.set(item.visitDate, current + Number(item.visitCount || 0));
    });

    return {
      categories: dates.map((date) =>
        new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
      ),
      series: [
        {
          name: 'Visits',
          data: dates.map((date) => totalsByDate.get(date) || 0),
        },
      ],
    };
  }, [daily]);

  const customerBarChart = useMemo(() => {
    const topCustomers = customers.slice(0, 10);
    return {
      categories: topCustomers.map((item) => getCustomerName(item)),
      series: [
        {
          name: 'Visits',
          data: topCustomers.map((item) => Number(item.totalVisits || 0)),
        },
      ],
    };
  }, [customers]);

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
    tooltip: { theme: theme.palette.mode },
  };

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
          <Typography variant="h4">Dashboard</Typography>
          <Breadcrumbs>
            <Link component={RouterLink} href={paths.dashboard.root} color="inherit" underline="hover">
              Dashboard
            </Link>
            <Typography color="text.primary">Page visits</Typography>
          </Breadcrumbs>
        </Stack>

        {canView ? (
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<Iconify icon="solar:restart-bold" />}
            onClick={() => refreshStats()}
          >
            Refresh
          </Button>
        ) : null}
      </Stack>

      {!canView ? (
        <Typography variant="body2" color="text.secondary">
          Admin access is required to view page visit analytics.
        </Typography>
      ) : statsLoading ? (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : statsError ? (
        <Stack spacing={1}>
          <Typography variant="body2" color="error">
            Failed to load page visit stats.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Check that Cosset API is running and NEXT_PUBLIC_SERVER_URL points to it, then click
            Refresh.
          </Typography>
        </Stack>
      ) : (
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total visits
                </Typography>
                <Typography variant="h3" sx={{ mt: 1 }}>
                  {fNumber(totalVisits)}
                </Typography>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Unique visitors
                </Typography>
                <Typography variant="h3" sx={{ mt: 1 }}>
                  {fNumber(totalUniques)}
                </Typography>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Customers with visits
                </Typography>
                <Typography variant="h3" sx={{ mt: 1 }}>
                  {fNumber(customersWithVisits)}
                </Typography>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Tracked pages
                </Typography>
                <Typography variant="h3" sx={{ mt: 1 }}>
                  {fNumber(stats.length)}
                </Typography>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Card>
                <CardHeader title="Visits by page" subheader="Total vs unique visitors" />
                <Box sx={{ p: 2.5, pt: 0, minHeight: 360 }}>
                  <Chart
                    type="bar"
                    height={320}
                    series={pageBarChart.series}
                    options={{
                      ...sharedChartOptions,
                      plotOptions: {
                        bar: {
                          borderRadius: 6,
                          columnWidth: '55%',
                        },
                      },
                      xaxis: {
                        categories: pageBarChart.categories,
                        labels: { rotate: -35 },
                      },
                      yaxis: {
                        labels: {
                          formatter: (value: number) => fNumber(Math.round(value)),
                        },
                      },
                      legend: { position: 'top', horizontalAlign: 'right' },
                    }}
                  />
                </Box>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 5 }}>
              <Card>
                <CardHeader title="Visit trend" subheader="Last 14 days" />
                <Box sx={{ p: 2.5, pt: 0, minHeight: 360 }}>
                  <Chart
                    type="area"
                    height={320}
                    series={dailyTrendChart.series}
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
                      xaxis: { categories: dailyTrendChart.categories },
                      yaxis: {
                        labels: {
                          formatter: (value: number) => fNumber(Math.round(value)),
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
                <CardHeader title="Top customers" subheader="By total page visits" />
                <Box sx={{ p: 2.5, pt: 0, minHeight: 360 }}>
                  {customerBarChart.categories.length ? (
                    <Chart
                      type="bar"
                      height={320}
                      series={customerBarChart.series}
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
                          categories: customerBarChart.categories,
                          labels: {
                            formatter: (value: string) => {
                              const numeric = Number(value);
                              return Number.isFinite(numeric) ? fNumber(numeric) : value;
                            },
                          },
                        },
                        yaxis: {
                          labels: {
                            maxWidth: 140,
                          },
                        },
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>
                      No customer visits recorded yet.
                    </Typography>
                  )}
                </Box>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 7 }}>
              <Card>
                <CardHeader title="Visits per customer" subheader="Signed-in customers only" />
                <Box sx={{ p: 2.5, pt: 0 }}>
                  {customers.length ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Customer</TableCell>
                            <TableCell>Plan</TableCell>
                            <TableCell align="right">Visits</TableCell>
                            <TableCell align="right">Pages</TableCell>
                            <TableCell>Last visit</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {customers.map((customer) => {
                            const name = getCustomerName(customer);
                            return (
                              <TableRow key={customer.customerId} hover>
                                <TableCell>
                                  <Stack direction="row" spacing={1.25} alignItems="center">
                                    <Avatar src={customer.photoURL || undefined} sx={{ width: 32, height: 32 }}>
                                      {name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box sx={{ minWidth: 0 }}>
                                      <Typography variant="subtitle2" noWrap>
                                        {name}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" noWrap>
                                        {customer.email || customer.customerId}
                                      </Typography>
                                    </Box>
                                  </Stack>
                                </TableCell>
                                <TableCell>{customer.plan || 'FREE'}</TableCell>
                                <TableCell align="right">{fNumber(customer.totalVisits)}</TableCell>
                                <TableCell align="right">{fNumber(customer.pagesVisited)}</TableCell>
                                <TableCell>{formatUpdatedAt(customer.lastVisitedAt)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
                      Customer visit counts will appear after signed-in users browse Cosset pages.
                    </Typography>
                  )}
                </Box>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            {[...stats]
              .sort((a, b) => Number(b.totalVisits || 0) - Number(a.totalVisits || 0))
              .map((item) => (
                <Grid key={item.pageKey} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Card sx={{ p: 2.5, height: 1 }}>
                    <Stack spacing={1.25}>
                      <Typography variant="subtitle1">{item.label}</Typography>
                      <Typography variant="caption" color="text.disabled">
                        {item.pageKey}
                      </Typography>
                      <Box>
                        <Typography variant="h4">{fNumber(item.totalVisits)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          total visits
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {fNumber(item.uniqueVisitors)} unique visitors
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        Updated {formatUpdatedAt(item.updatedAt)}
                      </Typography>
                    </Stack>
                  </Card>
                </Grid>
              ))}
          </Grid>
        </Stack>
      )}
    </DashboardContent>
  );
}
