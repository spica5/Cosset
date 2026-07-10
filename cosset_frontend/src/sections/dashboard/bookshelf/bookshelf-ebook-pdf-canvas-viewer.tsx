'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  version,
  getDocument,
  type RenderTask,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from 'pdfjs-dist';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { normalizePageNumber } from './bookshelf-ebook-pdf-page';

// ----------------------------------------------------------------------

GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

type Props = {
  url: string;
  page: number;
  title: string;
  onPageRendered?: (page: number) => void;
};

function isRenderingCancelled(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'RenderingCancelledException' ||
    error.message.toLowerCase().includes('rendering cancelled')
  );
}

async function loadPdfDocument(url: string): Promise<PDFDocumentProxy> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF (${response.status})`);
    }

    const data = await response.arrayBuffer();
    return await getDocument({ data }).promise;
  } catch {
    return getDocument({ url }).promise;
  }
}

export function BookshelfEbookPdfCanvasViewer({ url, page, title, onPageRendered }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const renderRequestIdRef = useRef(0);
  const resizeTimerRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [containerWidth, setContainerWidth] = useState(0);

  const renderPage = useCallback(
    async (pdf: PDFDocumentProxy, pageNumber: number, width: number) => {
      const container = containerRef.current;
      if (!container || width <= 0) {
        return;
      }

      const requestId = renderRequestIdRef.current + 1;
      renderRequestIdRef.current = requestId;

      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;

      const nextPage = normalizePageNumber(pageNumber, 1);
      const boundedPage = Math.min(nextPage, pdf.numPages);

      try {
        const pdfPage = await pdf.getPage(boundedPage);
        if (requestId !== renderRequestIdRef.current) {
          return;
        }

        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const scale = Math.max(width, 320) / baseViewport.width;
        const viewport = pdfPage.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          throw new Error('Could not create PDF canvas context');
        }

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvas.style.display = 'block';
        canvas.setAttribute('aria-label', `${title} page ${boundedPage}`);

        container.replaceChildren(canvas);

        const renderTask = pdfPage.render({
          canvasContext: context,
          viewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;

        if (requestId !== renderRequestIdRef.current) {
          return;
        }

        onPageRendered?.(boundedPage);
      } catch (renderError) {
        if (isRenderingCancelled(renderError) || requestId !== renderRequestIdRef.current) {
          return;
        }

        throw renderError;
      }
    },
    [onPageRendered, title],
  );

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');
    renderRequestIdRef.current += 1;
    renderTaskRef.current?.cancel();
    renderTaskRef.current = null;
    pdfRef.current?.destroy();
    pdfRef.current = null;

    loadPdfDocument(url)
      .then((pdf) => {
        if (cancelled) {
          pdf.destroy();
          return;
        }

        pdfRef.current = pdf;
        setLoading(false);
      })
      .catch((loadError) => {
        console.error('Failed to load PDF:', loadError);
        if (!cancelled) {
          setError('Could not load this PDF in the reader.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      renderRequestIdRef.current += 1;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      pdfRef.current?.destroy();
      pdfRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || loading) {
      return undefined;
    }

    const updateWidth = () => {
      const nextWidth = Math.floor(container.clientWidth);
      if (nextWidth <= 0) {
        return;
      }

      setContainerWidth((previousWidth) =>
        Math.abs(previousWidth - nextWidth) < 2 ? previousWidth : nextWidth,
      );
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      if (resizeTimerRef.current != null) {
        window.clearTimeout(resizeTimerRef.current);
      }

      resizeTimerRef.current = window.setTimeout(() => {
        resizeTimerRef.current = null;
        updateWidth();
      }, 150);
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (resizeTimerRef.current != null) {
        window.clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
    };
  }, [loading]);

  useEffect(() => {
    const pdf = pdfRef.current;
    if (!pdf || loading || containerWidth <= 0) {
      return undefined;
    }

    let cancelled = false;

    renderPage(pdf, page, containerWidth).catch((renderError) => {
      if (cancelled || isRenderingCancelled(renderError)) {
        return;
      }

      console.error('Failed to render PDF page:', renderError);
      setError('Could not display this PDF page.');
    });

    return () => {
      cancelled = true;
      renderRequestIdRef.current += 1;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [containerWidth, loading, page, renderPage]);

  return (
    <Box
      sx={{
        width: 1,
        flex: 1,
        minHeight: { xs: '60dvh', md: 'calc(100dvh - 180px)' },
        borderRadius: 1,
        bgcolor: 'background.neutral',
        overflow: 'auto',
        position: 'relative',
      }}
    >
      {loading ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 8, minHeight: 240 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : null}

      {error ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 8, px: 2, minHeight: 240 }}>
          <Typography color="error" textAlign="center">
            {error}
          </Typography>
        </Stack>
      ) : null}

      <Box
        ref={containerRef}
        sx={{
          width: 1,
          minHeight: loading || error ? 0 : 240,
          visibility: loading || error ? 'hidden' : 'visible',
          position: loading || error ? 'absolute' : 'relative',
          pointerEvents: loading || error ? 'none' : 'auto',
        }}
      />
    </Box>
  );
}
