import type { IAlbumItem } from 'src/types/album';

import { z as zod } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import axiosInstance, { endpoints } from 'src/utils/axios';

import { createAlbum, updateAlbum } from 'src/actions/album';

import { toast } from 'src/components/dashboard/snackbar';
import { Form, Field, schemaHelper } from 'src/components/dashboard/hook-form';
import { Iconify } from 'src/components/dashboard/iconify';

import { useAuthContext } from 'src/auth/hooks';

import { AlbumImageUpload } from './album-image-upload';
import { AlbumImageGallery } from './album-image-gallery';

// ----------------------------------------------------------------------

export type NewAlbumSchemaType = zod.infer<typeof NewAlbumSchema>;

export const NewAlbumSchema = zod
  .object({
    id: zod.coerce.number().optional(), 
    userId: zod.string().optional(),
    title: zod.string().min(1, { message: 'Title is required!' }),
    description: schemaHelper.editor({ message: { required_error: 'Description is required!' } }),
    coverUrl: schemaHelper.file({ message: { required_error: 'Cover is required!' } }),
    openness: zod.boolean(),
    category: zod.string().optional(),
  });

// ----------------------------------------------------------------------

type Props = {
  currentAlbum?: IAlbumItem;
};

function isPublicOpenness(openness: unknown): boolean {
  if (typeof openness === 'number') return openness === 1;
  if (typeof openness === 'string') return openness === '1' || openness.toLowerCase() === 'public';
  if (typeof openness === 'boolean') return openness;
  return false;
}

function stripHtmlTags(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function AlbumNewEditForm({ currentAlbum }: Props) {
  const router = useRouter();
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [galleryRefreshKey, setGalleryRefreshKey] = useState(0);

  const { user } = useAuthContext();

  const defaultValues = useMemo(
    () => ({
      id: currentAlbum?.id ? Number(currentAlbum.id) : 0,
      userId: currentAlbum?.userId,
      title: currentAlbum?.title || '',
      description: currentAlbum?.description || '',
      coverUrl: currentAlbum?.coverUrl || null,
      openness: isPublicOpenness(currentAlbum?.openness),
      category: currentAlbum?.category || '',
      createdAt: currentAlbum?.createdAt,
      updatedAt: currentAlbum?.updatedAt,
      totalViews: currentAlbum?.totalViews || 0,
      priority: currentAlbum?.priority || 0,
    }),
    [currentAlbum]
  );

  const methods = useForm<NewAlbumSchemaType>({
    resolver: zodResolver(NewAlbumSchema),
    defaultValues,
  });

  const {
    reset,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (currentAlbum) {
      reset(defaultValues);
    }
  }, [currentAlbum, reset, defaultValues]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      // ------------------------------------------------------------------
      // 1) Upload representative picture to S3 via backend API
      // ------------------------------------------------------------------
      const coverFile = data.coverUrl;
      let uploadedCoverKey: string | undefined;

      if (coverFile instanceof File) {
        const uploadKey = `album-cover/${Date.now()}-${coverFile.name}`;

        const formData = new FormData();
        formData.append('file', coverFile);
        formData.append('key', uploadKey);

        const uploadRes = await axiosInstance.post(endpoints.upload.image, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const uploadJson = uploadRes.data as { key: string; url: string };
        uploadedCoverKey = uploadJson.key;
      } else if (!currentAlbum) {
        // Create flow still requires a new file
        toast.error('Please select a cover image to upload.');
        return;
      }

      const plainDescription = stripHtmlTags(data.description || '');

      if (!plainDescription) {
        toast.error('Description is required!');
        return;
      }

      const baseAlbumData = {
        userId: data.userId || user?.id || '',
        title: data.title,
        description: plainDescription,
        openness: (data.openness ? 1 : 0) as unknown as IAlbumItem['openness'],
        category: data.category || '',
      };

      if (currentAlbum) {
        const albumUpdateData: Partial<IAlbumItem> = {
          ...baseAlbumData,
        };

        if (uploadedCoverKey) {
          albumUpdateData.coverUrl = uploadedCoverKey;
        }

        await updateAlbum(currentAlbum.id, albumUpdateData);
      } else {
        await createAlbum({
          ...baseAlbumData,
          coverUrl: uploadedCoverKey || '',
        } as IAlbumItem);
      }

      reset();
      toast.success(currentAlbum ? 'Update success!' : 'Create success!');
      router.push(paths.dashboard.album.root);
    } catch (error) {
      console.error(error);
      toast.error(currentAlbum ? 'Failed to update album' : 'Failed to create album');
    }
  }, (errors) => {
    console.log("Submit blocked by validation:", errors);
  });

  const handleRemoveFile = useCallback(() => {
    setValue('coverUrl', null);
  }, [setValue]);

  const handleGalleryRefresh = useCallback(() => {
    setGalleryRefreshKey((prev) => prev + 1);
  }, []);

  const renderDetails = (
    <Card>
      <CardHeader title="Album Details" subheader="Title, short description, image..." sx={{ mb: 3 }} />

      <Divider />

      <Stack spacing={3} sx={{ p: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Cover</Typography>
          <Field.Upload name="coverUrl" maxSize={3145728} onDelete={handleRemoveFile} />
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Title</Typography>
          <Field.Text name="title" placeholder="Adventure Seekers Expedition..." />
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Description</Typography>
          <Field.Editor name="description" sx={{ maxHeight: 480 }} />
        </Stack>
      </Stack>
    </Card>
  );

  const renderGallery = currentAlbum?.id ? (
    <Card>
      <CardHeader
        title="Photo Gallery"
        subheader="Upload and manage album photos..."
        sx={{ mb: 3 }}
        action={
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:upload-bold" />}
            onClick={() => setOpenUploadDialog(true)}
          >
            Add Photos
          </Button>
        }
      />

      <Divider />

      <Box sx={{ p: 3 }}>
        <AlbumImageGallery
          albumId={String(currentAlbum.id)}
          refreshKey={galleryRefreshKey}
          onRefresh={handleGalleryRefresh}
        />
      </Box>
    </Card>
  ) : null;

  const renderActions = (
    <Stack direction="row" alignItems="center" flexWrap="wrap">
      
      <Controller
      name="openness"
      control={methods.control}
      render={({ field }) => (
        <FormControlLabel
          label="Public"
          sx={{ flexGrow: 1, pl: 3 }}
          control={
            <Switch
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              inputRef={field.ref}
              inputProps={{ id: "openness-switch" }}
            />
          }
        />
      )}
      />
    
      <LoadingButton
        type="submit"
        variant="contained"
        size="large"
        loading={isSubmitting}
        sx={{ ml: 2 }}
      >
        {!currentAlbum ? 'Create' : 'Save changes'}
      </LoadingButton>
    </Stack>
  );

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Stack spacing={{ xs: 3, md: 5 }} sx={{ mx: 'auto', maxWidth: { xs: 720, xl: 880 } }}>
        {renderDetails}

        {renderGallery}

        {renderActions}
      </Stack>

      {currentAlbum?.id ? (
        <Dialog open={openUploadDialog} onClose={() => setOpenUploadDialog(false)} maxWidth="sm" fullWidth>
          <AlbumImageUpload
            albumId={String(currentAlbum.id)}
            onUploadSuccess={() => {
              setOpenUploadDialog(false);
              handleGalleryRefresh();
            }}
          />
        </Dialog>
      ) : null}
    </Form>
  );
}