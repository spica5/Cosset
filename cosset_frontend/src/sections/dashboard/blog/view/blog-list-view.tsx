'use client';

import type { IBlogItem } from 'src/types/blog';

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';
import { deleteBlog, useGetBlogs } from 'src/actions/blog';
import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import {
  BLOG_CATEGORY_OPTIONS,
} from 'src/sections/dashboard/blog/blog-categories';

import { Iconify } from 'src/components/dashboard/iconify';
import { toast } from 'src/components/dashboard/snackbar';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { BlogListItem } from './blog-list-item';

// ----------------------------------------------------------------------

const TITLE_PREVIEW_LENGTH = 80;

const getContent = (blog: IBlogItem) => {
  const source = blog.content || '';
  const text = source.trim();

  if (!text) {
    return 'No content yet.';
  }

  return text;
};

const getContentLineCount = (content: string) => content.split(/\r?\n/).length;

export function BlogListView() {
  const { user } = useAuthContext();
  const { blogs, blogsLoading, refreshBlogs } = useGetBlogs(user?.id);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});
  const [canExpandById, setCanExpandById] = useState<Record<string, boolean>>({});

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

  const handleDelete = async (blog: IBlogItem) => {
    const confirmed = window.confirm(`Delete blog "${blog.title || blog.id}"?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteBlog(blog.id, blog.customerId || undefined);
      toast.success('Blog deleted successfully.');
    } catch (error) {
      console.error('Failed to delete blog:', error);
      toast.error('Failed to delete blog.');
    }
  };

  const handleToggleContent = (blogId: string | number, canToggle: boolean) => {
    if (!canToggle) {
      return;
    }

    const key = String(blogId);
    setExpandedById((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    refreshBlogs();
  }, [refreshBlogs]);

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
      {filteredBlogs.map((blog) => {
        const canExpandFromOverflow = canExpandById[String(blog.id)];
        const hasManualExtraLines = getContentLineCount(getContent(blog)) > 2;
        const isExpanded = !!expandedById[String(blog.id)];

        return (
          <BlogListItem
            key={blog.id}
            blog={blog}
            isExpanded={isExpanded}
            canExpand={canExpandFromOverflow || hasManualExtraLines}
            onToggleContent={handleToggleContent}
            onDelete={handleDelete}
          />
        );
      })}
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
          <Button
            component={RouterLink}
            href={paths.dashboard.blog.new}
            variant="contained"
            startIcon={<Iconify icon="eva:plus-fill" />}
          >
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
