'use client';

import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';

import axiosInstance, { endpoints } from 'src/utils/axios';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { useGetGuestArea } from 'src/actions/guestarea';

import { GuestAreaForm } from '../guest-area-form';

// ----------------------------------------------------------------------

export function OverviewGuestAreaView() {
  const [coverViewUrl, setCoverViewUrl] = useState<string | undefined>(undefined);
  const { user } = useAuthContext();

  const { guestarea, guestAreaLoading } = useGetGuestArea(user?.id || '');

  useEffect(() => {
    let isMounted = true;

    const loadGuestArea = async () => {
      if (!guestarea) return;

      let coverUrl: string | '' = '';

      if (guestarea.coverUrl) {
        try {
          const imageRes = await axiosInstance.get(endpoints.upload.image, {
            params: { key: guestarea.coverUrl },
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

      setCoverViewUrl(coverUrl);
    };

    loadGuestArea();

    return () => {
      isMounted = false;
    };
  }, [guestarea]);

  const handleSaveSuccess = () => {
    // Refresh guest area data - this would typically trigger a SWR revalidation
    // setCoverViewUrl(undefined);
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

      <GuestAreaForm currentArea={guestarea} coverViewUrl={coverViewUrl} onSaveSuccess={handleSaveSuccess} />
    </DashboardContent>
  );
}
