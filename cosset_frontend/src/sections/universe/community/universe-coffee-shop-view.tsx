'use client';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useGetCoffeeShop } from 'src/actions/coffee-shop';
import { getS3SignedUrl } from 'src/utils/helper';

// ----------------------------------------------------------------------

type Props = {
  coffeeShopId: string;
};

export function UniverseCoffeeShopView({ coffeeShopId }: Props) {
  const { coffeeShop, coffeeShopLoading } = useGetCoffeeShop(coffeeShopId);
  const [resolvedBackground, setResolvedBackground] = useState('');

  useEffect(() => {
    let mounted = true;

    const resolveBackground = async () => {
      const normalized = String(coffeeShop?.background || '').trim();

      if (!normalized) {
        if (mounted) {
          setResolvedBackground('');
        }
        return;
      }

      if (
        normalized.startsWith('http://') ||
        normalized.startsWith('https://') ||
        normalized.includes('gradient(')
      ) {
        if (mounted) {
          setResolvedBackground(normalized);
        }
        return;
      }

      const signedUrl = await getS3SignedUrl(normalized);
      if (mounted) {
        setResolvedBackground(signedUrl || normalized);
      }
    };

    resolveBackground();

    return () => {
      mounted = false;
    };
  }, [coffeeShop?.background]);

  if (coffeeShopLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#0b0f14' }}>
        <CircularProgress sx={{ color: 'common.white' }} />
      </Box>
    );
  }

  if (!coffeeShop) {
    return (
      <Box
        sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#0b0f14', p: 3 }}
      >
        <Typography variant="h6" sx={{ color: 'common.white' }}>
          Coffee shop not found
        </Typography>
      </Box>
    );
  }

  const isGradient = resolvedBackground.includes('gradient(');
  const hasImage =
    resolvedBackground.startsWith('http://') || resolvedBackground.startsWith('https://');

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        bgcolor: '#0b0f14',
        background: isGradient ? resolvedBackground : undefined,
        backgroundImage: hasImage ? `url(${resolvedBackground})` : undefined,
        backgroundSize: hasImage ? 'contain' : 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Stack sx={{ p: 2 }}>
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
