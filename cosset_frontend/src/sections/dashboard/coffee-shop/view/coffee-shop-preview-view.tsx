'use client';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useGetCoffeeShop } from 'src/actions/coffee-shop';
import { getS3SignedUrl } from 'src/utils/helper';
import {
  isCoffeeShopGradientBackground,
  parseCoffeeShopBackgroundImages,
} from 'src/utils/coffee-shop-background';

type Props = {
  coffeeShopId: string;
};

export function CoffeeShopPreviewView({ coffeeShopId }: Props) {
  const { coffeeShop, coffeeShopLoading } = useGetCoffeeShop(coffeeShopId);
  const [resolvedImageUrls, setResolvedImageUrls] = useState<string[]>([]);

  const rawBackground = String(coffeeShop?.background || '').trim();
  const isGradient = isCoffeeShopGradientBackground(rawBackground);
  const backgroundImageKeys = parseCoffeeShopBackgroundImages(rawBackground);

  useEffect(() => {
    let mounted = true;

    const resolveImages = async () => {
      if (!backgroundImageKeys.length) {
        if (mounted) {
          setResolvedImageUrls([]);
        }
        return;
      }

      const urls = await Promise.all(
        backgroundImageKeys.map(async (key) => {
          if (key.startsWith('http://') || key.startsWith('https://')) {
            return key;
          }
          return (await getS3SignedUrl(key)) || '';
        }),
      );

      if (mounted) {
        setResolvedImageUrls(urls.filter(Boolean));
      }
    };

    resolveImages();

    return () => {
      mounted = false;
    };
  }, [backgroundImageKeys]);

  const activeImageUrl = resolvedImageUrls[0] || '';
  const hasImage =
    Boolean(activeImageUrl) &&
    (activeImageUrl.startsWith('http://') || activeImageUrl.startsWith('https://'));

  if (coffeeShopLoading) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', bgcolor: '#0b0f14' }}>
        <CircularProgress sx={{ color: 'common.white' }} />
      </Box>
    );
  }

  if (!coffeeShop) {
    return (
      <Box
        sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', bgcolor: '#0b0f14', p: 3 }}
      >
        <Typography variant="h6" sx={{ color: 'common.white' }}>
          Coffee shop not found
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100dvh',
        height: '100dvh',
        width: '100%',
        bgcolor: '#0b0f14',
        overflow: 'hidden',
      }}
    >
      {isGradient ? (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            background: rawBackground,
          }}
        />
      ) : null}

      {hasImage ? (
        <Box
          component="img"
          src={activeImageUrl}
          alt={coffeeShop.title || coffeeShop.name}
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            bgcolor: '#0b0f14',
            display: 'block',
          }}
        />
      ) : null}

      <Stack sx={{ position: 'relative', zIndex: 1, p: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{ color: 'common.white', textShadow: '0 2px 8px rgba(0,0,0,0.45)' }}
        >
          {coffeeShop.title || coffeeShop.name}
        </Typography>
      </Stack>
    </Box>
  );
}
