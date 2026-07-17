'use client';

import type { IBrandProductOrder } from 'src/types/brand-store';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getS3SignedUrl } from 'src/utils/helper';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import {
  useGetMyBrandStore,
  useGetMyBrandProductOrders,
  updateBrandProductOrderStatus,
} from 'src/actions/brand-store';

import { toast } from 'src/components/dashboard/snackbar';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin, isUserBusiness } from 'src/auth/utils/role';

// ----------------------------------------------------------------------

const formatDate = (value?: string | Date | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
};

const statusColor = (status: IBrandProductOrder['status']) => {
  if (status === 'fulfilled') return 'success';
  if (status === 'cancelled') return 'error';
  return 'warning';
};

function ClientAvatar({
  name,
  photoURL,
}: {
  name: string;
  photoURL?: string | null;
}) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let mounted = true;

    const resolve = async () => {
      const raw = String(photoURL || '').trim();
      if (!raw) {
        if (mounted) setSrc('');
        return;
      }

      if (
        raw.startsWith('http://') ||
        raw.startsWith('https://') ||
        raw.startsWith('data:') ||
        raw.startsWith('blob:')
      ) {
        if (mounted) setSrc(raw);
        return;
      }

      const signed = await getS3SignedUrl(raw.replace(/^public:/, ''));
      if (mounted) setSrc(signed || '');
    };

    resolve();

    return () => {
      mounted = false;
    };
  }, [photoURL]);

  return (
    <Avatar src={src || undefined} alt={name} sx={{ width: 36, height: 36, fontSize: 14 }}>
      {name.charAt(0).toUpperCase() || 'C'}
    </Avatar>
  );
}

export function BrandsClientsView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const canManage = isUserBusiness(user?.role) || isUserAdmin(user?.role);
  const { store, storeLoading } = useGetMyBrandStore(canManage);
  const { orders, ordersLoading, ordersEmpty } = useGetMyBrandProductOrders(canManage);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const uniqueClientCount = useMemo(() => {
    const keys = new Set(
      orders.map((order) => order.customerId || order.customerEmail || order.customerName)
    );
    return keys.size;
  }, [orders]);

  const handleStatus = async (
    order: IBrandProductOrder,
    status: IBrandProductOrder['status'],
  ) => {
    try {
      setUpdatingId(order.id);
      await updateBrandProductOrderStatus(order.id, status);
      toast.success(`Marked as ${status}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update order');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!canManage) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title="Business account required"
          description="Only business accounts can view product clients."
          sx={{ py: 10 }}
          action={
            <Button
              variant="contained"
              onClick={() => router.push(paths.dashboard.settings.account)}
            >
              Go to account settings
            </Button>
          }
        />
      </DashboardContent>
    );
  }

  if (storeLoading || ordersLoading) {
    return (
      <DashboardContent>
        <Typography variant="body2" color="text.secondary">
          Loading clients...
        </Typography>
      </DashboardContent>
    );
  }

  if (!store) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title="Open your store first"
          description="Create your store on Brands Boulevard before tracking product clients."
          sx={{ py: 10 }}
          action={
            <Button
              variant="contained"
              onClick={() => router.push(paths.dashboard.community.brandsBoulevard.myStore)}
            >
              Open my store
            </Button>
          }
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Clients"
        links={[
          { name: 'Dashboard', href: paths.dashboard.community.brandsBoulevard.myStore },
          { name: 'Clients' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2.5 }}>
        <Chip label={`${orders.length} purchases`} />
        <Chip label={`${uniqueClientCount} clients`} color="primary" variant="outlined" />
      </Stack>

      {ordersEmpty ? (
        <EmptyContent
          filled
          title="No purchases yet"
          description="When customers buy your products from the storefront, they will appear here."
          sx={{ py: 10 }}
        />
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Client</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Purchased</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <ClientAvatar
                          name={order.customerName}
                          photoURL={order.customerPhotoURL}
                        />
                        <Box>
                          <Typography variant="subtitle2">{order.customerName}</Typography>
                          {order.customerEmail ? (
                            <Typography variant="caption" color="text.secondary">
                              {order.customerEmail}
                            </Typography>
                          ) : null}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{order.productName}</Typography>
                    </TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>
                      {order.price
                        ? `${order.currency || 'USD'} ${order.price}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={statusColor(order.status)}
                        label={order.status}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(order.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {order.status !== 'fulfilled' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={updatingId === order.id}
                            onClick={() => handleStatus(order, 'fulfilled')}
                          >
                            Fulfill
                          </Button>
                        ) : null}
                        {order.status !== 'cancelled' ? (
                          <Button
                            size="small"
                            color="inherit"
                            disabled={updatingId === order.id}
                            onClick={() => handleStatus(order, 'cancelled')}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </DashboardContent>
  );
}
