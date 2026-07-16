'use client';

import { toast } from 'sonner';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';

import { getS3SignedUrl } from 'src/utils/helper';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin, CUSTOMER_ROLE_OPTIONS } from 'src/auth/utils/role';

import { useGetUsers, updateCustomer } from 'src/actions/user';

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

function getCustomerRole(customer: Record<string, any>) {
  return String(customer.role || 'user').toLowerCase();
}

function getBusinessRequestAt(customer: Record<string, any>) {
  return customer.businessAccountRequestedAt || customer.business_account_requested_at || null;
}

function hasPendingBusinessRequest(customer: Record<string, any>, role?: string) {
  const customerRole = role ?? getCustomerRole(customer);
  return Boolean(getBusinessRequestAt(customer)) && customerRole !== 'business';
}

function formatDateTime(value: unknown) {
  if (!value) {
    return '-';
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString();
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
  const [roleByCustomerId, setRoleByCustomerId] = useState<Record<string, string>>({});
  const [savedStateByCustomerId, setSavedStateByCustomerId] = useState<Record<string, string>>({});
  const [savedRoleByCustomerId, setSavedRoleByCustomerId] = useState<Record<string, string>>({});
  const [savingCustomerId, setSavingCustomerId] = useState('');

  const pendingBusinessRequests = useMemo(
    () =>
      users.filter((customer) => {
        const customerId = String(customer.id || customer.email || '');
        const role = savedRoleByCustomerId[customerId] ?? getCustomerRole(customer);
        return hasPendingBusinessRequest(customer, role);
      }),
    [users, savedRoleByCustomerId]
  );

  const sortedUsers = useMemo(
    () =>
      [...users].sort((left, right) => {
        const leftId = String(left.id || left.email || '');
        const rightId = String(right.id || right.email || '');
        const leftPending = hasPendingBusinessRequest(
          left,
          savedRoleByCustomerId[leftId] ?? getCustomerRole(left)
        );
        const rightPending = hasPendingBusinessRequest(
          right,
          savedRoleByCustomerId[rightId] ?? getCustomerRole(right)
        );

        if (leftPending !== rightPending) {
          return leftPending ? -1 : 1;
        }

        const leftRequestedAt = getBusinessRequestAt(left);
        const rightRequestedAt = getBusinessRequestAt(right);

        if (leftRequestedAt && rightRequestedAt) {
          return new Date(String(rightRequestedAt)).getTime() - new Date(String(leftRequestedAt)).getTime();
        }

        return 0;
      }),
    [users, savedRoleByCustomerId]
  );

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

    setRoleByCustomerId((prev) => {
      const next = { ...prev };

      users.forEach((customer) => {
        const customerId = String(customer.id || customer.email || '');
        if (customerId && next[customerId] === undefined) {
          next[customerId] = getCustomerRole(customer);
        }
      });

      return next;
    });
  }, [users]);

  const handleSaveCustomer = async (customer: Record<string, any>) => {
    const customerId = String(customer.id || '');
    if (!customerId || savingCustomerId) {
      return;
    }

    const currentState = savedStateByCustomerId[customerId] ?? getCustomerState(customer);
    const currentRole = savedRoleByCustomerId[customerId] ?? getCustomerRole(customer);
    const draftState = stateByCustomerId[customerId] ?? currentState;
    const draftRole = roleByCustomerId[customerId] ?? currentRole;
    const stateChanged = draftState !== currentState;
    const roleChanged = draftRole !== currentRole;

    if (!stateChanged && !roleChanged) {
      return;
    }

    const updates: { state?: string; role?: string } = {};
    if (stateChanged) {
      updates.state = draftState;
    }
    if (roleChanged) {
      updates.role = draftRole;
    }

    try {
      setSavingCustomerId(customerId);
      await updateCustomer(customerId, updates);
      if (stateChanged) {
        setSavedStateByCustomerId((prev) => ({ ...prev, [customerId]: draftState }));
      }
      if (roleChanged) {
        setSavedRoleByCustomerId((prev) => ({ ...prev, [customerId]: draftRole }));
      }
      toast.success('Customer updated');
    } catch (error) {
      console.error('Failed to update customer', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update customer');
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
        <Stack spacing={3}>
          {pendingBusinessRequests.length ? (
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderColor: 'warning.main',
                bgcolor: 'warning.lighter',
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Chip
                    label={`${pendingBusinessRequests.length} pending`}
                    color="warning"
                    size="small"
                  />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Business account requests
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Review the requests below and set the customer role to business to approve.
                </Typography>
                <Stack spacing={1}>
                  {pendingBusinessRequests.map((customer) => {
                    const customerId = String(customer.id || customer.email || '');
                    const customerName = getCustomerName(customer);

                    return (
                      <Stack
                        key={`request-${customerId}`}
                        direction={{ xs: 'column', sm: 'row' }}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent="space-between"
                        spacing={1}
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: 'background.paper',
                        }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {customerName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {customer.email || '-'} · Requested {formatDateTime(getBusinessRequestAt(customer))}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            setRoleByCustomerId((prev) => ({
                              ...prev,
                              [customerId]: 'business',
                            }))
                          }
                        >
                          Set role to business
                        </Button>
                      </Stack>
                    );
                  })}
                </Stack>
              </Stack>
            </Paper>
          ) : null}

          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 1180 }}>
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Business request</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedUsers.map((customer) => {
                const customerId = String(customer.id || customer.email || '');
                const customerName = getCustomerName(customer);
                const currentState = savedStateByCustomerId[customerId] ?? getCustomerState(customer);
                const currentRole = savedRoleByCustomerId[customerId] ?? getCustomerRole(customer);
                const draftState = stateByCustomerId[customerId] ?? currentState;
                const draftRole = roleByCustomerId[customerId] ?? currentRole;
                const hasChanges = draftState !== currentState || draftRole !== currentRole;
                const businessRequestAt = getBusinessRequestAt(customer);
                const pendingBusinessRequest = hasPendingBusinessRequest(customer, currentRole);

                return (
                  <TableRow
                    key={customerId}
                    hover
                    sx={pendingBusinessRequest ? { bgcolor: 'warning.lighter' } : undefined}
                  >
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <CustomerAvatar customer={customer} name={customerName} />
                        <Stack spacing={0.25}>
                          <Typography variant="body2">{customerName}</Typography>
                          {pendingBusinessRequest ? (
                            <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>
                              Business request pending
                            </Typography>
                          ) : null}
                        </Stack>
                      </Stack>
                    </TableCell>
                    <TableCell>{customer.email || '-'}</TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={draftRole}
                        onChange={(event) =>
                          setRoleByCustomerId((prev) => ({
                            ...prev,
                            [customerId]: event.target.value,
                          }))
                        }
                        sx={{ minWidth: 130 }}
                      >
                        {CUSTOMER_ROLE_OPTIONS.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      {currentRole === 'business' ? (
                        <Chip label="Approved" color="success" size="small" variant="outlined" />
                      ) : pendingBusinessRequest ? (
                        <Stack spacing={0.5}>
                          <Chip label="Pending" color="warning" size="small" />
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(businessRequestAt)}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
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
                        disabled={!hasChanges || savingCustomerId === customerId}
                        onClick={() => handleSaveCustomer(customer)}
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
        </Stack>
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
