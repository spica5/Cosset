'use client';

import type { ICoffeeShopItem } from 'src/types/coffee-shop';

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getS3SignedUrl } from 'src/utils/helper';
import { parseCoffeeShopBackgroundImages } from 'src/utils/coffee-shop-background';

import {
  fetchCoffeeShopFavorites,
  useGetCoffeeShops,
} from 'src/actions/coffee-shop';

import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';

// ----------------------------------------------------------------------

const TOP_SHOP_LIMIT = 4;

const getCreatedAtTime = (value: ICoffeeShopItem['createdAt']) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

async function resolveCoverUrl(shop: ICoffeeShopItem) {
  const cover = (shop.coverImage || '').trim();
  if (cover) {
    if (cover.startsWith('http://') || cover.startsWith('https://') || cover.startsWith('/')) {
      return cover;
    }
    return (await getS3SignedUrl(cover)) || cover;
  }

  const backgrounds = parseCoffeeShopBackgroundImages(shop.background);
  const first = backgrounds[0];
  if (!first) return '';
  if (first.startsWith('http://') || first.startsWith('https://') || first.startsWith('/')) {
    return first;
  }
  return (await getS3SignedUrl(first)) || first;
}

function TopShopCard({
  shop,
  isFavorite,
  rank,
}: {
  shop: ICoffeeShopItem;
  isFavorite: boolean;
  rank: number;
}) {
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    let mounted = true;
    resolveCoverUrl(shop).then((url) => {
      if (mounted) setCoverUrl(url);
    });
    return () => {
      mounted = false;
    };
  }, [shop]);

  return (
    <Card
      sx={{
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        height: 1,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: 120,
          bgcolor: 'grey.200',
          background: coverUrl
            ? `url(${coverUrl}) center / cover no-repeat`
            : (shop.background || '').includes('gradient(')
              ? shop.background!
              : undefined,
        }}
      >
        <Chip
          size="small"
          label={`#${rank}`}
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            fontWeight: 800,
            bgcolor: 'rgba(0,0,0,0.72)',
            color: 'common.white',
          }}
        />
        {isFavorite ? (
          <Chip
            size="small"
            icon={<Iconify icon="solar:heart-bold" width={14} />}
            label="Favorite"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              fontWeight: 700,
              bgcolor: 'rgba(255,86,48,0.92)',
              color: 'common.white',
              '& .MuiChip-icon': { color: 'common.white' },
            }}
          />
        ) : null}
      </Box>

      <Stack spacing={1} sx={{ p: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
          {shop.name}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            minHeight: 40,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {(shop.title || shop.description || 'Coffee shop').trim()}
        </Typography>

        <Button
          component={RouterLink}
          href={paths.dashboard.community.coffeeShop.view(shop.id)}
          target="_blank"
          rel="noopener noreferrer"
          size="small"
          variant="contained"
          endIcon={<Iconify icon="eva:external-link-fill" width={16} />}
          sx={{ alignSelf: 'flex-start' }}
        >
          Enter shop
        </Button>
      </Stack>
    </Card>
  );
}

export function OverviewTopShops() {
  const { coffeeShops, coffeeShopsLoading } = useGetCoffeeShops();
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchCoffeeShopFavorites()
      .then((ids) => {
        if (mounted) setFavoriteIds(ids.map(Number).filter(Number.isFinite));
      })
      .catch(() => {
        if (mounted) setFavoriteIds([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const topShops = useMemo(() => {
    const ranked = [...coffeeShops].sort((a, b) => {
      const aFav = favoriteSet.has(Number(a.id)) ? 1 : 0;
      const bFav = favoriteSet.has(Number(b.id)) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return getCreatedAtTime(b.createdAt) - getCreatedAtTime(a.createdAt);
    });
    return ranked.slice(0, TOP_SHOP_LIMIT);
  }, [coffeeShops, favoriteSet]);

  return (
    <Card sx={{ p: { xs: 2, md: 2.5 }, height: 1 }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack spacing={0.25}>
          <Typography variant="h5">Coffee shops</Typography>
          <Typography variant="body2" color="text.secondary">
            Favorites first, then newest coffee shops
          </Typography>
        </Stack>

        <Button
          component={RouterLink}
          href={paths.dashboard.community.coffeeShop.list}
          size="small"
          variant="outlined"
          endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={16} />}
        >
          View all
        </Button>
      </Stack>

      {coffeeShopsLoading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : topShops.length ? (
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
            },
          }}
        >
          {topShops.map((shop, index) => (
            <TopShopCard
              key={shop.id}
              shop={shop}
              rank={index + 1}
              isFavorite={favoriteSet.has(Number(shop.id))}
            />
          ))}
        </Box>
      ) : (
        <EmptyContent
          filled
          title="No coffee shops yet"
          description="Top shops will appear here once coffee shops are added."
          sx={{ py: 5 }}
        />
      )}
    </Card>
  );
}
