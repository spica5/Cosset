'use client';

import type { IAlbumItem, IAlbumOpenness } from 'src/types/album';

import { useState, useCallback } from 'react';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { AlbumDetailsToolbar } from '../album-details-toolbar';
import { AlbumDetailsContent } from '../album-details-content';

// ----------------------------------------------------------------------

type Props = {
  album?: IAlbumItem;
};

export function AlbumDetailsView({ album }: Props) {
  const [openness, setOpenness] = useState<IAlbumOpenness>(album?.openness!);

  const handleChangeOpenness = useCallback((newValue: string) => {
    setOpenness(newValue);
  }, []);

  return (
    <DashboardContent>
      <AlbumDetailsToolbar
        backLink={paths.dashboard.album.root}
        editLink={paths.dashboard.album.edit(album?.id!)}
        openness={openness}
        onChangeOpenness={handleChangeOpenness}
        opennessOptions={[
          { value: 'Public', label: 'Public' },
          { value: 'Private', label: 'Private' },
        ]}
      />

      <AlbumDetailsContent album={album} />

    </DashboardContent>
  );
}