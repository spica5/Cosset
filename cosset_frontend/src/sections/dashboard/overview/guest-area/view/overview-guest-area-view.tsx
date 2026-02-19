'use client';

import type { IGuestAreaItem } from 'src/types/guestarea';

import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';

import axiosInstance, { endpoints } from 'src/utils/axios';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { GuestAreaForm } from '../guest-area-form';

// ----------------------------------------------------------------------

export function OverviewGuestAreaView() {
  const [currentArea, setCurrentArea] = useState<IGuestAreaItem | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuthContext();

  useEffect(() => {
    let isMounted = true;

    const fetchGuestArea = async () => {
      try {
        const res = await axiosInstance.get(endpoints.guestArea.root, {
          params: user?.id ? { customerId: user.id } : undefined,
        });

        const data = res.data as {
          guestAreas?: Array<{
            id: number;
            title: string;
            motif: string | null;
            mood: string | null;
            pictureUrl: string | null;
            designSpace: string | null;
          }>;
        };

        const first = data.guestAreas?.[0];
        if (!first) return;

        let coverUrl: string | '' = '';

        if (first.pictureUrl) {
          try {
            const imageRes = await axiosInstance.get(endpoints.upload.image, {
              params: { key: first.pictureUrl },
            });

            const imageData = imageRes.data as { url?: string };
            if (imageData.url) {
              coverUrl = imageData.url;
            }
          } catch (imageError) {
            console.error('Failed to resolve guest area image URL', imageError);
          }
        }

        if (!isMounted) return;

        const area: IGuestAreaItem = {
          id: String(first.id),
          title: first.title,
          motif: first.motif ?? '',
          mood: first.mood ?? '',
          coverUrl,
          images: [],
          createdAt: null,
        };

        setCurrentArea(area);
      } catch (error) {
        console.error('Failed to fetch guest area', error);
      }
    };

    // Only fetch once the user is known (or if unauthenticated, fall back to global)
    if (user || user === null) {
      fetchGuestArea();
    }

    return () => {
      isMounted = false;
    };
  }, [user, refreshKey]);

  const handleSaveSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Welcome Guest Area"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Welcome Guest Area' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <GuestAreaForm currentArea={currentArea} onSaveSuccess={handleSaveSuccess} />
    </DashboardContent>
  );
}
