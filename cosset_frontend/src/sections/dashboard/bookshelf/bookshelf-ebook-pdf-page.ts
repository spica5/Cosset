const PAGE_HASH_PATTERN = /page=(\d+)/i;

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
