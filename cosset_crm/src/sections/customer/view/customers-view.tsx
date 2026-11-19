'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetUsers, updateCustomer, getS3SignedUrl } from 'src/actions/user';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

const CUSTOMER_STATE_OPTIONS = ['active', 'blocked', 'deleted', 'pending', 'inactive'];
const CUSTOMER_ROLE_OPTIONS = ['user', 'business', 'admin'] as const;

type CustomerTab = 'all' | 'free' | 'paid' | 'business';

const CUSTOMER_TABS: Array<{ value: CustomerTab; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
  { value: 'business', label: 'Business' },
];

function isUserAdmin(role?: string | null) {
  return String(role || '')
    .trim()
    .toLowerCase() === 'admin';
}

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

function getCustomerPlan(customer: Record<string, any>) {
  return String(customer.plan || 'FREE').trim().toUpperCase() || 'FREE';
}

function isPaidPlan(plan?: string | null) {
  const normalized = String(plan || 'FREE').trim().toUpperCase();
  return normalized !== '' && normalized !== 'FREE';
}

function getBusinessRequestAt(customer: Record<string, any>) {
  return customer.businessAccountRequestedAt || customer.business_account_requested_at || null;
}

function hasPendingBusinessRequest(customer: Record<string, any>, role?: string) {
  const customerRole = role ?? getCustomerRole(customer);
  return Boolean(getBusinessRequestAt(customer)) && customerRole !== 'business';
}

function formatDateTime(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function formatDate(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';
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
      if (mounted) setAvatarUrl(signedUrl || '');
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

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        py: 10,
        px: 3,
        textAlign: 'center',
        borderStyle: 'dashed',
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Paper>
  );
}

// ----------------------------------------------------------------------

export function CustomersView() {
  const { user } = useAuthContext();
  const canViewCustomers = isUserAdmin(user?.role);
  const { users, usersLoading } = useGetUsers(500, 0, canViewCustomers);
  const [stateByCustomerId, setStateByCustomerId] = useState<Record<string, string>>({});
  const [roleByCustomerId, setRoleByCustomerId] = useState<Record<string, string>>({});
  const [savedStateByCustomerId, setSavedStateByCustomerId] = useState<Record<string, string>>({});
  const [savedRoleByCustomerId, setSavedRoleByCustomerId] = useState<Record<string, string>>({});
  const [savingCustomerId, setSavingCustomerId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerTab, setCustomerTab] = useState<CustomerTab>('all');
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null
  );

  const pendingBusinessRequests = useMemo(
    () =>
      users.filter((customer) => {
        const customerId = String(customer.id || customer.email || '');
        const role = savedRoleByCustomerId[customerId] ?? getCustomerRole(customer);
        return hasPendingBusinessRequest(customer, role);
      }),
    [users, savedRoleByCustomerId]
  );

  const tabCounts = useMemo(() => {
    let free = 0;
    let paid = 0;
    let business = 0;

    users.forEach((customer) => {
      const customerId = String(customer.id || customer.email || '');
      const role =
        roleByCustomerId[customerId] ??
        savedRoleByCustomerId[customerId] ??
        getCustomerRole(customer);

      if (role === 'business') {
        business += 1;
      }

      if (isPaidPlan(getCustomerPlan(customer))) {
        paid += 1;
      } else {
        free += 1;
      }
    });

    return {
      all: users.length,
      free,
      paid,
      business,
    };
  }, [users, roleByCustomerId, savedRoleByCustomerId]);

  const handleChangeCustomerTab = useCallback((_: React.SyntheticEvent, newValue: CustomerTab) => {
    setCustomerTab(newValue);
  }, []);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return users.filter((customer) => {
      const customerId = String(customer.id || customer.email || '');
      const plan = getCustomerPlan(customer);
      const paid = isPaidPlan(plan);
      const role = (
        roleByCustomerId[customerId] ??
        savedRoleByCustomerId[customerId] ??
        getCustomerRole(customer)
      ).toLowerCase();

      if (customerTab === 'free' && paid) {
        return false;
      }

      if (customerTab === 'paid' && !paid) {
        return false;
      }

      if (customerTab === 'business' && role !== 'business') {
        return false;
      }

      if (!query) {
        return true;
      }

      const name = getCustomerName(customer).toLowerCase();
      const email = String(customer.email || '').toLowerCase();
      const state = (
        stateByCustomerId[customerId] ??
        savedStateByCustomerId[customerId] ??
        getCustomerState(customer)
      ).toLowerCase();

      return (
        name.includes(query) ||
        email.includes(query) ||
        role.includes(query) ||
        state.includes(query) ||
        plan.toLowerCase().includes(query)
      );
    });
  }, [
    users,
    customerTab,
    searchQuery,
    roleByCustomerId,
    savedRoleByCustomerId,
    stateByCustomerId,
    savedStateByCustomerId,
  ]);

  const sortedUsers = useMemo(
    () =>
      [...filteredUsers].sort((left, right) => {
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
          return (
            new Date(String(rightRequestedAt)).getTime() -
            new Date(String(leftRequestedAt)).getTime()
          );
        }

        return 0;
      }),
    [filteredUsers, savedRoleByCustomerId]
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
    if (!customerId || savingCustomerId) return;

    const currentState = savedStateByCustomerId[customerId] ?? getCustomerState(customer);
    const currentRole = savedRoleByCustomerId[customerId] ?? getCustomerRole(customer);
    const draftState = stateByCustomerId[customerId] ?? currentState;
    const draftRole = roleByCustomerId[customerId] ?? currentRole;
    const stateChanged = draftState !== currentState;
    const roleChanged = draftRole !== currentRole;

    if (!stateChanged && !roleChanged) return;

    const updates: { state?: string; role?: string } = {};
    if (stateChanged) updates.state = draftState;
    if (roleChanged) updates.role = draftRole;

    try {
      setSavingCustomerId(customerId);
      await updateCustomer(customerId, updates);
      if (stateChanged) {
        setSavedStateByCustomerId((prev) => ({ ...prev, [customerId]: draftState }));
      }
      if (roleChanged) {
        setSavedRoleByCustomerId((prev) => ({ ...prev, [customerId]: draftRole }));
      }
      setToast({ message: 'Customer updated', severity: 'success' });
    } catch (error) {
      console.error('Failed to update customer', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to update customer',
        severity: 'error',
      });
    } finally {
      setSavingCustomerId('');
    }
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
          <Typography variant="h4">Customers</Typography>
          <Breadcrumbs>
            <Link
              component={RouterLink}
              href={paths.dashboard.root}
              color="inherit"
              underline="hover"
            >
              Dashboard
            </Link>
            <Typography color="text.primary">Customers</Typography>
          </Breadcrumbs>
        </Stack>

        {canViewCustomers ? (
          <Button
            component={RouterLink}
            href={paths.customer.new}
            variant="contained"
            startIcon={<Iconify icon="solar:user-plus-bold" />}
          >
            New customer
          </Button>
        ) : null}
      </Stack>

      {!canViewCustomers ? (
        <EmptyState
          title="Admin access required"
          description="Only admins can view customers."
        />
      ) : usersLoading ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Loading customers...
        </Typography>
      ) : users.length ? (
        <Stack spacing={3}>
          <Tabs
            value={customerTab}
            onChange={handleChangeCustomerTab}
            sx={{
              px: 0,
              boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.vars.palette.divider}`,
            }}
          >
            {CUSTOMER_TABS.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                iconPosition="end"
                icon={
                  <Label
                    variant={
                      ((tab.value === 'all' || tab.value === customerTab) && 'filled') || 'soft'
                    }
                    color={
                      (tab.value === 'free' && 'default') ||
                      (tab.value === 'paid' && 'success') ||
                      (tab.value === 'business' && 'info') ||
                      'default'
                    }
                  >
                    {tabCounts[tab.value]}
                  </Label>
                }
              />
            ))}
          </Tabs>

          <TextField
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name, email, role, plan, or state..."
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" width={20} sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ maxWidth: { sm: 420 } }}
          />

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
                            {customer.email || '-'} · Requested{' '}
                            {formatDateTime(getBusinessRequestAt(customer))}
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

          {sortedUsers.length ? (
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
                    const currentState =
                      savedStateByCustomerId[customerId] ?? getCustomerState(customer);
                    const currentRole =
                      savedRoleByCustomerId[customerId] ?? getCustomerRole(customer);
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
                                <Typography
                                  variant="caption"
                                  sx={{ color: 'warning.main', fontWeight: 600 }}
                                >
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
                            <Chip
                              label="Approved"
                              color="success"
                              size="small"
                              variant="outlined"
                            />
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
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="outlined"
                              component={RouterLink}
                              href={paths.customer.edit(customerId)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={!hasChanges || savingCustomerId === customerId}
                              onClick={() => handleSaveCustomer(customer)}
                            >
                              {savingCustomerId === customerId ? 'Saving...' : 'Save'}
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <EmptyState
              title="No matching customers"
              description={
                customerTab === 'all'
                  ? 'Try a different search for name, email, role, plan, or state.'
                  : `No ${customerTab} customers match your search.`
              }
            />
          )}
        </Stack>
      ) : (
        <EmptyState
          title="No customers found"
          description="Create a customer to get started."
        />
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </DashboardContent>
  );
}
