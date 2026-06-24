'use client';

import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';

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
  resolveEbookContentUrl,
  getEbookFileTypeLabel,
} from './bookshelf-ebook-utils';
import { getBookCategoryLabel } from './bookshelf-book-categories';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  ebook: IBookshelfEbook | null;
  onClose: () => void;
};

export function BookshelfEbookViewDialog({ open, ebook, onClose }: Props) {
  const [fileUrl, setFileUrl] = useState('');
  const [txtContent, setTxtContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!open || !ebook) {
        setFileUrl('');
        setTxtContent('');
        setError('');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const resolvedUrl = await resolveEbookContentUrl(ebook);

        if (!mounted) {
          return;
        }

        setFileUrl(resolvedUrl);

        if (ebook.fileType === 'txt' && resolvedUrl) {
          const response = await fetch(resolvedUrl);
          if (!response.ok) {
            throw new Error('Could not load text file.');
          }
          const text = await response.text();
          if (mounted) {
            setTxtContent(text);
          }
        } else if (mounted) {
          setTxtContent('');
        }
      } catch (loadError) {
        console.error('Failed to load e-book:', loadError);
        if (mounted) {
          setError('Could not load this e-book. Try downloading it instead.');
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
  }, [ebook, open]);

  if (!ebook) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" fullScreen={ebook.fileType === 'pdf'}>
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {ebook.title}
          </Typography>
          <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          <Typography variant="caption" sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'action.selected' }}>
            {getEbookFileTypeLabel(ebook.fileType)}
          </Typography>
          {getBookCategoryLabel(ebook.category) ? (
            <Typography variant="caption" sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'action.hover' }}>
              {getBookCategoryLabel(ebook.category)}
            </Typography>
          ) : null}
          {ebook.author ? (
            <Typography variant="body2" color="text.secondary">
              by {ebook.author}
            </Typography>
          ) : null}
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, md: 3 }, height: ebook.fileType === 'pdf' ? 'calc(100dvh - 96px)' : 'auto' }}>
        {ebook.description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
            {ebook.description}
          </Typography>
        ) : null}

        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : error ? (
          <Stack spacing={2} alignItems="flex-start">
            <Typography color="error">{error}</Typography>
            {fileUrl ? (
              <Button
                component="a"
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                startIcon={<Iconify icon="mingcute:download-line" />}
              >
                Download file
              </Button>
            ) : null}
          </Stack>
        ) : ebook.fileType === 'pdf' && fileUrl ? (
          <Box
            component="iframe"
            src={fileUrl}
            title={ebook.title}
            sx={{
              width: 1,
              height: 1,
              minHeight: { xs: '70dvh', md: '75dvh' },
              border: 'none',
              borderRadius: 1,
              bgcolor: 'background.neutral',
            }}
          />
        ) : ebook.fileType === 'txt' ? (
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: 'background.neutral',
              maxHeight: '70dvh',
              overflow: 'auto',
            }}
          >
            <Typography
              component="pre"
              variant="body2"
              sx={{
                m: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'inherit',
              }}
            >
              {txtContent || 'This text file is empty.'}
            </Typography>
          </Box>
        ) : null}

        {fileUrl ? (
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button
              component="a"
              href={fileUrl}
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
