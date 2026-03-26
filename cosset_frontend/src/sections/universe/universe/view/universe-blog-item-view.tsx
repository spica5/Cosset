'use client';

import type { ReactionType } from 'src/actions/reaction';

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { addBlogComment, useGetBlog, useGetBlogComments, recordBlogView } from 'src/actions/blog';
import { recordActivityNotification } from 'src/actions/notification';
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
import { useUniverseHomeSpaceAccess } from 'src/sections/universe/universe/view/use-universe-home-space-access';

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
  const router = useRouter();
  const { isAccessLoading, isVisitorHomeSpaceOnly } = useUniverseHomeSpaceAccess(customerId);
  const { blog, blogLoading } = useGetBlog(blogId);
  const { user, authenticated } = useAuthContext();
  const [isSubmittingReaction, setIsSubmittingReaction] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(true);

  const viewerId = user?.id ? String(user.id) : undefined;
  const isOwner = viewerId === customerId;

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
  const { comments, commentsLoading, commentsValidating } = useGetBlogComments(blogId);

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

        const visitorId = user?.id ? String(user.id) : null;
        const visitorName =
          user?.displayName ||
          `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
          user?.email ||
          'A visitor';
        const visitorAvatar = user?.photoURL || null;
        recordActivityNotification({
          ownerId: customerId,
          visitor: { id: visitorId, name: visitorName, avatarUrl: visitorAvatar },
          title: `<p><strong>${visitorName}</strong> reacted <strong>${nextReaction}</strong> to your blog <strong>${blog?.title || `#${blogId}`}</strong></p>`,
          content: `${visitorName} reacted "${nextReaction}" to your blog "${blog?.title || `#${blogId}`}"`,
          sessionKey: `activity:react:blog:${blogId}:${nextReaction}:${visitorId ?? 'anon'}`,
        }).catch(console.error);
      }
    } catch (error) {
      console.error('Failed to update blog reaction', error);
      setOptimisticReaction(previousReaction);
      setOptimisticCounts(previousCounts);
    } finally {
      setIsSubmittingReaction(false);
    }
  };

  const handleAddComment = async () => {
    const normalizedComment = commentInput.trim();

    if (!authenticated || !viewerId) {
      return;
    }

    if (!normalizedComment) {
      return;
    }

    try {
      setIsSubmittingComment(true);

      const latestComment = comments.length > 0 ? comments[comments.length - 1] : null;
      const derivedPrevCustomer = comments.length === 0 ? viewerId : latestComment?.customerId || viewerId;

      await addBlogComment({
        blogId,
        comment: normalizedComment,
        customerId: viewerId,
        prevCustomer: derivedPrevCustomer,
      });

      setCommentInput('');
    } catch (error) {
      console.error('Failed to add blog comment', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  useEffect(() => {
    if (!isAccessLoading && isVisitorHomeSpaceOnly) {
      router.replace(paths.universe.view(customerId));
    }
  }, [customerId, isAccessLoading, isVisitorHomeSpaceOnly, router]);

  if (isAccessLoading) {
    return (
      <Container sx={{ py: 10 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
          <CircularProgress size={24} />
          <Typography color="text.secondary">Checking access...</Typography>
        </Stack>
      </Container>
    );
  }

  if (isVisitorHomeSpaceOnly) {
    return (
      <Container sx={{ py: 10 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
          <CircularProgress size={24} />
          <Typography color="text.secondary">Redirecting to home space...</Typography>
        </Stack>
      </Container>
    );
  }

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
              href={`${paths.universe.view(customerId)}#blogs-section`}
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

          {isOwner ? (
            <Card sx={{ p: { xs: 2, md: 2.5 } }}>
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Typography variant="subtitle2">Comments visibility</Typography>
                  <Button
                    size="small"
                    variant={commentsVisible ? 'contained' : 'outlined'}
                    onClick={() => setCommentsVisible((prev) => !prev)}
                  >
                    {commentsVisible ? 'Visible' : 'Hidden'}
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {commentsVisible ? 'Comments are visible to visitors' : 'Comments are hidden from visitors'}
                </Typography>
              </Stack>
            </Card>
          ) : null}

          {commentsVisible ? (
            <Card sx={{ p: { xs: 2, md: 2.5 } }}>
              <Stack spacing={1.25}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <Iconify icon="solar:chat-round-dots-bold" width={16} sx={{ color: 'warning.main' }} />
                    <Typography variant="subtitle2">Comments ({comments.length})</Typography>
                  </Stack>

                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setCommentsExpanded((prev) => !prev)}
                    endIcon={
                      <Iconify
                        width={14}
                        icon={commentsExpanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                      />
                    }
                  >
                    {commentsExpanded ? 'Collapse' : 'Expand'}
                  </Button>
                </Stack>

                {commentsExpanded ? (
                  <>
                    <Stack spacing={0.75} sx={{ maxHeight: 190, overflowY: 'auto', pr: 0.5 }}>
                      {comments.map((comment) => {
                        const authorName =
                          comment.customerDisplayName ||
                          `${comment.customerFirstName || ''} ${comment.customerLastName || ''}`.trim() ||
                          comment.customerEmail ||
                          comment.customerId ||
                          'Customer';

                        return (
                          <Box
                            key={comment.id}
                            sx={{
                              p: 1,
                              borderRadius: 1,
                              bgcolor: 'background.neutral',
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                {authorName}
                              </Typography>
                              <Typography variant="caption" color="text.disabled">
                                {formatDateTime(comment.createdAt)}
                              </Typography>
                            </Stack>

                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, whiteSpace: 'pre-wrap' }}>
                              {comment.comment}
                            </Typography>
                          </Box>
                        );
                      })}

                      {!commentsLoading && comments.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          No comments yet.
                        </Typography>
                      ) : null}
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder={authenticated ? 'Write a comment...' : 'Sign in to write a comment'}
                        value={commentInput}
                        onChange={(event) => setCommentInput(event.target.value)}
                        disabled={!authenticated || isSubmittingComment}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            handleAddComment();
                          }
                        }}
                      />

                      <Button
                        variant="contained"
                        onClick={handleAddComment}
                        disabled={!authenticated || isSubmittingComment || !commentInput.trim()}
                      >
                        {isSubmittingComment ? 'Sending...' : 'Comment'}
                      </Button>
                    </Stack>

                    {commentsLoading || commentsValidating ? (
                      <Typography variant="caption" color="text.secondary">
                        Refreshing comments...
                      </Typography>
                    ) : null}
                  </>
                ) : null}
              </Stack>
            </Card>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
