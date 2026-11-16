'use client';

import type { AuthState } from '../../types';

import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useEffect, useCallback } from 'react';

import axios, { endpoints } from 'src/lib/axios';

import { JWT_STORAGE_KEY } from './constant';
import { AuthContext } from '../auth-context';
import { setSession, isValidToken } from './utils';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

function isAdminUser(user: Record<string, unknown> | null | undefined) {
  return String(user?.role || '')
    .trim()
    .toLowerCase() === 'admin';
}

export function AuthProvider({ children }: Props) {
  const { state, setState } = useSetState<AuthState>({ user: null, loading: true });

  const checkUserSession = useCallback(async () => {
    try {
      const accessToken = sessionStorage.getItem(JWT_STORAGE_KEY);

      if (accessToken && isValidToken(accessToken)) {
        await setSession(accessToken);

        const res = await axios.get(endpoints.auth.me);
        const { user } = res.data;

        if (!isAdminUser(user)) {
          await setSession(null);
          setState({ user: null, loading: false });
          return;
        }

        const displayName =
          user?.displayName ||
          [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
          user?.email;

        setState({
          user: { ...user, displayName, accessToken, role: 'admin' },
          loading: false,
        });
        return;
      }

      setState({ user: null, loading: false });
    } catch (error) {
      console.error(error);
      await setSession(null);
      setState({ user: null, loading: false });
    }
  }, [setState]);

  useEffect(() => {
    checkUserSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------------

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';

  const status = state.loading ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(
    () => ({
      user: state.user ? { ...state.user, role: state.user?.role ?? 'admin' } : null,
      checkUserSession,
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
    }),
    [checkUserSession, state.user, status]
  );

  return <AuthContext value={memoizedValue}>{children}</AuthContext>;
}
