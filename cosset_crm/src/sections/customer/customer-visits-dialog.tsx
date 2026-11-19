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

import { useGetCustomerPageVisits } from 'src/actions/page-visit';

// ----------------------------------------------------------------------

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type Props = {
  open: boolean;
  customerId: string;
  customerName: string;
  onClose: () => void;
};

function fNumber(value: number) {
  return Number(value || 0).toLocaleString();
}

function formatDateTime(value: string | number | Date | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

export function CustomerVisitsDialog({ open, customerId, customerName, onClose }: Props) {
  const theme = useTheme();
  const { detail, detailLoading, detailError } = useGetCustomerPageVisits(
    customerId,
    open && Boolean(customerId),
  );

  const chart = useMemo(() => {
    const pages = detail?.pages || [];
    return {
      categories: pages.map((page) => page.label),
      series: [
        {
          name: 'Visits',
          data: pages.map((page) => Number(page.visitCount || 0)),
        },
      ],
    };
  }, [detail?.pages]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Page visits · {customerName}</DialogTitle>
      <DialogContent dividers>
        {detailLoading ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : detailError ? (
          <Typography variant="body2" color="error">
            Failed to load visit data for this customer.
          </Typography>
        ) : !detail || !detail.pages.length ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No page visits recorded for this customer yet.
          </Typography>
        ) : (
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Total visits
                </Typography>
                <Typography variant="h4">{fNumber(detail.totalVisits)}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Pages visited
                </Typography>
                <Typography variant="h4">{fNumber(detail.pagesVisited)}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Last visit
                </Typography>
                <Typography variant="subtitle1">{formatDateTime(detail.lastVisitedAt)}</Typography>
              </Box>
            </Stack>

            <Box sx={{ minHeight: 320 }}>
              <Chart
                type="bar"
                height={300}
                series={chart.series}
                options={{
                  chart: {
                    toolbar: { show: false },
                    fontFamily: theme.typography.fontFamily,
                    foreColor: theme.palette.text.disabled,
                  },
                  colors: [theme.palette.primary.main],
                  dataLabels: { enabled: false },
                  plotOptions: {
                    bar: {
                      borderRadius: 6,
                      columnWidth: '55%',
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
                      formatter: (value: number) => fNumber(Math.round(value)),
                    },
                  },
                  tooltip: { theme: theme.palette.mode },
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
