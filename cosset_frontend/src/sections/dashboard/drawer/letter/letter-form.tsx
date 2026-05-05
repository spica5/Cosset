'use client';

import type { Slide } from 'yet-another-react-lightbox';
import type { ILetterItem } from 'src/types/letter';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { uuidv4 } from 'src/utils/uuidv4';
import axiosInstance, { endpoints } from 'src/utils/axios';

import { uploadFileToS3 } from 'src/actions/upload';
import {
  createCollectionItem,
  updateCollectionItem,
} from 'src/actions/collection-item';

import { Upload } from 'src/components/dashboard/upload';
import { toast } from 'src/components/dashboard/snackbar';
import { Lightbox, useLightBox } from 'src/components/dashboard/lightbox';
import { UploadingOverlay } from 'src/components/dashboard/uploading-overlay';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

type Props = {
  currentLetter?: ILetterItem;
  onSaved?: () => void;
  onClose?: () => void;
};

type LetterFormState = {
  title: string;
  description: string;
  date: string;
  isPublic: boolean;
};

const LETTER_COLLECTION_ID = 4;

const emptyForm: LetterFormState = {
  title: '',
  description: '',
  date: '',
  isPublic: false,
};

const toDateInputValue = (value: unknown): string => {
  if (!value) return '';
  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const parseStorageKeys = (value?: string | null): string[] => {
  const raw = (value || '').trim();
  if (!raw) return [];
  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((k) => String(k || '').trim()).filter(Boolean);
    } catch {
      // fall through
    }
  }
  return raw.split(/[\r\n,]+/).map((k) => k.trim()).filter(Boolean);
};

const stringifyStorageKeys = (keys: string[]): string => JSON.stringify(keys);

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

export function LetterForm({ currentLetter, onSaved, onClose }: Props) {
  const { user } = useAuthContext();

  const [form, setForm] = useState<LetterFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [imageKeys, setImageKeys] = useState<string[]>([]);
  const [previewUrlMap, setPreviewUrlMap] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!currentLetter) {
      setForm(emptyForm);
      setImageKeys([]);
      return;
    }

    setForm({
      title: currentLetter.title || '',
      description: currentLetter.description || '',
      date: toDateInputValue(currentLetter.date),
      isPublic: currentLetter.isPublic === 1,
    });

    setImageKeys(parseStorageKeys(currentLetter.images));
  }, [currentLetter]);

  useEffect(() => {
    let mounted = true;
    const unresolved = imageKeys.filter((key) => !previewUrlMap[key]);
    if (!unresolved.length) return undefined;

    const load = async () => {
      const results = await Promise.all(
        unresolved.map(async (key) => {
          if (isAbsoluteUrl(key)) return { key, url: key };
          try {
            const res = await axiosInstance.get(endpoints.upload.image, { params: { key } });
            return { key, url: (res.data?.url as string) || '' };
          } catch {
            return { key, url: '' };
          }
        }),
      );

      if (!mounted) return;

      setPreviewUrlMap((prev) => {
        const next = { ...prev };
        results.forEach(({ key, url }) => { if (url) next[key] = url; });
        return next;
      });
    };

    load();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageKeys]);

  const handleUpload = useCallback(async () => {
    if (!pendingFiles.length) {
      toast.warning('No files selected.');
      return;
    }

    try {
      setUploading(true);

      const uploadedKeys = await Promise.all(
        pendingFiles.map(async (file) => {
          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const key = `collection-items/${LETTER_COLLECTION_ID}/images/${uuidv4()}.${ext}`;
          const result = await uploadFileToS3({ file, key });
          return result.key || key;
        }),
      );

      setImageKeys((prev) => Array.from(new Set([...prev, ...uploadedKeys])));
      setPendingFiles([]);
      toast.success(`${uploadedKeys.length} image(s) uploaded.`);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image(s).');
    } finally {
      setUploading(false);
    }
  }, [pendingFiles]);

  const handleRemoveImage = useCallback((keyToRemove: string) => {
    setImageKeys((prev) => prev.filter((k) => k !== keyToRemove));
    setPreviewUrlMap((prev) => {
      const next = { ...prev };
      delete next[keyToRemove];
      return next;
    });
  }, []);

  const slides: Slide[] = imageKeys
    .map((key) => previewUrlMap[key])
    .filter((url): url is string => !!url)
    .map((url) => ({ src: url }));

  const lightbox = useLightBox(slides);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error('Title is required.');
      return;
    }

    const payload = {
      collectionId: LETTER_COLLECTION_ID,
      customerId: currentLetter?.customerId || (user?.id ? String(user.id) : undefined),
      title: form.title.trim(),
      description: form.description.trim() || null,
      date: form.date || null,
      isPublic: (form.isPublic ? 1 : 0) as 0 | 1,
      images: imageKeys.length ? stringifyStorageKeys(imageKeys) : null,
    };

    try {
      setSubmitting(true);

      if (currentLetter?.id) {
        await updateCollectionItem(currentLetter.id, payload);
        toast.success('Letter updated successfully.');
      } else {
        await createCollectionItem(payload);
        toast.success('Letter created successfully.');
      }

      onSaved?.();
    } catch (error) {
      console.error('Failed to save letter:', error);
      toast.error('Failed to save letter.');
    } finally {
      setSubmitting(false);
    }
  }, [currentLetter, form, imageKeys, onSaved, user?.id]);

  return (
    <>
      <UploadingOverlay isOpen={uploading} message="Uploading images..." />

      <Card>
        <Stack spacing={3} sx={{ p: 3 }}>
          <TextField
            fullWidth
            required
            label="Title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            type="date"
            label="Date"
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />

          <Stack spacing={0.5}>
            <FormControlLabel
              label="Public"
              control={
                <Switch
                  checked={form.isPublic}
                  onChange={(e) => setForm((prev) => ({ ...prev, isPublic: e.target.checked }))}
                  inputProps={{ 'aria-label': 'letter-public-switch' }}
                />
              }
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {form.isPublic
                ? 'Visible on your public universe page.'
                : 'Private - hidden from your public universe page.'}
            </Typography>
          </Stack>

          <Divider />

          {imageKeys.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">Images</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {imageKeys.map((key, index) => {
                  const url = previewUrlMap[key];
                  return (
                    <Box
                      key={key}
                      sx={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
                      onClick={() => url && lightbox.setSelected(index)}
                    >
                      {url ? (
                        <Box
                          component="img"
                          src={url}
                          alt={`Image ${index + 1}`}
                          sx={{
                            width: 120,
                            height: 96,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            transition: 'opacity 0.2s',
                            '&:hover': { opacity: 0.8 },
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 120,
                            height: 96,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CircularProgress size={20} />
                        </Box>
                      )}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'rgba(0,0,0,0.5)',
                          borderRadius: '50%',
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); handleRemoveImage(key); }}
                          sx={{ color: 'white', p: 0.25 }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Stack>
          )}

          <Stack spacing={1}>
            <Typography variant="subtitle2">Upload Images (max 5 MB each)</Typography>
            <Box sx={{ position: 'relative' }}>
              {uploading && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(255,255,255,0.7)',
                    borderRadius: 1,
                    zIndex: 10,
                  }}
                >
                  <CircularProgress size={36} />
                </Box>
              )}
              <Upload
                multiple
                thumbnail
                maxSize={5 * 1024 * 1024}
                value={pendingFiles}
                onRemove={(file) => setPendingFiles((prev) => prev.filter((f) => f !== file))}
                onRemoveAll={() => setPendingFiles([])}
                onDrop={(acceptedFiles) =>
                  !uploading && setPendingFiles((prev) => [...prev, ...acceptedFiles])
                }
                onUpload={handleUpload}
                disabled={uploading}
              />
            </Box>
          </Stack>

          <Lightbox
            slides={slides}
            open={lightbox.open}
            close={lightbox.onClose}
            index={lightbox.selected}
          />

          <Divider />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="outlined" onClick={onClose}>
              Cancel
            </Button>
            <LoadingButton variant="contained" loading={submitting} onClick={handleSubmit}>
              {currentLetter?.id ? 'Update' : 'Create'}
            </LoadingButton>
          </Stack>
        </Stack>
      </Card>
    </>
  );
}