'use client';

import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

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

import { revalidateBookshelfEbookReadingCounts } from 'src/actions/bookshelf-ebook-reading';

import {
  resolveEbookContentUrl,
  getEbookFileTypeLabel,
} from './bookshelf-ebook-utils';
import { BookshelfEbookReaderPanel } from './bookshelf-ebook-reader-panel';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  ebook: IBookshelfEbook | null;
  customerId?: string | number | null;
  onClose: () => void;
};

export function BookshelfEbookViewDialog({ open, ebook, customerId, onClose }: Props) {
  const [fileUrl, setFileUrl] = useState('');
  const [txtContent, setTxtContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [readerToolsOpen, setReaderToolsOpen] = useState(true);
  const txtScrollRef = useRef<HTMLDivElement | null>(null);

  const normalizedCustomerId = customerId != null ? String(customerId).trim() : '';
  const canUseReaderTools = Boolean(normalizedCustomerId && ebook);

  const handleClose = () => {
    if (ebook && normalizedCustomerId) {
      revalidateBookshelfEbookReadingCounts(normalizedCustomerId, ebook.id);
    }
    onClose();
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!open || !ebook) {
        setFileUrl('');
        setTxtContent('');
        setError('');
        setCurrentPage(1);
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
        setCurrentPage(1);

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

  const pdfSrc = useMemo(() => {
    if (!fileUrl || ebook?.fileType !== 'pdf') {
      return '';
    }

    const base = fileUrl.split('#')[0];
    return `${base}#page=${currentPage}`;
  }, [currentPage, ebook?.fileType, fileUrl]);

  const handleJumpToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, page));
  }, []);

  const handleJumpToScrollPosition = useCallback((position: number) => {
    const container = txtScrollRef.current;
    if (!container) {
      return;
    }

    const maxScroll = container.scrollHeight - container.clientHeight;
    container.scrollTop = Math.round((Math.max(0, Math.min(100, position)) / 100) * maxScroll);
  }, []);

  if (!ebook) {
    return null;
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xl" fullScreen={ebook.fileType === 'pdf'}>
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {ebook.title}
          </Typography>

          {canUseReaderTools ? (
            <Button
              size="small"
              variant={readerToolsOpen ? 'contained' : 'outlined'}
              startIcon={<Iconify icon="solar:bookmark-bold" />}
              onClick={() => setReaderToolsOpen((value) => !value)}
              sx={{ mr: 5 }}
            >
              {readerToolsOpen ? 'Hide tools' : 'Bookmarks & comments'}
            </Button>
          ) : null}

          <IconButton onClick={handleClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          <Typography variant="caption" sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'action.selected' }}>
            {getEbookFileTypeLabel(ebook.fileType)}
          </Typography>
          {ebook.author ? (
            <Typography variant="body2" color="text.secondary">
              by {ebook.author}
              {ebook.publishYear ? ` · ${ebook.publishYear}` : ''}
            </Typography>
          ) : ebook.publishYear ? (
            <Typography variant="body2" color="text.secondary">
              Published {ebook.publishYear}
            </Typography>
          ) : null}
        </Stack>
      </DialogTitle>

      <DialogContent
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          height: ebook.fileType === 'pdf' ? 'calc(100dvh - 96px)' : 'auto',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            p: { xs: 2, md: 3 },
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {ebook.description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
              {ebook.description}
            </Typography>
          ) : null}

          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 8, flex: 1 }}>
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
          ) : ebook.fileType === 'pdf' && pdfSrc ? (
            <Box
              component="iframe"
              key={pdfSrc}
              src={pdfSrc}
              title={ebook.title}
              sx={{
                width: 1,
                flex: 1,
                minHeight: { xs: '60dvh', md: 'calc(100dvh - 180px)' },
                border: 'none',
                borderRadius: 1,
                bgcolor: 'background.neutral',
              }}
            />
          ) : ebook.fileType === 'txt' ? (
            <Box
              ref={txtScrollRef}
              sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: 'background.neutral',
                flex: 1,
                minHeight: { xs: '50dvh', md: '70dvh' },
                maxHeight: { xs: '50dvh', md: 'calc(100dvh - 180px)' },
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
        </Box>

        {canUseReaderTools && readerToolsOpen ? (
          <BookshelfEbookReaderPanel
            bookId={ebook.id}
            customerId={normalizedCustomerId}
            fileType={ebook.fileType}
            currentPage={currentPage}
            onCurrentPageChange={setCurrentPage}
            onJumpToPage={handleJumpToPage}
            onJumpToScrollPosition={handleJumpToScrollPosition}
            txtScrollRef={txtScrollRef}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
