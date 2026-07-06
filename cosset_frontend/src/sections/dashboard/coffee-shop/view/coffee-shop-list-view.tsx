'use client';

import type { ICoffeeShopItem } from 'src/types/coffee-shop';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import {
  useGetCoffeeShops,
  deleteCoffeeShop,
  revalidateCoffeeShopList,
  fetchCoffeeShopFavorites,
  toggleCoffeeShopFavorite,
} from 'src/actions/coffee-shop';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin } from 'src/auth/utils/role';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { orderBy } from 'src/utils/helper';

import { Iconify } from 'src/components/universe/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';
import { CoffeeShopItem } from 'src/sections/dashboard/coffee-shop/coffee-shop-item';
import {
  CoffeeShopIntro,
  COFFEE_SHOP_PAGE_BACKGROUND,
} from 'src/sections/dashboard/coffee-shop/coffee-shop-intro';
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
  const [category, setCategory] = useState<'all' | 'favorites'>('all');
  const [sortBy, setSortBy] = useState('randomize');
  const [randomFirstId, setRandomFirstId] = useState<number | null>(null);
  const canManage = isUserAdmin(user?.role);

  const { coffeeShops, coffeeShopsLoading } = useGetCoffeeShops();
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const favoriteSet = useMemo(() => new Set(favoriteIds.map(Number)), [favoriteIds]);

  useEffect(() => {
    revalidateCoffeeShopList();
  }, []);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    fetchCoffeeShopFavorites().then((ids) => {
      setFavoriteIds(ids);
    });
  }, [userId]);

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

  const categoryData = useMemo(() => {
    if (category === 'favorites') {
      return searchedData.filter((item) => favoriteSet.has(Number(item.id)));
    }
    return searchedData;
  }, [searchedData, category, favoriteSet]);

  const filteredData = useMemo(
    () => applyFilter({ inputData: categoryData, sortBy, randomFirstId }),
    [categoryData, sortBy, randomFirstId]
  );

  const favoritesCount = useMemo(
    () => searchedData.filter((item) => favoriteSet.has(Number(item.id))).length,
    [searchedData, favoriteSet],
  );

  const handleDelete = async (id: number) => {
    try {
      await deleteCoffeeShop(id);
    } catch (error) {
      console.error('Failed to delete coffee shop:', error);
    }
  };

  const handleToggleFavorite = useCallback(
    async (id: number) => {
      const numId = Number(id);
      const wasFavorite = favoriteSet.has(numId);

      setFavoriteIds((prev) =>
        wasFavorite ? prev.filter((fid) => fid !== numId) : [...prev, numId],
      );

      try {
        await toggleCoffeeShopFavorite(numId);
        const fresh = await fetchCoffeeShopFavorites();
        setFavoriteIds(fresh);
      } catch {
        setFavoriteIds((prev) =>
          wasFavorite ? [...prev, numId] : prev.filter((fid) => fid !== numId),
        );
      }
    },
    [favoriteSet],
  );

  return (
    <DashboardContent disablePadding sx={{ position: 'relative', overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url(${COFFEE_SHOP_PAGE_BACKGROUND})`,
          backgroundSize: '100% auto',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          px: { xs: 2, md: 3 },
          pt: 'var(--layout-dashboard-content-pt)',
          pb: 'var(--layout-dashboard-content-pb)',
        }}
      >
        <CustomBreadcrumbs
          heading="Coffee Shops"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Community' },
            { name: 'Coffee Shops' },
          ]}
          sx={{
            mb: { xs: 3, md: 5 },
            '& .MuiTypography-h4': {
              color: '#FFF8F0',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
            },
            '& .MuiBreadcrumbs-root a, & .MuiBreadcrumbs-root .MuiBox-root': {
              color: 'rgba(255, 248, 240, 0.92) !important',
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.45)',
            },
            '& .MuiBreadcrumbs-root a:hover': {
              color: '#FFFFFF !important',
            },
            '& .MuiBreadcrumbs-li > span': {
              bgcolor: 'rgba(255, 248, 240, 0.75) !important',
            },
          }}
        />

        <CoffeeShopIntro />

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

            <Tabs
              value={category}
              onChange={(_e, v) => setCategory(v)}
              sx={{
                '& .MuiTab-root': { minHeight: 40, textTransform: 'none' },
              }}
            >
              <Tab
                value="all"
                label={`All (${searchedData.length})`}
                icon={<Iconify icon="solar:cup-bold" width={18} />}
                iconPosition="start"
              />
              <Tab
                value="favorites"
                label={`Favorites (${favoritesCount})`}
                icon={<Iconify icon="solar:heart-bold" width={18} />}
                iconPosition="start"
              />
            </Tabs>

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
                    coverImage={item.coverImage}
                    files={item.files}
                    createdAt={item.createdAt}
                    canManage={canManage}
                    isFavorite={favoriteSet.has(Number(item.id))}
                    onToggleFavorite={handleToggleFavorite}
                    onEdit={
                      canManage
                        ? (id) => router.push(paths.dashboard.community.coffeeShop.edit(id))
                        : undefined
                    }
                    onDelete={canManage ? handleDelete : undefined}
                    onEnter={() => {
                      window.open(
                        paths.dashboard.community.coffeeShop.view(item.id),
                        '_blank',
                        'noopener,noreferrer',
                      );
                    }}
                  />
                ))}
              </Box>
            )}
          </Stack>
        </Card>
      </Box>
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
