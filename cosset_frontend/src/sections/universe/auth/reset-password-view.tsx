'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Logo } from 'src/components/universe/logo';
import { Form } from 'src/components/universe/hook-form';

import { requestPasswordReset } from 'src/auth/context/jwt';

import { FormReturnLink } from './components/form-return-link';
import { ResetPasswordSchema } from './components/schema';
import { ResetPasswordForm } from './components/reset-password-form';

import type { ResetPasswordSchemaType } from './components/schema';

// ----------------------------------------------------------------------

export function ResetPasswordView() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const defaultValues = { email: '' };

  const methods = useForm<ResetPasswordSchemaType>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues,
  });

  const { handleSubmit, getValues } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMessage(null);
      setDevCode(null);

      const result = await requestPasswordReset({ email: data.email });

      if (result.devCode) {
        setDevCode(result.devCode);
        return;
      }

      const params = new URLSearchParams({ email: data.email });
      router.push(`${paths.auth.updatePassword}?${params.toString()}`);
    } catch (error) {
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : 'Unable to send reset request. Please try again.';
      setErrorMessage(message);
    }
  });

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
        Forgot your password?
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          mb: 4,
          textAlign: { xs: 'center', md: 'left' },
        }}
      >
        Enter your email and we&apos;ll send you a verification code to reset your password.
      </Typography>

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      {!!devCode && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Email is not configured on the server. Your verification code is:{' '}
          <strong>{devCode}</strong>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Configure SMTP or Resend in the backend <code>.env</code> to receive emails in your
            inbox.
          </Typography>
          <Button
            color="inherit"
            variant="contained"
            size="small"
            sx={{ mt: 2 }}
            onClick={() => {
              const email = getValues('email');
              const params = new URLSearchParams({ email });
              router.push(`${paths.auth.updatePassword}?${params.toString()}`);
            }}
          >
            Continue to update password
          </Button>
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        <ResetPasswordForm />
      </Form>

      <FormReturnLink href={paths.auth.signIn} sx={{ alignSelf: { xs: 'center', md: 'flex-start' } }} />
    </>
  );
}
