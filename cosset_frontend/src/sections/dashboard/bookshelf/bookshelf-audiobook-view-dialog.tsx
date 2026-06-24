'use client';

import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/dashboard/iconify';

import {
  resolveAudiobookAssetUrl,
  resolveAudiobookContentUrl,
  getAudiobookFileTypeLabel,
} from './bookshelf-audiobook-utils';
import { getBookCategoryLabel } from './bookshelf-book-categories';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  audiobook: IBookshelfAudiobook | null;
  onClose: () => void;
};

export function BookshelfAudiobookViewDialog({ open, audiobook, onClose }: Props) {
  const [audioUrl, setAudioUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!open || !audiobook) {
        setAudioUrl('');
        setCoverUrl('');
        setError('');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [resolvedAudioUrl, resolvedCoverUrl] = await Promise.all([
          resolveAudiobookContentUrl(audiobook),
          resolveAudiobookAssetUrl(audiobook.coverImage),
        ]);

        if (!mounted) {
          return;
        }

        if (!resolvedAudioUrl) {
          throw new Error('Could not resolve audio file.');
        }

        setAudioUrl(resolvedAudioUrl);
        setCoverUrl(resolvedCoverUrl);
      } catch (loadError) {
        console.error('Failed to load audio-book:', loadError);
        if (mounted) {
          setError('Could not load this audio-book. Try downloading it instead.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [audiobook, open]);

  if (!audiobook) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {audiobook.title}
          </Typography>
          <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          <Typography variant="caption" sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'action.selected' }}>
            {getAudiobookFileTypeLabel(audiobook.fileType)}
          </Typography>
          {getBookCategoryLabel(audiobook.category) ? (
            <Typography variant="caption" sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'action.hover' }}>
              {getBookCategoryLabel(audiobook.category)}
            </Typography>
          ) : null}
          {audiobook.author ? (
            <Typography variant="body2" color="text.secondary">
              by {audiobook.author}
            </Typography>
          ) : null}
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
        {coverUrl ? (
          <Box
            component="img"
            src={coverUrl}
            alt={audiobook.title}
            sx={{
              width: 160,
              height: 160,
              objectFit: 'cover',
              borderRadius: 1,
              mx: 'auto',
              display: 'block',
              mb: 2,
              boxShadow: 2,
            }}
          />
        ) : null}

        {audiobook.description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
            {audiobook.description}
          </Typography>
        ) : null}

        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : error ? (
          <Stack spacing={2} alignItems="flex-start">
            <Typography color="error">{error}</Typography>
            {audioUrl ? (
              <Button
                component="a"
                href={audioUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                startIcon={<Iconify icon="mingcute:download-line" />}
              >
                Download audio
              </Button>
            ) : null}
          </Stack>
        ) : audioUrl ? (
          <Box
            component="audio"
            controls
            src={audioUrl}
            sx={{
              width: 1,
              mt: 1,
            }}
          />
        ) : null}

        {audioUrl ? (
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button
              component="a"
              href={audioUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              startIcon={<Iconify icon="mingcute:download-line" />}
            >
              Download
            </Button>
          </Stack>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
