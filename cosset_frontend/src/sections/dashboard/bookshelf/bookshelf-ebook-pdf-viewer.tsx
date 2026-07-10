'use client';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { BookshelfEbookPdfCanvasViewer } from 'src/sections/dashboard/bookshelf/bookshelf-ebook-pdf-canvas-viewer';

import {
  setPdfIframePage,
  buildPdfViewerSrc,
  normalizePageNumber,
  readPdfPageFromIframe,
  shouldUseEmbeddedPdfViewer,
} from './bookshelf-ebook-pdf-page';

// ----------------------------------------------------------------------

type BaseViewerProps = {
  url: string;
  page: number;
  title: string;
  onPageChange?: (page: number) => void;
};

type ViewerProps = BaseViewerProps & {
  onPageRendered?: (page: number) => void;
};

function PdfViewerPlaceholder() {
  return (
    <Box
      sx={{
        width: 1,
        flex: 1,
        minHeight: { xs: '60dvh', md: 'calc(100dvh - 180px)' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 1,
        bgcolor: 'background.neutral',
      }}
    >
      <CircularProgress size={28} />
    </Box>
  );
}

function EmbeddedPdfViewer({ url, page, title, onPageChange }: BaseViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const skipPollUntilRef = useRef(0);
  const [iframePage, setIframePage] = useState(() => normalizePageNumber(page));
  const [frameKey, setFrameKey] = useState(0);

  useEffect(() => {
    const nextPage = normalizePageNumber(page);
    setIframePage(nextPage);
    skipPollUntilRef.current = Date.now() + 2000;

    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    if (!setPdfIframePage(iframe, nextPage)) {
      setFrameKey((key) => key + 1);
    }
  }, [page]);

  const handleLoad = () => {
    const nextPage = normalizePageNumber(iframePage);
    setPdfIframePage(iframeRef.current, nextPage);
    skipPollUntilRef.current = Date.now() + 1500;
    onPageChange?.(nextPage);
  };

  useEffect(() => {
    const syncPageFromViewer = () => {
      if (Date.now() < skipPollUntilRef.current) {
        return;
      }

      const detectedPage = readPdfPageFromIframe(iframeRef.current);
      if (!detectedPage) {
        return;
      }

      onPageChange?.(detectedPage);
    };

    const intervalId = window.setInterval(syncPageFromViewer, 500);
    window.addEventListener('focus', syncPageFromViewer);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncPageFromViewer);
    };
  }, [onPageChange]);

  return (
    <Box
      component="iframe"
      key={`pdf-embedded-${frameKey}`}
      ref={iframeRef}
      src={buildPdfViewerSrc(url, iframePage)}
      title={title}
      onLoad={handleLoad}
      sx={{
        width: 1,
        flex: 1,
        minHeight: { xs: '60dvh', md: 'calc(100dvh - 180px)' },
        border: 'none',
        borderRadius: 1,
        bgcolor: 'background.neutral',
      }}
    />
  );
}

export function BookshelfEbookPdfViewer({
  url,
  page,
  title,
  onPageChange,
  onPageRendered,
}: ViewerProps) {
  const [useEmbeddedViewer, setUseEmbeddedViewer] = useState<boolean | null>(null);

  useEffect(() => {
    setUseEmbeddedViewer(shouldUseEmbeddedPdfViewer());
  }, []);

  if (useEmbeddedViewer === null) {
    return <PdfViewerPlaceholder />;
  }

  if (useEmbeddedViewer) {
    return (
      <EmbeddedPdfViewer
        url={url}
        page={page}
        title={title}
        onPageChange={onPageChange}
      />
    );
  }

  return (
    <BookshelfEbookPdfCanvasViewer
      url={url}
      page={page}
      title={title}
      onPageRendered={onPageRendered ?? onPageChange}
    />
  );
}
