'use client';

import type { IBrandStore } from 'src/types/brand-store';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getS3SignedUrl } from 'src/utils/helper';

import { useGetBrandStores } from 'src/actions/brand-store';

import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';

// ----------------------------------------------------------------------

const STORE_LIMIT = 4;

const getCreatedAtTime = (value: IBrandStore['createdAt']) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

async function resolveMediaUrl(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('/') ||
    raw.startsWith('data:') ||
    raw.startsWith('blob:')
  ) {
    return raw;
  }

  return (await getS3SignedUrl(raw.replace(/^public:/, ''))) || '';
}

function BrandStoreOverviewCard({ store, rank }: { store: IBrandStore; rank: number }) {
  const [coverUrl, setCoverUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    let mounted = true;

    Promise.all([resolveMediaUrl(store.coverImage), resolveMediaUrl(store.logoImage)]).then(
      ([cover, logo]) => {
        if (!mounted) return;
        setCoverUrl(cover);
        setLogoUrl(logo);
      },
    );

    return () => {
      mounted = false;
    };
  }, [store.coverImage, store.logoImage]);

  const productLabel =
    store.productCount != null
      ? `${store.productCount} product${store.productCount === 1 ? '' : 's'}`
      : null;

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
          background: coverUrl ? `url(${coverUrl}) center / cover no-repeat` : undefined,
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
        <Avatar
          src={logoUrl || undefined}
          alt={store.name}
          sx={{
            position: 'absolute',
            right: 10,
            bottom: -18,
            width: 44,
            height: 44,
            border: '2px solid',
            borderColor: 'background.paper',
            bgcolor: 'background.neutral',
          }}
        >
          {(store.name || 'B').charAt(0).toUpperCase()}
        </Avatar>
      </Box>

      <Stack spacing={1} sx={{ p: 1.5, pt: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
          {store.name}
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
          {(store.tagline || store.description || 'Brand store').trim()}
        </Typography>

        {productLabel ? (
          <Typography variant="caption" color="text.secondary">
            {productLabel}
          </Typography>
        ) : null}

        <Button
          component={RouterLink}
          href={paths.dashboard.community.brandsBoulevard.store(store.id)}
          size="small"
          variant="contained"
          endIcon={<Iconify icon="solar:shop-2-bold" width={16} />}
          sx={{ alignSelf: 'flex-start' }}
        >
          Enter store
        </Button>
      </Stack>
    </Card>
  );
}

export function OverviewBrandsBoulevard() {
  const { stores, storesLoading } = useGetBrandStores();

  const topStores = useMemo(() => {
    const ranked = [...stores]
      .filter((store) => store.isPublic !== false)
      .sort((a, b) => {
        const productDiff = Number(b.productCount || 0) - Number(a.productCount || 0);
        if (productDiff !== 0) return productDiff;
        return getCreatedAtTime(b.createdAt) - getCreatedAtTime(a.createdAt);
      });

    return ranked.slice(0, STORE_LIMIT);
  }, [stores]);

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
          <Typography variant="h5">Brands Boulevard</Typography>
          <Typography variant="body2" color="text.secondary">
            Featured brand stores and boutiques
          </Typography>
        </Stack>

        <Button
          component={RouterLink}
          href={paths.dashboard.community.brandsBoulevard.list}
          size="small"
          variant="outlined"
          endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={16} />}
        >
          View all
        </Button>
      </Stack>

      {storesLoading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : topStores.length ? (
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(3, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
            },
          }}
        >
          {topStores.map((store, index) => (
            <BrandStoreOverviewCard key={store.id} store={store} rank={index + 1} />
          ))}
        </Box>
      ) : (
        <EmptyContent
          filled
          title="No brand stores yet"
          description="Brand stores will appear here once boutiques are added to Brands Boulevard."
          sx={{ py: 5 }}
        />
      )}
    </Card>
  );
}
