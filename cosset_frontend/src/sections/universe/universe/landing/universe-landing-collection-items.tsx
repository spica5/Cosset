import type { BoxProps } from '@mui/material/Box';
import type { ICollectionItem } from 'src/types/collection';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import { alpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useGetCollectionItems, useGetViewedCollectionItemIds } from 'src/actions/collection-item';

import { Label } from 'src/components/universe/label';
import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

type Props = BoxProps & {
  customerId: string;
  collections: ICollectionItem[];
};

const SECTION_TITLE_FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

type CollectionCardProps = {
  customerId: string;
  collection: ICollectionItem;
  viewedItemIdSet: Set<string>;
  viewedItemIdsLoading: boolean;
  onStatsChange?: (collectionId: number, stats: { unreadCount: number; viewedCount: number }) => void;
};

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

function UniverseCollectionItemsCard({
  customerId,
  collection,
  viewedItemIdSet,
  viewedItemIdsLoading,
  onStatsChange,
}: CollectionCardProps) {
  const { collectionItems, collectionItemsLoading } = useGetCollectionItems(collection.id, customerId);
  const collectionItemsHref = paths.universe.collectionItems(customerId, collection.id);

  const publicItems = useMemo(
    () => collectionItems.filter((item) => item.isPublic === 1),
    [collectionItems],
  );

  const previewItems = publicItems.slice(0, 3);
  const viewedCount = useMemo(
    () => publicItems.filter((item) => viewedItemIdSet.has(String(item.id))).length,
    [publicItems, viewedItemIdSet],
  );
  const unreadCount = Math.max(0, publicItems.length - viewedCount);
  const isStatsLoading = collectionItemsLoading || viewedItemIdsLoading;

  useEffect(() => {
    onStatsChange?.(collection.id, { unreadCount, viewedCount });
  }, [collection.id, onStatsChange, unreadCount, viewedCount]);

  return (
    <Grid item xs={12} sm={6} md={4}>
      <Card
        onClick={() => window.open(collectionItemsHref, '_blank', 'noopener,noreferrer')}
        sx={{
          height: 1,
          textDecoration: 'none',
          color: 'inherit',
          border: '1px solid',
          borderColor: 'divider',
          cursor: 'pointer',
          transition: (theme) =>
            theme.transitions.create(['transform', 'box-shadow', 'border-color'], {
              duration: theme.transitions.duration.shorter,
            }),
          '&:hover': {
            transform: 'translateY(-2px)',
            borderColor: 'primary.main',
            boxShadow: (theme) => theme.shadows[8],
          },
        }}
      >
        <CardContent>
          <Stack spacing={1}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Iconify icon="solar:folder-with-files-bold" width={16} sx={{ color: 'primary.main' }} />
                <Typography variant="h6" noWrap>
                  {collection.name || `Collection #${collection.id}`}
                </Typography>
              </Stack>
            </Stack>

            {isStatsLoading ? (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Iconify icon="solar:refresh-outline" width={14} sx={{ color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Loading collection info...
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1.25} alignItems="center" useFlexGap flexWrap="wrap">
                  <Stack direction="row" spacing={0.75} alignItems="center">
                      <Iconify icon="eva:layers-fill" width={16} sx={{ color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                      {publicItems.length} item{publicItems.length === 1 ? '' : 's'}
                    </Typography>
                  </Stack>        

                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Iconify icon="eva:eye-fill" width={14} sx={{ color: 'success.main' }} />
                    <Typography variant="caption" color="success.dark">
                      {viewedCount} viewed
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Iconify icon="eva:eye-off-fill" width={14} sx={{ color: 'warning.main' }} />
                    <Typography variant="caption" color="warning.dark">
                      {unreadCount} unread
                    </Typography>
                  </Stack>

                   
                </Stack>
              </Stack>
            )}

            {!isStatsLoading && publicItems.length === 0 && (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Iconify icon="solar:forbidden-circle-linear" width={14} sx={{ color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  No public items in this collection.
                </Typography>
              </Stack>
            )}

            {!isStatsLoading && previewItems.length > 0 && (
              <Stack spacing={0.75}>
                {previewItems.map((item) => {
                  const isViewed = viewedItemIdSet.has(String(item.id));

                  return (
                    <Box
                      key={item.id}
                      sx={(theme) => ({
                        p: 1,
                        borderRadius: 1,
                        border: '1px dashed',
                        borderColor: isViewed
                          ? alpha(theme.palette.success.main, 0.6)
                          : alpha(theme.palette.warning.main, 0.65),
                        bgcolor: isViewed
                          ? alpha(theme.palette.success.main, 0.08)
                          : alpha(theme.palette.warning.main, 0.1),
                      })}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                          <Iconify
                            icon="solar:bookmark-square-minimalistic-bold"
                            width={14}
                            sx={{ color: isViewed ? 'success.main' : 'warning.main' }}
                          />
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ color: isViewed ? 'success.dark' : 'warning.dark', fontWeight: 500 }}
                          >
                            {(item.title || '').trim() || `Item #${item.id}`}
                          </Typography>
                        </Stack>

                        <Label
                          color={isViewed ? 'success' : 'warning'}
                          variant="soft"
                          title={isViewed ? 'Viewed' : 'Unread'}
                          sx={{
                            minWidth: 26,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Iconify icon={isViewed ? 'eva:eye-fill' : 'eva:eye-off-fill'} width={16} />
                        </Label>
                      </Stack>

                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Iconify icon="eva:calendar-outline" width={14} sx={{ color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(item.date || item.updatedAt)}
                        </Typography>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
}

export function UniverseLandingCollectionItems({
  customerId,
  collections,
  sx,
  ...other
}: Props) {
  const { viewedCollectionItemIds, viewedCollectionItemIdsLoading } = useGetViewedCollectionItemIds(customerId);
  const [collectionStatsMap, setCollectionStatsMap] = useState<
    Record<number, { unreadCount: number; viewedCount: number }>
  >({});

  const viewedItemIdSet = useMemo(
    () => new Set(viewedCollectionItemIds.map(String)),
    [viewedCollectionItemIds],
  );

  const handleCardStatsChange = useCallback((
    collectionId: number,
    stats: { unreadCount: number; viewedCount: number },
  ) => {
    setCollectionStatsMap((prev) => {
      const previous = prev[collectionId];

      if (
        previous?.unreadCount === stats.unreadCount &&
        previous?.viewedCount === stats.viewedCount
      ) {
        return prev;
      }

      return {
        ...prev,
        [collectionId]: stats,
      };
    });
  }, []);

  useEffect(() => {
    setCollectionStatsMap((prev) => {
      const activeIds = new Set(collections.map((collection) => String(collection.id)));
      const nextEntries = Object.entries(prev).filter(([collectionId]) => activeIds.has(collectionId));

      if (nextEntries.length === Object.keys(prev).length) {
        return prev;
      }

      return Object.fromEntries(nextEntries) as Record<
        number,
        { unreadCount: number; viewedCount: number }
      >;
    });
  }, [collections]);

  const totalUnreadCollectionItems = useMemo(
    () =>
      collections.reduce(
        (sum, collection) => sum + (collectionStatsMap[collection.id]?.unreadCount ?? 0),
        0,
      ),
    [collectionStatsMap, collections],
  );

  const totalViewedCollectionItems = useMemo(
    () =>
      collections.reduce(
        (sum, collection) => sum + (collectionStatsMap[collection.id]?.viewedCount ?? 0),
        0,
      ),
    [collectionStatsMap, collections],
  );

  const badgeCount = totalUnreadCollectionItems > 0
    ? totalUnreadCollectionItems
    : totalViewedCollectionItems;

  return (
    <Card
      id="collection-items-section"
      component="section"
      sx={{ pb: 4, overflow: 'hidden', pt: { xs: 3, md: 6 }, ...sx }}
      {...other}
    >
      <Container>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="flex-start"
        >
          <Stack spacing={0.75} sx={{ textAlign: { xs: 'left', md: 'unset' } }}>
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{
                px: 1.5,
                py: 0.8,
                borderRadius: 99,
                border: '1px solid rgba(112, 88, 210, 0.33)',
                background: 'linear-gradient(90deg, rgba(112, 88, 210, 0.16), rgba(112, 88, 210, 0.06))',
                boxShadow: '0 8px 18px rgba(112, 88, 210, 0.14)',
                width: 'fit-content',
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px solid rgba(112, 88, 210, 0.35)',
                  bgcolor: 'rgba(255,255,255,0.35)',
                }}
              >
                <Iconify icon="solar:widget-4-bold" width={24} sx={{ color: 'primary.main' }} />
              </Box>

              <Typography
                variant="h2"
                sx={{
                  fontFamily: SECTION_TITLE_FONT,
                  fontWeight: 800,
                  letterSpacing: '0.01em',
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    lineHeight: 1,
                  }}
                >
                  Collections
                  <Label
                    color={totalUnreadCollectionItems > 0 ? 'error' : 'success'}
                    variant="filled"
                    sx={{
                      top: 0,
                      left: '100%',
                      px: 0.5,
                      height: 24,
                      position: 'absolute',
                      transform: 'translate(-10%, -45%)',
                      borderRadius: '50%',
                    }}
                  >
                    {badgeCount}
                  </Label>
                </Box>
              </Typography>
            </Stack>

            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontFamily: SECTION_TITLE_FONT, letterSpacing: '0.01em' }}
            >
              Curated highlights from shared collections
            </Typography>
          </Stack>
        </Stack>

        <Box sx={{ py: { xs: 4, md: 6 } }}>
          {collections.length === 0 ? (
            <Typography color="text.secondary">No shared collections found.</Typography>
          ) : (
            <Grid container spacing={2}>
              {collections.map((collection) => (
                <UniverseCollectionItemsCard
                  key={collection.id}
                  customerId={customerId}
                  collection={collection}
                  viewedItemIdSet={viewedItemIdSet}
                  viewedItemIdsLoading={viewedCollectionItemIdsLoading}
                  onStatsChange={handleCardStatsChange}
                />
              ))}
            </Grid>
          )}
        </Box>
      </Container>
    </Card>
  );
}
