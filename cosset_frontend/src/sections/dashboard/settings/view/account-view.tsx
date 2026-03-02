'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { paths } from 'src/routes/paths';

import { useGetCurrentUser } from 'src/actions/user';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { Iconify } from 'src/components/dashboard/iconify';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

// ---------------------------------------------------------------

export function AccountView() {
  const theme = useTheme();
  const { user } = useGetCurrentUser();

  // Determine account type based on user subscription status
  // This is a placeholder - adjust based on your actual user schema
  const accountType = user?.accountType || 'Free Account';
  const billingEmail = user?.email || '';
  const billingCycle = 'Monthly';
  const nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'Extra-paid Account':
        return 'success';
      case 'Paid Account':
        return 'info';
      default:
        return 'default';
    }
  };

  const isFreeAccount = accountType === 'Free Account';

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Account Settings"
        links={[{ name: 'Dashboard', href: paths.dashboard.settings.root }, { name: 'Account' }]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={4}>
        {/* Account Type Card */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Current Account Type
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={accountType}
                    color={getAccountTypeColor(accountType)}
                    variant="outlined"
                    size="medium"
                    icon={
                      accountType === 'Free Account' ? (
                        <Iconify icon="solar:key-bold" />
                      ) : accountType === 'Paid Account' ? (
                        <Iconify icon="solar:star-bold" />
                      ) : (
                        <Iconify icon="solar:star-bold" />
                      )
                    }
                  />
                  <Typography variant="body2" color="text.secondary">
                    {accountType === 'Free Account'
                      ? 'Enjoy limited features with our free plan.'
                      : accountType === 'Paid Account'
                      ? 'Unlock premium features with our paid plan.'
                      : 'Enjoy all premium features with our extra-paid plan.'}
                  </Typography>
                </Box>
              </Box>

              <Divider />

              {/* Account Options Grid */}
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Available Plans
                </Typography>
                <Grid container spacing={2}>
                  {/* Free Account */}
                  <Grid item xs={12} sm={6} md={4}>
                    <Card
                      variant="outlined"
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: accountType === 'Free Account' ? `2px solid ${theme.vars.palette.primary.main}` : undefined,
                        bgcolor: accountType === 'Free Account' ? 'action.selected' : undefined,
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: 1,
                        },
                      }}
                    >
                      <Stack spacing={2}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Free Account
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Perfect for getting started
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          $0<Typography component="span" variant="body2" color="text.secondary">/mo</Typography>
                        </Typography>
                        <Stack spacing={1}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main', flexShrink: 0 }} />
                            <Typography variant="body2">Basic features</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main', flexShrink: 0 }} />
                            <Typography variant="body2">Limited storage</Typography>
                          </Box>
                        </Stack>
                        <Button
                          fullWidth
                          variant={accountType === 'Free Account' ? 'contained' : 'outlined'}
                          disabled={accountType === 'Free Account'}
                        >
                          {accountType === 'Free Account' ? 'Current Plan' : 'Downgrade'}
                        </Button>
                      </Stack>
                    </Card>
                  </Grid>

                  {/* Paid Account */}
                  <Grid item xs={12} sm={6} md={4}>
                    <Card
                      variant="outlined"
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: accountType === 'Paid Account' ? `2px solid ${theme.vars.palette.primary.main}` : undefined,
                        bgcolor: accountType === 'Paid Account' ? 'action.selected' : undefined,
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: 1,
                        },
                      }}
                    >
                      <Stack spacing={2}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Paid Account
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          For most users
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          $9.99<Typography component="span" variant="body2" color="text.secondary">/mo</Typography>
                        </Typography>
                        <Stack spacing={1}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main', flexShrink: 0 }} />
                            <Typography variant="body2">All basic features</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main', flexShrink: 0 }} />
                            <Typography variant="body2">Unlimited storage</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main', flexShrink: 0 }} />
                            <Typography variant="body2">Priority support</Typography>
                          </Box>
                        </Stack>
                        <Button
                          fullWidth
                          variant={accountType === 'Paid Account' ? 'contained' : 'outlined'}
                          color="primary"
                        >
                          {accountType === 'Paid Account' ? 'Current Plan' : 'Upgrade'}
                        </Button>
                      </Stack>
                    </Card>
                  </Grid>

                  {/* Extra-paid Account */}
                  <Grid item xs={12} sm={6} md={4}>
                    <Card
                      variant="outlined"
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: accountType === 'Extra-paid Account' ? `2px solid ${theme.vars.palette.primary.main}` : undefined,
                        bgcolor: accountType === 'Extra-paid Account' ? 'action.selected' : undefined,
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: 1,
                        },
                      }}
                    >
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Extra-paid Account
                          </Typography>
                          <Chip label="Popular" size="small" color="primary" variant="filled" />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          For power users
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          $19.99<Typography component="span" variant="body2" color="text.secondary">/mo</Typography>
                        </Typography>
                        <Stack spacing={1}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main', flexShrink: 0 }} />
                            <Typography variant="body2">All paid features</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main', flexShrink: 0 }} />
                            <Typography variant="body2">Advanced analytics</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main', flexShrink: 0 }} />
                            <Typography variant="body2">24/7 dedicated support</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main', flexShrink: 0 }} />
                            <Typography variant="body2">Custom integrations</Typography>
                          </Box>
                        </Stack>
                        <Button
                          fullWidth
                          variant={accountType === 'Extra-paid Account' ? 'contained' : 'outlined'}
                          color="primary"
                        >
                          {accountType === 'Extra-paid Account' ? 'Current Plan' : 'Upgrade'}
                        </Button>
                      </Stack>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Billing Information Card */}
        {!isFreeAccount && (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    Billing Information
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Billing Email
                      </Typography>
                      <Typography variant="body1">{billingEmail}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Billing Cycle
                      </Typography>
                      <Typography variant="body1">{billingCycle}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Next Billing Date
                      </Typography>
                      <Typography variant="body1">{nextBillingDate}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Status
                      </Typography>
                      <Chip label="Active" color="success" size="small" variant="filled" />
                    </Box>
                  </Grid>
                </Grid>

                <Divider />

                <Stack direction="row" spacing={2}>
                  <Button variant="outlined">View Invoice History</Button>
                  <Button variant="outlined">Update Payment Method</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        <Card sx={{ borderColor: 'error.main', borderWidth: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'error.main', mb: 1 }}>
                  Danger Zone
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Irreversible and destructive actions
                </Typography>
              </Box>

              <Button variant="outlined" color="error">
                Cancel Subscription
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </DashboardContent>
  );
}
