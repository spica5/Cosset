'use client';

import type { IJourneyMemorialThing, JourneyMemorialThingCategory } from 'src/types/journey-diary-memorial-thing';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getS3SignedUrl } from 'src/utils/helper';
import { isImageOrVideoFile, isVideoFile, isVideoMediaPath } from 'src/utils/media-file';

import { uploadFileToS3 } from 'src/actions/upload';
import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import { useGetJourneyDiaryLocations } from 'src/actions/journey-diary-location';
import {
  createJourneyMemorialThing,
  deleteJourneyMemorialThing,
  updateJourneyMemorialThing,
  useGetJourneyMemorialThings,
} from 'src/actions/journey-diary-memorial-thing';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';

import { useAuthContext } from 'src/auth/hooks';

import { MyJourneyCountryIcon } from '../my-journey-country-icon';
import { JourneyDiaryMemorialThingFormDialog } from '../journey-diary-memorial-thing-form-dialog';
import {
  JourneyDiaryPublicControl,
} from '../journey-diary-public-toggle';
import type { JourneyVisibility } from '../journey-diary-public-utils';
import {
  parseJourneyDate,
  buildJourneyTimeline,
  type JourneyTimelineEntry,
} from '../my-journey-utils';
import {
  MEMORIAL_THING_CATEGORIES,
  getMemorialThingCategoryIcon,
  getMemorialThingCategoryLabel,
} from '../memorial-things-categories';

import type {
  MemorialThingFormValues,
  MemorialThingImageDraft,
} from '../journey-diary-memorial-thing-form-dialog';

// ----------------------------------------------------------------------

const NOTEBOOK_LINE_COLOR = 'rgba(31, 42, 68, 0.08)';
const NOTEBOOK_PAPER = '#F8F3E8';
const INK_COLOR = '#1F2A44';
const JOURNEY_CONTENT_BORDER = '1px solid rgba(31, 42, 68, 0.16)';
const TIMELINE_MARKER_SIZE = 14;
const TIMELINE_CONTENT_OFFSET = 22;

const EMPTY_FORM: MemorialThingFormValues = {
  category: 'scenery',
  title: '',
  description: '',
  memorialDate: '',
};

function createImageDraftId() {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getMemorialThingImageKeys(item: IJourneyMemorialThing) {
  const fromImages = item.images?.map((image) => image.imageKey).filter(Boolean) as string[];

  if (fromImages?.length) {
    return fromImages;
  }

  return item.imageKey ? [item.imageKey] : [];
}

function toDateInputValue(value?: string | Date | null) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function TimelineItem({
  entry,
  active,
  onSelect,
}: {
  entry: JourneyTimelineEntry;
  active: boolean;
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
          zIndex: 1,
        }}
      />

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
    </Button>
  );
}

type MemorialImagePreview = {
  urls: string[];
  index: number;
  alt: string;
};

function MemorialThingImagePreviewDialog({
  preview,
  onClose,
  onPrev,
  onNext,
}: {
  preview: MemorialImagePreview | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const currentUrl = preview ? preview.urls[preview.index] : '';
  const hasMultiple = Boolean(preview && preview.urls.length > 1);

  return (
    <Dialog
      open={Boolean(preview)}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          bgcolor: 'transparent',
          boxShadow: 'none',
          maxWidth: '90vw',
          maxHeight: '90vh',
          m: 0,
        },
      }}
    >
      {preview && currentUrl ? (
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          {isVideoMediaPath(currentUrl) ? (
            <Box
              component="video"
              src={currentUrl}
              controls
              playsInline
              sx={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: 1,
                bgcolor: 'common.black',
              }}
            />
          ) : (
            <Box
              component="img"
              src={currentUrl}
              alt={preview.alt}
              onClick={onClose}
              sx={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: 1,
                cursor: 'zoom-out',
              }}
            />
          )}

          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(0,0,0,0.5)',
              color: 'common.white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
            aria-label="Close preview"
          >
            <Iconify icon="mingcute:close-line" width={18} />
          </IconButton>

          {hasMultiple ? (
            <>
              <IconButton
                onClick={(event) => {
                  event.stopPropagation();
                  onPrev();
                }}
                disabled={preview.index <= 0}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: 8,
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: 'common.white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                }}
                aria-label="Previous image"
              >
                <Iconify icon="eva:arrow-back-fill" width={20} />
              </IconButton>

              <IconButton
                onClick={(event) => {
                  event.stopPropagation();
                  onNext();
                }}
                disabled={preview.index >= preview.urls.length - 1}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  right: 8,
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: 'common.white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                }}
                aria-label="Next image"
              >
                <Iconify icon="eva:arrow-forward-fill" width={20} />
              </IconButton>

              <Typography
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: 'common.white',
                  fontWeight: 600,
                  textShadow: '0 2px 8px rgba(0,0,0,0.45)',
                }}
              >
                {preview.index + 1} / {preview.urls.length}
              </Typography>
            </>
          ) : null}

          <Typography
            sx={{
              position: 'absolute',
              left: 16,
              bottom: 16,
              color: 'common.white',
              fontWeight: 600,
              textShadow: '0 2px 8px rgba(0,0,0,0.45)',
            }}
          >
            {preview.alt}
          </Typography>
        </Box>
      ) : null}
    </Dialog>
  );
}

export function MemorialThingsView() {
  const { user } = useAuthContext();
  const userId = user?.id ? String(user.id) : undefined;

  const { locations, locationsLoading } = useGetJourneyDiaryLocations(userId);
  const { entries, years } = useMemo(() => buildJourneyTimeline(locations), [locations]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<JourneyMemorialThingCategory | 'all'>('all');
  const [itemImageUrls, setItemImageUrls] = useState<Record<string, string[]>>({});
  const [resolvingImages, setResolvingImages] = useState(false);
  const [formImages, setFormImages] = useState<MemorialThingImageDraft[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<MemorialThingFormValues>(EMPTY_FORM);
  const [editingItem, setEditingItem] = useState<IJourneyMemorialThing | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [visibilitySavingId, setVisibilitySavingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<MemorialImagePreview | null>(null);

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
      options.push({ year, count: counts.get(year) || 0 });
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

  const activeCategory =
    selectedCategory === 'all' ? null : selectedCategory;

  const { memorialThings, memorialThingsLoading } = useGetJourneyMemorialThings(
    userId,
    selectedEntry?.id ?? null,
    activeCategory,
  );

  useEffect(() => {
    let cancelled = false;

    const resolveItemImages = async () => {
      if (!memorialThings.length) {
        setItemImageUrls({});
        return;
      }

      setResolvingImages(true);

      try {
        const resolvedImageEntries = await Promise.all(
          memorialThings.map(async (item) => {
            const imageKeys = getMemorialThingImageKeys(item);

            if (!imageKeys.length) {
              return null;
            }

            const urls = (
              await Promise.all(imageKeys.map((imageKey) => getS3SignedUrl(imageKey)))
            ).filter(Boolean) as string[];

            return urls.length ? ([String(item.id), urls] as const) : null;
          }),
        );

        if (!cancelled) {
          setItemImageUrls(
            Object.fromEntries(
              resolvedImageEntries.filter(Boolean) as Array<[string, string[]]>,
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setResolvingImages(false);
        }
      }
    };

    resolveItemImages();

    return () => {
      cancelled = true;
    };
  }, [memorialThings]);

  const resetImageState = useCallback(() => {
    setFormImages((prev) => {
      prev.forEach((image) => {
        if (image.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
      return [];
    });
  }, []);

  const openCreateDialog = useCallback(() => {
    if (!selectedEntry) {
      toast.error('Select a journey first.');
      return;
    }

    const fallbackDate = parseJourneyDate(
      selectedEntry.locations[0]?.visitedAt || selectedEntry.locations[0]?.createdAt,
    );
    const defaultCategory =
      selectedCategory === 'all' ? 'scenery' : selectedCategory;

    setEditingItem(null);
    resetImageState();
    setFormValues({
      ...EMPTY_FORM,
      category: defaultCategory,
      memorialDate: toDateInputValue(fallbackDate),
    });
    setFormOpen(true);
  }, [resetImageState, selectedCategory, selectedEntry]);

  const openEditDialog = useCallback(
    async (item: IJourneyMemorialThing) => {
      setEditingItem(item);
      resetImageState();
      setFormValues({
        category: item.category,
        title: item.title || '',
        description: item.description || '',
        memorialDate: toDateInputValue(item.memorialDate),
      });

      const imageKeys = getMemorialThingImageKeys(item);
      const drafts = (
        await Promise.all(
          imageKeys.map(async (imageKey) => {
            const previewUrl = await getS3SignedUrl(imageKey);
            if (!previewUrl) {
              return null;
            }

            return {
              clientId: createImageDraftId(),
              imageKey,
              previewUrl,
            } satisfies MemorialThingImageDraft;
          }),
        )
      ).filter(Boolean) as MemorialThingImageDraft[];

      setFormImages(drafts);
      setFormOpen(true);
    },
    [resetImageState],
  );

  const handleCloseForm = useCallback(() => {
    if (saving || uploadingImage) {
      return;
    }

    setFormOpen(false);
    setEditingItem(null);
    resetImageState();
    setFormValues(EMPTY_FORM);
  }, [resetImageState, saving, uploadingImage]);

  const handleFormChange = useCallback((field: keyof MemorialThingFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleImagesSelect = useCallback((files: File[]) => {
    const mediaFiles = files.filter((file) => isImageOrVideoFile(file));

    if (!mediaFiles.length) {
      toast.error('Please choose image or video files.');
      return;
    }

    const drafts = mediaFiles.map((file) => ({
      clientId: createImageDraftId(),
      previewUrl: URL.createObjectURL(file),
      file,
    }));

    setFormImages((prev) => [...prev, ...drafts]);
  }, []);

  const handleRemoveImage = useCallback((clientId: string) => {
    setFormImages((prev) => {
      const target = prev.find((image) => image.clientId === clientId);

      if (target?.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return prev.filter((image) => image.clientId !== clientId);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!userId || !selectedEntry) {
      toast.error('You must be signed in to save memorial things.');
      return;
    }

    setSaving(true);

    try {
      setUploadingImage(true);

      const imageKeys = (
        await Promise.all(
          formImages.map(async (image) => {
            if (image.file) {
              const extension =
                image.file.name.split('.').pop() || (isVideoFile(image.file) ? 'mp4' : 'jpg');
              const folder = isVideoFile(image.file) ? 'videos' : 'images';
              const key = `dashboard/journey-diary/${userId}/memorial-things/${selectedEntry.id}/${folder}/${Date.now()}-${image.clientId}.${extension}`;
              const result = await uploadFileToS3({ file: image.file, key });
              return result.key;
            }

            if (image.imageKey) {
              return image.imageKey;
            }

            return null;
          }),
        )
      ).filter(Boolean) as string[];

      setUploadingImage(false);

      const payload = {
        category: formValues.category,
        title: formValues.title.trim(),
        description: formValues.description.trim() || null,
        pictureId: null,
        imageKey: imageKeys[0] || null,
        imageKeys,
        memorialDate: formValues.memorialDate || null,
        sortOrder: 0,
      };

      if (editingItem) {
        await updateJourneyMemorialThing(
          editingItem.id,
          payload,
          userId,
          selectedEntry.id,
          editingItem.category,
        );
        toast.success('Memorial thing updated successfully.');
      } else {
        await createJourneyMemorialThing({
          userId,
          journeyGroupKey: selectedEntry.id,
          journeyYear: selectedEntry.year,
          journeyMonth: selectedEntry.month,
          journeyCountry: selectedEntry.country,
          ...payload,
        });
        toast.success('Memorial thing added successfully.');
      }

      setFormOpen(false);
      setEditingItem(null);
      resetImageState();
      setFormValues(EMPTY_FORM);
    } catch (error) {
      console.error('Failed to save memorial thing:', error);
      toast.error('Failed to save memorial thing.');
    } finally {
      setUploadingImage(false);
      setSaving(false);
    }
  }, [
    editingItem,
    formImages,
    formValues,
    resetImageState,
    selectedEntry,
    userId,
  ]);

  const handleDelete = useCallback(
    async (itemId: string, category: JourneyMemorialThingCategory) => {
      if (!userId || !selectedEntry) {
        toast.error('You must be signed in to delete memorial things.');
        return;
      }

      setDeletingId(itemId);

      try {
        await deleteJourneyMemorialThing(itemId, userId, selectedEntry.id, category);
        toast.success('Memorial thing deleted successfully.');
      } catch (error) {
        console.error('Failed to delete memorial thing:', error);
        toast.error('Failed to delete memorial thing.');
      } finally {
        setDeletingId(null);
      }
    },
    [selectedEntry, userId],
  );

  const handleToggleMemorialPublic = useCallback(
    async (itemId: string, category: JourneyMemorialThingCategory, isPublic: JourneyVisibility) => {
      if (!userId || !selectedEntry) {
        toast.error('You must be signed in to update sharing.');
        return;
      }

      setVisibilitySavingId(itemId);

      try {
        await updateJourneyMemorialThing(
          itemId,
          { isPublic },
          userId,
          selectedEntry.id,
          category,
        );
        toast.success(
          isPublic === 1 ? 'Memorial thing is now public on Home Space.' : 'Memorial thing is now private.',
        );
      } catch (error) {
        console.error('Failed to update memorial thing visibility:', error);
        toast.error('Failed to update sharing setting.');
      } finally {
        setVisibilitySavingId(null);
      }
    },
    [selectedEntry, userId],
  );

  const panelLoading = locationsLoading || memorialThingsLoading || resolvingImages;

  return (
    <DashboardContent maxWidth={false} disablePadding>
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
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={{ xs: 3, lg: 4 }}>
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
                MEMORIAL THINGS
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
                        <Iconify
                          icon="solar:calendar-minimalistic-bold"
                          width={18}
                          sx={{ color: INK_COLOR }}
                        />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.45)' },
                    '& .MuiInputLabel-root': {
                      color: INK_COLOR,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                    },
                    '& .MuiSelect-select': { color: INK_COLOR, fontWeight: 700 },
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
                        onSelect={() => setSelectedEntryId(entry.id)}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, pr: 2 }}>
                    No journeys recorded for {selectedYear}. Add locations in Where have you been
                    first.
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
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="h5" sx={{ color: INK_COLOR, fontWeight: 700 }}>
                    Keep what mattered
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Save scenery, food, culture, people, and special moments from each journey.
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={openCreateDialog}
                  disabled={!selectedEntry}
                >
                  Add Item
                </Button>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
                <Chip
                  label="All"
                  clickable
                  color={selectedCategory === 'all' ? 'primary' : 'default'}
                  onClick={() => setSelectedCategory('all')}
                  sx={{ fontWeight: 600 }}
                />
                {MEMORIAL_THING_CATEGORIES.map((category) => (
                  <Chip
                    key={category.value}
                    icon={<Iconify icon={category.icon} width={18} />}
                    label={category.label}
                    clickable
                    color={selectedCategory === category.value ? 'primary' : 'default'}
                    onClick={() => setSelectedCategory(category.value)}
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Stack>

              {panelLoading ? (
                <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 360 }}>
                  <CircularProgress />
                </Stack>
              ) : memorialThings.length ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(1, minmax(0, 1fr))',
                      sm: 'repeat(2, minmax(0, 1fr))',
                      lg: 'repeat(2, minmax(0, 1fr))',
                      xl: 'repeat(3, minmax(0, 1fr))',
                    },
                    gap: 2,
                  }}
                >
                  {memorialThings.map((item) => {
                    const imageUrls = itemImageUrls[String(item.id)] || [];

                    return (
                      <Card
                        key={item.id}
                        sx={{
                          overflow: 'hidden',
                          borderRadius: 2,
                          border: JOURNEY_CONTENT_BORDER,
                          bgcolor: 'rgba(255, 248, 233, 0.88)',
                          boxShadow: 'none',
                        }}
                      >
                        {imageUrls.length ? (
                          <Box
                            sx={{
                              display: 'flex',
                              overflowX: 'auto',
                              gap: 0.5,
                              height: 160,
                              bgcolor: 'rgba(255,255,255,0.45)',
                            }}
                          >
                            {imageUrls.map((imageUrl, index) => (
                              <Box
                                key={`${item.id}-${index}`}
                                component={isVideoMediaPath(imageUrl) ? 'video' : 'img'}
                                src={imageUrl}
                                muted={isVideoMediaPath(imageUrl) ? true : undefined}
                                playsInline={isVideoMediaPath(imageUrl) ? true : undefined}
                                preload={isVideoMediaPath(imageUrl) ? 'metadata' : undefined}
                                alt={`${item.title} ${index + 1}`}
                                onClick={() =>
                                  setPreviewImage({
                                    urls: imageUrls,
                                    index,
                                    alt: item.title,
                                  })
                                }
                                sx={{
                                  flex: imageUrls.length === 1 ? '1 1 auto' : '0 0 auto',
                                  width: imageUrls.length === 1 ? 1 : 140,
                                  height: 1,
                                  objectFit: 'cover',
                                  cursor: 'zoom-in',
                                  bgcolor: 'common.black',
                                }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Stack
                            alignItems="center"
                            justifyContent="center"
                            sx={{
                              height: 160,
                              bgcolor: 'rgba(255,255,255,0.45)',
                            }}
                          >
                            <Iconify
                              icon={getMemorialThingCategoryIcon(item.category)}
                              width={40}
                              sx={{ color: INK_COLOR, opacity: 0.45 }}
                            />
                          </Stack>
                        )}

                        <Stack spacing={1} sx={{ p: 1.5 }}>
                          <Stack
                            direction="row"
                            alignItems="flex-start"
                            justifyContent="space-between"
                            spacing={1}
                          >
                            <Chip
                              size="small"
                              icon={
                                <Iconify
                                  icon={getMemorialThingCategoryIcon(item.category)}
                                  width={16}
                                />
                              }
                              label={getMemorialThingCategoryLabel(item.category)}
                              sx={{ fontWeight: 600 }}
                            />

                            <Stack
                              direction="row"
                              spacing={0.25}
                              sx={{ flexShrink: 0 }}
                            >
                              <JourneyDiaryPublicControl
                                isPublic={item.isPublic}
                                saving={visibilitySavingId === String(item.id)}
                                onChange={(visibility) =>
                                  handleToggleMemorialPublic(String(item.id), item.category, visibility)
                                }
                                stopPropagation
                              />
                              <IconButton
                                size="small"
                                onClick={() => openEditDialog(item)}
                                aria-label="Edit memorial thing"
                              >
                                <Iconify icon="solar:pen-bold" width={18} />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={deletingId === String(item.id)}
                                onClick={() => handleDelete(String(item.id), item.category)}
                                aria-label="Delete memorial thing"
                              >
                                <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                              </IconButton>
                            </Stack>
                          </Stack>

                          <Typography sx={{ fontWeight: 700, color: INK_COLOR }}>
                            {item.title}
                          </Typography>

                          {item.description ? (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                whiteSpace: 'pre-line',
                              }}
                            >
                              {item.description}
                            </Typography>
                          ) : null}

                          {item.memorialDate ? (
                            <Typography variant="caption" color="text.secondary">
                              {new Date(item.memorialDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Typography>
                          ) : null}
                        </Stack>
                      </Card>
                    );
                  })}
                </Box>
              ) : (
                <EmptyContent
                  title="No memorial things yet"
                  description={
                    selectedCategory === 'all'
                      ? 'Add scenery, food, culture, people, or special events you want to remember.'
                      : `No ${getMemorialThingCategoryLabel(selectedCategory).toLowerCase()} items yet for this journey.`
                  }
                />
              )}

              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
                <Button
                  component={RouterLink}
                  href={paths.dashboard.journeyDiary.myJourney}
                  endIcon={<Iconify icon="eva:arrow-forward-fill" />}
                  sx={{ color: INK_COLOR, fontWeight: 600, letterSpacing: '0.04em' }}
                >
                  Open My Journey
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Box>

      <JourneyDiaryMemorialThingFormDialog
        open={formOpen}
        saving={saving}
        uploadingImage={uploadingImage}
        editingItem={editingItem}
        selectedEntry={selectedEntry}
        formImages={formImages}
        values={formValues}
        onChange={handleFormChange}
        onImagesSelect={handleImagesSelect}
        onRemoveImage={handleRemoveImage}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
      />

      <MemorialThingImagePreviewDialog
        preview={previewImage}
        onClose={() => setPreviewImage(null)}
        onPrev={() =>
          setPreviewImage((prev) =>
            prev && prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev,
          )
        }
        onNext={() =>
          setPreviewImage((prev) =>
            prev && prev.index < prev.urls.length - 1
              ? { ...prev, index: prev.index + 1 }
              : prev,
          )
        }
      />
    </DashboardContent>
  );
}
