'use client';

import type { IJourneyDiaryLocation } from 'src/types/journey-diary-location';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

import { Iconify } from 'src/components/universe/iconify';

import { JourneyDiaryWorldMap } from 'src/sections/dashboard/journey-diary/journey-diary-world-map';

import { MYSPACE_ITEM_TITLE_FONT } from './myspace-section-title';
import { useDesignSpaceTheme } from './design-space-theme-context';
import {
  JOURNEY_DIARY_HOME_TAGLINE,
  type JourneyDiaryNavSection,
  type JourneyDiaryNavCategory,
} from './universe-landing-journey-diary-theme';
import {
  buildJourneyStats,
  buildLocationVisitStats,
  buildUniverseMapMarkers,
  buildUniverseJourneyTrips,
} from './universe-landing-journey-diary-my-journey-utils';
import {
  ENTRY_CATEGORY_META,
  type JourneyDiaryEntry,
  journeyDiaryDateBadgeSx,
  JOURNEY_HOME_RECENT_SIZE,
  journeyDiaryCategoryBadgeSx,
  JOURNEY_ENTRY_IMAGE_GRADIENT,
} from './universe-landing-journey-diary-utils';

import type { JourneyPictureDetailItem } from './universe-landing-journey-diary-detail-dialog';

// ----------------------------------------------------------------------

type Props = {
  entries: JourneyDiaryEntry[];
  pictures: JourneyPictureDetailItem[];
  locations: IJourneyDiaryLocation[];
  customerName: string;
  categorySections: JourneyDiaryNavSection[];
  navCounts: Partial<Record<JourneyDiaryNavCategory, number>>;
  loading?: boolean;
  onEntryClick: (entry: JourneyDiaryEntry) => void;
  onSelectCategory: (category: JourneyDiaryNavCategory) => void;
};

function formatCategoryLabel(title: string) {
  return title.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function JourneyDiaryHomeCategoryButton({
  section,
  count,
  onClick,
}: {
  section: JourneyDiaryNavSection;
  count: number;
  onClick: () => void;
}) {
  const { theme: spaceTheme } = useDesignSpaceTheme();

  return (
    <Button
      onClick={onClick}
      color="inherit"
      sx={{
        flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 0' },
        minWidth: { xs: 0, sm: 150 },
        px: 2,
        py: 1.5,
        borderRadius: 2.5,
        border: `1px solid ${spaceTheme.border}`,
        bgcolor: spaceTheme.surfaceBg,
        textTransform: 'none',
        justifyContent: 'flex-start',
        gap: 1.25,
        '&:hover': {
          bgcolor: spaceTheme.accentSoft,
          borderColor: spaceTheme.accent,
        },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          bgcolor: spaceTheme.accentSoft,
          color: spaceTheme.accent,
        }}
      >
        <Iconify icon={section.icon} width={20} />
      </Box>

      <Stack alignItems="flex-start" spacing={0.15} sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, color: spaceTheme.textPrimary, lineHeight: 1.2 }} noWrap>
          {formatCategoryLabel(section.title)}
        </Typography>
        <Typography variant="caption" sx={{ color: spaceTheme.textSecondary }} noWrap>
          {count} {count === 1 ? 'item' : 'items'}
        </Typography>
      </Stack>

      <Box sx={{ flex: 1 }} />

      <Iconify icon="eva:arrow-forward-fill" width={18} sx={{ color: spaceTheme.accent, flexShrink: 0 }} />
    </Button>
  );
}

function getEntryTimestamp(entry: JourneyDiaryEntry) {
  if (!entry.createdAt) {
    return 0;
  }

  const parsed = new Date(entry.createdAt);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatRecentDateLabel(entry: JourneyDiaryEntry) {
  if (entry.createdAt) {
    const parsed = new Date(entry.createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  }

  return entry.dateLabel || 'Recent';
}

function JourneyDiaryHomeRecentCard({
  entry,
  onClick,
}: {
  entry: JourneyDiaryEntry;
  onClick: () => void;
}) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const excerpt = entry.excerpt || entry.subtitle;
  const categoryMeta = ENTRY_CATEGORY_META[entry.kind];

  return (
    <Card
      elevation={0}
      sx={{
        width: 220,
        flexShrink: 0,
        borderRadius: 2.5,
        overflow: 'hidden',
        border: `1px solid ${spaceTheme.border}`,
        bgcolor: spaceTheme.surfaceBg,
        boxShadow: spaceTheme.isDark
          ? '0 8px 24px rgba(0,0,0,0.22)'
          : '0 10px 24px rgba(60, 45, 30, 0.08)',
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: 1, alignItems: 'stretch' }}>
        <Box sx={{ position: 'relative', pt: '68%' }}>
          {entry.imageUrl ? (
            <Box
              component="img"
              src={entry.imageUrl}
              alt={entry.title}
              sx={{ position: 'absolute', inset: 0, width: 1, height: 1, objectFit: 'cover' }}
            />
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: spaceTheme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: spaceTheme.textSecondary,
              }}
            >
              <Iconify icon={categoryMeta.icon} width={28} />
            </Stack>
          )}

          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: JOURNEY_ENTRY_IMAGE_GRADIENT,
              pointerEvents: 'none',
            }}
          />

          <Box
            component="span"
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              ...journeyDiaryDateBadgeSx(),
            }}
          >
            {formatRecentDateLabel(entry)}
          </Box>

          <Box
            component="span"
            sx={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              ...journeyDiaryCategoryBadgeSx(spaceTheme.accent),
            }}
          >
            <Iconify icon={categoryMeta.icon} width={12} sx={{ flexShrink: 0, color: 'inherit' }} />
            <Box component="span" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {categoryMeta.label}
            </Box>
          </Box>
        </Box>

        <Stack spacing={0.75} sx={{ p: 1.75 }}>
          <Typography
            sx={{
              fontFamily: MYSPACE_ITEM_TITLE_FONT,
              fontWeight: 700,
              fontSize: '1rem',
              color: spaceTheme.textPrimary,
            }}
            noWrap
          >
            {entry.title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: spaceTheme.textSecondary,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.5,
              minHeight: 42,
            }}
          >
            {excerpt}
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pt: 0.5 }}>
            <Stack direction="row" spacing={0.35} alignItems="center">
              <Iconify icon="solar:heart-bold" width={14} sx={{ color: spaceTheme.accent }} />
              <Typography variant="caption" color="text.secondary">
                0
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.35} alignItems="center">
              <Iconify icon="solar:chat-round-dots-bold" width={14} sx={{ color: spaceTheme.textSecondary }} />
              <Typography variant="caption" color="text.secondary">
                0
              </Typography>
            </Stack>
            <Box sx={{ flex: 1 }} />
            <Iconify icon="eva:more-horizontal-fill" width={16} sx={{ color: spaceTheme.textSecondary }} />
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

export function UniverseLandingJourneyDiaryHome({
  entries,
  pictures,
  locations,
  customerName,
  categorySections,
  navCounts,
  loading = false,
  onEntryClick,
  onSelectCategory,
}: Props) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const [showAllEntries, setShowAllEntries] = useState(false);
  const firstName = (customerName || 'Friend').trim().split(/\s+/)[0] || 'Friend';

  const trips = useMemo(() => buildUniverseJourneyTrips(pictures, locations), [locations, pictures]);
  const mapMarkers = useMemo(() => buildUniverseMapMarkers(locations, trips), [locations, trips]);
  const visitStats = useMemo(() => {
    if (trips.length) {
      return buildJourneyStats(trips, locations);
    }

    const locationStats = buildLocationVisitStats(locations);

    return {
      ...locationStats,
      photos: entries.filter((entry) => entry.kind === 'picture').length,
      trips: 0,
    };
  }, [entries, locations, trips]);

  const recentEntries = useMemo(
    () =>
      [...entries]
        .sort((a, b) => getEntryTimestamp(b) - getEntryTimestamp(a))
        .slice(0, showAllEntries ? entries.length : JOURNEY_HOME_RECENT_SIZE),
    [entries, showAllEntries],
  );

  const monthStats = useMemo(() => ({
    entries: entries.length,
    photos: entries.filter((entry) => entry.kind === 'picture').length,
    notes: entries.filter((entry) => entry.kind === 'note').length,
    memorialThings: entries.filter((entry) => entry.kind === 'memorial').length,
  }), [entries]);

  if (loading) {
    return (
      <Typography color="text.secondary" sx={{ py: 4 }}>
        Loading journey diary...
      </Typography>
    );
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: spaceTheme.decorativeFont || MYSPACE_ITEM_TITLE_FONT,
            fontWeight: 700,
            color: spaceTheme.textPrimary,
          }}
        >
          Welcome, {firstName}&apos;s Journey Diary
        </Typography>
        <Typography variant="body2" sx={{ color: spaceTheme.textSecondary, mt: 0.5 }}>
          {JOURNEY_DIARY_HOME_TAGLINE}
        </Typography>
      </Box>

      {categorySections.length ? (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          {categorySections.map((section) => (
            <JourneyDiaryHomeCategoryButton
              key={section.id}
              section={section}
              count={navCounts[section.id] ?? 0}
              onClick={() => onSelectCategory(section.id)}
            />
          ))}
        </Box>
      ) : null}

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
        <Box
          sx={{
            flex: 1.4,
            borderRadius: 2.5,
            border: `1px solid ${spaceTheme.border}`,
            bgcolor: spaceTheme.surfaceBg,
            p: 2.5,
            minHeight: 150,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
            <Iconify icon="solar:map-point-bold" width={18} sx={{ color: spaceTheme.accent }} />
            <Typography sx={{ fontWeight: 800, color: spaceTheme.textPrimary }}>
              Where have you been
            </Typography>
          </Stack>

          {mapMarkers.length ? (
            <>
              <JourneyDiaryWorldMap markers={mapMarkers} height={180} />
              <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, color: spaceTheme.accent }}>{visitStats.countries}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Countries
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, color: spaceTheme.accent }}>{visitStats.cities}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Cities
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, color: spaceTheme.accent }}>{visitStats.photos}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Photos
                  </Typography>
                </Box>
              </Stack>
            </>
          ) : (
            <Typography variant="body2" sx={{ color: spaceTheme.textSecondary, lineHeight: 1.7 }}>
              No visited places shared yet.
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            flex: 1,
            borderRadius: 2.5,
            border: `1px solid ${spaceTheme.border}`,
            bgcolor: spaceTheme.surfaceBg,
            p: 2,
          }}
        >
          <Typography sx={{ fontWeight: 800, color: spaceTheme.textPrimary, mb: 1.5 }}>This Month</Typography>
          <Stack spacing={1.25}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="solar:notebook-bold" width={18} sx={{ color: spaceTheme.accent }} />
                <Typography variant="body2">Entries</Typography>
              </Stack>
              <Typography sx={{ fontWeight: 800 }}>{monthStats.entries}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="solar:camera-bold" width={18} sx={{ color: spaceTheme.accent }} />
                <Typography variant="body2">Photos</Typography>
              </Stack>
              <Typography sx={{ fontWeight: 800 }}>{monthStats.photos}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="solar:document-text-bold" width={18} sx={{ color: spaceTheme.accent }} />
                <Typography variant="body2">Notes</Typography>
              </Stack>
              <Typography sx={{ fontWeight: 800 }}>{monthStats.notes}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify icon="solar:heart-bold" width={18} sx={{ color: spaceTheme.accent }} />
                <Typography variant="body2">Memorial Things</Typography>
              </Stack>
              <Typography sx={{ fontWeight: 800 }}>{monthStats.memorialThings}</Typography>
            </Stack>
          </Stack>
        </Box>
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Typography
          variant="h5"
          sx={{
            fontFamily: spaceTheme.decorativeFont || MYSPACE_ITEM_TITLE_FONT,
            fontWeight: 700,
            color: spaceTheme.textPrimary,
          }}
        >
          Recent Entries
        </Typography>
        {entries.length > JOURNEY_HOME_RECENT_SIZE ? (
          <Button
            onClick={() => setShowAllEntries((prev) => !prev)}
            endIcon={<Iconify icon="eva:arrow-forward-fill" />}
            sx={{ color: spaceTheme.accent, fontWeight: 700 }}
          >
            {showAllEntries ? 'Show less' : 'View all'}
          </Button>
        ) : null}
      </Stack>

      {entries.length === 0 ? (
        <Typography color="text.secondary">No shared journey diary items found.</Typography>
      ) : (
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 1,
            scrollbarWidth: 'thin',
          }}
        >
          {recentEntries.map((entry) => (
            <JourneyDiaryHomeRecentCard
              key={`${entry.kind}-${entry.id}`}
              entry={entry}
              onClick={() => onEntryClick(entry)}
            />
          ))}
        </Box>
      )}


    </Stack>
  );
}
