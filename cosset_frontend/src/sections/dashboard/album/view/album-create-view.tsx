'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { AlbumNewEditForm } from '../album-new-edit-form';

// ----------------------------------------------------------------------

export function AlbumCreateView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create New Album"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Album', href: paths.dashboard.album.root },
          { name: 'Create New Album' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <AlbumNewEditForm />
    </DashboardContent>
  );
}
