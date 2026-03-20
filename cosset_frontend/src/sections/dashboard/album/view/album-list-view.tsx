'use client';

import type { IAlbumItem } from 'src/types/album';

import { useState, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/dashboard/iconify';

import { useSetState } from 'src/hooks/use-set-state';

import { orderBy } from 'src/utils/helper';

import { useAuthContext } from 'src/auth/hooks';
import { useGetAlbums } from 'src/actions/album';
import { ALBUM_SORT_OPTIONS } from 'src/_mock/universe';
import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { AlbumSort } from '../album-sort';
import { AlbumList } from '../album-list';
import { AlbumSearch } from '../album-search';

// ----------------------------------------------------------------------

export function AlbumListView() {
  const [sortBy, setSortBy] = useState('latest');
  const { user } = useAuthContext();

  const { albums, albumsLoading } = useGetAlbums(user?.id);

  const search = useSetState<{
    query: string;
    results: IAlbumItem[];
  }>({ query: '', results: [] });

  const dataFiltered = applyFilter({
    inputData: search.state.results.length ? search.state.results : albums,
    sortBy,
  });

  const notFound = !dataFiltered.length && !albumsLoading;

  const handleSortBy = useCallback((newValue: string) => {
    setSortBy(newValue);
  }, []);

  const handleSearch = useCallback(
    (inputValue: string) => {
      search.setState({ query: inputValue });

      if (inputValue) {
        const results = albums.filter(
          (album) => album.title.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
        );

        search.setState({ results });
      } else {
        search.setState({ results: [] });
      }
    },
    [albums, search]
  );

  const renderFilters = (
    <Stack
      spacing={3}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-end', sm: 'center' }}
      direction={{ xs: 'column', sm: 'row' }}
    >
      <AlbumSearch search={search} onSearch={handleSearch} />

      <Stack direction="row" spacing={1} flexShrink={0}>
        <AlbumSort sort={sortBy} onSort={handleSortBy} sortOptions={ALBUM_SORT_OPTIONS} />
      </Stack>
    </Stack>
  );
  
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Albums"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Albums', href: paths.dashboard.album.root },
          { name: 'List' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.album.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New Album
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={2.5} sx={{ mb: { xs: 3, md: 5 } }}>
        {renderFilters}
      </Stack>

      {notFound && <EmptyContent filled sx={{ py: 10 }} />}

      <AlbumList albums={dataFiltered} />
    </DashboardContent>
  );
}


// ----------------------------------------------------------------------

type ApplyFilterProps = {
  sortBy: string;
  inputData: IAlbumItem[];
};

const applyFilter = ({ inputData, sortBy }: ApplyFilterProps) => {

  // Sort by
  if (sortBy === 'latest') {
    inputData = orderBy(inputData, ['createdAt'], ['desc']);
  }

  if (sortBy === 'oldest') {
    inputData = orderBy(inputData, ['createdAt'], ['asc']);
  }

  if (sortBy === 'popular') {
    inputData = orderBy(inputData, ['totalViews'], ['desc']);
  }

  return inputData;
};
