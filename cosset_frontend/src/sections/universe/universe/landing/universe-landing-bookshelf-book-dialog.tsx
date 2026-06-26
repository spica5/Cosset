'use client';

import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';
import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

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
import { useDesignSpaceTheme } from './design-space-theme-context';

// ----------------------------------------------------------------------

type BookshelfEntry =
  | { kind: 'ebook'; item: IBookshelfEbook }
  | { kind: 'audiobook'; item: IBookshelfAudiobook };

type Props = {
  open: boolean;
  entry: BookshelfEntry | null;
  onClose: () => void;
};

const formatBookDate = (value?: string | Date | null) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();

  return `${day}/${month}/${year}`;
};

export function UniverseLandingBookshelfBookDialog({ open, entry, onClose }: Props) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadCover = async () => {
      if (!open || !entry?.item.coverImage) {
        setCoverUrl('');
        return;
      }

      const resolveCover =
        entry.kind === 'audiobook' ? resolveAudiobookAssetUrl : resolveEbookAssetUrl;
      const url = await resolveCover(entry.item.coverImage);

      if (mounted) {
        setCoverUrl(url);
      }
    };

    loadCover();

    return () => {
      mounted = false;
    };
  }, [entry, open]);

  if (!entry) {
    return null;
  }

  const title = (entry.item.title || '').trim() || `Book #${entry.item.id}`;
  const description = (entry.item.description || '').trim();
  const fileTypeLabel =
    entry.kind === 'ebook'
      ? getEbookFileTypeLabel(entry.item.fileType)
      : getAudiobookFileTypeLabel(entry.item.fileType);
  const categoryLabel = getBookCategoryLabel(entry.item.category);
  const createdLabel = formatBookDate(entry.item.createdAt);
  const isAudiobook = entry.kind === 'audiobook';

  const handleOpenContent = async () => {
    const resolver = isAudiobook ? resolveAudiobookContentUrl : resolveEbookContentUrl;
    const url = await resolver(entry.item);

    if (url && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      PaperProps={{
        sx: {
          width: 1,
          maxWidth: { xs: 1, sm: 720, md: 960, lg: 1080 },
          maxHeight: '90vh',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle sx={{ pr: 6, flexShrink: 0, px: { xs: 2, md: 4 }, py: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" component="span">
          {title}
        </Typography>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 2, md: 4 },
          py: { xs: 2, md: 3 },
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 3, md: 4 }}
          sx={{ flex: 1, minHeight: 0, alignItems: 'stretch' }}
        >
          {coverUrl ? (
            <Box
              sx={{
                width: { xs: 1, sm: 300, md: 320 },
                maxWidth: { xs: 360, md: 360 },
                flexShrink: 0,
                alignSelf: { md: 'flex-start' },
                minHeight: { xs: 280, md: 0 },
                height: { xs: 280, md: 400 },
                maxHeight: { md: 420 },
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: 'background.neutral',
                borderRadius: 2,
                border: `1px solid ${spaceTheme.border}`,
                p: 1.5,
                overflow: 'hidden',
              }}
            >
              <Box
                component="img"
                src={coverUrl}
                alt={title}
                sx={{
                  display: 'block',
                  width: 1,
                  height: 1,
                  maxWidth: 1,
                  maxHeight: 1,
                  objectFit: 'contain',
                }}
              />
            </Box>
          ) : null}

          <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'auto' }}>
            {entry.item.author ? (
              <Typography variant="body2" color="text.secondary">
                by {entry.item.author}
              </Typography>
            ) : null}

            <Stack spacing={1.25}>
              <Stack direction="row" spacing={2}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 108, flexShrink: 0 }}>
                  Category
                </Typography>
                <Typography variant="body2" color={categoryLabel ? 'text.primary' : 'text.disabled'}>
                  {categoryLabel || '—'}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={2}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 108, flexShrink: 0 }}>
                  Publish year
                </Typography>
                <Typography
                  variant="body2"
                  color={entry.item.publishYear != null ? 'text.primary' : 'text.disabled'}
                >
                  {entry.item.publishYear ?? '—'}
                </Typography>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Typography variant="caption" sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'action.selected' }}>
                {isAudiobook ? 'Audio-book' : 'E-book'}
              </Typography>
              <Typography variant="caption" sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'action.hover' }}>
                {fileTypeLabel}
              </Typography>
              {createdLabel ? (
                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Added {createdLabel}
                </Typography>
              ) : null}
            </Stack>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Description
              </Typography>
              <Typography
                variant="body2"
                color={description ? 'text.secondary' : 'text.disabled'}
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.7,
                }}
              >
                {description || 'No description yet.'}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, md: 4 }, py: 2, flexShrink: 0 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button
          variant="contained"
          onClick={handleOpenContent}
          startIcon={
            <Iconify icon={isAudiobook ? 'solar:play-circle-bold' : 'solar:eye-bold'} width={18} />
          }
          sx={{
            bgcolor: spaceTheme.accent,
            '&:hover': { bgcolor: spaceTheme.accentHover },
          }}
        >
          {isAudiobook ? 'Listen' : 'Read'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
