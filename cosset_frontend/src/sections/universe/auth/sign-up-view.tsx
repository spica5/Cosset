'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { paths } from 'src/routes/paths';

import { Logo } from 'src/components/universe/logo';
import { Form } from 'src/components/universe/hook-form';

import { signUp } from 'src/auth/context/jwt/action';
import { useAuthContext } from 'src/auth/hooks/use-auth-context';
import { getDashboardHomePath } from 'src/auth/utils/role';
import { acceptFriendInviteLink } from 'src/actions/friend';

import { FormHead } from './components/form-head';
import { SignUpSchema } from './components/schema';
import { SignUpForm } from './components/sign-up-form';
import { FormSocials } from './components/form-socials';
import { FormDivider } from './components/form-divider';
import { SignUpTerms } from './components/sign-up-terms';

import type { SignUpSchemaType } from './components/schema';

// ----------------------------------------------------------------------

export function SignUpView() {
  const { checkUserSession } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledEmail = String(searchParams.get('inviteEmail') || '').trim().toLowerCase();

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
      await signUp({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.accountType === 'business' ? 'business' : 'user',
      });
          
      reset();
      const sessionUser = await checkUserSession?.();

      // Process invite link if present
      const inviteFrom = String(searchParams.get('inviteFrom') || '').trim();
      const inviteEmail = String(searchParams.get('inviteEmail') || '').trim().toLowerCase();

      if (inviteFrom && inviteEmail) {
        try {
          await acceptFriendInviteLink(inviteFrom, inviteEmail);
        } catch (inviteError) {
          console.error('Failed to process invite after sign-up', inviteError);
        }
      }

      router.replace(getDashboardHomePath(sessionUser?.role, false));
    } catch (error) {
      console.error(error);
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

      <FormSocials />

      <FormDivider label="OR" />

      <Form methods={methods} onSubmit={onSubmit}>
        <SignUpForm />
      </Form>

      <SignUpTerms />
    </>
  );
}
