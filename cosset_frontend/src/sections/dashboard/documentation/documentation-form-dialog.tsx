'use client';

import type { DocumentationCategory, IDocumentationDocument } from 'src/types/documentation';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';

import { uuidv4 } from 'src/utils/uuidv4';

import { uploadFileToS3, deleteUploadedFile } from 'src/actions/upload';
import {
  createDocumentationDocument,
  updateDocumentationDocument,
} from 'src/actions/documentation';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';

import { useAuthContext } from 'src/auth/hooks';

import {
  DOCUMENTATION_CATEGORY_OPTIONS,
  detectDocumentationFileType,
  normalizeDocumentationCategory,
} from './documentation-utils';

// ----------------------------------------------------------------------

type FormState = {
  title: string;
  description: string;
  category: DocumentationCategory | '';
};

const emptyForm: FormState = {
  title: '',
  description: '',
  category: '',
};

type Props = {
  open: boolean;
  document?: IDocumentationDocument | null;
  defaultCategory?: DocumentationCategory;
  onClose: () => void;
  onSaved?: () => void;
};

const DOCUMENT_FILE_ACCEPT =
  '.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.md,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov,.m4v,.zip';

function getUploadErrorMessage(error: unknown, fallbackMessage: string) {
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (error && typeof error === 'object') {
    const data = error as {
      message?: unknown;
      error?: unknown;
      details?: unknown;
    };

    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message.trim();
    }

    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error.trim();
    }

    if (typeof data.details === 'string' && data.details.trim()) {
      return data.details.trim();
    }
  }

  return fallbackMessage;
}

export function DocumentationFormDialog({
  open,
  document,
  defaultCategory,
  onClose,
  onSaved,
}: Props) {
  const { user } = useAuthContext();
  const isEditMode = !!document;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (document) {
      setForm({
        title: document.title || '',
        description: document.description || '',
        category: normalizeDocumentationCategory(document.category) || '',
      });
      setSelectedFile(null);
      setUploadProgress(0);
      return;
    }

    setForm({
      ...emptyForm,
      category: normalizeDocumentationCategory(defaultCategory) || '',
    });
    setSelectedFile(null);
    setUploadProgress(0);
  }, [defaultCategory, document, open]);

  const handleClose = () => {
    if (submitting) {
      return;
    }
    onClose();
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('Please sign in to save documents');
      return;
    }

    const title = form.title.trim();
    if (!title) {
      toast.error('Title is required');
      return;
    }

    if (!isEditMode && !selectedFile) {
      toast.error('Please choose a file to upload');
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    let uploadedKey = '';

    try {
      let fileUrl = document?.fileUrl || '';
      let fileType = document?.fileType || 'file';
      let originalFileName = document?.originalFileName || null;
      let fileSizeBytes = document?.fileSizeBytes || 0;

      if (selectedFile) {
        const ext = selectedFile.name.includes('.')
          ? selectedFile.name.slice(selectedFile.name.lastIndexOf('.') + 1).toLowerCase()
          : 'bin';
        const key = `documentation/files/${uuidv4()}.${ext}`;
        const uploaded = await uploadFileToS3({
          file: selectedFile,
          key,
          onProgress: setUploadProgress,
        });
        uploadedKey = uploaded.key;
        fileUrl = uploaded.key;
        fileType = detectDocumentationFileType(selectedFile.name, selectedFile.type);
        originalFileName = selectedFile.name;
        fileSizeBytes = selectedFile.size;
      }

      if (isEditMode && document) {
        await updateDocumentationDocument(
          document.id,
          {
            title,
            description: form.description.trim() || null,
            category: form.category || null,
            fileUrl,
            fileType,
            originalFileName,
            fileSizeBytes,
          },
          user.id,
        );
        toast.success('Document updated');
      } else {
        await createDocumentationDocument({
          customerId: String(user.id),
          title,
          description: form.description.trim() || null,
          category: form.category || null,
          fileUrl,
          fileType,
          originalFileName,
          fileSizeBytes,
          isFavorite: 0,
          order: null,
        });
        toast.success('Document uploaded');
      }

      onSaved?.();
      onClose();
    } catch (error) {
      if (uploadedKey) {
        try {
          await deleteUploadedFile(uploadedKey);
        } catch {
          // ignore cleanup failure
        }
      }
      console.error('Failed to save document:', error);
      toast.error(getUploadErrorMessage(error, 'Failed to save document'));
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditMode ? 'Edit document' : 'Upload document'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Keep important files for study, work, or life. Storage size is tracked so usage-based
            billing can be applied later.
          </Typography>

          <TextField
            label="Title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            fullWidth
            required
          />

          <TextField
            select
            label="Purpose"
            value={form.category}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                category: event.target.value as DocumentationCategory | '',
              }))
            }
            fullWidth
          >
            <MenuItem value="">Uncategorized</MenuItem>
            {DOCUMENTATION_CATEGORY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Notes"
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            fullWidth
            multiline
            minRows={3}
          />

          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<Iconify icon="solar:upload-bold" />}
              disabled={submitting}
            >
              {selectedFile
                ? selectedFile.name
                : isEditMode
                  ? 'Replace file'
                  : 'Choose file'}
              <input
                hidden
                type="file"
                accept={DOCUMENT_FILE_ACCEPT}
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setSelectedFile(file);
                  if (file && !form.title.trim()) {
                    setForm((prev) => ({
                      ...prev,
                      title: file.name.replace(/\.[^.]+$/, ''),
                    }));
                  }
                }}
              />
            </Button>
            {isEditMode && document?.originalFileName && !selectedFile ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Current file: {document.originalFileName}
              </Typography>
            ) : null}
          </Box>

          {submitting && selectedFile ? (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Uploading… {uploadProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 0.75 }} />
            </Box>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting} color="inherit">
          Cancel
        </Button>
        <LoadingButton loading={submitting} variant="contained" onClick={handleSubmit}>
          {isEditMode ? 'Save' : 'Upload'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
