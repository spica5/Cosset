'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useGetBlog } from 'src/actions/blog';
import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import { getBlogCategoryLabel } from 'src/sections/dashboard/blog/blog-categories';

import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';
import { Iconify } from 'src/components/universe/iconify/iconify';

// ----------------------------------------------------------------------

type Props = {
  blogId: string | number;
};

const formatDate = (value: unknown) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString();
};

export function BlogDetailsView({ blogId }: Props) {
  const { blog, blogLoading } = useGetBlog(blogId);

  if (blogLoading) {
    return (
      <DashboardContent>
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (!blog) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Blog Post"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Blogs', href: paths.dashboard.blog.list },
            { name: 'Details' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <EmptyContent title="Blog post not found" filled sx={{ py: 10 }} />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        // heading={blog.title || `Blog #${blog.id}`}
        heading="Blog Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Blogs', href: paths.dashboard.blog.list },
          { name: 'Details' },
        ]}
        action={
          <Stack direction="row" spacing={1.5}>
            <Button component={RouterLink} href={paths.dashboard.blog.list} variant="outlined">
              Back to List
            </Button>
            <Button component={RouterLink} href={paths.dashboard.blog.new} variant="contained">
              New Post
            </Button>
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
            <Typography variant="h4">{blog.title || `Blog #${blog.id}`}</Typography>
            
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ typography: 'body2' }}>
              <Iconify icon="solar:eye-bold" sx={{ color: 'info.main' }} />
              {blog?.totalViews} views
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ typography: 'body2' }}>
              <Iconify icon="solar:star-bold" sx={{ color: 'warning.main' }} />
              {blog?.following} following
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ typography: 'body2' }}>
              <Iconify icon="solar:flag-bold" sx={{ color: 'info.main' }} />
              {formatDate(blog?.createdAt)}
            </Stack>
            <Chip
              size="small"
              color={blog.isPublic === 1 ? 'success' : 'default'}
              label={blog.isPublic === 1 ? 'Public' : 'Private'}
            />
          </Stack>

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Category: {getBlogCategoryLabel(blog.category)} 
          </Typography>

          <Divider />

          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.5,
              p: 2,
            }}
          >
            {/* <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Content
            </Typography> */}
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {blog.content || 'No content yet.'}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              File
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', wordBreak: 'break-all' }}>
              {blog.file || 'No file attached.'}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Comments
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
              {blog.comments || 'No comments.'}
            </Typography>
          </Box>
        </Stack>
      </Card>
    </DashboardContent>
  );
}
