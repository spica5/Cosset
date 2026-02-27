'use client';

import type { IGiftItem } from 'src/types/gift';
import type { Slide } from 'yet-another-react-lightbox';

import { useForm } from 'react-hook-form';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { Divider } from '@mui/material';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { uuidv4 } from 'src/utils/uuidv4';
import axiosInstance, { endpoints } from 'src/utils/axios';

import { Upload } from 'src/components/dashboard/upload';
import { toast } from 'src/components/dashboard/snackbar';
import { Lightbox, useLightBox } from 'src/components/dashboard/lightbox';

import { createGift, updateGift } from 'src/actions/gift';
import { useAuthContext } from 'src/auth/hooks';

// ——————————————————————————————————————————————————————————————————————————————

type Props = {
  currentGift?: IGiftItem;
  onClose?: () => void;
};

const formatDateForInput = (date: Date | string | number | null | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function GiftForm({ currentGift, onClose }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<IGiftItem>({
    defaultValues: {
      userId: currentGift?.userId || user?.id || '',
      title: '',
      description: '',
      category: '',
      receivedFrom: '',
      receivedDate: undefined,
      images: undefined,
    },
  });

  useEffect(() => {
    if (currentGift) {
      reset({
        userId: currentGift.userId || user?.id || '',
        title: currentGift.title || '',
        description: currentGift.description || '',
        category: currentGift.category || '',
        receivedFrom: currentGift.receivedFrom || '',
        receivedDate: formatDateForInput(currentGift.receivedDate) as any,
        images: currentGift.images || undefined,
      });
    }
  }, [currentGift, reset, user]);

  // Image upload states
  const [existingImageKeys, setExistingImageKeys] = useState<string[]>([]);
  const [previewUrlMap, setPreviewUrlMap] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Load existing image keys and preview URLs (if provided as JSON keys or array)
  useEffect(() => {
    let mounted = true;

    const loadPreviews = async () => {
      if (!currentGift || !currentGift.images) return;

      let keys: string[] = [];
      try {
        if (typeof currentGift.images === 'string') {
          const parsed = JSON.parse(currentGift.images);
          if (Array.isArray(parsed)) keys = parsed;
        } else if (Array.isArray(currentGift.images)) {
          keys = currentGift.images as unknown as string[];
        }
      } catch (err) {
        // If parsing fails, skip
        keys = [];
      }

      if (!keys.length) return;

      setExistingImageKeys(keys);

      const map: Record<string, string> = {};
      const fetches = await Promise.all(
        keys.map(async (key) => {
          try {
            const res = await axiosInstance.get(endpoints.upload.image, { params: { key } });
            return { key, url: (res.data?.url as string) || '' };
          } catch (error) {
            return { key, url: '' };
          }
        })
      );

      fetches.forEach(({ key, url }) => {
        if (url && mounted) map[key] = url;
      });

      if (!mounted) return;
      setPreviewUrlMap(map);
    };

    loadPreviews();

    return () => {
      mounted = false;
    };
  }, [currentGift]);

  const handleUploadImages = useCallback(async () => {
    try {
      if (pendingFiles.length === 0) {
        toast.warning('No files to upload');
        return;
      }

      setIsUploading(true);

      const formData = new FormData();
      const uploadKeys: string[] = [];

      pendingFiles.forEach((file, index) => {
        const key = `gift/${uuidv4()}`;
        formData.append(`files[${index}]`, file);
        formData.append(`keys[${index}]`, key);
        uploadKeys.push(key);
      });

      const uploadRes = await axiosInstance.post(endpoints.upload.image, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadData = uploadRes.data as { results?: Array<{ key?: string; url?: string }> };
      const results = uploadData.results || [];

      const uploadedUrls = results.filter((r) => r.url).map((r) => r.url as string);
      const uploadedKeys = results.filter((r) => r.key).map((r) => r.key as string);

      if (uploadedKeys.length > 0) {
        setExistingImageKeys((prev) => {
          const all = [...prev, ...uploadedKeys];
          // update form images as JSON string of keys
          setValue('images', JSON.stringify(all));
          return all;
        });

        setPreviewUrlMap((prev) => {
          const next = { ...prev };
          results.forEach((r) => {
            if (r.key && r.url) next[r.key] = r.url as string;
          });
          return next;
        });
      }

      setPendingFiles([]);
      if (uploadedUrls.length > 0) toast.success(`${uploadedUrls.length} image(s) uploaded`);
      else toast.error('Failed to upload images');
    } catch (error) {
      console.error('Failed to upload images:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  }, [pendingFiles, setValue]);

  const handleDeleteImage = useCallback((keyToDelete: string) => {
    setExistingImageKeys((prev) => {
      const updated = prev.filter((k) => k !== keyToDelete);
      setValue('images', JSON.stringify(updated));
      return updated;
    });
    setPreviewUrlMap((prev) => {
      const { [keyToDelete]: _, ...rest } = prev;
      return rest;
    });
  }, [setValue]);

  // Prepare slides for lightbox
  const slides: Slide[] = Object.entries(previewUrlMap).map(([, url]) => ({
    src: url,
  }));

  const lightbox = useLightBox(slides);

  const onSubmit = useCallback(
    async (data: IGiftItem) => {
      try {
        // ensure payload includes a userId (prefer existing gift then current user)
        const payload: IGiftItem = {
          ...data,
          userId: data.userId || currentGift?.userId || user?.id || '',
        };

        if (currentGift?.id) {
          await updateGift(currentGift.id, payload);
          toast.success('Gift updated successfully.');
        } else {
          await createGift(payload);
          toast.success('Gift created successfully.');
        }
        // onClose?.();
      } catch (error) {
        console.error('Failed to save gift:', error);
        toast.error('Failed to save gift.');
      }
    },
    [currentGift, onClose, user]
  );

  const handleCancel = useCallback(() => {
    onClose?.();
  }, [onClose]);

  return (
    <Card>
      <Stack spacing={3} sx={{ p: 3 }}>
        <TextField
          fullWidth
          label="Title"
          InputLabelProps={{ shrink: true }}
          {...register('title', { required: 'Title is required' })}
          error={!!errors.title}
          helperText={errors.title?.message}
        />

        <TextField
          fullWidth
          label="Received From"
          InputLabelProps={{ shrink: true }}
          {...register('receivedFrom')}
          error={!!errors.receivedFrom}
          helperText={errors.receivedFrom?.message}
        />

        <TextField
          fullWidth
          type="date"
          label="Received Date"
          InputLabelProps={{ shrink: true }}
          {...register('receivedDate')}
          error={!!errors.receivedDate}
          helperText={errors.receivedDate?.message}
        />

        <TextField
          fullWidth
          label="Description"
          InputLabelProps={{ shrink: true }}
          multiline
          rows={3}
          {...register('description')}
          error={!!errors.description}
          helperText={errors.description?.message}
        />

        {/* <TextField
          fullWidth
          label="Category"
          InputLabelProps={{ shrink: true }}
          {...register('category')}
          error={!!errors.category}
          helperText={errors.category?.message}
        /> */}

        <Divider />

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            {/* Existing image previews - clickable gallery */}
            <Box sx={{ width: '70%' }}>
                {Object.keys(previewUrlMap).length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {Object.entries(previewUrlMap).map(([key, url], index) => (
                    <Box 
                      key={key} 
                      sx={{ 
                        position: 'relative', 
                        display: 'inline-block',
                        cursor: 'pointer',
                      }}
                      onClick={() => lightbox.setSelected(index)}
                    >
                        <Box component="img" src={url} sx={{ width: 200, height: 150, objectFit: 'cover', borderRadius: 1, transition: 'opacity 0.2s', '&:hover': { opacity: 0.8 } }} />
                        <Box sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', borderRadius: 2 }}>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteImage(key); }} sx={{ color: 'white' }}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>
                    ))}
                </Box>
                )}
            </Box>
            <Box sx={{ width: '30%' }}>
                Upload images (max 3MB each):
                <Box sx={{ position: 'relative' }}>
                  {isUploading && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(255, 255, 255, 0.7)',
                        borderRadius: 1,
                        zIndex: 10,
                      }}
                    >
                      <CircularProgress size={40} />
                    </Box>
                  )}
                  <Upload
                    multiple
                    thumbnail
                    maxSize={3145728}
                    value={pendingFiles}
                    onRemove={(file) => setPendingFiles((prev) => prev.filter((f) => f !== file))}
                    onRemoveAll={() => setPendingFiles([])}
                    onDrop={(acceptedFiles) => !isUploading && setPendingFiles((prev) => [...prev, ...acceptedFiles])}
                    onUpload={() => handleUploadImages()}
                    disabled={isUploading}
                    sx={{ padding: 0 }}
                  />
                </Box>
            </Box>
        </Box>

        <Lightbox
          slides={slides}
          open={lightbox.open}
          close={lightbox.onClose}
          index={lightbox.selected}
        />

        <Divider />

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={handleCancel}>
            Close
          </Button>
          <LoadingButton
            variant="contained"
            loading={isSubmitting}
            onClick={handleSubmit(onSubmit)}
          >
            {currentGift?.id ? 'Update Gift' : 'Create Gift'}
          </LoadingButton>
        </Box>
      </Stack>
    </Card>
  );
}
