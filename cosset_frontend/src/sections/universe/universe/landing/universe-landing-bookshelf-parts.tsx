'use client';

import type { IBookshelfBorrow } from 'src/types/bookshelf-borrow';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/universe/iconify';

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
  getEntryKey,
  getEntryTitle,
  filterBookshelfItems,
} from './universe-landing-bookshelf-utils';

export type { BookshelfItem } from './universe-landing-bookshelf-utils';
export {
  SHELF_COUNT,
  BOOKS_PER_SHELF,
  getEntryKey,
  getEntryTitle,
  filterBookshelfItems,
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
  onSelect: (entry: BookshelfItem) => void;
};

export function BookshelfBookCover({
  entry,
  active,
  variant = 'default',
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

  return (
    <Box
      onClick={() => onSelect(entry)}
      sx={{
        position: 'relative',
        width: { xs: 56, sm: 68, md: isThemed ? 96 : 112 },
        flexShrink: 0,
        cursor: 'pointer',
        transform: active ? 'translateY(-6px) scale(1.04)' : 'none',
        transition: 'transform 0.2s ease',
      }}
    >
      <Box
        sx={{
          pt: '140%',
          borderRadius: isThemed ? 1 : 0.5,
          position: 'relative',
          overflow: 'hidden',
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
      </Box>

      <Box sx={{ mt: 0.5, minHeight: { xs: 22, sm: 24, md: 28 } }}>
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
