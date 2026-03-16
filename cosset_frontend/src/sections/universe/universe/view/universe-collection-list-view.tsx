'use client';

import type { ICollectionItem } from 'src/types/collection';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useGetCollections } from 'src/actions/collection';
import { useGetCollectionItems } from 'src/actions/collection-item';
import { useGetGuestArea } from 'src/actions/guestarea';

import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

type Props = {
  customerId: string;
};

type CollectionCardProps = {
  customerId: string;
  collection: ICollectionItem;
};

const PREVIEW_ITEMS_LIMIT = 4;

const formatDate = (value: unknown) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString();
};

const parseSharedCollectionMap = (drawerRaw?: string | null): Record<string, boolean> => {
  if (!drawerRaw) {
    return {};
  }

  try {
    const parsed = JSON.parse(drawerRaw) as {
      collectionItems?: Record<string, unknown>;
    };

    return Object.entries(parsed.collectionItems || {}).reduce<Record<string, boolean>>(
      (acc, [key, value]) => {
        acc[String(key)] = !!value;
        return acc;
      },
      {},
    );
  } catch {
    return {};
  }
};

function UniverseCollectionListCard({ customerId, collection }: CollectionCardProps) {
  const { collectionItems, collectionItemsLoading } = useGetCollectionItems(collection.id, customerId);

  const publicItems = useMemo(
    () => collectionItems.filter((item) => item.isPublic === 1),
    [collectionItems],
  );

  const previewItems = publicItems.slice(0, PREVIEW_ITEMS_LIMIT);

  return (
    <Grid item xs={12} md={6} lg={4}>
      <Card sx={{ height: 1, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Stack spacing={1.25}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify icon="solar:folder-with-files-bold" width={18} sx={{ color: 'primary.main' }} />
              <Typography variant="h6" noWrap>
                {collection.name || `Collection #${collection.id}`}
              </Typography>
            </Stack>

            {collection.description ? (
              <Typography variant="body2" color="text.secondary" noWrap>
                {collection.description}
              </Typography>
            ) : null}

            {collectionItemsLoading ? (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Iconify icon="solar:refresh-outline" width={14} sx={{ color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Loading items...
                </Typography>
              </Stack>
            ) : (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Iconify icon="eva:layers-fill" width={14} sx={{ color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {publicItems.length} shared item{publicItems.length === 1 ? '' : 's'}
                </Typography>
              </Stack>
            )}

            {!collectionItemsLoading && previewItems.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                No shared items in this collection.
              </Typography>
            ) : null}

            {!collectionItemsLoading && previewItems.length > 0 ? (
              <Stack spacing={0.8}>
                {previewItems.map((item) => (
                  <Box
                    key={item.id}
                    sx={{ p: 1, borderRadius: 1, bgcolor: 'background.neutral', border: '1px dashed', borderColor: 'divider' }}
                  >
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Iconify icon="solar:bookmark-square-minimalistic-bold" width={14} sx={{ color: 'info.main' }} />
                      <Typography variant="body2" noWrap>
                        {(item.title || '').trim() || `Item #${item.id}`}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Iconify icon="eva:calendar-outline" width={14} sx={{ color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(item.date || item.updatedAt)}
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
}

export function UniverseCollectionListView({ customerId }: Props) {
  const { guestarea } = useGetGuestArea(customerId);
  const { collections, collectionsLoading } = useGetCollections(customerId);

  const sharedCollectionMap = useMemo(
    () => parseSharedCollectionMap(guestarea?.drawer),
    [guestarea?.drawer],
  );

  const sharedCollections = useMemo(
    () =>
      [...collections]
        .filter((collection) => !!sharedCollectionMap[String(collection.id)])
        .sort((a, b) => {
          const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
          const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;

          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }

          return (a.name || '').localeCompare(b.name || '');
        }),
    [collections, sharedCollectionMap],
  );

  return (
    <Box component="section" sx={{ py: { xs: 6, md: 10 } }}>
      <Container>
        <Stack spacing={3}>
          <Link
            component={RouterLink}
            href={paths.universe.view(customerId)}
            underline="none"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              color: 'text.secondary',
              typography: 'body2',
            }}
          >
            <Iconify icon="solar:alt-arrow-left-outline" />
            Back
          </Link>

          <Stack spacing={1}>
            <Typography variant="h2">Shared Collections</Typography>
            <Typography variant="body2" color="text.secondary">
              {sharedCollections.length} collection{sharedCollections.length === 1 ? '' : 's'} available
            </Typography>
          </Stack>

          {collectionsLoading ? (
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ py: 8 }}>
              <CircularProgress size={24} />
              <Typography color="text.secondary">Loading shared collections...</Typography>
            </Stack>
          ) : sharedCollections.length === 0 ? (
            <Typography color="text.secondary">No shared collections found.</Typography>
          ) : (
            <Grid container spacing={2}>
              {sharedCollections.map((collection) => (
                <UniverseCollectionListCard
                  key={collection.id}
                  customerId={customerId}
                  collection={collection}
                />
              ))}
            </Grid>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
