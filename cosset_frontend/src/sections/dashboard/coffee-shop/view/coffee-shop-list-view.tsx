'use client';

import type { ICoffeeShopItem } from 'src/types/coffee-shop';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useGetCoffeeShops, deleteCoffeeShop } from 'src/actions/coffee-shop';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin } from 'src/auth/utils/role';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { orderBy } from 'src/utils/helper';

import { Iconify } from 'src/components/universe/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';
import { CoffeeShopItem } from 'src/sections/dashboard/coffee-shop/coffee-shop-item';
import { CoffeeShopSort } from 'src/sections/dashboard/coffee-shop/coffee-shop-sort';

// ----------------------------------------------------------------------

const COFFEE_SHOP_SORT_OPTIONS = [
  { label: 'Randomize', value: 'randomize' },
  { label: 'Latest', value: 'latest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Name (A-Z)', value: 'name' },
  { label: 'Name (Z-A)', value: 'name-desc' },
];

// ----------------------------------------------------------------------

export function CoffeeShopListView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('randomize');
  const [randomFirstId, setRandomFirstId] = useState<number | null>(null);
  const canManage = isUserAdmin(user?.role);

  const { coffeeShops, coffeeShopsLoading } = useGetCoffeeShops();

  const handleSortBy = useCallback((newValue: string) => {
    setSortBy(newValue);

    if (newValue === 'randomize') {
      setRandomFirstId(null);
    }
  }, []);

  const searchedData = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return coffeeShops;
    }

    return coffeeShops.filter((item) => {
      const haystack = [
        String(item.id),
        item.name,
        item.title,
        item.description,
        String(item.type),
        item.files,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [search, coffeeShops]);

  useEffect(() => {
    if (sortBy !== 'randomize') {
      return;
    }

    if (searchedData.length === 0) {
      setRandomFirstId(null);
      return;
    }

    setRandomFirstId((current) => {
      if (current !== null && searchedData.some((item) => item.id === current)) {
        return current;
      }

      return searchedData[Math.floor(Math.random() * searchedData.length)].id;
    });
  }, [sortBy, searchedData]);

  // no auto-redirect: allow users to view the coffee shop list without being forced into a universe page

  const filteredData = useMemo(
    () => applyFilter({ inputData: searchedData, sortBy, randomFirstId }),
    [searchedData, sortBy, randomFirstId]
  );

  const handleDelete = async (id: number) => {
    try {
      await deleteCoffeeShop(id);
    } catch (error) {
      console.error('Failed to delete coffee shop:', error);
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Coffee Shops"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Community' },
          { name: 'Coffee Shops' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            spacing={1.5}
          >
            <TextField
              size="small"
              fullWidth
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, title, type, or file"
            />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              sx={{ width: { xs: 1, md: 'auto' }, flexShrink: 0 }}
            >
              <CoffeeShopSort
                sort={sortBy}
                onSort={handleSortBy}
                sortOptions={COFFEE_SHOP_SORT_OPTIONS}
              />

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                sx={{ flexShrink: 0 }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    whiteSpace: 'nowrap',
                    textAlign: { xs: 'center', sm: 'left' },
                  }}
                >
                  Showing {filteredData.length} of {coffeeShops.length}
                </Typography>

                {canManage ? (
                  <Button
                    variant="contained"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    onClick={() => router.push(paths.dashboard.community.coffeeShop.new)}
                    sx={{ whiteSpace: 'nowrap', width: { xs: 1, sm: 'auto' } }}
                  >
                    Add Coffee Shop
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          </Stack>

          {coffeeShopsLoading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <Iconify icon="solar:refresh-outline" width={16} />
              <Typography variant="body2" color="text.secondary">
                Loading coffee shops...
              </Typography>
            </Stack>
          ) : filteredData.length === 0 ? (
            <EmptyContent title="No coffee shops found" filled sx={{ py: 8 }} />
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))',
                },
              }}
            >
              {filteredData.map((item) => (
                <CoffeeShopItem
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  title={item.title}
                  description={item.description}
                  background={item.background}
                  files={item.files}
                  createdAt={item.createdAt}
                  previewHref={paths.dashboard.community.coffeeShop.view(item.id)}
                  canManage={canManage}
                  onEdit={
                    canManage
                      ? (id) => router.push(paths.dashboard.community.coffeeShop.edit(id))
                      : undefined
                  }
                  onDelete={canManage ? handleDelete : undefined}
                  onEnter={() => router.push(paths.dashboard.community.coffeeShop.view(item.id))}
                />
              ))}
            </Box>
          )}
        </Stack>
      </Card>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  sortBy: string;
  inputData: ICoffeeShopItem[];
  randomFirstId?: number | null;
};

const applyFilter = ({ inputData, sortBy, randomFirstId }: ApplyFilterProps) => {
  if (sortBy === 'randomize') {
    if (!randomFirstId || inputData.length <= 1) {
      return inputData;
    }

    const firstIndex = inputData.findIndex((item) => item.id === randomFirstId);

    if (firstIndex === -1) {
      return inputData;
    }

    const reordered = [...inputData];
    const [firstItem] = reordered.splice(firstIndex, 1);

    return [firstItem, ...reordered];
  }

  if (sortBy === 'latest') {
    return orderBy(inputData, ['createdAt'], ['desc']);
  }

  if (sortBy === 'oldest') {
    return orderBy(inputData, ['createdAt'], ['asc']);
  }

  if (sortBy === 'name') {
    return orderBy(inputData, ['name'], ['asc']);
  }

  if (sortBy === 'name-desc') {
    return orderBy(inputData, ['name'], ['desc']);
  }

  return inputData;
};
