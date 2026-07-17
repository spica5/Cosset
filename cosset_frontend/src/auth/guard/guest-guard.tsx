'use client';

import { useState, useEffect } from 'react';

import { useRouter, useSearchParams } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';

import { SplashScreen } from 'src/components/dashboard/loading-screen';

import { useAuthContext } from '../hooks';
import { getDashboardHomePath } from '../utils/role';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export function GuestGuard({ children }: Props) {
  const router = useRouter();

  const searchParams = useSearchParams();

  const { loading, authenticated, user } = useAuthContext();

  const [isChecking, setIsChecking] = useState<boolean>(true);

  const returnTo =
    searchParams.get('returnTo') || getDashboardHomePath(user?.role) || CONFIG.auth.redirectPath;

  const checkPermissions = async (): Promise<void> => {
    if (loading) {
      return;
    }

    if (authenticated) {
      router.replace(returnTo);
      return;
    }

    setIsChecking(false);
  };

  useEffect(() => {
    checkPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, loading, user?.role]);

  if (isChecking) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
