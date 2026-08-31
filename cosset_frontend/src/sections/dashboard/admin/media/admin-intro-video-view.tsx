'use client';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { uuidv4 } from 'src/utils/uuidv4';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import { uploadFileToS3, deleteUploadedFile } from 'src/actions/upload';
import { saveIntroVideo, useGetIntroVideo } from 'src/actions/intro-video';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin } from 'src/auth/utils/role';

// ----------------------------------------------------------------------

const MAX_INTRO_VIDEO_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

const isExternalVideoUrl = (value: string) => /^https?:\/\//i.test(value.trim());

function getActionErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || fallback);
  }
  return fallback;
}

export function AdminIntroVideoView() {
  const router = useRouter();
  const { user, loading } = useAuthContext();
  const isAdmin = isUserAdmin(user?.role);
  const { introVideo, introVideoLoading } = useGetIntroVideo(isAdmin);

  const [title, setTitle] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      router.replace(paths.dashboard.root);
    }
  }, [isAdmin, loading, router, user]);

  useEffect(() => {
    if (!introVideo) return;
    setTitle(introVideo.title || '');
    setExternalUrl(
      introVideo.videoUrl && isExternalVideoUrl(introVideo.videoUrl) ? introVideo.videoUrl : '',
    );
    setPreviewUrl(introVideo.playbackUrl || '');
  }, [introVideo]);

  useEffect(() => {
    if (!selectedFile) return undefined;
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const handleSelectFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please choose a video file.');
      return;
    }

    if (file.size > MAX_INTRO_VIDEO_BYTES) {
      toast.error('Video must be 2GB or smaller.');
      return;
    }

    setSelectedFile(file);
    setExternalUrl('');
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);

      let videoKey: string | null | undefined;
      let videoUrl: string | null | undefined;

      if (selectedFile) {
        const extension = selectedFile.name.split('.').pop()?.toLowerCase() || 'mp4';
        const key = `site/intro-video/${uuidv4()}.${extension}`;
        setUploading(true);
        setUploadProgress(0);

        const uploaded = await uploadFileToS3({
          file: selectedFile,
          key,
          onProgress: setUploadProgress,
        });

        videoKey = uploaded.key;
        videoUrl = null;

        if (introVideo?.videoKey && introVideo.videoKey !== uploaded.key) {
          await deleteUploadedFile(introVideo.videoKey).catch(() => undefined);
        }
      } else if (externalUrl.trim()) {
        if (!isExternalVideoUrl(externalUrl)) {
          toast.error('External video URL must start with http:// or https://');
          return;
        }
        videoUrl = externalUrl.trim();
        videoKey = null;

        if (introVideo?.videoKey) {
          await deleteUploadedFile(introVideo.videoKey).catch(() => undefined);
        }
      } else {
        // Keep existing media; only update title.
        videoKey = undefined;
        videoUrl = undefined;
      }

      const result = await saveIntroVideo({
        title: title.trim() || null,
        videoKey,
        videoUrl,
      });

      setSelectedFile(null);
      setPreviewUrl(result.introVideo.playbackUrl || '');
      toast.success('Introduction video saved.');
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Failed to save introduction video.'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setSaving(false);
    }
  }, [externalUrl, introVideo?.videoKey, selectedFile, title]);

  const handleClear = useCallback(async () => {
    try {
      setSaving(true);
      if (introVideo?.videoKey) {
        await deleteUploadedFile(introVideo.videoKey).catch(() => undefined);
      }
      await saveIntroVideo({ clear: true, title: title.trim() || null });
      setSelectedFile(null);
      setExternalUrl('');
      setPreviewUrl('');
      toast.success('Introduction video removed.');
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Failed to remove introduction video.'));
    } finally {
      setSaving(false);
    }
  }, [introVideo?.videoKey, title]);

  if (loading || introVideoLoading) {
    return null;
  }

  if (!isAdmin) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Introduction video"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Media', href: paths.dashboard.admin.media.root },
            { name: 'Intro video' },
          ]}
          sx={{ mb: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}
        />
        <Alert
          severity="warning"
          action={
            <Button component={RouterLink} href={paths.dashboard.root} color="inherit" size="small">
              Go back
            </Button>
          }
        >
          Only administrators can manage the introduction video.
        </Alert>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Introduction video"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Media', href: paths.dashboard.admin.media.root },
          { name: 'Intro video' },
        ]}
        sx={{ mb: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}
      />

      <Card sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            Upload the Cosset introduction video shown when visitors click{' '}
            <strong>Watch video</strong> on the home page.
          </Typography>

          <TextField
            label="Title (optional)"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            fullWidth
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
            <Button
              variant="contained"
              component="label"
              startIcon={<Iconify icon="solar:videocamera-record-bold" />}
              disabled={saving || uploading}
            >
              Choose video file
              <input hidden type="file" accept="video/*" onChange={handleSelectFile} />
            </Button>
            <Typography variant="caption" color="text.secondary">
              {selectedFile
                ? selectedFile.name
                : introVideo?.videoKey
                  ? `Current upload: ${introVideo.videoKey}`
                  : 'No uploaded file yet'}
            </Typography>
          </Stack>

          <TextField
            label="Or paste an external video URL"
            value={externalUrl}
            onChange={(event) => {
              setExternalUrl(event.target.value);
              if (event.target.value.trim()) {
                setSelectedFile(null);
              }
            }}
            placeholder="https://..."
            helperText="Use a direct video file URL (mp4/webm). Leave empty when uploading a file."
            fullWidth
          />

          {uploading ? (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Uploading… {uploadProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 0.75 }} />
            </Box>
          ) : null}

          {previewUrl ? (
            <Box
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'common.black',
                maxWidth: 720,
              }}
            >
              <Box
                component="video"
                src={previewUrl}
                controls
                sx={{ width: 1, maxHeight: 420, display: 'block' }}
              />
            </Box>
          ) : (
            <Alert severity="info">No introduction video is set yet.</Alert>
          )}

          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || uploading}
              startIcon={<Iconify icon="solar:diskette-bold" />}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={handleClear}
              disabled={saving || uploading || (!introVideo?.hasVideo && !selectedFile)}
            >
              Remove video
            </Button>
          </Stack>
        </Stack>
      </Card>
    </DashboardContent>
  );
}
