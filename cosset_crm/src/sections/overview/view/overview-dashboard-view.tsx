'use client';

import { useState, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetPageVisitStats } from 'src/actions/page-visit';
import { useGetPaymentCustomers } from 'src/actions/billing';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { OverviewPageVisitsView } from './overview-page-visits-view';
import { OverviewPaymentChartsView } from './overview-payment-charts-view';

// ----------------------------------------------------------------------

type DashboardTab = 'visit' | 'payment';

const DASHBOARD_TABS: Array<{ value: DashboardTab; label: string }> = [
  { value: 'visit', label: 'Visit' },
  { value: 'payment', label: 'Payment' },
];

function isUserAdmin(role?: string | null) {
  return String(role || '')
    .trim()
    .toLowerCase() === 'admin';
}

// ----------------------------------------------------------------------

export function OverviewDashboardView() {
  const theme = useTheme();
  const { user } = useAuthContext();
  const canView = isUserAdmin(user?.role);

  const [tab, setTab] = useState<DashboardTab>('visit');

  const { refreshStats } = useGetPageVisitStats(canView && tab === 'visit');
  const { refreshCustomers } = useGetPaymentCustomers(300, 0, canView && tab === 'payment');

  const handleChangeTab = useCallback((_: React.SyntheticEvent, next: DashboardTab) => {
    setTab(next);
  }, []);

  const handleRefresh = useCallback(() => {
    if (tab === 'visit') {
      refreshStats();
      return;
    }
    refreshCustomers();
  }, [refreshCustomers, refreshStats, tab]);

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
            <Link
              component={RouterLink}
              href={paths.dashboard.root}
              color="inherit"
              underline="hover"
            >
              Dashboard
            </Link>
            <Typography color="text.primary">
              {tab === 'visit' ? 'Visit' : 'Payment'}
            </Typography>
          </Breadcrumbs>
        </Stack>

        {canView ? (
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<Iconify icon="solar:restart-bold" />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        ) : null}
      </Stack>

      <Tabs
        value={tab}
        onChange={handleChangeTab}
        sx={{
          mb: 3,
          px: 0,
          boxShadow: `inset 0 -2px 0 0 ${theme.vars.palette.divider}`,
        }}
      >
        {DASHBOARD_TABS.map((item) => (
          <Tab
            key={item.value}
            value={item.value}
            label={item.label}
            iconPosition="end"
            icon={
              <Label
                variant={(item.value === tab && 'filled') || 'soft'}
                color={(item.value === 'payment' && 'success') || 'info'}
              >
                {item.value === 'visit' ? 'Visits' : 'Payments'}
              </Label>
            }
          />
        ))}
      </Tabs>

      {tab === 'visit' ? (
        <OverviewPageVisitsView embedded />
      ) : (
        <OverviewPaymentChartsView />
      )}
    </DashboardContent>
  );
}
