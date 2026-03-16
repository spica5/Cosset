'use client';

import type { IBlogItem } from 'src/types/blog';

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
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
import { deleteBlog, useGetBlogs } from 'src/actions/blog';
import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import {
  BLOG_CATEGORY_OPTIONS,
  getBlogCategoryLabel,
} from 'src/sections/dashboard/blog/blog-categories';
import {
  getBlogContentAppearance,
  getBlogContentBackgroundSx,
  getBlogContentFontSx,
  isBlogContentBackgroundPreset,
  isBlogContentFontPreset,
} from 'src/sections/dashboard/blog/blog-content-style';

import { Label } from 'src/components/dashboard/label';
import { Iconify } from 'src/components/dashboard/iconify';
import { toast } from 'src/components/dashboard/snackbar';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

// ----------------------------------------------------------------------

const CONTENT_PREVIEW_LENGTH = 100;
const TITLE_PREVIEW_LENGTH = 80;

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

const getContent = (blog: IBlogItem) => {
  const source = blog.content || '';
  const text = source.trim();

  if (!text) {
    return 'No content yet.';
  }

  return text;
};

const getTitle = (blog: IBlogItem) => {
  const title = (blog.title || `Untitled Post #${blog.id}`).trim();

  if (title.length <= TITLE_PREVIEW_LENGTH) {
    return title;
  }

  return `${title.slice(0, TITLE_PREVIEW_LENGTH)}...`;
};

const getContentLineCount = (content: string) => content.split(/\r?\n/).length;

const hasCollapsedOverflow = (node: HTMLParagraphElement, content: string) => {
  if (typeof window === 'undefined') {
    return false;
  }

  const width = node.clientWidth;
  if (!width) {
    return false;
  }

  const computedStyle = window.getComputedStyle(node);
  const lineHeight = Number.parseFloat(computedStyle.lineHeight || '0');

  const clone = node.cloneNode(true) as HTMLParagraphElement;
  clone.textContent = content;
  clone.style.position = 'absolute';
  clone.style.left = '-10000px';
  clone.style.top = '0';
  clone.style.zIndex = '-1';
  clone.style.visibility = 'hidden';
  clone.style.pointerEvents = 'none';
  clone.style.width = `${width}px`;
  clone.style.height = 'auto';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.textOverflow = 'clip';
  clone.style.display = 'block';
  clone.style.whiteSpace = 'pre-line';
  clone.style.webkitLineClamp = 'unset';
  clone.style.webkitBoxOrient = 'initial';

  document.body.appendChild(clone);

  let measuredHeight = 0;
  try {
    measuredHeight = clone.scrollHeight;
  } finally {
    document.body.removeChild(clone);
  }

  if (!lineHeight || Number.isNaN(lineHeight)) {
    return measuredHeight > node.clientHeight + 1;
  }

  return measuredHeight > lineHeight * 2 + 1;
};

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
        const content = getContent(blog);
        const fallbackAppearance = getBlogContentAppearance(blog.comments);
        const contentAppearance = {
          fontPreset: isBlogContentFontPreset(blog.fontPreset)
            ? blog.fontPreset
            : fallbackAppearance.fontPreset,
          backgroundPreset: isBlogContentBackgroundPreset(blog.backgroundPreset)
            ? blog.backgroundPreset
            : fallbackAppearance.backgroundPreset,
        };
        const canExpandFromOverflow = canExpandById[String(blog.id)];
        const hasManualExtraLines = getContentLineCount(content) > 2;
        const fullTitle = (blog.title || `Untitled Post #${blog.id}`).trim();
        const title = getTitle(blog);
        const hasMoreThanPreview =
          content !== 'No content yet.'
          && !!(canExpandFromOverflow || hasManualExtraLines || content.length > CONTENT_PREVIEW_LENGTH);
        const isExpanded = !!expandedById[String(blog.id)];

        return (
          <Card key={blog.id} sx={{ p: 2.5 }}>
            <Stack spacing={1.5}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={2}
                useFlexGap
                flexWrap="wrap"
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Label variant="soft" color={blog.isPublic === 1 ? 'info' : 'default'}>
                    {blog.isPublic === 1 ? 'Public' : 'Private'}
                  </Label>

                  <Typography variant="h6" title={fullTitle}>
                    {title}
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1.25}>
                  <Box
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      {getBlogCategoryLabel(blog.category)}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={2} useFlexGap flexWrap="wrap">
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Iconify width={16} icon="eva:eye-fill" sx={{ color: 'info.main' }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Views {blog.totalViews ?? 0}
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Iconify width={16} icon="eva:people-fill" sx={{ color: 'success.main' }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Following {blog.following ?? 0}
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Iconify width={16} icon="eva:clock-outline" sx={{ color: 'warning.main' }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {formatDate(blog.createdAt)}
                  </Typography>
                </Stack>
              </Stack>

              <Divider />

              <Box
                sx={{
                  p: { xs: 1.5, md: 2 },
                  borderRadius: 1.5,
                  border: '1px solid',
                  ...getBlogContentBackgroundSx(contentAppearance.backgroundPreset),
                }}
              >
                <Typography
                  ref={(node: HTMLParagraphElement | null) => {
                    if (!node || isExpanded || content === 'No content yet.') {
                      return;
                    }

                    const key = String(blog.id);

                    window.requestAnimationFrame(() => {
                      if (!node.isConnected) {
                        return;
                      }

                      const hasOverflow = hasCollapsedOverflow(node, content);

                      setCanExpandById((prev) => {
                        if (prev[key] === hasOverflow) {
                          return prev;
                        }

                        return { ...prev, [key]: hasOverflow };
                      });
                    });
                  }}
                  variant="body2"
                  sx={{
                    color: '#3c2a1a',
                    ...getBlogContentFontSx(contentAppearance.fontPreset),
                    textIndent: '0.25em',
                    whiteSpace: isExpanded ? 'pre-wrap' : 'pre-line',
                    ...(isExpanded
                      ? null
                      : {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }),
                  }}
                >
                  {content}
                </Typography>
              </Box>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={
                    <Iconify icon={isExpanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'} />
                  }
                  disabled={!hasMoreThanPreview}
                  onClick={() => handleToggleContent(blog.id, hasMoreThanPreview)}
                >
                  {isExpanded ? 'Collapse Content' : 'Expand Content'}
                </Button>

                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    component={RouterLink}
                    href={paths.dashboard.blog.edit(blog.id)}
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<Iconify icon="eva:edit-fill" />}
                  >
                    Edit
                  </Button>

                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<Iconify icon="eva:trash-2-outline" />}
                    onClick={() => handleDelete(blog)}
                  >
                    Delete
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </Card>
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
