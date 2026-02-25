import type { IGuestAreaItem } from 'src/types/guestarea';

import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { useRouter } from 'src/routes/hooks';

import axiosInstance, { endpoints } from 'src/utils/axios';

import { _moods, _moodIcons } from 'src/_mock/assets';

import { toast } from 'src/components/dashboard/snackbar';
import { Form, Field, schemaHelper } from 'src/components/dashboard/hook-form';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export type NewGuestAreaSchemaType = zod.infer<typeof NewGuestAreaSchema>;

export const NewGuestAreaSchema = zod.object({
  title: zod.string().min(1, { message: 'Title is required!' }),
  motif: zod.string().min(1, { message: 'Motif is required!' }),
  mood: schemaHelper.objectOrNull<string | null>({
    message: { required_error: 'Mood is required!' },
  }),
  coverViewUrl: schemaHelper.file({ message: { required_error: 'Cover is required!' } }),
  // images: schemaHelper.files({ message: { required_error: 'Images is required!' } }),
  // Images gallery is optional; allow an empty array without validation errors
  images: zod.array(zod.custom<File | string>()).optional().default([]),
});

// ----------------------------------------------------------------------

type Props = {
  coverViewUrl?: string;
  currentArea?: IGuestAreaItem;
  onSaveSuccess?: () => void;
};

export function GuestAreaForm({ currentArea, coverViewUrl, onSaveSuccess }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();

  const defaultValues = useMemo(
    () => ({
      title: currentArea?.title || '',
      motif: currentArea?.motif || '',
      mood: currentArea?.mood || '',
      coverViewUrl: coverViewUrl || null,
      images: currentArea?.images || [],
    }),
    [currentArea, coverViewUrl]
  );

  const methods = useForm<NewGuestAreaSchemaType>({
    mode: 'all',
    resolver: zodResolver(NewGuestAreaSchema),
    defaultValues,
  });

  const {
    reset,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (currentArea) {
      reset(defaultValues);
    }
  }, [currentArea, defaultValues, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      // ------------------------------------------------------------------
      // 1) Upload representative picture to S3 via backend API
      // ------------------------------------------------------------------
      const coverFile = data.coverViewUrl;
      let coverUploadKey: string = '';
      if (coverFile instanceof File) {
        
        const uploadKey = `guest-area/${Date.now()}-${coverFile.name}`;

        const formData = new FormData();
        formData.append('file', coverFile);
        formData.append('key', uploadKey);

        const uploadRes = await axiosInstance.post(endpoints.upload.image, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const uploadJson = uploadRes.data as { key: string; url: string };

        // Update form immediately with the new signed URL so user sees the new image right away
        setValue('coverViewUrl', uploadJson.url, { shouldValidate: false });

        coverUploadKey = uploadJson.key;
      } else if (typeof coverFile === 'string') {
        coverUploadKey = currentArea?.coverUrl ?? ''; // already a string
      } else {
        coverUploadKey = '';
      }      

      // ------------------------------------------------------------------
      // 2) Persist guest area metadata (including S3 key) to backend
      // ------------------------------------------------------------------
      const saveRes = await axiosInstance.post(endpoints.guestArea.root, {
        customerId: user?.id,
        title: data.title,
        motif: data.motif,
        mood: data.mood,
        pictureUrl: coverUploadKey,
        // designSpace: can be derived from images later if needed
        designSpace: null,
      });

      // Basic validation of the save response
      const savedGuestArea = saveRes?.data?.guestArea;
      if (!savedGuestArea || !savedGuestArea.id) {
        console.error('Guest area save response invalid:', saveRes);
        toast.error('Failed to save guest area');
        return;
      }

      toast.success('Update success!');

      // Trigger refetch in parent component to get updated data (will update currentArea)
      if (onSaveSuccess) {
        // Small delay to ensure backend has processed the save
        setTimeout(() => {
          onSaveSuccess();
        }, 100);
      } else {
        // Fallback: refresh the page if no callback provided
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong while saving.');
    }
  });

  const handleRemoveFile = useCallback(() => {
    setValue('coverViewUrl', null);
  }, [setValue]);

  const renderDetails = (
    <Card>
      <CardHeader title="Representative Picture" subheader="Title, short description, image..." sx={{ mb: 3 }} />

      <Divider />

      <Stack spacing={3} sx={{ p: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Cover</Typography>
          <Field.Upload name="coverViewUrl" maxSize={3145728} onDelete={handleRemoveFile} />
        </Stack>

        <Field.Text name="title" label="Title" />

        <Field.Text name="motif" label="Motif" multiline rows={2} />

        <Stack spacing={1.5}>
          <Typography variant="subtitle2"> Mood </Typography>
          <Field.Autocomplete
            name="mood"
            autoHighlight
            options={_moods.map((option) => option)}
            getOptionLabel={(option) => `${_moodIcons[option]} ${(option ?? '').toString()}`}
            renderOption={(props, option) => (
              <li {...props} key={option}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography sx={{ mr: 1, fontSize: 20 }}>
                    {_moodIcons[option] || '😊'}
                  </Typography>
                  <Typography variant="body2">{option}</Typography>
                </Box>
              </li>
            )}
          />
        </Stack>
      </Stack>
    </Card>
  );

  const renderActions = (
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
  );

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Stack spacing={5} sx={{ mx: 'auto', maxWidth: { xs: 720, xl: 880 } }}>
        {renderDetails}

        {renderActions}
      </Stack>
    </Form>
  );
}