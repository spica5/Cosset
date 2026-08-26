'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';

import Alert from '@mui/material/Alert';

import { paths } from 'src/routes/paths';

import { Logo } from 'src/components/universe/logo';
import { Form } from 'src/components/universe/hook-form';

import { signUp } from 'src/auth/context/jwt/action';
import { useGoogleSignIn } from 'src/auth/hooks/use-google-sign-in';

import { FormHead } from './components/form-head';
import { SignUpSchema } from './components/schema';
import { SignUpForm } from './components/sign-up-form';
import { FormSocials } from './components/form-socials';
import { FormDivider } from './components/form-divider';
import { SignUpTerms } from './components/sign-up-terms';

import type { SignUpSchemaType } from './components/schema';

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
  const searchParams = useSearchParams();
  const { handleGoogleCredential, googleSignInLoading } = useGoogleSignIn();
  const prefilledEmail = String(searchParams.get('inviteEmail') || '').trim().toLowerCase();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const defaultValues = {
    firstName: '',
    lastName: '',
    email: prefilledEmail,
    password: '',
    confirmPassword: '',
    accountType: 'personal' as const,
  };

  const methods = useForm<SignUpSchemaType>({
    resolver: zodResolver(SignUpSchema),
    defaultValues,
  });

  const { reset, handleSubmit } = methods;

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

      reset();

      const params = new URLSearchParams({ email: result.email });
      if (result.devCode) {
        params.set('devCode', result.devCode);
      }

      const inviteFrom = String(searchParams.get('inviteFrom') || '').trim();
      const inviteEmail = String(searchParams.get('inviteEmail') || '').trim().toLowerCase();
      if (inviteFrom) {
        params.set('inviteFrom', inviteFrom);
      }
      if (inviteEmail) {
        params.set('inviteEmail', inviteEmail);
      }

      router.replace(`${paths.auth.verifyEmail}?${params.toString()}`);
    } catch (error) {
      console.error(error);
      const message = getSignUpErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);
    }
  });

  return (
    <>
      <Logo sx={{ alignSelf: { xs: 'center', md: 'flex-start' } }} />

      <FormHead
        variant="sign-up"
        title="Get started"
        href={paths.auth.signIn}
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
        <SignUpForm />
      </Form>

      <SignUpTerms />
    </>
  );
}
