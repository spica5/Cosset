'use client';

import type { IPostItem } from 'src/types/post';

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

import { useGetPosts } from 'src/actions/post';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { PostItemForm } from '../post-item-form';

// ----------------------------------------------------------------------

type OrderByValue = 'newest' | 'oldest' | 'mostViewed' | 'mostFollowing';

const getCreatedAtTime = (value: IPostItem['createdAt']) => {
  if (!value) {
    return 0;
  }

  const date = new Date(value as string | number | Date);
  const time = date.getTime();

  return Number.isNaN(time) ? 0 : time;
};

// ----------------------------------------------------------------------

export function PostListView() {
  const { posts, postsLoading, refreshPosts } = useGetPosts();
  const [query, setQuery] = useState('');
  const [orderBy, setOrderBy] = useState<OrderByValue>('newest');

  useEffect(() => {
    refreshPosts();
  }, [refreshPosts]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredPosts = useMemo(
    () => {
      const matchedPosts = posts.filter((post) => {
        const searchableText = [post.title, post.description, post.content]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchesQuery =
          !normalizedQuery ||
          searchableText.includes(normalizedQuery) ||
          String(post.id).includes(normalizedQuery);

        return matchesQuery;
      });

      const sortedPosts = [...matchedPosts].sort((a, b) => {
        switch (orderBy) {
          case 'oldest':
            return getCreatedAtTime(a.createdAt) - getCreatedAtTime(b.createdAt);
          case 'mostViewed':
            return (b.totalViews ?? 0) - (a.totalViews ?? 0);
          case 'mostFollowing':
            return (b.following ?? 0) - (a.following ?? 0);
          case 'newest':
          default:
            return getCreatedAtTime(b.createdAt) - getCreatedAtTime(a.createdAt);
        }
      });

      return sortedPosts;
    },
    [posts, normalizedQuery, orderBy],
  );

  const isFiltering = !!normalizedQuery;

  const renderLoading = (
    <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
      <CircularProgress />
    </Box>
  );

  const renderEmpty = (
    <EmptyContent title={isFiltering ? 'No matching posts' : 'No posts'} filled sx={{ py: 10 }} />
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
        label="Order By"
        value={orderBy}
        onChange={(event) => setOrderBy(event.target.value as OrderByValue)}
        sx={{ minWidth: { xs: 200, md: 280 } }}
      >
        <MenuItem value="newest">Newest first</MenuItem>
        <MenuItem value="oldest">Oldest first</MenuItem>
        <MenuItem value="mostViewed">Most viewed</MenuItem>
        <MenuItem value="mostFollowing">Most following</MenuItem>
      </TextField>
    </Stack>
  );

  const renderList = (
    <Stack spacing={2.5}>
      {filteredPosts.map((post) => (
        <PostItemForm key={post.id} post={post} />
      ))}
    </Stack>
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Community Posts"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Community' },
          { name: 'Posts' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.community.post.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New Post
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {!postsLoading && posts.length > 0 && renderFilters}

      {!postsLoading && posts.length > 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
          Showing {filteredPosts.length} of {posts.length} posts
        </Typography>
      )}

      {postsLoading ? renderLoading : filteredPosts.length ? renderList : renderEmpty}
    </DashboardContent>
  );
}
