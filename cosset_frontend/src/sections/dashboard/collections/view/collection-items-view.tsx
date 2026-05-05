'use client';

import type { Slide } from 'yet-another-react-lightbox';
import type { ICollectionDrawerItem } from 'src/types/collection-item';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import useTheme from '@mui/material/styles/useTheme';
import useMediaQuery from '@mui/material/useMediaQuery';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useSetState } from 'src/hooks/use-set-state';

import { useAuthContext } from 'src/auth/hooks';

import { useGetCollection } from 'src/actions/collection';

import { orderBy } from 'src/utils/helper';
import axiosInstance, { endpoints } from 'src/utils/axios';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import {
  deleteCollectionItem,
  updateCollectionItem,
  useGetCollectionItems,
} from 'src/actions/collection-item';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { Lightbox } from 'src/components/dashboard/lightbox';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { CollectionItemsSort } from '../collection-items-sort';
import { CollectionItemsSearch } from '../collection-items-search';

type BreadcrumbLink = { name: string; href?: string };

type Props = {
  collectionId: string | number;
  /** Override the page heading */
  heading?: string;
  /** Override breadcrumb links */
  breadcrumbLinks?: BreadcrumbLink[];
  /** Override the back button href */
  backHref?: string;
  /** Override the back button label */
  backLabel?: string;
  /** Override the new-item href */
  newItemHref?: string;
  /** Override the new-item button text */
  newItemLabel?: string;
  /** Override the edit-item base href (e.g. /dashboard/drawer/letter) */
  editItemBaseHref?: string;
  /** Show back-to-list button in header */
  showBackButton?: boolean;
  /** Show move up/down actions */
  showReorderControls?: boolean;
};

const COLLECTION_ITEM_SORT_OPTIONS = [
  { label: 'Order', value: 'order' },
  { label: 'Latest', value: 'latest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Title (A-Z)', value: 'title' },
  { label: 'Title (Z-A)', value: 'title-desc' },
];

const formatDate = (value: unknown) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
};

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const parseStorageKeys = (value?: string | null): string[] => {
  const raw = (value || '').trim();
  if (!raw) {
    return [];
  }

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || '').trim())
          .filter((item) => !!item);
      }
    } catch (error) {
      // Fallback to line/comma parsing below.
    }
  }

  return raw
    .split(/[\r\n,]+/)
    .map((item) => item.trim())
    .filter((item) => !!item);
};

const getVideoMimeType = (value: string) => {
  const normalized = value.toLowerCase().split('?')[0].split('#')[0];

  if (normalized.endsWith('.mov')) {
    return 'video/quicktime';
  }

  if (normalized.endsWith('.webm')) {
    return 'video/webm';
  }

  return 'video/mp4';
};

export function CollectionItemsView({
  collectionId,
  heading,
  breadcrumbLinks,
  backHref,
  backLabel,
  newItemHref,
  newItemLabel,
  editItemBaseHref,
  showBackButton = true,
  showReorderControls = true,
}: Props) {
  const { user } = useAuthContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const numericCollectionId = useMemo(() => Number.parseInt(String(collectionId), 10), [collectionId]);
  const ownerCustomerId = user?.id ? String(user.id) : '';
  const scopedCollectionId = useMemo(
    () => (Number.isNaN(numericCollectionId) || !ownerCustomerId ? '' : numericCollectionId),
    [numericCollectionId, ownerCustomerId],
  );

  const [sortBy, setSortBy] = useState('order');
  const [signedUrlMap, setSignedUrlMap] = useState<Record<string, string>>({});
  const [lightboxSlides, setLightboxSlides] = useState<Slide[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [movingItemId, setMovingItemId] = useState<number | null>(null);

  const { collection, collectionLoading } = useGetCollection(
    Number.isNaN(numericCollectionId) ? '' : numericCollectionId,
  );

  const { collectionItems, collectionItemsLoading } = useGetCollectionItems(
    scopedCollectionId,
    ownerCustomerId,
  );

  const search = useSetState<{
    query: string;
    results: ICollectionDrawerItem[];
  }>({ query: '', results: [] });

  const hasSearchQuery = Boolean(search.state.query.trim());

  const dataFiltered = useMemo(
    () =>
      applyFilter({
        inputData: hasSearchQuery ? search.state.results : collectionItems,
        sortBy,
      }),
    [collectionItems, hasSearchQuery, search.state.results, sortBy],
  );

  const reorderEntries = useMemo(() => {
    const orderedItems = applyFilter({ inputData: collectionItems, sortBy: 'order' });

    let cursor = 0;

    return orderedItems.map((item) => {
      const rawOrder =
        typeof item.order === 'number' && Number.isFinite(item.order)
          ? Math.trunc(item.order)
          : null;

      const resolvedOrder = rawOrder !== null && rawOrder > cursor ? rawOrder : cursor + 1;
      cursor = resolvedOrder;

      return {
        item,
        resolvedOrder,
      };
    });
  }, [collectionItems]);

  const reorderIndexById = useMemo(() => {
    const indexMap = new Map<string, number>();

    reorderEntries.forEach((entry, index) => {
      indexMap.set(String(entry.item.id), index);
    });

    return indexMap;
  }, [reorderEntries]);

  const handleSortBy = useCallback((newValue: string) => {
    setSortBy(newValue);
  }, []);

  const handleSearch = useCallback(
    (inputValue: string) => {
      search.setState({ query: inputValue });

      const normalizedQuery = inputValue.trim().toLowerCase();

      if (normalizedQuery) {
        const results = collectionItems.filter((item) => {
          const title = (item.title || '').toLowerCase();
          const description = (item.description || '').toLowerCase();
          const category = String(item.category ?? '').toLowerCase();
          const visibility = item.isPublic === 1 ? 'public' : item.isPublic === 0 ? 'private' : '';
          const dateValue = item.date ? new Date(item.date).toISOString().slice(0, 10) : '';

          return (
            title.includes(normalizedQuery) ||
            description.includes(normalizedQuery) ||
            category.includes(normalizedQuery) ||
            visibility.includes(normalizedQuery) ||
            dateValue.includes(normalizedQuery)
          );
        });

        search.setState({ results });
      } else {
        search.setState({ results: [] });
      }
    },
    [collectionItems, search],
  );

  const allAttachmentKeys = useMemo(() => {
    const keys: string[] = [];

    collectionItems.forEach((item) => {
      keys.push(...parseStorageKeys(item.images));
      keys.push(...parseStorageKeys(item.videos));
      keys.push(...parseStorageKeys(item.files));
    });

    return Array.from(new Set(keys));
  }, [collectionItems]);

  useEffect(() => {
    let mounted = true;

    const unresolvedKeys = allAttachmentKeys.filter((key) => !!key && !signedUrlMap[key]);

    if (unresolvedKeys.length) {
      const loadSignedUrls = async () => {
        const results = await Promise.all(
          unresolvedKeys.map(async (key) => {
            if (isAbsoluteUrl(key)) {
              return { key, url: key };
            }

            try {
              const res = await axiosInstance.get(endpoints.upload.image, { params: { key } });
              return { key, url: (res.data?.url as string) || '' };
            } catch (error) {
              return { key, url: '' };
            }
          }),
        );

        if (!mounted) {
          return;
        }

        setSignedUrlMap((prev) => {
          const next = { ...prev };

          results.forEach(({ key, url }) => {
            if (url) {
              next[key] = url;
            }
          });

          return next;
        });
      };

      loadSignedUrls();
    }

    return () => {
      mounted = false;
    };
  }, [allAttachmentKeys, signedUrlMap]);

  const buildLightboxSlides = useCallback(
    (imageKeys: string[], videoKeys: string[]) => {
      const imageSlides: Slide[] = imageKeys
        .map((key) => signedUrlMap[key])
        .filter((url): url is string => !!url)
        .map((url) => ({ src: url }));

      const videoSlides: Slide[] = videoKeys
        .map((key) => ({ key, url: signedUrlMap[key] }))
        .filter((item): item is { key: string; url: string } => !!item.url)
        .map(({ key, url }) => ({
          type: 'video',
          width: 1280,
          height: 720,
          poster: url,
          sources: [{ src: url, type: getVideoMimeType(key) }],
        }));

      return [...imageSlides, ...videoSlides];
    },
    [signedUrlMap],
  );

  const handleOpenLightbox = useCallback((slides: Slide[], index: number) => {
    if (!slides.length) {
      return;
    }

    setLightboxSlides(slides);
    setLightboxIndex(index);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxIndex(-1);
  }, []);

  const handleDelete = useCallback(
    async (item: ICollectionDrawerItem) => {
      const confirmed = window.confirm(`Delete item "${item.title || item.id}"?`);
      if (!confirmed) {
        return;
      }

      try {
        await deleteCollectionItem(item.id, item.collectionId, item.customerId || user?.id);
        toast.success('Collection item deleted successfully.');
      } catch (error) {
        console.error('Failed to delete collection item:', error);
        toast.error('Failed to delete collection item.');
      }
    },
    [user?.id],
  );

  const handleMoveOrder = useCallback(
    async (item: ICollectionDrawerItem, direction: 'up' | 'down') => {
      const currentIndex = reorderIndexById.get(String(item.id));

      if (currentIndex === undefined) {
        return;
      }

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= reorderEntries.length) {
        return;
      }

      const currentEntry = reorderEntries[currentIndex];
      const targetEntry = reorderEntries[targetIndex];

      try {
        setMovingItemId(item.id);

        await Promise.all([
          updateCollectionItem(currentEntry.item.id, { order: targetEntry.resolvedOrder }),
          updateCollectionItem(targetEntry.item.id, { order: currentEntry.resolvedOrder }),
        ]);

        toast.success(`Moved "${item.title || `Item #${item.id}`}" ${direction}.`);
      } catch (error) {
        console.error('Failed to update item order:', error);
        toast.error('Failed to change item order.');
      } finally {
        setMovingItemId(null);
      }
    },
    [reorderEntries, reorderIndexById],
  );

  const renderItemAttachmentLinks = useCallback(
    (item: ICollectionDrawerItem) => {
      const imageKeys = parseStorageKeys(item.images);
      const videoKeys = parseStorageKeys(item.videos);
      const pdfKeys = parseStorageKeys(item.files);

      if (!imageKeys.length && !videoKeys.length && !pdfKeys.length) {
        return '-';
      }

      const imageUrl = imageKeys.length ? signedUrlMap[imageKeys[0]] : '';
      const videoUrl = videoKeys.length ? signedUrlMap[videoKeys[0]] : '';
      const pdfUrl = pdfKeys.length ? signedUrlMap[pdfKeys[0]] : '';
      const mediaSlides = buildLightboxSlides(imageKeys, videoKeys);
      const resolvedImageCount = imageKeys.filter((key) => !!signedUrlMap[key]).length;

      return (
        <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
          {imageKeys.length > 0 && (
            imageUrl ? (
              <Button
                onClick={() => handleOpenLightbox(mediaSlides, 0)}
                size="small"
                variant="text"
                disabled={!mediaSlides.length}
                sx={{ minWidth: 0, p: 0, justifyContent: 'flex-start' }}
              >
                Image ({imageKeys.length})
              </Button>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Image ({imageKeys.length}) loading...
              </Typography>
            )
          )}

          {videoKeys.length > 0 && (
            videoUrl ? (
              <Button
                onClick={() => handleOpenLightbox(mediaSlides, resolvedImageCount)}
                size="small"
                variant="text"
                disabled={!mediaSlides.length}
                sx={{ minWidth: 0, p: 0, justifyContent: 'flex-start' }}
              >
                Video ({videoKeys.length})
              </Button>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Video ({videoKeys.length}) loading...
              </Typography>
            )
          )}

          {pdfKeys.length > 0 && (
            pdfUrl ? (
              <Button
                component="a"
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                variant="text"
                sx={{ minWidth: 0, p: 0, justifyContent: 'flex-start' }}
              >
                PDF ({pdfKeys.length})
              </Button>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                PDF ({pdfKeys.length}) loading...
              </Typography>
            )
          )}
        </Stack>
      );
    },
    [buildLightboxSlides, handleOpenLightbox, signedUrlMap],
  );

  if (Number.isNaN(numericCollectionId)) {
    return (
      <DashboardContent>
        <Alert severity="error">Invalid collection id.</Alert>
      </DashboardContent>
    );
  }

  const emptyListTitle = collectionItems.length === 0
    ? 'No collection items yet'
    : hasSearchQuery
      ? `No results for "${search.state.query.trim()}"`
      : 'No collection items yet';

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={heading ?? (collection?.name ? `${collection.name} - Items` : 'Collection Items')}
        links={breadcrumbLinks ?? [
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Collections', href: paths.dashboard.collections.root },
          { name: 'Manage', href: paths.dashboard.collections.manage },
          { name: 'Items' },
        ]}
        action={
          isMobile ? (
            <Stack direction="row" spacing={1} sx={{ width: 1, justifyContent: 'flex-end' }}>
              {showBackButton && (
                <IconButton
                  component={RouterLink}
                  href={backHref ?? paths.dashboard.collections.manage}
                  aria-label={backLabel ?? 'Back to Manage Collections'}
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 1.2 }}
                >
                  <Iconify icon="solar:arrow-left-outline" width={20} />
                </IconButton>
              )}

              <IconButton
                component={RouterLink}
                href={newItemHref ?? paths.dashboard.collections.newItem(numericCollectionId)}
                aria-label={newItemLabel ?? 'New Item'}
                sx={{
                  borderRadius: 1.2,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                <Iconify icon="solar:add-circle-outline" width={20} />
              </IconButton>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1.5}>
              {showBackButton && (
                <Button
                  component={RouterLink}
                  href={backHref ?? paths.dashboard.collections.manage}
                  variant="outlined"
                  startIcon={<Iconify icon="solar:arrow-left-outline" width={18} />}
                >
                  {backLabel ?? 'Back to Manage Collections'}
                </Button>
              )}
              <Button
                component={RouterLink}
                href={newItemHref ?? paths.dashboard.collections.newItem(numericCollectionId)}
                variant="contained"
                startIcon={<Iconify icon="solar:add-circle-outline" width={18} />}
              >
                {newItemLabel ?? 'New Item'}
              </Button>
            </Stack>
          )
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <Alert severity="info">
          Managing items for 
          {collectionLoading ? '' : collection?.name ? <strong> {collection.name} </strong> : ''}
        </Alert>

        <Stack
          spacing={3}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          direction={{ xs: 'column', sm: 'row' }}
        >
          <CollectionItemsSearch
            search={search}
            onSearch={handleSearch}
            placeholder="Search collection items..."
            onSelect={(option) => {
              search.setState({ query: option.title || '' });
            }}
          />

          <CollectionItemsSort
            sort={sortBy}
            onSort={handleSortBy}
            sortOptions={COLLECTION_ITEM_SORT_OPTIONS}
          />
        </Stack>

        <Card sx={{ p: 0 }}>
          {collectionItemsLoading ? (
            <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : dataFiltered.length === 0 ? (
            <EmptyContent title={emptyListTitle} filled sx={{ py: 8 }} />
          ) : isMobile ? (
            <Stack spacing={1.5} sx={{ p: 1.5 }}>
              {dataFiltered.map((item) => (
                <Card key={item.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Typography variant="subtitle1" sx={{ minWidth: 0 }}>
                        {item.title || '-'}
                      </Typography>
                      {item.isPublic == null ? null : (
                        <Chip
                          label={item.isPublic === 1 ? 'Public' : 'Private'}
                          size="small"
                          color={item.isPublic === 1 ? 'success' : 'default'}
                        />
                      )}
                    </Stack>

                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {item.description || '-'}
                    </Typography>

                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                      <Chip size="small" variant="outlined" label={`Order: ${item.order ?? '-'}`} />
                      <Chip size="small" variant="outlined" label={`Date: ${formatDate(item.date)}`} />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Updated: ${formatDate(item.updatedAt)}`}
                      />
                    </Stack>

                    <Stack spacing={0.5}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Attachments
                      </Typography>
                      {renderItemAttachmentLinks(item)}
                    </Stack>

                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {showReorderControls && (
                        <IconButton
                          size="small"
                          onClick={() => handleMoveOrder(item, 'up')}
                          disabled={
                            movingItemId !== null
                            || reorderIndexById.get(String(item.id)) === undefined
                            || reorderIndexById.get(String(item.id)) === 0
                          }
                          aria-label={`Move item ${item.title || item.id} up`}
                        >
                          <Iconify icon="eva:arrow-upward-fill" width={18} />
                        </IconButton>
                      )}
                      {showReorderControls && (
                        <IconButton
                          size="small"
                          onClick={() => handleMoveOrder(item, 'down')}
                          disabled={
                            movingItemId !== null
                            || reorderIndexById.get(String(item.id)) === undefined
                            || reorderIndexById.get(String(item.id)) === reorderEntries.length - 1
                          }
                          aria-label={`Move item ${item.title || item.id} down`}
                        >
                          <Iconify icon="eva:arrow-downward-fill" width={18} />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        component={RouterLink}
                        href={editItemBaseHref
                          ? `${editItemBaseHref}/${item.id}/edit`
                          : paths.dashboard.collections.editItem(numericCollectionId, item.id)}
                        aria-label={`Edit item ${item.title || item.id}`}
                      >
                        <Iconify icon="solar:pen-2-outline" width={18} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(item)}
                        aria-label={`Delete item ${item.title || item.id}`}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </Stack>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 960 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Order</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Public</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Attachments</TableCell>
                    <TableCell>Updated At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dataFiltered.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant="subtitle1">{item.title || '-'}</Typography>
                          {/* <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Item #{item.id}
                          </Typography> */}
                        </Stack>
                      </TableCell>
                      <TableCell>{item.order ?? '-'}</TableCell>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell>
                        {item.isPublic == null ? (
                          '-'
                        ) : (
                          <Chip
                            label={item.isPublic === 1 ? 'Public' : 'Private'}
                            size="small"
                            color={item.isPublic === 1 ? 'success' : 'default'}
                          />
                        )}
                      </TableCell>
                      <TableCell>{formatDate(item.date)}</TableCell>
                      <TableCell>{renderItemAttachmentLinks(item)}</TableCell>
                      <TableCell>{formatDate(item.updatedAt)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {showReorderControls && (
                            <IconButton
                              size="small"
                              onClick={() => handleMoveOrder(item, 'up')}
                              disabled={
                                movingItemId !== null
                                || reorderIndexById.get(String(item.id)) === undefined
                                || reorderIndexById.get(String(item.id)) === 0
                              }
                              aria-label={`Move item ${item.title || item.id} up`}
                            >
                              <Iconify icon="eva:arrow-upward-fill" width={18} />
                            </IconButton>
                          )}
                          {showReorderControls && (
                            <IconButton
                              size="small"
                              onClick={() => handleMoveOrder(item, 'down')}
                              disabled={
                                movingItemId !== null
                                || reorderIndexById.get(String(item.id)) === undefined
                                || reorderIndexById.get(String(item.id)) === reorderEntries.length - 1
                              }
                              aria-label={`Move item ${item.title || item.id} down`}
                            >
                              <Iconify icon="eva:arrow-downward-fill" width={18} />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            component={RouterLink}
                            href={editItemBaseHref
                              ? `${editItemBaseHref}/${item.id}/edit`
                              : paths.dashboard.collections.editItem(
                              numericCollectionId,
                              item.id,
                            )}
                            aria-label={`Edit item ${item.title || item.id}`}
                          >
                            <Iconify icon="solar:pen-2-outline" width={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(item)}
                            aria-label={`Delete item ${item.title || item.id}`}
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Stack>

      <Lightbox
        slides={lightboxSlides}
        open={lightboxIndex >= 0}
        close={handleCloseLightbox}
        index={lightboxIndex}
      />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  sortBy: string;
  inputData: ICollectionDrawerItem[];
};

const getItemDateTime = (value: unknown) => {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value as string | number | Date).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const applyFilter = ({ inputData, sortBy }: ApplyFilterProps) => {
  if (sortBy === 'order') {
    return [...inputData].sort((a, b) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      const aTime = getItemDateTime(a.date);
      const bTime = getItemDateTime(b.date);

      if (aTime !== bTime) {
        return bTime - aTime;
      }

      return (b.id || 0) - (a.id || 0);
    });
  }

  if (sortBy === 'latest') {
    return [...inputData].sort((a, b) => {
      const aTime = getItemDateTime(a.date);
      const bTime = getItemDateTime(b.date);

      if (aTime !== bTime) {
        return bTime - aTime;
      }

      return (b.id || 0) - (a.id || 0);
    });
  }

  if (sortBy === 'oldest') {
    return [...inputData].sort((a, b) => {
      const aTime = getItemDateTime(a.date);
      const bTime = getItemDateTime(b.date);

      if (aTime !== bTime) {
        return aTime - bTime;
      }

      return (a.id || 0) - (b.id || 0);
    });
  }

  if (sortBy === 'title') {
    return orderBy(inputData, ['title'], ['asc']);
  }

  if (sortBy === 'title-desc') {
    return orderBy(inputData, ['title'], ['desc']);
  }

  return inputData;
};
