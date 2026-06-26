'use client';

import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';

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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import MenuItem from '@mui/material/MenuItem';

import { uuidv4 } from 'src/utils/uuidv4';

import { uploadFileToS3 } from 'src/actions/upload';
import { createBookshelfEbook, updateBookshelfEbook } from 'src/actions/bookshelf-ebook';

import { useAuthContext } from 'src/auth/hooks';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { UploadingOverlay } from 'src/components/dashboard/uploading-overlay';

import {
  getEbookFileTypeLabel,
  resolveEbookAssetUrl,
  detectEbookFileType,
  detectEbookFileTypeFromUrl,
  isHttpUrl,
} from './bookshelf-ebook-utils';
import { BOOK_CATEGORY_OPTIONS, normalizeBookCategory } from './bookshelf-book-categories';

// ----------------------------------------------------------------------

type BookSourceType = 'file' | 'url';

type FormState = {
  title: string;
  author: string;
  publishYear: string;
  description: string;
  coverImage: string;
  fileUrl: string;
  refUrl: string;
  fileType: IBookshelfEbook['fileType'];
  category: string;
  order: string;
};

const emptyForm: FormState = {
  title: '',
  author: '',
  publishYear: '',
  description: '',
  coverImage: '',
  fileUrl: '',
  refUrl: '',
  fileType: 'pdf',
  category: '',
  order: '',
};

type Props = {
  open: boolean;
  ebook?: IBookshelfEbook | null;
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

const EBOOK_FILE_ACCEPT = 'application/pdf,.pdf,text/plain,.txt';

export function BookshelfEbookFormDialog({ open, ebook, onClose, onSaved }: Props) {
  const { user } = useAuthContext();
  const isEditMode = !!ebook;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [selectedEbookFile, setSelectedEbookFile] = useState<File | null>(null);
  const [selectedEbookFileName, setSelectedEbookFileName] = useState('');
  const [sourceType, setSourceType] = useState<BookSourceType>('file');

  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setCoverPreviewUrl('');
    setSelectedCoverFile(null);
    setSelectedEbookFile(null);
    setSelectedEbookFileName('');
    setSourceType('file');
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!ebook) {
      resetForm();
      return;
    }

    setForm({
      title: ebook.title || '',
      author: ebook.author || '',
      publishYear: ebook.publishYear != null ? String(ebook.publishYear) : '',
      description: ebook.description || '',
      coverImage: ebook.coverImage || '',
      fileUrl: ebook.fileUrl || '',
      refUrl: ebook.refUrl || '',
      fileType: ebook.fileType || 'pdf',
      category: ebook.category || '',
      order: ebook.order != null ? String(ebook.order) : '',
    });
    setSourceType((ebook.refUrl || '').trim() ? 'url' : 'file');
    setSelectedCoverFile(null);
    setSelectedEbookFile(null);
    setSelectedEbookFileName('');
  }, [ebook, open, resetForm]);

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

      const signedUrl = await resolveEbookAssetUrl(normalized);
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

  const handleSelectEbookFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const fileType = detectEbookFileType(file.name, file.type);

    if (fileType !== 'pdf' && fileType !== 'txt') {
      toast.error('Please select a PDF or TXT file.');
      return;
    }

    setSelectedEbookFile(file);
    setSelectedEbookFileName(file.name);
    setForm((prev) => ({ ...prev, fileType }));
    event.target.value = '';
  }, []);

  const uploadCoverIfNeeded = useCallback(async () => {
    if (!selectedCoverFile) {
      return form.coverImage.trim() || null;
    }

    const extension = selectedCoverFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const key = `bookshelf/ebooks/covers/${uuidv4()}.${extension}`;

    setUploadingCover(true);

    try {
      const result = await uploadFileToS3({ file: selectedCoverFile, key });
      return result.key;
    } finally {
      setUploadingCover(false);
    }
  }, [form.coverImage, selectedCoverFile]);

  const handleSourceTypeChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, nextValue: BookSourceType | null) => {
      if (!nextValue) {
        return;
      }

      setSourceType(nextValue);

      if (nextValue === 'url') {
        setSelectedEbookFile(null);
        setSelectedEbookFileName('');
      } else {
        setForm((prev) => ({ ...prev, refUrl: '' }));
      }
    },
    [],
  );

  const handleRefUrlChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const refUrl = event.target.value;
    setForm((prev) => ({
      ...prev,
      refUrl,
      fileType: isHttpUrl(refUrl) ? detectEbookFileTypeFromUrl(refUrl) : prev.fileType,
    }));
  }, []);

  const uploadEbookFileIfNeeded = useCallback(async () => {
    if (!selectedEbookFile) {
      return {
        fileUrl: form.fileUrl.trim(),
        fileType: form.fileType,
      };
    }

    const fileType = detectEbookFileType(selectedEbookFile.name, selectedEbookFile.type);
    const extension = fileType === 'txt' ? 'txt' : 'pdf';
    const key = `bookshelf/ebooks/files/${uuidv4()}.${extension}`;

    setUploadingFile(true);

    try {
      const result = await uploadFileToS3({ file: selectedEbookFile, key });
      return {
        fileUrl: result.key,
        fileType,
      };
    } finally {
      setUploadingFile(false);
    }
  }, [form.fileType, form.fileUrl, selectedEbookFile]);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error('Title is required.');
      return;
    }

    const refUrl = form.refUrl.trim();

    if (sourceType === 'url') {
      if (!refUrl) {
        toast.error('Please enter a book URL.');
        return;
      }

      if (!isHttpUrl(refUrl)) {
        toast.error('Please enter a valid http or https URL.');
        return;
      }
    } else if (!isEditMode && !selectedEbookFile && !form.fileUrl.trim()) {
      toast.error('Please upload a PDF or TXT file.');
      return;
    }

    try {
      setSubmitting(true);

      const coverImage = await uploadCoverIfNeeded();

      let fileUrl: string | null = null;
      let savedRefUrl: string | null = null;
      let fileType = form.fileType;

      if (sourceType === 'url') {
        savedRefUrl = refUrl;
        fileType = detectEbookFileTypeFromUrl(refUrl);
      } else {
        const uploadedFile = await uploadEbookFileIfNeeded();

        if (!uploadedFile.fileUrl) {
          toast.error('E-book file is required.');
          return;
        }

        fileUrl = uploadedFile.fileUrl;
        fileType = uploadedFile.fileType;
      }

      if (!isEditMode && !user?.id) {
        toast.error('You must be signed in to add an e-book.');
        return;
      }

      const payload = {
        customerId: user?.id ? String(user.id) : ebook?.customerId ?? null,
        title: form.title.trim(),
        author: form.author.trim() || null,
        publishYear: parseNullableInteger(form.publishYear),
        description: form.description.trim() || null,
        coverImage,
        fileUrl,
        refUrl: savedRefUrl,
        fileType,
        category: normalizeBookCategory(form.category),
        order: parseNullableInteger(form.order),
      };

      if (isEditMode && ebook) {
        await updateBookshelfEbook(ebook.id, payload);
        toast.success('E-book updated successfully.');
      } else {
        await createBookshelfEbook(payload);
        toast.success('E-book added successfully.');
      }

      onSaved?.();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to save e-book:', error);
      toast.error('Failed to save e-book.');
    } finally {
      setSubmitting(false);
    }
  }, [
    user?.id,
    ebook,
    form,
    isEditMode,
    onClose,
    onSaved,
    resetForm,
    selectedEbookFile,
    sourceType,
    uploadCoverIfNeeded,
    uploadEbookFileIfNeeded,
  ]);

  const handleClose = useCallback(() => {
    if (submitting || uploadingCover || uploadingFile) {
      return;
    }

    onClose();
    resetForm();
  }, [onClose, resetForm, submitting, uploadingCover, uploadingFile]);

  const currentFileLabel =
    sourceType === 'url'
      ? form.refUrl.trim() || ''
      : selectedEbookFileName ||
        (form.fileUrl ? `${getEbookFileTypeLabel(form.fileType)} file attached` : '');

  return (
    <>
      <UploadingOverlay
        isOpen={uploadingCover || uploadingFile}
        message={uploadingFile ? 'Uploading e-book file...' : 'Uploading cover image...'}
      />

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{isEditMode ? 'Edit E-book' : 'Add E-book'}</DialogTitle>

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
              label="Author"
              value={form.author}
              onChange={handleFieldChange('author')}
              fullWidth
              placeholder="e.g. Jane Austen"
            />

            <TextField
              label="Publish year"
              value={form.publishYear}
              onChange={handleFieldChange('publishYear')}
              fullWidth
              placeholder="e.g. 1813"
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 4 }}
            />

            <TextField
              label="Description"
              value={form.description}
              onChange={handleFieldChange('description')}
              fullWidth
              multiline
              minRows={3}
              placeholder="A short summary about this e-book"
            />

            <TextField
              select
              label="Category"
              value={form.category}
              onChange={handleFieldChange('category')}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {BOOK_CATEGORY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                E-book source
              </Typography>

              <ToggleButtonGroup
                exclusive
                size="small"
                value={sourceType}
                onChange={handleSourceTypeChange}
                sx={{ mb: 2 }}
              >
                <ToggleButton value="file">Upload file</ToggleButton>
                <ToggleButton value="url">External URL</ToggleButton>
              </ToggleButtonGroup>

              {sourceType === 'url' ? (
                <Stack spacing={2}>
                  <TextField
                    label="Book URL"
                    value={form.refUrl}
                    onChange={handleRefUrlChange}
                    fullWidth
                    placeholder="https://example.com/book.pdf"
                    helperText="Link to a PDF or TXT file hosted online"
                  />

                  <TextField
                    select
                    label="File type"
                    value={form.fileType}
                    onChange={handleFieldChange('fileType')}
                    fullWidth
                  >
                    <MenuItem value="pdf">PDF</MenuItem>
                    <MenuItem value="txt">TXT</MenuItem>
                  </TextField>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<Iconify icon="eva:attach-2-fill" />}
                    disabled={uploadingFile || submitting}
                  >
                    {isEditMode ? 'Replace file' : 'Upload file'}
                    <input hidden type="file" accept={EBOOK_FILE_ACCEPT} onChange={handleSelectEbookFile} />
                  </Button>

                  {currentFileLabel ? (
                    <Typography variant="body2" color="text.secondary">
                      {currentFileLabel}
                    </Typography>
                  ) : null}
                </Stack>
              )}
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
                      alt="Cover preview"
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
          <Button color="inherit" onClick={handleClose} disabled={submitting || uploadingCover || uploadingFile}>
            Cancel
          </Button>

          <LoadingButton
            variant="contained"
            loading={submitting}
            onClick={handleSubmit}
            disabled={uploadingCover || uploadingFile}
          >
            {isEditMode ? 'Save changes' : 'Add e-book'}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
