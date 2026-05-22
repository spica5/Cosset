'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';

import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Logo } from 'src/components/universe/logo';
import { Form } from 'src/components/universe/hook-form';

import { resetPassword, requestPasswordReset } from 'src/auth/context/jwt';

import { FormReturnLink } from './components/form-return-link';
import { UpdatePasswordSchema } from './components/schema';
import { UpdatePasswordForm } from './components/update-password-form';

import type { UpdatePasswordSchemaType } from './components/schema';

// ----------------------------------------------------------------------

export function UpdatePasswordView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledEmail = String(searchParams.get('email') || '').trim().toLowerCase();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const defaultValues = {
    code: '',
    email: prefilledEmail,
    password: '',
    confirmPassword: '',
  };

  const methods = useForm<UpdatePasswordSchemaType>({
    resolver: zodResolver(UpdatePasswordSchema),
    defaultValues,
  });

  const { handleSubmit, getValues } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      await resetPassword({
        email: data.email,
        code: data.code,
        password: data.password,
      });

      router.push(paths.auth.signIn);
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
        Update password
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          mb: 4,
          textAlign: { xs: 'center', md: 'left' },
        }}
      >
        Enter the verification code from your email and choose a new password.
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
        <UpdatePasswordForm />
      </Form>

      <Typography
        variant="body2"
        sx={{
          mt: 3,
          color: 'text.secondary',
          textAlign: { xs: 'center', md: 'left' },
        }}
      >
        {`Don't have a code? `}
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
