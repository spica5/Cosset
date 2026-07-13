'use client';

import type { IJourneyDiaryLocation } from 'src/types/journey-diary-location';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

import { Iconify } from 'src/components/universe/iconify';

import { useDesignSpaceTheme } from './design-space-theme-context';
import { MYSPACE_ITEM_TITLE_FONT } from './myspace-section-title';
import {
  filterUniverseTrips,
  formatTripDateRange,
  getJourneyGroupKey,
  buildUniverseTripsForNotes,
  type UniverseTripFilter,
} from './universe-landing-journey-diary-my-journey-utils';
import {
  getJourneyPalette,
  JourneyDiaryMyTripsPanel,
} from './universe-landing-journey-diary-my-trips-panel';

import type { JourneyNoteDetailItem, JourneyPictureDetailItem } from './universe-landing-journey-diary-detail-dialog';

// ----------------------------------------------------------------------

type Props = {
  notes: JourneyNoteDetailItem[];
  pictures: JourneyPictureDetailItem[];
  locations: IJourneyDiaryLocation[];
  loading?: boolean;
  onOpenNote: (notes: JourneyNoteDetailItem[], index: number) => void;
};

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function formatBadgeMonth(value?: string | null) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleString('en-US', { month: 'short' }).toUpperCase()
    : 'MEM';
}

function formatBadgeDay(value?: string | null) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? String(parsed.getDate()).padStart(2, '0') : '--';
}

function NoteDateBadge({
  note,
  palette,
}: {
  note: JourneyNoteDetailItem;
  palette: ReturnType<typeof getJourneyPalette>;
}) {
  const dateValue = note.noteDate || note.createdAt;

  return (
    <Box
      sx={{
        p: 0.75,
        borderRadius: 2,
        border: palette.border,
        bgcolor: palette.panel,
        flexShrink: 0,
      }}
    >
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{
          minWidth: 54,
          px: 0.75,
          py: 1,
          borderRadius: 1.5,
          border: palette.border,
          bgcolor: palette.card,
          color: palette.ink,
          lineHeight: 1,
        }}
      >
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>
          {formatBadgeMonth(dateValue)}
        </Typography>
        <Typography sx={{ fontSize: '1.05rem', fontWeight: 800, mt: 0.25 }}>
          {formatBadgeDay(dateValue)}
        </Typography>
      </Stack>
    </Box>
  );
}

function NoteListCard({
  note,
  onClick,
  palette,
}: {
  note: JourneyNoteDetailItem;
  onClick: () => void;
  palette: ReturnType<typeof getJourneyPalette>;
}) {
  const excerpt = stripHtml((note.content || '').trim()) || 'No content yet.';
  const journeyLabel = note.journeyCountry || 'Journey';

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: palette.border,
        bgcolor: palette.panelActive,
        overflow: 'hidden',
      }}
    >
      <CardActionArea onClick={onClick} sx={{ p: 0 }}>
        <Stack direction="row" spacing={1.5} alignItems="stretch" sx={{ p: 1.5 }}>
          <NoteDateBadge note={note} palette={palette} />

          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0, py: 0.25 }}>
            <Typography
              sx={{
                fontFamily: MYSPACE_ITEM_TITLE_FONT,
                fontWeight: 700,
                color: palette.ink,
              }}
              noWrap
            >
              {note.title}
            </Typography>
            <Typography variant="caption" sx={{ color: palette.accent, fontWeight: 600 }}>
              {journeyLabel}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: palette.muted,
                mt: 0.25,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.6,
              }}
            >
              {excerpt}
            </Typography>
          </Stack>

          <Box
            sx={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {note.signedImageUrl ? (
              <Box
                component="img"
                src={note.signedImageUrl}
                alt={note.title}
                sx={{
                  width: { xs: 72, sm: 96 },
                  height: { xs: 72, sm: 80 },
                  objectFit: 'cover',
                  borderRadius: 1.5,
                  border: palette.border,
                  display: 'block',
                }}
              />
            ) : null}
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

export function UniverseLandingJourneyDiaryMyNotes({
  notes,
  pictures,
  locations,
  loading = false,
  onOpenNote,
}: Props) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const palette = useMemo(() => getJourneyPalette(spaceTheme), [spaceTheme]);
  const trips = useMemo(
    () => buildUniverseTripsForNotes(pictures, notes, locations),
    [locations, notes, pictures],
  );

  const [tripFilter, setTripFilter] = useState<UniverseTripFilter>('all');
  const [selectedTripKey, setSelectedTripKey] = useState<string | null>(null);

  const filteredTrips = useMemo(
    () => filterUniverseTrips(trips, tripFilter),
    [tripFilter, trips],
  );

  const selectedTrip = useMemo(() => {
    const fallback = filteredTrips[0] || trips[0] || null;
    if (!selectedTripKey) {
      return fallback;
    }

    return filteredTrips.find((trip) => trip.groupKey === selectedTripKey) || fallback;
  }, [filteredTrips, selectedTripKey, trips]);

  const tripNotes = useMemo(() => {
    if (!selectedTrip) {
      return [];
    }

    return notes
      .filter((note) => getJourneyGroupKey(note) === selectedTrip.groupKey)
      .sort((a, b) => {
        const aTime = new Date(a.noteDate || a.createdAt || 0).getTime();
        const bTime = new Date(b.noteDate || b.createdAt || 0).getTime();
        return bTime - aTime;
      });
  }, [notes, selectedTrip]);

  if (loading) {
    return (
      <Typography color="text.secondary" sx={{ py: 4 }}>
        Loading journey diary...
      </Typography>
    );
  }

  if (!trips.length) {
    return (
      <Typography color="text.secondary" sx={{ py: 4 }}>
        No shared travel notes found.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        borderRadius: 2.5,
        overflow: 'hidden',
        bgcolor: palette.paper,
        border: palette.border,
        backgroundImage: `linear-gradient(${palette.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${palette.gridLine} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
      }}
    >
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 2.5 } }}>
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2, md: 2.5 },
            alignItems: 'start',
            gridTemplateColumns: {
              xs: '1fr',
              lg: 'minmax(220px, 250px) minmax(0, 1fr)',
            },
          }}
        >
          <JourneyDiaryMyTripsPanel
            filteredTrips={filteredTrips}
            tripFilter={tripFilter}
            selectedTripKey={selectedTrip?.groupKey ?? null}
            palette={palette}
            spaceTheme={spaceTheme}
            countLabel="note"
            getTripCount={(trip) => trip.noteCount || 0}
            onFilterChange={(filter) => {
              setTripFilter(filter);
              setSelectedTripKey(null);
            }}
            onSelectTrip={setSelectedTripKey}
          />

          <Box
            sx={{
              minWidth: 0,
              borderRadius: 2,
              border: palette.border,
              bgcolor: palette.panelActive,
              p: { xs: 1.5, sm: 2, md: 2.5 },
              overflow: 'hidden',
            }}
          >
            <Stack spacing={0.5} sx={{ mb: 2.5 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Iconify icon="solar:notebook-bold" width={18} sx={{ color: palette.accent }} />
                <Typography
                  sx={{
                    fontFamily: spaceTheme.decorativeFont || MYSPACE_ITEM_TITLE_FONT,
                    fontWeight: 700,
                    fontSize: '1.5rem',
                    color: palette.ink,
                  }}
                >
                  My Notes
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Travel journal entries from each journey.
              </Typography>
            </Stack>

            {selectedTrip ? (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="h6" sx={{ color: palette.ink, fontWeight: 700 }}>
                  {selectedTrip.country}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatTripDateRange(selectedTrip.visitedAt, selectedTrip.endAt)}
                  {selectedTrip.journeyName ? ` · ${selectedTrip.journeyName}` : ''}
                </Typography>
              </Box>
            ) : null}

            {tripNotes.length ? (
              <Stack spacing={1.5}>
                {tripNotes.map((note, index) => (
                  <NoteListCard
                    key={note.id}
                    note={note}
                    palette={palette}
                    onClick={() => onOpenNote(tripNotes, index)}
                  />
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary" sx={{ py: 4 }}>
                No notes for this trip yet.
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
