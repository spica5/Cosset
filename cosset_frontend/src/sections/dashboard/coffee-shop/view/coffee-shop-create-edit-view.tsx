'use client';

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { uuidv4 } from 'src/utils/uuidv4';
import axiosInstance, { endpoints } from 'src/utils/axios';
import { getS3SignedUrl } from 'src/utils/helper';

import {
  useGetCoffeeShop,
  createCoffeeShop,
  updateCoffeeShop,
} from 'src/actions/coffee-shop';
import { useAuthContext } from 'src/auth/hooks';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

// ----------------------------------------------------------------------

type Props = {
  coffeeShopId?: string;
};

type FormState = {
  name: string;
  title: string;
  description: string;
  type: string;
  background: string;
  files: string;
};

const DEFAULT_BACKGROUND = 'linear-gradient(120deg, #1d3557 0%, #457b9d 100%)';

const createInitialForm = (): FormState => ({
  name: '',
  title: '',
  description: '',
  type: '1',
  background: DEFAULT_BACKGROUND,
  files: '',
});

export function CoffeeShopCreateEditView({ coffeeShopId }: Props) {
  const router = useRouter();
  const isEditMode = !!coffeeShopId;
  const { user } = useAuthContext();

  const { coffeeShop, coffeeShopLoading } = useGetCoffeeShop(coffeeShopId || '');
  const [form, setForm] = useState<FormState>(createInitialForm());
  const [saving, setSaving] = useState(false);
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const [filesUploading, setFilesUploading] = useState(false);
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const parseFileKeys = (value: string): string[] => {
    const normalized = value.trim();
    if (!normalized) {
      return [];
    }

    try {
      const parsed = JSON.parse(normalized) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
    } catch {
      // fallback to delimiter parsing
    }

    return normalized
      .split(/[\r\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  };

  const uploadFileToStorage = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const ownerSegment = String(user?.id || 'guest');
    const entitySegment = coffeeShopId || 'draft';
    const key = `coffee-shops/${ownerSegment}/${entitySegment}/${folder}/${uuidv4()}.${ext}`;

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('key', key);

    const uploadRes = await axiosInstance.post(endpoints.upload.image, uploadFormData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const result = uploadRes.data as { key?: string; url?: string };
    return result.key || key;
  };

  const handleBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setBackgroundUploading(true);
      const uploadedKey = await uploadFileToStorage(file, 'background');
      setForm((prev) => ({ ...prev, background: uploadedKey }));
    } catch (error) {
      console.error('Failed to upload background image:', error);
    } finally {
      setBackgroundUploading(false);
      event.target.value = '';
    }
  };

  const handleFilesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files ? Array.from(event.target.files) : [];

    if (!selectedFiles.length) {
      return;
    }

    try {
      setFilesUploading(true);
      const uploadedKeys = await Promise.all(
        selectedFiles.map((file) => uploadFileToStorage(file, 'files')),
      );

      setForm((prev) => {
        const existing = parseFileKeys(prev.files);
        const merged = [...existing, ...uploadedKeys];
        return { ...prev, files: JSON.stringify(merged) };
      });
    } catch (error) {
      console.error('Failed to upload coffee shop files:', error);
    } finally {
      setFilesUploading(false);
      event.target.value = '';
    }
  };

  useEffect(() => {
    if (!isEditMode || !coffeeShop) {
      return;
    }

    setForm({
      name: coffeeShop.name || '',
      title: coffeeShop.title || '',
      description: coffeeShop.description || '',
      type: String(coffeeShop.type ?? 1),
      background: coffeeShop.background || DEFAULT_BACKGROUND,
      files: coffeeShop.files || '',
    });
  }, [coffeeShop, isEditMode]);

  useEffect(() => {
    let mounted = true;

    const resolvePreview = async () => {
      const normalized = form.background.trim();

      if (!normalized) {
        if (mounted) {
          setBackgroundPreviewUrl('');
        }
        return;
      }

      if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        if (mounted) {
          setBackgroundPreviewUrl(normalized);
        }
        return;
      }

      if (normalized.includes('gradient(')) {
        if (mounted) {
          setBackgroundPreviewUrl('');
        }
        return;
      }

      const signedUrl = await getS3SignedUrl(normalized);

      if (mounted) {
        setBackgroundPreviewUrl(signedUrl || '');
      }
    };

    resolvePreview();

    return () => {
      mounted = false;
    };
  }, [form.background]);

  const heading = useMemo(
    () => (isEditMode ? 'Edit Coffee Shop' : 'Create Coffee Shop'),
    [isEditMode],
  );

  const hasBackgroundPreview = backgroundPreviewUrl || form.background.includes('gradient(');

  const handleSave = async () => {
    const normalizedName = form.name.trim();
    const normalizedTitle = form.title.trim();

    if (!normalizedName || !normalizedTitle) {
      return;
    }

    const parsedType = Number.parseInt(form.type, 10);

    try {
      setSaving(true);

      const payload = {
        name: normalizedName,
        title: normalizedTitle,
        description: form.description.trim() || null,
        type: Number.isNaN(parsedType) ? 1 : parsedType,
        background: form.background.trim() || DEFAULT_BACKGROUND,
        files: form.files.trim() || null,
      };

      if (isEditMode && coffeeShopId) {
        await updateCoffeeShop(coffeeShopId, payload);
      } else {
        await createCoffeeShop(payload);
      }

      router.push(paths.dashboard.community.coffeeShop.list);
    } catch (error) {
      console.error('Failed to save coffee shop:', error);
    } finally {
      setSaving(false);
    }
  };

  if (isEditMode && coffeeShopLoading) {
    return (
      <DashboardContent>
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (isEditMode && !coffeeShopLoading && !coffeeShop) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Coffee Shop"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Community' },
            { name: 'Coffee Shops', href: paths.dashboard.community.coffeeShop.list },
            { name: 'Edit' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <EmptyContent title="Coffee shop not found" filled sx={{ py: 10 }} />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={heading}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Community' },
          { name: 'Coffee Shops', href: paths.dashboard.community.coffeeShop.list },
          { name: isEditMode ? 'Edit' : 'Create' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <TextField
            label="Name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />

          <TextField
            label="Title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />

          <TextField
            label="Description"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            multiline
            minRows={4}
          />

          <TextField
            label="Type"
            type="number"
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <Button variant="outlined" component="label" disabled={backgroundUploading || saving}>
              {backgroundUploading ? 'Uploading Background...' : 'Upload Background Image'}
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={handleBackgroundUpload}
              />
            </Button>

            <Typography variant="caption" color="text.secondary">
              {backgroundPreviewUrl || form.background.includes('gradient(')
                ? 'Background image is ready'
                : 'Upload a background image'}
            </Typography>
          </Stack>

          <Box
            onClick={() => {
              if (hasBackgroundPreview) {
                setPreviewOpen(true);
              }
            }}
            sx={{
              width: '100%',
              maxWidth: 400,
              mx: 'auto',
              height: 300,
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'background.neutral',
              background: form.background.includes('gradient(') ? form.background : undefined,
              backgroundImage: backgroundPreviewUrl ? `url(${backgroundPreviewUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              cursor: hasBackgroundPreview ? 'zoom-in' : 'default',
            }}
          >
            {!backgroundPreviewUrl && !form.background.includes('gradient(') ? (
              <Typography variant="caption" color="text.secondary">
                Background preview will appear here
              </Typography>
            ) : null}
          </Box>

          <Dialog fullScreen open={previewOpen} onClose={() => setPreviewOpen(false)}>
            <Box
              sx={{
                position: 'relative',
                width: '100vw',
                height: '100vh',
                bgcolor: 'common.black',
                display: 'grid',
                placeItems: 'center',
                p: { xs: 1, md: 3 },
              }}
            >
              <IconButton
                onClick={() => setPreviewOpen(false)}
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  color: 'common.white',
                  border: '1px solid',
                  borderColor: 'rgba(255,255,255,0.35)',
                }}
              >
                X
              </IconButton>

              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 1,
                  bgcolor: 'common.black',
                  background: form.background.includes('gradient(') ? form.background : undefined,
                  backgroundImage: backgroundPreviewUrl ? `url(${backgroundPreviewUrl})` : undefined,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            </Box>
          </Dialog>

          <TextField
            label="Files"
            value={form.files}
            onChange={(event) => setForm((prev) => ({ ...prev, files: event.target.value }))}
            placeholder="coffee/your-file.png"
            multiline
            minRows={2}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <Button variant="outlined" component="label" disabled={filesUploading || saving}>
              {filesUploading ? 'Uploading Files...' : 'Upload Files'}
              <input
                hidden
                type="file"
                multiple
                onChange={handleFilesUpload}
              />
            </Button>

            <Typography variant="caption" color="text.secondary">
              Upload multiple files. Saved as JSON array of storage keys.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button
              color="inherit"
              onClick={() => router.push(paths.dashboard.community.coffeeShop.list)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </DashboardContent>
  );
}
