'use client';

import type { ReactionType } from 'src/actions/reaction';

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useGetBlog, recordBlogView } from 'src/actions/blog';
import {
  reactToBlogForLoggedInCustomer,
  unreactToBlogForLoggedInCustomer,
  useGetReactionSummary,
} from 'src/actions/reaction';
import { useAuthContext } from 'src/auth/hooks';
import { getBlogCategoryLabel } from 'src/sections/dashboard/blog/blog-categories';
import {
  getBlogContentAppearance,
  getBlogContentBackgroundSx,
  getBlogContentFontSx,
  isBlogContentBackgroundPreset,
  isBlogContentFontPreset,
} from 'src/sections/dashboard/blog/blog-content-style';

import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

type Props = {
  customerId: string;
  blogId: string;
};

const REACTION_OPTIONS: Array<{ type: ReactionType; label: string; icon: string }> = [
  { type: 'like', label: 'Like', icon: 'mdi:thumb-up' },
  { type: 'love', label: 'Love', icon: 'mdi:heart' },
  { type: 'haha', label: 'Haha', icon: 'mdi:emoticon-happy-outline' },
  { type: 'wow', label: 'Wow', icon: 'mdi:emoticon-excited-outline' },
  { type: 'sad', label: 'Sad', icon: 'mdi:emoticon-sad-outline' },
  { type: 'angry', label: 'Angry', icon: 'mdi:emoticon-angry-outline' },
];

const createEmptyReactionCounts = (): Record<ReactionType, number> => ({
  like: 0,
  love: 0,
  haha: 0,
  wow: 0,
  sad: 0,
  angry: 0,
});

const toReactionCounts = (counts?: Partial<Record<ReactionType, number>>) => {
  const next = createEmptyReactionCounts();

  if (!counts) {
    return next;
  }

  REACTION_OPTIONS.forEach((option) => {
    const raw = counts[option.type];
    next[option.type] = typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, raw) : 0;
  });

  return next;
};

const formatDateTime = (value: unknown) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString();
};

export function UniverseBlogItemView({ customerId, blogId }: Props) {
  const { blog, blogLoading } = useGetBlog(blogId);
  const { user, authenticated } = useAuthContext();
  const [isSubmittingReaction, setIsSubmittingReaction] = useState(false);

  const viewerId = user?.id ? String(user.id) : undefined;

  const { reactionSummary, reactionSummaryLoading, reactionSummaryValidating } = useGetReactionSummary(
    'blog',
    blogId,
    authenticated ? viewerId : undefined,
  );

  const [optimisticReaction, setOptimisticReaction] = useState<ReactionType | null>(
    reactionSummary?.myReaction ?? null,
  );
  const [optimisticCounts, setOptimisticCounts] = useState<Record<ReactionType, number>>(
    toReactionCounts(reactionSummary?.counts),
  );

  useEffect(() => {
    setOptimisticReaction(reactionSummary?.myReaction ?? null);
    setOptimisticCounts(toReactionCounts(reactionSummary?.counts));
  }, [reactionSummary]);

  // Record a view once when the page loads (fire-and-forget).
  useEffect(() => {
    if (blogId) {
      recordBlogView(blogId);
    }
  }, [blogId]);

  const contentAppearance = useMemo(() => {
    const fallbackAppearance = getBlogContentAppearance(blog?.comments);

    return {
      fontPreset: isBlogContentFontPreset(blog?.fontPreset)
        ? blog.fontPreset
        : fallbackAppearance.fontPreset,
      backgroundPreset: isBlogContentBackgroundPreset(blog?.backgroundPreset)
        ? blog.backgroundPreset
        : fallbackAppearance.backgroundPreset,
    };
  }, [blog?.backgroundPreset, blog?.comments, blog?.fontPreset]);

  const handleReaction = async (reactionType: ReactionType) => {
    if (!authenticated || isSubmittingReaction) {
      return;
    }

    const previousReaction = optimisticReaction;
    const previousCounts = { ...optimisticCounts };
    const nextReaction = previousReaction === reactionType ? null : reactionType;

    setOptimisticReaction(nextReaction);
    setOptimisticCounts((prev) => {
      const next = { ...prev };

      if (previousReaction) {
        next[previousReaction] = Math.max(0, (next[previousReaction] ?? 0) - 1);
      }

      if (nextReaction) {
        next[nextReaction] = Math.max(0, (next[nextReaction] ?? 0) + 1);
      }

      return next;
    });

    try {
      setIsSubmittingReaction(true);

      if (nextReaction === null) {
        await unreactToBlogForLoggedInCustomer(blogId);
      } else {
        await reactToBlogForLoggedInCustomer(blogId, nextReaction);
      }
    } catch (error) {
      console.error('Failed to update blog reaction', error);
      setOptimisticReaction(previousReaction);
      setOptimisticCounts(previousCounts);
    } finally {
      setIsSubmittingReaction(false);
    }
  };

  if (blogLoading) {
    return (
      <Container sx={{ py: 10 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
          <CircularProgress size={24} />
          <Typography color="text.secondary">Loading blog...</Typography>
        </Stack>
      </Container>
    );
  }

  if (!blog) {
    return (
      <Container sx={{ py: 10 }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Typography variant="h4">Blog not found</Typography>
          <Typography color="text.secondary">This blog is unavailable or has been removed.</Typography>
          <Link
            component={RouterLink}
            href={paths.universe.blogs(customerId)}
            underline="none"
            sx={{ color: 'primary.main' }}
          >
            Back to shared blogs
          </Link>
        </Stack>
      </Container>
    );
  }

  const content = (blog.content || blog.description || '').trim() || 'No content yet.';

  const totalViews = REACTION_OPTIONS.reduce((sum, option) => sum + (optimisticCounts[option.type] ?? 0), 0);

  return (
    <Box component="section" sx={{ py: { xs: 6, md: 10 } }}>
      <Container>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <Link
              component={RouterLink}
              href={paths.universe.blogs(customerId)}
              underline="none"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                color: 'text.secondary',
                typography: 'body2',
              }}
            >
              <Iconify icon="solar:alt-arrow-left-outline" />
              Back to Blogs
            </Link>

            <Link
              component={RouterLink}
              href={paths.universe.view(customerId)}
              underline="none"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                color: 'text.secondary',
                typography: 'body2',
              }}
            >
              <Iconify icon="solar:home-smile-angle-bold" />
              Universe Home
            </Link>
          </Stack>

          <Stack spacing={1.25}>
            <Typography variant="h2">{(blog.title || `Blog #${blog.id}`).trim()}</Typography>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              <Chip size="small" label={getBlogCategoryLabel(blog.category)} />

              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'success.main' }}>
                <Iconify icon="eva:clock-outline" width={16} />
                <Typography variant="caption">{formatDateTime(blog.createdAt)}</Typography>
              </Stack>

            </Stack>
          </Stack>

          <Card sx={{ p: { xs: 2, md: 2.5 } }}>
            <Stack spacing={2}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1.5}
                useFlexGap
                flexWrap="wrap"
              >
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {REACTION_OPTIONS.map((option) => {
                    const count = optimisticCounts[option.type] ?? 0;
                    const active = optimisticReaction === option.type;

                    return (
                      <Stack key={option.type} spacing={0.5} alignItems="center">
                        <Tooltip title={option.label}>
                          <span>
                            <IconButton
                              size="small"
                              color={active ? 'primary' : 'default'}
                              onClick={() => handleReaction(option.type)}
                              disabled={!authenticated || isSubmittingReaction}
                              sx={{
                                border: '1px solid',
                                borderColor: active ? 'primary.main' : 'divider',
                                bgcolor: active ? 'action.selected' : 'transparent',
                              }}
                            >
                              <Iconify icon={option.icon} width={20} />
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 600,
                            color: active ? 'primary.main' : 'text.secondary',
                          }}
                        >
                          {count}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>

                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'info.dark' }}>
                  <Iconify icon="eva:eye-fill" width={24} />
                  <Typography variant="caption">{totalViews} total</Typography>
                </Stack>
              </Stack>

              {!authenticated ? (
                <Typography variant="body2" color="text.secondary">
                  Sign in to add your reaction.
                  {' '}
                  <Link component={RouterLink} href={paths.auth.signIn} underline="hover">
                    Sign in
                  </Link>
                </Typography>
              ) : null}

              {authenticated && optimisticReaction ? (
                <Typography variant="body2" color="text.secondary">
                  You reacted with
                  {' '}
                  <strong>{optimisticReaction}</strong>
                  . Click the same reaction again to remove it.
                </Typography>
              ) : null}

              {reactionSummaryLoading || reactionSummaryValidating ? (
                <Typography variant="caption" color="text.secondary">
                  Refreshing reactions...
                </Typography>
              ) : null}
            </Stack>
          </Card>

          <Card
            sx={{
              p: { xs: 2, md: 3 },
              border: '1px solid',
              ...getBlogContentBackgroundSx(contentAppearance.backgroundPreset),
            }}
          >
            <Stack spacing={2}>
              {blog.description ? (
                <Typography variant="body1" color="text.secondary">
                  {blog.description}
                </Typography>
              ) : null}

              <Divider />

              <Typography
                variant="body1"
                sx={{
                  color: '#3c2a1a',
                  whiteSpace: 'pre-wrap',
                  ...getBlogContentFontSx(contentAppearance.fontPreset),
                }}
              >
                {content}
              </Typography>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
