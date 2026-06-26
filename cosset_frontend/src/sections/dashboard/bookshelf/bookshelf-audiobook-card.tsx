'use client';

import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/dashboard/iconify';

import { getAudiobookFileTypeLabel, resolveAudiobookAssetUrl } from './bookshelf-audiobook-utils';
import { BOOK_CATEGORY_OPTIONS, getBookCategoryLabel, isBookFavorite } from './bookshelf-book-categories';
import { formatBorrowExpiryDate } from './bookshelf-borrow-config';

// ----------------------------------------------------------------------

type Props = {
  audiobook: IBookshelfAudiobook;
  canManage?: boolean;
  onListen?: (audiobook: IBookshelfAudiobook) => void;
  onEdit?: (audiobook: IBookshelfAudiobook) => void;
  onDelete?: (audiobook: IBookshelfAudiobook) => void;
  onCategoryChange?: (audiobook: IBookshelfAudiobook, category: string) => void;
  categorySaving?: boolean;
  onFavoriteToggle?: (audiobook: IBookshelfAudiobook, isFavorite: boolean) => void;
  favoriteSaving?: boolean;
  onReturnBorrow?: (audiobook: IBookshelfAudiobook) => void;
  returningBorrow?: boolean;
};

export function BookshelfAudiobookCard({
  audiobook,
  canManage,
  onListen,
  onEdit,
  onDelete,
  onCategoryChange,
  categorySaving = false,
  onFavoriteToggle,
  favoriteSaving = false,
  onReturnBorrow,
  returningBorrow = false,
}: Props) {
  const [coverUrl, setCoverUrl] = useState('');
  const categoryLabel = getBookCategoryLabel(audiobook.category);
  const isFavorite = isBookFavorite(audiobook.isFavorite);
  const isBorrowed = !!audiobook.isBorrowed;
  const canEdit = !!canManage && !isBorrowed;

  useEffect(() => {
    let mounted = true;

    resolveAudiobookAssetUrl(audiobook.coverImage).then((url) => {
      if (mounted) {
        setCoverUrl(url);
      }
    });

    return () => {
      mounted = false;
    };
  }, [audiobook.coverImage]);

  return (
    <Card
      sx={{
        height: 1,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          pt: '100%',
          position: 'relative',
          bgcolor: 'background.neutral',
          cursor: 'pointer',
        }}
        onClick={() => onListen?.(audiobook)}
      >
        {coverUrl ? (
          <Box
            component="img"
            src={coverUrl}
            alt={audiobook.title}
            sx={{
              top: 0,
              left: 0,
              width: 1,
              height: 1,
              position: 'absolute',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              top: 0,
              left: 0,
              width: 1,
              height: 1,
              position: 'absolute',
              color: 'text.disabled',
            }}
          >
            <Iconify icon="solar:headphones-round-bold" width={44} />
          </Stack>
        )}

        <Chip
          label={getAudiobookFileTypeLabel(audiobook.fileType)}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            fontWeight: 700,
          }}
        />

        {isBorrowed ? (
          <Chip
            label="Borrowed"
            size="small"
            color="success"
            sx={{
              position: 'absolute',
              top: 8,
              right: canEdit ? 72 : 8,
              fontWeight: 700,
            }}
          />
        ) : null}

        {canEdit ? (
          <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 8, right: 8 }}>
            {onFavoriteToggle ? (
              <IconButton
                size="small"
                disabled={favoriteSaving}
                onClick={(event) => {
                  event.stopPropagation();
                  onFavoriteToggle(audiobook, !isFavorite);
                }}
                sx={{
                  bgcolor: 'background.paper',
                  color: isFavorite ? 'error.main' : 'text.secondary',
                }}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Iconify icon={isFavorite ? 'solar:heart-bold' : 'solar:heart-outline'} width={18} />
              </IconButton>
            ) : null}
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onEdit?.(audiobook);
              }}
              sx={{ bgcolor: 'background.paper' }}
            >
              <Iconify icon="solar:pen-bold" width={18} />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.(audiobook);
              }}
              sx={{ bgcolor: 'background.paper' }}
            >
              <Iconify icon="solar:trash-bin-trash-bold" width={18} />
            </IconButton>
          </Stack>
        ) : null}
      </Box>

      <Stack spacing={1} sx={{ p: 2, flexGrow: 1 }}>
        <Typography variant="subtitle1" sx={{ minHeight: 48 }}>
          {audiobook.title}
        </Typography>

        {audiobook.author ? (
          <Typography variant="body2" color="text.secondary" noWrap>
            by {audiobook.author}
            {audiobook.publishYear ? ` · ${audiobook.publishYear}` : ''}
          </Typography>
        ) : audiobook.publishYear ? (
          <Typography variant="body2" color="text.secondary" noWrap>
            Published {audiobook.publishYear}
          </Typography>
        ) : null}

        {isBorrowed ? (
          <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
            Borrowed{audiobook.borrow?.ownerName ? ` from ${audiobook.borrow.ownerName}` : ''}
            {audiobook.borrow?.borrowPeriodDays
              ? ` · ${audiobook.borrow.borrowPeriodDays}-day borrow`
              : ''}
            {audiobook.borrow?.expiresAt
              ? ` · Expires ${formatBorrowExpiryDate(audiobook.borrow.expiresAt)}`
              : ''}
          </Typography>
        ) : null}

        {audiobook.description ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 40,
            }}
          >
            {audiobook.description}
          </Typography>
        ) : null}

        {canEdit && onCategoryChange ? (
          <TextField
            select
            size="small"
            label="Category"
            value={audiobook.category || ''}
            onChange={(event) => onCategoryChange(audiobook, event.target.value)}
            disabled={categorySaving}
            onClick={(event) => event.stopPropagation()}
            sx={{ mt: 0.5 }}
            fullWidth
          >
            <MenuItem value="">None</MenuItem>
            {BOOK_CATEGORY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ) : categoryLabel ? (
          <Chip
            size="small"
            label={categoryLabel}
            sx={{ alignSelf: 'flex-start' }}
          />
        ) : null}

        <Box sx={{ mt: 'auto', pt: 1 }}>
          <Stack spacing={1}>
            <Button
              size="small"
              variant="contained"
              startIcon={<Iconify icon="solar:play-circle-bold" />}
              onClick={() => onListen?.(audiobook)}
              fullWidth
            >
              Listen
            </Button>

            {isBorrowed && onReturnBorrow ? (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                disabled={returningBorrow}
                startIcon={<Iconify icon="solar:undo-left-round-bold" width={18} />}
                onClick={() => onReturnBorrow(audiobook)}
                fullWidth
              >
                {returningBorrow ? 'Returning...' : 'Return audiobook'}
              </Button>
            ) : null}
          </Stack>
        </Box>
      </Stack>
    </Card>
  );
}
