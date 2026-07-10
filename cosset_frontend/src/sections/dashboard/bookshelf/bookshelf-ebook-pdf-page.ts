const PAGE_HASH_PATTERN = /page=(\d+)/i;

export function shouldUseEmbeddedPdfViewer(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  return !isIos;
}

export function normalizePageNumber(value: unknown, fallback = 1): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value));
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(1, parsed);
    }
  }

  return fallback;
}

export function buildPdfViewerSrc(baseUrl: string, page: number): string {
  const base = baseUrl.split('#')[0];
  const nextPage = normalizePageNumber(page);
  return `${base}#page=${nextPage}&view=FitH`;
}

export function setPdfIframePage(iframe: HTMLIFrameElement | null, page: number): boolean {
  const nextPage = normalizePageNumber(page);

  if (!iframe) {
    return false;
  }

  try {
    const viewerWindow = iframe.contentWindow as Window & {
      PDFViewerApplication?: {
        page: number;
        linkService?: { goToPage: (pageNumber: number) => void };
      };
    };
    const viewer = viewerWindow?.PDFViewerApplication;

    if (viewer) {
      if (viewer.linkService?.goToPage) {
        viewer.linkService.goToPage(nextPage);
      } else {
        viewer.page = nextPage;
      }
      return true;
    }
  } catch {
    // Cross-origin iframe access is blocked.
  }

  try {
    const {contentWindow} = iframe;
    const targetHash = `page=${nextPage}`;
    if (contentWindow && contentWindow.location.hash.replace(/^#/, '') !== targetHash) {
      contentWindow.location.hash = targetHash;
      return true;
    }
  } catch {
    // Cross-origin iframe access is blocked.
  }

  return false;
}

export function parsePdfPageFromHash(hash: string): number | null {
  const match = hash.match(PAGE_HASH_PATTERN);
  if (!match) {
    return null;
  }

  const page = Number.parseInt(match[1], 10);
  return Number.isFinite(page) && page >= 1 ? page : null;
}

export function readPdfPageFromIframe(iframe: HTMLIFrameElement | null): number | null {
  if (!iframe) {
    return null;
  }

  try {
    const hashPage = parsePdfPageFromHash(iframe.contentWindow?.location.hash || '');
    if (hashPage) {
      return hashPage;
    }
  } catch {
    // Cross-origin iframe access is blocked.
  }

  try {
    const viewer = (iframe.contentWindow as Window & {
      PDFViewerApplication?: { page?: number };
    })?.PDFViewerApplication;

    if (viewer?.page && viewer.page >= 1) {
      return viewer.page;
    }
  } catch {
    // Cross-origin iframe access is blocked.
  }

  return parsePdfPageFromHash(iframe.src.split('#')[1] || '');
}
