'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';

import { Iconify } from 'src/components/dashboard/iconify';
import { AnimateLogo2 } from 'src/components/dashboard/animate';
import { Form, Field } from 'src/components/dashboard/hook-form';

import { signUp } from '../context/jwt';
import { FormHead } from '../components/form-head';
import { FormSocials } from '../components/form-socials';
import { FormDivider } from '../components/form-divider';
import { SignUpTerms } from '../components/sign-up-terms';
import { useGoogleSignIn } from '../hooks/use-google-sign-in';

// ----------------------------------------------------------------------

export type SignUpSchemaType = zod.infer<typeof SignUpSchema>;

export const SignUpSchema = zod.object({
  firstName: zod.string().min(1, { message: 'First name is required!' }),
  lastName: zod.string().min(1, { message: 'Last name is required!' }),
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
  password: zod
    .string()
    .min(1, { message: 'Password is required!' })
    .min(6, { message: 'Password must be at least 6 characters!' }),
  accountType: zod.enum(['personal', 'business'], {
    required_error: 'Please choose an account type!',
  }),
});

// ----------------------------------------------------------------------

function getSignUpErrorMessage(error: unknown) {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '').trim();
    if (message) {
      return message;
    }
  }

  return 'Unable to create account. Please try again.';
}

export function SignUpView() {
  const router = useRouter();
  const { handleGoogleCredential, googleSignInLoading } = useGoogleSignIn();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const password = useBoolean();

  const defaultValues = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    accountType: 'personal' as const,
  };

  const methods = useForm<SignUpSchemaType>({
    resolver: zodResolver(SignUpSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMessage(null);

      const result = await signUp({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.accountType === 'business' ? 'business' : 'user',
      });

      const params = new URLSearchParams({ email: result.email });
      if (result.devCode) {
        params.set('devCode', result.devCode);
      }

      router.push(`${paths.dashboard.auth.verifyEmail}?${params.toString()}`);
    } catch (error) {
      console.error(error);
      const message = getSignUpErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);
    }
  });

  const renderLogo = <AnimateLogo2 sx={{ mb: 3, mx: 'auto' }} />;

  const renderForm = (
    <Box gap={3} display="flex" flexDirection="column">
      <Field.RadioGroup
        name="accountType"
        label="Account type"
        row
        options={[
          { label: 'Personal account', value: 'personal' },
          { label: 'Business account', value: 'business' },
        ]}
      />

      <Box display="flex" gap={{ xs: 3, sm: 2 }} flexDirection={{ xs: 'column', sm: 'row' }}>
        <Field.Text name="firstName" label="First name" InputLabelProps={{ shrink: true }} />
        <Field.Text name="lastName" label="Last name" InputLabelProps={{ shrink: true }} />
      </Box>

      <Field.Text name="email" label="Email address" InputLabelProps={{ shrink: true }} />

      <Field.Text
        name="password"
        label="Password"
        placeholder="6+ characters"
        type={password.value ? 'text' : 'password'}
        InputLabelProps={{ shrink: true }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={password.onToggle} edge="end">
                <Iconify icon={password.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <LoadingButton
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        loadingIndicator="Create account..."
      >
        Create account
      </LoadingButton>
    </Box>
  );

  return (
    <>
      {renderLogo}

      <FormHead
        title="Get started absolutely free"
        description={
          <>
            {`Already have an account? `}
            <Link component={RouterLink} href={paths.dashboard.auth.signIn} variant="subtitle2">
              Get started
            </Link>
          </>
        }
      />

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        {renderForm}
      </Form>

      <SignUpTerms />

      <FormDivider />

      <FormSocials
        onGoogleCredential={handleGoogleCredential}
        googleSignInLoading={googleSignInLoading || isSubmitting}
      />
    </>
  );
}
