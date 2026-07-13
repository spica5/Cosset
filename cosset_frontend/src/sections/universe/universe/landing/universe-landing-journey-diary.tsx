'use client';

import type { BoxProps } from '@mui/material/Box';
import type { IJourneyDiaryNote } from 'src/types/journey-diary-note';
import type { IJourneyDiaryLocation } from 'src/types/journey-diary-location';
import type { IJourneyMemorialThing } from 'src/types/journey-diary-memorial-thing';
import type { IJourneyRepresentativePicture } from 'src/types/journey-diary-representative-picture';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Drawer from '@mui/material/Drawer';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Pagination from '@mui/material/Pagination';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getS3SignedUrl } from 'src/utils/helper';

import { Iconify } from 'src/components/universe/iconify';

import { getMemorialThingCategoryLabel } from 'src/sections/dashboard/journey-diary/memorial-things-categories';

import { useDesignSpaceTheme } from './design-space-theme-context';
import { UniverseLandingJourneyDiaryHome } from './universe-landing-journey-diary-home';
import {
  MySpaceSectionTitle,
  MYSPACE_SECTION_SERIF,
} from './myspace-section-title';
import { UniverseLandingJourneyDiaryMyNotes } from './universe-landing-journey-diary-my-notes';
import { UniverseLandingJourneyDiaryMyJourney } from './universe-landing-journey-diary-my-journey';
import { UniverseLandingJourneyDiaryMyMemorialThings } from './universe-landing-journey-diary-my-memorial-things';
import {
  JOURNEY_PAGE_SIZE,
  filterJourneyEntries,
  type JourneyDiaryEntry,
  filterEntriesByCategory,
} from './universe-landing-journey-diary-utils';
import {
  JOURNEY_DIARY_TITLE,
  JOURNEY_DIARY_SUBTITLE,
  JOURNEY_DIARY_NAV_SECTIONS,
  type JourneyDiaryNavCategory,
} from './universe-landing-journey-diary-theme';
import {
  JourneyDiaryEntryCard,
  JourneyDiarySidebarTitle,
  JourneyDiaryCustomerHeader,
  JourneyDiaryCategorySidebar,
  JourneyDiaryRepresentativePicture,
} from './universe-landing-journey-diary-parts';
import {
  MYSPACE_BLOG_GRID_GAP,
  myspaceBlogListGridSx,
  getBlogGridColumnCount,
  MYSPACE_BLOG_GRID_COLUMNS,
  myspaceBlogListGridItemSx,
  MYSPACE_BLOG_ITEM_MIN_WIDTH,
  getMyspacePaginationSx,
} from './myspace-item-layout';
import {
  type JourneyNoteDetailItem,
  type JourneyDiaryDetailState,
  type JourneyPictureDetailItem,
  type JourneyMemorialDetailItem,
  UniverseLandingJourneyDiaryDetailDialog,
} from './universe-landing-journey-diary-detail-dialog';

import type { UniverseJourneyTrip } from './universe-landing-journey-diary-my-journey-utils';

// ----------------------------------------------------------------------

const SIDEBAR_WIDTH = 350;
const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

type JourneyPictureItem = JourneyPictureDetailItem;
type JourneyNoteItem = JourneyNoteDetailItem;
type JourneyMemorialItem = JourneyMemorialDetailItem;

type ResolvedJourneyDiaryContent = {
  pictures: JourneyPictureItem[];
  notes: JourneyNoteItem[];
  memorialThings: JourneyMemorialItem[];
};

const signedImageUrlCache = new Map<string, Promise<string>>();

type Props = BoxProps & {
  pictures: IJourneyRepresentativePicture[];
  notes: IJourneyDiaryNote[];
  memorialThings: IJourneyMemorialThing[];
  locations?: IJourneyDiaryLocation[];
  customerName?: string;
  customerAvatarUrl?: string;
  communityUsers?: Array<{
    id?: string | number;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    photoURL?: string | null;
  }>;
  loading?: boolean;
  showMyJourney?: boolean;
  showMyNotes?: boolean;
  showMemorialThings?: boolean;
  isOwner?: boolean;
};

const getPictureImageKey = (item: IJourneyRepresentativePicture) => item.imageKey || '';
const getNoteImageKey = (
  item: IJourneyDiaryNote,
  pictures: IJourneyRepresentativePicture[] = [],
) => {
  const directKey = (item.imageKey || '').trim();
  if (directKey) {
    return directKey;
  }

  if (item.pictureId) {
    const linkedPicture = pictures.find((picture) => picture.id === item.pictureId);
    return (linkedPicture?.imageKey || '').trim();
  }

  return '';
};

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
    ...notes.map(
      (item) => `n:${item.id}:${getNoteImageKey(item, pictures)}:${item.pictureId ?? ''}`,
    ),
    ...memorialThings.map((item) => `m:${item.id}:${getMemorialImageKeys(item).join(',')}`),
  ].join('|');

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
              signedImageUrl: await resolveImageUrl(getNoteImageKey(item, nextPictures)),
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

function useEntryGridColumnCount(enabled: boolean) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [columnCount, setColumnCount] = useState(MYSPACE_BLOG_GRID_COLUMNS);

  const updateColumnCount = useCallback(() => {
    const node = gridRef.current;
    if (!node || !enabled) {
      return;
    }

    const nextCount = getBlogGridColumnCount(
      node.clientWidth,
      MYSPACE_BLOG_ITEM_MIN_WIDTH,
      MYSPACE_BLOG_GRID_COLUMNS,
      MYSPACE_BLOG_GRID_GAP,
    );

    setColumnCount((prev) => (prev === nextCount ? prev : nextCount));
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setColumnCount(MYSPACE_BLOG_GRID_COLUMNS);
      return undefined;
    }

    const node = gridRef.current;
    if (!node) {
      return undefined;
    }

    updateColumnCount();

    const observer = new ResizeObserver(() => {
      updateColumnCount();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [enabled, updateColumnCount]);

  return { gridRef, columnCount };
}

function buildPictureEntries(pictures: JourneyPictureItem[]): JourneyDiaryEntry[] {
  return pictures.map((item, index) => ({
    kind: 'picture' as const,
    id: item.id,
    index,
    title: (item.caption || '').trim() || `Memory ${index + 1}`,
    subtitle: formatJourneyLabel(item),
    imageUrl: item.signedImageUrl,
    dateLabel: item.visitedAt
      ? formatDate(item.visitedAt)
      : item.journeyMonth !== undefined && item.journeyMonth !== null
        ? `${MONTH_LABELS[item.journeyMonth] || 'JAN'} ${item.journeyYear || ''}`.trim()
        : item.journeyYear
          ? String(item.journeyYear)
          : undefined,
    createdAt: item.visitedAt || item.createdAt,
  }));
}

function buildNoteEntries(notes: JourneyNoteItem[]): JourneyDiaryEntry[] {
  return notes.map((note, index) => ({
    kind: 'note' as const,
    id: note.id,
    index,
    title: (note.title || '').trim() || `Note #${note.id}`,
    subtitle: formatJourneyLabel(note),
    excerpt: getNoteExcerpt(note),
    imageUrl: note.signedImageUrl,
    dateLabel: formatDate(note.noteDate || note.createdAt),
    createdAt: note.noteDate || note.createdAt,
  }));
}

function buildMemorialEntries(items: JourneyMemorialItem[]): JourneyDiaryEntry[] {
  return items.map((item, index) => ({
    kind: 'memorial' as const,
    id: item.id,
    index,
    title: item.title,
    subtitle: `${getMemorialThingCategoryLabel(item.category)} · ${formatJourneyLabel(item)}`,
    excerpt: (item.description || '').trim() || undefined,
    imageUrl: item.signedImageUrl,
    dateLabel: formatDate(item.memorialDate || item.createdAt),
    createdAt: item.memorialDate || item.createdAt,
  }));
}

export function UniverseLandingJourneyDiary({
  pictures,
  notes,
  memorialThings,
  locations = [],
  customerName = 'Friend',
  customerAvatarUrl,
  communityUsers = [],
  loading = false,
  showMyJourney = false,
  showMyNotes = false,
  showMemorialThings = false,
  isOwner = false,
  sx,
  ...other
}: Props) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const { theme: spaceTheme } = useDesignSpaceTheme();

  const { resolvedContent, resolving } = useResolvedJourneyDiaryContent(
    pictures,
    notes,
    memorialThings,
  );
  const { pictures: resolvedPictures, notes: resolvedNotes, memorialThings: resolvedMemorialThings } =
    resolvedContent;

  const [navCategory, setNavCategory] = useState<JourneyDiaryNavCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [detail, setDetail] = useState<JourneyDiaryDetailState | null>(null);

  const availableSections = useMemo(() => {
    const allowed = new Set<JourneyDiaryNavCategory>(['all']);
    if (showMyJourney) allowed.add('journey');
    if (showMyNotes) allowed.add('notes');
    if (showMemorialThings) allowed.add('memorial');

    return JOURNEY_DIARY_NAV_SECTIONS.filter((section) => allowed.has(section.id));
  }, [showMemorialThings, showMyJourney, showMyNotes]);

  const pictureEntries = useMemo(() => buildPictureEntries(resolvedPictures), [resolvedPictures]);
  const noteEntries = useMemo(() => buildNoteEntries(resolvedNotes), [resolvedNotes]);
  const memorialEntries = useMemo(
    () => buildMemorialEntries(resolvedMemorialThings),
    [resolvedMemorialThings],
  );

  const allEntries = useMemo(() => {
    const entries: JourneyDiaryEntry[] = [];
    if (showMyJourney) entries.push(...pictureEntries);
    if (showMyNotes) entries.push(...noteEntries);
    if (showMemorialThings) entries.push(...memorialEntries);
    return entries;
  }, [
    memorialEntries,
    noteEntries,
    pictureEntries,
    showMemorialThings,
    showMyJourney,
    showMyNotes,
  ]);

  const navCounts = useMemo(
    () => ({
      all: allEntries.length,
      journey: pictureEntries.length,
      notes: noteEntries.length,
      memorial: memorialEntries.length,
    }),
    [allEntries.length, memorialEntries.length, noteEntries.length, pictureEntries.length],
  );

  const categoryEntries = useMemo(
    () => filterEntriesByCategory(allEntries, navCategory),
    [allEntries, navCategory],
  );

  const filteredEntries = useMemo(
    () => filterJourneyEntries(categoryEntries, searchQuery),
    [categoryEntries, searchQuery],
  );

  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / JOURNEY_PAGE_SIZE));
  const paginatedEntries = useMemo(() => {
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * JOURNEY_PAGE_SIZE;
    return filteredEntries.slice(start, start + JOURNEY_PAGE_SIZE);
  }, [filteredEntries, page, pageCount]);

  const activeNavSection = availableSections.find((section) => section.id === navCategory);
  const { gridRef, columnCount } = useEntryGridColumnCount(paginatedEntries.length > 0);
  const isResolving = resolving;
  const openTripPicture = useCallback((trip: UniverseJourneyTrip, index: number) => {
    setDetail({
      type: 'picture',
      index,
      items: trip.pictures,
      visitedAt: trip.visitedAt,
      endAt: trip.endAt,
    });
  }, []);

  const openTripNote = useCallback((tripNotes: JourneyNoteDetailItem[], index: number) => {
    setDetail({
      type: 'note',
      index,
      items: tripNotes,
    });
  }, []);

  const openTripMemorial = useCallback((items: JourneyMemorialDetailItem[], index: number) => {
    setDetail({
      type: 'memorial',
      index,
      items,
    });
  }, []);

  const showMyJourneyScrapbook = showMyJourney && navCategory === 'journey';
  const showMyNotesScrapbook = showMyNotes && navCategory === 'notes';
  const showMemorialThingsScrapbook = showMemorialThings && navCategory === 'memorial';
  const showHomeDashboard = navCategory === 'all';
  const showAnySection = showMyJourney || showMyNotes || showMemorialThings;

  useEffect(() => {
    if (!availableSections.some((section) => section.id === navCategory)) {
      setNavCategory(availableSections[0]?.id ?? 'all');
    }
  }, [availableSections, navCategory]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [navCategory, searchQuery]);

  const openEntryDetail = useCallback(
    (entry: JourneyDiaryEntry) => {
      if (entry.kind === 'picture') {
        setDetail({ type: 'picture', index: entry.index, items: resolvedPictures });
        return;
      }

      if (entry.kind === 'note') {
        setDetail({ type: 'note', index: entry.index, items: resolvedNotes });
        return;
      }

      setDetail({ type: 'memorial', index: entry.index, items: resolvedMemorialThings });
    },
    [resolvedMemorialThings, resolvedNotes, resolvedPictures],
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

  const handleSelectCategory = (category: JourneyDiaryNavCategory) => {
    setNavCategory(category);

    const mainEl = document.getElementById('journey-diary-main-scroll');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!showAnySection) {
    return null;
  }

  const sidebar = (
    <Stack sx={{ width: 1, height: 1, minHeight: 0, overflow: 'hidden' }}>
      <JourneyDiarySidebarTitle />

      <JourneyDiaryCustomerHeader
        customerName={customerName}
        customerAvatarUrl={customerAvatarUrl}
      />

      <JourneyDiaryCategorySidebar
        sections={availableSections}
        activeCategory={navCategory}
        counts={navCounts}
        onSelectCategory={handleSelectCategory}
        onNavigate={() => {
          if (!isDesktop) {
            setMobileNavOpen(false);
          }
        }}
      />

      <JourneyDiaryRepresentativePicture />
    </Stack>
  );

  return (
    <Box
      component="section"
      sx={{
        flex: 1,
        minHeight: 0,
        height: { xs: 'auto', lg: 1 },
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        bgcolor: spaceTheme.pageBg,
        color: spaceTheme.textPrimary,
        overflow: { xs: 'visible', lg: 'hidden' },
        ...sx,
      }}
      {...other}
    >
      {isDesktop ? (
        <Box
          component="aside"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: 1,
            pr: 2,
            mr: 2.5,
            bgcolor: spaceTheme.sidebarBg,
            color: spaceTheme.sidebarTextPrimary,
            borderRight: '1px solid',
            borderColor: spaceTheme.sidebarBorder,
            borderRadius: { lg: 2 },
          }}
        >
          {sidebar}
        </Box>
      ) : null}

      <Box
        component="main"
        id="journey-diary-main-scroll"
        sx={{
          position: 'relative',
          flex: '1 1 auto',
          minWidth: 0,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          bgcolor: spaceTheme.contentBg,
          borderRadius: 2,
          color: spaceTheme.textPrimary,
          px: { xs: 2, sm: 3, lg: 0 },
          pl: { lg: 0.5 },
          pb: 2,
          scrollbarWidth: 'thin',
        }}
      >
        {!isDesktop ? (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.25}
            sx={{ pt: 2, pb: 1.5, position: 'sticky', top: 0, zIndex: 2, bgcolor: spaceTheme.contentBg }}
          >
            <IconButton onClick={() => setMobileNavOpen(true)} aria-label="Open journey diary navigation">
              <Iconify icon="solar:hamburger-menu-linear" />
            </IconButton>
            <Avatar
              src={customerAvatarUrl || undefined}
              alt={customerName}
              sx={{
                width: 40,
                height: 40,
                border: '2px solid',
                borderColor: spaceTheme.border,
                bgcolor: spaceTheme.accentSoft,
                color: spaceTheme.accent,
              }}
            >
              {customerName.charAt(0)}
            </Avatar>
            <Typography
              variant="h6"
              sx={{
                fontFamily: spaceTheme.decorativeFont || MYSPACE_SECTION_SERIF,
                fontWeight: 600,
                flex: 1,
                minWidth: 0,
              }}
              noWrap
            >
              {JOURNEY_DIARY_TITLE}
            </Typography>
          </Stack>
        ) : null}

        <Stack spacing={3} sx={{ pt: { xs: 0, lg: 1 }, px: { lg: 2 } }}>
          {showMyJourneyScrapbook ? (
            <UniverseLandingJourneyDiaryMyJourney
              pictures={resolvedPictures}
              locations={locations}
              communityUsers={communityUsers}
              loading={loading || isResolving}
              onOpenPicture={openTripPicture}
            />
          ) : showMyNotesScrapbook ? (
            <UniverseLandingJourneyDiaryMyNotes
              notes={resolvedNotes}
              pictures={resolvedPictures}
              locations={locations}
              loading={loading || isResolving}
              onOpenNote={openTripNote}
            />
          ) : showMemorialThingsScrapbook ? (
            <UniverseLandingJourneyDiaryMyMemorialThings
              memorialThings={resolvedMemorialThings}
              pictures={resolvedPictures}
              locations={locations}
              loading={loading || isResolving}
              onOpenMemorial={openTripMemorial}
            />
          ) : showHomeDashboard ? (
            <UniverseLandingJourneyDiaryHome
              entries={allEntries}
              pictures={resolvedPictures}
              locations={locations}
              customerName={customerName}
              categorySections={availableSections.filter((section) => section.id !== 'all')}
              navCounts={navCounts}
              loading={loading || isResolving}
              onEntryClick={openEntryDetail}
              onSelectCategory={(category) => {
                setNavCategory(category);
                setMobileNavOpen(false);
              }}
            />
          ) : (
            <>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'flex-end' }}
                justifyContent="space-between"
              >
                <MySpaceSectionTitle
                  title={activeNavSection?.title ?? 'HOME'}
                  subtitle={activeNavSection?.description ?? JOURNEY_DIARY_SUBTITLE}
                  itemCount={filteredEntries.length}
                />

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  sx={{ width: { xs: 1, md: 'auto' } }}
                >
                  <TextField
                    size="small"
                    placeholder="Search entries..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    sx={{
                      minWidth: { sm: 240 },
                      bgcolor: 'background.paper',
                      borderRadius: 99,
                      '& .MuiOutlinedInput-root': { borderRadius: 99 },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Iconify icon="eva:search-fill" width={18} sx={{ color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    }}
                  />

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
              </Stack>

              {loading || isResolving ? (
                <Typography color="text.secondary">Loading journey diary...</Typography>
              ) : filteredEntries.length === 0 ? (
                <Typography color="text.secondary">
                  {searchQuery.trim()
                    ? 'No entries match your search.'
                    : 'No shared journey diary items found.'}
                </Typography>
              ) : (
                <>
                  <Box
                    ref={gridRef}
                    sx={myspaceBlogListGridSx({
                      itemCount: paginatedEntries.length,
                      pageSize: JOURNEY_PAGE_SIZE,
                      columnCount,
                    })}
                  >
                    {paginatedEntries.map((entry) => (
                      <Box key={`${entry.kind}-${entry.id}`} sx={myspaceBlogListGridItemSx}>
                        <JourneyDiaryEntryCard entry={entry} onClick={() => openEntryDetail(entry)} />
                      </Box>
                    ))}
                  </Box>

                  {pageCount > 1 ? (
                    <Stack alignItems="center" sx={{ pt: 1 }}>
                      <Pagination
                        count={pageCount}
                        page={page}
                        onChange={(_, value) => setPage(value)}
                        shape="rounded"
                        sx={getMyspacePaginationSx(spaceTheme)}
                      />
                    </Stack>
                  ) : null}
                </>
              )}
            </>
          )}
        </Stack>
      </Box>

      <Drawer
        anchor="left"
        open={!isDesktop && mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: 'min(100vw, 360px)', sm: SIDEBAR_WIDTH + 32 },
            bgcolor: spaceTheme.sidebarBg,
            color: spaceTheme.sidebarTextPrimary,
            p: 2,
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {sidebar}
      </Drawer>

      <UniverseLandingJourneyDiaryDetailDialog
        detail={detail}
        onClose={() => setDetail(null)}
        onPrev={handlePrevDetail}
        onNext={handleNextDetail}
      />
    </Box>
  );
}
