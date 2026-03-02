'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Logo } from 'src/components/universe/logo';
import { Form } from 'src/components/universe/hook-form';

import { useAuthContext } from 'src/auth/hooks';
import { signInWithPassword } from 'src/auth/context/jwt';

import { FormHead } from './components/form-head';
import { SignInSchema } from './components/schema';
import { SignInForm } from './components/sign-in-form';
import { FormSocials } from './components/form-socials';
import { FormDivider } from './components/form-divider';

import type { SignInSchemaType } from './components/schema';

// ----------------------------------------------------------------------

export function SignInView() {
  const { checkUserSession } = useAuthContext();
  const router = useRouter();

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
      await signInWithPassword({
        email: data.email,
        password: data.password,
      });
      await checkUserSession?.();
      router.push(paths.dashboard.root);

      reset();
    } catch (error) {
      console.error(error);
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

      <FormSocials />

      <FormDivider label="OR" />

      <Form methods={methods} onSubmit={onSubmit}>
        <SignInForm />
      </Form>
    </>
  );
}
