'use client';

import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';

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

import { uuidv4 } from 'src/utils/uuidv4';

import { uploadFileToS3 } from 'src/actions/upload';
import {
  createBookshelfAudiobook,
  updateBookshelfAudiobook,
} from 'src/actions/bookshelf-audiobook';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { UploadingOverlay } from 'src/components/dashboard/uploading-overlay';

import {
  AUDIOBOOK_FILE_ACCEPT,
  detectAudiobookFileType,
  resolveAudiobookAssetUrl,
  getAudiobookFileTypeLabel,
} from './bookshelf-audiobook-utils';

// ----------------------------------------------------------------------

type FormState = {
  title: string;
  author: string;
  description: string;
  coverImage: string;
  fileUrl: string;
  fileType: IBookshelfAudiobook['fileType'];
  order: string;
};

const emptyForm: FormState = {
  title: '',
  author: '',
  description: '',
  coverImage: '',
  fileUrl: '',
  fileType: 'mp3',
  order: '',
};

type Props = {
  open: boolean;
  audiobook?: IBookshelfAudiobook | null;
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

export function BookshelfAudiobookFormDialog({ open, audiobook, onClose, onSaved }: Props) {
  const isEditMode = !!audiobook;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [selectedAudioFileName, setSelectedAudioFileName] = useState('');

  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setCoverPreviewUrl('');
    setSelectedCoverFile(null);
    setSelectedAudioFile(null);
    setSelectedAudioFileName('');
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!audiobook) {
      resetForm();
      return;
    }

    setForm({
      title: audiobook.title || '',
      author: audiobook.author || '',
      description: audiobook.description || '',
      coverImage: audiobook.coverImage || '',
      fileUrl: audiobook.fileUrl || '',
      fileType: audiobook.fileType || 'mp3',
      order: audiobook.order != null ? String(audiobook.order) : '',
    });
    setSelectedCoverFile(null);
    setSelectedAudioFile(null);
    setSelectedAudioFileName('');
  }, [audiobook, open, resetForm]);

  useEffect(() => {
    let mounted = true;

    const loadPreview = async () => {
      if (selectedCoverFile) {
        const objectUrl = URL.createObjectURL(selectedCoverFile);
        if (mounted) {
          setCoverPreviewUrl(objectUrl);
        }
        return () => URL.revokeObjectURL(objectUrl);
      }

      const normalized = form.coverImage.trim();

      if (!normalized) {
        if (mounted) {
          setCoverPreviewUrl('');
        }
        return undefined;
      }

      const signedUrl = await resolveAudiobookAssetUrl(normalized);
      if (mounted) {
        setCoverPreviewUrl(signedUrl || normalized);
      }

      return undefined;
    };

    loadPreview();

    return () => {
      mounted = false;
    };
  }, [form.coverImage, selectedCoverFile]);

  const handleFieldChange = useCallback(
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    },
    [],
  );

  const handleSelectCover = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file for the cover.');
      return;
    }

    setSelectedCoverFile(file);
    event.target.value = '';
  }, []);

  const handleSelectAudioFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const fileType = detectAudiobookFileType(file.name, file.type);

    if (!fileType) {
      toast.error('Please select a supported audio file (MP3, M4A, WAV, OGG, AAC, FLAC).');
      return;
    }

    setSelectedAudioFile(file);
    setSelectedAudioFileName(file.name);
    setForm((prev) => ({ ...prev, fileType }));
    event.target.value = '';
  }, []);

  const uploadCoverIfNeeded = useCallback(async () => {
    if (!selectedCoverFile) {
      return form.coverImage.trim() || null;
    }

    const extension = selectedCoverFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const key = `bookshelf/audiobooks/covers/${uuidv4()}.${extension}`;

    setUploadingCover(true);

    try {
      const result = await uploadFileToS3({ file: selectedCoverFile, key });
      return result.key;
    } finally {
      setUploadingCover(false);
    }
  }, [form.coverImage, selectedCoverFile]);

  const uploadAudioFileIfNeeded = useCallback(async () => {
    if (!selectedAudioFile) {
      return {
        fileUrl: form.fileUrl.trim(),
        fileType: form.fileType,
      };
    }

    const fileType = detectAudiobookFileType(selectedAudioFile.name, selectedAudioFile.type) || 'mp3';
    const extension = fileType === 'm4a' ? 'm4a' : fileType;
    const key = `bookshelf/audiobooks/files/${uuidv4()}.${extension}`;

    setUploadingFile(true);

    try {
      const result = await uploadFileToS3({ file: selectedAudioFile, key });
      return {
        fileUrl: result.key,
        fileType,
      };
    } finally {
      setUploadingFile(false);
    }
  }, [form.fileType, form.fileUrl, selectedAudioFile]);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error('Title is required.');
      return;
    }

    if (!isEditMode && !selectedAudioFile && !form.fileUrl.trim()) {
      toast.error('Please upload an audio file.');
      return;
    }

    try {
      setSubmitting(true);

      const coverImage = await uploadCoverIfNeeded();
      const uploadedFile = await uploadAudioFileIfNeeded();

      if (!uploadedFile.fileUrl) {
        toast.error('Audio file is required.');
        return;
      }

      const payload = {
        title: form.title.trim(),
        author: form.author.trim() || null,
        description: form.description.trim() || null,
        coverImage,
        fileUrl: uploadedFile.fileUrl,
        fileType: uploadedFile.fileType,
        order: parseNullableInteger(form.order),
      };

      if (isEditMode && audiobook) {
        await updateBookshelfAudiobook(audiobook.id, payload);
        toast.success('Audio-book updated successfully.');
      } else {
        await createBookshelfAudiobook(payload);
        toast.success('Audio-book added successfully.');
      }

      onSaved?.();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to save audio-book:', error);
      toast.error('Failed to save audio-book.');
    } finally {
      setSubmitting(false);
    }
  }, [
    audiobook,
    form,
    isEditMode,
    onClose,
    onSaved,
    resetForm,
    selectedAudioFile,
    uploadAudioFileIfNeeded,
    uploadCoverIfNeeded,
  ]);

  const handleClose = useCallback(() => {
    if (submitting || uploadingCover || uploadingFile) {
      return;
    }

    onClose();
    resetForm();
  }, [onClose, resetForm, submitting, uploadingCover, uploadingFile]);

  const currentFileLabel =
    selectedAudioFileName ||
    (form.fileUrl ? `${getAudiobookFileTypeLabel(form.fileType)} file attached` : '');

  return (
    <>
      <UploadingOverlay
        isOpen={uploadingCover || uploadingFile}
        message={uploadingFile ? 'Uploading audio file...' : 'Uploading cover image...'}
      />

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{isEditMode ? 'Edit Audio-book' : 'Add Audio-book'}</DialogTitle>

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
              label="Author / Narrator"
              value={form.author}
              onChange={handleFieldChange('author')}
              fullWidth
              placeholder="e.g. Jane Austen"
            />

            <TextField
              label="Description"
              value={form.description}
              onChange={handleFieldChange('description')}
              fullWidth
              multiline
              minRows={3}
              placeholder="A short summary about this audio-book"
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Audio file (MP3, M4A, WAV, OGG, AAC, FLAC)
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<Iconify icon="solar:headphones-round-bold" />}
                  disabled={uploadingFile || submitting}
                >
                  {isEditMode ? 'Replace audio' : 'Upload audio'}
                  <input
                    hidden
                    type="file"
                    accept={AUDIOBOOK_FILE_ACCEPT}
                    onChange={handleSelectAudioFile}
                  />
                </Button>

                {currentFileLabel ? (
                  <Typography variant="body2" color="text.secondary">
                    {currentFileLabel}
                  </Typography>
                ) : null}
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

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Cover image (optional)
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    width: 120,
                    height: 120,
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
                  {coverPreviewUrl ? (
                    <Box
                      component="img"
                      src={coverPreviewUrl}
                      alt="Cover preview"
                      sx={{ width: 1, height: 1, objectFit: 'cover' }}
                    />
                  ) : (
                    <Iconify icon="solar:headphones-round-bold" width={32} sx={{ color: 'text.disabled' }} />
                  )}
                </Box>

                <Stack spacing={1}>
                  <Button component="label" variant="outlined" disabled={uploadingCover || submitting}>
                    Upload cover
                    <input hidden type="file" accept="image/*" onChange={handleSelectCover} />
                  </Button>

                  {form.coverImage || selectedCoverFile ? (
                    <Button
                      color="inherit"
                      variant="text"
                      disabled={uploadingCover || submitting}
                      onClick={() => {
                        setSelectedCoverFile(null);
                        setForm((prev) => ({ ...prev, coverImage: '' }));
                      }}
                    >
                      Remove cover
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button color="inherit" onClick={handleClose} disabled={submitting || uploadingCover || uploadingFile}>
            Cancel
          </Button>

          <LoadingButton
            variant="contained"
            loading={submitting}
            onClick={handleSubmit}
            disabled={uploadingCover || uploadingFile}
          >
            {isEditMode ? 'Save changes' : 'Add audio-book'}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
