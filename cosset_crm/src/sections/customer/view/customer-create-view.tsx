'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { createCustomer } from 'src/actions/user';

// ----------------------------------------------------------------------

const CUSTOMER_STATE_OPTIONS = ['active', 'blocked', 'deleted', 'pending', 'inactive'];
const CUSTOMER_ROLE_OPTIONS = ['user', 'business', 'admin'] as const;
const CUSTOMER_PLAN_OPTIONS = ['FREE', 'PAID', 'EXTRA-PAID'] as const;

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
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

const INITIAL_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phoneNumber: '',
  role: 'user',
  plan: 'FREE',
  state: 'active',
  country: '',
  city: '',
  address: '',
  zipCode: '',
  about: '',
  isPublic: false,
};

export function CustomerCreateView() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null
  );

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        field === 'isPublic' ? (event.target as HTMLInputElement).checked : event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleCreate = async () => {
    if (!form.email.trim() || form.password.length < 6) {
      setToast({
        message: 'Email and a password of at least 6 characters are required',
        severity: 'error',
      });
      return;
    }

    try {
      setSaving(true);
      const created = await createCustomer({
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        role: form.role,
        plan: form.plan,
        state: form.state,
        country: form.country.trim() || undefined,
        city: form.city.trim() || undefined,
        address: form.address.trim() || undefined,
        zipCode: form.zipCode.trim() || undefined,
        about: form.about.trim() || undefined,
        isPublic: form.isPublic,
      });

      const createdId = String(created?.id || '');
      setToast({ message: 'Customer created', severity: 'success' });

      if (createdId) {
        router.push(paths.customer.edit(createdId));
      } else {
        router.push(paths.customer.root);
      }
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to create customer',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardContent maxWidth="lg">
      <Stack spacing={1} sx={{ mb: { xs: 3, md: 5 } }}>
        <Typography variant="h4">New customer</Typography>
        <Breadcrumbs>
          <Link component={RouterLink} href={paths.dashboard.root} color="inherit" underline="hover">
            Dashboard
          </Link>
          <Link component={RouterLink} href={paths.customer.root} color="inherit" underline="hover">
            Customers
          </Link>
          <Typography color="text.primary">New</Typography>
        </Breadcrumbs>
      </Stack>

      <Card sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6">Customer details</Typography>
            <Typography variant="body2" color="text.secondary">
              Create a customer account that can sign in immediately.
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
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                required
                helperText="At least 6 characters"
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                          <Iconify
                            icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                          />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
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
                control={<Switch checked={form.isPublic} onChange={handleChange('isPublic')} />}
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
              onClick={handleCreate}
              disabled={saving || !form.email.trim() || form.password.length < 6}
              startIcon={<Iconify icon="solar:user-plus-bold" />}
            >
              {saving ? 'Creating...' : 'Create customer'}
            </Button>
          </Stack>
        </Stack>
      </Card>

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
