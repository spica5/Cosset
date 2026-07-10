'use client';

import type { DesignSpaceTheme } from 'src/utils/design-space-type';
import type { IJourneyDiaryLocation } from 'src/types/journey-diary-location';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/universe/iconify';

import { useDesignSpaceTheme } from './design-space-theme-context';
import {
  getJourneyPalette,
  type JourneyPalette,
  JourneyDiaryMyTripsPanel,
} from './universe-landing-journey-diary-my-trips-panel';
import {
  buildJourneyStats,
  getAllCompanionIds,
  filterUniverseTrips,
  formatTripDateRange,
  type UniverseTripFilter,
  type UniverseJourneyTrip,
  buildUniverseJourneyTrips,
  formatPictureVisitDateLabel,
} from './universe-landing-journey-diary-my-journey-utils';

import type { JourneyPictureDetailItem } from './universe-landing-journey-diary-detail-dialog';

// ----------------------------------------------------------------------

type CommunityUser = {
  id?: string | number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  photoURL?: string | null;
};

type Props = {
  pictures: JourneyPictureDetailItem[];
  locations: IJourneyDiaryLocation[];
  communityUsers?: CommunityUser[];
  loading?: boolean;
  onOpenPicture: (trip: UniverseJourneyTrip, index: number) => void;
};

function resolveCompanionProfiles(companionIds: string[], users: CommunityUser[]) {
  const byId = new Map(users.map((user) => [String(user.id || '').toLowerCase(), user]));

  return companionIds.map((id) => {
    const user = byId.get(String(id).toLowerCase());
    const name = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || String(user.email || 'Traveler')
      : 'Traveler';
    const avatarUrl = String(user?.photoURL || '').trim();

    return { id, name, avatarUrl };
  });
}

function JourneyCompanionsPanel({
  companionIds,
  communityUsers,
  palette,
  spaceTheme,
}: {
  companionIds: string[];
  communityUsers: CommunityUser[];
  palette: JourneyPalette;
  spaceTheme: DesignSpaceTheme;
}) {
  const companions = useMemo(
    () => resolveCompanionProfiles(companionIds, communityUsers),
    [companionIds, communityUsers],
  );

  return (
    <Box sx={{ borderRadius: 2, border: palette.border, bgcolor: palette.panelActive, p: 2 }}>
      <Typography sx={{ fontWeight: 800, color: palette.ink, mb: 1.25 }}>
        Who travelled with you?
      </Typography>

      {companions.length ? (
        <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
          {companions.map((companion) => (
            <Stack key={companion.id} alignItems="center" spacing={0.5} sx={{ width: 76 }}>
              <Avatar
                src={
                  companion.avatarUrl.startsWith('http://') || companion.avatarUrl.startsWith('https://')
                    ? companion.avatarUrl
                    : undefined
                }
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: spaceTheme.accentSoft,
                  color: spaceTheme.accent,
                  border: `2px solid ${spaceTheme.border}`,
                }}
              >
                {companion.name.charAt(0)}
              </Avatar>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ width: 1, textAlign: 'center' }}
              >
                {companion.name}
              </Typography>
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: palette.muted, lineHeight: 1.6 }}>
          No travel companions added for this trip yet.
        </Typography>
      )}
    </Box>
  );
}

function ScrapbookPolaroid({
  imageUrl,
  title,
  rotation = 0,
  palette,
}: {
  imageUrl: string;
  title: string;
  rotation?: number;
  palette: JourneyPalette;
}) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: { xs: 1, md: 220 },
        maxWidth: 220,
        flexShrink: 0,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%) rotate(-4deg)',
          width: 54,
          height: 18,
          bgcolor: 'rgba(214, 198, 164, 0.92)',
          border: '1px solid rgba(160, 140, 108, 0.45)',
          borderRadius: 0.5,
          zIndex: 2,
        }}
      />
      <Box
        sx={{
          bgcolor: '#fff',
          p: 1,
          pb: 2.5,
          borderRadius: 0.5,
          boxShadow: '0 8px 20px rgba(60, 45, 30, 0.14)',
        }}
      >
        <Box
          component="img"
          src={imageUrl}
          alt={title}
          sx={{
            width: 1,
            aspectRatio: '4 / 3',
            objectFit: 'cover',
            display: 'block',
            bgcolor: 'grey.200',
          }}
        />
        <Typography
          sx={{
            mt: 1,
            px: 0.5,
            textAlign: 'center',
            fontFamily: '"Caveat", "Segoe Script", cursive',
            fontSize: '1.05rem',
            color: palette.ink,
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
      </Box>
    </Box>
  );
}

function TimelineEntry({
  picture,
  trip,
  index,
  onOpen,
  palette,
}: {
  picture: JourneyPictureDetailItem;
  trip: UniverseJourneyTrip;
  index: number;
  onOpen: () => void;
  palette: JourneyPalette;
}) {
  const title = (picture.caption || '').trim() || `Memory ${index + 1}`;
  const visitDateLabel = formatPictureVisitDateLabel(picture, trip);

  return (
    <Stack direction="row" spacing={2} sx={{ position: 'relative', pl: { xs: 0, md: 1 } }}>
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          width: 72,
          flexShrink: 0,
          pt: 1,
          textAlign: 'right',
          pr: 1,
        }}
      >
        <Stack spacing={0.25} sx={{ pt: 1 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '0.62rem',
              letterSpacing: '0.12em',
              color: palette.muted,
              lineHeight: 1,
            }}
          >
            VISITED
          </Typography>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              color: palette.accent,
              lineHeight: 1.2,
            }}
          >
            {visitDateLabel || 'Date TBD'}
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ position: 'relative', flex: 1, minWidth: 0, pb: 4 }}>
        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            position: 'absolute',
            left: -18,
            top: 12,
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: palette.accent,
            boxShadow: `0 0 0 4px ${palette.accentSoft}`,
          }}
        />

        <Box
          onClick={onOpen}
          sx={{
            cursor: 'pointer',
            borderRadius: 2.5,
            border: palette.border,
            bgcolor: palette.panelActive,
            p: { xs: 2, md: 2.5 },
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 10px 24px rgba(60, 45, 30, 0.1)',
            },
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2.5}
            alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          >
            {picture.signedImageUrl ? (
              <ScrapbookPolaroid
                imageUrl={picture.signedImageUrl}
                title={title}
                rotation={((index % 3) - 1) * 1.5}
                palette={palette}
              />
            ) : null}

            <Stack spacing={1} sx={{ flex: 1, minWidth: 0, pt: { sm: 0.5 } }}>
              <Typography sx={{ display: { md: 'none' }, fontSize: '0.62rem', fontWeight: 800, color: palette.muted, letterSpacing: '0.12em' }}>
                VISITED
              </Typography>
              <Typography sx={{ display: { md: 'none' }, fontSize: '0.72rem', fontWeight: 800, color: palette.accent }}>
                {visitDateLabel || 'Date TBD'}
              </Typography>
              <Typography variant="h6" sx={{ color: palette.ink, fontWeight: 700 }}>
                {title}
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: 'text.secondary' }}>
                <Iconify icon="solar:map-point-bold" width={16} />
                <Typography variant="body2">{trip.locationLabel}</Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                {title}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Stack>
  );
}

export function UniverseLandingJourneyDiaryMyJourney({
  pictures,
  locations,
  communityUsers = [],
  loading = false,
  onOpenPicture,
}: Props) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const palette = useMemo(() => getJourneyPalette(spaceTheme), [spaceTheme]);
  const trips = useMemo(() => buildUniverseJourneyTrips(pictures, locations), [locations, pictures]);
  const stats = useMemo(() => buildJourneyStats(trips, locations), [locations, trips]);

  const [tripFilter, setTripFilter] = useState<UniverseTripFilter>('all');
  const [selectedTripKey, setSelectedTripKey] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(4);

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

  const visiblePictures = selectedTrip?.pictures.slice(0, visibleCount) ?? [];

  const companionIds = useMemo(() => {
    const tripCompanionIds = selectedTrip?.companionIds ?? [];

    if (tripCompanionIds.length) {
      return tripCompanionIds;
    }

    return getAllCompanionIds(locations);
  }, [locations, selectedTrip]);

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
        No shared journey photos found.
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
      <Box sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', xl: 'row' }}
          spacing={2.5}
          alignItems="stretch"
        >
          <JourneyDiaryMyTripsPanel
            filteredTrips={filteredTrips}
            tripFilter={tripFilter}
            selectedTripKey={selectedTrip?.groupKey ?? null}
            palette={palette}
            spaceTheme={spaceTheme}
            countLabel="photo"
            getTripCount={(trip) => trip.photoCount}
            onFilterChange={(filter) => {
              setTripFilter(filter);
              setSelectedTripKey(null);
            }}
            onSelectTrip={(groupKey) => {
              setSelectedTripKey(groupKey);
              setVisibleCount(4);
            }}
          />

          {/* Center: Journey Diary timeline */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              borderRadius: 2,
              border: palette.border,
              bgcolor: palette.panelActive,
              p: { xs: 2, md: 2.5 },
            }}
          >
            <Stack
              direction="row"
              alignItems="flex-start"
              justifyContent="space-between"
              spacing={2}
              sx={{ mb: 2.5 }}
            >
              <Box>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Iconify icon="solar:heart-bold" width={18} sx={{ color: palette.accent }} />
                  <Typography
                    sx={{
                      fontFamily: spaceTheme.decorativeFont || 'inherit',
                      fontWeight: 700,
                      fontSize: '1.5rem',
                      color: palette.ink,
                    }}
                  >
                    Journey Diary
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  Every journey leaves a story.
                </Typography>
              </Box>
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

            <Box sx={{ position: 'relative', pl: { md: 2 } }}>
              <Box
                sx={{
                  display: { xs: 'none', md: 'block' },
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 78,
                  width: 2,
                  bgcolor: palette.accentSoft,
                }}
              />

              <Stack spacing={1}>
                {visiblePictures.map((picture, index) => (
                  <TimelineEntry
                    key={picture.id}
                    picture={picture}
                    trip={selectedTrip!}
                    index={index}
                    palette={palette}
                    onOpen={() => onOpenPicture(selectedTrip!, index)}
                  />
                ))}
              </Stack>
            </Box>

            {selectedTrip && visibleCount < selectedTrip.pictures.length ? (
              <Stack alignItems="center" sx={{ pt: 2 }}>
                <Button
                  onClick={() => setVisibleCount((prev) => prev + 4)}
                  endIcon={<Iconify icon="eva:arrow-down-fill" />}
                  sx={{ color: palette.ink, fontWeight: 700 }}
                >
                  Load More
                </Button>
              </Stack>
            ) : null}
          </Box>

          {/* Right: Widgets */}
          <Box
            sx={{
              width: { xs: 1, xl: 300 },
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >

            <Box sx={{ borderRadius: 2, border: palette.border, bgcolor: palette.panelActive, p: 2 }}>
              <Typography sx={{ fontWeight: 800, color: palette.ink, mb: 1.25 }}>
                Journey Stats
              </Typography>
              <Stack direction="row" spacing={1.5} justifyContent="space-between">
                {[
                  { icon: 'solar:globus-bold', label: 'Trips', value: stats.trips },
                  { icon: 'solar:camera-bold', label: 'Photos', value: stats.photos },
                  { icon: 'solar:map-point-bold', label: 'Cities', value: stats.cities },
                ].map((item) => (
                  <Stack key={item.label} alignItems="center" spacing={0.5} sx={{ flex: 1 }}>
                    <Iconify icon={item.icon} width={20} sx={{ color: palette.accent }} />
                    <Typography sx={{ fontWeight: 800, color: palette.ink }}>{item.value}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            <JourneyCompanionsPanel
              companionIds={companionIds}
              communityUsers={communityUsers}
              palette={palette}
              spaceTheme={spaceTheme}
            />
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
