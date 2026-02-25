import type { IAlbumItem } from 'src/types/album';

import { z as zod } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
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

import { useAuthContext } from 'src/auth/hooks';

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

export function AlbumNewEditForm({ currentAlbum }: Props) {
  const router = useRouter();

  const { user } = useAuthContext();

  const defaultValues = useMemo(
    () => ({
      id: currentAlbum?.id ? Number(currentAlbum.id) : 0,
      userId: currentAlbum?.userId,
      title: currentAlbum?.title || '',
      description: currentAlbum?.description || '',
      coverUrl: currentAlbum?.coverUrl || null,
      openness: currentAlbum?.openness === 'Public',
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

      if (!(coverFile instanceof File)) {
        toast.error('Please select a cover image to upload.');
        return;
      }

      const uploadKey = `album-cover/${Date.now()}-${coverFile.name}`;

      const formData = new FormData();
      formData.append('file', coverFile);
      formData.append('key', uploadKey);

      const uploadRes = await axiosInstance.post(endpoints.upload.image, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
  
      const uploadJson = uploadRes.data as { key: string; url: string };

      // Build album item with required fields
      const albumData: Omit<IAlbumItem, 'id'> & { id?: number } = {
        userId: data.userId || user?.id || '',
        title: data.title,
        description: data.description || '',
        coverUrl: uploadJson.key,
        openness: data.openness ? 'Public' : 'Private',
        category: data.category || '',
      };

      if (currentAlbum) {
        albumData.id = currentAlbum.id;
        await updateAlbum(currentAlbum.id, albumData as IAlbumItem);
      } else {
        await createAlbum(albumData as IAlbumItem);
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

  const renderGallery = (
    <Card>
      <CardHeader title="Gallery" subheader="Showcase multiple images of your space..." sx={{ mb: 3 }} />

      <Divider />

      <Stack spacing={3} sx={{ p: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Images</Typography>
          <Field.Upload
            multiple
            thumbnail
            name="images"
            maxSize={3145728}
            onRemove={(file) => {
              console.info('ON REMOVE FILE:', file);
            }}
            onRemoveAll={() => console.info('ON REMOVE ALL')}
            onUpload={() => console.info('ON UPLOAD')}
          />
        </Stack>
      </Stack>
    </Card>
  );

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

        {/* {renderGallery} */}

        {renderActions}
      </Stack>
    </Form>
  );
}