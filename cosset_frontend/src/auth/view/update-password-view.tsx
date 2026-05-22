'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useBoolean } from 'src/hooks/use-boolean';

import { Iconify } from 'src/components/dashboard/iconify';
import { AnimateLogo2 } from 'src/components/dashboard/animate';
import { Form, Field } from 'src/components/dashboard/hook-form';

import {
  UpdatePasswordSchema,
  type UpdatePasswordSchemaType,
} from 'src/sections/universe/auth/components/schema';

import { resetPassword, requestPasswordReset } from '../context/jwt';
import { FormHead } from '../components/form-head';
import { FormReturnLink } from '../components/form-return-link';

// ----------------------------------------------------------------------

export function UpdatePasswordView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledEmail = String(searchParams.get('email') || '').trim().toLowerCase();
  const showPassword = useBoolean();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const methods = useForm<UpdatePasswordSchemaType>({
    resolver: zodResolver(UpdatePasswordSchema),
    defaultValues: {
      code: '',
      email: prefilledEmail,
      password: '',
      confirmPassword: '',
    },
  });

  const {
    handleSubmit,
    getValues,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      await resetPassword({
        email: data.email,
        code: data.code,
        password: data.password,
      });

      router.push(paths.dashboard.auth.signIn);
    } catch (error) {
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : 'Unable to reset password. Please check your code and try again.';
      setErrorMessage(message);
    }
  });

  const handleResendCode = async () => {
    const email = getValues('email').trim().toLowerCase();

    if (!email) {
      setErrorMessage('Enter your email address before requesting a new code.');
      return;
    }

    try {
      setIsResending(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      const result = await requestPasswordReset({ email });

      if (result.devCode) {
        setSuccessMessage(`Email is not configured. Your new code is: ${result.devCode}`);
      } else {
        setSuccessMessage('A new verification code has been sent to your email.');
      }
    } catch (error) {
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : 'Unable to resend code. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsResending(false);
    }
  };

  const passwordAdornment = (
    <InputAdornment position="end">
      <IconButton onClick={showPassword.onToggle} edge="end">
        <Iconify icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
      </IconButton>
    </InputAdornment>
  );

  return (
    <>
      <AnimateLogo2 sx={{ mb: 3, mx: 'auto' }} />

      <FormHead
        title="Update password"
        description="Enter the verification code from your email and choose a new password."
      />

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      {!!successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        <Box gap={3} display="flex" flexDirection="column">
          <Field.Text name="email" label="Email address" InputLabelProps={{ shrink: true }} />

          <Field.Text
            name="code"
            label="Verification code"
            placeholder="6-digit code"
            InputLabelProps={{ shrink: true }}
          />

          <Field.Text
            name="password"
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
            fullWidth
            color="inherit"
            size="large"
            type="submit"
            variant="contained"
            loading={isSubmitting}
            loadingIndicator="Update password..."
          >
            Update password
          </LoadingButton>
        </Box>
      </Form>

      <Box sx={{ mt: 3, typography: 'body2', textAlign: 'center' }}>
        {`Don't have a code? `}
        <Link
          variant="subtitle2"
          onClick={isResending ? undefined : handleResendCode}
          sx={{
            cursor: isResending ? 'default' : 'pointer',
            color: isResending ? 'text.disabled' : 'inherit',
          }}
        >
          {isResending ? 'Sending...' : 'Resend code'}
        </Link>
      </Box>

      <FormReturnLink href={paths.dashboard.auth.signIn} />
    </>
  );
}
