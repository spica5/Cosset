'use client';

import type { BoxProps } from '@mui/material/Box';
import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';
import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';

import type { IBookshelfBorrow } from 'src/types/bookshelf-borrow';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Pagination from '@mui/material/Pagination';
import InputAdornment from '@mui/material/InputAdornment';
import CardActionArea from '@mui/material/CardActionArea';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/universe/iconify';

import {
  getEbookFileTypeLabel,
  resolveEbookAssetUrl,
  resolveEbookContentUrl,
} from 'src/sections/dashboard/bookshelf/bookshelf-ebook-utils';
import {
  getAudiobookFileTypeLabel,
  resolveAudiobookAssetUrl,
  resolveAudiobookContentUrl,
} from 'src/sections/dashboard/bookshelf/bookshelf-audiobook-utils';

import { getBookCategoryLabel } from 'src/sections/dashboard/bookshelf/bookshelf-book-categories';

import {
  requestBookshelfBorrow,
  useGetBookshelfBorrowStatuses,
} from 'src/actions/bookshelf-borrow';

import { BookshelfBorrowRequestDialog } from 'src/sections/dashboard/bookshelf/bookshelf-borrow-request-dialog';

import { toast } from 'src/components/dashboard/snackbar';

import { MySpaceSectionTitle } from './myspace-section-title';
import { myspaceItemCardSx, myspaceItemGridSx } from './myspace-item-layout';
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

const PAGE_SIZE = 6;

const SECTION_SERIF = '"Georgia", "Times New Roman", "Palatino Linotype", serif';

const formatBookDate = (value: unknown) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();

  return `${day}/${month}/${year}`;
};

type BookCardProps = {
  entry: BookshelfItem;
  borrowStatus?: IBookshelfBorrow | null;
  canRequestBorrow?: boolean;
  ownerCustomerId?: string;
  viewerCustomerId?: string;
};

function getBorrowStatusForEntry(
  entry: BookshelfItem,
  borrowStatuses: IBookshelfBorrow[],
): IBookshelfBorrow | null {
  return (
    borrowStatuses.find(
      (borrow) =>
        borrow.bookId === entry.item.id &&
        borrow.bookKind === entry.kind &&
        (borrow.status === 'pending' || borrow.status === 'approved'),
    ) || null
  );
}

function BookshelfCover({ entry }: { entry: BookshelfItem }) {
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    let mounted = true;
    const coverImage = entry.item.coverImage;
    const resolveCover =
      entry.kind === 'audiobook' ? resolveAudiobookAssetUrl : resolveEbookAssetUrl;

    resolveCover(coverImage).then((url) => {
      if (mounted) {
        setCoverUrl(url);
      }
    });

    return () => {
      mounted = false;
    };
  }, [entry]);

  const title = entry.item.title;
  const fallbackIcon =
    entry.kind === 'audiobook'
      ? 'solar:headphones-round-bold'
      : entry.item.fileType === 'txt'
        ? 'solar:document-text-bold'
        : 'solar:book-2-bold';

  return (
    <Box sx={{ position: 'relative', px: 1.5, pt: 1.5 }}>
      <Box
        sx={{
          position: 'relative',
          minHeight: 210,
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid rgba(139, 119, 101, 0.14)',
          bgcolor: 'grey.200',
        }}
      >
        {coverUrl ? (
          <Box
            component="img"
            src={coverUrl}
            alt={title}
            sx={{
              width: 1,
              height: 240,
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ minHeight: 210, color: 'text.disabled' }}
          >
            <Iconify icon={fallbackIcon} width={40} />
          </Stack>
        )}

        <Chip
          label={entry.kind === 'ebook' ? 'E-book' : 'Audio-book'}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            fontWeight: 700,
            bgcolor: 'rgba(255,255,255,0.92)',
          }}
        />
      </Box>
    </Box>
  );
}

function UniverseLandingBookshelfCard({
  entry,
  borrowStatus,
  canRequestBorrow = false,
  ownerCustomerId,
  viewerCustomerId,
}: BookCardProps) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const [requesting, setRequesting] = useState(false);
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false);
  const [localPendingBorrow, setLocalPendingBorrow] = useState<IBookshelfBorrow | null>(null);
  const title = (entry.item.title || '').trim() || `Book #${entry.item.id}`;
  const fileTypeLabel =
    entry.kind === 'ebook'
      ? getEbookFileTypeLabel(entry.item.fileType)
      : getAudiobookFileTypeLabel(entry.item.fileType);
  const categoryLabel = getBookCategoryLabel(entry.item.category);

  const handleOpen = async () => {
    const resolver = entry.kind === 'ebook' ? resolveEbookContentUrl : resolveAudiobookContentUrl;
    const url = await resolver(entry.item);

    if (url && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleRequestBorrow = useCallback(
    async (borrowPeriodDays: number) => {
      if (!canRequestBorrow || !ownerCustomerId || !viewerCustomerId || borrowStatus) {
        return;
      }

      try {
        setRequesting(true);
        const result = await requestBookshelfBorrow({
          borrowerCustomerId: viewerCustomerId,
          ownerCustomerId,
          bookKind: entry.kind,
          bookId: entry.item.id,
          borrowPeriodDays,
        });
        const createdBorrow = result?.borrow as IBookshelfBorrow | undefined;
        setLocalPendingBorrow(
          createdBorrow || {
            id: 0,
            borrowerCustomerId: viewerCustomerId,
            ownerCustomerId,
            bookKind: entry.kind,
            bookId: entry.item.id,
            status: 'pending',
            borrowPeriodDays,
          },
        );
        toast.success('Borrow request sent.');
        setBorrowDialogOpen(false);
      } catch (error: any) {
        const message =
          error?.response?.data?.message || error?.message || 'Failed to send borrow request.';
        toast.error(message);
      } finally {
        setRequesting(false);
      }
    },
    [
      borrowStatus,
      canRequestBorrow,
      entry.item.id,
      entry.kind,
      ownerCustomerId,
      viewerCustomerId,
    ],
  );

  useEffect(() => {
    if (borrowStatus?.status === 'pending' || borrowStatus?.status === 'approved') {
      setLocalPendingBorrow(null);
    }
  }, [borrowStatus]);

  const activeBorrowStatus =
    borrowStatus?.status === 'pending' || borrowStatus?.status === 'approved'
      ? borrowStatus
      : localPendingBorrow;

  const showBorrowAction = canRequestBorrow && !activeBorrowStatus;
  const isRequested = activeBorrowStatus?.status === 'pending';
  const borrowLabel =
    activeBorrowStatus?.status === 'approved'
      ? 'On your bookshelf'
      : null;
  const requestedPeriodDays = activeBorrowStatus?.borrowPeriodDays;

  const cardBody = (
    <>
      <BookshelfCover entry={entry} />

      <Stack spacing={0.75} sx={{ p: 2, pt: 1.5, flex: 1 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontFamily: SECTION_SERIF,
            fontWeight: 700,
            fontSize: '1.05rem',
            lineHeight: 1.35,
            minWidth: 0,
          }}
        >
          {title}
        </Typography>

        {entry.item.author ? (
          <Typography variant="body2" color="text.secondary" noWrap>
            by {entry.item.author}
          </Typography>
        ) : null}

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Iconify icon="solar:calendar-minimalistic-bold" width={14} sx={{ color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary">
            {formatBookDate(entry.item.createdAt)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            · {fileTypeLabel}
          </Typography>
          {categoryLabel ? (
            <Typography variant="caption" color="text.secondary">
              · {categoryLabel}
            </Typography>
          ) : null}
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 0.5, mt: 'auto' }}>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: spaceTheme.accent, fontWeight: 700 }}>
            <Iconify
              icon={entry.kind === 'audiobook' ? 'solar:play-circle-bold' : 'solar:eye-bold'}
              width={18}
            />
            <Typography variant="body2" fontWeight={700}>
              {entry.kind === 'audiobook' ? 'Listen' : 'Read'}
            </Typography>
          </Stack>

          <Iconify icon="solar:book-2-bold-duotone" width={22} sx={{ color: spaceTheme.accent, opacity: 0.75 }} />
        </Stack>
      </Stack>
    </>
  );

  return (
    <Card
      sx={{
        height: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2.5,
        overflow: 'hidden',
        bgcolor: spaceTheme.cardBg,
        boxShadow: spaceTheme.isDark
          ? '0 4px 18px rgba(0, 0, 0, 0.28)'
          : '0 4px 18px rgba(60, 45, 30, 0.08)',
        border: `1px solid ${spaceTheme.border}`,
        transition: (theme) =>
          theme.transitions.create(['transform', 'box-shadow'], {
            duration: theme.transitions.duration.shorter,
          }),
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 10px 28px rgba(60, 45, 30, 0.12)',
        },
      }}
    >
      <CardActionArea
        onClick={handleOpen}
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', flex: 1 }}
      >
        {cardBody}
      </CardActionArea>

      {showBorrowAction || isRequested || borrowLabel ? (
        <Box sx={{ px: 2, pb: 2, pt: 0 }}>
          {showBorrowAction ? (
            <Button
              fullWidth
              size="small"
              variant="outlined"
              disabled={requesting}
              onClick={() => setBorrowDialogOpen(true)}
              startIcon={<Iconify icon="solar:hand-heart-bold" width={18} />}
              sx={{
                borderRadius: 99,
                borderColor: spaceTheme.accent,
                color: spaceTheme.accent,
                '&:hover': {
                  borderColor: spaceTheme.accentHover,
                  bgcolor: `${spaceTheme.accent}14`,
                },
              }}
            >
              {requesting ? 'Sending...' : 'Request to borrow'}
            </Button>
          ) : isRequested ? (
            <Button
              fullWidth
              size="small"
              variant="outlined"
              disabled
              startIcon={<Iconify icon="solar:check-circle-bold" width={18} />}
              sx={{
                borderRadius: 99,
                borderColor: spaceTheme.border,
                color: 'text.secondary',
              }}
            >
              {requestedPeriodDays
                ? `Requested · ${requestedPeriodDays} days`
                : 'Requested'}
            </Button>
          ) : (
            <Chip
              label={borrowLabel}
              size="small"
              color="success"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Box>
      ) : null}

      <BookshelfBorrowRequestDialog
        open={borrowDialogOpen}
        bookTitle={title}
        submitting={requesting}
        onClose={() => setBorrowDialogOpen(false)}
        onSubmit={handleRequestBorrow}
      />
    </Card>
  );
}

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
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

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

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return bookshelfItems;
    }

    return bookshelfItems.filter(({ item, kind }) => {
      const searchable = [
        item.title,
        item.author,
        item.description,
        kind === 'ebook' ? 'e-book' : 'audio-book',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [bookshelfItems, searchQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page, pageCount]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  return (
    <Box
      id="bookshelf-section"
      component="section"
      sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 }, ...sx }}
      {...other}
    >
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'flex-end' }}
          justifyContent="space-between"
        >
          <Stack spacing={1} sx={{ maxWidth: 520 }}>
            <MySpaceSectionTitle
              title="BOOKSHELF"
              subtitle="E-books and audiobooks shared from the bookshelf."
              itemCount={bookshelfItems.length}
            />
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ width: { xs: 1, md: 'auto' } }}
          >
            <TextField
              size="small"
              placeholder="Search bookshelf..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              sx={{
                minWidth: { sm: 240 },
                bgcolor: 'background.paper',
                borderRadius: 99,
                '& .MuiOutlinedInput-root': { borderRadius: 99 },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" width={18} sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />

            {isOwner ? (
              <Button
                component={RouterLink}
                href={paths.dashboard.bookshelf.root}
                variant="contained"
                startIcon={<Iconify icon="solar:book-2-bold" />}
                sx={{
                  borderRadius: 99,
                  px: 2.5,
                  whiteSpace: 'nowrap',
                  bgcolor: spaceTheme.accent,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: spaceTheme.accentHover, boxShadow: 'none' },
                }}
              >
                Manage Bookshelf
              </Button>
            ) : null}
          </Stack>
        </Stack>

        {loading ? (
          <Typography color="text.secondary">Loading bookshelf...</Typography>
        ) : filteredItems.length === 0 ? (
          <Typography color="text.secondary">
            {searchQuery.trim() ? 'No bookshelf items match your search.' : 'No shared bookshelf items found.'}
          </Typography>
        ) : (
          <>
            <Box sx={myspaceItemGridSx}>
              {paginatedItems.map((entry) => (
                <Box
                  key={`${entry.kind}-${entry.item.id}`}
                  sx={myspaceItemCardSx}
                >
                  <UniverseLandingBookshelfCard
                    entry={entry}
                    borrowStatus={getBorrowStatusForEntry(entry, borrowStatuses)}
                    canRequestBorrow={canRequestBorrow && !borrowStatusesLoading}
                    ownerCustomerId={ownerCustomerId}
                    viewerCustomerId={viewerCustomerId}
                  />
                </Box>
              ))}
            </Box>

            {pageCount > 1 ? (
              <Stack alignItems="center" sx={{ pt: 1 }}>
                <Pagination
                  count={pageCount}
                  page={Math.min(page, pageCount)}
                  onChange={(_, value) => setPage(value)}
                  shape="rounded"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontWeight: 600,
                    },
                    '& .Mui-selected': {
                      bgcolor: `${spaceTheme.accent} !important`,
                      color: 'common.white',
                    },
                  }}
                />
              </Stack>
            ) : null}
          </>
        )}
      </Stack>
    </Box>
  );
}
