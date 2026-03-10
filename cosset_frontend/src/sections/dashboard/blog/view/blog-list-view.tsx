'use client';

import type { IBlogItem } from 'src/types/blog';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';
import { useGetBlogs } from 'src/actions/blog';
import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import {
  BLOG_CATEGORY_OPTIONS,
  getBlogCategoryLabel,
} from 'src/sections/dashboard/blog/blog-categories';

import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

// ----------------------------------------------------------------------

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

const getSummary = (blog: IBlogItem) => {
  const source = blog.description || blog.content || '';
  const text = source.trim();

  if (!text) {
    return 'No description yet.';
  }

  return text.length > 180 ? `${text.slice(0, 180)}...` : text;
};

export function BlogListView() {
  const { user } = useAuthContext();
  const { blogs, blogsLoading } = useGetBlogs(user?.id);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const normalizedQuery = query.trim().toLowerCase();

  const filteredBlogs = useMemo(
    () =>
      blogs.filter((blog) => {
        const matchesCategory =
          categoryFilter === 'all' || String(blog.category ?? '') === categoryFilter;

        const searchableText = [blog.title, blog.description, blog.content]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchesQuery =
          !normalizedQuery
          || searchableText.includes(normalizedQuery)
          || String(blog.id).includes(normalizedQuery);

        return matchesCategory && matchesQuery;
      }),
    [blogs, categoryFilter, normalizedQuery]
  );

  const isFiltering = !!normalizedQuery || categoryFilter !== 'all';

  const renderLoading = (
    <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
      <CircularProgress />
    </Box>
  );

  const renderEmpty = (
    <EmptyContent
      title={isFiltering ? 'No matching blog posts' : 'No blog posts'}
      filled
      sx={{ py: 10 }}
    />
  );

  const renderFilters = (
    <Stack
      spacing={2}
      direction={{ xs: 'column', md: 'row' }}
      alignItems={{ xs: 'stretch', md: 'center' }}
      sx={{ mb: { xs: 3, md: 4 } }}
    >
      <TextField
        fullWidth
        placeholder="Search title, description, or content..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
      />

      <TextField
        select
        label="Category"
        value={categoryFilter}
        onChange={(event) => setCategoryFilter(event.target.value)}
        sx={{ minWidth: { xs: 200, md: 450 } }}
      >
        <MenuItem value="all">All Categories</MenuItem>
        {BLOG_CATEGORY_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={String(option.value)}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );

  const renderList = (
    <Stack spacing={2.5}>
      {filteredBlogs.map((blog) => (
        <Card key={blog.id} sx={{ p: 2.5 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Typography variant="h6">{blog.title || `Untitled Post #${blog.id}`}</Typography>
              <Typography variant="body2">{getBlogCategoryLabel(blog.category)} </Typography>
              <Chip
                size="small"
                color={blog.isPublic === 1 ? 'success' : 'default'}
                label={blog.isPublic === 1 ? 'Public' : 'Private'}
              />
            </Stack>

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Views: {blog.totalViews ?? 0} | Following:{' '}
                {blog.following ?? 0} | Created: {formatDate(blog.createdAt)}
            </Typography>

            <Divider />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {getSummary(blog)}
              </Typography>              

              <Button
                component={RouterLink}
                href={paths.dashboard.blog.details(blog.id)}
                size="small"
                variant="outlined"
              >
                View Post
              </Button>
            </Stack>
          </Stack>
        </Card>
      ))}
    </Stack>
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="My Blog Posts"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Blogs' },
        ]}
        action={
          <Button component={RouterLink} href={paths.dashboard.blog.new} variant="contained">
            New Blog Post
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {!blogsLoading && blogs.length > 0 && renderFilters}

      {!blogsLoading && blogs.length > 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
          Showing {filteredBlogs.length} of {blogs.length} posts
        </Typography>
      )}

      {blogsLoading ? renderLoading : filteredBlogs.length ? renderList : renderEmpty}
    </DashboardContent>
  );
}
