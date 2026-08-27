'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z as zod } from 'zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import { useBoolean } from 'src/hooks/use-boolean';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { Form, Field } from 'src/components/dashboard/hook-form';

import { changePassword } from 'src/auth/context/jwt';

// ----------------------------------------------------------------------

const ChangePasswordSchema = zod
  .object({
    currentPassword: zod.string().min(1, { message: 'Current password is required!' }),
    newPassword: zod
      .string()
      .min(1, { message: 'New password is required!' })
      .min(6, { message: 'Password must be at least 6 characters!' }),
    confirmPassword: zod.string().min(1, { message: 'Please confirm your new password!' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match!',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from your current password.',
    path: ['newPassword'],
  });

type ChangePasswordSchemaType = zod.infer<typeof ChangePasswordSchema>;

export function ChangePasswordCard() {
  const showPassword = useBoolean();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const methods = useForm<ChangePasswordSchemaType>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const passwordAdornment = (
    <InputAdornment position="end">
      <IconButton onClick={showPassword.onToggle} edge="end">
        <Iconify icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
      </IconButton>
    </InputAdornment>
  );

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      const result = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      const message = result.message || 'Password updated successfully.';
      setSuccessMessage(message);
      toast.success(message);
      reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to change password.';
      setErrorMessage(message);
      toast.error(message);
    }
  });

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Change password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update the password you use to sign in to Cosset.
            </Typography>
          </Box>

          {!!errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          {!!successMessage && <Alert severity="success">{successMessage}</Alert>}

          <Form methods={methods} onSubmit={onSubmit}>
            <Stack spacing={2.5}>
              <Field.Text
                name="currentPassword"
                label="Current password"
                type={showPassword.value ? 'text' : 'password'}
                InputLabelProps={{ shrink: true }}
                InputProps={{ endAdornment: passwordAdornment }}
              />
              <Field.Text
                name="newPassword"
                label="New password"
                placeholder="6+ characters"
                type={showPassword.value ? 'text' : 'password'}
                InputLabelProps={{ shrink: true }}
                InputProps={{ endAdornment: passwordAdornment }}
              />
              <Field.Text
                name="confirmPassword"
                label="Confirm new password"
                type={showPassword.value ? 'text' : 'password'}
                InputLabelProps={{ shrink: true }}
                InputProps={{ endAdornment: passwordAdornment }}
              />
              <LoadingButton
                type="submit"
                variant="contained"
                loading={isSubmitting}
                sx={{ alignSelf: 'flex-start' }}
              >
                Update password
              </LoadingButton>
            </Stack>
          </Form>
        </Stack>
      </CardContent>
    </Card>
  );
}
