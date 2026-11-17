'use client';

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { useGetCustomer, updateCustomer } from 'src/actions/user';

// ----------------------------------------------------------------------

const CUSTOMER_STATE_OPTIONS = ['active', 'blocked', 'deleted', 'pending', 'inactive'];
const CUSTOMER_ROLE_OPTIONS = ['user', 'business', 'admin'] as const;
const CUSTOMER_PLAN_OPTIONS = ['FREE', 'PAID', 'EXTRA-PAID'] as const;

type Props = {
  customerId: string;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  plan: string;
  state: string;
  country: string;
  city: string;
  address: string;
  zipCode: string;
  about: string;
  isPublic: boolean;
};

function toFormState(customer: Record<string, any> | null): FormState {
  return {
    firstName: String(customer?.firstName || ''),
    lastName: String(customer?.lastName || ''),
    email: String(customer?.email || ''),
    phoneNumber: String(customer?.phoneNumber || ''),
    role: String(customer?.role || 'user').toLowerCase(),
    plan: String(customer?.plan || 'FREE').toUpperCase(),
    state: String(customer?.state || customer?.status || 'active').toLowerCase(),
    country: String(customer?.country || ''),
    city: String(customer?.city || ''),
    address: String(customer?.address || ''),
    zipCode: String(customer?.zipCode || ''),
    about: String(customer?.about || ''),
    isPublic: Boolean(customer?.isPublic),
  };
}

export function CustomerEditView({ customerId }: Props) {
  const router = useRouter();
  const { customer, customerLoading, customerError } = useGetCustomer(customerId, Boolean(customerId));
  const [form, setForm] = useState<FormState>(toFormState(null));
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null
  );

  useEffect(() => {
    if (customer) {
      setForm(toFormState(customer));
    }
  }, [customer]);

  const displayName = useMemo(() => {
    const fullName = [form.firstName, form.lastName].filter(Boolean).join(' ').trim();
    return fullName || form.email || 'Customer';
  }, [form.email, form.firstName, form.lastName]);

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        field === 'isPublic' ? (event.target as HTMLInputElement).checked : event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateCustomer(customerId, {
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        role: form.role,
        plan: form.plan,
        state: form.state,
        country: form.country.trim() || null,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        zipCode: form.zipCode.trim() || null,
        about: form.about.trim() || null,
        isPublic: form.isPublic,
      });
      setToast({ message: 'Customer updated', severity: 'success' });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to update customer',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardContent maxWidth="lg">
      <Stack spacing={1} sx={{ mb: { xs: 3, md: 5 } }}>
        <Typography variant="h4">Edit customer</Typography>
        <Breadcrumbs>
          <Link component={RouterLink} href={paths.dashboard.root} color="inherit" underline="hover">
            Dashboard
          </Link>
          <Link component={RouterLink} href={paths.customer.root} color="inherit" underline="hover">
            Customers
          </Link>
          <Typography color="text.primary">{displayName}</Typography>
        </Breadcrumbs>
      </Stack>

      {customerLoading ? (
        <Typography variant="body2" color="text.secondary">
          Loading customer...
        </Typography>
      ) : customerError || !customer ? (
        <Alert
          severity="error"
          action={
            <Button component={RouterLink} href={paths.customer.root} color="inherit" size="small">
              Back to list
            </Button>
          }
        >
          Customer not found or could not be loaded.
        </Alert>
      ) : (
        <Card sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6">{displayName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {customer.email}
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="First name"
                  value={form.firstName}
                  onChange={handleChange('firstName')}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Last name"
                  value={form.lastName}
                  onChange={handleChange('lastName')}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Email"
                  value={form.email}
                  onChange={handleChange('email')}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Phone number"
                  value={form.phoneNumber}
                  onChange={handleChange('phoneNumber')}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  label="Role"
                  value={form.role}
                  onChange={handleChange('role')}
                  fullWidth
                >
                  {CUSTOMER_ROLE_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  label="Plan"
                  value={form.plan}
                  onChange={handleChange('plan')}
                  fullWidth
                >
                  {CUSTOMER_PLAN_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  label="Account state"
                  value={form.state}
                  onChange={handleChange('state')}
                  fullWidth
                >
                  {CUSTOMER_STATE_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Country"
                  value={form.country}
                  onChange={handleChange('country')}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="City"
                  value={form.city}
                  onChange={handleChange('city')}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  label="Address"
                  value={form.address}
                  onChange={handleChange('address')}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Zip code"
                  value={form.zipCode}
                  onChange={handleChange('zipCode')}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="About"
                  value={form.about}
                  onChange={handleChange('about')}
                  fullWidth
                  multiline
                  minRows={3}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Switch checked={form.isPublic} onChange={handleChange('isPublic')} />
                  }
                  label="Public profile"
                />
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => router.push(paths.customer.root)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || !form.email.trim()}
                startIcon={<Iconify icon="solar:diskette-bold" />}
              >
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
            </Stack>
          </Stack>
        </Card>
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
