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

import { uuidv4 } from 'src/utils/uuidv4';
import axiosInstance, { endpoints } from 'src/utils/axios';

import { Image } from 'src/components/dashboard/image';
import { Upload } from 'src/components/dashboard/upload';
import { toast } from 'src/components/dashboard/snackbar';
import { Form, Field, schemaHelper } from 'src/components/dashboard/hook-form';

import { useAuthContext } from 'src/auth/hooks';

import ImageGallery from './image-gallery';

// ----------------------------------------------------------------------

export const DesignSpaceSchema = zod.object({
  // For design space, require at least some images
  images: schemaHelper.files({ message: { required_error: 'Images is required!' } }),
  rooms: zod.string().optional(),
  effects: zod.string().optional(),
});

export type DesignSpaceSchemaType = zod.infer<typeof DesignSpaceSchema>;

// ----------------------------------------------------------------------

type Props = {
  currentArea?: IDesignSpaceItem;
};

// Template images for design space
const templateImages = [
  { url: `${CONFIG.dashboard.assetsDir}/assets/images/design-space/template1.jpg`, name: 'Modern Living Room1' },
  { url: `${CONFIG.dashboard.assetsDir}/assets/images/design-space/template4.jpg`, name: 'Modern Living Room2' },
  { url: `${CONFIG.dashboard.assetsDir}/assets/images/design-space/template3.jpg`, name: 'Classical Living Room' },
  { url: `${CONFIG.dashboard.assetsDir}/assets/images/design-space/template2.jpg`, name: 'Cozy Bedroom' },
  { url: `${CONFIG.dashboard.assetsDir}/assets/images/design-space/template6.jpg`, name: 'Kitchen Design' },
  { url: `${CONFIG.dashboard.assetsDir}/assets/images/design-space/template5.jpg`, name: 'Office Space' },
];

export function DesignSpaceForm({ currentArea }: Props) {
  const { user } = useAuthContext();
  const defaultValues = useMemo(
    () => ({
      images: [],
      rooms: currentArea?.rooms || '',
      effects: currentArea?.effects || '',
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
          />
        
          <Divider />
          <Box sx={{ p: 3, display: 'flex', gap: 3 }}>
            <Box sx={{ width: "50%", spacing: 1.5 }}>
              <Typography variant="subtitle2">Add Images</Typography>
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

            <Box sx={{ width: "50%", spacing: 1.5 }}>
              <Typography variant="subtitle2">Template Images</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2,  p:2 }}>
                {templateImages.map((template) => (
                  <Box key={template.url} sx={{ textAlign: 'center', width: 110 }}>
                    <Image 
                      alt={template.name}
                      src={template.url}
                      style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, boxSizing: 'border-box', cursor: 'pointer' }}
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
              <Typography variant="subtitle2">Rooms Description</Typography>
              <Field.Text name="rooms" placeholder="Describe the rooms in your design space..." />
            </Stack>

            <Stack spacing={1.5}>
              <Typography variant="subtitle2">Effects</Typography>
              <Field.Text name="effects" placeholder="Describe special effects or features..." />
            </Stack>
          </Stack>
        </Card>
        
        <Card>
          <CardHeader
            title="Design Space"
            subheader="Add multiple images to your space..."
            sx={{ mb: 3 }}
          />
          <Divider />
        </Card>

        <Box display="flex" alignItems="center" flexWrap="wrap" justifyContent="flex-end">
          <div>
            <LoadingButton
              type="submit"
              variant="contained"
              size="large"
              loading={isSubmitting}
              sx={{ ml: 2 }}
            >
              Save changes
            </LoadingButton>
          </div>
        </Box>
      </Stack>
    </Form>
  );
}

