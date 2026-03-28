'use client';

import type { IPostItem } from 'src/types/post';
import type { ReactionType } from 'src/actions/reaction';

import { useEffect, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { deletePost, recordPostView, useGetPostComments } from 'src/actions/post';
import {
  reactToCommunityPostForLoggedInCustomer,
  unreactToCommunityPostForLoggedInCustomer,
  useGetReactionSummary,
} from 'src/actions/reaction';
import { useAuthContext } from 'src/auth/hooks';
import { recordActivityNotification } from 'src/actions/notification';
import { Iconify } from 'src/components/dashboard/iconify';
import { toast } from 'src/components/dashboard/snackbar';
import { CustomPopover, usePopover } from 'src/components/dashboard/custom-popover';
import { CommentsSection } from 'src/components/universe/comment-section';

import { PostAttachmentsGallery } from './post-attachments-gallery';
import { PostAuthorInfo } from './post-author-info';

// ----------------------------------------------------------------------

type Props = {
  post: IPostItem;
};

const PREVIEW_LENGTH = 20;

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

const getPostContent = (post: IPostItem) => {
  const source = post.content || '';
  const text = source.trim();

  if (!text) {
    return 'No content yet.';
  }

  return text;
};

const getPostAuthorName = (post: IPostItem) => {
  const fullName = `${post.customerFirstName || ''} ${post.customerLastName || ''}`.trim();

  return post.customerDisplayName || fullName || post.customerEmail || post.customerId || 'Customer';
};

export function PostItemForm({ post }: Props) {
  const router = useRouter();
  const { user, authenticated } = useAuthContext();
  const popover = usePopover();
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localTotalViews, setLocalTotalViews] = useState<number>(post.totalViews ?? 0);
  const [isSubmittingReaction, setIsSubmittingReaction] = useState(false);
  const viewRecorded = useRef(false);

  const viewerId = user?.id ? String(user.id) : undefined;
  const { reactionSummary, reactionSummaryLoading, reactionSummaryValidating } = useGetReactionSummary(
    'community',
    post.id,
    authenticated ? viewerId : undefined,
  );

  const [optimisticReaction, setOptimisticReaction] = useState<ReactionType | null>(
    reactionSummary?.myReaction ?? null,
  );
  const [optimisticCounts, setOptimisticCounts] = useState<Record<ReactionType, number>>(
    toReactionCounts(reactionSummary?.counts),
  );
  const {
    comments,
    commentsLoading,
    commentsValidating,
  } = useGetPostComments(post.id, 'community');

  useEffect(() => {
    setOptimisticReaction(reactionSummary?.myReaction ?? null);
    setOptimisticCounts(toReactionCounts(reactionSummary?.counts));
  }, [reactionSummary]);

  // Sync up when the server-side prop provides a higher count (e.g. after SWR refresh).
  // Using Math.max ensures localTotalViews never decreases due to a stale prop value.
  useEffect(() => {
    const serverCount = post.totalViews ?? 0;
    setLocalTotalViews((prev) => Math.max(prev, serverCount));
  }, [post.totalViews]);

  const recordView = async () => {
    if (viewRecorded.current) return;
    viewRecorded.current = true;

    const result = await recordPostView(post.id);

    if (typeof result?.totalViews === 'number' && Number.isFinite(result.totalViews) && result.totalViews > 0) {
      setLocalTotalViews((prev) => Math.max(prev, Math.trunc(result.totalViews!)));
    }
  };

  const content = getPostContent(post);
  const hasMoreThanPreview = content !== 'No content yet.' && content.length > PREVIEW_LENGTH;
  const isOwner = String(post.customerId || '') === String(user?.id || '');

  const toggleExpanded = () => {
    if (!hasMoreThanPreview) {
      return;
    }

    if (!expanded) {
      recordView();
    }

    setExpanded((prev) => !prev);
  };

  const handleArticleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpanded();
    }
  };

  const handleEdit = () => {
    if (!isOwner) {
      return;
    }

    popover.onClose();
    router.push(paths.dashboard.community.post.edit(post.id));
  };

  const handleDelete = async () => {
    if (!isOwner) {
      return;
    }

    popover.onClose();

    const confirmed = window.confirm(`Delete post "${post.title || post.id}"?`);

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      await deletePost(post.id, post.customerId || undefined);
      toast.success('Post deleted successfully.');
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post.');
    } finally {
      setIsDeleting(false);
    }
  };

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
        await unreactToCommunityPostForLoggedInCustomer(post.id);
      } else {
        await reactToCommunityPostForLoggedInCustomer(post.id, nextReaction);

        const ownerCustomerId = String(post.customerId || '').trim();

        if (ownerCustomerId) {
          const visitorId = user?.id ? String(user.id) : null;
          const visitorName =
            user?.displayName ||
            `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
            user?.email ||
            'A visitor';
          const visitorAvatar = user?.photoURL || null;

          recordActivityNotification({
            ownerId: ownerCustomerId,
            visitor: { id: visitorId, name: visitorName, avatarUrl: visitorAvatar },
            title: `<p><strong>${visitorName}</strong> reacted <strong>${nextReaction}</strong> to your community post <strong>${post.title || `#${post.id}`}</strong></p>`,
            content: `${visitorName} reacted "${nextReaction}" to your community post "${post.title || `#${post.id}`}"`,
            sessionKey: `activity:react:community:${post.id}:${nextReaction}:${visitorId ?? 'anon'}`,
          }).catch(console.error);
        }
      }
    } catch (error) {
      console.error('Failed to update community post reaction:', error);
      setOptimisticReaction(previousReaction);
      setOptimisticCounts(previousCounts);
      toast.error('Failed to update reaction.');
    } finally {
      setIsSubmittingReaction(false);
    }
  };

  const totalReactions = REACTION_OPTIONS.reduce(
    (sum, option) => sum + (optimisticCounts[option.type] ?? 0),
    0,
  );

  return (
    <>
      <Card sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={2}
              sx={{ minWidth: 0, flex: 1 }}
            >
              <PostAuthorInfo
                name={getPostAuthorName(post)}
                photoURL={post.customerPhotoURL}
                size={44}
              />

              <Typography variant="h6" sx={{ minWidth: 0 }} noWrap>
                {post.title || `Untitled Post #${post.id}`}
              </Typography>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ ml: 'auto', flexShrink: 0 }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Iconify width={16} icon="eva:eye-fill" sx={{ color: 'info.main' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Views: {localTotalViews}
                </Typography>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Iconify width={16} icon="mdi:heart" sx={{ color: 'error.main' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Reactions: {totalReactions}
                </Typography>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Iconify width={16} icon="solar:chat-round-dots-bold" sx={{ color: 'warning.main' }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Comments: {comments.length}
                </Typography>
              </Stack>

              {isOwner ? (
                <IconButton onClick={popover.onOpen} aria-label="Post actions" sx={{ mt: -0.5, mr: -0.5 }}>
                  <Iconify icon="eva:more-vertical-fill" sx={{ color: 'text.secondary' }} />
                </IconButton>
              ) : null}
            </Stack>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Iconify icon="eva:clock-outline" sx={{ color: 'warning.main' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
               {formatDate(post.createdAt)}
            </Typography>
          </Stack>

          <Divider />

          <Box
            role={hasMoreThanPreview ? 'button' : undefined}
            tabIndex={hasMoreThanPreview ? 0 : -1}
            onClick={toggleExpanded}
            onKeyDown={handleArticleKeyDown}
            sx={{
              p: 1,
              borderRadius: 1.5,
              cursor: hasMoreThanPreview ? 'pointer' : 'default',
              '&:hover': hasMoreThanPreview ? { bgcolor: 'action.hover' } : undefined,
              '&:focus-visible': hasMoreThanPreview
                ? {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                  }
                : undefined,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                whiteSpace: expanded ? 'pre-wrap' : 'normal',
                ...(expanded
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

            {hasMoreThanPreview ? (
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.75 }}>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  {expanded ? 'Click article to collapse' : 'Click article to expand'}
                </Typography>
                <Iconify
                  width={14}
                  icon={expanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                  sx={{ color: 'primary.main' }}
                />
              </Stack>
            ) : null}

            <PostAttachmentsGallery
              files={post.files}
              heading="Attached files"
              stopPropagation
              onPreview={recordView}
              imageWidth={200}
              imageHeight={120}
            />
          </Box>

          <Divider />

          <Stack spacing={1}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              {REACTION_OPTIONS.map((option) => {
                const count = optimisticCounts[option.type] ?? 0;
                const active = optimisticReaction === option.type;

                return (
                  <Stack key={option.type} spacing={0.4} alignItems="center">
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
                      <Iconify icon={option.icon} width={18} />
                    </IconButton>

                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 600, color: active ? 'primary.main' : 'text.secondary' }}
                    >
                      {count}
                    </Typography>
                  </Stack>
                );
              })}

              <Typography variant="caption" sx={{ color: 'info.main', ml: 0.5 }}>
                {totalReactions} total reactions
              </Typography>
            </Stack>

            {!authenticated ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Sign in to add your reaction.
              </Typography>
            ) : null}

            {authenticated && optimisticReaction ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                You reacted with <strong>{optimisticReaction}</strong>. Click it again to remove.
              </Typography>
            ) : null}

            {reactionSummaryLoading || reactionSummaryValidating ? (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Refreshing reactions...
              </Typography>
            ) : null}
          </Stack>

          <Divider />

          <CommentsSection
            targetType="community"
            targetId={String(post.id)}
            comments={comments.map((comment) => ({
              id: comment.id,
              comment: comment.comment,
              createdAt: comment.createdAt ? formatDate(comment.createdAt) : '',
              customerId: comment.customerId ?? undefined,
              customerDisplayName: comment.customerDisplayName ?? undefined,
              customerFirstName: comment.customerFirstName ?? undefined,
              customerLastName: comment.customerLastName ?? undefined,
              customerEmail: comment.customerEmail ?? undefined,
            }))}
            commentsLoading={commentsLoading}
            commentsValidating={commentsValidating}
            authenticated={authenticated}
            viewerId={viewerId}
            isOwner={isOwner}
            formatDate={formatDate}
          />
        </Stack>
      </Card>

      {isOwner ? (
        <CustomPopover
          open={popover.open}
          anchorEl={popover.anchorEl}
          onClose={popover.onClose}
          slotProps={{ arrow: { placement: 'right-top' } }}
        >
          <MenuList>
            <MenuItem onClick={handleEdit}>
              <Iconify icon="solar:pen-bold" sx={{ color: 'info.main' }} />
              Edit post
            </MenuItem>

            <MenuItem onClick={handleDelete} disabled={isDeleting} sx={{ color: 'error.main' }}>
              <Iconify icon="solar:trash-bin-trash-bold" sx={{ color: 'error.main' }} />
              {isDeleting ? 'Deleting...' : 'Delete post'}
            </MenuItem>
          </MenuList>
        </CustomPopover>
      ) : null}

    </>
  );
}