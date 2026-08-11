'use client';

import type { ReactionType, ReactionTargetType } from 'src/actions/reaction';
import type { SxProps, Theme } from '@mui/material/styles';

import { useEffect, useMemo, useState } from 'react';

import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';

import { useGetPostComments, updatePostCommentVisibility } from 'src/actions/post';
import {
  setReaction,
  removeReaction,
  useGetReactionSummary,
} from 'src/actions/reaction';

import { Iconify } from 'src/components/universe/iconify';
import { CommentsSection } from 'src/components/universe/comment-section';

import type { JourneyDiaryEntryKind } from './universe-landing-journey-diary-utils';

// ----------------------------------------------------------------------

export type JourneyDiarySocialTargetType =
  | 'journey-picture'
  | 'journey-note'
  | 'journey-memorial';

const REACTION_OPTIONS: Array<{ type: ReactionType; label: string; icon: string }> = [
  { type: 'like', label: 'Like', icon: 'mdi:thumb-up-outline' },
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
  if (!counts) return next;

  (Object.keys(next) as ReactionType[]).forEach((key) => {
    const value = counts[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      next[key] = Math.max(0, Math.trunc(value));
    }
  });

  return next;
};

const formatCommentDate = (value: unknown) => {
  if (!value) return '-';
  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
};

export function getJourneyDiarySocialTargetType(
  kind: JourneyDiaryEntryKind | 'picture' | 'note' | 'memorial',
): JourneyDiarySocialTargetType {
  if (kind === 'note') return 'journey-note';
  if (kind === 'memorial') return 'journey-memorial';
  return 'journey-picture';
}

type EngagementCountsProps = {
  kind: JourneyDiaryEntryKind;
  targetId: number | string;
  accentColor?: string;
  mutedColor?: string;
  sx?: SxProps<Theme>;
};

export function JourneyDiaryEngagementCounts({
  kind,
  targetId,
  accentColor,
  mutedColor,
  sx,
}: EngagementCountsProps) {
  const targetType = getJourneyDiarySocialTargetType(kind);
  const { reactionSummary } = useGetReactionSummary(targetType, targetId);
  const { comments } = useGetPostComments(targetId, targetType);

  const visibleCommentCount = useMemo(
    () =>
      comments.filter((comment) => comment.visible === true || Number(comment.visible) === 1).length,
    [comments],
  );

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={sx}>
      <Stack direction="row" spacing={0.35} alignItems="center">
        <Iconify icon="solar:heart-bold" width={14} sx={{ color: accentColor }} />
        <Typography variant="caption" color="text.secondary">
          {reactionSummary?.totalCount ?? 0}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.35} alignItems="center">
        <Iconify
          icon="solar:chat-round-dots-bold"
          width={14}
          sx={{ color: mutedColor || 'text.secondary' }}
        />
        <Typography variant="caption" color="text.secondary">
          {visibleCommentCount}
        </Typography>
      </Stack>
    </Stack>
  );
}

type EngagementProps = {
  targetType: JourneyDiarySocialTargetType | ReactionTargetType;
  targetId: number | string;
  isOwner?: boolean;
  variant?: 'light' | 'dark';
  sx?: SxProps<Theme>;
};

export function JourneyDiaryEngagement({
  targetType,
  targetId,
  isOwner = false,
  variant = 'light',
  sx,
}: EngagementProps) {
  const { user, authenticated } = useAuthContext();
  const viewerId = user?.id ? String(user.id) : undefined;
  const isDark = variant === 'dark';

  const { reactionSummary, reactionSummaryLoading, reactionSummaryValidating } =
    useGetReactionSummary(
      targetType as ReactionTargetType,
      targetId,
      authenticated ? viewerId : undefined,
    );
  const { comments, commentsLoading, commentsValidating } = useGetPostComments(targetId, targetType);

  const [isSubmittingReaction, setIsSubmittingReaction] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(true);
  const [togglingCommentVisibility, setTogglingCommentVisibility] = useState(false);
  const [reactionAnchor, setReactionAnchor] = useState<HTMLElement | null>(null);
  const [commentAnchor, setCommentAnchor] = useState<HTMLElement | null>(null);
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

  useEffect(() => {
    setReactionAnchor(null);
    setCommentAnchor(null);
  }, [targetId, targetType]);

  const totalReactionCount = useMemo(
    () => Object.values(optimisticCounts).reduce((sum, count) => sum + count, 0),
    [optimisticCounts],
  );

  const visibleCommentCount = useMemo(
    () =>
      comments.filter((comment) => {
        const isVisible = comment.visible === true || Number(comment.visible) === 1;
        const commentOwner =
          !!viewerId && !!comment.customerId && String(viewerId) === String(comment.customerId);
        return isVisible || isOwner || commentOwner;
      }).length,
    [comments, isOwner, viewerId],
  );

  const transformedComments = useMemo(
    () =>
      comments.map((comment) => ({
        id: comment.id,
        comment: comment.comment,
        createdAt: comment.createdAt ? String(comment.createdAt) : '',
        customerId: comment.customerId ?? undefined,
        customerDisplayName: comment.customerDisplayName ?? undefined,
        customerFirstName: comment.customerFirstName ?? undefined,
        customerLastName: comment.customerLastName ?? undefined,
        customerEmail: comment.customerEmail ?? undefined,
        visible: comment.visible,
      })),
    [comments],
  );

  const activeReactionOption = REACTION_OPTIONS.find((option) => option.type === optimisticReaction);

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
        await removeReaction({ targetType: targetType as ReactionTargetType, targetId });
      } else {
        await setReaction({
          targetType: targetType as ReactionTargetType,
          targetId,
          reactionType: nextReaction,
        });
      }
      setReactionAnchor(null);
    } catch (error) {
      console.error('Failed to update journey diary reaction', error);
      setOptimisticReaction(previousReaction);
      setOptimisticCounts(previousCounts);
    } finally {
      setIsSubmittingReaction(false);
    }
  };

  const handleToggleCommentVisibility = async (commentId: string | number, visible: boolean) => {
    try {
      setTogglingCommentVisibility(true);
      await updatePostCommentVisibility({
        commentId,
        visible,
        targetId,
        targetType,
      });
    } catch (error) {
      console.error('Failed to toggle journey diary comment visibility', error);
    } finally {
      setTogglingCommentVisibility(false);
    }
  };

  const secondaryColor = isDark ? 'rgba(255,255,255,0.72)' : 'text.secondary';
  const borderColor = isDark ? 'rgba(255,255,255,0.18)' : 'divider';
  const iconButtonSx = {
    border: '1px solid',
    borderColor,
    borderRadius: 2,
    px: 1,
    color: isDark ? 'common.white' : 'text.primary',
    bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'background.paper',
    '&:hover': {
      bgcolor: isDark ? 'rgba(255,255,255,0.12)' : 'action.hover',
    },
  } as const;

  const popoverPaperSx = {
    mt: 1,
    p: 1.5,
    minWidth: 280,
    maxWidth: 360,
    bgcolor: isDark ? 'rgba(18,18,18,0.96)' : 'background.paper',
    color: isDark ? 'common.white' : 'text.primary',
    border: `1px solid ${borderColor}`,
    boxShadow: isDark ? '0 12px 32px rgba(0,0,0,0.45)' : undefined,
  };

  return (
    <Stack spacing={1} sx={sx}>
      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
        <Tooltip title={authenticated ? 'Add reaction' : 'Sign in to react'}>
          <IconButton
            size="small"
            aria-label="Reactions"
            onClick={(event) => setReactionAnchor(event.currentTarget)}
            sx={{
              ...iconButtonSx,
              borderColor: optimisticReaction ? 'primary.main' : borderColor,
              bgcolor: optimisticReaction
                ? isDark
                  ? 'rgba(255,255,255,0.14)'
                  : 'action.selected'
                : iconButtonSx.bgcolor,
            }}
          >
            <Iconify
              icon={activeReactionOption?.icon || 'solar:heart-bold'}
              width={18}
              sx={{ color: optimisticReaction ? 'error.main' : undefined }}
            />
            <Typography variant="caption" sx={{ ml: 0.75, fontWeight: 700, minWidth: 12 }}>
              {totalReactionCount}
            </Typography>
          </IconButton>
        </Tooltip>

        <Tooltip title="Comments">
          <IconButton
            size="small"
            aria-label="Comments"
            onClick={(event) => setCommentAnchor(event.currentTarget)}
            sx={iconButtonSx}
          >
            <Iconify icon="solar:chat-round-dots-bold" width={18} />
            <Typography variant="caption" sx={{ ml: 0.75, fontWeight: 700, minWidth: 12 }}>
              {visibleCommentCount}
            </Typography>
          </IconButton>
        </Tooltip>

        {reactionSummaryLoading || reactionSummaryValidating ? (
          <Typography variant="caption" sx={{ color: secondaryColor }}>
            Refreshing...
          </Typography>
        ) : null}
      </Stack>

      <Popover
        open={Boolean(reactionAnchor)}
        anchorEl={reactionAnchor}
        onClose={() => setReactionAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{ sx: { ...popoverPaperSx, minWidth: 240 } }}
      >
        <Stack spacing={1.25}>
          <Typography variant="subtitle2" sx={{ color: secondaryColor }}>
            React
          </Typography>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            {REACTION_OPTIONS.map((option) => {
              const count = optimisticCounts[option.type] ?? 0;
              const active = optimisticReaction === option.type;

              return (
                <Tooltip key={option.type} title={option.label}>
                  <span>
                    <IconButton
                      size="small"
                      color={active ? 'primary' : 'default'}
                      onClick={() => handleReaction(option.type)}
                      disabled={!authenticated || isSubmittingReaction}
                      sx={{
                        border: '1px solid',
                        borderColor: active ? 'primary.main' : borderColor,
                        bgcolor: active
                          ? isDark
                            ? 'rgba(255,255,255,0.12)'
                            : 'action.selected'
                          : 'transparent',
                        color: isDark ? 'common.white' : undefined,
                        borderRadius: 1.5,
                        flexDirection: 'column',
                        width: 48,
                        height: 52,
                      }}
                    >
                      <Iconify icon={option.icon} width={20} />
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.65rem',
                          color: active ? 'primary.main' : secondaryColor,
                        }}
                      >
                        {count}
                      </Typography>
                    </IconButton>
                  </span>
                </Tooltip>
              );
            })}
          </Stack>

          {!authenticated ? (
            <Typography variant="body2" sx={{ color: secondaryColor }}>
              Sign in to add your reaction.{' '}
              <Link component={RouterLink} href={paths.auth.signIn} underline="hover">
                Sign in
              </Link>
            </Typography>
          ) : null}

          {authenticated && optimisticReaction ? (
            <Typography variant="caption" sx={{ color: secondaryColor }}>
              Click the same reaction again to remove it.
            </Typography>
          ) : null}
        </Stack>
      </Popover>

      <Popover
        open={Boolean(commentAnchor)}
        anchorEl={commentAnchor}
        onClose={() => setCommentAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{
          sx: {
            ...popoverPaperSx,
            width: { xs: 'min(92vw, 360px)', sm: 360 },
            maxHeight: '70vh',
            overflow: 'auto',
          },
        }}
      >
        <CommentsSection
          targetType={targetType}
          targetId={String(targetId)}
          comments={transformedComments}
          commentsLoading={commentsLoading}
          commentsValidating={commentsValidating}
          authenticated={authenticated}
          viewerId={viewerId}
          isOwner={isOwner}
          formatDate={formatCommentDate}
          commentsHidden={!commentsVisible}
          onCommentsVisibilityChange={setCommentsVisible}
          onCommentVisibilityToggle={handleToggleCommentVisibility}
          togglingCommentVisibility={togglingCommentVisibility}
          defaultExpanded
          showHeader={false}
          cardSx={{
            p: 0,
            boxShadow: 'none',
            bgcolor: 'transparent',
            border: 'none',
            ...(isDark
              ? {
                  '& > .MuiStack-root > .MuiTypography-subtitle2': {
                    color: 'common.white',
                  },
                  '& > .MuiStack-root > .MuiTypography-caption': {
                    color: 'rgba(255,255,255,0.72)',
                  },
                  '& .MuiTextField-root .MuiOutlinedInput-root': {
                    color: 'common.white',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
                    '&.Mui-focused fieldset': { borderColor: 'rgba(255,255,255,0.45)' },
                  },
                  '& .MuiTextField-root .MuiInputBase-input': {
                    color: 'common.white',
                    WebkitTextFillColor: '#fff',
                    caretColor: '#fff',
                  },
                  '& .MuiTextField-root .MuiInputBase-input:-webkit-autofill': {
                    WebkitBoxShadow: '0 0 0 1000px rgba(18,18,18,0.96) inset',
                    boxShadow: '0 0 0 1000px rgba(18,18,18,0.96) inset',
                    WebkitTextFillColor: '#fff',
                    caretColor: '#fff',
                    transition: 'background-color 99999s ease-out 0s',
                  },
                  '& .MuiTextField-root .MuiInputBase-input:-webkit-autofill:hover, & .MuiTextField-root .MuiInputBase-input:-webkit-autofill:focus, & .MuiTextField-root .MuiInputBase-input:-webkit-autofill:active':
                    {
                      WebkitBoxShadow: '0 0 0 1000px rgba(18,18,18,0.96) inset',
                      boxShadow: '0 0 0 1000px rgba(18,18,18,0.96) inset',
                      WebkitTextFillColor: '#fff',
                    },
                  '& .MuiTextField-root .MuiInputBase-input::placeholder': {
                    color: 'rgba(255,255,255,0.55)',
                    opacity: 1,
                  },
                }
              : {}),
          }}
        />
      </Popover>
    </Stack>
  );
}
