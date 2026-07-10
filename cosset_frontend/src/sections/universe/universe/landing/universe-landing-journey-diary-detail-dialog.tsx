'use client';

import type { IJourneyDiaryNote } from 'src/types/journey-diary-note';
import type { IJourneyMemorialThing } from 'src/types/journey-diary-memorial-thing';
import type { IJourneyRepresentativePicture } from 'src/types/journey-diary-representative-picture';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/universe/iconify';

import { getMemorialThingCategoryLabel } from 'src/sections/dashboard/journey-diary/memorial-things-categories';

import { formatTripDateRange } from './universe-landing-journey-diary-my-journey-utils';

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
    <Box sx={{ position: 'relative' }}>
      <Box
        component="img"
        src={currentUrl}
        alt={alt}
        sx={{
          width: 1,
          maxHeight: { xs: 320, md: 460 },
          objectFit: 'contain',
          borderRadius: 2,
          bgcolor: 'rgba(0,0,0,0.2)',
        }}
      />

      {hasMultiple ? (
        <>
          <Box sx={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)' }}>
            <DetailNavButton
              direction="prev"
              disabled={index <= 0}
              onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
            />
          </Box>
          <Box sx={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)' }}>
            <DetailNavButton
              direction="next"
              disabled={index >= urls.length - 1}
              onClick={() => setIndex((prev) => Math.min(urls.length - 1, prev + 1))}
            />
          </Box>
          <Typography
            sx={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'common.white',
              fontWeight: 600,
              px: 1.5,
              py: 0.5,
              borderRadius: 99,
              bgcolor: 'rgba(0,0,0,0.45)',
            }}
          >
            {index + 1} / {urls.length}
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
  let imageUrls: string[] = [];

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
              <Box
                component="img"
                src={imageUrl}
                alt={title}
                sx={{
                  width: 1,
                  height: 1,
                  maxWidth: 1,
                  maxHeight: 1,
                  objectFit: 'contain',
                }}
              />
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

  if (detail.type === 'note') {
    const note = currentItem as JourneyNoteDetailItem;
    title = (note.title || '').trim() || `Note #${note.id}`;
    subtitle = `${formatDate(note.noteDate || note.createdAt)} · ${formatJourneyLabel(note)}`;
    body = stripHtml((note.content || '').trim()) || 'No content yet.';
    imageUrl = note.signedImageUrl || '';
  }

  if (detail.type === 'memorial') {
    const memorial = currentItem as JourneyMemorialDetailItem;
    title = memorial.title;
    subtitle = `${getMemorialThingCategoryLabel(memorial.category)} · ${formatJourneyLabel(memorial)}`;
    body = (memorial.description || '').trim() || null;
    imageUrls =
      memorial.signedImageUrls?.filter(Boolean) ||
      (memorial.signedImageUrl ? [memorial.signedImageUrl] : []);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          bgcolor: '#10182B',
          color: 'common.white',
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          backgroundImage:
            'radial-gradient(circle at top right, rgba(255,255,255,0.06), transparent 42%)',
        },
      }}
    >
      <Stack spacing={0}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: { xs: 2, md: 3 }, py: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Stack spacing={0.5} sx={{ minWidth: 0, pr: 2 }}>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.62)', letterSpacing: '0.16em' }}>
              {getDetailSectionLabel(detail.type)}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }} noWrap>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }} noWrap>
              {subtitle}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
            <DetailNavButton direction="prev" disabled={!hasPrev} onClick={onPrev} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)', minWidth: 56, textAlign: 'center' }}>
              {detail.index + 1} / {detail.items.length}
            </Typography>
            <DetailNavButton direction="next" disabled={!hasNext} onClick={onNext} />
            <IconButton onClick={onClose} sx={{ color: 'common.white' }} aria-label="Close detail">
              <Iconify icon="mingcute:close-line" width={20} />
            </IconButton>
          </Stack>
        </Stack>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {detail.type === 'memorial' ? (
            <MemorialGallery urls={imageUrls} alt={title} />
          ) : imageUrl ? (
            <Box
              component="img"
              src={imageUrl}
              alt={title}
              sx={{
                width: 1,
                maxHeight: { xs: 320, md: 520 },
                objectFit: 'contain',
                borderRadius: 2,
                bgcolor: 'rgba(0,0,0,0.2)',
              }}
            />
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                minHeight: 220,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              <Iconify icon="solar:gallery-bold-duotone" width={42} />
            </Stack>
          )}

          {body ? (
            <Typography
              sx={{
                mt: 3,
                color: 'rgba(255,255,255,0.86)',
                lineHeight: 1.8,
                fontSize: '1rem',
                whiteSpace: 'pre-wrap',
              }}
            >
              {body}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Dialog>
  );
}
