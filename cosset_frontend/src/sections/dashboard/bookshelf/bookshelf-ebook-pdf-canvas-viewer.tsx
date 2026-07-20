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

import axiosInstance, { endpoints } from 'src/utils/axios';

import { normalizePageNumber } from './bookshelf-ebook-pdf-page';

// ----------------------------------------------------------------------

const LOCAL_PDF_WORKER_SRC = '/pdf/pdf.worker.min.mjs';
const CDN_PDF_WORKER_SRC = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
const PAGE_GAP_PX = 8;
const PAGE_ESTIMATE_RATIO = 1.414;

GlobalWorkerOptions.workerSrc = LOCAL_PDF_WORKER_SRC || CDN_PDF_WORKER_SRC;

type Props = {
  url: string;
  storageKey?: string;
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

async function loadPdfFromData(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  return getDocument({ data, disableFontFace: true }).promise;
}

async function fetchPdfBytesViaProxy(storageKey: string): Promise<ArrayBuffer> {
  const response = await axiosInstance.get(endpoints.upload.file, {
    params: { key: storageKey },
    responseType: 'arraybuffer',
  });

  return response.data as ArrayBuffer;
}

async function fetchPdfBytesFromUrl(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch PDF (${response.status})`);
  }

  return response.arrayBuffer();
}

async function loadPdfDocument(url: string, storageKey?: string): Promise<PDFDocumentProxy> {
  const errors: unknown[] = [];

  if (storageKey) {
    try {
      const data = await fetchPdfBytesViaProxy(storageKey);
      return await loadPdfFromData(data);
    } catch (error) {
      errors.push(error);
    }
  }

  if (url) {
    try {
      const data = await fetchPdfBytesFromUrl(url);
      return await loadPdfFromData(data);
    } catch (error) {
      errors.push(error);
    }

    try {
      return await getDocument({ url, disableFontFace: true }).promise;
    } catch (error) {
      errors.push(error);
    }
  }

  const lastError = errors[errors.length - 1];
  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error('Could not load PDF');
}

function getVisiblePageNumber(
  scrollContainer: HTMLElement,
  pageElements: Map<number, HTMLElement>,
): number | null {
  const containerTop = scrollContainer.scrollTop;
  const containerBottom = containerTop + scrollContainer.clientHeight;
  const containerMid = containerTop + scrollContainer.clientHeight / 3;

  let bestPage: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  pageElements.forEach((element, pageNumber) => {
    const { offsetTop, offsetHeight } = element;
    const offsetBottom = offsetTop + offsetHeight;

    if (offsetBottom < containerTop || offsetTop > containerBottom) {
      return;
    }

    const pageMid = offsetTop + offsetHeight / 2;
    const distance = Math.abs(pageMid - containerMid);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestPage = pageNumber;
    }
  });

  return bestPage;
}

export function BookshelfEbookPdfCanvasViewer({
  url,
  storageKey,
  page,
  title,
  onPageRendered,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pagesContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const pageElementsRef = useRef<Map<number, HTMLElement>>(new Map());
  const renderTasksRef = useRef<Map<number, RenderTask>>(new Map());
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const renderGenerationRef = useRef(0);
  const suppressScrollSyncRef = useRef(false);
  const scrollSyncTimerRef = useRef<number | null>(null);
  const lastReportedPageRef = useRef(1);
  const resizeTimerRef = useRef<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const cancelAllRenderTasks = useCallback(() => {
    renderTasksRef.current.forEach((task) => task.cancel());
    renderTasksRef.current.clear();
  }, []);

  const renderPageCanvas = useCallback(
    async (pdf: PDFDocumentProxy, pageNumber: number, width: number, container: HTMLElement) => {
      if (renderedPagesRef.current.has(pageNumber) && container.querySelector('canvas')) {
        return;
      }

      const generation = renderGenerationRef.current;
      const boundedPage = Math.min(normalizePageNumber(pageNumber, 1), pdf.numPages);

      renderTasksRef.current.get(boundedPage)?.cancel();

      try {
        const pdfPage = await pdf.getPage(boundedPage);
        if (generation !== renderGenerationRef.current) {
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

        renderTasksRef.current.set(boundedPage, renderTask);
        await renderTask.promise;
        renderTasksRef.current.delete(boundedPage);

        if (generation !== renderGenerationRef.current) {
          return;
        }

        renderedPagesRef.current.add(boundedPage);
      } catch (renderError) {
        renderTasksRef.current.delete(boundedPage);

        if (isRenderingCancelled(renderError) || generation !== renderGenerationRef.current) {
          return;
        }

        throw renderError;
      }
    },
    [title],
  );

  const renderVisiblePages = useCallback(async () => {
    const pdf = pdfRef.current;
    const scrollContainer = scrollRef.current;

    if (!pdf || !scrollContainer || containerWidth <= 0) {
      return;
    }

    const containerTop = scrollContainer.scrollTop;
    const containerBottom = containerTop + scrollContainer.clientHeight;
    const buffer = scrollContainer.clientHeight * 0.75;

    const pagesToRender = [...pageElementsRef.current.entries()].filter(([, element]) => {
      const top = element.offsetTop;
      const bottom = top + element.offsetHeight;
      return bottom >= containerTop - buffer && top <= containerBottom + buffer;
    });

    await Promise.all(
      pagesToRender.map(async ([pageNumber, element]) => {
        try {
          await renderPageCanvas(pdf, pageNumber, containerWidth, element);
        } catch (renderError) {
          if (!isRenderingCancelled(renderError)) {
            console.error(`Failed to render PDF page ${pageNumber}:`, renderError);
          }
        }
      }),
    );
  }, [containerWidth, renderPageCanvas]);

  const scrollToPage = useCallback((pageNumber: number, behavior: ScrollBehavior = 'smooth') => {
    const target = pageElementsRef.current.get(normalizePageNumber(pageNumber));
    const scrollContainer = scrollRef.current;

    if (!target || !scrollContainer) {
      return;
    }

    suppressScrollSyncRef.current = true;
    scrollContainer.scrollTo({
      top: target.offsetTop - PAGE_GAP_PX,
      behavior,
    });

    window.setTimeout(() => {
      suppressScrollSyncRef.current = false;
    }, behavior === 'auto' ? 0 : 350);
  }, []);

  const reportVisiblePage = useCallback(() => {
    if (suppressScrollSyncRef.current) {
      return;
    }

    const scrollContainer = scrollRef.current;
    if (!scrollContainer) {
      return;
    }

    const visiblePage = getVisiblePageNumber(scrollContainer, pageElementsRef.current);
    if (!visiblePage || visiblePage === lastReportedPageRef.current) {
      return;
    }

    lastReportedPageRef.current = visiblePage;
    onPageRendered?.(visiblePage);
  }, [onPageRendered]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');
    setNumPages(0);
    renderGenerationRef.current += 1;
    cancelAllRenderTasks();
    renderedPagesRef.current.clear();
    pageElementsRef.current.clear();
    pdfRef.current?.destroy();
    pdfRef.current = null;

    const renderedPages = renderedPagesRef.current;
    const pageElements = pageElementsRef.current;

    loadPdfDocument(url, storageKey)
      .then((pdf) => {
        if (cancelled) {
          pdf.destroy();
          return;
        }

        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
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
      renderGenerationRef.current += 1;
      cancelAllRenderTasks();
      renderedPages.clear();
      pageElements.clear();
      pdfRef.current?.destroy();
      pdfRef.current = null;
    };
  }, [cancelAllRenderTasks, storageKey, url]);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || loading) {
      return undefined;
    }

    const updateWidth = () => {
      const nextWidth = Math.floor(scrollContainer.clientWidth);
      if (nextWidth <= 0) {
        return;
      }

      setContainerWidth((previousWidth) => {
        if (Math.abs(previousWidth - nextWidth) < 2) {
          return previousWidth;
        }

        renderedPagesRef.current.clear();
        pageElementsRef.current.forEach((element) => {
          element.replaceChildren();
        });
        return nextWidth;
      });
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

    observer.observe(scrollContainer);

    return () => {
      observer.disconnect();
      if (resizeTimerRef.current != null) {
        window.clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
    };
  }, [loading]);

  useEffect(() => {
    if (loading || !numPages || containerWidth <= 0) {
      return undefined;
    }

    renderVisiblePages().catch((renderError) => {
      console.error('Failed to render visible PDF pages:', renderError);
    });

    const handleScroll = () => {
      if (scrollSyncTimerRef.current != null) {
        window.clearTimeout(scrollSyncTimerRef.current);
      }

      scrollSyncTimerRef.current = window.setTimeout(() => {
        scrollSyncTimerRef.current = null;
        renderVisiblePages().catch((renderError) => {
          console.error('Failed to render visible PDF pages:', renderError);
        });
        reportVisiblePage();
      }, 80);
    };

    const scrollContainer = scrollRef.current;
    scrollContainer?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollContainer?.removeEventListener('scroll', handleScroll);
      if (scrollSyncTimerRef.current != null) {
        window.clearTimeout(scrollSyncTimerRef.current);
        scrollSyncTimerRef.current = null;
      }
    };
  }, [containerWidth, loading, numPages, renderVisiblePages, reportVisiblePage]);

  useEffect(() => {
    if (loading || !numPages) {
      return;
    }

    const nextPage = normalizePageNumber(page);
    const scrollContainer = scrollRef.current;
    const visiblePage = scrollContainer
      ? getVisiblePageNumber(scrollContainer, pageElementsRef.current)
      : null;

    if (visiblePage === nextPage) {
      lastReportedPageRef.current = nextPage;
      return;
    }

    lastReportedPageRef.current = nextPage;
    scrollToPage(nextPage);
    renderVisiblePages().catch((renderError) => {
      console.error('Failed to render visible PDF pages:', renderError);
    });
  }, [loading, numPages, page, renderVisiblePages, scrollToPage]);

  const estimatedPageHeight = Math.max(Math.round(containerWidth * PAGE_ESTIMATE_RATIO), 420);

  return (
    <Box
      ref={scrollRef}
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

      {!loading && !error && numPages > 0 ? (
        <Stack
          ref={pagesContainerRef}
          spacing={`${PAGE_GAP_PX}px`}
          sx={{
            width: 1,
            py: 1,
          }}
        >
          {Array.from({ length: numPages }, (_, index) => {
            const pageNumber = index + 1;

            return (
              <Box
                key={pageNumber}
                data-page={pageNumber}
                ref={(element) => {
                  if (element instanceof HTMLElement) {
                    pageElementsRef.current.set(pageNumber, element);
                  } else {
                    pageElementsRef.current.delete(pageNumber);
                  }
                }}
                sx={{
                  width: 1,
                  minHeight: estimatedPageHeight,
                  bgcolor: 'background.paper',
                  borderRadius: 0.5,
                  boxShadow: (theme) => theme.shadows[1],
                  overflow: 'hidden',
                }}
              />
            );
          })}
        </Stack>
      ) : null}
    </Box>
  );
}
