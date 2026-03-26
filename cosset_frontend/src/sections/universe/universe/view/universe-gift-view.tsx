'use client';

import type { IGiftItem } from 'src/types/gift';
import type { Slide } from 'yet-another-react-lightbox';
import type { ReactionType } from 'src/actions/reaction';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { getS3SignedUrl } from 'src/utils/helper';
import axiosInstance, { endpoints } from 'src/utils/axios';

import { addDrawerComment, recordGiftView, useGetDrawerComments } from 'src/actions/gift';
import { reactToDrawer, unreactToDrawer, useGetReactionSummary } from 'src/actions/reaction';

import { Iconify } from 'src/components/universe/iconify';
import { Lightbox, useLightBox } from 'src/components/dashboard/lightbox';

import { useAuthContext } from 'src/auth/hooks';
import { useUniverseHomeSpaceAccess } from 'src/sections/universe/universe/view/use-universe-home-space-access';

// ----------------------------------------------------------------------

type Props = {
  customerId: string;
  giftId: string;
};

const REACTION_OPTIONS: Array<{ type: ReactionType; label: string; emoji: string }> = [
  { type: 'like', label: 'Like', emoji: '👍' },
  { type: 'love', label: 'Love', emoji: '❤️' },
  { type: 'haha', label: 'Haha', emoji: '🥰' },
  { type: 'wow', label: 'Wow', emoji: '😆' },
  { type: 'sad', label: 'Sad', emoji: '😢' },
  { type: 'angry', label: 'Angry', emoji: '😡' },
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

const normalizeCounterValue = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  return 0;
};

export function UniverseGiftView({ customerId, giftId }: Props) {
  const router = useRouter();
  const { isAccessLoading, isVisitorHomeSpaceOnly } = useUniverseHomeSpaceAccess(customerId);
  const { user, authenticated } = useAuthContext();
  const [gift, setGift] = useState<IGiftItem | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmittingReaction, setIsSubmittingReaction] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(true);
  const [totalViews, setTotalViews] = useState(0);

  const viewerId = authenticated && user?.id ? String(user.id) : undefined;
  const isOwner = viewerId === customerId;

  const { reactionSummary, reactionSummaryLoading, reactionSummaryValidating } = useGetReactionSummary(
    'drawer',
    gift?.id ?? '',
    viewerId,
  );

  const [optimisticReaction, setOptimisticReaction] = useState<ReactionType | null>(
    reactionSummary?.myReaction ?? null,
  );
  const [optimisticCounts, setOptimisticCounts] = useState<Record<ReactionType, number>>(
    toReactionCounts(reactionSummary?.counts),
  );
  const { comments, commentsLoading, commentsValidating } = useGetDrawerComments(giftId);

  useEffect(() => {
    setOptimisticReaction(reactionSummary?.myReaction ?? null);
    setOptimisticCounts(toReactionCounts(reactionSummary?.counts));
  }, [reactionSummary]);

  const slides: Slide[] = useMemo(
    () =>
      imageUrls.map((url) => ({
        src: url,
        alt: gift?.title || 'Gift image',
        description: gift?.description || undefined,
      })),
    [gift?.description, gift?.title, imageUrls]
  );

  const lightbox = useLightBox(slides);

  useEffect(() => {
    let mounted = true;

    const loadGift = async () => {
      try {
        setLoading(true);

        const res = await axiosInstance.get(endpoints.gift.list, {
          params: { customerId, limit: 200, offset: 0 },
        });

        const gifts = (res.data?.gifts ?? []) as IGiftItem[];
        const giftData = gifts.find((item) => String(item.id) === String(giftId)) ?? null;

        if (!giftData) {
          if (mounted) {
            setGift(null);
            setImageUrls([]);
          }
          return;
        }

        let imageKeys: string[] = [];

        try {
          if (typeof giftData.images === 'string') {
            const parsed = JSON.parse(giftData.images);
            if (Array.isArray(parsed)) {
              imageKeys = parsed.filter((value): value is string => typeof value === 'string');
            }
          } else if (Array.isArray(giftData.images)) {
            imageKeys = (giftData.images as unknown[]).filter(
              (value): value is string => typeof value === 'string'
            );
          }
        } catch {
          imageKeys = [];
        }

        const signedUrls = await Promise.all(
          imageKeys.map(async (key) => {
            if (!key) return '';
            if (key.startsWith('http://') || key.startsWith('https://')) return key;

            const signed = await getS3SignedUrl(key);
            return signed || '';
          })
        );

        if (!mounted) return;

        setGift(giftData);
        setTotalViews(normalizeCounterValue(giftData.totalViews));
        setImageUrls(signedUrls.filter(Boolean));
      } catch (error) {
        console.error('Failed to load universe gift view data:', error);
        if (mounted) {
          setGift(null);
          setTotalViews(0);
          setImageUrls([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadGift();

    return () => {
      mounted = false;
    };
  }, [customerId, giftId]);

  useEffect(() => {
    let active = true;
    const currentGiftId = gift?.id;

    if (currentGiftId) {
      const handleViewRecord = async () => {
        const result = await recordGiftView(currentGiftId);

        if (!active || !result) {
          return;
        }

        setTotalViews(normalizeCounterValue(result.totalViews));
      };

      handleViewRecord();
    }

    return () => {
      active = false;
    };
  }, [gift?.id]);

  const handleReaction = async (reactionType: ReactionType) => {
    if (!gift?.id || !authenticated || isSubmittingReaction) {
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
        await unreactToDrawer(gift.id, viewerId);
      } else {
        await reactToDrawer(gift.id, nextReaction, viewerId);
      }
    } catch (error) {
      console.error('Failed to update gift reaction', error);
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

      await addDrawerComment({
        targetId: giftId,
        comment: normalizedComment,
        customerId: viewerId,
        prevCustomer: derivedPrevCustomer,
      });

      setCommentInput('');
    } catch (error) {
      console.error('Failed to add gift comment', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const selectedReaction =
    REACTION_OPTIONS.find((option) => option.type === optimisticReaction) ?? null;

  const totalReactionCount = REACTION_OPTIONS.reduce(
    (sum, option) => sum + (optimisticCounts[option.type] ?? 0),
    0,
  );

  const customerViewHref = customerId ? paths.universe.drawer.item(customerId, 'gift') : paths.home;
  const giftInfoItems = [
    {
      key: 'category',
      icon: 'solar:box-bold',
      label: gift?.category || 'Uncategorized',
      color: 'warning.main',
    },
    {
      key: 'sendTo',
      icon: 'solar:user-id-bold',
      label: gift?.sendTo ? `To ${gift.sendTo}` : null,
      color: 'success.main',
    },
    {
      key: 'receivedFrom',
      icon: 'eva:person-fill',
      label: gift?.receivedFrom ? `From ${gift.receivedFrom}` : null,
      color: 'secondary.main',
    },
    {
      key: 'eventAt',
      icon: 'solar:calendar-bold',
      label: gift?.eventAt ? fDate(gift.eventAt) : null,
      color: 'info.main',
    },
  ].filter((item): item is { key: string; icon: string; label: string; color: string } => true);

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

  if (loading) {
    return (
      <Container sx={{ py: 10 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
          <CircularProgress size={24} />
          <Typography color="text.secondary">Loading gift...</Typography>
        </Stack>
      </Container>
    );
  }

  if (!gift) {
    return (
      <Container sx={{ py: 10 }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Typography variant="h4">Gift not found</Typography>
          <Typography color="text.secondary">This gift is unavailable or has been removed.</Typography>
          <Link component={RouterLink} href={paths.home} underline="none" sx={{ color: 'primary.main' }}>
            Back to home
          </Link>
        </Stack>
      </Container>
    );
  }

  return (
    <Box component="section" sx={{ py: { xs: 6, md: 10 } }}>
      <Container>
        <Stack spacing={3}>
          <Link
            component={RouterLink}
            href={customerViewHref}
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
            Back To List
          </Link>

          <Stack spacing={1}>
            <Typography variant="h2">{gift.title}</Typography>
            <Typography variant="body1" color="text.secondary">
              {gift.description || 'No description'}
            </Typography>
            <Stack direction="column" spacing={2.5}>
              {giftInfoItems.map((item) => (
                <Stack key={item.key} direction="row" spacing={0.75} alignItems="center">
                  <Iconify icon={item.icon} width={16} sx={{ color: item.color }} />
                  <Typography variant="body2" color="text.secondary">
                    {item.label}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>

          <Stack spacing={1} sx={{ maxWidth: 460 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.65,
                width: 'fit-content',
                px: 1,
                py: 0.75,
                borderRadius: 999,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                boxShadow: (theme) => theme.shadows[3],
              }}
            >
              {REACTION_OPTIONS.map((option) => {
                const active = optimisticReaction === option.type;

                return (
                  <Tooltip key={option.type} title={option.label}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleReaction(option.type)}
                        disabled={!authenticated || isSubmittingReaction}
                        sx={{
                          width: 38,
                          height: 38,
                          fontSize: 22,
                          p: 0,
                          border: active ? '1px solid' : '1px solid transparent',
                          borderColor: active ? 'primary.main' : 'transparent',
                          transform: active ? 'translateY(-1px)' : 'none',
                        }}
                      >
                        <Box component="span" sx={{ lineHeight: 1 }}>
                          {option.emoji}
                        </Box>
                      </IconButton>
                    </span>
                  </Tooltip>
                );
              })}
            </Box>

            <Button
              variant="outlined"
              disabled={!authenticated || isSubmittingReaction}
              onClick={() => handleReaction('like')}
              startIcon={
                <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>
                  {selectedReaction?.emoji || '👍'}
                </Box>
              }
              sx={{
                justifyContent: 'center',
                textTransform: 'none',
                bgcolor: 'action.hover',
                borderColor: 'transparent',
                color: selectedReaction ? 'text.primary' : 'text.secondary',
                '&:hover': {
                  bgcolor: 'action.selected',
                  borderColor: 'transparent',
                },
              }}
            >
              {selectedReaction?.label || 'Like'}
            </Button>

            <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="center">
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Iconify icon="eva:eye-fill" width={16} sx={{ color: 'info.main' }} />
                <Typography variant="caption" color="text.secondary">
                  {totalViews} view{totalViews === 1 ? '' : 's'}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={0.5} alignItems="center">
                <Iconify icon="eva:heart-fill" width={16} sx={{ color: 'error.main' }} />
                <Typography variant="caption" color="text.secondary">
                  {totalReactionCount} reaction{totalReactionCount === 1 ? '' : 's'}
                </Typography>
              </Stack>
            </Stack>

            {!authenticated ? (
              <Typography variant="caption" color="text.secondary">
                Sign in to react.{' '}
                <Link component={RouterLink} href={paths.auth.signIn} underline="hover">
                  Sign in
                </Link>
              </Typography>
            ) : null}
          </Stack>

          {imageUrls.length === 0 ? (
          <Typography color="text.secondary">No images in this gift.</Typography>
        ) : (
          <Grid container spacing={2}>
              {imageUrls.map((url, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={`${gift.id}-${index}`}>
                  <Card
                    onClick={() => lightbox.setSelected(index)}
                    sx={{
                      cursor: 'pointer',
                      overflow: 'hidden',
                      borderRadius: 1.5,
                      '&:hover img': { transform: 'scale(1.04)' },
                    }}
                  >
                    <Box sx={{ position: 'relative' }}>
                      <Box
                        component="img"
                        src={url}
                        alt={`${gift.title}-${index + 1}`}
                        sx={{
                          width: 1,
                          aspectRatio: '1/1',
                          objectFit: 'cover',
                          transition: (theme) =>
                            theme.transitions.create('transform', {
                              duration: theme.transitions.duration.shorter,
                            }),
                        }}
                      />
                    </Box>
                    <CardContent sx={{ py: 1.25 }}>
                      <Typography variant="subtitle2" noWrap>
                        {gift.title}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

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
                                {fDate(comment.createdAt)}
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

      <Lightbox slides={slides} open={lightbox.open} close={lightbox.onClose} index={lightbox.selected} />
    </Box>
  );
}
