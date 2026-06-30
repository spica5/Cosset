'use client';

import type { BoxProps } from '@mui/material/Box';
import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';
import type { IBookshelfBorrow } from 'src/types/bookshelf-borrow';
import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import Pagination from '@mui/material/Pagination';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/universe/iconify';

import {
  resolveEbookAssetUrl,
} from 'src/sections/dashboard/bookshelf/bookshelf-ebook-utils';
import {
  resolveAudiobookAssetUrl,
  resolveAudiobookContentUrl,
} from 'src/sections/dashboard/bookshelf/bookshelf-audiobook-utils';
import { BookshelfEbookViewDialog } from 'src/sections/dashboard/bookshelf/bookshelf-ebook-view-dialog';
import { BookshelfBorrowRequestDialog } from 'src/sections/dashboard/bookshelf/bookshelf-borrow-request-dialog';

import { toast } from 'src/components/dashboard/snackbar';

import {
  requestBookshelfBorrow,
  useGetBookshelfBorrowStatuses,
} from 'src/actions/bookshelf-borrow';

import { useDesignSpaceTheme } from './design-space-theme-context';

// ----------------------------------------------------------------------

type BookshelfItem =
  | { kind: 'ebook'; item: IBookshelfEbook }
  | { kind: 'audiobook'; item: IBookshelfAudiobook };

type Props = BoxProps & {
  ebooks: IBookshelfEbook[];
  audiobooks: IBookshelfAudiobook[];
  showEbooks?: boolean;
  showAudiobooks?: boolean;
  loading?: boolean;
  isOwner?: boolean;
  ownerCustomerId?: string;
  viewerCustomerId?: string;
  authenticated?: boolean;
};

const SHELF_COUNT = 3;
const BOOKS_PER_SHELF = 6;
const PAGE_SIZE = SHELF_COUNT * BOOKS_PER_SHELF;

const WOOD_FRAME_SX = {
  borderRadius: 1,
  border: '10px solid #4a2f23',
  background: 'linear-gradient(180deg, #6b442f 0%, #4a2f23 48%, #3b2419 100%)',
  boxShadow: '0 24px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
};

const SHELF_BOARD_SX = {
  height: 14,
  borderRadius: '2px',
  background: 'linear-gradient(180deg, #8b5e3c 0%, #5c3b28 100%)',
  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.12), 0 4px 8px rgba(0,0,0,0.25)',
};

const PARCHMENT_SX = {
  bgcolor: '#f3e4c8',
  backgroundImage:
    'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 40%), radial-gradient(circle at top right, rgba(255,255,255,0.45), transparent 55%)',
};

function getEntryKey(entry: BookshelfItem) {
  return `${entry.kind}-${entry.item.id}`;
}

function getEntryTitle(entry: BookshelfItem) {
  return (entry.item.title || '').trim() || `Book #${entry.item.id}`;
}

function filterBookshelfItems(items: BookshelfItem[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return items;
  }

  return items.filter(({ item, kind }) => {
    const searchable = [
      item.title,
      item.author,
      item.publishYear != null ? String(item.publishYear) : '',
      item.description,
      kind === 'ebook' ? 'e-book' : 'audio-book',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalized);
  });
}

function splitEntriesIntoShelves(items: BookshelfItem[]) {
  const shelves: BookshelfItem[][] = Array.from({ length: SHELF_COUNT }, () => []);

  items.forEach((entry, index) => {
    const shelfIndex = Math.min(Math.floor(index / BOOKS_PER_SHELF), SHELF_COUNT - 1);

    if (shelves[shelfIndex].length < BOOKS_PER_SHELF) {
      shelves[shelfIndex].push(entry);
    }
  });

  return shelves;
}

async function resolveCoverUrl(entry: BookshelfItem) {
  const coverImage = entry.item.coverImage;

  if (!coverImage) {
    return '';
  }

  const resolveCover =
    entry.kind === 'audiobook' ? resolveAudiobookAssetUrl : resolveEbookAssetUrl;

  return resolveCover(coverImage);
}

// ----------------------------------------------------------------------

type BookCoverProps = {
  entry: BookshelfItem;
  active?: boolean;
  onSelect: (entry: BookshelfItem) => void;
};

function BookshelfBookCover({ entry, active, onSelect }: BookCoverProps) {
  const [coverUrl, setCoverUrl] = useState('');
  const title = getEntryTitle(entry);

  useEffect(() => {
    let mounted = true;

    resolveCoverUrl(entry).then((url) => {
      if (mounted) {
        setCoverUrl(url);
      }
    });

    return () => {
      mounted = false;
    };
  }, [entry]);

  const fallbackIcon =
    entry.kind === 'audiobook'
      ? 'solar:headphones-round-bold'
      : 'solar:book-2-bold';

  return (
    <Box
      onClick={() => onSelect(entry)}
      sx={{
        position: 'relative',
        width: { xs: 56, sm: 68, md: 112 },
        flexShrink: 0,
        cursor: 'pointer',
        transform: active ? 'translateY(-6px) scale(1.04)' : 'none',
        transition: 'transform 0.2s ease',
      }}
    >
      <Box
        sx={{
          pt: '140%',
          borderRadius: 0.5,
          position: 'relative',
          overflow: 'hidden',
          border: active ? '2px solid #f6d58d' : '1px solid rgba(0,0,0,0.25)',
          boxShadow: active ? '0 10px 18px rgba(0,0,0,0.35)' : '0 6px 12px rgba(0,0,0,0.28)',
          bgcolor: '#d7c4a4',
        }}
      >
        {coverUrl ? (
          <Box
            component="img"
            src={coverUrl}
            alt={title}
            sx={{
              position: 'absolute',
              inset: 0,
              width: 1,
              height: 1,
              objectFit: 'cover',
            }}
          />
        ) : (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              position: 'absolute',
              inset: 0,
              color: 'rgba(74,47,35,0.55)',
            }}
          >
            <Iconify icon={fallbackIcon} width={28} />
          </Stack>
        )}
      </Box>

      <Box sx={{ mt: 0.5, minHeight: { xs: 22, sm: 24, md: 28 } }}>
        <Typography
          variant="caption"
          title={title}
          sx={{
            px: 0.25,
            textAlign: 'center',
            color: active ? '#f6d58d' : '#f3e4c8',
            fontWeight: active ? 600 : 400,
            fontSize: { xs: 9, sm: 10, md: 11 },
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            display: '-webkit-box',
          }}
        >
          {title}
        </Typography>
      </Box>
    </Box>
  );
}

type BookDetailPanelProps = {
  entry: BookshelfItem | null;
  borrowStatus?: IBookshelfBorrow | null;
  canRequestBorrow?: boolean;
  viewerCustomerId?: string;
  onRequestBorrow?: (borrowPeriodDays: number) => Promise<void>;
  requestingBorrow?: boolean;
};

function BookshelfBookDetailPanel({
  entry,
  borrowStatus,
  canRequestBorrow = false,
  viewerCustomerId,
  onRequestBorrow,
  requestingBorrow = false,
}: BookDetailPanelProps) {
  const [coverUrl, setCoverUrl] = useState('');
  const [readerOpen, setReaderOpen] = useState(false);
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!entry) {
      setCoverUrl('');
      return () => {
        mounted = false;
      };
    }

    resolveCoverUrl(entry).then((url) => {
      if (mounted) {
        setCoverUrl(url);
      }
    });

    return () => {
      mounted = false;
    };
  }, [entry]);

  if (!entry) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={1.5}
        sx={{ flex: 1, minHeight: 280, px: 2, py: 4, textAlign: 'center' }}
      >
        <Iconify icon="solar:book-2-bold" width={48} sx={{ color: 'rgba(74,47,35,0.35)' }} />
        <Typography variant="subtitle1" sx={{ color: '#4a2f23', fontWeight: 700 }}>
          Select a book
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(74,47,35,0.7)', maxWidth: 220 }}>
          Click a cover on the shelf to view its details here.
        </Typography>
      </Stack>
    );
  }

  const title = getEntryTitle(entry);
  const author = (entry.item.author || '').trim();
  const description = (entry.item.description || '').trim();
  const isAudiobook = entry.kind === 'audiobook';
  const isRequested = borrowStatus?.status === 'pending';
  const isApproved = borrowStatus?.status === 'approved';

  const handleRead = async () => {
    if (!isAudiobook) {
      setReaderOpen(true);
      return;
    }

    const url = await resolveAudiobookContentUrl(entry.item);

    if (url && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Stack
      spacing={2}
      sx={{
        flex: 1,
        minHeight: 200,
        px: { xs: 2, md: 2.5 },
        py: { xs: 2, md: 2.5 },
        overflow: 'auto',
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="flex-start"
        justifyContent="center"
        sx={{ width: 1 }}
      >
        <Box
          sx={{
            width: '45%',
            maxWidth: '45%',
            flexShrink: 0,
            alignSelf: 'flex-start',
            aspectRatio: '5 / 7',
            position: 'relative',
            borderRadius: 1,
            overflow: 'hidden',
            border: '2px solid rgba(74,47,35,0.18)',
            boxShadow: '0 10px 22px rgba(74,47,35,0.2)',
            bgcolor: '#d7c4a4',
          }}
        >
          {coverUrl ? (
            <Box
              component="img"
              src={coverUrl}
              alt={title}
              sx={{
                width: 1,
                height: 1,
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                position: 'absolute',
                inset: 0,
                color: 'rgba(74,47,35,0.55)',
              }}
            >
              <Iconify icon="solar:book-2-bold" width={40} />
            </Stack>
          )}
        </Box>

        <Stack spacing={1} sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleRead}
            startIcon={
              <Iconify icon={isAudiobook ? 'solar:play-circle-bold' : 'solar:book-2-bold'} width={18} />
            }
            sx={{
              px: 1.5,
              py: 0.85,
              borderRadius: 10,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              bgcolor: '#2d1a12',
              color: 'common.white',
              boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
              '&:hover': {
                bgcolor: '#1f120d',
              },
            }}
          >
            {isAudiobook ? 'Listen to book' : 'Read book'}
          </Button>

          {canRequestBorrow && !borrowStatus ? (
            <Button
              fullWidth
              size="small"
              variant="outlined"
              disabled={requestingBorrow}
              onClick={() => setBorrowDialogOpen(true)}
              startIcon={<Iconify icon="solar:hand-heart-bold" width={18} />}
              sx={{
                borderRadius: 10,
                borderColor: 'rgba(74,47,35,0.35)',
                color: '#4a2f23',
                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
              }}
            >
              {requestingBorrow ? 'Sending...' : 'Request to borrow'}
            </Button>
          ) : null}

          {isRequested ? (
            <Typography variant="caption" sx={{ color: '#5c4030', fontWeight: 600, textAlign: 'center' }}>
              Borrow request pending
            </Typography>
          ) : null}

          {isApproved ? (
            <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 700, textAlign: 'center' }}>
              On your bookshelf
            </Typography>
          ) : null}
        </Stack>
      </Stack>

      <Stack spacing={1} sx={{ textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: '#2d1a12', fontWeight: 800, lineHeight: 1.35 }}>
          {title}
        </Typography>

        {author ? (
          <Typography variant="body2" sx={{ color: '#5c4030', fontWeight: 600 }}>
            by {author}
            {entry.item.publishYear ? ` · ${entry.item.publishYear}` : ''}
          </Typography>
        ) : null}

        <Typography
          variant="body2"
          sx={{
            color: 'rgba(45,26,18,0.78)',
            lineHeight: 1.7,
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
            minHeight: 96,
            overflow: 'auto',
            maxHeight: 160,
          }}
        >
          {description ? `Description: ${description}` : 'No description available'}
        </Typography>
      </Stack>

      <BookshelfBorrowRequestDialog
        open={borrowDialogOpen}
        bookTitle={title}
        submitting={requestingBorrow}
        onClose={() => setBorrowDialogOpen(false)}
        onSubmit={async (borrowPeriodDays) => {
          await onRequestBorrow?.(borrowPeriodDays);
          setBorrowDialogOpen(false);
        }}
      />

      {entry.kind === 'ebook' ? (
        <BookshelfEbookViewDialog
          open={readerOpen}
          ebook={entry.item}
          customerId={viewerCustomerId}
          onClose={() => setReaderOpen(false)}
        />
      ) : null}
    </Stack>
  );
}

// ----------------------------------------------------------------------

export function UniverseLandingBookshelf({
  ebooks,
  audiobooks,
  showEbooks = false,
  showAudiobooks = false,
  loading = false,
  isOwner = false,
  ownerCustomerId,
  viewerCustomerId,
  authenticated = false,
  sx,
  ...other
}: Props) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const [localBorrowStatuses, setLocalBorrowStatuses] = useState<IBookshelfBorrow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [activeEntryKey, setActiveEntryKey] = useState<string | null>(null);
  const [requestingBorrow, setRequestingBorrow] = useState(false);

  const bookIds = useMemo(() => {
    const ids: number[] = [];
    if (showEbooks) {
      ebooks.forEach((item) => ids.push(item.id));
    }
    if (showAudiobooks) {
      audiobooks.forEach((item) => ids.push(item.id));
    }
    return ids;
  }, [audiobooks, ebooks, showAudiobooks, showEbooks]);

  const canRequestBorrow = authenticated && !!viewerCustomerId && !isOwner && !!ownerCustomerId;

  const { borrowStatuses, borrowStatusesLoading } = useGetBookshelfBorrowStatuses(
    canRequestBorrow ? viewerCustomerId : undefined,
    canRequestBorrow ? ownerCustomerId : undefined,
    canRequestBorrow ? bookIds : undefined,
  );

  const bookshelfItems = useMemo<BookshelfItem[]>(() => {
    const entries: BookshelfItem[] = [];

    if (showEbooks) {
      ebooks.forEach((item) => entries.push({ kind: 'ebook', item }));
    }

    if (showAudiobooks) {
      audiobooks.forEach((item) => entries.push({ kind: 'audiobook', item }));
    }

    return entries;
  }, [audiobooks, ebooks, showAudiobooks, showEbooks]);

  const mergedBorrowStatuses = useMemo(() => {
    const map = new Map<string, IBookshelfBorrow>();

    [...borrowStatuses, ...localBorrowStatuses].forEach((borrow) => {
      const key = `${borrow.bookKind}-${borrow.bookId}`;
      map.set(key, borrow);
    });

    return Array.from(map.values());
  }, [borrowStatuses, localBorrowStatuses]);

  const isSearching = searchQuery.trim().length > 0;

  const filteredItems = useMemo(
    () => filterBookshelfItems(bookshelfItems, searchQuery),
    [bookshelfItems, searchQuery],
  );

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page, pageCount]);

  const shelves = useMemo(() => splitEntriesIntoShelves(paginatedItems), [paginatedItems]);

  const selectedEntry = useMemo(
    () => paginatedItems.find((entry) => getEntryKey(entry) === activeEntryKey) ?? null,
    [activeEntryKey, paginatedItems],
  );

  const selectedBorrowStatus = useMemo(() => {
    if (!selectedEntry) {
      return null;
    }

    return (
      mergedBorrowStatuses.find(
        (borrow) =>
          borrow.bookId === selectedEntry.item.id &&
          borrow.bookKind === selectedEntry.kind &&
          (borrow.status === 'pending' || borrow.status === 'approved'),
      ) || null
    );
  }, [mergedBorrowStatuses, selectedEntry]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  useEffect(() => {
    if (paginatedItems.length === 0) {
      setActiveEntryKey(null);
      return;
    }

    const isActiveVisible =
      activeEntryKey != null && paginatedItems.some((entry) => getEntryKey(entry) === activeEntryKey);

    if (!isActiveVisible) {
      setActiveEntryKey(getEntryKey(paginatedItems[0]));
    }
  }, [activeEntryKey, paginatedItems]);

  const handleSelect = useCallback((entry: BookshelfItem) => {
    setActiveEntryKey(getEntryKey(entry));
  }, []);

  const handleRequestBorrow = useCallback(
    async (borrowPeriodDays: number) => {
      if (!canRequestBorrow || !ownerCustomerId || !viewerCustomerId || !selectedEntry) {
        return;
      }

      try {
        setRequestingBorrow(true);
        const result = await requestBookshelfBorrow({
          borrowerCustomerId: viewerCustomerId,
          ownerCustomerId,
          bookKind: selectedEntry.kind,
          bookId: selectedEntry.item.id,
          borrowPeriodDays,
        });
        const createdBorrow = result?.borrow as IBookshelfBorrow | undefined;

        if (createdBorrow) {
          setLocalBorrowStatuses((prev) => {
            const key = `${createdBorrow.bookKind}-${createdBorrow.bookId}`;
            const next = prev.filter((item) => `${item.bookKind}-${item.bookId}` !== key);
            return [createdBorrow, ...next];
          });
        }

        toast.success('Borrow request sent.');
      } catch (error: unknown) {
        const message =
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message ===
            'string'
            ? (error as { response: { data: { message: string } } }).response.data.message
            : error instanceof Error
              ? error.message
              : 'Failed to send borrow request.';

        toast.error(message);
      } finally {
        setRequestingBorrow(false);
      }
    },
    [canRequestBorrow, ownerCustomerId, selectedEntry, viewerCustomerId],
  );

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        flex: 1,
        minHeight: 0,
        height: { xs: 'auto', lg: 1 },
        display: 'flex',
        flexDirection: 'column',
        px: { xs: 1, sm: 2, md: 4 },
        py: { xs: 1.5, sm: 2, md: 3 },
        ...sx,
      }}
      {...other}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${CONFIG.universe.assetsDir}/assets/images/design-space/universe-large-1.webp)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 15% 20%, rgba(255, 183, 77, 0.35), transparent 35%), radial-gradient(circle at 85% 25%, rgba(77, 208, 225, 0.35), transparent 32%), linear-gradient(180deg, rgba(18, 24, 38, 0.2) 0%, rgba(18, 24, 38, 0.55) 100%)',
        }}
      />

      <Stack spacing={2.5} sx={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0 }}>
        <Box sx={{ flexShrink: 0, width: 1 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' },
              alignItems: 'center',
              gap: { xs: 1.5, md: 2 },
              width: 1,
            }}
          >
            <Box sx={{ display: { xs: 'none', md: 'block' } }} />

            <Stack
              direction="row"
              alignItems="center"
              spacing={{ xs: 1.25, sm: 2 }}
              sx={{
                justifyContent: 'center',
                minWidth: 0,
                mx: 'auto',
              }}
            >
              <Box
                sx={{
                  width: { xs: 48, sm: 56 },
                  height: { xs: 48, sm: 56 },
                  borderRadius: '20%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(255,255,255,0.92)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Iconify icon="solar:book-2-bold" width={28} sx={{ color: spaceTheme.accent }} />
                  <Iconify
                    icon="solar:star-bold"
                    width={15}
                    sx={{
                      position: 'absolute',
                      top: -2,
                      right: -4,
                      color: 'warning.main',
                    }}
                  />
                </Box>
              </Box>

              <Box sx={{ textAlign: 'center', minWidth: 0 }}>
                <Typography
                  variant="h3"
                  sx={{
                    color: 'common.white',
                    fontWeight: 800,
                    letterSpacing: { xs: 1, md: 1.5 },
                    textShadow: '0 4px 16px rgba(0,0,0,0.35)',
                    fontSize: { xs: '1.35rem', sm: '1.5rem', md: '2rem' },
                  }}
                >
                  Bookshelf
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: 'rgba(255,255,255,0.88)',
                    textShadow: '0 2px 8px rgba(0,0,0,0.35)',
                    fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1rem' },
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  E-books and audiobooks shared from the bookshelf.
                  {isSearching
                    ? ` (${filteredItems.length} result${filteredItems.length === 1 ? '' : 's'})`
                    : ''}
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems="center"
              spacing={1.5}
              sx={{
                width: { xs: 1, md: 'auto' },
                minWidth: { md: 280 },
                maxWidth: { md: 520 },
                justifySelf: { xs: 'stretch', md: 'end' },
              }}
            >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.25,
                py: 0.75,
                flex: 1,
                minWidth: 0,
                borderRadius: 1,
                bgcolor: '#e8d2a8',
                border: '1px solid rgba(74,47,35,0.18)',
              }}
            >
              <Iconify icon="eva:search-fill" width={18} sx={{ color: '#6b4a35', flexShrink: 0 }} />
              <InputBase
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by title, author, or..."
                inputProps={{ 'aria-label': 'Search bookshelf' }}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 14,
                  color: '#4a2f23',
                  '& input::placeholder': {
                    color: 'rgba(74,47,35,0.55)',
                    opacity: 1,
                  },
                }}
              />
              {isSearching ? (
                <IconButton
                  size="small"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                  }}
                  sx={{ color: '#6b4a35', flexShrink: 0 }}
                >
                  <Iconify icon="mingcute:close-line" width={18} />
                </IconButton>
              ) : null}
            </Box>

            {isOwner ? (
              <Button
                component={RouterLink}
                href={paths.dashboard.bookshelf.root}
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
                sx={{
                  width: { xs: 1, sm: 'auto' },
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  px: 2,
                  bgcolor: spaceTheme.accent,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: spaceTheme.accentHover, boxShadow: 'none' },
                }}
              >
                Add book
              </Button>
            ) : null}
            </Stack>
          </Box>
        </Box>

        <Box
          sx={{
            ...WOOD_FRAME_SX,
            p: { xs: 1.25, md: 2 },
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 10, flex: 1 }}>
              <Iconify icon="solar:refresh-outline" width={24} sx={{ color: '#f3e4c8', mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'rgba(243,228,200,0.85)' }}>
                Loading bookshelf...
              </Typography>
            </Stack>
          ) : filteredItems.length === 0 ? (
            <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ py: 10, flex: 1 }}>
              <Iconify icon="solar:book-2-bold" width={40} sx={{ color: 'rgba(243,228,200,0.65)' }} />
              <Typography variant="subtitle1" sx={{ color: '#f3e4c8', fontWeight: 700 }}>
                {isSearching ? 'No books match your search' : 'No bookshelf items yet'}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'rgba(243,228,200,0.75)', maxWidth: 320, textAlign: 'center' }}
              >
                {isOwner
                  ? 'Add a book with a cover image from your bookshelf dashboard.'
                  : 'Check back soon for shared books.'}
              </Typography>
            </Stack>
          ) : (
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={{ xs: 1.5, lg: 0 }}
              sx={{ flex: { lg: 1 }, minHeight: 0 }}
            >
              <Box
                sx={{
                  flex: { lg: '0 0 65%' },
                  px: { xs: 0.25, md: 1 },
                  py: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: { xs: 'flex-start', lg: 'space-between' },
                  gap: { xs: 1.5, md: 2 },
                  minHeight: 0,
                  overflowX: { xs: 'auto', lg: 'visible' },
                  overflowY: { xs: 'visible', lg: 'hidden' },
                  scrollbarWidth: 'thin',
                }}
              >
                {shelves.map((shelfEntries, shelfIndex) => (
                  <Box
                    key={`shelf-visual-${shelfIndex}`}
                    sx={{
                      flex: { xs: '0 0 auto', lg: 1 },
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: { xs: 92, sm: 100, md: 112 },
                      minWidth: { xs: 320, lg: 'auto' },
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="flex-end"
                      spacing={{ xs: 1.25, sm: 1.75, md: 2.25 }}
                      sx={{
                        flex: 1,
                        px: { xs: 0.75, md: 1 },
                        pb: 0.5,
                        minHeight: { xs: 92, sm: 100, md: 116 },
                      }}
                    >
                      {shelfEntries.map((entry) => (
                        <BookshelfBookCover
                          key={getEntryKey(entry)}
                          entry={entry}
                          active={activeEntryKey === getEntryKey(entry)}
                          onSelect={handleSelect}
                        />
                      ))}
                    </Stack>
                    <Box sx={SHELF_BOARD_SX} />
                  </Box>
                ))}
              </Box>

              <Box
                sx={{
                  flex: 1,
                  ...PARCHMENT_SX,
                  borderRadius: 1,
                  border: '1px solid rgba(74,47,35,0.12)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: { xs: 280, sm: 320, lg: 0 },
                }}
              >
                <BookshelfBookDetailPanel
                  entry={selectedEntry}
                  borrowStatus={selectedBorrowStatus}
                  canRequestBorrow={canRequestBorrow && !borrowStatusesLoading}
                  viewerCustomerId={viewerCustomerId}
                  requestingBorrow={requestingBorrow}
                  onRequestBorrow={handleRequestBorrow}
                />
              </Box>
            </Stack>
          )}

          {filteredItems.length > 0 ? (
            <Stack alignItems="center" sx={{ pt: 2, flexShrink: 0, px: 1 }}>
              <Pagination
                count={pageCount}
                page={Math.min(page, pageCount)}
                onChange={(_, value) => setPage(value)}
                shape="rounded"
                size="small"
                siblingCount={0}
                boundaryCount={1}
                sx={{
                  '& .MuiPaginationItem-root': {
                    color: '#f3e4c8',
                    fontWeight: 600,
                    minWidth: { xs: 28, sm: 32 },
                    height: { xs: 28, sm: 32 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  },
                  '& .Mui-selected': {
                    bgcolor: 'rgba(246, 213, 141, 0.92) !important',
                    color: '#3b2419 !important',
                  },
                }}
              />
            </Stack>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
}
