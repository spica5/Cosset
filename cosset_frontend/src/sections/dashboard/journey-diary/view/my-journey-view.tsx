'use client';

import type { ChangeEvent } from 'react';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getS3SignedUrl } from 'src/utils/helper';

import { uploadFileToS3 } from 'src/actions/upload';
import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import { useGetJourneyDiaryLocations } from 'src/actions/journey-diary-location';
import {
  createJourneyRepresentativePicture,
  deleteJourneyRepresentativePicture,
  updateJourneyRepresentativePicture,
  useGetJourneyRepresentativePictures,
} from 'src/actions/journey-diary-representative-picture';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { MyJourneyCountryIcon } from '../my-journey-country-icon';
import { MyJourneyPolaroidGrid } from '../my-journey-polaroid-grid';
import type { JourneyVisibility } from '../journey-diary-public-utils';
import { JourneyCompanionAvatars, JourneyCompanionSubtitleTrigger } from '../journey-companion-picker';
import {
  buildJourneyTimeline,
  type JourneyPolaroidItem,
  type JourneyTimelineEntry,
  toPolaroidItemsFromPictures,
} from '../my-journey-utils';

// ----------------------------------------------------------------------

const NOTEBOOK_LINE_COLOR = 'rgba(31, 42, 68, 0.08)';
const NOTEBOOK_PAPER = '#F8F3E8';
const INK_COLOR = '#1F2A44';
const JOURNEY_CONTENT_BORDER = '1px solid rgba(31, 42, 68, 0.16)';
const TIMELINE_MARKER_SIZE = 14;
const TIMELINE_CONTENT_OFFSET = 22;

function TimelineItem({
  entry,
  active,
  companionIds,
  onSelect,
}: {
  entry: JourneyTimelineEntry;
  active: boolean;
  companionIds: string[];
  onSelect: () => void;
}) {
  return (
    <Button
      onClick={onSelect}
      color="inherit"
      sx={{
        position: 'relative',
        justifyContent: 'flex-start',
        textAlign: 'left',
        px: 1.25,
        py: 1.25,
        minHeight: 0,
        borderRadius: 1,
        border: JOURNEY_CONTENT_BORDER,
        bgcolor: active ? 'rgba(255,255,255,0.45)' : 'transparent',
        '&:hover': {
          bgcolor: 'rgba(255,255,255,0.35)',
          borderColor: 'rgba(31, 42, 68, 0.22)',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: TIMELINE_MARKER_SIZE / 2 - TIMELINE_CONTENT_OFFSET,
          width: TIMELINE_MARKER_SIZE,
          height: TIMELINE_MARKER_SIZE,
          borderRadius: '50%',
          border: `2px solid ${INK_COLOR}`,
          bgcolor: active ? INK_COLOR : NOTEBOOK_PAPER,
          transform: 'translate(-50%, -50%)',
          flexShrink: 0,
          zIndex: 1,
        }}
      />

      <Stack spacing={0.75} sx={{ width: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: 1, minWidth: 0 }}>
          <Typography
            sx={{
              minWidth: 34,
              fontWeight: 700,
              fontSize: '0.78rem',
              letterSpacing: '0.08em',
              color: INK_COLOR,
            }}
          >
            {entry.monthLabel}
          </Typography>

          <Typography
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              fontSize: '0.95rem',
              color: INK_COLOR,
              whiteSpace: 'nowrap',
            }}
          >
            {entry.country}
          </Typography>

          <Box sx={{ flexShrink: 0, opacity: active ? 1 : 0.82 }}>
            <MyJourneyCountryIcon country={entry.country} />
          </Box>
        </Stack>

        {companionIds.length ? (
          <Box sx={{ pl: 4.75, minWidth: 0 }}>
            <JourneyCompanionAvatars
              companionIds={companionIds}
              max={3}
              size={22}
              emptyLabel=""
            />
          </Box>
        ) : null}
      </Stack>
    </Button>
  );
}

function getEntryCompanionIds(entry: JourneyTimelineEntry) {
  return [
    ...new Set(entry.locations.flatMap((location) => location.companionUserIds || [])),
  ];
}

export function MyJourneyView() {
  const { user } = useAuthContext();
  const userId = user?.id ? String(user.id) : undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { locations, locationsLoading } = useGetJourneyDiaryLocations(userId);
  const { entries, years } = useMemo(() => buildJourneyTimeline(locations), [locations]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [polaroidItems, setPolaroidItems] = useState<JourneyPolaroidItem[]>([]);
  const [resolvingImages, setResolvingImages] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [uploadingIds, setUploadingIds] = useState<Record<string, boolean>>({});
  const [visibilitySavingId, setVisibilitySavingId] = useState<string | null>(null);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();

    if (!years.length) {
      return [{ year: currentYear, count: 0 }];
    }

    const maxYear = Math.max(...years, currentYear);
    const minYear = Math.min(...years);
    const counts = new Map<number, number>();

    entries.forEach((entry) => {
      counts.set(entry.year, (counts.get(entry.year) || 0) + 1);
    });

    const options: Array<{ year: number; count: number }> = [];

    for (let year = maxYear; year >= minYear; year -= 1) {
      options.push({
        year,
        count: counts.get(year) || 0,
      });
    }

    return options;
  }, [entries, years]);

  useEffect(() => {
    if (!years.length) {
      setSelectedYear(new Date().getFullYear());
      setSelectedEntryId(null);
      return;
    }

    setSelectedYear((prev) => (prev && years.includes(prev) ? prev : years[0]));
  }, [years]);

  const yearEntries = useMemo(
    () => entries.filter((entry) => entry.year === selectedYear),
    [entries, selectedYear],
  );

  useEffect(() => {
    if (!yearEntries.length) {
      setSelectedEntryId(null);
      return;
    }

    setSelectedEntryId((prev) =>
      prev && yearEntries.some((entry) => entry.id === prev) ? prev : yearEntries[0].id,
    );
  }, [yearEntries]);

  const selectedEntry = useMemo(
    () => yearEntries.find((entry) => entry.id === selectedEntryId) ?? null,
    [selectedEntryId, yearEntries],
  );

  const selectedCompanionIds = useMemo(
    () => (selectedEntry ? getEntryCompanionIds(selectedEntry) : []),
    [selectedEntry],
  );

  const { pictures, picturesLoading } = useGetJourneyRepresentativePictures(
    userId,
    selectedEntry?.id ?? null,
  );

  useEffect(() => {
    let cancelled = false;

    const resolvePolaroidImages = async () => {
      if (!selectedEntry) {
        setPolaroidItems([]);
        return;
      }

      setResolvingImages(true);

      try {
        const resolvedUrls: Record<string, string> = {};

        await Promise.all(
          pictures.map(async (picture) => {
            const signedUrl = await getS3SignedUrl(picture.imageKey);
            if (signedUrl) {
              resolvedUrls[picture.imageKey] = signedUrl;
            }
          }),
        );

        if (!cancelled) {
          setPolaroidItems(toPolaroidItemsFromPictures(pictures, resolvedUrls));
        }
      } finally {
        if (!cancelled) {
          setResolvingImages(false);
        }
      }
    };

    resolvePolaroidImages();

    return () => {
      cancelled = true;
    };
  }, [pictures, selectedEntry]);

  const handleAddPhotoClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAddPhoto = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';

      if (!file || !userId || !selectedEntry) {
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please choose an image file.');
        return;
      }

      setAddingPhoto(true);

      try {
        const extension = file.name.split('.').pop() || 'jpg';
        const key = `dashboard/journey-diary/${userId}/pictures/${selectedEntry.id}/${Date.now()}.${extension}`;
        const result = await uploadFileToS3({ file, key });

        const captionBase = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();

        await createJourneyRepresentativePicture({
          userId,
          journeyGroupKey: selectedEntry.id,
          journeyYear: selectedEntry.year,
          journeyMonth: selectedEntry.month,
          journeyCountry: selectedEntry.country,
          caption: captionBase || `Memory ${pictures.length + 1}`,
          imageKey: result.key,
          sortOrder: pictures.length,
        });

        toast.success('Photo added successfully.');
      } catch (error) {
        console.error('Failed to upload journey photo:', error);
        toast.error('Failed to upload photo.');
      } finally {
        setAddingPhoto(false);
      }
    },
    [pictures.length, selectedEntry, userId],
  );

  const handleDeletePhoto = useCallback(
    async (pictureId: string) => {
      if (!userId || !selectedEntry) {
        toast.error('You must be signed in to delete photos.');
        return;
      }

      setUploadingIds((prev) => ({ ...prev, [pictureId]: true }));

      try {
        await deleteJourneyRepresentativePicture(pictureId, userId, selectedEntry.id);
        toast.success('Photo removed successfully.');
      } catch (error) {
        console.error('Failed to delete journey photo:', error);
        toast.error('Failed to delete photo.');
      } finally {
        setUploadingIds((prev) => {
          const next = { ...prev };
          delete next[pictureId];
          return next;
        });
      }
    },
    [selectedEntry, userId],
  );

  const handleRenamePhoto = useCallback(
    async (pictureId: string, caption: string) => {
      if (!userId || !selectedEntry) {
        toast.error('You must be signed in to rename photos.');
        return;
      }

      setUploadingIds((prev) => ({ ...prev, [pictureId]: true }));

      try {
        await updateJourneyRepresentativePicture(
          pictureId,
          { caption },
          userId,
          selectedEntry.id,
        );
        toast.success('Photo renamed successfully.');
      } catch (error) {
        console.error('Failed to rename journey photo:', error);
        toast.error('Failed to rename photo.');
        throw error;
      } finally {
        setUploadingIds((prev) => {
          const next = { ...prev };
          delete next[pictureId];
          return next;
        });
      }
    },
    [selectedEntry, userId],
  );

  const handleTogglePicturePublic = useCallback(
    async (pictureId: string, isPublic: JourneyVisibility) => {
      if (!userId || !selectedEntry) {
        toast.error('You must be signed in to update sharing.');
        return;
      }

      setVisibilitySavingId(pictureId);

      try {
        await updateJourneyRepresentativePicture(
          pictureId,
          { isPublic },
          userId,
          selectedEntry.id,
        );
        toast.success(isPublic === 1 ? 'Photo is now public on Home Space.' : 'Photo is now private.');
      } catch (error) {
        console.error('Failed to update photo visibility:', error);
        toast.error('Failed to update sharing setting.');
      } finally {
        setVisibilitySavingId(null);
      }
    },
    [selectedEntry, userId],
  );

  const gridLoading = locationsLoading || picturesLoading || resolvingImages;

  return (
    <DashboardContent maxWidth={false} disablePadding>
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAddPhoto} />

      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: { xs: 0, md: 2 },
          mx: { xs: 0, md: 2 },
          mb: { xs: 0, md: 3 },
          minHeight: { xs: 'calc(100vh - 120px)', md: 760 },
          bgcolor: NOTEBOOK_PAPER,
          backgroundImage: `
            repeating-linear-gradient(
              transparent,
              transparent 31px,
              ${NOTEBOOK_LINE_COLOR} 31px,
              ${NOTEBOOK_LINE_COLOR} 32px
            )
          `,
          boxShadow: 'inset 0 0 0 1px rgba(31, 42, 68, 0.05)',
          border: JOURNEY_CONTENT_BORDER,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: 28,
            bgcolor: 'rgba(31, 42, 68, 0.92)',
            zIndex: 1,
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: '18px 8px',
              backgroundImage:
                'radial-gradient(circle, rgba(248,243,232,0.95) 5px, transparent 6px)',
              backgroundSize: '12px 34px',
              backgroundRepeat: 'repeat-y',
            },
          }}
        />

        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            pl: { xs: 4.5, md: 6 },
            pr: { xs: 2.5, md: 4 },
            py: { xs: 3, md: 4 },
          }}
        >
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={{ xs: 3, lg: 4 }}
            alignItems="stretch"
          >
            <Box sx={{ width: { xs: 1, lg: 280 }, flexShrink: 0, ml: { xs: 0, md: 1.5 } }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '2rem', md: '2.35rem' },
                  letterSpacing: '0.12em',
                  color: INK_COLOR,
                  mb: 2,
                }}
              >
                JOURNEY
              </Typography>

              <Box sx={{ mb: 2.5 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Year"
                  value={selectedYear ?? yearOptions[0]?.year ?? new Date().getFullYear()}
                  onChange={(event) => setSelectedYear(Number(event.target.value))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Iconify icon="solar:calendar-minimalistic-bold" width={18} sx={{ color: INK_COLOR }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiInputBase-root': {
                      bgcolor: 'rgba(255,255,255,0.45)',
                    },
                    '& .MuiInputLabel-root': {
                      color: INK_COLOR,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                    },
                    '& .MuiSelect-select': {
                      color: INK_COLOR,
                      fontWeight: 700,
                    },
                  }}
                >
                  {yearOptions.map((option) => (
                    <MenuItem key={option.year} value={option.year}>
                      {option.year}
                      {option.count > 0
                        ? ` (${option.count} ${option.count === 1 ? 'trip' : 'trips'})`
                        : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box
                sx={{
                  position: 'relative',
                  pl: `${TIMELINE_CONTENT_OFFSET}px`,
                  minHeight: 280,
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: TIMELINE_MARKER_SIZE / 2,
                    width: 2,
                    bgcolor: INK_COLOR,
                    transform: 'translateX(-50%)',
                  }}
                />
                {locationsLoading ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} />
                  </Stack>
                ) : yearEntries.length ? (
                  <Stack spacing={0.5}>
                    {yearEntries.map((entry) => (
                      <TimelineItem
                        key={entry.id}
                        entry={entry}
                        active={entry.id === selectedEntryId}
                        companionIds={getEntryCompanionIds(entry)}
                        onSelect={() => setSelectedEntryId(entry.id)}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, pr: 2 }}>
                    No journeys recorded for {selectedYear}. Add locations in Where have you been to
                    build your timeline.
                  </Typography>
                )}
              </Box>
            </Box>

            <Box
              sx={{
                flexGrow: 1,
                minWidth: 0,
                border: JOURNEY_CONTENT_BORDER,
                borderRadius: 1.5,
                bgcolor: 'rgba(255,255,255,0.22)',
                p: { xs: 2, md: 2.5 },
              }}
            >
              {selectedEntry ? (
                <Box sx={{ mb: 2, minWidth: 0 }}>
                  <Typography variant="h6" sx={{ color: INK_COLOR, fontWeight: 700 }}>
                    {selectedEntry.country}
                  </Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary">
                      {selectedEntry.monthLabel} {selectedEntry.year}
                      {selectedEntry.journeyName ? ` · ${selectedEntry.journeyName}` : ''}
                    </Typography>
                    <JourneyCompanionSubtitleTrigger
                      companionIds={selectedCompanionIds}
                      editHref={paths.dashboard.journeyDiary.whereHaveYouBeen}
                    />
                  </Stack>
                </Box>
              ) : null}

              {gridLoading ? (
                <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 420 }}>
                  <CircularProgress />
                </Stack>
              ) : (
                <MyJourneyPolaroidGrid
                  items={polaroidItems}
                  uploadingIds={uploadingIds}
                  addingPhoto={addingPhoto}
                  canAdd={Boolean(selectedEntry)}
                  visibilitySavingId={visibilitySavingId}
                  onAddPhoto={handleAddPhotoClick}
                  onDelete={handleDeletePhoto}
                  onRename={handleRenamePhoto}
                  onTogglePublic={handleTogglePicturePublic}
                />
              )}

              <Stack direction="row" justifyContent="flex-end" sx={{ mt: { xs: 3, md: 4 }, pr: 1 }}>
                <Button
                  component={RouterLink}
                  href={paths.dashboard.journeyDiary.whereHaveYouBeen}
                  endIcon={<Iconify icon="eva:arrow-forward-fill" />}
                  sx={{
                    color: INK_COLOR,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                  }}
                >
                  View All Journey
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Box>
    </DashboardContent>
  );
}
