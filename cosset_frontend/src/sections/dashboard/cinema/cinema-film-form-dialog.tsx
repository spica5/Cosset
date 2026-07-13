'use client';

import type { ICinemaFilm } from 'src/types/cinema-film';
import type { CinemaCategory } from 'src/sections/dashboard/cinema/cinema-categories';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

import { uuidv4 } from 'src/utils/uuidv4';
import { getS3SignedUrl } from 'src/utils/helper';

import { uploadFileToS3 } from 'src/actions/upload';
import { createCinemaFilm, updateCinemaFilm } from 'src/actions/cinema-film';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { UploadingOverlay } from 'src/components/dashboard/uploading-overlay';

// ----------------------------------------------------------------------

type FormState = {
  title: string;
  director: string;
  year: string;
  description: string;
  posterImage: string;
  videoUrl: string;
  order: string;
  isPublic: boolean;
};

const emptyForm: FormState = {
  title: '',
  director: '',
  year: '',
  description: '',
  posterImage: '',
  videoUrl: '',
  order: '',
  isPublic: true,
};

type Props = {
  open: boolean;
  category: CinemaCategory;
  customerId: string;
  film?: ICinemaFilm | null;
  onClose: () => void;
  onSaved?: () => void;
};

const parseNullableInteger = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export function CinemaFilmFormDialog({
  open,
  category,
  customerId,
  film,
  onClose,
  onSaved,
}: Props) {
  const isEditMode = !!film;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState('');
  const [selectedPosterFile, setSelectedPosterFile] = useState<File | null>(null);

  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setPosterPreviewUrl('');
    setSelectedPosterFile(null);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!film) {
      resetForm();
      return;
    }

    setForm({
      title: film.title || '',
      director: film.director || '',
      year: film.year != null ? String(film.year) : '',
      description: film.description || '',
      posterImage: film.posterImage || '',
      videoUrl: film.videoUrl || '',
      order: film.order != null ? String(film.order) : '',
      isPublic: film.isPublic !== 0,
    });
    setSelectedPosterFile(null);
  }, [film, open, resetForm]);

  useEffect(() => {
    let mounted = true;

    const loadPreview = async () => {
      if (selectedPosterFile) {
        const objectUrl = URL.createObjectURL(selectedPosterFile);
        if (mounted) {
          setPosterPreviewUrl(objectUrl);
        }
        return () => URL.revokeObjectURL(objectUrl);
      }

      const normalized = form.posterImage.trim();

      if (!normalized) {
        if (mounted) {
          setPosterPreviewUrl('');
        }
        return undefined;
      }

      if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        if (mounted) {
          setPosterPreviewUrl(normalized);
        }
        return undefined;
      }

      const signedUrl = await getS3SignedUrl(normalized);
      if (mounted) {
        setPosterPreviewUrl(signedUrl || normalized);
      }

      return undefined;
    };

    loadPreview();

    return () => {
      mounted = false;
    };
  }, [form.posterImage, selectedPosterFile]);

  const handleFieldChange = useCallback(
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    },
    [],
  );

  const handleSelectPoster = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file for the poster.');
      return;
    }

    setSelectedPosterFile(file);
    event.target.value = '';
  }, []);

  const uploadPosterIfNeeded = useCallback(async () => {
    if (!selectedPosterFile) {
      return form.posterImage.trim() || null;
    }

    const extension = selectedPosterFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const key = `cinema/films/posters/${uuidv4()}.${extension}`;

    setUploadingPoster(true);

    try {
      const result = await uploadFileToS3({ file: selectedPosterFile, key });
      return result.key;
    } finally {
      setUploadingPoster(false);
    }
  }, [form.posterImage, selectedPosterFile]);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error('Title is required.');
      return;
    }

    if (!form.videoUrl.trim()) {
      toast.error('Video URL is required.');
      return;
    }

    try {
      setSubmitting(true);

      const posterImage = await uploadPosterIfNeeded();

      const payload = {
        title: form.title.trim(),
        director: form.director.trim() || null,
        year: parseNullableInteger(form.year),
        description: form.description.trim() || null,
        posterImage,
        videoUrl: form.videoUrl.trim(),
        order: parseNullableInteger(form.order),
        isPublic: form.isPublic ? 1 : 0,
      };

      if (isEditMode && film) {
        await updateCinemaFilm(film.id, payload, { customerId, category });
        toast.success('Film updated successfully.');
      } else {
        await createCinemaFilm({
          customerId,
          category,
          ...payload,
        });
        toast.success('Film added successfully.');
      }

      onSaved?.();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to save film:', error);
      toast.error('Failed to save film.');
    } finally {
      setSubmitting(false);
    }
  }, [category, customerId, film, form, isEditMode, onClose, onSaved, resetForm, uploadPosterIfNeeded]);

  const handleClose = useCallback(() => {
    if (submitting || uploadingPoster) {
      return;
    }

    onClose();
    resetForm();
  }, [onClose, resetForm, submitting, uploadingPoster]);

  return (
    <>
      <UploadingOverlay isOpen={uploadingPoster} message="Uploading poster image..." />

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{isEditMode ? 'Edit Film' : 'Add Film'}</DialogTitle>

        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Title"
              value={form.title}
              onChange={handleFieldChange('title')}
              required
              fullWidth
            />

            <TextField
              label="Director"
              value={form.director}
              onChange={handleFieldChange('director')}
              fullWidth
            />

            <TextField
              label="Year"
              value={form.year}
              onChange={handleFieldChange('year')}
              fullWidth
              type="number"
              placeholder="e.g. 1994"
            />

            <TextField
              label="Description"
              value={form.description}
              onChange={handleFieldChange('description')}
              fullWidth
              multiline
              minRows={3}
            />

            <TextField
              label="Video URL"
              value={form.videoUrl}
              onChange={handleFieldChange('videoUrl')}
              required
              fullWidth
              placeholder="https://www.youtube.com/watch?v=..."
              helperText="YouTube, Vimeo, or direct video link"
            />

            <TextField
              label="Display order"
              value={form.order}
              onChange={handleFieldChange('order')}
              fullWidth
              type="number"
              placeholder="Optional"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.isPublic}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isPublic: event.target.checked }))
                  }
                />
              }
              label="Show in universe cinema"
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Poster image
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    width: 120,
                    height: 168,
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'background.neutral',
                    border: '1px dashed',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {posterPreviewUrl ? (
                    <Box
                      component="img"
                      src={posterPreviewUrl}
                      alt="Film poster preview"
                      sx={{ width: 1, height: 1, objectFit: 'cover' }}
                    />
                  ) : (
                    <Iconify icon="solar:clapperboard-play-bold" width={32} sx={{ color: 'text.disabled' }} />
                  )}
                </Box>

                <Stack spacing={1}>
                  <Button component="label" variant="outlined" disabled={uploadingPoster || submitting}>
                    Upload poster
                    <input hidden type="file" accept="image/*" onChange={handleSelectPoster} />
                  </Button>

                  {form.posterImage || selectedPosterFile ? (
                    <Button
                      color="inherit"
                      variant="text"
                      disabled={uploadingPoster || submitting}
                      onClick={() => {
                        setSelectedPosterFile(null);
                        setForm((prev) => ({ ...prev, posterImage: '' }));
                      }}
                    >
                      Remove poster
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button color="inherit" onClick={handleClose} disabled={submitting || uploadingPoster}>
            Cancel
          </Button>

          <LoadingButton
            variant="contained"
            loading={submitting}
            onClick={handleSubmit}
            disabled={uploadingPoster}
          >
            {isEditMode ? 'Save changes' : 'Add film'}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
