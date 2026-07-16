'use client';

import type { IBrandStore } from 'src/types/brand-store';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { getS3SignedUrl } from 'src/utils/helper';

import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

type Props = {
  store: IBrandStore;
  onEnter: () => void;
  isOwner?: boolean;
  onManage?: () => void;
};

export function BrandStoreCard({ store, onEnter, isOwner, onManage }: Props) {
  const [coverUrl, setCoverUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    let mounted = true;

    const resolve = async (value?: string | null, setter?: (url: string) => void) => {
      if (!value || !setter) {
        setter?.('');
        return;
      }

      if (
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('data:') ||
        value.startsWith('blob:')
      ) {
        if (mounted) setter(value);
        return;
      }

      const signed = await getS3SignedUrl(value.replace(/^public:/, ''));
      if (mounted) setter(signed || '');
    };

    resolve(store.coverImage, setCoverUrl);
    resolve(store.logoImage, setLogoUrl);

    return () => {
      mounted = false;
    };
  }, [store.coverImage, store.logoImage]);

  const ownerName =
    `${store.ownerFirstName || ''} ${store.ownerLastName || ''}`.trim() ||
    store.ownerEmail ||
    'Brand owner';

  return (
    <Card
      sx={{
        overflow: 'hidden',
        height: 1,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: 160,
          background: coverUrl
            ? `url(${coverUrl}) center / cover no-repeat`
            : 'linear-gradient(135deg, #4a3426 0%, #c9a66b 100%)',
        }}
      >
        {logoUrl ? (
          <Box
            component="img"
            src={logoUrl}
            alt={store.name}
            sx={{
              position: 'absolute',
              left: 16,
              bottom: -24,
              width: 64,
              height: 64,
              borderRadius: 2,
              objectFit: 'cover',
              border: '3px solid',
              borderColor: 'background.paper',
              bgcolor: 'background.paper',
            }}
          />
        ) : (
          <Box
            sx={{
              position: 'absolute',
              left: 16,
              bottom: -24,
              width: 64,
              height: 64,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid',
              borderColor: 'background.paper',
              bgcolor: 'background.paper',
            }}
          >
            <Iconify icon="solar:shop-2-bold" width={28} />
          </Box>
        )}
      </Box>

      <Stack spacing={1.5} sx={{ p: 2.5, pt: 4.5, flexGrow: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {store.name}
          </Typography>
          {isOwner ? <Chip size="small" color="primary" label="Your store" /> : null}
        </Stack>

        {store.tagline ? (
          <Typography variant="body2" color="text.secondary">
            {store.tagline}
          </Typography>
        ) : null}

        <Typography variant="caption" color="text.secondary">
          by {ownerName}
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            size="small"
            variant="outlined"
            label={`${store.categoryCount || 0} categories`}
          />
          <Chip size="small" variant="outlined" label={`${store.productCount || 0} products`} />
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={1}>
          <Button fullWidth variant="contained" onClick={onEnter}>
            Enter store
          </Button>
          {isOwner && onManage ? (
            <Button variant="outlined" onClick={onManage} sx={{ whiteSpace: 'nowrap' }}>
              Manage
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Card>
  );
}
