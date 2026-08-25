'use client';

import { toast } from 'sonner';
import { useState, useCallback } from 'react';

import { useRouter } from 'src/routes/hooks';

import { signInWithGoogle } from '../context/jwt';
import { useAuthContext } from './use-auth-context';
import { getDashboardHomePath } from '../utils/role';

export function useGoogleSignIn() {
  const { checkUserSession } = useAuthContext();
  const router = useRouter();
  const [googleSignInLoading, setGoogleSignInLoading] = useState(false);

  const handleGoogleCredential = useCallback(
    async (token: string, kind: 'idToken' | 'accessToken' = 'idToken') => {
      try {
        setGoogleSignInLoading(true);
        await signInWithGoogle(token, kind);
        const sessionUser = await checkUserSession?.();
        router.push(getDashboardHomePath(sessionUser?.role));
      } catch (error) {
        console.error(error);
        const message =
          typeof error === 'string'
            ? error
            : error instanceof Error
              ? error.message
              : error && typeof error === 'object' && 'message' in error
                ? String((error as { message?: unknown }).message || 'Unable to sign in with Google.')
                : 'Unable to sign in with Google.';
        toast.error(message);
      } finally {
        setGoogleSignInLoading(false);
      }
    },
    [checkUserSession, router],
  );

  return {
    handleGoogleCredential,
    googleSignInLoading,
  };
}
