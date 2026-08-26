'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { acceptFriendInviteLink } from 'src/actions/friend';

import { Logo } from 'src/components/universe/logo';
import { Form, Field } from 'src/components/universe/hook-form';

import { useAuthContext } from 'src/auth/hooks';
import { getDashboardHomePath } from 'src/auth/utils/role';
import { verifyEmail, resendEmailVerification } from 'src/auth/context/jwt';

import { FormReturnLink } from './components/form-return-link';
import { VerifySchema, type VerifySchemaType } from './components/schema';

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

      const inviteFrom = String(searchParams.get('inviteFrom') || '').trim();
      const inviteEmail = String(searchParams.get('inviteEmail') || '').trim().toLowerCase();

      if (inviteFrom && inviteEmail) {
        try {
          await acceptFriendInviteLink(inviteFrom, inviteEmail);
        } catch (inviteError) {
          console.error('Failed to process invite after email verification', inviteError);
        }
      }

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
      <Logo sx={{ alignSelf: { xs: 'center', md: 'flex-start' } }} />

      <Typography
        variant="h4"
        sx={{
          mb: 1,
          mt: { xs: 5, md: 8 },
          textAlign: { xs: 'center', md: 'left' },
        }}
      >
        Verify your email
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          mb: 4,
          textAlign: { xs: 'center', md: 'left' },
        }}
      >
        Enter the 6-digit code we sent to your email to finish creating your account.
      </Typography>

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
        <Stack spacing={3}>
          <Field.Text name="email" label="Email address" InputLabelProps={{ shrink: true }} />
          <Field.Code name="code" />
          <LoadingButton
            fullWidth
            size="large"
            type="submit"
            variant="contained"
            loading={isSubmitting}
            loadingIndicator="Verifying..."
          >
            Verify email
          </LoadingButton>
        </Stack>
      </Form>

      <Typography
        variant="body2"
        sx={{
          mt: 3,
          color: 'text.secondary',
          textAlign: { xs: 'center', md: 'left' },
        }}
      >
        {`Didn't get a code? `}
        <Typography
          component="span"
          variant="subtitle2"
          onClick={isResending ? undefined : handleResendCode}
          sx={{
            cursor: isResending ? 'default' : 'pointer',
            color: isResending ? 'text.disabled' : 'primary.main',
          }}
        >
          {isResending ? 'Sending...' : 'Resend code'}
        </Typography>
      </Typography>

      <FormReturnLink href={paths.auth.signIn} sx={{ alignSelf: { xs: 'center', md: 'flex-start' } }} />
    </>
  );
}
