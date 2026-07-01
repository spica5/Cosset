import type { IDesignSpaceItem } from 'src/types/design-space';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';

import { CONFIG } from 'src/config-global';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { uuidv4 } from 'src/utils/uuidv4';
import axiosInstance, { endpoints } from 'src/utils/axios';

import { Image } from 'src/components/dashboard/image';
import { Upload } from 'src/components/dashboard/upload';
import { toast } from 'src/components/dashboard/snackbar';
import { Form, Field, schemaHelper } from 'src/components/dashboard/hook-form';

import { useAuthContext } from 'src/auth/hooks';

import {
  type DesignSpaceType,
  DEFAULT_DESIGN_SPACE_TYPE,
  DESIGN_SPACE_TYPE_OPTIONS,
  getDesignSpaceTypeDescription,
  getDesignSpaceTheme,
  normalizeDesignSpaceType,
} from 'src/utils/design-space-type';

import { getDesignCategoryImageUrl } from 'src/sections/universe/universe/landing/myspace-section-images';

import ImageGallery from './image-gallery';

// ----------------------------------------------------------------------

export const DesignSpaceSchema = zod.object({
  // For design space, require at least some images
  images: schemaHelper.files({ message: { required_error: 'Images is required!' } }),
  rooms: zod.string().optional(),
  effects: zod.string().optional(),
  designType: zod.enum([
    'gentle-feminine-romantic',
    'serene-elegant',
    'warm-nostalgic',
    'strong-modern',
    'young-dynamic',
  ]),
});

export type DesignSpaceSchemaType = zod.infer<typeof DesignSpaceSchema>;

// ----------------------------------------------------------------------

type Props = {
  currentArea?: IDesignSpaceItem;
};

// Template images for design space
const templateImages = [
  { url: `${CONFIG.dashboard.assetsDir}/assets/images/design-space/cosset_default.png`, name: 'default1' },
  { url: `${CONFIG.dashboard.assetsDir}/assets/images/design-space/cosset_default4.png`, name: 'default2' },
  { url: `${CONFIG.dashboard.assetsDir}/assets/images/design-space/template1.jpg`, name: 'Modern Living Room1' },
  { url: `${CONFIG.dashboard.assetsDir}/assets/images/design-space/template4.jpg`, name: 'Modern Living Room2' },
  { url: `${CONFIG.dashboard.assetsDir}/assets/images/design-space/template3.jpg`, name: 'Classical Living Room' },
  { url: `${CONFIG.dashboard.assetsDir}/assets/images/design-space/template2.jpg`, name: 'Cozy Bedroom' },
  { url: `${CONFIG.dashboard.assetsDir}/assets/images/design-space/template6.jpg`, name: 'Kitchen Design' },
  { url: `${CONFIG.dashboard.assetsDir}/assets/images/design-space/template5.jpg`, name: 'Office Space' },
];

const reorderArray = <T,>(array: T[], fromIndex: number, toIndex: number) => {
  const next = [...array];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

export function DesignSpaceForm({ currentArea }: Props) {
  const { user } = useAuthContext();
  const defaultValues = useMemo(
    () => ({
      images: [],
      rooms: currentArea?.rooms || '',
      effects: currentArea?.effects || '',
      designType: currentArea?.designType || DEFAULT_DESIGN_SPACE_TYPE,
    }),
    [currentArea]
  );

  const methods = useForm<DesignSpaceSchemaType>({
    mode: 'all',
    resolver: zodResolver(DesignSpaceSchema),
    defaultValues,
  });

  const {
    watch,
    reset,
    setValue,
    getValues,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const [existingImageKeys, setExistingImageKeys] = useState<string[]>([]);
  const [previewUrlMap, setPreviewUrlMap] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const values = watch();
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  // Helper function to add uploaded images to the gallery
  const addUploadedImages = useCallback(
    (uploadedKeys: string[], uploadedUrls: string[]) => {
      setExistingImageKeys((prev) => {
        const newKeys = uploadedKeys.filter((key) => !prev.includes(key));
        return [...prev, ...newKeys];
      });
      setPreviewUrlMap((prev) => {
        const next = { ...prev };
        uploadedKeys.forEach((key, idx) => {
          if (!next[key]) { // Only set if not already present
            next[key] = uploadedUrls[idx];
          }
        });
        return next;
      });

      const currentImages = getValues('images') || [];
      const newUrls = uploadedUrls.filter((url) => !currentImages.includes(url));

      setValue('images',  [...currentImages, ...newUrls], {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [setValue, getValues]
  );

  // Helper function to add a template image to the gallery
  const addTemplateImage = useCallback(
    (templateUrl: string) => {
      const publicKey = `public:${templateUrl}`;
      setExistingImageKeys((prev) => {
        if (!prev.includes(publicKey)) {
          return [...prev, publicKey];
        }
        return prev;
      });
      setPreviewUrlMap((prev) => {
        if (!prev[publicKey]) {
          return { ...prev, [publicKey]: templateUrl };
        }
        return prev;
      });

      const currentImages = getValues('images') || [];
      if (!currentImages.includes(templateUrl)) {
        setValue('images', [...currentImages, templateUrl], {
          shouldDirty: true,
          shouldValidate: true,
        });
      } else {
        toast.info('This template image is already added to the gallery.');
      }
    },
    [setValue]
  );

  // Reset form fields when currentArea changes (after data is fetched)
  useEffect(() => {
    reset({
      images: [],
      rooms: currentArea?.rooms || '',
      effects: currentArea?.effects || '',
      designType: currentArea?.designType || DEFAULT_DESIGN_SPACE_TYPE,
    });
  }, [currentArea, reset]);

  // Load preview URLs for existing background image keys and set form images
  useEffect(() => {
    let mounted = true;

    const loadPreviews = async () => {
      if (!currentArea?.background) {
        setExistingImageKeys([]);
        setPreviewUrlMap({});
        setValue('images', []);
        return;
      }

      let keys: string[] = [];
      try {
        keys = JSON.parse(currentArea.background) as string[];
      } catch (err) {
        keys = [];
      }

      setExistingImageKeys(keys);

      const map: Record<string, string> = {};
      const urls: string[] = [];

      // Fetch all preview URLs in parallel (avoid loops and await-in-loop)
      const fetches = await Promise.all(
        keys.map(async (key) => {
          if (key.startsWith('public:')) {
            // For public keys, the URL is the key without "public:" prefix
            return { key, url: key.substring(7) };
          }
          try {
            const res = await axiosInstance.get(endpoints.upload.image, { params: { key } });
            return { key, url: (res.data?.url as string) || '' };
          } catch (error) {
            console.error('Failed to fetch preview for', key, error);
            return { key, url: '' };
          }
        })
      );

      fetches.forEach(({ key, url }, index) => {
        if (url && mounted) {
          map[key] = url;
          urls.push(url);
          if (index === 0) setPreviewSrc(url);
        }
      });

      if (!mounted) return;

       // Store preview URLs in form so Upload component shows thumbnails
      setPreviewUrlMap(map);
      setValue('images', urls);
    };

    loadPreviews();

    return () => {
      mounted = false;
    };
  }, [currentArea, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      // Start with the existing keys (those not removed by user)
      const finalKeys: string[] = [...existingImageKeys];

      // const finalKeys: string[] = [];

      // // Map images back to keys
      // (values.images || []).forEach((img) => {
      //   if (typeof img === 'string') {
      //     // Find if it's an uploaded image
      //     const foundKey = Object.keys(previewUrlMap).find((k) => previewUrlMap[k] === img);
      //     if (foundKey) {
      //       finalKeys.push(foundKey);
      //     } else if (img.startsWith('https://')) {
      //       // Assume it's a template or public URL
      //       finalKeys.push(`public:${img}`);
      //     }
      //   }
      // });

      // Persist the design space background as JSON array of keys
      const backgroundData = JSON.stringify(finalKeys);
      const designSpaceRes = await axiosInstance.post(endpoints.designSpace.root, {
        background: backgroundData,
        rooms: data.rooms || null,
        effects: data.effects || null,
        designType: data.designType,
        customerId: user?.id,
      });

      if (designSpaceRes.status === 200) {
        toast.success('Design space saved successfully!');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong while saving design space.');
    }
  });

  const handleRemoveGalleryFile = useCallback(
    (inputFile: File | string) => {
      // If removing a preview URL (existing image), drop the corresponding key
      if (typeof inputFile === 'string') {
        const foundKey = Object.keys(previewUrlMap).find((k) => previewUrlMap[k] === inputFile);
        if (foundKey) {
          setExistingImageKeys((prev) => prev.filter((k) => k !== foundKey));
          setPreviewUrlMap((prev) => {
            const next = { ...prev };
            delete next[foundKey];
            return next;
          });
        }
        // Also remove the URL from values.images (form state)
        const filtered = values.images && values.images.filter((img) => img !== inputFile);
        setValue('images', filtered);
      }

      // Remove new file (File object) from values.images
      if (inputFile instanceof File) {
        const filtered = values.images && values.images.filter((file) => file !== inputFile);
        setValue('images', filtered);
      }
    },
    [setValue, values.images, previewUrlMap]
  );

  const handleRemoveGalleryAllFiles = useCallback(() => {
    // Clear existing images
    setExistingImageKeys([]);
    setPreviewUrlMap({});
    // Keep only the structure, but clear new files
    setValue('images', [], { shouldValidate: true });
  }, [setValue]);

  const handleReorderGalleryImage = useCallback(
    (fromIndex: number, toIndex: number) => {
      const currentImages = (getValues('images') || []) as Array<File | string>;

      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= currentImages.length ||
        toIndex >= currentImages.length
      ) {
        return;
      }

      const reorderedImages = reorderArray(currentImages, fromIndex, toIndex);

      setValue('images', reorderedImages, {
        shouldDirty: true,
        shouldValidate: true,
      });

      const orderedUrls = reorderedImages.filter((item): item is string => typeof item === 'string');

      const orderedKeys = orderedUrls
        .map((url) => Object.keys(previewUrlMap).find((key) => previewUrlMap[key] === url))
        .filter((key): key is string => Boolean(key));

      const remainingKeys = existingImageKeys.filter((key) => !orderedKeys.includes(key));
      setExistingImageKeys([...orderedKeys, ...remainingKeys]);
    },
    [existingImageKeys, getValues, previewUrlMap, setValue]
  );

  const handleUploadImages = useCallback(async () => {
    try {
      if (pendingFiles.length === 0) {
        toast.warning('No files to upload');
        return;
      }

      // Create FormData with all files for batch upload
      const formData = new FormData();
      const uploadKeys: string[] = [];

      pendingFiles.forEach((file, index) => {
        const imageKey = `design-space/${user?.id || 'anonymous'}/${uuidv4()}`;
        formData.append(`files[${index}]`, file);
        formData.append(`keys[${index}]`, imageKey);
        uploadKeys.push(imageKey);
      });

      // Upload all files at once with public=true parameter
      const uploadRes = await axiosInstance.post(`${endpoints.upload.image}?public=false`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadData = uploadRes.data as { results?: Array<{ key?: string; url?: string }> };
      const results = uploadData.results || [];
      const uploadedUrls = results
        .filter((result) => result.url)
        .map((result) => result.url as string);

      const uploadedKeys = results
        .filter((result) => result.key)
        .map((result) => result.key as string);

      // Add uploaded URLs to the form images and register keys for existing images
      if (uploadedUrls.length > 0) {
        addUploadedImages(uploadedKeys, uploadedUrls);

        // If no preview is set yet, use the first uploaded URL
        if (!previewSrc && uploadedUrls.length > 0) {
          setPreviewSrc(uploadedUrls[0]);
        }

        setPendingFiles([]);
        toast.success(`${uploadedUrls.length} image(s) uploaded successfully!`);
      } else {
        toast.error('Failed to upload images');
      }
    } catch (error) {
      console.error('Failed to upload images:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload images');
    }
  }, [pendingFiles, user?.id, values.images, setValue]);

  const selectedDesignType = normalizeDesignSpaceType(values.designType);
  const designCategoryPreviewSrc = getDesignCategoryImageUrl(selectedDesignType);
  const designTypeTheme = getDesignSpaceTheme(selectedDesignType);

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Stack spacing={5} sx={{ mx: 'auto', maxWidth: { xs: 720, xl: 880 } }}>
        <Card>
          <CardHeader
              title="Background Images"
              subheader="Showcase multiple images of your space..."
              sx={{ mb: 3 }}
            />
            <Divider />
          {/* Image gallery preview card (moved to separate component) */}
          <ImageGallery
            images={values.images || []}
            previewSrc={previewSrc}
            setPreviewSrc={setPreviewSrc}
            onRemoveGalleryFile={handleRemoveGalleryFile}
            onReorderGalleryImage={handleReorderGalleryImage}
          />
        
          <Divider />
          <Box sx={{ p: 3, display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
            <Box sx={{ width: { xs: 1, md: '45%' }, spacing: 1.5 }}>
              <Typography variant="subtitle1">Add Images</Typography>
              <Upload
                multiple
                thumbnail
                maxSize={3145728}
                value={pendingFiles}
                onRemove={(file) => {
                  setPendingFiles((prev) => prev.filter((f) => f !== file));
                }}
                onRemoveAll={() => {
                  setPendingFiles([]);
                }}
                onDrop={(acceptedFiles) => {
                  setPendingFiles((prev) => [...prev, ...acceptedFiles]);
                }}
                onUpload={() => {
                  handleUploadImages();
                }}
              />
            </Box>

            <Box sx={{ width: { xs: 1, md: '55%' }, spacing: 1.5, ml: { xs: 0, md: 1 } }}>
              <Typography variant="subtitle1">Template Images</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2,  p:2 }}>
                {templateImages.map((template) => (
                  <Box key={template.url} sx={{ textAlign: 'center', width: { xs: 100, sm: 120 } }}>
                    <Image 
                      alt={template.name}
                      src={template.url}
                      style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, boxSizing: 'border-box', cursor: 'pointer' }}
                    />
                    <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                      {template.name}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        addTemplateImage(template.url);
                      }}
                      sx={{ mt: 1 }}
                    >
                      Add
                    </Button>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          <Divider />

          <Stack spacing={3} sx={{ p: 3 }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1">Rooms Description</Typography>
              <Field.Text name="rooms" placeholder="Describe the rooms in your design space..." />
            </Stack>

            <Stack spacing={1.5}>
              <Typography variant="subtitle1">Effects</Typography>
              <Field.Text name="effects" placeholder="Describe special effects or features..." />
            </Stack>
          </Stack>
        </Card>
        
        <Card>
          <CardHeader
            title="My Space"
            subheader="Choose a mood for your universe home page — blogs, albums, bookshelf, and more."
            sx={{ mb: 3 }}
          />
          <Divider />
          <Stack spacing={2.5} sx={{ p: 3 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle1">Design category</Typography>
              <ToggleButtonGroup
                exclusive
                value={selectedDesignType}
                onChange={(_event, value: DesignSpaceType | null) => {
                  if (value) {
                    setValue('designType', value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }
                }}
                size="small"
                sx={{
                  width: 1,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1,
                  '& .MuiToggleButtonGroup-grouped': {
                    m: 0,
                    border: '1px solid !important',
                    borderRadius: '8px !important',
                  },
                  '& .MuiToggleButton-root': {
                    textTransform: 'none',
                    whiteSpace: 'normal',
                    lineHeight: 1.35,
                    py: 1,
                    px: 1,
                    alignItems: 'stretch',
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                      border: (theme) => `3px solid ${theme.palette.error.main} !important`,
                      zIndex: 1,
                    },
                  },
                }}
              >
                {DESIGN_SPACE_TYPE_OPTIONS.map((option) => {
                  const isSelected = option.value === selectedDesignType;

                  return (
                  <ToggleButton
                    key={option.value}
                    value={option.value}
                    sx={{
                      ...(isSelected
                        ? {
                            border: (theme) => `2px solid ${theme.palette.error.main} !important`,
                            zIndex: 1,
                          }
                        : {}),
                    }}
                  >
                    <Stack spacing={0.75} sx={{ width: 1, textAlign: 'left' }}>
                      <Box
                        component="img"
                        src={getDesignCategoryImageUrl(option.value)}
                        alt=""
                        sx={{
                          width: 1,
                          height: 72,
                          objectFit: 'cover',
                          borderRadius: 1,
                          display: 'block',
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.9rem',
                          fontWeight: isSelected ? 700 : 500,
                          lineHeight: 1.35,
                        }}
                      >
                        {option.label}
                      </Typography>
                    </Stack>
                  </ToggleButton>
                  );
                })}
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary">
                {getDesignSpaceTypeDescription(selectedDesignType)}
              </Typography>
            </Stack>

            <Box
              sx={{
                position: 'relative',
                overflow: 'hidden',
                width: '100%',
                maxWidth: { xs: 1, sm: 520 },
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: designTypeTheme.border,
                bgcolor: designTypeTheme.pageBg,
                color: designTypeTheme.textPrimary,
              }}
            >
              <Box
                component="img"
                alt={`${getDesignSpaceTypeDescription(selectedDesignType)} preview`}
                src={designCategoryPreviewSrc}
                sx={{
                  width: 1,
                  height: 'auto',
                  display: 'block',
                }}
              />
            </Box>
          </Stack>
        </Card>

        <Box display="flex" alignItems="center" flexWrap="wrap" justifyContent={{ xs: 'stretch', sm: 'flex-end' }}>
          <LoadingButton
            type="submit"
            variant="contained"
            size="large"
            loading={isSubmitting}
            sx={{ width: { xs: 1, sm: 'auto' }, ml: { xs: 0, sm: 2 } }}
          >
            Save changes
          </LoadingButton>
        </Box>
      </Stack>
    </Form>
  );
}

