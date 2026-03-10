'use client';

import type { IBlogItem } from 'src/types/blog';

import { useForm } from 'react-hook-form';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useAuthContext } from 'src/auth/hooks';

import { createBlog } from 'src/actions/blog';
import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import { BLOG_CATEGORY_OPTIONS } from 'src/sections/dashboard/blog/blog-categories';

import { toast } from 'src/components/dashboard/snackbar';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

// ----------------------------------------------------------------------

type BlogFormValues = {
  title: string;
  category: number;
  description: string;
  content: string;
  file: string;
  isPublic: number;
  totalViews: number;
  following: number;
  comments: string;
};

const defaultValues: BlogFormValues = {
  title: '',
  category: 1,
  description: '',
  content: '',
  file: '',
  isPublic: 1,
  totalViews: 0,
  following: 0,
  comments: '',
};

export function BlogCreateView() {
  const router = useRouter();
  const { user } = useAuthContext();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BlogFormValues>({ defaultValues });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload: Omit<IBlogItem, 'id' | 'createdAt' | 'updatedAt'> = {
        customerId: user?.id || null,
        title: values.title.trim(),
        category: values.category,
        description: values.description.trim() || null,
        content: values.content.trim() || null,
        file: values.file.trim() || null,
        isPublic: values.isPublic,
        totalViews: values.totalViews,
        following: values.following,
        comments: values.comments.trim() || null,
      };

      const created = await createBlog(payload);
      const createdBlog = (created as { blog?: IBlogItem; post?: IBlogItem }).blog
        || (created as { blog?: IBlogItem; post?: IBlogItem }).post;

      toast.success('Blog post created successfully.');

      if (createdBlog?.id) {
        router.push(paths.dashboard.blog.details(createdBlog.id));
      } else {
        router.push(paths.dashboard.blog.list);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to create blog post.');
    }
  });

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Create New Blog"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Blogs', href: paths.dashboard.blog.list },
          { name: 'Create New Blog' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3 }}>
        <Stack spacing={3} component="form" onSubmit={onSubmit}>
          <TextField
            label="Title"
            placeholder="Enter blog title"
            InputLabelProps={{ shrink: true }}
            {...register('title', { required: 'Title is required' })}
            error={!!errors.title}
            helperText={errors.title?.message}
          />

          <TextField
            select
            label="Category"
            InputLabelProps={{ shrink: true }}
            defaultValue={defaultValues.category}
            {...register('category', { valueAsNumber: true })}
          >
            {BLOG_CATEGORY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Description"
            placeholder="Short description"
            multiline
            minRows={3}
            InputLabelProps={{ shrink: true }}
            {...register('description')}
          />

          <TextField
            label="Content"
            placeholder="Write your post content"
            multiline
            minRows={8}
            InputLabelProps={{ shrink: true }}
            {...register('content')}
          />

          {/* <TextField
            label="File"
            placeholder="Image key or file URL"
            InputLabelProps={{ shrink: true }}
            {...register('file')}
          /> */}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              select
              label="Visibility"
              InputLabelProps={{ shrink: true }}
              defaultValue={defaultValues.isPublic}
              {...register('isPublic', { valueAsNumber: true })}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value={1}>Public</MenuItem>
              <MenuItem value={0}>Private</MenuItem>
            </TextField>
          </Stack>

          {/* <TextField
            label="Comments"
            placeholder="Optional comments text or JSON"
            multiline
            minRows={3}
            InputLabelProps={{ shrink: true }}
            {...register('comments')}
          /> */}

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={() => router.push(paths.dashboard.blog.list)} color="inherit" variant="outlined">
              Cancel
            </Button>
            <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
              Create Blog Post
            </LoadingButton>
          </Stack>
        </Stack>
      </Card>
    </DashboardContent>
  );
}
