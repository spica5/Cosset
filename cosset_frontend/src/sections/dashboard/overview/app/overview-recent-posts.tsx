'use client';

import type { IPostItem } from 'src/types/post';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fNumber } from 'src/utils/format-number';
import { getS3SignedUrl } from 'src/utils/helper';

import { useGetPosts } from 'src/actions/post';

import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';

// ----------------------------------------------------------------------

const RECENT_POST_LIMIT = 5;

const getCreatedAtTime = (value: IPostItem['createdAt']) => {
  if (!value) return 0;
  const time = new Date(value as string | number | Date).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const formatDate = (value: IPostItem['createdAt']) => {
  if (!value) return '—';
  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString();
};

const getAuthorName = (post: IPostItem) =>
  post.customerDisplayName ||
  `${post.customerFirstName || ''} ${post.customerLastName || ''}`.trim() ||
  post.customerEmail ||
  'Community member';

const getPostPreview = (post: IPostItem) => {
  const raw = (post.title || post.description || post.content || '').replace(/<[^>]+>/g, ' ').trim();
  if (!raw) return 'No preview available.';
  return raw.length > 120 ? `${raw.slice(0, 117)}...` : raw;
};

function PostAuthorAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    const raw = String(avatarUrl || '').trim();

    if (!raw) {
      setSrc('');
      return undefined;
    }

    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('/') ||
      raw.startsWith('public:') ||
      raw.startsWith('data:') ||
      raw.startsWith('blob:')
    ) {
      setSrc(raw.startsWith('public:') ? raw.replace(/^public:/, '') : raw);
      return undefined;
    }

    getS3SignedUrl(raw).then((url) => {
      if (!cancelled) setSrc(url || '');
    });

    return () => {
      cancelled = true;
    };
  }, [avatarUrl]);

  return (
    <Avatar src={src || undefined} alt={name} sx={{ width: 40, height: 40 }}>
      {name.charAt(0).toUpperCase()}
    </Avatar>
  );
}

export function OverviewRecentPosts() {
  const { posts, postsLoading } = useGetPosts(undefined, { limit: 40 });

  const recentPosts = useMemo(
    () =>
      [...posts]
        .sort((a, b) => getCreatedAtTime(b.createdAt) - getCreatedAtTime(a.createdAt))
        .slice(0, RECENT_POST_LIMIT),
    [posts],
  );

  return (
    <Card sx={{ p: { xs: 2, md: 2.5 }, height: 1 }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack spacing={0.25}>
          <Typography variant="h5">Recent posts</Typography>
          <Typography variant="body2" color="text.secondary">
            Latest community updates
          </Typography>
        </Stack>

        <Button
          component={RouterLink}
          href={paths.dashboard.community.post.list}
          size="small"
          variant="outlined"
          endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={16} />}
        >
          View all
        </Button>
      </Stack>

      {postsLoading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : recentPosts.length ? (
        <Stack spacing={1.25}>
          {recentPosts.map((post) => {
            const authorName = getAuthorName(post);

            return (
              <Box
                key={post.id}
                component={RouterLink}
                href={paths.dashboard.community.post.list}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: (theme) =>
                    theme.transitions.create(['background-color', 'border-color'], {
                      duration: theme.transitions.duration.shorter,
                    }),
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'primary.main',
                  },
                }}
              >
                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                  <PostAuthorAvatar name={authorName} avatarUrl={post.customerPhotoURL} />

                  <Stack spacing={0.35} sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle2" noWrap>
                      {post.title?.trim() || 'Untitled post'}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {getPostPreview(post)}
                    </Typography>
                    <Stack direction="row" spacing={1.5} alignItems="center" useFlexGap flexWrap="wrap">
                      <Typography variant="caption" color="text.secondary">
                        {authorName}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {formatDate(post.createdAt)}
                      </Typography>
                      <Stack direction="row" spacing={0.35} alignItems="center">
                        <Iconify icon="solar:eye-bold" width={14} sx={{ color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.disabled">
                          {fNumber(post.totalViews ?? 0)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <EmptyContent
          filled
          title="No recent posts"
          description="Community posts will appear here as people share."
          sx={{ py: 5 }}
        />
      )}
    </Card>
  );
}
