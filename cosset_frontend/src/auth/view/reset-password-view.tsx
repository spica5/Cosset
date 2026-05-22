'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { AnimateLogo2 } from 'src/components/dashboard/animate';
import { Form, Field } from 'src/components/dashboard/hook-form';

import {
  ResetPasswordSchema,
  type ResetPasswordSchemaType,
} from 'src/sections/universe/auth/components/schema';

import { requestPasswordReset } from '../context/jwt';
import { FormHead } from '../components/form-head';
import { FormReturnLink } from '../components/form-return-link';

// ----------------------------------------------------------------------

export function ResetPasswordView() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const methods = useForm<ResetPasswordSchemaType>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { email: '' },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

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
      router.push(`${paths.dashboard.auth.updatePassword}?${params.toString()}`);
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
      <AnimateLogo2 sx={{ mb: 3, mx: 'auto' }} />

      <FormHead
        title="Forgot your password?"
        description="Enter your email and we'll send you a verification code."
      />

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      {!!devCode && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Email is not configured on the server. Your verification code is:{' '}
          <strong>{devCode}</strong>
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        <Box gap={3} display="flex" flexDirection="column">
          <Field.Text name="email" label="Email address" InputLabelProps={{ shrink: true }} />

          <LoadingButton
            fullWidth
            color="inherit"
            size="large"
            type="submit"
            variant="contained"
            loading={isSubmitting}
            loadingIndicator="Send request..."
          >
            Send request
          </LoadingButton>
        </Box>
      </Form>

      <FormReturnLink href={paths.dashboard.auth.signIn} />
    </>
  );
}
