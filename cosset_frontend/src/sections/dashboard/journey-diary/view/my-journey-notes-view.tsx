'use client';

import type { IJourneyDiaryNote } from 'src/types/journey-diary-note';
import type { IJourneyRepresentativePicture } from 'src/types/journey-diary-representative-picture';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getS3SignedUrl } from 'src/utils/helper';

import {
  createJourneyDiaryNote,
  deleteJourneyDiaryNote,
  updateJourneyDiaryNote,
  useGetJourneyDiaryNotes,
} from 'src/actions/journey-diary-note';
import { useGetJourneyDiaryLocations } from 'src/actions/journey-diary-location';
import { useGetJourneyRepresentativePictures } from 'src/actions/journey-diary-representative-picture';

import { useAuthContext } from 'src/auth/hooks';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import {
  EmoticonPickerButton,
  InputEmoticonSuggestion,
  insertTextAtSelection,
} from 'src/components/dashboard/emoticon-picker';

import { MyJourneyCountryIcon } from '../my-journey-country-icon';
import {
  JourneyDiaryPublicControl,
} from '../journey-diary-public-toggle';
import type { JourneyVisibility } from '../journey-diary-public-utils';
import {
  buildJourneyTimeline,
  parseJourneyDate,
  type JourneyTimelineEntry,
} from '../my-journey-utils';

const NOTEBOOK_LINE_COLOR = 'rgba(31, 42, 68, 0.08)';
const NOTEBOOK_PAPER = '#F8F3E8';
const INK_COLOR = '#1F2A44';
const JOURNEY_CONTENT_BORDER = '1px solid rgba(31, 42, 68, 0.16)';
const TIMELINE_MARKER_SIZE = 14;
const TIMELINE_CONTENT_OFFSET = 22;
const JOURNEY_HANDWRITING_FONT_FAMILY =
  '"Segoe Print", "Segoe Script", "Caveat Variable", "Comic Sans MS", "Segoe UI", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';

type PictureWithUrl = IJourneyRepresentativePicture & {
  imageUrl: string;
};

type NoteFormValues = {
  title: string;
  content: string;
  noteDate: string;
  pictureId: string;
};

const EMPTY_FORM: NoteFormValues = {
  title: '',
  content: '',
  noteDate: '',
  pictureId: '',
};

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

function formatBadgeMonth(value?: string | Date | null) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleString('en-US', { month: 'short' }).toUpperCase()
    : 'MEM';
}

function formatBadgeDay(value?: string | Date | null) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? String(parsed.getDate()).padStart(2, '0') : '--';
}

function formatNoteDate(value?: string | Date | null) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
}

function BotanicalSketch() {
  return (
    <Box
      component="svg"
      viewBox="0 0 80 120"
      sx={{
        position: 'absolute',
        right: { xs: 8, md: 24 },
        bottom: { xs: 16, md: 32 },
        width: { xs: 56, md: 72 },
        height: { xs: 84, md: 108 },
        opacity: 0.55,
        pointerEvents: 'none',
      }}
    >
      <path
        d="M40 110 C38 80 42 55 40 20"
        fill="none"
        stroke={INK_COLOR}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M40 75 C28 68 18 58 14 48 M40 55 C52 48 62 38 66 28 M40 38 C30 32 22 24 18 16"
        fill="none"
        stroke={INK_COLOR}
        strokeWidth="1"
        strokeLinecap="round"
      />
      <ellipse cx="14" cy="46" rx="5" ry="3" fill="none" stroke={INK_COLOR} strokeWidth="0.9" transform="rotate(-30 14 46)" />
      <ellipse cx="66" cy="26" rx="5" ry="3" fill="none" stroke={INK_COLOR} strokeWidth="0.9" transform="rotate(25 66 26)" />
      <ellipse cx="18" cy="14" rx="4" ry="2.5" fill="none" stroke={INK_COLOR} strokeWidth="0.9" transform="rotate(-20 18 14)" />
    </Box>
  );
}

function NotePolaroid({
  imageUrl,
  alt,
  onImageClick,
}: {
  imageUrl: string;
  alt: string;
  onImageClick?: () => void;
}) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: 1,
        maxWidth: 280,
        mx: 'auto',
        transform: 'rotate(-4deg)',
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
          boxShadow: '0 12px 28px rgba(47, 35, 22, 0.16)',
        }}
      >
        <Box
          component="img"
          src={imageUrl}
          alt={alt}
          onClick={onImageClick}
          sx={{
            width: 1,
            aspectRatio: '4 / 3',
            objectFit: 'cover',
            display: 'block',
            cursor: onImageClick ? 'zoom-in' : 'default',
          }}
        />
      </Box>
    </Box>
  );
}

function NoteImagePreviewDialog({
  image,
  onClose,
}: {
  image: { url: string; alt: string } | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={Boolean(image)}
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
      {image ? (
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <Box
            component="img"
            src={image.url}
            alt={image.alt}
            onClick={onClose}
            sx={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 1,
              cursor: 'zoom-out',
            }}
          />
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
          >
            <Iconify icon="mingcute:close-line" width={18} />
          </IconButton>
          <Typography
            sx={{
              position: 'absolute',
              left: 16,
              bottom: 16,
              color: 'common.white',
              fontFamily: JOURNEY_HANDWRITING_FONT_FAMILY,
              fontSize: '1.5rem',
              textShadow: '0 2px 8px rgba(0,0,0,0.45)',
            }}
          >
            {image.alt}
          </Typography>
        </Box>
      ) : null}
    </Dialog>
  );
}

function NoteJournalDetail({
  note,
  imageUrl,
  country,
  onBack,
  onEdit,
  onDelete,
  onImagePreview,
  onTogglePublic,
  visibilitySaving,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  notePosition,
  deleting,
}: {
  note: IJourneyDiaryNote;
  imageUrl?: string;
  country?: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onImagePreview?: (url: string, alt: string) => void;
  onTogglePublic?: (visibility: JourneyVisibility) => void | Promise<void>;
  visibilitySaving?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  notePosition?: string;
  deleting?: boolean;
}) {
  const handwritingSx = {
    fontFamily: JOURNEY_HANDWRITING_FONT_FAMILY,
    color: INK_COLOR,
  };

  return (
    <Box sx={{ position: 'relative', minHeight: 420 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: { xs: 2, md: 3 } }}
      >
        <Button
          color="inherit"
          startIcon={<Iconify icon="eva:arrow-back-fill" />}
          onClick={onBack}
          sx={{ color: INK_COLOR, fontWeight: 600 }}
        >
          Back to notes
        </Button>

        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton
            onClick={onPrev}
            disabled={!hasPrev}
            aria-label="Previous note"
            sx={{ color: INK_COLOR }}
          >
            <Iconify icon="eva:arrow-ios-back-fill" width={20} />
          </IconButton>
          {notePosition ? (
            <Typography
              variant="body2"
              sx={{
                minWidth: 52,
                textAlign: 'center',
                color: INK_COLOR,
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              {notePosition}
            </Typography>
          ) : null}
          <IconButton
            onClick={onNext}
            disabled={!hasNext}
            aria-label="Next note"
            sx={{ color: INK_COLOR }}
          >
            <Iconify icon="eva:arrow-ios-forward-fill" width={20} />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={0.5}>
          {onTogglePublic ? (
            <JourneyDiaryPublicControl
              isPublic={note.isPublic}
              saving={visibilitySaving}
              onChange={onTogglePublic}
            />
          ) : null}
          <IconButton onClick={onEdit} aria-label="Edit note">
            <Iconify icon="solar:pen-bold" width={20} />
          </IconButton>
          <IconButton color="error" disabled={deleting} onClick={onDelete} aria-label="Delete note">
            <Iconify icon="solar:trash-bin-trash-bold" width={20} />
          </IconButton>
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 3, md: 4 }}
        alignItems={{ xs: 'center', md: 'flex-start' }}
        sx={{ px: { xs: 0, md: 2 }, py: { xs: 1, md: 2 } }}
      >
        {imageUrl ? (
          <Box sx={{ width: { xs: 1, md: '42%' }, flexShrink: 0 }}>
            <NotePolaroid
              imageUrl={imageUrl}
              alt={note.title}
              onImageClick={() => onImagePreview?.(imageUrl, note.title)}
            />
          </Box>
        ) : (
          <Box
            sx={{
              width: { xs: 1, md: '42%' },
              maxWidth: 280,
              aspectRatio: '4 / 3',
              mx: 'auto',
              borderRadius: 1,
              border: '1px dashed rgba(31, 42, 68, 0.2)',
              bgcolor: 'rgba(255,255,255,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', px: 2 }}>
              No photo attached
            </Typography>
          </Box>
        )}

        <Box sx={{ flexGrow: 1, minWidth: 0, pt: { xs: 0, md: 1 } }}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
            <Typography
              sx={{
                ...handwritingSx,
                fontSize: { xs: '2rem', md: '2.35rem' },
                fontWeight: 700,
                lineHeight: 1.15,
              }}
            >
              {note.title}
              {country ? `, ${country}` : ''}.
            </Typography>
            <Iconify icon="solar:heart-bold" width={22} sx={{ color: INK_COLOR, opacity: 0.85, mt: 0.5 }} />
          </Stack>

          <Typography
            sx={{
              ...handwritingSx,
              fontSize: { xs: '1.35rem', md: '1.55rem' },
              lineHeight: 1.45,
              whiteSpace: 'pre-line',
              maxWidth: 480,
            }}
          >
            {note.content}
          </Typography>

          {formatNoteDate(note.noteDate) ? (
            <Typography
              sx={{
                ...handwritingSx,
                mt: 3,
                fontSize: { xs: '1.15rem', md: '1.25rem' },
                opacity: 0.88,
              }}
            >
              {formatNoteDate(note.noteDate)}
            </Typography>
          ) : null}
        </Box>
      </Stack>

      <BotanicalSketch />
    </Box>
  );
}

function JourneyNoteFormDialog({
  open,
  editingNote,
  saving,
  pictureOptions,
  values,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editingNote: IJourneyDiaryNote | null;
  saving: boolean;
  pictureOptions: PictureWithUrl[];
  values: NoteFormValues;
  onChange: (field: keyof NoteFormValues, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const contentInputRef = useRef<HTMLTextAreaElement | null>(null);

  const applyContentValue = useCallback(
    (nextValue: string, nextCaret?: number) => {
      onChange('content', nextValue);

      requestAnimationFrame(() => {
        const input = contentInputRef.current;
        if (!input) {
          return;
        }

        input.focus();
        const caret = typeof nextCaret === 'number' ? nextCaret : nextValue.length;
        input.setSelectionRange(caret, caret);
      });
    },
    [onChange]
  );

  const handleInsertEmoticon = useCallback(
    (emoticon: string) => {
      const input = contentInputRef.current;
      const { nextValue, nextCaret } = insertTextAtSelection(
        values.content,
        emoticon,
        input?.selectionStart,
        input?.selectionEnd
      );

      applyContentValue(nextValue, nextCaret);
    },
    [applyContentValue, values.content]
  );

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{editingNote ? 'Update note' : 'Add note'}</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Title"
              value={values.title}
              onChange={(event) => onChange('title', event.target.value)}
            />

            <TextField
              fullWidth
              label="Note date"
              type="date"
              value={values.noteDate}
              onChange={(event) => onChange('noteDate', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Story</Typography>
              <EmoticonPickerButton
                disabled={saving}
                onSelect={handleInsertEmoticon}
                tooltip="Insert emoticon"
                icon="solar:smile-circle-bold"
              />
            </Stack>

            <TextField
              fullWidth
              multiline
              minRows={5}
              placeholder="Write what happened, what you saw, or what you want to remember."
              value={values.content}
              onChange={(event) => onChange('content', event.target.value)}
              inputRef={contentInputRef}
              disabled={saving}
            />

            <InputEmoticonSuggestion
              inputRef={contentInputRef}
              value={values.content}
              disabled={saving}
              onChange={applyContentValue}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Choose image from My Journey
            </Typography>

            {pictureOptions.length ? (
              <Stack direction="row" spacing={1.25} sx={{ overflowX: 'auto', pb: 0.5 }}>
                <Button
                  color="inherit"
                  onClick={() => onChange('pictureId', '')}
                  sx={{
                    minWidth: 112,
                    p: 1,
                    borderRadius: 1.5,
                    border: JOURNEY_CONTENT_BORDER,
                    bgcolor: values.pictureId ? 'transparent' : 'rgba(255,255,255,0.45)',
                    textTransform: 'none',
                  }}
                >
                  No image
                </Button>

                {pictureOptions.map((picture) => (
                  <Button
                    key={picture.id}
                    color="inherit"
                    onClick={() => onChange('pictureId', String(picture.id))}
                    sx={{
                      p: 0.75,
                      minWidth: 0,
                      borderRadius: 1.5,
                      border: values.pictureId === String(picture.id)
                        ? `2px solid ${INK_COLOR}`
                        : JOURNEY_CONTENT_BORDER,
                      bgcolor: 'rgba(255,255,255,0.35)',
                    }}
                  >
                    <Box
                      component="img"
                      src={picture.imageUrl}
                      alt={picture.caption || 'Journey image'}
                      sx={{
                        width: 112,
                        height: 84,
                        display: 'block',
                        objectFit: 'cover',
                        borderRadius: 1,
                      }}
                    />
                  </Button>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Add photos on `My Journey` first if you want to attach one to this note.
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={saving || !values.title.trim() || !values.content.trim()}
        >
          {editingNote ? 'Save changes' : 'Add note'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function MyJourneyNotesView() {
  const { user } = useAuthContext();
  const userId = user?.id ? String(user.id) : undefined;

  const { locations, locationsLoading } = useGetJourneyDiaryLocations(userId);
  const { entries, years } = useMemo(() => buildJourneyTimeline(locations), [locations]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [resolvedPictures, setResolvedPictures] = useState<PictureWithUrl[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<NoteFormValues>(EMPTY_FORM);
  const [editingNote, setEditingNote] = useState<IJourneyDiaryNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [visibilitySavingId, setVisibilitySavingId] = useState<string | null>(null);
  const [resolvingImages, setResolvingImages] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);

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

  const { pictures, picturesLoading } = useGetJourneyRepresentativePictures(
    userId,
    selectedEntry?.id ?? null,
  );
  const { notes, notesLoading } = useGetJourneyDiaryNotes(userId, selectedEntry?.id ?? null);

  useEffect(() => {
    let cancelled = false;

    const resolvePictureUrls = async () => {
      if (!selectedEntry) {
        setResolvedPictures([]);
        return;
      }

      setResolvingImages(true);

      try {
        const signed = await Promise.all(
          pictures.map(async (picture) => {
            const imageUrl = picture.imageKey ? await getS3SignedUrl(picture.imageKey) : '';
            return { ...picture, imageUrl: imageUrl || '' };
          }),
        );

        if (!cancelled) {
          setResolvedPictures(signed.filter((picture) => Boolean(picture.imageUrl)));
        }
      } finally {
        if (!cancelled) {
          setResolvingImages(false);
        }
      }
    };

    resolvePictureUrls();

    return () => {
      cancelled = true;
    };
  }, [pictures, selectedEntry]);

  useEffect(() => {
    setSelectedNoteId(null);
  }, [selectedEntry?.id]);

  const selectedNote = useMemo(
    () => notes.find((note) => String(note.id) === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  );

  const selectedNoteIndex = useMemo(
    () => (selectedNoteId ? notes.findIndex((note) => String(note.id) === selectedNoteId) : -1),
    [notes, selectedNoteId],
  );

  const goToPrevNote = useCallback(() => {
    if (selectedNoteIndex > 0) {
      setSelectedNoteId(String(notes[selectedNoteIndex - 1].id));
    }
  }, [notes, selectedNoteIndex]);

  const goToNextNote = useCallback(() => {
    if (selectedNoteIndex >= 0 && selectedNoteIndex < notes.length - 1) {
      setSelectedNoteId(String(notes[selectedNoteIndex + 1].id));
    }
  }, [notes, selectedNoteIndex]);

  const noteImages = useMemo(
    () => Object.fromEntries(resolvedPictures.map((picture) => [String(picture.id), picture.imageUrl])),
    [resolvedPictures],
  );

  const openCreateDialog = useCallback(() => {
    if (!selectedEntry) {
      toast.error('Select a journey first.');
      return;
    }

    const fallbackDate = parseJourneyDate(selectedEntry.locations[0]?.visitedAt || selectedEntry.locations[0]?.createdAt);

    setEditingNote(null);
    setFormValues({
      ...EMPTY_FORM,
      noteDate: toDateInputValue(fallbackDate),
    });
    setFormOpen(true);
  }, [selectedEntry]);

  const openEditDialog = useCallback((note: IJourneyDiaryNote) => {
    setEditingNote(note);
    setFormValues({
      title: note.title || '',
      content: note.content || '',
      noteDate: toDateInputValue(note.noteDate),
      pictureId: note.pictureId ? String(note.pictureId) : '',
    });
    setFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    if (saving) {
      return;
    }

    setFormOpen(false);
    setEditingNote(null);
    setFormValues(EMPTY_FORM);
  }, [saving]);

  const handleFormChange = useCallback((field: keyof NoteFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!userId || !selectedEntry) {
      toast.error('You must be signed in to save notes.');
      return;
    }

    const selectedPicture =
      resolvedPictures.find((picture) => String(picture.id) === formValues.pictureId) ?? null;

    setSaving(true);

    try {
      const payload = {
        pictureId: selectedPicture?.id ?? null,
        imageKey: selectedPicture?.imageKey ?? null,
        title: formValues.title.trim(),
        content: formValues.content.trim(),
        noteDate: formValues.noteDate || null,
        sortOrder: 0,
      };

      if (editingNote) {
        await updateJourneyDiaryNote(editingNote.id, payload, userId, selectedEntry.id);
        toast.success('Note updated successfully.');
      } else {
        await createJourneyDiaryNote({
          userId,
          journeyGroupKey: selectedEntry.id,
          journeyYear: selectedEntry.year,
          journeyMonth: selectedEntry.month,
          journeyCountry: selectedEntry.country,
          ...payload,
        });
        toast.success('Note added successfully.');
      }

      setFormOpen(false);
      setEditingNote(null);
      setFormValues(EMPTY_FORM);
    } catch (error) {
      console.error('Failed to save note:', error);
      toast.error('Failed to save note.');
    } finally {
      setSaving(false);
    }
  }, [editingNote, formValues, resolvedPictures, selectedEntry, userId]);

  const handleDelete = useCallback(
    async (noteId: string) => {
      if (!userId || !selectedEntry) {
        toast.error('You must be signed in to delete notes.');
        return;
      }

      setDeletingId(noteId);

      try {
        const noteIndex = notes.findIndex((note) => String(note.id) === noteId);

        await deleteJourneyDiaryNote(noteId, userId, selectedEntry.id);
        toast.success('Note deleted successfully.');

        if (selectedNoteId === noteId) {
          const nextNoteId =
            notes[noteIndex + 1]?.id ?? notes[noteIndex - 1]?.id ?? null;
          setSelectedNoteId(nextNoteId ? String(nextNoteId) : null);
        }
      } catch (error) {
        console.error('Failed to delete note:', error);
        toast.error('Failed to delete note.');
      } finally {
        setDeletingId(null);
      }
    },
    [notes, selectedEntry, selectedNoteId, userId],
  );

  const handleToggleNotePublic = useCallback(
    async (noteId: string, isPublic: JourneyVisibility) => {
      if (!userId || !selectedEntry) {
        toast.error('You must be signed in to update sharing.');
        return;
      }

      setVisibilitySavingId(noteId);

      try {
        await updateJourneyDiaryNote(noteId, { isPublic }, userId, selectedEntry.id);
        toast.success(isPublic === 1 ? 'Note is now public on Home Space.' : 'Note is now private.');
      } catch (error) {
        console.error('Failed to update note visibility:', error);
        toast.error('Failed to update sharing setting.');
      } finally {
        setVisibilitySavingId(null);
      }
    },
    [selectedEntry, userId],
  );

  const panelLoading = locationsLoading || picturesLoading || notesLoading || resolvingImages;

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
                MY NOTES
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
                        onSelect={() => setSelectedEntryId(entry.id)}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, pr: 2 }}>
                    No journeys recorded for {selectedYear}. Add locations in Where have you been to
                    create your travel notes.
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
              {selectedNote ? (
                <NoteJournalDetail
                  note={selectedNote}
                  imageUrl={
                    selectedNote.pictureId
                      ? noteImages[String(selectedNote.pictureId)]
                      : undefined
                  }
                  country={selectedEntry?.country}
                  onBack={() => setSelectedNoteId(null)}
                  onEdit={() => openEditDialog(selectedNote)}
                  onDelete={() => handleDelete(String(selectedNote.id))}
                  onImagePreview={(url, alt) => setPreviewImage({ url, alt })}
                  onTogglePublic={(visibility) =>
                    handleToggleNotePublic(String(selectedNote.id), visibility)
                  }
                  visibilitySaving={visibilitySavingId === String(selectedNote.id)}
                  onPrev={goToPrevNote}
                  onNext={goToNextNote}
                  hasPrev={selectedNoteIndex > 0}
                  hasNext={selectedNoteIndex >= 0 && selectedNoteIndex < notes.length - 1}
                  notePosition={
                    selectedNoteIndex >= 0 ? `${selectedNoteIndex + 1} / ${notes.length}` : undefined
                  }
                  deleting={deletingId === String(selectedNote.id)}
                />
              ) : (
                <>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    justifyContent="space-between"
                    sx={{ mb: 2.5 }}
                  >
                    <Box>
                      <Typography variant="h5" sx={{ color: INK_COLOR, fontWeight: 700 }}>
                        Travel Journal
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Capture the stories behind each journey and reuse your My Journey photos.
                      </Typography>
                    </Box>

                    <Button
                      variant="contained"
                      startIcon={<Iconify icon="mingcute:add-line" />}
                      onClick={openCreateDialog}
                      disabled={!selectedEntry}
                    >
                      Add Note
                    </Button>
                  </Stack>

                  {panelLoading ? (
                    <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 420 }}>
                      <CircularProgress />
                    </Stack>
                  ) : notes.length ? (
                    <Stack spacing={1.5}>
                      {notes.map((note) => (
                        <Card
                          key={note.id}
                          onClick={() => setSelectedNoteId(String(note.id))}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            border: JOURNEY_CONTENT_BORDER,
                            bgcolor: 'rgba(255, 248, 233, 0.82)',
                            boxShadow: 'none',
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              boxShadow: '0 6px 16px rgba(47, 35, 22, 0.08)',
                            },
                          }}
                        >
                          <Stack direction="row" spacing={1.5} alignItems="stretch">
                            <Stack
                              alignItems="center"
                              justifyContent="center"
                              sx={{
                                minWidth: 54,
                                px: 0.75,
                                py: 1,
                                borderRadius: 1.5,
                                border: JOURNEY_CONTENT_BORDER,
                                bgcolor: 'rgba(255,255,255,0.55)',
                                color: INK_COLOR,
                                lineHeight: 1,
                              }}
                            >
                              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>
                                {formatBadgeMonth(note.noteDate)}
                              </Typography>
                              <Typography sx={{ fontSize: '1.05rem', fontWeight: 800, mt: 0.25 }}>
                                {formatBadgeDay(note.noteDate)}
                              </Typography>
                            </Stack>

                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 700, color: INK_COLOR }}>
                                {note.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {selectedEntry?.country}
                              </Typography>

                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  mt: 0.75,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  whiteSpace: 'pre-line',
                                }}
                              >
                                {note.content}
                              </Typography>
                            </Box>

                            {note.pictureId && noteImages[String(note.pictureId)] ? (
                              <Box
                                component="img"
                                src={noteImages[String(note.pictureId)]}
                                alt={note.title}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setPreviewImage({
                                    url: noteImages[String(note.pictureId)],
                                    alt: note.title,
                                  });
                                }}
                                sx={{
                                  width: { xs: 72, sm: 96 },
                                  height: { xs: 72, sm: 80 },
                                  objectFit: 'cover',
                                  borderRadius: 1.5,
                                  border: JOURNEY_CONTENT_BORDER,
                                  flexShrink: 0,
                                  cursor: 'zoom-in',
                                }}
                              />
                            ) : null}

                            <JourneyDiaryPublicControl
                              isPublic={note.isPublic}
                              saving={visibilitySavingId === String(note.id)}
                              onChange={(visibility) =>
                                handleToggleNotePublic(String(note.id), visibility)
                              }
                              stopPropagation
                              align="flex-end"
                            />
                          </Stack>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <EmptyContent
                      title="No notes yet"
                      description="Choose a journey on the left, then add a note with a story and one of your My Journey photos."
                    />
                  )}

                  <Divider sx={{ my: 2.5, borderColor: 'rgba(31, 42, 68, 0.12)' }} />

                  <Stack direction="row" justifyContent="flex-end">
                    <Button
                      component={RouterLink}
                      href={paths.dashboard.journeyDiary.myJourney}
                      endIcon={<Iconify icon="eva:arrow-forward-fill" />}
                      sx={{
                        color: INK_COLOR,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                      }}
                    >
                      Open My Journey
                    </Button>
                  </Stack>
                </>
              )}
            </Box>
          </Stack>
        </Box>
      </Box>

      <JourneyNoteFormDialog
        open={formOpen}
        editingNote={editingNote}
        saving={saving}
        pictureOptions={resolvedPictures}
        values={formValues}
        onChange={handleFormChange}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
      />

      <NoteImagePreviewDialog image={previewImage} onClose={() => setPreviewImage(null)} />
    </DashboardContent>
  );
}
