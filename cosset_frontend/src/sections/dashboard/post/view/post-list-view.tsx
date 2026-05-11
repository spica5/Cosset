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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';
import { useGetPosts } from 'src/actions/post';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { PostItemForm } from '../post-item-form';

// ----------------------------------------------------------------------

type OrderByValue = 'newest' | 'oldest' | 'mostViewed' | 'mostFollowing';
type ViewMode = 'all' | 'mine';

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
  const { user } = useAuthContext();
  const { posts, postsLoading, refreshPosts } = useGetPosts();
  const [query, setQuery] = useState('');
  const [authorQuery, setAuthorQuery] = useState('');
  const [orderBy, setOrderBy] = useState<OrderByValue>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  useEffect(() => {
    refreshPosts();
  }, [refreshPosts]);

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedAuthorQuery = viewMode === 'mine' ? '' : authorQuery.trim().toLowerCase();

  const myPosts = useMemo(
    () => posts.filter((post) => String(post.customerId || '') === String(user?.id || '')),
    [posts, user?.id],
  );

  const postsToFilter = viewMode === 'mine' ? myPosts : posts;

  const filteredPosts = useMemo(
    () => {
      const matchedPosts = postsToFilter.filter((post) => {
        const searchableText = [
          post.title,
          post.description,
          post.content,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const authorText = [
          post.customerFirstName,
          post.customerLastName,
          post.customerDisplayName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchesQuery =
          !normalizedQuery ||
          searchableText.includes(normalizedQuery) ||
          String(post.id).includes(normalizedQuery);

        const matchesAuthorQuery = !normalizedAuthorQuery || authorText.includes(normalizedAuthorQuery);

        return matchesQuery && matchesAuthorQuery;
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
    [postsToFilter, normalizedQuery, normalizedAuthorQuery, orderBy],
  );

  const isFiltering = !!normalizedQuery || !!normalizedAuthorQuery;

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
      {viewMode === 'all' && (
        <TextField
          fullWidth
          placeholder="Search by author name..."
          value={authorQuery}
          onChange={(event) => setAuthorQuery(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:person-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      )}

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
        sx={{ minWidth: { xs: 160, md: 240 } }}
      >
        <MenuItem value="newest">Newest first</MenuItem>
        <MenuItem value="oldest">Oldest first</MenuItem>
        <MenuItem value="mostViewed">Most viewed</MenuItem>
        <MenuItem value="mostFollowing">Most following</MenuItem>
      </TextField>
    </Stack>
  );

  const totalCount = postsToFilter.length;

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
        heading={viewMode === 'mine' ? 'My Posts' : 'Community Posts'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Community' },
          { name: viewMode === 'mine' ? 'My Posts' : 'Posts' },
        ]}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <ToggleButtonGroup
              exclusive
              size="small"
              value={viewMode}
              onChange={(_event, value) => {
                if (value) setViewMode(value);
              }}
              color="primary"
            >
              <ToggleButton value="all">Community Posts</ToggleButton>
              <ToggleButton value="mine" disabled={!user}>
                My Posts
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              component={RouterLink}
              href={paths.dashboard.community.post.new}
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
            >
              New Post
            </Button>
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {!postsLoading && totalCount > 0 && renderFilters}

      {!postsLoading && totalCount > 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block' }}>
          Showing {filteredPosts.length} of {totalCount} posts
        </Typography>
      )}

      {postsLoading ? renderLoading : filteredPosts.length ? renderList : renderEmpty}
    </DashboardContent>
  );
}
