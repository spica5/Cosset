'use client';

import { useState, useEffect } from 'react';

import { useRouter, useSearchParams } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';

import { userHasHomePage } from 'src/actions/guestarea';

import { SplashScreen } from 'src/components/dashboard/loading-screen';

import { useAuthContext } from '../hooks';
import { getDashboardHomePath, isUserBusiness, isUserAdmin } from '../utils/role';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export function GuestGuard({ children }: Props) {
  const router = useRouter();

  const searchParams = useSearchParams();

  const { loading, authenticated, user } = useAuthContext();

  const [isChecking, setIsChecking] = useState<boolean>(true);

  const checkPermissions = async (): Promise<void> => {
    if (loading) {
      return;
    }

    if (authenticated) {
      const returnTo = searchParams.get('returnTo');
      if (returnTo) {
        router.replace(returnTo);
        return;
      }

      let hasHomePage = false;
      const role = user?.role;
      if (!isUserBusiness(role) || isUserAdmin(role)) {
        hasHomePage = await userHasHomePage(user?.id);
      }

      router.replace(getDashboardHomePath(role, hasHomePage) || CONFIG.auth.redirectPath);
      return;
    }

    setIsChecking(false);
  };

  useEffect(() => {
    checkPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, loading, user?.id, user?.role]);

  if (isChecking) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
