'use client';

import type { IAlbumItem } from 'src/types/album';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { AlbumNewEditForm } from '../album-new-edit-form';

// ----------------------------------------------------------------------

type Props = {
  album?: IAlbumItem;
};

export function AlbumEditView({ album }: Props) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading='Edit'
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Album', href: paths.dashboard.album.root },
          { name: album?.title }
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <AlbumNewEditForm currentAlbum={album} />
    </DashboardContent>
  );
}

