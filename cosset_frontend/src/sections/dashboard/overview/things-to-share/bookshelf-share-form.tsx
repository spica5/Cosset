'use client';

import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';
import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';

import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';
import { useGetGuestArea, updateGuestArea } from 'src/actions/guestarea';
import { useGetBookshelfEbooks, updateBookshelfEbook } from 'src/actions/bookshelf-ebook';
import { useGetBookshelfAudiobooks, updateBookshelfAudiobook } from 'src/actions/bookshelf-audiobook';

import { toast } from 'src/components/dashboard/snackbar';
import { EmptyContent } from 'src/components/dashboard/empty-content';

import { resolveEbookAssetUrl } from 'src/sections/dashboard/bookshelf/bookshelf-ebook-utils';
import { resolveAudiobookAssetUrl } from 'src/sections/dashboard/bookshelf/bookshelf-audiobook-utils';
import {
  BOOK_CATEGORY_OPTIONS,
  normalizeBookCategory,
  type BookshelfBookGenre,
} from 'src/sections/dashboard/bookshelf/bookshelf-book-categories';

// ---------------------------------------------------------------

type DrawerSettings = {
  ebooks?: boolean;
  audiobooks?: boolean;
  [key: string]: unknown;
};

type Visibility = 0 | 1;
type ItemIdKey = string;
type CategoryValue = BookshelfBookGenre | '';

const toItemIdKey = (id: string | number): ItemIdKey => String(id);

const isPublicItem = (isPublic: unknown): boolean => {
  if (typeof isPublic === 'number') {
    return isPublic === 1;
  }

  if (typeof isPublic === 'string') {
    const normalized = isPublic.trim().toLowerCase();
    return normalized === '1' || normalized === 'public' || normalized === 'true';
  }

  if (typeof isPublic === 'boolean') {
    return isPublic;
  }

  return false;
};

const parseDrawerSettings = (drawer?: string | null): DrawerSettings => {
  if (!drawer) {
    return {};
  }

  try {
    return JSON.parse(drawer) as DrawerSettings;
  } catch {
    return {};
  }
};

type BookshelfSectionProps<T extends { id: number; title: string; author?: string | null; coverImage?: string | null; isPublic?: number | null; category?: string | null }> = {
  title: string;
  manageHref: string;
  showSection: boolean;
  onShowSectionChange: (checked: boolean) => void;
  items: T[];
  itemsLoading: boolean;
  itemUpdates: Record<ItemIdKey, Visibility>;
  categoryUpdates: Record<ItemIdKey, CategoryValue>;
  onBulkVisibility: (visibility: Visibility) => void;
  onBulkCategory: (category: CategoryValue) => void;
  onVisibilityChange: (itemId: string | number, visibility: Visibility) => void;
  onCategoryChange: (itemId: string | number, category: CategoryValue) => void;
  resolveCoverUrl: (coverImage?: string | null) => Promise<string>;
  isSaving: boolean;
};

function BookshelfSection<T extends { id: number; title: string; author?: string | null; coverImage?: string | null; isPublic?: number | null; category?: string | null }>({
  title,
  manageHref,
  showSection,
  onShowSectionChange,
  items,
  itemsLoading,
  itemUpdates,
  categoryUpdates,
  onBulkVisibility,
  onBulkCategory,
  onVisibilityChange,
  onCategoryChange,
  resolveCoverUrl,
  isSaving,
}: BookshelfSectionProps<T>) {
  const [coverUrlMap, setCoverUrlMap] = useState<Record<number, string>>({});
  const [loadingCovers, setLoadingCovers] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadCovers = async () => {
      if (!items.length) {
        setCoverUrlMap({});
        return;
      }

      setLoadingCovers(true);

      try {
        const results = await Promise.all(
          items
            .filter((item) => item.coverImage)
            .map(async (item) => {
              const url = await resolveCoverUrl(item.coverImage);
              return { id: item.id, url };
            }),
        );

        if (mounted) {
          const map: Record<number, string> = {};
          results.forEach(({ id, url }) => {
            if (url) {
              map[id] = url;
            }
          });
          setCoverUrlMap(map);
        }
      } finally {
        if (mounted) {
          setLoadingCovers(false);
        }
      }
    };

    loadCovers();

    return () => {
      mounted = false;
    };
  }, [items, resolveCoverUrl]);

  const notFound = !items.length && !itemsLoading;

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Typography variant="h6">{title}</Typography>

          <Stack direction="row" spacing={2} alignItems="center">
            <Switch checked={showSection} onChange={(event) => onShowSectionChange(event.target.checked)} />
            <Typography variant="body2">Show on Home Space</Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant="outlined"
            color="success"
            onClick={() => onBulkVisibility(1)}
            disabled={isSaving || !items.length}
          >
            Enable All
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => onBulkVisibility(0)}
            disabled={isSaving || !items.length}
          >
            Disable All
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => onBulkCategory('')}
            disabled={isSaving || !items.length}
          >
            Clear category
          </Button>
          <Button component={RouterLink} href={manageHref} size="small" variant="outlined">
            Manage {title}
          </Button>
        </Stack>
      </Stack>

      {itemsLoading ? (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : notFound ? (
        <EmptyContent filled sx={{ py: 6 }} />
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>ID</TableCell>
                <TableCell>Public</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Cover</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Author</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {items.map((item) => {
                const itemIdKey = toItemIdKey(item.id);
                const currentCategory =
                  categoryUpdates[itemIdKey] !== undefined
                    ? categoryUpdates[itemIdKey]
                    : (item.category || '');

                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.id}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Switch
                        checked={
                          itemUpdates[itemIdKey] !== undefined
                            ? itemUpdates[itemIdKey] === 1
                            : isPublicItem(item.isPublic)
                        }
                        onChange={(event) =>
                          onVisibilityChange(item.id, event.target.checked ? 1 : 0)
                        }
                      />
                    </TableCell>

                    <TableCell sx={{ minWidth: 160 }}>
                      <TextField
                        select
                        size="small"
                        value={currentCategory}
                        onChange={(event) =>
                          onCategoryChange(item.id, event.target.value as CategoryValue)
                        }
                        disabled={isSaving}
                        fullWidth
                      >
                        <MenuItem value="">None</MenuItem>
                        {BOOK_CATEGORY_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>

                    <TableCell>
                      {item.coverImage && coverUrlMap[item.id] ? (
                        <Box
                          component="img"
                          src={coverUrlMap[item.id]}
                          alt={item.title}
                          sx={{ width: 56, height: 78, objectFit: 'cover', borderRadius: 1 }}
                        />
                      ) : null}
                      {item.coverImage && !coverUrlMap[item.id] && loadingCovers ? (
                        <Box sx={{ width: 56, height: 78, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CircularProgress size={20} />
                        </Box>
                      ) : null}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.title}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{item.author || '-'}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export function BookshelfShareForm() {
  const { user } = useAuthContext();
  const { guestarea } = useGetGuestArea(user?.id || '');
  const { ebooks, ebooksLoading } = useGetBookshelfEbooks(user?.id);
  const { audiobooks, audiobooksLoading } = useGetBookshelfAudiobooks(user?.id);

  const [showEbooks, setShowEbooks] = useState(false);
  const [showAudiobooks, setShowAudiobooks] = useState(false);
  const [ebookUpdates, setEbookUpdates] = useState<Record<ItemIdKey, Visibility>>({});
  const [audiobookUpdates, setAudiobookUpdates] = useState<Record<ItemIdKey, Visibility>>({});
  const [ebookCategoryUpdates, setEbookCategoryUpdates] = useState<Record<ItemIdKey, CategoryValue>>({});
  const [audiobookCategoryUpdates, setAudiobookCategoryUpdates] = useState<Record<ItemIdKey, CategoryValue>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const drawerSettings = parseDrawerSettings(guestarea?.drawer);
    setShowEbooks(!!drawerSettings.ebooks);
    setShowAudiobooks(!!drawerSettings.audiobooks);
  }, [guestarea?.drawer]);

  const currentDrawerSettings = parseDrawerSettings(guestarea?.drawer);
  const hasGuestAreaChanges =
    showEbooks !== !!currentDrawerSettings.ebooks ||
    showAudiobooks !== !!currentDrawerSettings.audiobooks;
  const hasEbookChanges = Object.keys(ebookUpdates).length > 0;
  const hasAudiobookChanges = Object.keys(audiobookUpdates).length > 0;
  const hasEbookCategoryChanges = Object.keys(ebookCategoryUpdates).length > 0;
  const hasAudiobookCategoryChanges = Object.keys(audiobookCategoryUpdates).length > 0;
  const hasChanges =
    hasGuestAreaChanges ||
    hasEbookChanges ||
    hasAudiobookChanges ||
    hasEbookCategoryChanges ||
    hasAudiobookCategoryChanges;

  const handleEbookBulkVisibility = (visibility: Visibility) => {
    const next: Record<ItemIdKey, Visibility> = {};
    ebooks.forEach((ebook) => {
      next[toItemIdKey(ebook.id)] = visibility;
    });
    setEbookUpdates(next);
  };

  const handleAudiobookBulkVisibility = (visibility: Visibility) => {
    const next: Record<ItemIdKey, Visibility> = {};
    audiobooks.forEach((audiobook) => {
      next[toItemIdKey(audiobook.id)] = visibility;
    });
    setAudiobookUpdates(next);
  };

  const handleEbookVisibilityChange = (ebookId: string | number, visibility: Visibility) => {
    const ebookIdKey = toItemIdKey(ebookId);
    const original = ebooks.find((ebook) => toItemIdKey(ebook.id) === ebookIdKey);
    const originalVisibility: Visibility = isPublicItem(original?.isPublic) ? 1 : 0;

    setEbookUpdates((prev) => {
      if (visibility === originalVisibility) {
        const next = { ...prev };
        delete next[ebookIdKey];
        return next;
      }

      return { ...prev, [ebookIdKey]: visibility };
    });
  };

  const handleAudiobookVisibilityChange = (audiobookId: string | number, visibility: Visibility) => {
    const audiobookIdKey = toItemIdKey(audiobookId);
    const original = audiobooks.find((audiobook) => toItemIdKey(audiobook.id) === audiobookIdKey);
    const originalVisibility: Visibility = isPublicItem(original?.isPublic) ? 1 : 0;

    setAudiobookUpdates((prev) => {
      if (visibility === originalVisibility) {
        const next = { ...prev };
        delete next[audiobookIdKey];
        return next;
      }

      return { ...prev, [audiobookIdKey]: visibility };
    });
  };

  const createCategoryChangeHandler =
    <T extends { id: number; category?: string | null }>(
      items: T[],
      setUpdates: Dispatch<SetStateAction<Record<ItemIdKey, CategoryValue>>>,
    ) =>
    (itemId: string | number, category: CategoryValue) => {
      const itemIdKey = toItemIdKey(itemId);
      const original = items.find((item) => toItemIdKey(item.id) === itemIdKey);
      const originalCategory = (original?.category || '') as CategoryValue;

      setUpdates((prev) => {
        if (category === originalCategory) {
          const next = { ...prev };
          delete next[itemIdKey];
          return next;
        }

        return { ...prev, [itemIdKey]: category };
      });
    };

  const createBulkCategoryHandler =
    <T extends { id: number }>(
      items: T[],
      setUpdates: Dispatch<SetStateAction<Record<ItemIdKey, CategoryValue>>>,
    ) =>
    (category: CategoryValue) => {
      const next: Record<ItemIdKey, CategoryValue> = {};
      items.forEach((item) => {
        next[toItemIdKey(item.id)] = category;
      });
      setUpdates(next);
    };

  const handleEbookCategoryChange = createCategoryChangeHandler(ebooks, setEbookCategoryUpdates);
  const handleAudiobookCategoryChange = createCategoryChangeHandler(
    audiobooks,
    setAudiobookCategoryUpdates,
  );
  const handleEbookBulkCategory = createBulkCategoryHandler(ebooks, setEbookCategoryUpdates);
  const handleAudiobookBulkCategory = createBulkCategoryHandler(
    audiobooks,
    setAudiobookCategoryUpdates,
  );

  const handleSave = async () => {
    if (!hasChanges) {
      toast.warning('No changes to save');
      return;
    }

    if (!guestarea) {
      toast.error('Guest area not found');
      return;
    }

    setIsSaving(true);

    try {
      const enablingPublicEbooks = Object.values(ebookUpdates).some((value) => value === 1);
      const enablingPublicAudiobooks = Object.values(audiobookUpdates).some((value) => value === 1);
      const nextShowEbooks = showEbooks || enablingPublicEbooks;
      const nextShowAudiobooks = showAudiobooks || enablingPublicAudiobooks;

      let existingDrawerSettings: DrawerSettings = {};

      if (guestarea.drawer) {
        try {
          existingDrawerSettings = JSON.parse(guestarea.drawer) as DrawerSettings;
        } catch {
          existingDrawerSettings = {};
        }
      }

      const { blog: _legacyBlog, ...drawerWithoutBlog } = existingDrawerSettings;

      const drawerSettings = JSON.stringify({
        ...drawerWithoutBlog,
        ebooks: nextShowEbooks,
        audiobooks: nextShowAudiobooks,
      });

      await updateGuestArea({
        id: guestarea.id,
        customerId: guestarea.customerId ? String(guestarea.customerId) : user?.id ? String(user.id) : undefined,
        drawer: drawerSettings,
      });

      setShowEbooks(nextShowEbooks);
      setShowAudiobooks(nextShowAudiobooks);

      const ebookVisibilityUpdates = Object.entries(ebookUpdates);
      if (ebookVisibilityUpdates.length > 0) {
        await Promise.all(
          ebookVisibilityUpdates.map(([ebookId, isPublic]) =>
            updateBookshelfEbook(ebookId, { isPublic }),
          ),
        );
        setEbookUpdates({});
      }

      const audiobookVisibilityUpdates = Object.entries(audiobookUpdates);
      if (audiobookVisibilityUpdates.length > 0) {
        await Promise.all(
          audiobookVisibilityUpdates.map(([audiobookId, isPublic]) =>
            updateBookshelfAudiobook(audiobookId, { isPublic }),
          ),
        );
        setAudiobookUpdates({});
      }

      const ebookCategoryUpdatesList = Object.entries(ebookCategoryUpdates);
      if (ebookCategoryUpdatesList.length > 0) {
        await Promise.all(
          ebookCategoryUpdatesList.map(([ebookId, category]) =>
            updateBookshelfEbook(ebookId, { category: normalizeBookCategory(category) }),
          ),
        );
        setEbookCategoryUpdates({});
      }

      const audiobookCategoryUpdatesList = Object.entries(audiobookCategoryUpdates);
      if (audiobookCategoryUpdatesList.length > 0) {
        await Promise.all(
          audiobookCategoryUpdatesList.map(([audiobookId, category]) =>
            updateBookshelfAudiobook(audiobookId, { category: normalizeBookCategory(category) }),
          ),
        );
        setAudiobookCategoryUpdates({});
      }

      toast.success('Bookshelf sharing settings updated successfully!');
    } catch (error) {
      console.error('Failed to save bookshelf sharing settings:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save bookshelf sharing settings',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Bookshelf
        </Typography>

        <BookshelfSection<IBookshelfEbook>
          title="E-books"
          manageHref={paths.dashboard.bookshelf.ebooks}
          showSection={showEbooks}
          onShowSectionChange={setShowEbooks}
          items={ebooks}
          itemsLoading={ebooksLoading}
          itemUpdates={ebookUpdates}
          categoryUpdates={ebookCategoryUpdates}
          onBulkVisibility={handleEbookBulkVisibility}
          onBulkCategory={handleEbookBulkCategory}
          onVisibilityChange={handleEbookVisibilityChange}
          onCategoryChange={handleEbookCategoryChange}
          resolveCoverUrl={resolveEbookAssetUrl}
          isSaving={isSaving}
        />

        <Divider sx={{ my: 3 }} />

        <BookshelfSection<IBookshelfAudiobook>
          title="Audio-books"
          manageHref={paths.dashboard.bookshelf.audioBooks}
          showSection={showAudiobooks}
          onShowSectionChange={setShowAudiobooks}
          items={audiobooks}
          itemsLoading={audiobooksLoading}
          itemUpdates={audiobookUpdates}
          categoryUpdates={audiobookCategoryUpdates}
          onBulkVisibility={handleAudiobookBulkVisibility}
          onBulkCategory={handleAudiobookBulkCategory}
          onVisibilityChange={handleAudiobookVisibilityChange}
          onCategoryChange={handleAudiobookCategoryChange}
          resolveCoverUrl={resolveAudiobookAssetUrl}
          isSaving={isSaving}
        />
      </Box>

      <Box sx={{ p: 3, pt: 0 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            startIcon={isSaving ? <CircularProgress size={20} /> : undefined}
            sx={{ width: { xs: 1, sm: 'auto' } }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          {hasChanges ? (
            <Typography variant="body2" sx={{ color: 'warning.main', alignSelf: 'center' }}>
              Settings modified
            </Typography>
          ) : null}
        </Stack>
      </Box>
    </Card>
  );
}
