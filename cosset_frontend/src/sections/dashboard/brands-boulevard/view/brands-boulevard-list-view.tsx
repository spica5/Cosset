'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import {
  useGetBrandStores,
  useGetMyBrandStore,
  revalidateBrandStoreList,
  fetchBrandStoreFavorites,
  toggleBrandStoreFavorite,
} from 'src/actions/brand-store';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin, isUserBusiness } from 'src/auth/utils/role';

import { BrandStoreCard } from '../brand-store-card';
import {
  BrandsBoulevardIntro,
  BRANDS_BOULEVARD_PAGE_BACKGROUND,
} from '../brands-boulevard-intro';

// ----------------------------------------------------------------------

type StoreTab = 'all' | 'favorites';

export function BrandsBoulevardListView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const canOpenStore = isUserBusiness(user?.role) || isUserAdmin(user?.role);
  const [search, setSearch] = useState('');
  const [storeTab, setStoreTab] = useState<StoreTab>('all');
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [savingFavoriteId, setSavingFavoriteId] = useState<number | null>(null);
  const [favoriteCounts, setFavoriteCounts] = useState<Record<number, number>>({});

  const { stores, storesLoading } = useGetBrandStores();
  const { store: myStore } = useGetMyBrandStore(canOpenStore);

  const favoriteSet = useMemo(() => new Set(favoriteIds.map(Number)), [favoriteIds]);
  const favoritesCount = favoriteIds.length;

  useEffect(() => {
    revalidateBrandStoreList();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setFavoriteIds([]);
      return undefined;
    }

    let mounted = true;
    fetchBrandStoreFavorites()
      .then((ids) => {
        if (mounted) setFavoriteIds(ids);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    setFavoriteCounts((prev) => {
      const next = { ...prev };
      stores.forEach((store) => {
        if (next[store.id] === undefined) {
          next[store.id] = store.favoriteCount || 0;
        }
      });
      return next;
    });
  }, [stores]);

  const filteredStores = useMemo(() => {
    const q = search.trim().toLowerCase();

    return stores.filter((store) => {
      if (storeTab === 'favorites' && !favoriteSet.has(store.id)) {
        return false;
      }

      if (!q) return true;

      return [store.name, store.tagline, store.description, store.ownerEmail, store.ownerFirstName, store.ownerLastName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [stores, search, storeTab, favoriteSet]);

  const handleToggleFavorite = useCallback(
    async (storeId: number) => {
      if (!user?.id) {
        toast.error('Sign in to favorite a shop');
        return;
      }
      if (savingFavoriteId) return;

      try {
        setSavingFavoriteId(storeId);
        const result = await toggleBrandStoreFavorite(storeId);
        setFavoriteIds((prev) =>
          result.isFavorite ? [...prev, storeId] : prev.filter((id) => id !== storeId),
        );
        setFavoriteCounts((prev) => ({
          ...prev,
          [storeId]: result.favoriteCount,
        }));
        toast.success(result.isFavorite ? 'Added to favorites' : 'Removed from favorites');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update favorite');
      } finally {
        setSavingFavoriteId(null);
      }
    },
    [savingFavoriteId, user?.id],
  );

  const handleStoreTabChange = (_event: React.SyntheticEvent, value: StoreTab) => {
    if (value === 'favorites' && !user?.id) {
      toast.error('Sign in to view your favorite shops');
      return;
    }
    setStoreTab(value);
  };

  return (
    <DashboardContent disablePadding sx={{ position: 'relative', overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url(${BRANDS_BOULEVARD_PAGE_BACKGROUND})`,
          backgroundSize: '100% auto',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(10, 8, 6, 0.62) 0%, rgba(10, 8, 6, 0.28) 120px, rgba(10, 8, 6, 0.12) 220px, transparent 360px)',
            pointerEvents: 'none',
          },
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
          heading="Brands Boulevard"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Community' },
            { name: 'Brands Boulevard' },
          ]}
          action={
            canOpenStore ? (
              <Button
                variant="contained"
                onClick={() => router.push(paths.dashboard.community.brandsBoulevard.myStore)}
                sx={{
                  bgcolor: 'rgba(10, 8, 6, 0.72)',
                  color: '#FFF4E5',
                  border: '1px solid rgba(255, 244, 229, 0.45)',
                  backdropFilter: 'blur(6px)',
                  '&:hover': {
                    bgcolor: 'rgba(10, 8, 6, 0.88)',
                  },
                }}
              >
                {myStore ? 'Manage my store' : 'Open my store'}
              </Button>
            ) : undefined
          }
          sx={{
            mb: { xs: 1.5, md: 2 },
            p: { xs: 1.5, md: 2 },
            borderRadius: 2,
            bgcolor: 'rgba(10, 8, 6, 0.42)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 244, 229, 0.18)',
            '& .MuiTypography-h4': {
              color: '#FFF4E5',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.65)',
              fontWeight: 700,
            },
            '& .MuiBreadcrumbs-root a, & .MuiBreadcrumbs-root .MuiBox-root, & .MuiBreadcrumbs-li .MuiTypography-root':
              {
                color: 'rgba(255, 244, 229, 0.95) !important',
                textShadow: '0 1px 6px rgba(0, 0, 0, 0.55)',
              },
            '& .MuiBreadcrumbs-root a:hover': {
              color: '#FFFFFF !important',
            },
            '& .MuiBreadcrumbs-li > span': {
              bgcolor: 'rgba(255, 244, 229, 0.85) !important',
            },
          }}
        />

        <BrandsBoulevardIntro />

        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              alignItems={{ md: 'center' }}
            >
              <Tabs
                value={storeTab}
                onChange={handleStoreTabChange}
                sx={{
                  flexShrink: 0,
                  minHeight: 40,
                  '& .MuiTab-root': { minHeight: 40, textTransform: 'none', px: 1.5 },
                }}
              >
                <Tab
                  value="all"
                  label={`All (${stores.length})`}
                  icon={<Iconify icon="solar:shop-2-bold" width={18} />}
                  iconPosition="start"
                />
                <Tab
                  value="favorites"
                  label={`Favorites (${favoritesCount})`}
                  icon={<Iconify icon="solar:heart-bold" width={18} />}
                  iconPosition="start"
                />
              </Tabs>
              <TextField
                size="small"
                fullWidth
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search stores by name, tagline, or owner"
              />
            </Stack>

            {storesLoading ? (
              <Typography variant="body2" color="text.secondary">
                Loading the boulevard...
              </Typography>
            ) : filteredStores.length ? (
              <Grid container spacing={2.5}>
                {filteredStores.map((store) => (
                  <Grid key={store.id} item xs={12} sm={6} md={4}>
                    <BrandStoreCard
                      store={{
                        ...store,
                        favoriteCount: favoriteCounts[store.id] ?? store.favoriteCount ?? 0,
                      }}
                      isOwner={String(store.ownerCustomerId) === String(user?.id)}
                      isFavorite={favoriteSet.has(store.id)}
                      favoriteSaving={savingFavoriteId === store.id}
                      onToggleFavorite={
                        user?.id ? () => handleToggleFavorite(store.id) : undefined
                      }
                      onEnter={() =>
                        router.push(paths.dashboard.community.brandsBoulevard.store(store.id))
                      }
                      onManage={() =>
                        router.push(paths.dashboard.community.brandsBoulevard.myStore)
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <EmptyContent
                filled
                title={
                  storeTab === 'favorites'
                    ? 'No favorite shops yet'
                    : 'No stores on the boulevard yet'
                }
                description={
                  storeTab === 'favorites'
                    ? 'Tap the heart on a shop card to save it here.'
                    : canOpenStore
                      ? 'Be the first to open your brand storefront.'
                      : 'Check back soon — business brands are preparing their shop windows.'
                }
                sx={{ py: 8 }}
                action={
                  storeTab === 'favorites' ? (
                    <Button variant="outlined" onClick={() => setStoreTab('all')}>
                      Browse all shops
                    </Button>
                  ) : canOpenStore ? (
                    <Button
                      variant="contained"
                      onClick={() => router.push(paths.dashboard.community.brandsBoulevard.myStore)}
                    >
                      Open my store
                    </Button>
                  ) : undefined
                }
              />
            )}
          </Stack>
        </Card>
      </Box>
    </DashboardContent>
  );
}
