'use client';

import type { IDesignSpaceItem } from 'src/types/design-space';

import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';

import axiosInstance, { endpoints } from 'src/utils/axios';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { DesignSpaceForm } from '../design-space-form';

// ----------------------------------------------------------------------

export function OverviewDesignSpaceView() {
  const [currentArea, setCurrentArea] = useState<IDesignSpaceItem | undefined>(undefined);
  const { user } = useAuthContext();

  useEffect(() => {
    let isMounted = true;

    const fetchDesignSpace = async () => {
      try {
        const res = await axiosInstance.get(endpoints.designSpace.root, {
          params: user?.id ? { customerId: user.id } : undefined,
        });

        const data = res.data as {
          designSpaces?: Array<{
            id: number;
            customerId: string | null;
            background: string | null;
            rooms: string | null;
            effects: string | null;
          }>;
        };

        const first = data.designSpaces?.[0];
        if (!first) return;

        if (!isMounted) return;

        const area: IDesignSpaceItem = {
          id: String(first.id),
          background: first.background ?? '',
          rooms: first.rooms ?? '',
          effects: first.effects ?? '',
          createdAt: null,
        };

        setCurrentArea(area);
      } catch (error) {
        console.error('Failed to fetch design space', error);
      }
    };

    if (user || user === null) {
      fetchDesignSpace();
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Design Space"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Design Space' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <DesignSpaceForm currentArea={currentArea} />
    </DashboardContent>
  );
}

