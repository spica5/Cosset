'use client';

import type { Slide } from 'yet-another-react-lightbox';
import type { ICollectionDrawerItem } from 'src/types/collection-item';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import axiosInstance, { endpoints } from 'src/utils/axios';

import { uploadFileToS3 } from 'src/actions/upload';
import { useGetCollection } from 'src/actions/collection';

import { useAuthContext } from 'src/auth/hooks';

import { uuidv4 } from 'src/utils/uuidv4';
import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import {
  createCollectionItem,
  updateCollectionItem,
  useGetCollectionItem,
} from 'src/actions/collection-item';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { Lightbox } from 'src/components/dashboard/lightbox';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';
import { UploadingOverlay } from 'src/components/dashboard/uploading-overlay';

type Props = {
  collectionId: string | number;
  itemId?: string | number;
};

type UploadFileType = 'image' | 'video' | 'pdf';

const MAX_UPLOAD_FILE_SIZE_BYTES: Record<UploadFileType, number> = {
  image: 5 * 1024 * 1024,
  video: 150 * 1024 * 1024,
  pdf: 10 * 1024 * 1024,
};

type CollectionItemFormState = {
  customerId: string;
  title: string;
  category: string;
  description: string;
  isPublic: string;
  date: string;
  images: string;
  videos: string;
  files: string;
};

const emptyForm: CollectionItemFormState = {
  customerId: '',
  title: '',
  category: '',
  description: '',
  isPublic: '0',
  date: '',
  images: '',
  videos: '',
  files: '',
};

const parseNullableInteger = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const toDateInputValue = (value: unknown): string => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString().slice(0, 10);
};

const uploadAcceptMap: Record<UploadFileType, string> = {
  image: 'image/*',
  video: 'video/*',
  pdf: 'application/pdf',
};

const getMaxUploadSizeLabel = (uploadType: UploadFileType) => {
  const maxMb = Math.floor(MAX_UPLOAD_FILE_SIZE_BYTES[uploadType] / (1024 * 1024));
  return `${maxMb}MB`;
};

const getUploadErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const candidate = (error as { message?: unknown }).message;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return fallbackMessage;
};

const isFileAllowedForUploadType = (file: File, uploadType: UploadFileType) => {
  const mimeType = (file.type || '').toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (uploadType === 'image') {
    return mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  }

  if (uploadType === 'video') {
    return mimeType.startsWith('video/') || ['mp4', 'mov', 'm4v', 'webm'].includes(ext);
  }

  return mimeType === 'application/pdf' || ext === 'pdf';
};

const getUploadStorageFolder = (uploadType: UploadFileType) => {
  if (uploadType === 'image') return 'images';
  if (uploadType === 'video') return 'videos';
  return 'files';
};

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const parseStorageKeys = (value?: string | null): string[] => {
  const raw = (value || '').trim();
  if (!raw) {
    return [];
  }

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || '').trim())
          .filter((item) => !!item);
      }
    } catch (error) {
      // Fallback to line/comma parsing below.
    }
  }

  return raw
    .split(/[\r\n,]+/)
    .map((item) => item.trim())
    .filter((item) => !!item);
};

const stringifyStorageKeys = (keys: string[]): string => keys.join('\n');

const getVideoMimeType = (value: string) => {
  const normalized = value.toLowerCase().split('?')[0].split('#')[0];

  if (normalized.endsWith('.mov')) {
    return 'video/quicktime';
  }

  if (normalized.endsWith('.webm')) {
    return 'video/webm';
  }

  return 'video/mp4';
};

export function CollectionItemCreateEditView({ collectionId, itemId }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();

  const numericCollectionId = useMemo(() => Number.parseInt(String(collectionId), 10), [collectionId]);
  const numericItemId = useMemo(() => Number.parseInt(String(itemId || ''), 10), [itemId]);
  const isEditMode = !!itemId && !Number.isNaN(numericItemId);

  const [submitting, setSubmitting] = useState(false);
  const [uploadType, setUploadType] = useState<UploadFileType>('image');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [signedUrlMap, setSignedUrlMap] = useState<Record<string, string>>({});
  const [lightboxSlides, setLightboxSlides] = useState<Slide[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [form, setForm] = useState<CollectionItemFormState>(emptyForm);

  const { collection, collectionLoading } = useGetCollection(
    Number.isNaN(numericCollectionId) ? '' : numericCollectionId,
  );

  const { collectionItem, collectionItemLoading } = useGetCollectionItem(
    isEditMode ? numericItemId : '',
  );

  useEffect(() => {
    if (!isEditMode) {
      setForm((prev) => ({
        ...prev,
        customerId: prev.customerId || (user?.id ? String(user.id) : ''),
      }));
      return;
    }

    if (!collectionItem) {
      return;
    }

    setForm({
      customerId: collectionItem.customerId ? String(collectionItem.customerId) : '',
      title: collectionItem.title || '',
      category: collectionItem.category != null ? String(collectionItem.category) : '',
      description: collectionItem.description || '',
      isPublic: collectionItem.isPublic != null ? String(collectionItem.isPublic) : '0',
      date: toDateInputValue(collectionItem.date),
      images: collectionItem.images || '',
      videos: collectionItem.videos || '',
      files: collectionItem.files || '',
    });
  }, [collectionItem, isEditMode, user?.id]);

  const formImageKeys = useMemo(() => parseStorageKeys(form.images), [form.images]);
  const formVideoKeys = useMemo(() => parseStorageKeys(form.videos), [form.videos]);
  const formPdfKeys = useMemo(() => parseStorageKeys(form.files), [form.files]);

  const allAttachmentKeys = useMemo(
    () => Array.from(new Set([...formImageKeys, ...formVideoKeys, ...formPdfKeys])),
    [formImageKeys, formPdfKeys, formVideoKeys],
  );

  useEffect(() => {
    let mounted = true;

    const unresolvedKeys = allAttachmentKeys.filter((key) => !!key && !signedUrlMap[key]);

    if (unresolvedKeys.length) {
      const loadSignedUrls = async () => {
        const results = await Promise.all(
          unresolvedKeys.map(async (key) => {
            if (isAbsoluteUrl(key)) {
              return { key, url: key };
            }

            try {
              const res = await axiosInstance.get(endpoints.upload.image, { params: { key } });
              return { key, url: (res.data?.url as string) || '' };
            } catch (error) {
              return { key, url: '' };
            }
          }),
        );

        if (!mounted) {
          return;
        }

        setSignedUrlMap((prev) => {
          const next = { ...prev };

          results.forEach(({ key, url }) => {
            if (url) {
              next[key] = url;
            }
          });

          return next;
        });
      };

      loadSignedUrls();
    }

    return () => {
      mounted = false;
    };
  }, [allAttachmentKeys, signedUrlMap]);

  const buildLightboxSlides = useCallback(
    (imageKeys: string[], videoKeys: string[]) => {
      const imageSlides: Slide[] = imageKeys
        .map((key) => signedUrlMap[key])
        .filter((url): url is string => !!url)
        .map((url) => ({ src: url }));

      const videoSlides: Slide[] = videoKeys
        .map((key) => ({ key, url: signedUrlMap[key] }))
        .filter((item): item is { key: string; url: string } => !!item.url)
        .map(({ key, url }) => ({
          type: 'video',
          width: 1280,
          height: 720,
          poster: url,
          sources: [{ src: url, type: getVideoMimeType(key) }],
        }));

      return [...imageSlides, ...videoSlides];
    },
    [signedUrlMap],
  );

  const handleOpenLightbox = useCallback((slides: Slide[], index: number) => {
    if (!slides.length) {
      return;
    }

    setLightboxSlides(slides);
    setLightboxIndex(index);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxIndex(-1);
  }, []);

  const handleFieldChange = useCallback(
    (field: keyof CollectionItemFormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { value } = event.target;
        setForm((prev) => ({ ...prev, [field]: value }));
      },
    [],
  );

  const appendUploadedStorageKeys = useCallback(
    (field: 'images' | 'videos' | 'files', keys: string[]) => {
      if (!keys.length) {
        return;
      }

      setForm((prev) => {
        const currentKeys = parseStorageKeys(prev[field]);
        const nextKeys = Array.from(new Set([...currentKeys, ...keys]));
        const next = stringifyStorageKeys(nextKeys);

        if (field === 'images') {
          return { ...prev, images: next };
        }

        if (field === 'videos') {
          return { ...prev, videos: next };
        }

        return { ...prev, files: next };
      });
    },
    [],
  );

  const handleSelectFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }

    event.target.value = '';
  }, []);

  const handleUploadTypeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextType = event.target.value as UploadFileType;
    setUploadType(nextType);
    setSelectedFiles([]);
  }, []);

  const handleUploadFile = useCallback(async () => {
    if (Number.isNaN(numericCollectionId)) {
      toast.error('Invalid collection id.');
      return;
    }

    if (!selectedFiles.length) {
      toast.warning('Please choose file(s) first.');
      return;
    }

    const invalidTypeFiles = selectedFiles.filter((file) => !isFileAllowedForUploadType(file, uploadType));
    if (invalidTypeFiles.length) {
      toast.error(
        `${invalidTypeFiles.length} selected file(s) are not valid ${uploadType} files.`,
      );
      return;
    }

    const maxFileSize = MAX_UPLOAD_FILE_SIZE_BYTES[uploadType];
    const oversizedFiles = selectedFiles.filter((file) => file.size > maxFileSize);
    if (oversizedFiles.length) {
      toast.error(`File size must be less than ${getMaxUploadSizeLabel(uploadType)} for ${uploadType}.`);
      return;
    }

    try {
      setUploadingFile(true);

      const fallbackExt = uploadType === 'image' ? 'jpg' : uploadType === 'video' ? 'mp4' : 'pdf';

      const uploadedKeys = await Promise.all(
        selectedFiles.map(async (file) => {
          const ext = file.name.split('.').pop()?.toLowerCase();
          const safeExt = ext || fallbackExt;
          const key = `collection-items/${numericCollectionId}/${getUploadStorageFolder(uploadType)}/${uuidv4()}.${safeExt}`;
          const result = await uploadFileToS3({ file, key });
          return result.key || key;
        }),
      );

      if (uploadType === 'image') {
        appendUploadedStorageKeys('images', uploadedKeys);
      } else if (uploadType === 'video') {
        appendUploadedStorageKeys('videos', uploadedKeys);
      } else {
        appendUploadedStorageKeys('files', uploadedKeys);
      }

      setSelectedFiles([]);
      toast.success(`${uploadedKeys.length} ${uploadType}(s) uploaded successfully.`);
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast.error(getUploadErrorMessage(error, 'Failed to upload file.'));
    } finally {
      setUploadingFile(false);
    }
  }, [appendUploadedStorageKeys, numericCollectionId, selectedFiles, uploadType]);

  const handleRemoveAttachment = useCallback((type: UploadFileType, keyToRemove: string) => {
    setForm((prev) => {
      if (type === 'image') {
        const nextKeys = parseStorageKeys(prev.images).filter((key) => key !== keyToRemove);
        return { ...prev, images: stringifyStorageKeys(nextKeys) };
      }

      if (type === 'video') {
        const nextKeys = parseStorageKeys(prev.videos).filter((key) => key !== keyToRemove);
        return { ...prev, videos: stringifyStorageKeys(nextKeys) };
      }

      const nextKeys = parseStorageKeys(prev.files).filter((key) => key !== keyToRemove);
      return { ...prev, files: stringifyStorageKeys(nextKeys) };
    });
  }, []);

  const renderAttachmentPreview = useCallback(
    (keys: string[], type: UploadFileType) => {
      if (!keys.length) {
        return null;
      }

      const mediaSlides =
        type === 'image'
          ? buildLightboxSlides(keys, [])
          : type === 'video'
            ? buildLightboxSlides([], keys)
            : [];

      return (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {keys.map((key, index) => {
            const url = signedUrlMap[key];
            const displayName = `${type.toUpperCase()} ${index + 1}`;

            if (!url) {
              return <Chip key={`${type}-${key}-${index}`} size="small" label={`${displayName} loading`} />;
            }

            if (type === 'image') {
              return (
                <Stack
                  key={`${type}-${key}-${index}`}
                  spacing={0.5}
                  sx={{ width: 120, position: 'relative' }}
                >
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveAttachment(type, key)}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      zIndex: 1,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                  </IconButton>
                  <Box
                    component="img"
                    src={url}
                    alt={displayName}
                    onClick={() => handleOpenLightbox(mediaSlides, index)}
                    sx={{
                      width: 120,
                      height: 96,
                      borderRadius: 1,
                      objectFit: 'cover',
                      cursor: mediaSlides.length ? 'pointer' : 'default',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                  <Button
                    onClick={() => handleOpenLightbox(mediaSlides, index)}
                    size="small"
                    variant="text"
                    disabled={!mediaSlides.length}
                    sx={{ minWidth: 0 }}
                  >
                    Preview
                  </Button>
                </Stack>
              );
            }

            if (type === 'video') {
              return (
                <Stack
                  key={`${type}-${key}-${index}`}
                  spacing={0.5}
                  sx={{ width: { xs: '100%', sm: 280 }, position: 'relative' }}
                >
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveAttachment(type, key)}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      zIndex: 1,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                  </IconButton>
                  <Box
                    component="video"
                    src={url}
                    controls
                    sx={{
                      width: '100%',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                  <Button
                    onClick={() => handleOpenLightbox(mediaSlides, index)}
                    size="small"
                    variant="text"
                    disabled={!mediaSlides.length}
                    sx={{ alignSelf: 'flex-start', minWidth: 0 }}
                  >
                    Preview Video
                  </Button>
                </Stack>
              );
            }

            return (
              <Box
                key={`${type}-${key}-${index}`}
                sx={{
                  position: 'relative',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 1,
                  pr: 5,
                }}
              >
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleRemoveAttachment(type, key)}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                </IconButton>
                <Button
                  component="a"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  variant="outlined"
                >
                  View PDF {index + 1}
                </Button>
              </Box>
            );
          })}
        </Stack>
      );
    },
    [buildLightboxSlides, handleOpenLightbox, handleRemoveAttachment, signedUrlMap],
  );

  const handleSubmit = useCallback(async () => {
    if (Number.isNaN(numericCollectionId)) {
      toast.error('Invalid collection id.');
      return;
    }

    if (!form.title.trim()) {
      toast.error('Title is required.');
      return;
    }

    const payload = {
      customerId: form.customerId.trim() || null,
      collectionId: numericCollectionId,
      title: form.title.trim(),
      category: parseNullableInteger(form.category),
      description: form.description.trim() || null,
      isPublic: parseNullableInteger(form.isPublic) ?? 0,
      date: form.date || null,
      images: form.images.trim() || null,
      videos: form.videos.trim() || null,
      files: form.files.trim() || null,
    };

    try {
      setSubmitting(true);

      if (isEditMode) {
        await updateCollectionItem(numericItemId, payload as Partial<ICollectionDrawerItem>);
        toast.success('Collection item updated successfully.');
      } else {
        await createCollectionItem(payload);
        toast.success('Collection item created successfully.');
      }

      router.push(paths.dashboard.collections.items(numericCollectionId));
    } catch (error) {
      console.error('Failed to save collection item:', error);
      toast.error('Failed to save collection item.');
    } finally {
      setSubmitting(false);
    }
  }, [form, isEditMode, numericCollectionId, numericItemId, router]);

  if (Number.isNaN(numericCollectionId)) {
    return (
      <DashboardContent>
        <Alert severity="error">Invalid collection id.</Alert>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={isEditMode ? 'Edit Collection Item' : 'Create Collection Item'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Collections', href: paths.dashboard.collections.root },
          { name: 'Manage', href: paths.dashboard.collections.manage },
          { name: 'Items', href: paths.dashboard.collections.items(numericCollectionId) },
          { name: isEditMode ? 'Edit' : 'Create' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.collections.items(numericCollectionId)}
            variant="outlined"
          >
            Back to Items
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <Alert severity="info">
          Create or Edit items for
          {collectionLoading ? '' : collection?.name ? <strong> {collection.name} </strong> : ''}
        </Alert>

        <>
          <UploadingOverlay isOpen={uploadingFile} message="Uploading file(s)..." />
          <Card sx={{ p: 3 }}>
          {isEditMode && collectionItemLoading ? (
            <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={2}>
              <Typography variant="h6">{isEditMode ? 'Edit Collection Item' : 'Create Collection Item'}</Typography>

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                }}
              >
                <TextField
                  label="Title"
                  value={form.title}
                  onChange={handleFieldChange('title')}
                  required
                  fullWidth
                />

                <TextField
                  label="Visibility"
                  select
                  value={form.isPublic}
                  onChange={handleFieldChange('isPublic')}
                  fullWidth
                >
                  <MenuItem value="0">Private</MenuItem>
                  <MenuItem value="1">Public</MenuItem>
                </TextField>
              </Box>

              <TextField
                label="Description"
                value={form.description}
                onChange={handleFieldChange('description')}
                multiline
                minRows={2}
                fullWidth
              />

              <TextField
                label="Date"
                type="date"
                value={form.date}
                onChange={handleFieldChange('date')}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />

              <Stack
                spacing={1.5}
                sx={{
                  p: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                }}
              >
                <Typography variant="subtitle2">Upload Attachment</Typography>

                <Box
                  sx={{
                    display: 'grid',
                    gap: 1.5,
                    gridTemplateColumns: { xs: '1fr', md: '180px auto auto' },
                    alignItems: 'center',
                  }}
                >
                  <TextField select label="File Type" value={uploadType} onChange={handleUploadTypeChange}>
                    <MenuItem value="image">Image</MenuItem>
                    <MenuItem value="video">Video</MenuItem>
                    <MenuItem value="pdf">PDF</MenuItem>
                  </TextField>

                  <Button component="label" variant="outlined" disabled={uploadingFile}>
                    Choose File(s)
                    <input
                      hidden
                      type="file"
                      multiple
                      accept={uploadAcceptMap[uploadType]}
                      onChange={handleSelectFile}
                    />
                  </Button>

                  <Button
                    variant="contained"
                    onClick={handleUploadFile}
                    disabled={!selectedFiles.length || uploadingFile}
                  >
                    {uploadingFile ? 'Uploading...' : 'Upload'}
                  </Button>
                </Box>

                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {selectedFiles.length
                    ? `Selected ${selectedFiles.length} file(s): ${selectedFiles
                        .slice(0, 3)
                        .map((file) => file.name)
                        .join(', ')}${selectedFiles.length > 3 ? ', ...' : ''}`
                    : `Accepted format: ${uploadAcceptMap[uploadType]} (max ${getMaxUploadSizeLabel(uploadType)})`}
                </Typography>
              </Stack>

              <TextField
                label="Images"
                value={form.images}
                onChange={handleFieldChange('images')}
                multiline
                minRows={2}
                fullWidth
                sx={{ display: 'none' }}
              />

              {formImageKeys.length > 0 && (
                <Stack spacing={1}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Image Preview
                  </Typography>
                  {renderAttachmentPreview(formImageKeys, 'image')}
                </Stack>
              )}

              <TextField
                label="Videos"
                value={form.videos}
                onChange={handleFieldChange('videos')}
                multiline
                minRows={2}
                fullWidth
                sx={{ display: 'none' }}
              />

              {formVideoKeys.length > 0 && (
                <Stack spacing={1}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Video Preview
                  </Typography>
                  {renderAttachmentPreview(formVideoKeys, 'video')}
                </Stack>
              )}

              <TextField
                label="Files"
                value={form.files}
                onChange={handleFieldChange('files')}
                multiline
                minRows={2}
                fullWidth
                sx={{ display: 'none' }}
              />

              {formPdfKeys.length > 0 && (
                <Stack spacing={1}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    PDF Preview
                  </Typography>
                  {renderAttachmentPreview(formPdfKeys, 'pdf')}
                </Stack>
              )}

              <Stack direction="row" spacing={1.5}>
                <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
                  {isEditMode ? 'Update' : 'Create'}
                </Button>
                <Button
                  variant="outlined"
                  disabled={submitting}
                  onClick={() => router.push(paths.dashboard.collections.items(numericCollectionId))}
                >
                  Cancel
                </Button>
              </Stack>
            </Stack>
          )}
        </Card>
        </>
      </Stack>

      <Lightbox
        slides={lightboxSlides}
        open={lightboxIndex >= 0}
        close={handleCloseLightbox}
        index={lightboxIndex}
      />
    </DashboardContent>
  );
}
