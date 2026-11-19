'use client';

import type {
  AdvertisementInput,
  AdvertisementMediaType,
  AdvertisementStatus,
  IAdvertisement,
} from 'src/types/advertisement';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';

import { uuidv4 } from 'src/utils/uuidv4';
import { getS3SignedUrl } from 'src/utils/helper';

import { uploadFileToS3, deleteUploadedFile } from 'src/actions/upload';
import { createAdvertisement, updateAdvertisement } from 'src/actions/advertisement';

import { toast } from 'sonner';
import { Iconify } from 'src/components/iconify';
import { UploadingOverlay } from 'src/components/dashboard/uploading-overlay';

// ----------------------------------------------------------------------

type FormState = {
  title: string;
  bodyText: string;
  mediaType: AdvertisementMediaType;
  imageKey: string;
  videoKey: string;
  ctaLabel: string;
  ctaUrl: string;
  placement: string;
  status: AdvertisementStatus;
  priority: string;
  companyName: string;
  companyWebsite: string;
  companyEmail: string;
  companyPhone: string;
  companyLogoKey: string;
  companyNotes: string;
  startAt: string;
  endAt: string;
};

const emptyForm: FormState = {
  title: '',
  bodyText: '',
  mediaType: 'text',
  imageKey: '',
  videoKey: '',
  ctaLabel: '',
  ctaUrl: '',
  placement: '',
  status: 'draft',
  priority: '0',
  companyName: '',
  companyWebsite: '',
  companyEmail: '',
  companyPhone: '',
  companyLogoKey: '',
  companyNotes: '',
  startAt: '',
  endAt: '',
};

const MEDIA_TYPES: AdvertisementMediaType[] = ['text', 'image', 'video', 'mixed'];
const STATUSES: AdvertisementStatus[] = ['draft', 'active', 'paused', 'archived'];

const PLACEMENT_OPTIONS = [
  'homepage',
  'community',
  'cinema',
  'blogs',
  'sidebar',
  'popup',
  'other',
];

type Props = {
  open: boolean;
  advertisement?: IAdvertisement | null;
  onClose: () => void;
  onSaved?: () => void;
};

function toDatetimeLocalValue(value?: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getActionErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'string') return error;
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

function inferMediaType(form: FormState): AdvertisementMediaType {
  if (form.mediaType !== 'text') return form.mediaType;
  const hasImage = Boolean(form.imageKey.trim());
  const hasVideo = Boolean(form.videoKey.trim());
  if (hasImage && hasVideo) return 'mixed';
  if (hasVideo) return 'video';
  if (hasImage) return 'image';
  return 'text';
}

export function AdvertisementFormDialog({ open, advertisement, onClose, onSaved }: Props) {
  const isEdit = Boolean(advertisement?.id);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [videoPreview, setVideoPreview] = useState('');

  useEffect(() => {
    if (!open) return;

    if (advertisement) {
      setForm({
        title: advertisement.title || '',
        bodyText: advertisement.bodyText || '',
        mediaType: advertisement.mediaType || 'text',
        imageKey: advertisement.imageKey || '',
        videoKey: advertisement.videoKey || '',
        ctaLabel: advertisement.ctaLabel || '',
        ctaUrl: advertisement.ctaUrl || '',
        placement: advertisement.placement || '',
        status: advertisement.status || 'draft',
        priority: String(advertisement.priority ?? 0),
        companyName: advertisement.companyName || '',
        companyWebsite: advertisement.companyWebsite || '',
        companyEmail: advertisement.companyEmail || '',
        companyPhone: advertisement.companyPhone || '',
        companyLogoKey: advertisement.companyLogoKey || '',
        companyNotes: advertisement.companyNotes || '',
        startAt: toDatetimeLocalValue(advertisement.startAt),
        endAt: toDatetimeLocalValue(advertisement.endAt),
      });
    } else {
      setForm(emptyForm);
    }
  }, [advertisement, open]);

  useEffect(() => {
    let cancelled = false;

    async function resolvePreviews() {
      const [imageUrl, logoUrl, videoUrl] = await Promise.all([
        getS3SignedUrl(form.imageKey),
        getS3SignedUrl(form.companyLogoKey),
        getS3SignedUrl(form.videoKey),
      ]);

      if (cancelled) return;
      setImagePreview(imageUrl || '');
      setLogoPreview(logoUrl || '');
      setVideoPreview(videoUrl || '');
    }

    resolvePreviews().catch(() => {
      if (!cancelled) {
        setImagePreview('');
        setLogoPreview('');
        setVideoPreview('');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [form.companyLogoKey, form.imageKey, form.videoKey]);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleUpload = useCallback(
    async (file: File, kind: 'image' | 'video' | 'logo') => {
      const extension = file.name.includes('.')
        ? file.name.slice(file.name.lastIndexOf('.'))
        : kind === 'video'
          ? '.mp4'
          : '.jpg';

      const folder =
        kind === 'logo' ? 'advertisements/logos' : kind === 'video' ? 'advertisements/videos' : 'advertisements/images';
      const key = `${folder}/${uuidv4()}${extension}`;

      setUploading(true);
      setUploadProgress(0);
      setUploadLabel(
        kind === 'logo' ? 'Uploading logo…' : kind === 'video' ? 'Uploading video…' : 'Uploading image…',
      );

      try {
        const result = await uploadFileToS3({
          file,
          key,
          onProgress: (percent) => setUploadProgress(percent),
        });

        if (kind === 'image') {
          updateField('imageKey', result.key);
          if (form.mediaType === 'text') updateField('mediaType', 'image');
        } else if (kind === 'video') {
          updateField('videoKey', result.key);
          if (form.mediaType === 'text' || form.mediaType === 'image') {
            updateField('mediaType', form.imageKey ? 'mixed' : 'video');
          }
        } else {
          updateField('companyLogoKey', result.key);
        }

        toast.success('Upload complete');
      } catch (error) {
        toast.error(getActionErrorMessage(error, 'Upload failed'));
      } finally {
        setUploading(false);
        setUploadProgress(0);
        setUploadLabel('');
      }
    },
    [form.imageKey, form.mediaType, updateField],
  );

  const handleClearMedia = useCallback(
    async (kind: 'image' | 'video' | 'logo') => {
      const key =
        kind === 'image' ? form.imageKey : kind === 'video' ? form.videoKey : form.companyLogoKey;

      if (key) {
        try {
          await deleteUploadedFile(key);
        } catch {
          // Ignore delete failures for orphaned keys.
        }
      }

      if (kind === 'image') updateField('imageKey', '');
      if (kind === 'video') updateField('videoKey', '');
      if (kind === 'logo') updateField('companyLogoKey', '');
    },
    [form.companyLogoKey, form.imageKey, form.videoKey, updateField],
  );

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }

    const priority = Number.parseInt(form.priority, 10);
    const payload: AdvertisementInput = {
      title: form.title.trim(),
      bodyText: form.bodyText.trim() || null,
      mediaType: inferMediaType(form),
      imageKey: form.imageKey.trim() || null,
      videoKey: form.videoKey.trim() || null,
      ctaLabel: form.ctaLabel.trim() || null,
      ctaUrl: form.ctaUrl.trim() || null,
      placement: form.placement.trim() || null,
      status: form.status,
      priority: Number.isNaN(priority) ? 0 : priority,
      companyName: form.companyName.trim(),
      companyWebsite: form.companyWebsite.trim() || null,
      companyEmail: form.companyEmail.trim() || null,
      companyPhone: form.companyPhone.trim() || null,
      companyLogoKey: form.companyLogoKey.trim() || null,
      companyNotes: form.companyNotes.trim() || null,
      startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
      endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
    };

    setSaving(true);
    try {
      if (isEdit && advertisement?.id) {
        await updateAdvertisement(advertisement.id, payload);
        toast.success('Advertisement updated');
      } else {
        await createAdvertisement(payload);
        toast.success('Advertisement created');
      }
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Failed to save advertisement'));
    } finally {
      setSaving(false);
    }
  }, [advertisement?.id, form, isEdit, onClose, onSaved]);

  return (
    <Dialog open={open} onClose={saving || uploading ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{isEdit ? 'Edit advertisement' : 'New advertisement'}</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle2">Ad content</Typography>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Body text"
              value={form.bodyText}
              onChange={(e) => updateField('bodyText', e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Media type"
                value={form.mediaType}
                onChange={(e) => updateField('mediaType', e.target.value as AdvertisementMediaType)}
                fullWidth
              >
                {MEDIA_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Status"
                value={form.status}
                onChange={(e) => updateField('status', e.target.value as AdvertisementStatus)}
                fullWidth
              >
                {STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Priority"
                value={form.priority}
                onChange={(e) => updateField('priority', e.target.value)}
                type="number"
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Placement"
                value={form.placement}
                onChange={(e) => updateField('placement', e.target.value)}
                fullWidth
              >
                <MenuItem value="">None</MenuItem>
                {PLACEMENT_OPTIONS.map((placement) => (
                  <MenuItem key={placement} value={placement}>
                    {placement}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="CTA label"
                value={form.ctaLabel}
                onChange={(e) => updateField('ctaLabel', e.target.value)}
                fullWidth
              />
              <TextField
                label="CTA URL"
                value={form.ctaUrl}
                onChange={(e) => updateField('ctaUrl', e.target.value)}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Start at"
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => updateField('startAt', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="End at"
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => updateField('endAt', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
          </Stack>

          <Stack spacing={2}>
            <Typography variant="subtitle2">Media</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<Iconify icon="solar:gallery-add-bold" />}
                    disabled={uploading}
                  >
                    Upload image
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) void handleUpload(file, 'image');
                      }}
                    />
                  </Button>
                  {form.imageKey ? (
                    <Button color="error" onClick={() => void handleClearMedia('image')} disabled={uploading}>
                      Remove
                    </Button>
                  ) : null}
                </Stack>
                {imagePreview ? (
                  <Box
                    component="img"
                    src={imagePreview}
                    alt="Ad image"
                    sx={{ width: 1, maxHeight: 180, objectFit: 'contain', borderRadius: 1, bgcolor: 'background.neutral' }}
                  />
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    No image uploaded
                  </Typography>
                )}
              </Box>

              <Box sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<Iconify icon="solar:videocamera-record-bold" />}
                    disabled={uploading}
                  >
                    Upload video
                    <input
                      hidden
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) void handleUpload(file, 'video');
                      }}
                    />
                  </Button>
                  {form.videoKey ? (
                    <Button color="error" onClick={() => void handleClearMedia('video')} disabled={uploading}>
                      Remove
                    </Button>
                  ) : null}
                </Stack>
                {videoPreview ? (
                  <Box
                    component="video"
                    src={videoPreview}
                    controls
                    sx={{ width: 1, maxHeight: 180, borderRadius: 1, bgcolor: 'common.black' }}
                  />
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    No video uploaded
                  </Typography>
                )}
              </Box>
            </Stack>
            {uploading ? (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {uploadLabel}
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 0.5 }} />
              </Box>
            ) : null}
          </Stack>

          <Stack spacing={2}>
            <Typography variant="subtitle2">Ads company</Typography>
            <TextField
              label="Company name"
              value={form.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              required
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Website"
                value={form.companyWebsite}
                onChange={(e) => updateField('companyWebsite', e.target.value)}
                fullWidth
              />
              <TextField
                label="Email"
                value={form.companyEmail}
                onChange={(e) => updateField('companyEmail', e.target.value)}
                fullWidth
              />
              <TextField
                label="Phone"
                value={form.companyPhone}
                onChange={(e) => updateField('companyPhone', e.target.value)}
                fullWidth
              />
            </Stack>
            <TextField
              label="Company notes"
              value={form.companyNotes}
              onChange={(e) => updateField('companyNotes', e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                component="label"
                variant="outlined"
                startIcon={<Iconify icon="solar:case-minimalistic-bold" />}
                disabled={uploading}
              >
                Upload company logo
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void handleUpload(file, 'logo');
                  }}
                />
              </Button>
              {form.companyLogoKey ? (
                <Button color="error" onClick={() => void handleClearMedia('logo')} disabled={uploading}>
                  Remove logo
                </Button>
              ) : null}
            </Stack>
            {logoPreview ? (
              <Box
                component="img"
                src={logoPreview}
                alt="Company logo"
                sx={{ width: 96, height: 96, objectFit: 'contain', borderRadius: 1, bgcolor: 'background.neutral' }}
              />
            ) : null}
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving || uploading} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          loading={saving}
          disabled={uploading}
          onClick={() => void handleSave()}
        >
          {isEdit ? 'Save changes' : 'Create'}
        </Button>
      </DialogActions>

      <UploadingOverlay
        isOpen={uploading}
        message={uploadLabel || 'Uploading…'}
        progress={uploadProgress}
      />
    </Dialog>
  );
}
