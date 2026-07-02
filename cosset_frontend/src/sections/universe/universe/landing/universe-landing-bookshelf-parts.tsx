'use client';

import type { IBookshelfBorrow } from 'src/types/bookshelf-borrow';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { Iconify } from 'src/components/universe/iconify';

import { useGetBookshelfEbookReadingComments } from 'src/actions/bookshelf-ebook-reading';

import { isBookFavorite } from 'src/sections/dashboard/bookshelf/bookshelf-book-categories';

import {
  resolveAudiobookAssetUrl,
  resolveAudiobookContentUrl,
} from 'src/sections/dashboard/bookshelf/bookshelf-audiobook-utils';
import { BookshelfBorrowRequestDialog } from 'src/sections/dashboard/bookshelf/bookshelf-borrow-request-dialog';
import {
  resolveEbookAssetUrl,
} from 'src/sections/dashboard/bookshelf/bookshelf-ebook-utils';
import { BookshelfEbookViewDialog } from 'src/sections/dashboard/bookshelf/bookshelf-ebook-view-dialog';

import { useDesignSpaceTheme } from './design-space-theme-context';
import { getBookshelfLayoutTheme } from './universe-landing-bookshelf-theme';
import {
  type BookshelfItem,
  getEntryTitle,
} from './universe-landing-bookshelf-utils';

export type { BookshelfItem } from './universe-landing-bookshelf-utils';
export {
  SHELF_COUNT,
  BOOKS_PER_SHELF,
  BOOKSHELF_GRID_COLUMNS,
  BOOKSHELF_GRID_TEMPLATE_COLUMNS,
  BOOKSHELF_GRID_COLUMNS_COMPACT,
  BOOKSHELF_GRID_TEMPLATE_COLUMNS_COMPACT,
  getEntryTitle,
  padShelfEntries,
  splitEntriesIntoShelves,
} from './universe-landing-bookshelf-utils';

// ----------------------------------------------------------------------

export const WOOD_FRAME_SX = {
  borderRadius: 1,
  border: '10px solid #4a2f23',
  background: 'linear-gradient(180deg, #6b442f 0%, #4a2f23 48%, #3b2419 100%)',
  boxShadow: '0 24px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
};

export const SHELF_BOARD_SX = {
  height: 14,
  borderRadius: '2px',
  background: 'linear-gradient(180deg, #8b5e3c 0%, #5c3b28 100%)',
  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.12), 0 4px 8px rgba(0,0,0,0.25)',
};

export const PARCHMENT_SX = {
  bgcolor: '#f3e4c8',
  backgroundImage:
    'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 40%), radial-gradient(circle at top right, rgba(255,255,255,0.45), transparent 55%)',
};

/** Book cover width:height — matches the original 140% padding-top sizing. */
export const BOOK_COVER_ASPECT_RATIO = '5 / 7';

async function resolveCoverUrl(entry: BookshelfItem) {
  const { coverImage } = entry.item;

  if (!coverImage) {
    return '';
  }

  const resolveCover =
    entry.kind === 'audiobook' ? resolveAudiobookAssetUrl : resolveEbookAssetUrl;

  return resolveCover(coverImage);
}

type BookCoverProps = {
  entry: BookshelfItem;
  active?: boolean;
  variant?: 'default' | 'themed';
  isFavorite?: boolean;
  hasBookmarks?: boolean;
  hasComments?: boolean;
  onSelect: (entry: BookshelfItem) => void;
};

/** Invisible slot used to preserve shelf row height and column width when empty. */
export function BookshelfShelfSlotPlaceholder() {
  return (
    <Box
      aria-hidden
      sx={{
        visibility: 'hidden',
        width: 1,
        minWidth: 0,
        pointerEvents: 'none',
      }}
    >
      <Box sx={{ width: 1, pt: '140%' }} />
      <Box sx={{ mt: 0.5, minHeight: { xs: 22, sm: 24, md: 28 } }} />
    </Box>
  );
}

export function BookshelfBookCover({
  entry,
  active,
  variant = 'default',
  isFavorite = false,
  hasBookmarks = false,
  hasComments = false,
  onSelect,
}: BookCoverProps) {
  const [coverUrl, setCoverUrl] = useState('');
  const title = getEntryTitle(entry);
  const { designType, theme: spaceTheme } = useDesignSpaceTheme();
  const layoutTheme = getBookshelfLayoutTheme(designType, spaceTheme);
  const isThemed = variant === 'themed';

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

  const showFavoriteMark = isFavorite || isBookFavorite(entry.item.isFavorite);
  const showBookmarkMark = hasBookmarks;
  const showCommentMark = hasComments;

  return (
    <Box
      onClick={() => onSelect(entry)}
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        width: 1,
        minWidth: 0,
        cursor: 'pointer',
        transform: active ? 'translateY(-4px)' : 'none',
        boxShadow: active ? '0 8px 16px rgba(0, 0, 0, 0.18)' : 'none',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          width: 1,
          pt: '140%',
          borderRadius: isThemed ? 1 : 0.5,
          border: active
            ? `2px solid ${isThemed ? layoutTheme.coverActiveBorder : '#f6d58d'}`
            : `1px solid ${isThemed ? spaceTheme.border : 'rgba(0,0,0,0.25)'}`,
          boxShadow: active
            ? isThemed
              ? '0 10px 18px rgba(120, 80, 60, 0.18)'
              : '0 10px 18px rgba(0,0,0,0.35)'
            : isThemed
              ? '0 6px 12px rgba(80, 60, 40, 0.12)'
              : '0 6px 12px rgba(0,0,0,0.28)',
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

        {showFavoriteMark || showBookmarkMark || showCommentMark ? (
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              zIndex: 1,
            }}
          >
            {showBookmarkMark ? (
              <Box
                aria-label="Reading bookmark"
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(255, 255, 255, 0.94)',
                  color: isThemed ? layoutTheme.coverActiveBorder : spaceTheme.accent,
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.22)',
                }}
              >
                <Iconify icon="solar:bookmark-bold" width={13} />
              </Box>
            ) : null}
            {showCommentMark ? (
              <Box
                aria-label="Reading comment"
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(255, 255, 255, 0.94)',
                  color: spaceTheme.accent,
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.22)',
                }}
              >
                <Iconify icon="solar:chat-round-dots-bold" width={13} />
              </Box>
            ) : null}
            {showFavoriteMark ? (
              <Box
                aria-label="Favorite"
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(255, 255, 255, 0.94)',
                  color: spaceTheme.accent,
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.22)',
                }}
              >
                <Iconify icon="solar:heart-bold" width={13} />
              </Box>
            ) : null}
          </Stack>
        ) : null}
      </Box>

      <Box sx={{ mt: 0.5, width: 1, minHeight: { xs: 22, sm: 24, md: 28 }, flexShrink: 0 }}>
        <Typography
          variant="caption"
          title={title}
          sx={{
            px: 0.25,
            textAlign: 'center',
            color: active
              ? isThemed
                ? layoutTheme.coverTitleActiveColor
                : '#f6d58d'
              : isThemed
                ? layoutTheme.coverTitleColor
                : '#f3e4c8',
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

export function BookshelfBookDetailPanel({
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

function formatCommentPosition(
  pageNumber?: number | null,
  scrollPosition?: number | null,
) {
  if (pageNumber != null && pageNumber > 0) {
    return `Page ${pageNumber}`;
  }

  if (scrollPosition != null && scrollPosition >= 0) {
    return `Position ${Math.round(scrollPosition)}`;
  }

  return null;
}

type BookQuotesPanelProps = {
  entry: BookshelfItem | null;
  commentsCustomerId?: string;
  viewerCustomerId?: string;
};

export function BookshelfBookQuotesPanel({
  entry,
  commentsCustomerId,
  viewerCustomerId,
}: BookQuotesPanelProps) {
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerTarget, setReaderTarget] = useState<{
    pageNumber?: number | null;
    scrollPosition?: number | null;
  } | null>(null);
  const bookId = entry?.kind === 'ebook' ? entry.item.id : '';
  const readerCustomerId = commentsCustomerId ?? viewerCustomerId;

  const { comments, commentsLoading } = useGetBookshelfEbookReadingComments(
    bookId,
    commentsCustomerId,
  );

  const openReader = (
    target?: { pageNumber?: number | null; scrollPosition?: number | null } | null,
  ) => {
    setReaderTarget(target ?? null);
    setReaderOpen(true);
  };

  const closeReader = () => {
    setReaderOpen(false);
    setReaderTarget(null);
  };

  if (!entry) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={1.5}
        sx={{ flex: 1, minHeight: 280, px: 2, py: 4, textAlign: 'center' }}
      >
        <Iconify icon="solar:chat-round-dots-bold" width={48} sx={{ color: 'rgba(74,47,35,0.35)' }} />
        <Typography variant="subtitle1" sx={{ color: '#4a2f23', fontWeight: 700 }}>
          Select a book
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(74,47,35,0.7)', maxWidth: 240 }}>
          Click a cover on the shelf to view its reading comments here.
        </Typography>
      </Stack>
    );
  }

  const title = getEntryTitle(entry);
  const author = (entry.item.author || '').trim();
  const positionLabel = (pageNumber?: number | null, scrollPosition?: number | null) =>
    formatCommentPosition(pageNumber, scrollPosition);

  return (
    <Stack
      spacing={2}
      sx={{
        flex: 1,
        minHeight: 200,
        px: { xs: 2, md: 2.5 },
        py: { xs: 2, md: 2.5 },
        overflow: 'hidden',
      }}
    >
      <Stack spacing={0.75} sx={{ flexShrink: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Iconify icon="solar:chat-round-dots-bold" width={20} sx={{ color: '#5c4030' }} />
          <Typography variant="overline" sx={{ color: '#5c4030', fontWeight: 700, letterSpacing: 1.2 }}>
            Reading comments
          </Typography>
        </Stack>

        <Typography variant="h6" sx={{ color: '#2d1a12', fontWeight: 800, lineHeight: 1.35 }}>
          {title}
        </Typography>

        {author ? (
          <Typography variant="body2" sx={{ color: '#5c4030', fontWeight: 600 }}>
            by {author}
          </Typography>
        ) : null}

        {entry.kind === 'ebook' ? (
          <Button
            size="small"
            variant="contained"
            onClick={() => openReader()}
            startIcon={<Iconify icon="solar:book-2-bold" width={16} />}
            sx={{
              alignSelf: 'flex-start',
              mt: 0.5,
              px: 1.5,
              py: 0.65,
              borderRadius: 10,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: '#2d1a12',
              color: 'common.white',
              '&:hover': {
                bgcolor: '#1f120d',
              },
            }}
          >
            Read book
          </Button>
        ) : null}
      </Stack>

      <Divider sx={{ borderColor: 'rgba(74,47,35,0.12)' }} />

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', pr: 0.5 }}>
        {commentsLoading ? (
          <Typography variant="body2" sx={{ color: 'rgba(74,47,35,0.7)' }}>
            Loading comments…
          </Typography>
        ) : comments.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'rgba(74,47,35,0.7)' }}>
            No reading comments for this book yet.
          </Typography>
        ) : (
          <Stack spacing={2} divider={<Divider flexItem sx={{ borderColor: 'rgba(74,47,35,0.1)' }} />}>
            {comments.map((item) => {
              const position = positionLabel(item.pageNumber, item.scrollPosition);

              return (
                <Box key={item.id}>
                  {position || item.createdAt ? (
                    <Typography variant="caption" sx={{ color: 'rgba(92,64,48,0.85)', fontWeight: 600 }}>
                      {position}
                      {position && item.createdAt ? ' · ' : ''}
                      {item.createdAt ? fDateTime(item.createdAt) : ''}
                    </Typography>
                  ) : null}
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.75,
                      color: 'rgba(45,26,18,0.88)',
                      lineHeight: 1.75,
                      fontStyle: 'italic',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    “{item.comment}”
                  </Typography>
                  {entry.kind === 'ebook' &&
                  (item.pageNumber != null || item.scrollPosition != null) ? (
                    <Button
                      size="small"
                      onClick={() =>
                        openReader({
                          pageNumber: item.pageNumber,
                          scrollPosition: item.scrollPosition,
                        })
                      }
                      sx={{
                        mt: 0.5,
                        px: 0,
                        minWidth: 0,
                        textTransform: 'none',
                        fontWeight: 700,
                        color: '#2d1a12',
                      }}
                    >
                      Go to position
                    </Button>
                  ) : null}
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {entry.kind === 'ebook' ? (
        <BookshelfEbookViewDialog
          open={readerOpen}
          ebook={entry.item}
          customerId={readerCustomerId}
          initialPageNumber={readerTarget?.pageNumber}
          initialScrollPosition={readerTarget?.scrollPosition}
          onClose={closeReader}
        />
      ) : null}
    </Stack>
  );
}
