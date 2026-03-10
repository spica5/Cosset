'use client';

import Stack from '@mui/material/Stack';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { paths } from 'src/routes/paths';

import { BlogShareForm } from '../blog-share-form';
import { AlbumShareForm } from '../album-share-form';
import { CollectionItemsShareForm } from '../collection-items-share-form';
import { DrawerShareForm } from '../drawer-share-form';

// ---------------------------------------------------------------

export function ThingsToShareView() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Things To Share"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Things To Share' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <BlogShareForm />
        <AlbumShareForm />
        <DrawerShareForm />
        <CollectionItemsShareForm />
      </Stack>
    </DashboardContent>
  );
}
