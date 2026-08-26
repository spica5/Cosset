'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Alert from '@mui/material/Alert';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Logo } from 'src/components/universe/logo';
import { Form } from 'src/components/universe/hook-form';

import { useAuthContext } from 'src/auth/hooks';
import { signInWithPassword } from 'src/auth/context/jwt';
import { getDashboardHomePath } from 'src/auth/utils/role';
import { useGoogleSignIn } from 'src/auth/hooks/use-google-sign-in';

import { FormHead } from './components/form-head';
import { SignInSchema } from './components/schema';
import { SignInForm } from './components/sign-in-form';
import { FormSocials } from './components/form-socials';
import { FormDivider } from './components/form-divider';

import type { SignInSchemaType } from './components/schema';

// ----------------------------------------------------------------------

function getSignInFeedbackMessage(error: unknown) {
  if (typeof error === 'string' && error.trim()) {
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

  return 'Unable to sign in.';
}

export function SignInView() {
  const { checkUserSession } = useAuthContext();
  const router = useRouter();
  const { handleGoogleCredential, googleSignInLoading } = useGoogleSignIn();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const defaultValues = {
    email: '',
    password: '',
  };

  const methods = useForm<SignInSchemaType>({
    resolver: zodResolver(SignInSchema),
    defaultValues,
  });

  const { reset, handleSubmit } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMessage(null);
      await signInWithPassword({
        email: data.email,
        password: data.password,
      });
      const sessionUser = await checkUserSession?.();
      router.push(getDashboardHomePath(sessionUser?.role));

      reset();
    } catch (error) {
      console.error(error);

      if (
        error &&
        typeof error === 'object' &&
        'requiresVerification' in error &&
        (error as { requiresVerification?: boolean }).requiresVerification
      ) {
        const email =
          String((error as { email?: string }).email || data.email)
            .trim()
            .toLowerCase() || data.email;
        router.push(`${paths.auth.verifyEmail}?email=${encodeURIComponent(email)}`);
        toast.error('Please verify your email before signing in.');
        return;
      }

      const message = getSignInFeedbackMessage(error);
      setErrorMessage(message);
      toast.error(message);
    }
  });

  return (
    <>
      <Logo sx={{ alignSelf: { xs: 'center', md: 'flex-start' } }} />

      <FormHead
        variant="sign-in"
        title="Sign in"
        href={paths.auth.signUp}
        sx={{
          mb: 4,
          mt: { xs: 5, md: 8 },
          textAlign: { xs: 'center', md: 'left' },
        }}
      />

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <FormSocials
        onGoogleCredential={handleGoogleCredential}
        googleSignInLoading={googleSignInLoading}
      />

      <FormDivider label="OR" />

      <Form methods={methods} onSubmit={onSubmit}>
        <SignInForm />
      </Form>
    </>
  );
}
