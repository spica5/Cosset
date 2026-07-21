'use client';

import type { IJourneyDiaryNote } from 'src/types/journey-diary-note';
import type { IJourneyMemorialThing } from 'src/types/journey-diary-memorial-thing';
import type { IJourneyRepresentativePicture } from 'src/types/journey-diary-representative-picture';

import { useEffect, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/universe/iconify';

import { getMemorialThingCategoryLabel } from 'src/sections/dashboard/journey-diary/memorial-things-categories';

import { useDesignSpaceTheme } from './design-space-theme-context';
import { MYSPACE_ITEM_TITLE_FONT } from './myspace-section-title';
import { formatTripDateRange } from './universe-landing-journey-diary-my-journey-utils';
import { getJourneyPalette, type JourneyPalette } from './universe-landing-journey-diary-my-trips-panel';

// ----------------------------------------------------------------------

export type JourneyPictureDetailItem = IJourneyRepresentativePicture & { signedImageUrl?: string };
export type JourneyNoteDetailItem = IJourneyDiaryNote & { signedImageUrl?: string };
export type JourneyMemorialDetailItem = IJourneyMemorialThing & {
  signedImageUrl?: string;
  signedImageUrls?: string[];
};

export type JourneyDiaryDetailState =
  | {
      type: 'picture';
      index: number;
      items: JourneyPictureDetailItem[];
      visitedAt?: Date | null;
      endAt?: Date | null;
    }
  | {
      type: 'note';
      index: number;
      items: JourneyNoteDetailItem[];
    }
  | {
      type: 'memorial';
      index: number;
      items: JourneyMemorialDetailItem[];
    };

type Props = {
  detail: JourneyDiaryDetailState | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

const formatJourneyLabel = (item: {
  journeyCountry?: string | null;
  journeyYear?: number;
  journeyMonth?: number;
}) => {
  const country = item.journeyCountry || 'Journey';
  const month =
    item.journeyMonth !== undefined && item.journeyMonth !== null
      ? String(item.journeyMonth + 1).padStart(2, '0')
      : '';
  const year = item.journeyYear ? String(item.journeyYear) : '';

  return [country, month && year ? `${month}/${year}` : year].filter(Boolean).join(' · ');
};

const formatDate = (value: unknown) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const JOURNEY_HANDWRITING_FONT_FAMILY =
  '"Segoe Print", "Segoe Script", "Caveat Variable", "Comic Sans MS", "Segoe UI", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';

const parseDetailDate = (value: unknown) => {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatPictureVisitDate = (picture: JourneyPictureDetailItem) => {
  const visitedAt = parseDetailDate(picture.visitedAt);
  if (visitedAt) {
    return formatDate(visitedAt);
  }

  if (picture.journeyMonth !== undefined && picture.journeyMonth !== null && picture.journeyYear) {
    const journeyDate = new Date(picture.journeyYear, picture.journeyMonth, 1);
    if (!Number.isNaN(journeyDate.getTime())) {
      return journeyDate.toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
      });
    }
  }

  if (picture.journeyYear) {
    return String(picture.journeyYear);
  }

  return null;
};

const getPictureVisitDateLabel = (
  picture: JourneyPictureDetailItem,
  visitedAt?: Date | null,
  endAt?: Date | null,
) => {
  const fromPhoto = formatPictureVisitDate(picture);
  if (fromPhoto && fromPhoto !== '-') {
    return fromPhoto;
  }

  const tripVisitLabel = formatTripDateRange(visitedAt ?? null, endAt ?? null);
  if (tripVisitLabel !== 'Dates TBD') {
    return tripVisitLabel;
  }

  return formatPictureVisitDate(picture);
};

function getDetailSectionLabel(type: JourneyDiaryDetailState['type']) {
  switch (type) {
    case 'picture':
      return 'My Journey';
    case 'note':
      return 'My Notes';
    default:
      return 'Memorial Things';
  }
}

function DetailNavButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'prev' | 'next';
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <IconButton
      onClick={onClick}
      disabled={disabled}
      sx={{
        bgcolor: 'rgba(255,255,255,0.12)',
        color: 'common.white',
        border: '1px solid rgba(255,255,255,0.18)',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
        '&.Mui-disabled': { color: 'rgba(255,255,255,0.28)' },
      }}
      aria-label={direction === 'prev' ? 'Previous item' : 'Next item'}
    >
      <Iconify icon={direction === 'prev' ? 'eva:arrow-back-fill' : 'eva:arrow-forward-fill'} width={20} />
    </IconButton>
  );
}

function ZoomableImageStage({
  src,
  alt,
  maxHeight = { xs: 320, md: 520 },
  fullHeight = false,
}: {
  src?: string;
  alt: string;
  maxHeight?: { xs: number; md: number };
  fullHeight?: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const zoomPercent = `${Math.round(zoom * 100)}%`;
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setZoom(1);
  }, [src]);

  useEffect(() => {
    if (!src) {
      setNaturalSize({ width: 0, height: 0 });
      return undefined;
    }

    const image = new window.Image();
    image.onload = () => {
      setNaturalSize({
        width: image.naturalWidth || 0,
        height: image.naturalHeight || 0,
      });
    };
    image.src = src;

    return () => {
      image.onload = null;
    };
  }, [src]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }

    const updateViewportSize = () => {
      setViewportSize({
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      });
    };

    updateViewportSize();

    const observer = new ResizeObserver(() => {
      updateViewportSize();
    });

    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  const fittedScale =
    naturalSize.width > 0 &&
    naturalSize.height > 0 &&
    viewportSize.width > 0 &&
    viewportSize.height > 0
      ? Math.min(viewportSize.width / naturalSize.width, viewportSize.height / naturalSize.height)
      : 1;

  const fittedWidth = naturalSize.width > 0 ? Math.max(1, naturalSize.width * fittedScale) : 0;
  const fittedHeight = naturalSize.height > 0 ? Math.max(1, naturalSize.height * fittedScale) : 0;
  const scaledWidth = fittedWidth > 0 ? fittedWidth * zoom : 0;
  const scaledHeight = fittedHeight > 0 ? fittedHeight * zoom : 0;
  const stageWidth =
    scaledWidth > 0 && viewportSize.width > 0
      ? Math.max(viewportSize.width, scaledWidth)
      : '100%';
  const stageHeight =
    scaledHeight > 0 && viewportSize.height > 0
      ? Math.max(viewportSize.height, scaledHeight)
      : fullHeight
        ? '100%'
        : 'auto';

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || scaledWidth <= 0 || scaledHeight <= 0) {
      return undefined;
    }

    const centerScroll = () => {
      viewport.scrollLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
      viewport.scrollTop = Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2);
    };

    centerScroll();
    const frame = requestAnimationFrame(centerScroll);

    return () => cancelAnimationFrame(frame);
  }, [zoom, scaledWidth, scaledHeight, src, viewportSize.width, viewportSize.height]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: 1,
        height: fullHeight ? 1 : 'auto',
        minHeight: fullHeight ? 0 : 220,
        borderRadius: 2,
        bgcolor: 'rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}
    >
      {src ? (
        <Box
          ref={viewportRef}
          sx={{
            width: 1,
            height: fullHeight ? 1 : 'auto',
            minHeight: fullHeight ? 0 : 220,
            maxHeight: fullHeight ? 'none' : maxHeight,
            overflowX: 'scroll',
            overflowY: 'scroll',
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': {
              width: 12,
              height: 12,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(255,255,255,0.28)',
              borderRadius: 999,
              border: '2px solid rgba(16,24,43,0.95)',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: 999,
            },
            scrollbarColor: 'rgba(255,255,255,0.28) rgba(255,255,255,0.08)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: stageWidth,
              height: stageHeight,
              minWidth: '100%',
              minHeight: fullHeight ? '100%' : scaledHeight > 0 ? scaledHeight : 220,
            }}
          >
            <Box
              component="img"
              src={src}
              alt={alt}
              sx={{
                width: scaledWidth > 0 ? scaledWidth : 'auto',
                height: scaledHeight > 0 ? scaledHeight : 'auto',
                maxWidth: 'none',
                maxHeight: 'none',
                objectFit: 'contain',
                display: 'block',
                flexShrink: 0,
              }}
            />
          </Box>
        </Box>
      ) : (
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{
            minHeight: fullHeight ? 0 : 220,
            height: 1,
            color: 'rgba(255,255,255,0.45)',
          }}
        >
          <Iconify icon="solar:gallery-bold-duotone" width={42} />
        </Stack>
      )}

      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 1,
        }}
      >
        <IconButton
          onClick={() => setZoom((current) => Math.max(1, Number((current - 0.1).toFixed(2))))}
          disabled={zoom <= 1}
          sx={{
            bgcolor: 'rgba(255,255,255,0.12)',
            color: 'common.white',
            border: '1px solid rgba(255,255,255,0.18)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
            '&.Mui-disabled': { color: 'rgba(255,255,255,0.28)' },
          }}
          aria-label="Zoom out"
        >
          <Iconify icon="solar:minus-circle-bold" width={20} />
        </IconButton>
        <Box
          sx={{
            minWidth: 54,
            px: 1,
            height: 40,
            borderRadius: 1.25,
            border: '1px solid rgba(255,255,255,0.18)',
            bgcolor: 'rgba(255,255,255,0.12)',
            color: 'common.white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          {zoomPercent}
        </Box>
        <IconButton
          onClick={() => setZoom((current) => Math.min(3, Number((current + 0.1).toFixed(2))))}
          disabled={zoom >= 3}
          sx={{
            bgcolor: 'rgba(255,255,255,0.12)',
            color: 'common.white',
            border: '1px solid rgba(255,255,255,0.18)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
            '&.Mui-disabled': { color: 'rgba(255,255,255,0.28)' },
          }}
          aria-label="Zoom in"
        >
          <Iconify icon="solar:add-circle-bold" width={20} />
        </IconButton>
      </Stack>
    </Box>
  );
}

function NoteDetailImageThumbnail({
  src,
  alt,
  onExpand,
}: {
  src: string;
  alt: string;
  onExpand: () => void;
}) {
  return (
    <Box
      onClick={onExpand}
      role="button"
      tabIndex={0}
      aria-label="View full image"
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onExpand();
        }
      }}
      sx={{
        position: 'relative',
        width: 1,
        maxWidth: { xs: 280, sm: 320, md: 340 },
        mx: 'auto',
        transform: 'rotate(-4deg)',
        cursor: 'zoom-in',
        '&:hover .note-image-expand-hint': {
          opacity: 1,
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%) rotate(-3deg)',
          width: 58,
          height: 18,
          bgcolor: 'rgba(214, 198, 164, 0.92)',
          border: '1px solid rgba(160, 140, 108, 0.45)',
          borderRadius: 0.5,
          zIndex: 2,
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        }}
      />

      <Box
        sx={{
          bgcolor: '#fff',
          p: 1.25,
          pb: 2.5,
          boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
        }}
      >
        <Box
          component="img"
          src={src}
          alt={alt}
          sx={{
            width: 1,
            aspectRatio: '4 / 3',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </Box>

      <Stack
        className="note-image-expand-hint"
        direction="row"
        spacing={0.5}
        alignItems="center"
        sx={{
          position: 'absolute',
          right: 14,
          bottom: 18,
          px: 1,
          py: 0.5,
          borderRadius: 1,
          bgcolor: 'rgba(0,0,0,0.55)',
          color: 'common.white',
          opacity: { xs: 1, md: 0.82 },
          transition: 'opacity 0.15s ease',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      >
        <Iconify icon="solar:maximize-square-minimalistic-bold" width={16} />
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          View full
        </Typography>
      </Stack>
    </Box>
  );
}

function NoteDetailNavButton({
  direction,
  disabled,
  onClick,
  palette,
}: {
  direction: 'prev' | 'next';
  disabled?: boolean;
  onClick: () => void;
  palette: JourneyPalette;
}) {
  return (
    <IconButton
      onClick={onClick}
      disabled={disabled}
      sx={{
        bgcolor: palette.accentSoft,
        color: palette.accent,
        border: palette.border,
        '&:hover': { bgcolor: palette.panelActive },
        '&.Mui-disabled': { color: palette.muted, opacity: 0.5 },
      }}
      aria-label={direction === 'prev' ? 'Previous item' : 'Next item'}
    >
      <Iconify icon={direction === 'prev' ? 'eva:arrow-back-fill' : 'eva:arrow-forward-fill'} width={20} />
    </IconButton>
  );
}

function NoteDetailDialog({
  detail,
  title,
  subtitle,
  body,
  imageUrl,
  hasPrev,
  hasNext,
  onClose,
  onPrev,
  onNext,
}: {
  detail: Extract<JourneyDiaryDetailState, { type: 'note' }>;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  hasPrev: boolean;
  hasNext: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const palette = getJourneyPalette(spaceTheme);
  const [fullImageOpen, setFullImageOpen] = useState(false);
  const titleFont = spaceTheme.decorativeFont || MYSPACE_ITEM_TITLE_FONT;

  useEffect(() => {
    setFullImageOpen(false);
  }, [detail.index, imageUrl]);

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            bgcolor: palette.paper,
            color: palette.ink,
            borderRadius: 3,
            overflow: 'hidden',
            border: palette.border,
            backgroundImage: `
              repeating-linear-gradient(
                transparent,
                transparent 31px,
                ${palette.gridLine} 31px,
                ${palette.gridLine} 32px
              )
            `,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Stack spacing={0} sx={{ minHeight: 0, flex: 1, overflow: 'hidden' }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              px: { xs: 2, md: 3 },
              py: 2,
              borderBottom: palette.border,
              bgcolor: spaceTheme.surfaceBg,
              flexShrink: 0,
            }}
          >
            <Stack spacing={0.5} sx={{ minWidth: 0, pr: 2 }}>
              <Typography
                variant="overline"
                sx={{ color: palette.accent, letterSpacing: '0.16em', fontWeight: 700 }}
              >
                {getDetailSectionLabel('note')}
              </Typography>
              <Typography
                sx={{
                  fontFamily: titleFont,
                  fontWeight: spaceTheme.decorativeFont ? 500 : 700,
                  color: palette.ink,
                  fontSize: { xs: '1.5rem', md: '1.75rem' },
                  lineHeight: 1.2,
                }}
                noWrap
              >
                {title}
              </Typography>
              <Typography variant="body2" sx={{ color: palette.muted }} noWrap>
                {subtitle}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
              <NoteDetailNavButton
                direction="prev"
                disabled={!hasPrev}
                onClick={onPrev}
                palette={palette}
              />
              <Typography
                variant="caption"
                sx={{ color: palette.muted, minWidth: 56, textAlign: 'center', fontWeight: 600 }}
              >
                {detail.index + 1} / {detail.items.length}
              </Typography>
              <NoteDetailNavButton
                direction="next"
                disabled={!hasNext}
                onClick={onNext}
                palette={palette}
              />
              <IconButton
                onClick={onClose}
                sx={{
                  color: palette.ink,
                  bgcolor: palette.accentSoft,
                  border: palette.border,
                  '&:hover': { bgcolor: palette.panelActive },
                }}
                aria-label="Close detail"
              >
                <Iconify icon="mingcute:close-line" width={20} />
              </IconButton>
            </Stack>
          </Stack>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              p: { xs: 2, md: 3 },
            }}
          >
            <Stack spacing={{ xs: 3, md: 3.5 }} alignItems="center" sx={{ pt: { xs: 1.5, md: 2 } }}>
              {imageUrl ? (
                <Box sx={{ width: 1, maxWidth: { xs: 280, sm: 320, md: 340 } }}>
                  <NoteDetailImageThumbnail
                    src={imageUrl}
                    alt={title}
                    onExpand={() => setFullImageOpen(true)}
                  />
                </Box>
              ) : (
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    width: 1,
                    maxWidth: 280,
                    minHeight: 160,
                    borderRadius: 1,
                    border: `1px dashed ${spaceTheme.border}`,
                    bgcolor: palette.panel,
                    color: palette.muted,
                  }}
                >
                  <Iconify icon="solar:gallery-bold-duotone" width={42} />
                </Stack>
              )}

              {body ? (
                <Typography
                  sx={{
                    width: 1,
                    color: palette.ink,
                    fontFamily: JOURNEY_HANDWRITING_FONT_FAMILY,
                    lineHeight: 1.45,
                    fontSize: { xs: '1.2rem', md: '1.35rem' },
                    letterSpacing: '0.01em',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {body}
                </Typography>
              ) : null}
            </Stack>
          </Box>
        </Stack>
      </Dialog>

      <Dialog
        open={fullImageOpen}
        onClose={() => setFullImageOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            bgcolor: spaceTheme.isDark ? spaceTheme.pageBg : '#10182B',
            color: 'common.white',
            borderRadius: 3,
            overflow: 'hidden',
            border: `1px solid ${spaceTheme.border}`,
            maxHeight: '92vh',
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: `1px solid ${spaceTheme.border}`,
            bgcolor: spaceTheme.surfaceBg,
            color: palette.ink,
            flexShrink: 0,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, fontFamily: titleFont, color: palette.ink }}
          >
            {title}
          </Typography>
          <IconButton
            onClick={() => setFullImageOpen(false)}
            sx={{
              color: palette.ink,
              bgcolor: palette.accentSoft,
              border: palette.border,
              '&:hover': { bgcolor: palette.panelActive },
            }}
            aria-label="Close image"
          >
            <Iconify icon="mingcute:close-line" width={20} />
          </IconButton>
        </Stack>

        <Box sx={{ p: { xs: 1.5, md: 2 }, height: 'calc(92vh - 120px)', minHeight: 280 }}>
          <ZoomableImageStage src={imageUrl} alt={title} fullHeight />
        </Box>
      </Dialog>
    </>
  );
}

function MemorialGallery({
  urls,
  alt,
}: {
  urls: string[];
  alt: string;
}) {
  const [index, setIndex] = useState(0);
  const currentUrl = urls[index] || '';
  const hasMultiple = urls.length > 1;

  useEffect(() => {
    setIndex(0);
  }, [urls]);

  if (!currentUrl) {
    return null;
  }

  return (
    <Box sx={{ position: 'relative', width: 1, height: 1, minHeight: 0 }}>
      <ZoomableImageStage src={currentUrl} alt={alt} fullHeight />

      {hasMultiple ? (
        <>
          <Box sx={{ position: 'absolute', top: '50%', left: { xs: 8, md: 24 }, transform: 'translateY(-50%)', zIndex: 2 }}>
            <DetailNavButton
              direction="prev"
              disabled={index <= 0}
              onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
            />
          </Box>
          <Box sx={{ position: 'absolute', top: '50%', right: { xs: 8, md: 24 }, transform: 'translateY(-50%)', zIndex: 2 }}>
            <DetailNavButton
              direction="next"
              disabled={index >= urls.length - 1}
              onClick={() => setIndex((prev) => Math.min(urls.length - 1, prev + 1))}
            />
          </Box>
          <Typography
            sx={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'common.white',
              fontWeight: 600,
              px: 1.5,
              py: 0.5,
              borderRadius: 99,
              bgcolor: 'rgba(0,0,0,0.45)',
              zIndex: 2,
            }}
          >
            Photo {index + 1} / {urls.length}
          </Typography>
        </>
      ) : null}
    </Box>
  );
}

export function UniverseLandingJourneyDiaryDetailDialog({
  detail,
  onClose,
  onPrev,
  onNext,
}: Props) {
  if (!detail) {
    return null;
  }

  const currentItem = detail.items[detail.index];
  const hasPrev = detail.index > 0;
  const hasNext = detail.index < detail.items.length - 1;

  let title = '';
  let subtitle = '';
  let body: string | null = null;
  let imageUrl = '';

  if (detail.type === 'picture') {
    const picture = currentItem as JourneyPictureDetailItem;
    title = (picture.caption || '').trim() || formatJourneyLabel(picture);
    subtitle = formatJourneyLabel(picture);
    imageUrl = picture.signedImageUrl || '';
    const visitDateLabel = getPictureVisitDateLabel(picture, detail.visitedAt, detail.endAt);

    return (
      <Dialog
        open
        onClose={onClose}
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: '#000',
            color: 'common.white',
          },
        }}
      >
        <Stack sx={{ height: 1, minHeight: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              px: { xs: 1.5, md: 2.5 },
              py: 1.5,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              bgcolor: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(8px)',
              flexShrink: 0,
            }}
          >
            <Stack spacing={0.25} sx={{ minWidth: 0, pr: 2 }}>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.62)', letterSpacing: '0.16em' }}>
                {getDetailSectionLabel('picture')}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
                {title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }} noWrap>
                {subtitle}
              </Typography>
              {visitDateLabel ? (
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.62)' }} noWrap>
                  Visited {visitDateLabel}
                </Typography>
              ) : null}
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
              <DetailNavButton direction="prev" disabled={!hasPrev} onClick={onPrev} />
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.72)', minWidth: 56, textAlign: 'center' }}
              >
                {detail.index + 1} / {detail.items.length}
              </Typography>
              <DetailNavButton direction="next" disabled={!hasNext} onClick={onNext} />
              <IconButton onClick={onClose} sx={{ color: 'common.white' }} aria-label="Close detail">
                <Iconify icon="mingcute:close-line" width={20} />
              </IconButton>
            </Stack>
          </Stack>

          <Box
            sx={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#000',
            }}
          >
            {imageUrl ? (
              <ZoomableImageStage src={imageUrl} alt={title} fullHeight />
            ) : (
              <Stack
                alignItems="center"
                justifyContent="center"
                sx={{ color: 'rgba(255,255,255,0.45)' }}
              >
                <Iconify icon="solar:gallery-bold-duotone" width={42} />
              </Stack>
            )}

            {hasPrev ? (
              <Box sx={{ position: 'absolute', top: '50%', left: { xs: 8, md: 24 }, transform: 'translateY(-50%)' }}>
                <DetailNavButton direction="prev" onClick={onPrev} />
              </Box>
            ) : null}

            {hasNext ? (
              <Box sx={{ position: 'absolute', top: '50%', right: { xs: 8, md: 24 }, transform: 'translateY(-50%)' }}>
                <DetailNavButton direction="next" onClick={onNext} />
              </Box>
            ) : null}
          </Box>
        </Stack>
      </Dialog>
    );
  }

  if (detail.type === 'memorial') {
    const memorial = currentItem as JourneyMemorialDetailItem;
    title = memorial.title;
    subtitle = `${getMemorialThingCategoryLabel(memorial.category)} · ${formatJourneyLabel(memorial)}`;
    body = (memorial.description || '').trim() || null;
    const imageUrls =
      memorial.signedImageUrls?.filter(Boolean) ||
      (memorial.signedImageUrl ? [memorial.signedImageUrl] : []);
    const memorialDateLabel = formatDate(memorial.memorialDate || memorial.createdAt);

    return (
      <Dialog
        open
        onClose={onClose}
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: '#000',
            color: 'common.white',
          },
        }}
      >
        <Stack sx={{ height: 1, minHeight: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              px: { xs: 1.5, md: 2.5 },
              py: 1.5,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              bgcolor: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(8px)',
              flexShrink: 0,
            }}
          >
            <Stack spacing={0.25} sx={{ minWidth: 0, pr: 2 }}>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.62)', letterSpacing: '0.16em' }}>
                {getDetailSectionLabel('memorial')}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
                {title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }} noWrap>
                {subtitle}
              </Typography>
              {memorialDateLabel && memorialDateLabel !== '-' ? (
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.62)' }} noWrap>
                  {memorialDateLabel}
                </Typography>
              ) : null}
              {body ? (
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255,255,255,0.72)',
                    fontFamily: JOURNEY_HANDWRITING_FONT_FAMILY,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {body}
                </Typography>
              ) : null}
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
              <DetailNavButton direction="prev" disabled={!hasPrev} onClick={onPrev} />
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.72)', minWidth: 56, textAlign: 'center' }}
              >
                {detail.index + 1} / {detail.items.length}
              </Typography>
              <DetailNavButton direction="next" disabled={!hasNext} onClick={onNext} />
              <IconButton onClick={onClose} sx={{ color: 'common.white' }} aria-label="Close detail">
                <Iconify icon="mingcute:close-line" width={20} />
              </IconButton>
            </Stack>
          </Stack>

          <Box
            sx={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#000',
            }}
          >
            {imageUrls.length > 0 ? (
              <MemorialGallery urls={imageUrls} alt={title} />
            ) : (
              <Stack
                alignItems="center"
                justifyContent="center"
                sx={{ color: 'rgba(255,255,255,0.45)' }}
              >
                <Iconify icon="solar:gallery-bold-duotone" width={42} />
              </Stack>
            )}

            {hasPrev && imageUrls.length <= 1 ? (
              <Box sx={{ position: 'absolute', top: '50%', left: { xs: 8, md: 24 }, transform: 'translateY(-50%)', zIndex: 2 }}>
                <DetailNavButton direction="prev" onClick={onPrev} />
              </Box>
            ) : null}

            {hasNext && imageUrls.length <= 1 ? (
              <Box sx={{ position: 'absolute', top: '50%', right: { xs: 8, md: 24 }, transform: 'translateY(-50%)', zIndex: 2 }}>
                <DetailNavButton direction="next" onClick={onNext} />
              </Box>
            ) : null}
          </Box>
        </Stack>
      </Dialog>
    );
  }

  if (detail.type === 'note') {
    const note = currentItem as JourneyNoteDetailItem;

    return (
      <NoteDetailDialog
        detail={detail}
        title={(note.title || '').trim() || `Note #${note.id}`}
        subtitle={`${formatDate(note.noteDate || note.createdAt)} · ${formatJourneyLabel(note)}`}
        body={(note.content || '').trim() || 'No content yet.'}
        imageUrl={note.signedImageUrl || ''}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onClose={onClose}
        onPrev={onPrev}
        onNext={onNext}
      />
    );
  }

  return null;
}
