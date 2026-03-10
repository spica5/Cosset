'use client';

import type { Slide } from 'yet-another-react-lightbox';
import type { ICollectionDrawerItem } from 'src/types/collection-item';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useSetState } from 'src/hooks/use-set-state';

import axiosInstance, { endpoints } from 'src/utils/axios';
import { useGetCollection } from 'src/actions/collection';
import { useAuthContext } from 'src/auth/hooks';

import { uuidv4 } from 'src/utils/uuidv4';
import { orderBy } from 'src/utils/helper';
import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import {
  createCollectionItem,
  deleteCollectionItem,
  updateCollectionItem,
  useGetCollectionItems,
} from 'src/actions/collection-item';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { Lightbox } from 'src/components/dashboard/lightbox';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { CollectionItemsSort } from '../collection-items-sort';
import { CollectionItemsSearch } from '../collection-items-search';

type Props = {
  collectionId: string | number;
};

type UploadFileType = 'image' | 'video' | 'pdf';

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

const COLLECTION_ITEM_SORT_OPTIONS = [
  { label: 'Latest', value: 'latest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Title (A-Z)', value: 'title' },
  { label: 'Title (Z-A)', value: 'title-desc' },
];

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

const formatDate = (value: unknown) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
};

const uploadAcceptMap: Record<UploadFileType, string> = {
  image: 'image/*',
  video: 'video/*',
  pdf: 'application/pdf',
};

const isFileAllowedForUploadType = (file: File, uploadType: UploadFileType) => {
  const mimeType = (file.type || '').toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (uploadType === 'image') {
    return mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  }

  if (uploadType === 'video') {
    return mimeType.startsWith('video/') || ['mp4', 'mov'].includes(ext);
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

export function CollectionItemsView({ collectionId }: Props) {
  const { user } = useAuthContext();

  const numericCollectionId = useMemo(() => Number.parseInt(String(collectionId), 10), [collectionId]);

  const [sortBy, setSortBy] = useState('latest');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadType, setUploadType] = useState<UploadFileType>('image');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [signedUrlMap, setSignedUrlMap] = useState<Record<string, string>>({});
  const [lightboxSlides, setLightboxSlides] = useState<Slide[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [form, setForm] = useState<CollectionItemFormState>(emptyForm);

  const { collection, collectionLoading } = useGetCollection(
    Number.isNaN(numericCollectionId) ? '' : numericCollectionId,
  );

  const { collectionItems, collectionItemsLoading } = useGetCollectionItems(
    Number.isNaN(numericCollectionId) ? '' : numericCollectionId,
  );

  const search = useSetState<{
    query: string;
    results: ICollectionDrawerItem[];
  }>({ query: '', results: [] });

  const hasSearchQuery = Boolean(search.state.query.trim());

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customerId: prev.customerId || (user?.id ? String(user.id) : ''),
    }));
  }, [user?.id]);

  const dataFiltered = useMemo(
    () =>
      applyFilter({
        inputData: hasSearchQuery ? search.state.results : collectionItems,
        sortBy,
      }),
    [collectionItems, hasSearchQuery, search.state.results, sortBy],
  );

  const handleSortBy = useCallback((newValue: string) => {
    setSortBy(newValue);
  }, []);

  const handleSearch = useCallback(
    (inputValue: string) => {
      search.setState({ query: inputValue });

      const normalizedQuery = inputValue.trim().toLowerCase();

      if (normalizedQuery) {
        const results = collectionItems.filter((item) => {
          const title = (item.title || '').toLowerCase();
          const description = (item.description || '').toLowerCase();
          const category = String(item.category ?? '').toLowerCase();
          const visibility = item.isPublic === 1 ? 'public' : item.isPublic === 0 ? 'private' : '';
          const dateValue = item.date ? new Date(item.date).toISOString().slice(0, 10) : '';

          return (
            title.includes(normalizedQuery) ||
            description.includes(normalizedQuery) ||
            category.includes(normalizedQuery) ||
            visibility.includes(normalizedQuery) ||
            dateValue.includes(normalizedQuery)
          );
        });

        search.setState({ results });
      } else {
        search.setState({ results: [] });
      }
    },
    [collectionItems, search],
  );

  const formImageKeys = useMemo(() => parseStorageKeys(form.images), [form.images]);
  const formVideoKeys = useMemo(() => parseStorageKeys(form.videos), [form.videos]);
  const formPdfKeys = useMemo(() => parseStorageKeys(form.files), [form.files]);

  const allAttachmentKeys = useMemo(() => {
    const keys: string[] = [...formImageKeys, ...formVideoKeys, ...formPdfKeys];

    collectionItems.forEach((item) => {
      keys.push(...parseStorageKeys(item.images));
      keys.push(...parseStorageKeys(item.videos));
      keys.push(...parseStorageKeys(item.files));
    });

    return Array.from(new Set(keys));
  }, [collectionItems, formImageKeys, formPdfKeys, formVideoKeys]);

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

  const resetForm = useCallback(() => {
    setEditingId(null);
    setSelectedFile(null);
    setUploadType('image');
    setForm({
      ...emptyForm,
      customerId: user?.id ? String(user.id) : '',
    });
  }, [user?.id]);

  const appendUploadedStorageKey = useCallback(
    (field: 'images' | 'videos' | 'files', key: string) => {
      setForm((prev) => {
        const current = prev[field].trim();
        const next = current ? `${current}\n${key}` : key;

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
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);

    // Reset input value so selecting the same file again still triggers onChange.
    event.target.value = '';
  }, []);

  const handleUploadTypeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextType = event.target.value as UploadFileType;
    setUploadType(nextType);
    setSelectedFile(null);
  }, []);

  const handleUploadFile = useCallback(async () => {
    if (Number.isNaN(numericCollectionId)) {
      toast.error('Invalid collection id.');
      return;
    }

    if (!selectedFile) {
      toast.warning('Please choose a file first.');
      return;
    }

    if (!isFileAllowedForUploadType(selectedFile, uploadType)) {
      toast.error(`Selected file is not a valid ${uploadType} file.`);
      return;
    }

    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    const fallbackExt = uploadType === 'image' ? 'jpg' : uploadType === 'video' ? 'mp4' : 'pdf';
    const safeExt = ext || fallbackExt;
    const key = `collection-items/${numericCollectionId}/${getUploadStorageFolder(uploadType)}/${uuidv4()}.${safeExt}`;

    try {
      setUploadingFile(true);

      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('key', key);

      const uploadRes = await axiosInstance.post(endpoints.upload.image, uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = uploadRes.data as { key?: string; url?: string };
      const uploadedKey = result.key || key;

      if (uploadType === 'image') {
        appendUploadedStorageKey('images', uploadedKey);
      } else if (uploadType === 'video') {
        appendUploadedStorageKey('videos', uploadedKey);
      } else {
        appendUploadedStorageKey('files', uploadedKey);
      }

      setSelectedFile(null);
      toast.success(`${uploadType.toUpperCase()} uploaded successfully.`);
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file.');
    } finally {
      setUploadingFile(false);
    }
  }, [appendUploadedStorageKey, numericCollectionId, selectedFile, uploadType]);

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

      if (editingId) {
        await updateCollectionItem(editingId, payload);
        toast.success('Collection item updated successfully.');
      } else {
        await createCollectionItem(payload);
        toast.success('Collection item created successfully.');
      }

      resetForm();
    } catch (error) {
      console.error('Failed to save collection item:', error);
      toast.error('Failed to save collection item.');
    } finally {
      setSubmitting(false);
    }
  }, [editingId, form, numericCollectionId, resetForm]);

  const handleDelete = useCallback(
    async (item: ICollectionDrawerItem) => {
      const confirmed = window.confirm(`Delete item "${item.title || item.id}"?`);
      if (!confirmed) {
        return;
      }

      try {
        await deleteCollectionItem(item.id, item.collectionId, item.customerId || user?.id);
        toast.success('Collection item deleted successfully.');

        if (editingId === item.id) {
          resetForm();
        }
      } catch (error) {
        console.error('Failed to delete collection item:', error);
        toast.error('Failed to delete collection item.');
      }
    },
    [editingId, resetForm, user?.id],
  );

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
    (keys: string[], type: UploadFileType, options?: { allowRemove?: boolean }) => {
      if (!keys.length) {
        return null;
      }

      const allowRemove = options?.allowRemove ?? false;
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
                  {allowRemove && (
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
                  )}
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
                  {allowRemove && (
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
                  )}
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
                {allowRemove && (
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
                )}
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

  const renderItemAttachmentLinks = useCallback(
    (item: ICollectionDrawerItem) => {
      const imageKeys = parseStorageKeys(item.images);
      const videoKeys = parseStorageKeys(item.videos);
      const pdfKeys = parseStorageKeys(item.files);

      if (!imageKeys.length && !videoKeys.length && !pdfKeys.length) {
        return '-';
      }

      const imageUrl = imageKeys.length ? signedUrlMap[imageKeys[0]] : '';
      const videoUrl = videoKeys.length ? signedUrlMap[videoKeys[0]] : '';
      const pdfUrl = pdfKeys.length ? signedUrlMap[pdfKeys[0]] : '';
      const mediaSlides = buildLightboxSlides(imageKeys, videoKeys);
      const resolvedImageCount = imageKeys.filter((key) => !!signedUrlMap[key]).length;

      return (
        <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
          {imageKeys.length > 0 && (
            imageUrl ? (
              <Button
                onClick={() => handleOpenLightbox(mediaSlides, 0)}
                size="small"
                variant="text"
                disabled={!mediaSlides.length}
                sx={{ minWidth: 0, p: 0, justifyContent: 'flex-start' }}
              >
                Image ({imageKeys.length})
              </Button>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Image ({imageKeys.length}) loading...
              </Typography>
            )
          )}

          {videoKeys.length > 0 && (
            videoUrl ? (
              <Button
                onClick={() => handleOpenLightbox(mediaSlides, resolvedImageCount)}
                size="small"
                variant="text"
                disabled={!mediaSlides.length}
                sx={{ minWidth: 0, p: 0, justifyContent: 'flex-start' }}
              >
                Video ({videoKeys.length})
              </Button>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Video ({videoKeys.length}) loading...
              </Typography>
            )
          )}

          {pdfKeys.length > 0 && (
            pdfUrl ? (
              <Button
                component="a"
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                variant="text"
                sx={{ minWidth: 0, p: 0, justifyContent: 'flex-start' }}
              >
                PDF ({pdfKeys.length})
              </Button>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                PDF ({pdfKeys.length}) loading...
              </Typography>
            )
          )}
        </Stack>
      );
    },
    [buildLightboxSlides, handleOpenLightbox, signedUrlMap],
  );

  if (Number.isNaN(numericCollectionId)) {
    return (
      <DashboardContent>
        <Alert severity="error">Invalid collection id.</Alert>
      </DashboardContent>
    );
  }

  const emptyListTitle = collectionItems.length === 0
    ? 'No collection items yet'
    : hasSearchQuery
      ? `No results for "${search.state.query.trim()}"`
      : 'No collection items yet';

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={collection?.name ? `${collection.name} - Items` : 'Collection Items'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Drawers', href: paths.dashboard.drawer.root },
          { name: 'Collections', href: paths.dashboard.drawer.collections.root },
          { name: 'Manage', href: paths.dashboard.drawer.collections.manage },
          { name: 'Items' },
        ]}
        action={
          <Stack direction="row" spacing={1.5}>
            <Button component={RouterLink} href={paths.dashboard.drawer.collections.manage} variant="outlined">
              Back to Manage Collections
            </Button>
            <Button
              component={RouterLink}
              href={paths.dashboard.drawer.collections.newItem(numericCollectionId)}
              variant="contained"
            >
              New Item
            </Button>
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <Alert severity="info">
          Managing items for 
          {collectionLoading ? '' : collection?.name ? <strong> {collection.name} </strong> : ''}
        </Alert>

        {false && (<Card sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">{editingId ? 'Edit Collection Item' : 'Create Collection Item'}</Typography>

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
                label="Public"
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

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              }}
            >
              <TextField
                label="Category"
                value={form.category}
                onChange={handleFieldChange('category')}
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
            </Box>

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
                  Choose File
                  <input
                    hidden
                    type="file"
                    accept={uploadAcceptMap[uploadType]}
                    onChange={handleSelectFile}
                  />
                </Button>

                <Button
                  variant="contained"
                  onClick={handleUploadFile}
                  disabled={!selectedFile || uploadingFile}
                >
                  {uploadingFile ? 'Uploading...' : 'Upload'}
                </Button>
              </Box>

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {selectedFile
                  ? `Selected: ${selectedFile?.name || ''}`
                  : `Accepted format: ${uploadAcceptMap[uploadType]}`}
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
                {renderAttachmentPreview(formImageKeys, 'image', { allowRemove: true })}
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
                {renderAttachmentPreview(formVideoKeys, 'video', { allowRemove: true })}
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
                {renderAttachmentPreview(formPdfKeys, 'pdf', { allowRemove: true })}
              </Stack>
            )}

            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
                {editingId ? 'Update' : 'Create'}
              </Button>
              <Button variant="outlined" onClick={resetForm} disabled={submitting}>
                Clear
              </Button>
            </Stack>
          </Stack>
        </Card>)}

        <Stack
          spacing={3}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-end', sm: 'center' }}
          direction={{ xs: 'column', sm: 'row' }}
        >
          <CollectionItemsSearch
            search={search}
            onSearch={handleSearch}
            placeholder="Search collection items..."
            onSelect={(option) => {
              search.setState({ query: option.title || '' });
            }}
          />

          <CollectionItemsSort
            sort={sortBy}
            onSort={handleSortBy}
            sortOptions={COLLECTION_ITEM_SORT_OPTIONS}
          />
        </Stack>

        <Card sx={{ p: 0 }}>
          {collectionItemsLoading ? (
            <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : dataFiltered.length === 0 ? (
            <EmptyContent title={emptyListTitle} filled sx={{ py: 8 }} />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Public</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Attachments</TableCell>
                    <TableCell>Updated At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dataFiltered.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant="subtitle1">{item.title || '-'}</Typography>
                          {/* <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Item #{item.id}
                          </Typography> */}
                        </Stack>
                      </TableCell>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell>
                        {item.isPublic == null ? (
                          '-'
                        ) : (
                          <Chip
                            label={item.isPublic === 1 ? 'Public' : 'Private'}
                            size="small"
                            color={item.isPublic === 1 ? 'success' : 'default'}
                          />
                        )}
                      </TableCell>
                      <TableCell>{formatDate(item.date)}</TableCell>
                      <TableCell>{renderItemAttachmentLinks(item)}</TableCell>
                      <TableCell>{formatDate(item.updatedAt)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <IconButton
                            size="small"
                            component={RouterLink}
                            href={paths.dashboard.drawer.collections.editItem(
                              numericCollectionId,
                              item.id,
                            )}
                            aria-label={`Edit item ${item.title || item.id}`}
                          >
                            <Iconify icon="solar:pen-2-outline" width={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(item)}
                            aria-label={`Delete item ${item.title || item.id}`}
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
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

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  sortBy: string;
  inputData: ICollectionDrawerItem[];
};

const getItemDateTime = (value: unknown) => {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value as string | number | Date).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const applyFilter = ({ inputData, sortBy }: ApplyFilterProps) => {
  if (sortBy === 'latest') {
    return [...inputData].sort((a, b) => {
      const aTime = getItemDateTime(a.date);
      const bTime = getItemDateTime(b.date);

      if (aTime !== bTime) {
        return bTime - aTime;
      }

      return (b.id || 0) - (a.id || 0);
    });
  }

  if (sortBy === 'oldest') {
    return [...inputData].sort((a, b) => {
      const aTime = getItemDateTime(a.date);
      const bTime = getItemDateTime(b.date);

      if (aTime !== bTime) {
        return aTime - bTime;
      }

      return (a.id || 0) - (b.id || 0);
    });
  }

  if (sortBy === 'title') {
    return orderBy(inputData, ['title'], ['asc']);
  }

  if (sortBy === 'title-desc') {
    return orderBy(inputData, ['title'], ['desc']);
  }

  return inputData;
};
