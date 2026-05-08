'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname, useSearchParams } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';

import { toast } from 'src/components/dashboard/snackbar';
import { SplashScreen } from 'src/components/dashboard/loading-screen';

import { useAuthContext } from '../hooks';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: Props) {
  const router = useRouter();

  const pathname = usePathname();

  const searchParams = useSearchParams();

  const { authenticated, loading } = useAuthContext();

  const [isChecking, setIsChecking] = useState<boolean>(true);
  // Use a ref so the redirect handler always reads the latest value
  // without depending on stale closures or extra re-renders.
  const wasAuthenticatedRef = useRef<boolean>(false);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);

      return params.toString();
    },
    [searchParams]
  );

  const checkPermissions = useCallback(async (): Promise<void> => {
    if (loading) {
      return;
    }

    if (!authenticated) {
      if (wasAuthenticatedRef.current) {
        toast.error('Your session has expired. Please sign in again.');
      }

      const { method } = CONFIG.auth;

      const signInPath = {
        jwt: paths.auth.signIn,
      }[method];

      const href = `${signInPath}?${createQueryString('returnTo', pathname)}`;

      router.replace(href);
      return;
    }

    wasAuthenticatedRef.current = true;
    setIsChecking(false);
  }, [authenticated, createQueryString, loading, pathname, router]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  if (isChecking) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
