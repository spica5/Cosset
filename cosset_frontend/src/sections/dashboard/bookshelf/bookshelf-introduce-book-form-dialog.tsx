'use client';

import type { IBookshelfIntroduceBook } from 'src/types/bookshelf-introduce-book';

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
import { getS3SignedUrl } from 'src/utils/helper';

import { uploadFileToS3 } from 'src/actions/upload';
import {
  createBookshelfIntroduceBook,
  updateBookshelfIntroduceBook,
} from 'src/actions/bookshelf-introduce-book';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { UploadingOverlay } from 'src/components/dashboard/uploading-overlay';

// ----------------------------------------------------------------------

type FormState = {
  title: string;
  description: string;
  coverImage: string;
  fileUrl: string;
  order: string;
};

const emptyForm: FormState = {
  title: '',
  description: '',
  coverImage: '',
  fileUrl: '',
  order: '',
};

type Props = {
  open: boolean;
  book?: IBookshelfIntroduceBook | null;
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

export function BookshelfIntroduceBookFormDialog({ open, book, onClose, onSaved }: Props) {
  const isEditMode = !!book;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);

  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setCoverPreviewUrl('');
    setSelectedCoverFile(null);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!book) {
      resetForm();
      return;
    }

    setForm({
      title: book.title || '',
      description: book.description || '',
      coverImage: book.coverImage || '',
      fileUrl: book.fileUrl || '',
      order: book.order != null ? String(book.order) : '',
    });
    setSelectedCoverFile(null);
  }, [book, open, resetForm]);

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

      if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        if (mounted) {
          setCoverPreviewUrl(normalized);
        }
        return undefined;
      }

      const signedUrl = await getS3SignedUrl(normalized);
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

  const uploadCoverIfNeeded = useCallback(async () => {
    if (!selectedCoverFile) {
      return form.coverImage.trim() || null;
    }

    const extension = selectedCoverFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const key = `bookshelf/introduce/covers/${uuidv4()}.${extension}`;

    setUploadingCover(true);

    try {
      const result = await uploadFileToS3({ file: selectedCoverFile, key });
      return result.key;
    } finally {
      setUploadingCover(false);
    }
  }, [form.coverImage, selectedCoverFile]);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error('Title is required.');
      return;
    }

    if (!form.fileUrl.trim()) {
      toast.error('File URL is required.');
      return;
    }

    try {
      setSubmitting(true);

      const coverImage = await uploadCoverIfNeeded();

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        coverImage,
        fileUrl: form.fileUrl.trim(),
        order: parseNullableInteger(form.order),
      };

      if (isEditMode && book) {
        await updateBookshelfIntroduceBook(book.id, payload);
        toast.success('Book updated successfully.');
      } else {
        await createBookshelfIntroduceBook(payload);
        toast.success('Book added successfully.');
      }

      onSaved?.();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to save book:', error);
      toast.error('Failed to save book.');
    } finally {
      setSubmitting(false);
    }
  }, [book, form, isEditMode, onClose, onSaved, resetForm, uploadCoverIfNeeded]);

  const handleClose = useCallback(() => {
    if (submitting || uploadingCover) {
      return;
    }

    onClose();
    resetForm();
  }, [onClose, resetForm, submitting, uploadingCover]);

  return (
    <>
      <UploadingOverlay isOpen={uploadingCover} message="Uploading cover image..." />

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{isEditMode ? 'Edit Book' : 'Add Book'}</DialogTitle>

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
              label="Description"
              value={form.description}
              onChange={handleFieldChange('description')}
              fullWidth
              multiline
              minRows={3}
              placeholder="A short introduction about this book"
            />

            <TextField
              label="File URL"
              value={form.fileUrl}
              onChange={handleFieldChange('fileUrl')}
              required
              fullWidth
              placeholder="https://example.com/book.pdf"
              helperText="Link where users can read or download the book"
            />

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
                Cover image
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
                  {coverPreviewUrl ? (
                    <Box
                      component="img"
                      src={coverPreviewUrl}
                      alt="Book cover preview"
                      sx={{ width: 1, height: 1, objectFit: 'cover' }}
                    />
                  ) : (
                    <Iconify icon="solar:book-2-bold" width={32} sx={{ color: 'text.disabled' }} />
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
          <Button color="inherit" onClick={handleClose} disabled={submitting || uploadingCover}>
            Cancel
          </Button>

          <LoadingButton
            variant="contained"
            loading={submitting}
            onClick={handleSubmit}
            disabled={uploadingCover}
          >
            {isEditMode ? 'Save changes' : 'Add book'}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
