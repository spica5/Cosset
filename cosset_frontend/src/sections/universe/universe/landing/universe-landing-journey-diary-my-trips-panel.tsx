'use client';

import type { DesignSpaceTheme } from 'src/utils/design-space-type';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Iconify } from 'src/components/universe/iconify';

import { MyJourneyCountryIcon } from 'src/sections/dashboard/journey-diary/my-journey-country-icon';

import {
  formatTripDateRange,
  type UniverseTripFilter,
  type UniverseJourneyTrip,
} from './universe-landing-journey-diary-my-journey-utils';

// ----------------------------------------------------------------------

export type JourneyPalette = {
  paper: string;
  card: string;
  ink: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  panel: string;
  panelActive: string;
  gridLine: string;
};

export function getJourneyPalette(theme: DesignSpaceTheme): JourneyPalette {
  return {
    paper: theme.contentBg,
    card: theme.surfaceBg,
    ink: theme.textPrimary,
    muted: theme.textSecondary,
    border: `1px solid ${theme.border}`,
    accent: theme.accent,
    accentSoft: theme.accentSoft,
    panel: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.cardBg,
    panelActive: theme.isDark ? 'rgba(255,255,255,0.12)' : theme.surfaceBg,
    gridLine: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0, 0, 0, 0.04)',
  };
}

type TripListCardProps = {
  trip: UniverseJourneyTrip;
  active: boolean;
  palette: JourneyPalette;
  count: number;
  countLabel: 'photo' | 'note' | 'memorial';
  onSelect: () => void;
};

export function JourneyDiaryTripListCard({
  trip,
  active,
  palette,
  count,
  countLabel,
  onSelect,
}: TripListCardProps) {
  const countText =
    countLabel === 'note'
      ? `${count} ${count === 1 ? 'note' : 'notes'}`
      : countLabel === 'memorial'
        ? `${count} ${count === 1 ? 'thing' : 'things'}`
        : `${count} ${count === 1 ? 'photo' : 'photos'}`;

  return (
    <Button
      onClick={onSelect}
      color="inherit"
      sx={{
        justifyContent: 'flex-start',
        textAlign: 'left',
        width: 1,
        p: 1.25,
        borderRadius: 2,
        border: active ? `2px solid ${palette.accent}` : palette.border,
        bgcolor: active ? palette.panelActive : palette.panel,
        boxShadow: active ? '0 6px 16px rgba(60, 45, 30, 0.08)' : 'none',
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: 1, minWidth: 0 }}>
        <Box
          sx={{
            width: 54,
            height: 54,
            borderRadius: 1.5,
            overflow: 'hidden',
            flexShrink: 0,
            bgcolor: 'grey.200',
          }}
        >
          {trip.coverUrl ? (
            <Box
              component="img"
              src={trip.coverUrl}
              alt={trip.country}
              sx={{ width: 1, height: 1, objectFit: 'cover' }}
            />
          ) : (
            <Stack alignItems="center" justifyContent="center" sx={{ width: 1, height: 1 }}>
              <Iconify icon="solar:gallery-bold" width={20} sx={{ color: 'text.disabled' }} />
            </Stack>
          )}
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <MyJourneyCountryIcon country={trip.country} />
            <Typography sx={{ fontWeight: 700, color: palette.ink }} noWrap>
              {trip.country}
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
            {formatTripDateRange(trip.visitedAt, trip.endAt)}
          </Typography>
          <Typography variant="caption" sx={{ color: palette.accent, fontWeight: 700 }}>
            {countText}
          </Typography>
        </Box>
      </Stack>
    </Button>
  );
}

type JourneyDiaryMyTripsPanelProps = {
  filteredTrips: UniverseJourneyTrip[];
  tripFilter: UniverseTripFilter;
  selectedTripKey: string | null;
  palette: JourneyPalette;
  spaceTheme: DesignSpaceTheme;
  countLabel: 'photo' | 'note' | 'memorial';
  getTripCount: (trip: UniverseJourneyTrip) => number;
  onFilterChange: (filter: UniverseTripFilter) => void;
  onSelectTrip: (groupKey: string) => void;
};

export function JourneyDiaryMyTripsPanel({
  filteredTrips,
  tripFilter,
  selectedTripKey,
  palette,
  spaceTheme,
  countLabel,
  getTripCount,
  onFilterChange,
  onSelectTrip,
}: JourneyDiaryMyTripsPanelProps) {
  return (
    <Box
      sx={{
        width: { xs: 1, xl: 280 },
        flexShrink: 0,
        borderRadius: 2,
        border: palette.border,
        bgcolor: palette.panel,
        p: 2,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Iconify icon="solar:airplane-bold" width={18} sx={{ color: palette.accent }} />
          <Typography sx={{ fontWeight: 800, color: palette.ink }}>My Trips</Typography>
        </Stack>
      </Stack>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={tripFilter}
        onChange={(_, value: UniverseTripFilter | null) => {
          if (value) {
            onFilterChange(value);
          }
        }}
        sx={{
          mb: 1.5,
          width: 1,
          '& .MuiToggleButton-root': {
            flex: 1,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.78rem',
            color: palette.ink,
            borderColor: spaceTheme.border,
            '&.Mui-selected': {
              bgcolor: palette.accentSoft,
              color: palette.accent,
            },
          },
        }}
      >
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="past">Past</ToggleButton>
        <ToggleButton value="upcoming">Upcoming</ToggleButton>
      </ToggleButtonGroup>

      <Stack spacing={1}>
        {filteredTrips.map((trip) => (
          <JourneyDiaryTripListCard
            key={trip.groupKey}
            trip={trip}
            active={selectedTripKey === trip.groupKey}
            palette={palette}
            count={getTripCount(trip)}
            countLabel={countLabel}
            onSelect={() => onSelectTrip(trip.groupKey)}
          />
        ))}
      </Stack>
    </Box>
  );
}
