'use client';

import type { INeighborItem } from 'src/types/neighbor';

import { useState, useCallback } from 'react';

import Stack from '@mui/material/Stack';

import { paths } from 'src/routes/paths';

import { useSetState } from 'src/hooks/use-set-state';

import { orderBy } from 'src/utils/helper';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import { _neighbors, NEIGHBOR_SORT_OPTIONS } from 'src/_mock/dashboard';

import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { NeighborList } from '../neighbor-list';
import { NeighborSort } from '../neighbor-sort';
import { NeighborSearch } from '../neighbor-search';

// ----------------------------------------------------------------------

export function NeighborListView() {
  const [sortBy, setSortBy] = useState('latest');

  const search = useSetState<{
    query: string;
    results: INeighborItem[];
  }>({ query: '', results: [] });

  const dataFiltered = applyFilter({
    inputData: _neighbors,
    sortBy,
  });

  const notFound = !dataFiltered.length;

  const handleSortBy = useCallback((newValue: string) => {
    setSortBy(newValue);
  }, []);

  const handleSearch = useCallback(
    (inputValue: string) => {
      search.setState({ query: inputValue });

      if (inputValue) {
        const results = _neighbors.filter(
          (neighbor) => neighbor.name.toLowerCase().indexOf(search.state.query.toLowerCase()) !== -1
        );

        search.setState({ results });
      }
    },
    [search]
  );

  const renderFilters = (
    <Stack
      spacing={3}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-end', sm: 'center' }}
      direction={{ xs: 'column', sm: 'row' }}
    >
      <NeighborSearch search={search} onSearch={handleSearch} />

      <Stack direction="row" spacing={1} flexShrink={0}>
        <NeighborSort sort={sortBy} onSort={handleSortBy} sortOptions={NEIGHBOR_SORT_OPTIONS} />
      </Stack>
    </Stack>
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Neighbors"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Neighbors', href: paths.dashboard.community.neighbor.root },
          { name: 'List' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={2.5} sx={{ mb: { xs: 3, md: 5 } }}>
        {renderFilters}
      </Stack>

      {notFound && <EmptyContent filled sx={{ py: 10 }} />}

      <NeighborList neighbors={dataFiltered} />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  sortBy: string;
  inputData: INeighborItem[];
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
