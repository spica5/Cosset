'use client';

import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/dashboard/iconify';

import { formatBorrowExpiryDate } from './bookshelf-borrow-config';
import { getEbookFileTypeLabel, resolveEbookAssetUrl } from './bookshelf-ebook-utils';
import { BOOK_CATEGORY_OPTIONS, getBookCategoryLabel, isBookFavorite } from './bookshelf-book-categories';

// ----------------------------------------------------------------------

type Props = {
  ebook: IBookshelfEbook;
  canManage?: boolean;
  onView?: (ebook: IBookshelfEbook) => void;
  onEdit?: (ebook: IBookshelfEbook) => void;
  onDelete?: (ebook: IBookshelfEbook) => void;
  onCategoryChange?: (ebook: IBookshelfEbook, category: string) => void;
  categorySaving?: boolean;
  onFavoriteToggle?: (ebook: IBookshelfEbook, isFavorite: boolean) => void;
  favoriteSaving?: boolean;
  onReturnBorrow?: (ebook: IBookshelfEbook) => void;
  returningBorrow?: boolean;
};

export function BookshelfEbookCard({
  ebook,
  canManage,
  onView,
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
  const categoryLabel = getBookCategoryLabel(ebook.category);
  const isFavorite = isBookFavorite(ebook.isFavorite);
  const isBorrowed = !!ebook.isBorrowed;
  const canEdit = !!canManage && !isBorrowed;

  useEffect(() => {
    let mounted = true;

    resolveEbookAssetUrl(ebook.coverImage).then((url) => {
      if (mounted) {
        setCoverUrl(url);
      }
    });

    return () => {
      mounted = false;
    };
  }, [ebook.coverImage]);

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
          pt: '140%',
          position: 'relative',
          bgcolor: 'background.neutral',
          cursor: 'pointer',
        }}
        onClick={() => onView?.(ebook)}
      >
        {coverUrl ? (
          <Box
            component="img"
            src={coverUrl}
            alt={ebook.title}
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
            <Iconify
              icon={ebook.fileType === 'txt' ? 'solar:document-text-bold' : 'solar:document-bold'}
              width={40}
            />
          </Stack>
        )}

        <Chip
          label={getEbookFileTypeLabel(ebook.fileType)}
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
                  onFavoriteToggle(ebook, !isFavorite);
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
                onEdit?.(ebook);
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
                onDelete?.(ebook);
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
          {ebook.title}
        </Typography>

        {ebook.author ? (
          <Typography variant="body2" color="text.secondary" noWrap>
            by {ebook.author}
            {ebook.publishYear ? ` · ${ebook.publishYear}` : ''}
          </Typography>
        ) : ebook.publishYear ? (
          <Typography variant="body2" color="text.secondary" noWrap>
            Published {ebook.publishYear}
          </Typography>
        ) : null}

        {isBorrowed ? (
          <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
            Borrowed{ebook.borrow?.ownerName ? ` from ${ebook.borrow.ownerName}` : ''}
            {ebook.borrow?.borrowPeriodDays
              ? ` · ${ebook.borrow.borrowPeriodDays}-day borrow`
              : ''}
            {ebook.borrow?.expiresAt
              ? ` · Expires ${formatBorrowExpiryDate(ebook.borrow.expiresAt)}`
              : ''}
          </Typography>
        ) : null}

        {ebook.description ? (
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
            {ebook.description}
          </Typography>
        ) : null}

        {canEdit && onCategoryChange ? (
          <TextField
            select
            size="small"
            label="Category"
            value={ebook.category || ''}
            onChange={(event) => onCategoryChange(ebook, event.target.value)}
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
              startIcon={<Iconify icon="solar:eye-bold" />}
              onClick={() => onView?.(ebook)}
              fullWidth
            >
              View
            </Button>

            {isBorrowed && onReturnBorrow ? (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                disabled={returningBorrow}
                startIcon={<Iconify icon="solar:undo-left-round-bold" width={18} />}
                onClick={() => onReturnBorrow(ebook)}
                fullWidth
              >
                {returningBorrow ? 'Returning...' : 'Return book'}
              </Button>
            ) : null}
          </Stack>
        </Box>
      </Stack>
    </Card>
  );
}
