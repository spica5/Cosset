'use client';

import type { ReactNode } from 'react';
import type { BoxProps } from '@mui/material/Box';
import type { IJourneyDiaryNote } from 'src/types/journey-diary-note';
import type { IJourneyMemorialThing } from 'src/types/journey-diary-memorial-thing';
import type { IJourneyRepresentativePicture } from 'src/types/journey-diary-representative-picture';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getS3SignedUrl } from 'src/utils/helper';

import { Iconify } from 'src/components/universe/iconify';

import { MyJourneyCountryIcon } from 'src/sections/dashboard/journey-diary/my-journey-country-icon';
import {
  getMemorialThingCategoryIcon,
  getMemorialThingCategoryLabel,
} from 'src/sections/dashboard/journey-diary/memorial-things-categories';
import { toPolaroidItemsFromPictures } from 'src/sections/dashboard/journey-diary/my-journey-utils';

import {
  UniverseLandingJourneyDiaryDetailDialog,
  type JourneyDiaryDetailState,
  type JourneyMemorialDetailItem,
  type JourneyNoteDetailItem,
  type JourneyPictureDetailItem,
} from './universe-landing-journey-diary-detail-dialog';
import { MYSPACE_SECTION_SERIF } from './myspace-section-title';
import { useDesignSpaceTheme } from './design-space-theme-context';

// ----------------------------------------------------------------------

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const JOURNEY_PAPER = '#F8F3E8';
const JOURNEY_INK = '#1F2A44';
const JOURNEY_LINE = 'rgba(31, 42, 68, 0.08)';
const JOURNEY_PANEL_BORDER = '1px solid rgba(31, 42, 68, 0.14)';

type JourneyPictureItem = JourneyPictureDetailItem;
type JourneyNoteItem = JourneyNoteDetailItem;
type JourneyMemorialItem = JourneyMemorialDetailItem;

type ResolvedJourneyDiaryContent = {
  pictures: JourneyPictureItem[];
  notes: JourneyNoteItem[];
  memorialThings: JourneyMemorialItem[];
};

type JourneyGroup = {
  id: string;
  country: string;
  year: number;
  month: number;
  monthLabel: string;
  pictures: JourneyPictureItem[];
};

const signedImageUrlCache = new Map<string, Promise<string>>();

type Props = BoxProps & {
  pictures: IJourneyRepresentativePicture[];
  notes: IJourneyDiaryNote[];
  memorialThings: IJourneyMemorialThing[];
  loading?: boolean;
  showMyJourney?: boolean;
  showMyNotes?: boolean;
  showMemorialThings?: boolean;
  isOwner?: boolean;
};

const getPictureImageKey = (item: IJourneyRepresentativePicture) => item.imageKey || '';
const getNoteImageKey = (item: IJourneyDiaryNote) => item.imageKey || '';

const getMemorialImageKeys = (item: IJourneyMemorialThing) => {
  const galleryKeys = (item.images || []).map((image) => image.imageKey).filter(Boolean);
  if (galleryKeys.length) {
    return galleryKeys;
  }

  return item.imageKey ? [item.imageKey] : [];
};

const formatJourneyLabel = (item: {
  journeyCountry?: string | null;
  journeyYear?: number;
}) => {
  const country = item.journeyCountry || 'Journey';
  return item.journeyYear ? `${country} · ${item.journeyYear}` : country;
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
  });
};

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const getNoteExcerpt = (note: IJourneyDiaryNote) => {
  const plain = stripHtml((note.content || '').trim());
  if (!plain) {
    return 'No content yet.';
  }

  return plain.length > 110 ? `${plain.slice(0, 110)}...` : plain;
};

const resolveImageUrl = async (imageKey?: string | null) => {
  const key = (imageKey || '').trim();
  if (!key) {
    return '';
  }

  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key;
  }

  const cached = signedImageUrlCache.get(key);
  if (cached) {
    return cached;
  }

  const request = getS3SignedUrl(key)
    .then((url) => url || '')
    .catch(() => '');

  signedImageUrlCache.set(key, request);

  return request;
};

const buildJourneyDiarySignature = (
  pictures: IJourneyRepresentativePicture[],
  notes: IJourneyDiaryNote[],
  memorialThings: IJourneyMemorialThing[],
) =>
  [
    ...pictures.map((item) => `p:${item.id}:${getPictureImageKey(item)}`),
    ...notes.map((item) => `n:${item.id}:${getNoteImageKey(item)}`),
    ...memorialThings.map((item) => `m:${item.id}:${getMemorialImageKeys(item).join(',')}`),
  ].join('|');

const groupPicturesByJourney = (pictures: JourneyPictureItem[]): JourneyGroup[] => {
  const groups = new Map<string, JourneyGroup>();

  pictures.forEach((picture) => {
    const country = picture.journeyCountry || 'Journey';
    const year = picture.journeyYear ?? new Date().getFullYear();
    const month = picture.journeyMonth ?? 0;
    const groupKey = picture.journeyGroupKey || `${year}-${month}-${country.toLowerCase()}`;

    const existing = groups.get(groupKey);
    if (existing) {
      existing.pictures.push(picture);
      return;
    }

    groups.set(groupKey, {
      id: groupKey,
      country,
      year,
      month,
      monthLabel: MONTH_LABELS[month] || 'JAN',
      pictures: [picture],
    });
  });

  return [...groups.values()].sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year;
    }

    if (a.month !== b.month) {
      return b.month - a.month;
    }

    return a.country.localeCompare(b.country);
  });
};

function useResolvedJourneyDiaryContent(
  pictures: IJourneyRepresentativePicture[],
  notes: IJourneyDiaryNote[],
  memorialThings: IJourneyMemorialThing[],
) {
  const [resolvedContent, setResolvedContent] = useState<ResolvedJourneyDiaryContent>({
    pictures: [],
    notes: [],
    memorialThings: [],
  });
  const [resolving, setResolving] = useState(false);
  const contentRef = useRef({ pictures, notes, memorialThings });

  contentRef.current = { pictures, notes, memorialThings };

  const contentSignature = useMemo(
    () => buildJourneyDiarySignature(pictures, notes, memorialThings),
    [memorialThings, notes, pictures],
  );

  useEffect(() => {
    let cancelled = false;
    const { pictures: nextPictures, notes: nextNotes, memorialThings: nextMemorialThings } =
      contentRef.current;

    const resolveContent = async () => {
      if (!contentSignature) {
        setResolvedContent({ pictures: [], notes: [], memorialThings: [] });
        setResolving(false);
        return;
      }

      setResolving(true);

      try {
        const [resolvedPictures, resolvedNotes, resolvedMemorialThings] = await Promise.all([
          Promise.all(
            nextPictures.map(async (item) => ({
              ...item,
              signedImageUrl: await resolveImageUrl(getPictureImageKey(item)),
            })),
          ),
          Promise.all(
            nextNotes.map(async (item) => ({
              ...item,
              signedImageUrl: await resolveImageUrl(getNoteImageKey(item)),
            })),
          ),
          Promise.all(
            nextMemorialThings.map(async (item) => {
              const imageKeys = getMemorialImageKeys(item);
              const signedImageUrls = await Promise.all(imageKeys.map((key) => resolveImageUrl(key)));

              return {
                ...item,
                signedImageUrls,
                signedImageUrl: signedImageUrls[0] || '',
              };
            }),
          ),
        ]);

        if (!cancelled) {
          setResolvedContent({
            pictures: resolvedPictures,
            notes: resolvedNotes,
            memorialThings: resolvedMemorialThings,
          });
        }
      } finally {
        if (!cancelled) {
          setResolving(false);
        }
      }
    };

    resolveContent();

    return () => {
      cancelled = true;
    };
  }, [contentSignature]);

  return { resolvedContent, resolving };
}

function ScrapbookPanel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card
      elevation={0}
      sx={{
        height: 1,
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: JOURNEY_PAPER,
        border: JOURNEY_PANEL_BORDER,
        boxShadow: '0 18px 40px rgba(8, 12, 24, 0.22)',
        backgroundImage:
          'linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 18%), repeating-linear-gradient(180deg, transparent, transparent 31px, rgba(31,42,68,0.05) 32px)',
      }}
    >
      <Stack spacing={2.5} sx={{ p: { xs: 2, md: 2.5 }, height: 1 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Stack spacing={0.5}>
            <Typography
              sx={{
                fontFamily: MYSPACE_SECTION_SERIF,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: JOURNEY_INK,
              }}
            >
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" sx={{ color: 'rgba(31, 42, 68, 0.68)' }}>
                {subtitle}
              </Typography>
            ) : null}
          </Stack>
          {action}
        </Stack>
        <Box sx={{ flex: 1, minHeight: 0 }}>{children}</Box>
      </Stack>
    </Card>
  );
}

function JourneyTimeline({
  groups,
  activeId,
  onSelect,
}: {
  groups: JourneyGroup[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Stack
      spacing={1}
      sx={{
        pr: { md: 1.5 },
        borderRight: { md: `1px dashed ${JOURNEY_LINE}` },
        minWidth: { md: 180 },
      }}
    >
      {groups.map((group) => {
        const active = group.id === activeId;

        return (
          <Button
            key={group.id}
            onClick={() => onSelect(group.id)}
            color="inherit"
            sx={{
              justifyContent: 'flex-start',
              textAlign: 'left',
              px: 1.25,
              py: 1.25,
              borderRadius: 2,
              border: JOURNEY_PANEL_BORDER,
              bgcolor: active ? 'rgba(255,255,255,0.55)' : 'transparent',
              color: JOURNEY_INK,
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                {group.monthLabel}
              </Typography>
              <Typography sx={{ fontWeight: 700, flex: 1 }} noWrap>
                {group.country}
              </Typography>
              <MyJourneyCountryIcon country={group.country} />
            </Stack>
          </Button>
        );
      })}
    </Stack>
  );
}

function JourneyPolaroid({
  title,
  imageUrl,
  onClick,
}: {
  title: string;
  imageUrl?: string;
  onClick: () => void;
}) {
  return (
    <CardActionArea onClick={onClick} sx={{ borderRadius: 0 }}>
      <Box
        sx={{
          bgcolor: '#fff',
          p: 1,
          pb: 2.25,
          boxShadow: '0 10px 24px rgba(47, 35, 22, 0.14)',
          transform: 'rotate(-1deg)',
          transition: 'transform 0.2s ease',
          '&:hover': { transform: 'rotate(0deg) scale(1.02)' },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            aspectRatio: '4 / 3',
            bgcolor: 'grey.200',
            overflow: 'hidden',
          }}
        >
          {imageUrl ? (
            <Box component="img" src={imageUrl} alt={title} sx={{ width: 1, height: 1, objectFit: 'cover' }} />
          ) : (
            <Stack alignItems="center" justifyContent="center" sx={{ width: 1, height: 1 }}>
              <Iconify icon="solar:gallery-bold-duotone" width={28} sx={{ color: 'text.disabled' }} />
            </Stack>
          )}
        </Box>
        <Typography
          align="center"
          sx={{
            mt: 1.25,
            fontFamily: '"Caveat Variable", "Pacifico", cursive',
            fontSize: '1.15rem',
            color: JOURNEY_INK,
          }}
        >
          {title}
        </Typography>
      </Box>
    </CardActionArea>
  );
}

function JourneyNoteRow({
  note,
  onClick,
}: {
  note: JourneyNoteItem;
  onClick: () => void;
}) {
  const title = (note.title || '').trim() || `Note #${note.id}`;

  return (
    <CardActionArea
      onClick={onClick}
      sx={{
        borderRadius: 2,
        border: JOURNEY_PANEL_BORDER,
        bgcolor: 'rgba(255,255,255,0.42)',
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ p: 1.5 }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: 1.5,
            overflow: 'hidden',
            flexShrink: 0,
            bgcolor: 'rgba(31,42,68,0.08)',
          }}
        >
          {note.signedImageUrl ? (
            <Box component="img" src={note.signedImageUrl} alt={title} sx={{ width: 1, height: 1, objectFit: 'cover' }} />
          ) : (
            <Stack alignItems="center" justifyContent="center" sx={{ width: 1, height: 1 }}>
              <Iconify icon="solar:notebook-bold-duotone" width={24} sx={{ color: 'text.disabled' }} />
            </Stack>
          )}
        </Box>

        <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="caption" sx={{ color: 'rgba(31,42,68,0.58)', fontWeight: 700 }}>
            {formatDate(note.noteDate || note.createdAt)}
          </Typography>
          <Typography sx={{ fontWeight: 700, color: JOURNEY_INK }} noWrap>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(31,42,68,0.72)', lineHeight: 1.5 }}>
            {getNoteExcerpt(note)}
          </Typography>
        </Stack>
      </Stack>
    </CardActionArea>
  );
}

function MemorialMomentCard({
  item,
  onClick,
}: {
  item: JourneyMemorialItem;
  onClick: () => void;
}) {
  return (
    <CardActionArea
      onClick={onClick}
      sx={{
        borderRadius: 2.5,
        overflow: 'hidden',
        border: JOURNEY_PANEL_BORDER,
        bgcolor: 'rgba(255,255,255,0.5)',
      }}
    >
      <Box sx={{ position: 'relative', pt: '62%', bgcolor: 'rgba(31,42,68,0.08)' }}>
        {item.signedImageUrl ? (
          <Box
            component="img"
            src={item.signedImageUrl}
            alt={item.title}
            sx={{ position: 'absolute', inset: 0, width: 1, height: 1, objectFit: 'cover' }}
          />
        ) : (
          <Stack alignItems="center" justifyContent="center" sx={{ position: 'absolute', inset: 0 }}>
            <Iconify icon={getMemorialThingCategoryIcon(item.category)} width={30} sx={{ color: JOURNEY_INK }} />
          </Stack>
        )}
      </Box>

      <Stack spacing={0.5} sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Iconify icon={getMemorialThingCategoryIcon(item.category)} width={16} sx={{ color: JOURNEY_INK }} />
          <Typography variant="caption" sx={{ color: 'rgba(31,42,68,0.62)', fontWeight: 700 }}>
            {getMemorialThingCategoryLabel(item.category)}
          </Typography>
        </Stack>
        <Typography sx={{ fontWeight: 700, color: JOURNEY_INK }}>{item.title}</Typography>
        <Typography variant="caption" sx={{ color: 'rgba(31,42,68,0.58)' }}>
          {formatJourneyLabel(item)}
        </Typography>
      </Stack>
    </CardActionArea>
  );
}

export function UniverseLandingJourneyDiary({
  pictures,
  notes,
  memorialThings,
  loading = false,
  showMyJourney = false,
  showMyNotes = false,
  showMemorialThings = false,
  isOwner = false,
  sx,
  ...other
}: Props) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const { resolvedContent, resolving } = useResolvedJourneyDiaryContent(
    pictures,
    notes,
    memorialThings,
  );
  const { pictures: resolvedPictures, notes: resolvedNotes, memorialThings: resolvedMemorialThings } =
    resolvedContent;

  const journeyGroups = useMemo(
    () => groupPicturesByJourney(resolvedPictures),
    [resolvedPictures],
  );

  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JourneyDiaryDetailState | null>(null);

  useEffect(() => {
    if (!journeyGroups.length) {
      setSelectedJourneyId(null);
      return;
    }

    setSelectedJourneyId((prev) =>
      prev && journeyGroups.some((group) => group.id === prev) ? prev : journeyGroups[0].id,
    );
  }, [journeyGroups]);

  const activeJourneyPictures = useMemo(() => {
    const activeGroup = journeyGroups.find((group) => group.id === selectedJourneyId);
    return activeGroup?.pictures || resolvedPictures;
  }, [journeyGroups, resolvedPictures, selectedJourneyId]);

  const polaroidItems = useMemo(() => {
    const urlMap = Object.fromEntries(
      activeJourneyPictures
        .filter((picture) => picture.imageKey)
        .map((picture) => [picture.imageKey, picture.signedImageUrl || '']),
    );

    return toPolaroidItemsFromPictures(activeJourneyPictures, urlMap);
  }, [activeJourneyPictures]);

  const openPictureDetail = useCallback(
    (index: number) => {
      setDetail({ type: 'picture', index, items: activeJourneyPictures });
    },
    [activeJourneyPictures],
  );

  const openNoteDetail = useCallback(
    (index: number) => {
      setDetail({ type: 'note', index, items: resolvedNotes });
    },
    [resolvedNotes],
  );

  const openMemorialDetail = useCallback(
    (index: number) => {
      setDetail({ type: 'memorial', index, items: resolvedMemorialThings });
    },
    [resolvedMemorialThings],
  );

  const handlePrevDetail = useCallback(() => {
    setDetail((current) => {
      if (!current || current.index <= 0) {
        return current;
      }

      return { ...current, index: current.index - 1 };
    });
  }, []);

  const handleNextDetail = useCallback(() => {
    setDetail((current) => {
      if (!current || current.index >= current.items.length - 1) {
        return current;
      }

      return { ...current, index: current.index + 1 };
    });
  }, []);

  const totalCount = pictures.length + notes.length + memorialThings.length;
  const isResolving = resolving;
  const showAnySection = showMyJourney || showMyNotes || showMemorialThings;

  if (!showAnySection) {
    return null;
  }

  return (
    <Box
      component="section"
      sx={{
        flex: 1,
        minHeight: 0,
        px: { xs: 2, md: 3 },
        py: { xs: 3, md: 4 },
        color: 'common.white',
        ...sx,
      }}
      {...other}
    >
      <Stack spacing={3.5}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'flex-end' }}
          justifyContent="space-between"
        >
          <Stack spacing={1} sx={{ maxWidth: 720 }}>
            <Typography
              variant="h3"
              sx={{
                fontFamily: MYSPACE_SECTION_SERIF,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'common.white',
              }}
            >
              JOURNEY DIARY
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.7 }}>
              Collect moments, not things. Shared journey photos, handwritten notes, and memorial keepsakes.
            </Typography>
          </Stack>

          {isOwner ? (
            <Button
              component={RouterLink}
              href={paths.dashboard.homeSpace.thingsToShare}
              variant="contained"
              startIcon={<Iconify icon="solar:share-bold" />}
              sx={{
                borderRadius: 99,
                px: 2.5,
                whiteSpace: 'nowrap',
                bgcolor: spaceTheme.accent,
                boxShadow: 'none',
                '&:hover': { bgcolor: spaceTheme.accentHover, boxShadow: 'none' },
              }}
            >
              Manage Sharing
            </Button>
          ) : null}
        </Stack>

        {loading || isResolving ? (
          <Typography sx={{ color: 'rgba(255,255,255,0.72)' }}>Loading journey diary...</Typography>
        ) : totalCount === 0 ? (
          <Typography sx={{ color: 'rgba(255,255,255,0.72)' }}>
            No shared journey diary items found.
          </Typography>
        ) : (
          <Grid container spacing={2.5}>
            {showMyJourney ? (
              <Grid item xs={12} lg={showMemorialThings ? 8 : 12}>
                <ScrapbookPanel
                  title="JOURNEY"
                  subtitle="Polaroid memories from each trip."
                  action={
                    <Typography variant="caption" sx={{ color: 'rgba(31,42,68,0.58)', fontWeight: 700 }}>
                      {resolvedPictures.length} photos
                    </Typography>
                  }
                >
                  {resolvedPictures.length === 0 ? (
                    <Typography sx={{ color: 'rgba(31,42,68,0.68)' }}>
                      No shared journey photos yet.
                    </Typography>
                  ) : (
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
                      <JourneyTimeline
                        groups={journeyGroups}
                        activeId={selectedJourneyId}
                        onSelect={setSelectedJourneyId}
                      />

                      <Box
                        sx={{
                          flex: 1,
                          display: 'grid',
                          gap: 2,
                          gridTemplateColumns: {
                            xs: 'repeat(2, minmax(0, 1fr))',
                            sm: 'repeat(3, minmax(0, 1fr))',
                          },
                        }}
                      >
                        {polaroidItems.map((item, index) => (
                          <JourneyPolaroid
                            key={item.id}
                            title={item.title}
                            imageUrl={item.imageUrl}
                            onClick={() => openPictureDetail(index)}
                          />
                        ))}
                      </Box>
                    </Stack>
                  )}
                </ScrapbookPanel>
              </Grid>
            ) : null}

            {showMemorialThings ? (
              <Grid item xs={12} lg={showMyJourney ? 4 : 6}>
                <ScrapbookPanel
                  title="MEMORIAL THINGS"
                  subtitle="Scenery, food, culture, and special moments."
                >
                  {resolvedMemorialThings.length === 0 ? (
                    <Typography sx={{ color: 'rgba(31,42,68,0.68)' }}>
                      No shared memorial things yet.
                    </Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {resolvedMemorialThings.map((item, index) => (
                        <MemorialMomentCard
                          key={item.id}
                          item={item}
                          onClick={() => openMemorialDetail(index)}
                        />
                      ))}
                    </Stack>
                  )}
                </ScrapbookPanel>
              </Grid>
            ) : null}

            {showMyNotes ? (
              <Grid item xs={12} lg={showMemorialThings && !showMyJourney ? 6 : 12}>
                <ScrapbookPanel title="MY NOTES" subtitle="Travel journal entries and reflections.">
                  {resolvedNotes.length === 0 ? (
                    <Typography sx={{ color: 'rgba(31,42,68,0.68)' }}>No shared notes yet.</Typography>
                  ) : (
                    <Stack spacing={1.25}>
                      {resolvedNotes.map((note, index) => (
                        <JourneyNoteRow key={note.id} note={note} onClick={() => openNoteDetail(index)} />
                      ))}
                    </Stack>
                  )}
                </ScrapbookPanel>
              </Grid>
            ) : null}
          </Grid>
        )}
      </Stack>

      <UniverseLandingJourneyDiaryDetailDialog
        detail={detail}
        onClose={() => setDetail(null)}
        onPrev={handlePrevDetail}
        onNext={handleNextDetail}
      />
    </Box>
  );
}
