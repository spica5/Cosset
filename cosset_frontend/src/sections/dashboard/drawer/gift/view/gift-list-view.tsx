'use client';

import type { IGiftItem } from 'src/types/gift';

import { useState, useEffect, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useSetState } from 'src/hooks/use-set-state';

import { useGetGifts } from 'src/actions/gift';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { mutate } from 'swr';
import { orderBy } from 'src/utils/helper';
import { endpoints } from 'src/utils/axios';

import { GiftList } from '../gift-list';
import { GiftSort } from '../gift-sort';
import { GiftSearch } from '../gift-search';

export function GiftListView() {
  const [sortBy, setSortBy] = useState('latest');
  const router = useRouter();

  const { gifts, giftsLoading } = useGetGifts();

  // Refresh gift list when component mounts (when returning from create/edit)
  useEffect(() => {
    mutate(endpoints.gift.list);
  }, []);

  const search = useSetState<{
    query: string;
    results: IGiftItem[];
  }>({ query: '', results: [] });

  const dataFiltered = applyFilter({
    inputData: search.state.results.length ? search.state.results : gifts,
    sortBy,
  });

  const notFound = !dataFiltered.length && !giftsLoading;

  const handleSortBy = useCallback((newValue: string) => {
    setSortBy(newValue);
  }, []);

  const handleSearch = useCallback(
    (inputValue: string) => {
      search.setState({ query: inputValue });

      if (inputValue) {
        const results = gifts.filter(
          (gift) => gift.title.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
        );

        search.setState({ results });
      } else {
        search.setState({ results: [] });
      }
    },
    [gifts, search]
  );

  const handleCreateGift = useCallback(() => {
    router.push(paths.dashboard.drawer.gift.new);
  }, [router]);

    const GIFT_SORT_OPTIONS = [
    { label: 'Latest', value: 'latest' },    
    { label: 'Oldest', value: 'oldest' },
    { label: 'Title (A-Z)', value: 'titleASC' },
    { label: 'recentlyReceived', value: 'recentlyReceived' },
  ];

  const renderFilters = (
    <Stack
      spacing={3}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-end', sm: 'center' }}
      direction={{ xs: 'column', sm: 'row' }}
    >
      <GiftSearch search={search} onSearch={handleSearch} />

      <Stack direction="row" spacing={1} flexShrink={0}>
        <GiftSort sort={sortBy} onSort={handleSortBy} sortOptions={GIFT_SORT_OPTIONS} />
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={handleCreateGift}
        >
          New Gift
        </Button>
      </Stack>
    </Stack>
  );
  
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Gifts"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Gifts', href: paths.dashboard.drawer.gift.root },
          { name: 'List' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={2.5} sx={{ mb: { xs: 3, md: 5 } }}>
        {renderFilters}
      </Stack>

      {notFound && <EmptyContent filled sx={{ py: 10 }} />}

      <GiftList gifts={dataFiltered} />
    </DashboardContent>
  );
}


// ----------------------------------------------------------------------

type ApplyFilterProps = {
  sortBy: string;
  inputData: IGiftItem[];
};

const applyFilter = ({ inputData, sortBy }: ApplyFilterProps) => {

  // Sort by
  if (sortBy === 'latest') {
    inputData = orderBy(inputData, ['createdAt'], ['desc']);
  }

  if (sortBy === 'oldest') {
    inputData = orderBy(inputData, ['createdAt'], ['asc']);
  }

  if (sortBy === 'recentlyReceived') {
    inputData = orderBy(inputData, ['receivedDate'], ['desc']);
  }

  if (sortBy === 'titleASC') {
    inputData = orderBy(inputData, ['title'], ['asc']);
  }

  return inputData;
};
