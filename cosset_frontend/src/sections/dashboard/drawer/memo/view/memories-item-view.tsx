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

import { CollectionItemsSort } from '../../../collections/collection-items-sort';
import { CollectionItemsSearch } from '../../../collections/collection-items-search';

// ----------------------------------------------------------------------

const SORT_OPTIONS = [
  { label: 'Order', value: 'order' },
  { label: 'Latest', value: 'latest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Title (A-Z)', value: 'title' },
  { label: 'Title (Z-A)', value: 'title-desc' },
];

const MEMO_META: Record<1 | 2, { heading: string; newHref: string; editHref: (id: string | number) => string }> = {
  1: {
    heading: 'Good Memories',
    newHref: paths.dashboard.drawer.goodMemo.new,
    editHref: (id) => paths.dashboard.drawer.goodMemo.edit(id),
  },
  2: {
    heading: 'Sad Memories',
    newHref: paths.dashboard.drawer.sadMemo.new,
    editHref: (id) => paths.dashboard.drawer.sadMemo.edit(id),
  },
};

// ----------------------------------------------------------------------

const formatDate = (value: unknown) => {
  if (!value) return '-';
  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
};

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const parseStorageKeys = (value?: string | null): string[] => {
  const raw = (value || '').trim();
  if (!raw) return [];
  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((k) => String(k || '').trim()).filter(Boolean);
    } catch { /* fallback */ }
  }
  return raw.split(/[\r\n,]+/).map((k) => k.trim()).filter(Boolean);
};

const getVideoMimeType = (value: string) => {
  const n = value.toLowerCase().split('?')[0].split('#')[0];
  if (n.endsWith('.mov')) return 'video/quicktime';
  if (n.endsWith('.webm')) return 'video/webm';
  return 'video/mp4';
};

// ----------------------------------------------------------------------

type Props = {
  /** 1 = Good Memo, 2 = Sad Memo */
  collectionId: 1 | 2;
};

export function MemoriesItemView({ collectionId }: Props) {
  const { user } = useAuthContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const ownerCustomerId = user?.id ? String(user.id) : '';
  const meta = MEMO_META[collectionId];

  const [sortBy, setSortBy] = useState('order');
  const [signedUrlMap, setSignedUrlMap] = useState<Record<string, string>>({});
  const [lightboxSlides, setLightboxSlides] = useState<Slide[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [movingItemId, setMovingItemId] = useState<number | null>(null);

  const { collectionItems, collectionItemsLoading } = useGetCollectionItems(
    ownerCustomerId ? collectionId : '',
    ownerCustomerId,
  );

  const search = useSetState<{ query: string; results: ICollectionDrawerItem[] }>({
    query: '',
    results: [],
  });

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
    const ordered = applyFilter({ inputData: collectionItems, sortBy: 'order' });
    let cursor = 0;
    return ordered.map((item) => {
      const rawOrder =
        typeof item.order === 'number' && Number.isFinite(item.order) ? Math.trunc(item.order) : null;
      const resolvedOrder = rawOrder !== null && rawOrder > cursor ? rawOrder : cursor + 1;
      cursor = resolvedOrder;
      return { item, resolvedOrder };
    });
  }, [collectionItems]);

  const reorderIndexById = useMemo(() => {
    const map = new Map<string, number>();
    reorderEntries.forEach((entry, index) => map.set(String(entry.item.id), index));
    return map;
  }, [reorderEntries]);

  const handleSortBy = useCallback((newValue: string) => setSortBy(newValue), []);

  const handleSearch = useCallback(
    (inputValue: string) => {
      search.setState({ query: inputValue });
      const q = inputValue.trim().toLowerCase();
      if (q) {
        search.setState({
          results: collectionItems.filter((item) => {
            const title = (item.title || '').toLowerCase();
            const description = (item.description || '').toLowerCase();
            const visibility = item.isPublic === 1 ? 'public' : 'private';
            const dateValue = item.date ? new Date(item.date).toISOString().slice(0, 10) : '';
            return (
              title.includes(q) ||
              description.includes(q) ||
              visibility.includes(q) ||
              dateValue.includes(q)
            );
          }),
        });
      } else {
        search.setState({ results: [] });
      }
    },
    [collectionItems, search],
  );

  const allAttachmentKeys = useMemo(() => {
    const keys: string[] = [];
    collectionItems.forEach((item) => keys.push(...parseStorageKeys(item.images)));
    return Array.from(new Set(keys));
  }, [collectionItems]);

  useEffect(() => {
    let mounted = true;
    const unresolved = allAttachmentKeys.filter((key) => !!key && !signedUrlMap[key]);
    if (!unresolved.length) return undefined;

    const load = async () => {
      const results = await Promise.all(
        unresolved.map(async (key) => {
          if (isAbsoluteUrl(key)) return { key, url: key };
          try {
            const res = await axiosInstance.get(endpoints.upload.image, { params: { key } });
            return { key, url: (res.data?.url as string) || '' };
          } catch {
            return { key, url: '' };
          }
        }),
      );
      if (!mounted) return;
      setSignedUrlMap((prev) => {
        const next = { ...prev };
        results.forEach(({ key, url }) => { if (url) next[key] = url; });
        return next;
      });
    };

    load();
    return () => { mounted = false; };
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
    if (!slides.length) return;
    setLightboxSlides(slides);
    setLightboxIndex(index);
  }, []);

  const handleCloseLightbox = useCallback(() => setLightboxIndex(-1), []);

  const handleDelete = useCallback(
    async (item: ICollectionDrawerItem) => {
      if (!window.confirm(`Delete "${item.title || item.id}"?`)) return;
      try {
        await deleteCollectionItem(item.id, item.collectionId, item.customerId || user?.id);
        toast.success('Memory deleted.');
      } catch {
        toast.error('Failed to delete memory.');
      }
    },
    [user?.id],
  );

  const handleMoveOrder = useCallback(
    async (item: ICollectionDrawerItem, direction: 'up' | 'down') => {
      const currentIndex = reorderIndexById.get(String(item.id));
      if (currentIndex === undefined) return;
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= reorderEntries.length) return;
      const currentEntry = reorderEntries[currentIndex];
      const targetEntry = reorderEntries[targetIndex];
      try {
        setMovingItemId(item.id);
        await Promise.all([
          updateCollectionItem(currentEntry.item.id, { order: targetEntry.resolvedOrder }),
          updateCollectionItem(targetEntry.item.id, { order: currentEntry.resolvedOrder }),
        ]);
        toast.success(`Moved "${item.title || `Item #${item.id}`}" ${direction}.`);
      } catch {
        toast.error('Failed to change order.');
      } finally {
        setMovingItemId(null);
      }
    },
    [reorderEntries, reorderIndexById],
  );

  const renderImageLinks = useCallback(
    (item: ICollectionDrawerItem) => {
      const imageKeys = parseStorageKeys(item.images);
      if (!imageKeys.length) return '-';

      const imageUrl = imageKeys.length ? signedUrlMap[imageKeys[0]] : '';
      const slides = buildLightboxSlides(imageKeys, []);

      return imageUrl ? (
        <Button
          onClick={() => handleOpenLightbox(slides, 0)}
          size="small"
          variant="text"
          disabled={!slides.length}
          sx={{ minWidth: 0, p: 0, justifyContent: 'flex-start' }}
        >
          Image ({imageKeys.length})
        </Button>
      ) : (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Image ({imageKeys.length}) loading...
        </Typography>
      );
    },
    [buildLightboxSlides, handleOpenLightbox, signedUrlMap],
  );

  const emptyListTitle =
    collectionItems.length === 0
      ? `No ${meta.heading.toLowerCase()} yet`
      : hasSearchQuery
        ? `No results for "${search.state.query.trim()}"`
        : `No ${meta.heading.toLowerCase()} yet`;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={meta.heading}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Drawer', href: paths.dashboard.drawer.root },
          { name: meta.heading },
        ]}
        action={
          isMobile ? (
            <Stack direction="row" spacing={1} sx={{ width: 1, justifyContent: 'flex-end' }}>
              <IconButton
                component={RouterLink}
                href={meta.newHref}
                aria-label="New Memory"
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
              <Button
                component={RouterLink}
                href={meta.newHref}
                variant="contained"
                startIcon={<Iconify icon="solar:add-circle-outline" width={18} />}
              >
                New Memory
              </Button>
            </Stack>
          )
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <Stack
          spacing={3}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          direction={{ xs: 'column', sm: 'row' }}
        >
          <CollectionItemsSearch
            search={search}
            onSearch={handleSearch}
            placeholder={`Search ${meta.heading.toLowerCase()}...`}
            onSelect={(option) => search.setState({ query: option.title || '' })}
          />
          <CollectionItemsSort sort={sortBy} onSort={handleSortBy} sortOptions={SORT_OPTIONS} />
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
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle1" sx={{ minWidth: 0 }}>
                        {item.title || '-'}
                      </Typography>
                      {item.isPublic != null && (
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
                      <Chip size="small" variant="outlined" label={`Date: ${formatDate(item.date)}`} />
                      <Chip size="small" variant="outlined" label={`Updated: ${formatDate(item.updatedAt)}`} />
                    </Stack>

                    <Stack spacing={0.5}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>Images</Typography>
                      {renderImageLinks(item)}
                    </Stack>

                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <IconButton
                        size="small"
                        component={RouterLink}
                        href={meta.editHref(item.id)}
                        aria-label={`Edit ${item.title || item.id}`}
                      >
                        <Iconify icon="solar:pen-2-outline" width={18} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(item)}
                        aria-label={`Delete ${item.title || item.id}`}
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
              <Table sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Order</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Public</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Images</TableCell>
                    <TableCell>Updated At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dataFiltered.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">{item.title || '-'}</Typography>
                      </TableCell>
                      <TableCell>{item.order ?? '-'}</TableCell>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell>
                        {item.isPublic == null ? '-' : (
                          <Chip
                            label={item.isPublic === 1 ? 'Public' : 'Private'}
                            size="small"
                            color={item.isPublic === 1 ? 'success' : 'default'}
                          />
                        )}
                      </TableCell>
                      <TableCell>{formatDate(item.date)}</TableCell>
                      <TableCell>{renderImageLinks(item)}</TableCell>
                      <TableCell>{formatDate(item.updatedAt)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <IconButton
                            size="small"
                            component={RouterLink}
                            href={meta.editHref(item.id)}
                            aria-label={`Edit ${item.title || item.id}`}
                          >
                            <Iconify icon="solar:pen-2-outline" width={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(item)}
                            aria-label={`Delete ${item.title || item.id}`}
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
  if (!value) return 0;
  const parsed = new Date(value as string | number | Date).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const applyFilter = ({ inputData, sortBy }: ApplyFilterProps) => {
  if (sortBy === 'order') {
    return [...inputData].sort((a, b) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return getItemDateTime(b.date) - getItemDateTime(a.date);
    });
  }
  if (sortBy === 'latest') {
    return [...inputData].sort((a, b) => getItemDateTime(b.date) - getItemDateTime(a.date));
  }
  if (sortBy === 'oldest') {
    return [...inputData].sort((a, b) => getItemDateTime(a.date) - getItemDateTime(b.date));
  }
  if (sortBy === 'title') {
    return [...inputData].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }
  if (sortBy === 'title-desc') {
    return [...inputData].sort((a, b) => (b.title || '').localeCompare(a.title || ''));
  }
  return inputData;
};
