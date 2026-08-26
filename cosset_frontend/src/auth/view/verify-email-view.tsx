'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { AnimateLogo2 } from 'src/components/dashboard/animate';
import { Form, Field } from 'src/components/dashboard/hook-form';

import {
  VerifySchema,
  type VerifySchemaType,
} from 'src/sections/universe/auth/components/schema';

import { useAuthContext } from '../hooks';
import { FormHead } from '../components/form-head';
import { getDashboardHomePath } from '../utils/role';
import { FormReturnLink } from '../components/form-return-link';
import { verifyEmail, resendEmailVerification } from '../context/jwt';

// ----------------------------------------------------------------------

export function VerifyEmailView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkUserSession } = useAuthContext();
  const prefilledEmail = String(searchParams.get('email') || '').trim().toLowerCase();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    searchParams.get('devCode')
      ? `Email delivery is in development mode. Your code is: ${searchParams.get('devCode')}`
      : null,
  );
  const [isResending, setIsResending] = useState(false);

  const methods = useForm<VerifySchemaType>({
    resolver: zodResolver(VerifySchema),
    defaultValues: {
      email: prefilledEmail,
      code: '',
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

      await verifyEmail({
        email: data.email,
        code: data.code,
      });

      const sessionUser = await checkUserSession?.();
      router.replace(getDashboardHomePath(sessionUser?.role));
    } catch (error) {
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : error && typeof error === 'object' && 'message' in error
              ? String((error as { message?: unknown }).message || 'Unable to verify email.')
              : 'Unable to verify email. Please check your code and try again.';
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
      const result = await resendEmailVerification({ email });

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

  return (
    <>
      <AnimateLogo2 sx={{ mb: 3, mx: 'auto' }} />

      <FormHead
        title="Verify your email"
        description="Enter the 6-digit code we sent to your email to finish creating your account."
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
          <Field.Code name="code" />
          <LoadingButton
            fullWidth
            size="large"
            type="submit"
            color="inherit"
            variant="contained"
            loading={isSubmitting}
            loadingIndicator="Verifying..."
          >
            Verify email
          </LoadingButton>
        </Box>
      </Form>

      <Box sx={{ mt: 3, typography: 'body2', color: 'text.secondary', textAlign: 'center' }}>
        {`Didn't get a code? `}
        <Box
          component="span"
          onClick={isResending ? undefined : handleResendCode}
          sx={{
            cursor: isResending ? 'default' : 'pointer',
            color: isResending ? 'text.disabled' : 'primary.main',
            typography: 'subtitle2',
          }}
        >
          {isResending ? 'Sending...' : 'Resend code'}
        </Box>
      </Box>

      <FormReturnLink href={paths.dashboard.auth.signIn} />
    </>
  );
}
