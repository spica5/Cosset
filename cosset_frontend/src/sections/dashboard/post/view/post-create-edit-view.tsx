'use client';

import type { IPostItem } from 'src/types/post';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { uuidv4 } from 'src/utils/uuidv4';
import axiosInstance, { endpoints } from 'src/utils/axios';

import { useAuthContext } from 'src/auth/hooks';
import { createPost, updatePost, useGetPost } from 'src/actions/post';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import { BLOG_CATEGORY_OPTIONS } from 'src/sections/dashboard/blog/blog-categories';

import { toast } from 'src/components/dashboard/snackbar';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { PostAuthorInfo } from '../post-author-info';
import { PostAttachmentsGallery } from '../post-attachments-gallery';

// ----------------------------------------------------------------------

type Props = {
  postId?: string | number;
};

type UploadFileType = 'image' | 'video' | 'pdf';

type PostFormValues = {
  title: string;
  category: number;
  description: string;
  content: string;
  files: string;
  isPublic: number;
  totalViews: number;
  following: number;
  comments: string;
};

const defaultValues: PostFormValues = {
  title: '',
  category: 1,
  description: '',
  content: '',
  files: '',
  isPublic: 1,
  totalViews: 0,
  following: 0,
  comments: '',
};

const uploadAcceptMap: Record<UploadFileType, string> = {
  image: 'image/*',
  video: 'video/*',
  pdf: 'application/pdf',
};

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];
const videoExtensions = ['mp4', 'mov', 'webm'];

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
      // Fall back to line/comma parsing.
    }
  }

  return raw
    .split(/[\r\n,]+/)
    .map((item) => item.trim())
    .filter((item) => !!item);
};

const stringifyStorageKeys = (keys: string[]): string => keys.join('\n');

const getUploadStorageFolder = (uploadType: UploadFileType) => {
  if (uploadType === 'image') return 'images';
  if (uploadType === 'video') return 'videos';
  return 'files';
};

const isFileAllowedForUploadType = (file: File, uploadType: UploadFileType) => {
  const mimeType = (file.type || '').toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (uploadType === 'image') {
    return mimeType.startsWith('image/') || imageExtensions.includes(ext);
  }

  if (uploadType === 'video') {
    return mimeType.startsWith('video/') || videoExtensions.includes(ext);
  }

  return mimeType === 'application/pdf' || ext === 'pdf';
};

const getCurrentCustomerName = (user: Record<string, any> | null | undefined) => {
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  return user?.displayName || fullName || user?.email || 'Customer';
};

const getPostAuthorName = (post: Partial<IPostItem>) => {
  const fullName = `${post.customerFirstName || ''} ${post.customerLastName || ''}`.trim();

  return post.customerDisplayName || fullName || post.customerEmail || post.customerId || 'Customer';
};

export function PostCreateEditView({ postId }: Props) {
  const router = useRouter();
  const { user } = useAuthContext();

  const isEditMode = Boolean(postId);

  const { post, postLoading } = useGetPost(isEditMode ? postId! : '');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PostFormValues>({ defaultValues });

  const [uploadType, setUploadType] = useState<UploadFileType>('image');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const currentUserId = String(user?.id || '');
  const ownerId = String(post?.customerId || '');
  const isOwner = !isEditMode || !post ? true : !!currentUserId && ownerId === currentUserId;
  const isReadOnly = isEditMode && !isOwner;

  const filesValue = watch('files');

  useEffect(() => {
    if (!isEditMode || !post) {
      return;
    }

    reset({
      title: post.title || '',
      category: post.category ?? 1,
      description: post.description || '',
      content: post.content || '',
      files: post.files || '',
      isPublic: post.isPublic ?? 1,
      totalViews: post.totalViews ?? 0,
      following: post.following ?? 0,
      comments: post.comments || '',
    });
  }, [isEditMode, post, reset]);

  const handleUploadTypeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextType = event.target.value as UploadFileType;
    setUploadType(nextType);
    setSelectedFile(null);
  }, []);

  const handleSelectFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);

    event.target.value = '';
  }, []);

  const appendUploadedStorageKey = useCallback(
    (key: string) => {
      const currentKeys = parseStorageKeys(getValues('files'));
      if (currentKeys.includes(key)) {
        return;
      }

      setValue('files', stringifyStorageKeys([...currentKeys, key]), { shouldDirty: true });
    },
    [getValues, setValue],
  );

  const handleUploadFile = useCallback(async () => {
    if (isReadOnly) {
      toast.error('You can only edit your own post.');
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
    const ownerSegment = String(post?.customerId || user?.id || 'guest');
    const postSegment = isEditMode ? String(postId) : 'draft';
    const key = `community-posts/${ownerSegment}/${postSegment}/${getUploadStorageFolder(uploadType)}/${uuidv4()}.${safeExt}`;

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

      appendUploadedStorageKey(uploadedKey);
      setSelectedFile(null);
      toast.success(`${uploadType.toUpperCase()} uploaded successfully.`);
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file.');
    } finally {
      setUploadingFile(false);
    }
  }, [appendUploadedStorageKey, isEditMode, isReadOnly, post?.customerId, postId, selectedFile, uploadType, user?.id]);

  const handleRemoveAttachment = useCallback(
    (keyToRemove: string) => {
      const nextKeys = parseStorageKeys(getValues('files')).filter((key) => key !== keyToRemove);

      setValue('files', stringifyStorageKeys(nextKeys), { shouldDirty: true });
    },
    [getValues, setValue],
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditMode) {
        if (!post) {
          toast.error('Post not found.');
          return;
        }

        if (!isOwner) {
          toast.error('You can only edit your own post.');
          return;
        }

        await updatePost(postId!, {
          customerId: post.customerId || user?.id || null,
          title: values.title.trim(),
          category: values.category,
          description: values.description.trim() || null,
          content: values.content.trim() || null,
          files: values.files.trim() || null,
          isPublic: values.isPublic,
          totalViews: values.totalViews,
          following: values.following,
          comments: values.comments.trim() || null,
        });

        toast.success('Post updated successfully.');
        router.push(paths.dashboard.community.post.edit(postId!));
        return;
      }

      const payload: Omit<IPostItem, 'id' | 'createdAt' | 'updatedAt'> = {
        customerId: user?.id || null,
        title: values.title.trim(),
        category: values.category,
        description: values.description.trim() || null,
        content: values.content.trim() || null,
        files: values.files.trim() || null,
        isPublic: values.isPublic,
        totalViews: values.totalViews,
        following: values.following,
        comments: values.comments.trim() || null,
      };

      const created = await createPost(payload);
      const createdPost = (created as { post?: IPostItem }).post;

      toast.success('Post created successfully.');

      if (createdPost?.id) {
        router.push(paths.dashboard.community.post.edit(createdPost.id));
      } else {
        router.push(paths.dashboard.community.post.list);
      }
    } catch (error) {
      console.error(error);
      toast.error(isEditMode ? 'Failed to update post.' : 'Failed to create post.');
    }
  });

  if (isEditMode && postLoading) {
    return (
      <DashboardContent>
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (isEditMode && !post) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Post"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Community' },
            { name: 'Posts', href: paths.dashboard.community.post.list },
            { name: 'Edit' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <EmptyContent title="Post not found" filled sx={{ py: 10 }} />
      </DashboardContent>
    );
  }

  const heading = isEditMode ? 'Edit Post' : 'Create New Post';

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={heading}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Community' },
          { name: 'Posts', href: paths.dashboard.community.post.list },
          { name: isEditMode ? 'Edit' : 'Create New Post' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3 }}>
        <Stack spacing={3} component="form" onSubmit={onSubmit}>
          <Box
            sx={{
              p: 2.5,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.neutral',
            }}
          >
            <PostAuthorInfo
              caption={isEditMode ? 'Post author' : 'Posting as'}
              name={isEditMode ? getPostAuthorName(post || {}) : getCurrentCustomerName(user)}
              email={isEditMode ? post?.customerEmail || '' : user?.email || ''}
              photoURL={isEditMode ? post?.customerPhotoURL || '' : user?.photoURL || ''}
              size={56}
            />

            <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
              {isEditMode
                ? 'Update your post content and save your changes.'
                : 'Your profile avatar and name will be shown with this post in the community feed.'}
            </Typography>
          </Box>

          {isEditMode && !isOwner ? (
            <Alert severity="warning">This post belongs to another customer and cannot be edited.</Alert>
          ) : null}

          <TextField
            label="Title"
            placeholder="Enter post title"
            InputLabelProps={{ shrink: true }}
            {...register('title', { required: 'Title is required' })}
            error={!!errors.title}
            helperText={errors.title?.message}
            disabled={isReadOnly}
          />

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            }}
          >
            <TextField
              select
              label="Category"
              InputLabelProps={{ shrink: true }}
              defaultValue={defaultValues.category}
              {...register('category', { valueAsNumber: true })}
              disabled={isReadOnly}
            >
              {BLOG_CATEGORY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Visibility"
              InputLabelProps={{ shrink: true }}
              defaultValue={defaultValues.isPublic}
              {...register('isPublic', { valueAsNumber: true })}
              sx={{ minWidth: 200 }}
              disabled={isReadOnly}
            >
              <MenuItem value={1}>Public</MenuItem>
              <MenuItem value={0}>Private</MenuItem>
            </TextField>
          </Stack>

          <TextField
            label="Description"
            placeholder="Short description"
            multiline
            minRows={2}
            InputLabelProps={{ shrink: true }}
            {...register('description')}
            disabled={isReadOnly}
          />

          <TextField
            label="Content"
            placeholder="Write your post content"
            multiline
            minRows={12}
            InputLabelProps={{ shrink: true }}
            {...register('content')}
            disabled={isReadOnly}
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
              <TextField
                select
                label="File Type"
                value={uploadType}
                onChange={handleUploadTypeChange}
                disabled={isReadOnly || uploadingFile}
              >
                <MenuItem value="image">Image</MenuItem>
                <MenuItem value="video">Video</MenuItem>
                <MenuItem value="pdf">PDF</MenuItem>
              </TextField>

              <Button component="label" variant="outlined" disabled={isReadOnly || uploadingFile}>
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
                disabled={isReadOnly || !selectedFile || uploadingFile}
              >
                {uploadingFile ? 'Uploading...' : 'Upload'}
              </Button>
            </Box>

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {selectedFile
                ? `Selected: ${selectedFile.name}`
                : `Accepted format: ${uploadAcceptMap[uploadType]}`}
            </Typography>
          </Stack>

          <input type="hidden" {...register('files')} />

          <PostAttachmentsGallery
            files={filesValue}
            heading="Attachment Preview"
            arrangeType="grid"
            itemSpacing={1.25}
            minItemWidth={120}
            imageWidth={125}
            imageHeight={100}
            videoWidth={280}
            allowRemove={!isReadOnly}
            onRemoveAttachment={!isReadOnly ? handleRemoveAttachment : undefined}
          />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              onClick={() => router.push(paths.dashboard.community.post.list)}
              color="inherit"
              variant="outlined"
            >
              Back
            </Button>
            {(!isEditMode || isOwner) && (
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                {isEditMode ? 'Save Changes' : 'Create Post'}
              </LoadingButton>
            )}
          </Stack>
        </Stack>
      </Card>
    </DashboardContent>
  );
}
