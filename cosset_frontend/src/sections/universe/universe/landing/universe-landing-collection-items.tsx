import type { BoxProps } from '@mui/material/Box';
import type { ICollectionItem } from 'src/types/collection';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { useGetCollectionItems, useGetViewedCollectionItemIds } from 'src/actions/collection-item';

import { Label } from 'src/components/universe/label';
import { Iconify } from 'src/components/universe/iconify';

import {
  MySpaceSectionTitle,
} from './myspace-section-title';
import { useDesignSpaceTheme } from './design-space-theme-context';
import { myspaceItemCardSx, myspaceItemGridSx } from './myspace-item-layout';

// ----------------------------------------------------------------------

type Props = BoxProps & {
  customerId: string;
  collections: ICollectionItem[];
  viewAllHref?: string;
};

const COLLECTION_CARD_THEMES = [
  { icon: 'solar:widget-4-bold', iconColor: '#8E33FF', iconBg: '#EFD6FF' },
  { icon: 'solar:book-2-bold', iconColor: '#8D6E63', iconBg: '#F5F0E8' },
  { icon: 'solar:camera-bold', iconColor: '#42A5F5', iconBg: '#E3F2FD' },
  { icon: 'solar:star-bold', iconColor: '#E57373', iconBg: '#FCE4EC' },
] as const;

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

const getCollectionTheme = (collectionId: number) =>
  COLLECTION_CARD_THEMES[collectionId % COLLECTION_CARD_THEMES.length];

type CollectionCardProps = {
  customerId: string;
  collection: ICollectionItem;
  viewedItemIdSet: Set<string>;
  viewedItemIdsLoading: boolean;
};

function UniverseCollectionItemsCard({
  customerId,
  collection,
  viewedItemIdSet,
  viewedItemIdsLoading,
}: CollectionCardProps) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const { collectionItems, collectionItemsLoading } = useGetCollectionItems(collection.id, customerId);
  const collectionItemsHref = paths.universe.collectionItems(customerId, collection.id);
  const theme = getCollectionTheme(collection.id);

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
  const collectionName = collection.name || `Collection #${collection.id}`;

  const cardSx = {
    height: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 2,
    overflow: 'hidden',
    bgcolor: spaceTheme.surfaceBg,
    border: `1px solid ${spaceTheme.border}`,
    boxShadow: spaceTheme.isDark
      ? '0 2px 10px rgba(0, 0, 0, 0.22)'
      : '0 2px 10px rgba(60, 45, 30, 0.05)',
    transition: (muiTheme: import('@mui/material/styles').Theme) =>
      muiTheme.transitions.create(['box-shadow', 'transform'], {
        duration: muiTheme.transitions.duration.shorter,
      }),
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 20px rgba(60, 45, 30, 0.08)',
    },
  };

  return (
    <Card sx={cardSx}>
      <Stack spacing={1.5} sx={{ p: 2, width: 1, height: 1, flex: 1 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              bgcolor: theme.iconBg,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Iconify icon={theme.icon} width={22} sx={{ color: theme.iconColor }} />
          </Box>

          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              noWrap
              sx={{ color: spaceTheme.textPrimary }}
            >
              {collectionName}
            </Typography>

            {isStatsLoading ? (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Iconify icon="solar:refresh-outline" width={14} sx={{ color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Loading collection info...
                </Typography>
              </Stack>
            ) : (
              <>
                <Typography variant="caption" color="text.secondary">
                  {publicItems.length} item{publicItems.length === 1 ? '' : 's'}
                </Typography>

                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Iconify icon="eva:eye-fill" width={14} sx={{ color: 'success.main' }} />
                    <Typography variant="caption" color="text.secondary">
                      {viewedCount} viewed
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Iconify icon="eva:eye-off-fill" width={14} sx={{ color: 'warning.main' }} />
                    <Typography variant="caption" color="text.secondary">
                      {unreadCount} unread
                    </Typography>
                  </Stack>
                </Stack>
              </>
            )}
          </Stack>
        </Stack>

        {!isStatsLoading && publicItems.length === 0 ? (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Iconify icon="solar:forbidden-circle-linear" width={14} sx={{ color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              No public items in this collection.
            </Typography>
          </Stack>
        ) : null}

        {!isStatsLoading && previewItems.length > 0 ? (
          <Stack spacing={0.75} sx={{ flex: 1 }}>
            {previewItems.map((item) => {
              const isViewed = viewedItemIdSet.has(String(item.id));

              return (
                <Box
                  key={item.id}
                  sx={(muiTheme) => ({
                    p: 1,
                    borderRadius: 1,
                    border: '1px dashed',
                    borderColor: isViewed
                      ? alpha(muiTheme.palette.success.main, 0.6)
                      : alpha(muiTheme.palette.warning.main, 0.65),
                    bgcolor: isViewed
                      ? alpha(muiTheme.palette.success.main, 0.08)
                      : alpha(muiTheme.palette.warning.main, 0.1),
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
        ) : null}

        <Button
          component={RouterLink}
          href={collectionItemsHref}
          target="_blank"
          rel="noopener noreferrer"
          size="small"
          variant="outlined"
          fullWidth
          sx={{
            mt: 'auto',
            borderRadius: 99,
            borderColor: spaceTheme.accent,
            color: spaceTheme.accent,
            fontWeight: 600,
            '&:hover': {
              borderColor: spaceTheme.accentHover,
              bgcolor: spaceTheme.accentSoft,
            },
          }}
        >
          View items
        </Button>
      </Stack>
    </Card>
  );
}

export function UniverseLandingCollectionItems({
  customerId,
  collections,
  viewAllHref,
  sx,
  ...other
}: Props) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const { viewedCollectionItemIds, viewedCollectionItemIdsLoading } = useGetViewedCollectionItemIds(customerId);

  const viewedItemIdSet = useMemo(
    () => new Set(viewedCollectionItemIds.map(String)),
    [viewedCollectionItemIds],
  );

  return (
    <Box
      id="collection-items-section"
      component="section"
      sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, ...sx }}
      {...other}
    >
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'flex-end' }}
          justifyContent="space-between"
        >
          <Stack spacing={1} sx={{ maxWidth: 520 }}>
            <MySpaceSectionTitle
              title="COLLECTIONS"
              subtitle="Curated highlights from shared collections."
              itemCount={collections.length}
            />
          </Stack>

          {viewAllHref ? (
            <Typography
              component={RouterLink}
              href={viewAllHref}
              variant="body2"
              sx={{
                color: 'text.secondary',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                whiteSpace: 'nowrap',
                '&:hover': { color: spaceTheme.accent },
              }}
            >
              View all
              <Iconify icon="eva:arrow-ios-forward-fill" width={14} />
            </Typography>
          ) : null}
        </Stack>

        {collections.length === 0 ? (
          <Typography color="text.secondary">No shared collections found.</Typography>
        ) : (
          <Box sx={myspaceItemGridSx}>
            {collections.map((collection) => (
              <Box key={collection.id} sx={myspaceItemCardSx}>
                <UniverseCollectionItemsCard
                  customerId={customerId}
                  collection={collection}
                  viewedItemIdSet={viewedItemIdSet}
                  viewedItemIdsLoading={viewedCollectionItemIdsLoading}
                />
              </Box>
            ))}
          </Box>
        )}
      </Stack>
    </Box>
  );
}
