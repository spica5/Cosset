'use client';

import { toast } from 'sonner';
import { useState, useEffect } from 'react';

import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';

import { getS3SignedUrl } from 'src/utils/helper';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin } from 'src/auth/utils/role';

import { useGetUsers, updateCustomerState } from 'src/actions/user';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

// ----------------------------------------------------------------------

const CUSTOMER_STATE_OPTIONS = ['active', 'blocked', 'deleted', 'pending', 'inactive'];

function getCustomerName(customer: Record<string, any>) {
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return customer.displayName || fullName || customer.email || 'Customer';
}

function getCustomerPhoto(customer: Record<string, any>) {
  return customer.photoURL || customer.avatarUrl || customer.avatar || '';
}

function getCustomerState(customer: Record<string, any>) {
  return String(customer.state || customer.status || 'active');
}

function formatDate(value: unknown) {
  if (!value) {
    return '-';
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString();
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
      if (mounted) {
        setAvatarUrl(signedUrl || '');
      }
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

export function CustomersView() {
  const { user } = useAuthContext();
  const canViewCustomers = isUserAdmin(user?.role);
  const { users, usersLoading } = useGetUsers(500, 0, canViewCustomers);
  const [stateByCustomerId, setStateByCustomerId] = useState<Record<string, string>>({});
  const [savedStateByCustomerId, setSavedStateByCustomerId] = useState<Record<string, string>>({});
  const [savingCustomerId, setSavingCustomerId] = useState('');

  useEffect(() => {
    setStateByCustomerId((prev) => {
      const next = { ...prev };

      users.forEach((customer) => {
        const customerId = String(customer.id || customer.email || '');
        if (customerId && next[customerId] === undefined) {
          next[customerId] = getCustomerState(customer);
        }
      });

      return next;
    });
  }, [users]);

  const handleSaveState = async (customer: Record<string, any>) => {
    const customerId = String(customer.id || '');
    if (!customerId || savingCustomerId) {
      return;
    }

    const nextState = stateByCustomerId[customerId] ?? '';

    try {
      setSavingCustomerId(customerId);
      await updateCustomerState(customerId, nextState);
      setSavedStateByCustomerId((prev) => ({ ...prev, [customerId]: nextState }));
      toast.success('Customer state updated');
    } catch (error) {
      console.error('Failed to update customer state', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update customer state');
    } finally {
      setSavingCustomerId('');
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Customers"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Admin' },
          { name: 'Customers' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {!canViewCustomers ? (
        <EmptyContent
          filled
          title="Admin access required"
          description="Only admins can view customers."
          sx={{ py: 10 }}
        />
      ) : usersLoading ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Loading customers...
        </Typography>
      ) : users.length ? (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 1080 }}>
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {users.map((customer) => {
                const customerId = String(customer.id || customer.email || '');
                const customerName = getCustomerName(customer);
                const currentState = savedStateByCustomerId[customerId] ?? getCustomerState(customer);
                const draftState = stateByCustomerId[customerId] ?? currentState;
                const stateChanged = draftState !== currentState;

                return (
                  <TableRow key={customerId} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <CustomerAvatar customer={customer} name={customerName} />
                        <Typography variant="body2">{customerName}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{customer.email || '-'}</TableCell>
                    <TableCell>{customer.role || 'user'}</TableCell>
                    <TableCell>{customer.plan || 'FREE'}</TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={draftState}
                        placeholder="State"
                        onChange={(event) =>
                          setStateByCustomerId((prev) => ({
                            ...prev,
                            [customerId]: event.target.value,
                          }))
                        }
                        sx={{ minWidth: 150 }}
                      >
                        {CUSTOMER_STATE_OPTIONS.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>{formatDate(customer.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        disabled={!stateChanged || savingCustomerId === customerId}
                        onClick={() => handleSaveState(customer)}
                      >
                        {savingCustomerId === customerId ? 'Saving...' : 'Save'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyContent
          filled
          title="No customers found"
          description="Customers will appear here once they are available."
          sx={{ py: 10 }}
        />
      )}
    </DashboardContent>
  );
}
