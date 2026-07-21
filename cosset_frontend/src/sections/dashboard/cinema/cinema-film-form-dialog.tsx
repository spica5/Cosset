'use client';

import type { ICinemaFilm } from 'src/types/cinema-film';
import type { CinemaCategory } from 'src/sections/dashboard/cinema/cinema-categories';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { uuidv4 } from 'src/utils/uuidv4';
import { getS3SignedUrl } from 'src/utils/helper';

import { deleteUploadedFile, uploadFileToS3 } from 'src/actions/upload';
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

const isExternalVideoUrl = (value: string) =>
  value.startsWith('http://') || value.startsWith('https://');

const isEmbeddedVideoUrl = (value: string) =>
  /youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com/i.test(value);

const MAX_CINEMA_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;

const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
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
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadPhase, setVideoUploadPhase] = useState<'preparing' | 'uploading' | 'finishing'>('preparing');
  const [deletingVideo, setDeletingVideo] = useState(false);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [selectedPosterFile, setSelectedPosterFile] = useState<File | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [removedStoredVideo, setRemovedStoredVideo] = useState(false);

  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setPosterPreviewUrl('');
    setVideoPreviewUrl('');
    setSelectedPosterFile(null);
    setSelectedVideoFile(null);
    setDeletingVideo(false);
    setRemovedStoredVideo(false);
    setVideoUploadProgress(0);
    setVideoUploadPhase('preparing');
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
      videoUrl: isExternalVideoUrl(film.videoUrl || '') ? film.videoUrl : '',
      order: film.order != null ? String(film.order) : '',
      isPublic: film.isPublic !== 0,
    });
    setSelectedPosterFile(null);
    setSelectedVideoFile(null);
    setRemovedStoredVideo(false);
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

  useEffect(() => {
    let mounted = true;
    let objectUrl = '';

    const loadVideoPreview = async () => {
      if (selectedVideoFile) {
        objectUrl = URL.createObjectURL(selectedVideoFile);
        if (mounted) {
          setVideoPreviewUrl(objectUrl);
        }
        return;
      }

      const externalUrl = form.videoUrl.trim();
      if (externalUrl) {
        if (mounted) {
          setVideoPreviewUrl(externalUrl);
        }
        return;
      }

      if (!removedStoredVideo && isEditMode && film?.videoUrl && !isExternalVideoUrl(film.videoUrl)) {
        const signedUrl = await getS3SignedUrl(film.videoUrl);
        if (mounted) {
          setVideoPreviewUrl(signedUrl || film.videoUrl);
        }
        return;
      }

      if (mounted) {
        setVideoPreviewUrl('');
      }
    };

    loadVideoPreview();

    return () => {
      mounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [film?.videoUrl, form.videoUrl, isEditMode, removedStoredVideo, selectedVideoFile]);

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

  const handleSelectVideo = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const mimeType = (file.type || '').toLowerCase();
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const isVideo =
      mimeType.startsWith('video/') || ['mp4', 'mov', 'm4v', 'webm'].includes(extension);

    if (!isVideo) {
      toast.error('Please select a video file.');
      return;
    }

    if (file.size > MAX_CINEMA_VIDEO_BYTES) {
      toast.error('Video must be 5GB or smaller.');
      return;
    }

    setSelectedVideoFile(file);
    setRemovedStoredVideo(false);
    event.target.value = '';
  }, []);

  const uploadVideoIfNeeded = useCallback(async () => {
    if (selectedVideoFile) {
      const extension = selectedVideoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
      const key = `cinema/films/videos/${uuidv4()}.${extension}`;

      setUploadingVideo(true);
      setVideoUploadProgress(0);
      setVideoUploadPhase('preparing');

      const handleUploadProgress = (percent: number) => {
        setVideoUploadProgress(percent);
        if (percent >= 100) {
          setVideoUploadPhase('finishing');
        } else if (percent > 0) {
          setVideoUploadPhase('uploading');
        }
      };

      try {
        const result = await uploadFileToS3({
          file: selectedVideoFile,
          key,
          onProgress: handleUploadProgress,
        });
        return result.key;
      } catch (error) {
        toast.error(getActionErrorMessage(error, 'Failed to upload video.'));
        throw error;
      } finally {
        setUploadingVideo(false);
        setVideoUploadProgress(0);
        setVideoUploadPhase('preparing');
      }
    }

    const trimmedUrl = form.videoUrl.trim();
    if (trimmedUrl) {
      return trimmedUrl;
    }

    if (!removedStoredVideo && isEditMode && film?.videoUrl && !isExternalVideoUrl(film.videoUrl)) {
      return film.videoUrl;
    }

    return '';
  }, [film?.videoUrl, form.videoUrl, isEditMode, removedStoredVideo, selectedVideoFile]);

  const handleDeleteStoredVideo = useCallback(async () => {
    if (!film?.videoUrl || isExternalVideoUrl(film.videoUrl) || selectedVideoFile) {
      return;
    }

    try {
      setDeletingVideo(true);
      await deleteUploadedFile(film.videoUrl);
      setRemovedStoredVideo(true);
      setVideoPreviewUrl('');
      setForm((prev) => ({ ...prev, videoUrl: '' }));
      toast.success('Uploaded video deleted permanently.');
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to delete uploaded video.';
      toast.error(message);
    } finally {
      setDeletingVideo(false);
    }
  }, [film?.videoUrl, selectedVideoFile]);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error('Title is required.');
      return;
    }

    if (
      !selectedVideoFile &&
      !form.videoUrl.trim() &&
      !(isEditMode && film?.videoUrl && !removedStoredVideo)
    ) {
      toast.error('Upload a video file or enter a video URL.');
      return;
    }

    try {
      setSubmitting(true);

      const [posterImage, videoUrl] = await Promise.all([
        uploadPosterIfNeeded(),
        uploadVideoIfNeeded(),
      ]);

      if (!videoUrl) {
        toast.error('Upload a video file or enter a video URL.');
        return;
      }

      const payload = {
        title: form.title.trim(),
        director: form.director.trim() || null,
        year: parseNullableInteger(form.year),
        description: form.description.trim() || null,
        posterImage,
        videoUrl,
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
      toast.error(getActionErrorMessage(error, 'Failed to save film.'));
    } finally {
      setSubmitting(false);
    }
  }, [
    category,
    customerId,
    film,
    form,
    isEditMode,
    onClose,
    onSaved,
    resetForm,
    removedStoredVideo,
    selectedVideoFile,
    uploadPosterIfNeeded,
    uploadVideoIfNeeded,
  ]);

  const handleClose = useCallback(() => {
    if (submitting || uploadingPoster || uploadingVideo || deletingVideo) {
      return;
    }

    onClose();
    resetForm();
  }, [deletingVideo, onClose, resetForm, submitting, uploadingPoster, uploadingVideo]);

  const hasStoredVideo =
    (!!film?.videoUrl &&
      !removedStoredVideo &&
      !isExternalVideoUrl(film.videoUrl) &&
      !selectedVideoFile &&
      !form.videoUrl.trim()) ||
    !!selectedVideoFile;
  const hasVideoUrl = !!form.videoUrl.trim() && isExternalVideoUrl(form.videoUrl.trim());

  const videoUploadMessage = (() => {
    if (!selectedVideoFile) {
      return 'Uploading video...';
    }

    const totalBytes = selectedVideoFile.size;
    const totalLabel = formatFileSize(totalBytes);
    const uploadedBytes = Math.round((videoUploadProgress / 100) * totalBytes);
    const uploadedLabel = formatFileSize(uploadedBytes);
    const progressDetail = `${uploadedLabel} / ${totalLabel}`;

    if (videoUploadPhase === 'preparing') {
      return `Preparing upload (${totalLabel})...`;
    }

    if (videoUploadPhase === 'finishing') {
      return `Finishing upload (${progressDetail})...`;
    }

    return `Uploading video (${progressDetail})...`;
  })();

  return (
    <>
      <UploadingOverlay
        isOpen={uploadingPoster || uploadingVideo}
        progress={uploadingVideo ? videoUploadProgress : undefined}
        message={uploadingVideo ? videoUploadMessage : 'Uploading poster image...'}
      />

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

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Video
              </Typography>

              <Stack spacing={1.5}>
                <TextField
                  label="Video URL"
                  value={form.videoUrl}
                  onChange={handleFieldChange('videoUrl')}
                  fullWidth
                  placeholder="https://www.youtube.com/watch?v=..."
                  helperText="YouTube, Vimeo, or direct video link"
                  disabled={!!selectedVideoFile || uploadingVideo || deletingVideo || submitting}
                />

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Button
                    component="label"
                    variant="outlined"
                    disabled={uploadingVideo || deletingVideo || submitting}
                    startIcon={<Iconify icon="solar:upload-bold" />}
                  >
                    Upload video
                    <input hidden type="file" accept="video/*" onChange={handleSelectVideo} />
                  </Button>

                  {selectedVideoFile ? (
                    <Button
                      color="inherit"
                      variant="text"
                      disabled={uploadingVideo || deletingVideo || submitting}
                      onClick={() => setSelectedVideoFile(null)}
                    >
                      Remove upload
                    </Button>
                  ) : null}

                  {hasStoredVideo && !selectedVideoFile ? (
                    <Button
                      color="error"
                      variant="text"
                      disabled={uploadingVideo || deletingVideo || submitting}
                      onClick={handleDeleteStoredVideo}
                    >
                      Delete uploaded video
                    </Button>
                  ) : null}
                </Stack>

                {selectedVideoFile ? (
                  <Stack spacing={0.75}>
                    <Typography variant="caption" color="text.secondary">
                      Selected file: {selectedVideoFile.name} ({formatFileSize(selectedVideoFile.size)})
                    </Typography>
                    {uploadingVideo ? (
                      <Stack spacing={0.5}>
                        <LinearProgress variant="determinate" value={videoUploadProgress} />
                        <Typography variant="caption" color="text.secondary">
                          {videoUploadMessage} {videoUploadProgress}%
                        </Typography>
                      </Stack>
                    ) : null}
                  </Stack>
                ) : hasStoredVideo ? (
                  <Typography variant="caption" color="text.secondary">
                    Current video: uploaded file
                  </Typography>
                ) : hasVideoUrl ? (
                  <Typography variant="caption" color="text.secondary">
                    Current video: external URL
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Upload a video file or enter a URL above.
                  </Typography>
                )}

                <Box
                  sx={{
                    width: 1,
                    minHeight: 180,
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    bgcolor: 'background.neutral',
                    border: '1px dashed',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {videoPreviewUrl ? (
                    isEmbeddedVideoUrl(videoPreviewUrl) ? (
                      <Stack spacing={1} alignItems="center" sx={{ px: 2, py: 3, textAlign: 'center' }}>
                        <Iconify
                          icon="solar:video-frame-play-vertical-bold"
                          width={32}
                          sx={{ color: 'text.secondary' }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          External video preview is not embedded here.
                        </Typography>
                        <Button
                          component="a"
                          href={videoPreviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          size="small"
                          variant="outlined"
                        >
                          Open video link
                        </Button>
                      </Stack>
                    ) : (
                      <Box
                        component="video"
                        key={videoPreviewUrl}
                        src={videoPreviewUrl}
                        controls
                        preload="metadata"
                        sx={{
                          width: 1,
                          maxHeight: 260,
                          bgcolor: '#000',
                        }}
                      />
                    )
                  ) : (
                    <Stack spacing={1} alignItems="center" sx={{ px: 2, py: 3 }}>
                      <Iconify
                        icon="solar:video-frame-play-vertical-bold"
                        width={32}
                        sx={{ color: 'text.disabled' }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        Video preview will appear here.
                      </Typography>
                    </Stack>
                  )}
                </Box>
              </Stack>
            </Box>

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
                  <Button
                    component="label"
                    variant="outlined"
                    disabled={uploadingPoster || uploadingVideo || submitting}
                  >
                    Upload poster
                    <input hidden type="file" accept="image/*" onChange={handleSelectPoster} />
                  </Button>

                  {form.posterImage || selectedPosterFile ? (
                    <Button
                      color="inherit"
                      variant="text"
                      disabled={uploadingPoster || uploadingVideo || submitting}
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
          <Button
            color="inherit"
            onClick={handleClose}
            disabled={submitting || uploadingPoster || uploadingVideo}
          >
            Cancel
          </Button>

          <LoadingButton
            variant="contained"
            loading={submitting}
            onClick={handleSubmit}
            disabled={uploadingPoster || uploadingVideo}
          >
            {isEditMode ? 'Save changes' : 'Add film'}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
