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
import Tooltip from '@mui/material/Tooltip';
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

import { recordGiftView, useGetDrawerComments, useGetViewedGiftIds } from 'src/actions/gift';
import { recordActivityNotification } from 'src/actions/notification';
import { reactToDrawer, unreactToDrawer, useGetReactionSummary } from 'src/actions/reaction';

import { Label } from 'src/components/universe/label';
import { Iconify } from 'src/components/universe/iconify';
import { Lightbox, useLightBox } from 'src/components/dashboard/lightbox';

import { useAuthContext } from 'src/auth/hooks';
import { useUniverseHomeSpaceAccess } from 'src/sections/universe/universe/view/use-universe-home-space-access';

// ----------------------------------------------------------------------

type Props = {
  customerId: string;
  categoryKey: string;
};

type GiftWithImages = IGiftItem & {
  imageUrls: string[];
};

const isPublicGift = (openness?: string) => {
  const value = String(openness || '').toLowerCase();
  return value === 'public' || value === '1' || value === 'true';
};

const isCategoryMatch = (giftCategory: string | null | undefined, categoryKey: string) => {
  const value = String(giftCategory || '').trim().toLowerCase();

  if (categoryKey === 'gift') {
    return value === '' || value === 'gift' || value === 'gifts';
  }

  return value === categoryKey.toLowerCase();
};

const categoryLabelMap: Record<string, string> = {
  gift: 'Gifts and Souvenirs',
  letter: 'Letters',
  goodMemo: 'Good Memories',
  sadMemo: 'Sad Memories',
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

type GiftReactionInfoProps = {
  giftId: string | number;
  totalViews?: number | null;
  authenticated: boolean;
  viewerId?: string;
};

function GiftReactionInfo({ giftId, totalViews, authenticated, viewerId }: GiftReactionInfoProps) {
  const [isSubmittingReaction, setIsSubmittingReaction] = useState(false);

  const { reactionSummary, reactionSummaryLoading, reactionSummaryValidating } = useGetReactionSummary(
    'drawer',
    giftId,
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
        await unreactToDrawer(giftId, viewerId);
      } else {
        await reactToDrawer(giftId, nextReaction, viewerId);
      }
    } catch (error) {
      console.error('Failed to update gift reaction', error);
      setOptimisticReaction(previousReaction);
      setOptimisticCounts(previousCounts);
    } finally {
      setIsSubmittingReaction(false);
    }
  };

  const safeViews = normalizeCounterValue(totalViews);
  const totalReactionCount = REACTION_OPTIONS.reduce(
    (sum, option) => sum + (optimisticCounts[option.type] ?? 0),
    0,
  );

  const { comments } = useGetDrawerComments(giftId);
  const commentCount = comments?.length ?? 0;

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1.25} alignItems="center" useFlexGap flexWrap="wrap">
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Iconify icon="eva:eye-fill" width={16} sx={{ color: 'info.main' }} />
          <Typography variant="caption" color="text.secondary">
            {safeViews} view{safeViews === 1 ? '' : 's'}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Iconify icon="eva:heart-fill" width={16} sx={{ color: 'error.main' }} />
          <Typography variant="caption" color="text.secondary">
            {totalReactionCount} reaction{totalReactionCount === 1 ? '' : 's'}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Iconify icon="eva:message-circle-fill" width={16} sx={{ color: 'success.main' }} />
          <Typography variant="caption" color="text.secondary">
            {commentCount} comment{commentCount === 1 ? '' : 's'}
          </Typography>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" alignItems="center">
        {REACTION_OPTIONS.map((option) => {
          const active = optimisticReaction === option.type;

          return (
            <Tooltip key={option.type} title={option.label}>
              <span>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleReaction(option.type);
                  }}
                  disabled={!authenticated || isSubmittingReaction}
                  sx={{
                    width: 28,
                    height: 28,
                    fontSize: 16,
                    p: 0,
                    border: active ? '1px solid' : '1px solid transparent',
                    borderColor: active ? 'primary.main' : 'transparent',
                    bgcolor: active ? 'action.selected' : 'transparent',
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

        {!authenticated ? (
          <Typography variant="caption" color="text.secondary">
            Sign in to react
          </Typography>
        ) : null}
      </Stack>

      {reactionSummaryLoading || reactionSummaryValidating ? (
        <Typography variant="caption" color="text.secondary">
          Refreshing reactions...
        </Typography>
      ) : null}
    </Stack>
  );
}

export function UniverseDrawerView({ customerId, categoryKey }: Props) {
  const router = useRouter();
  const { isAccessLoading, isVisitorHomeSpaceOnly } = useUniverseHomeSpaceAccess(customerId);
  const { user, authenticated } = useAuthContext();
  const [items, setItems] = useState<GiftWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const viewerId = authenticated && user?.id ? String(user.id) : undefined;
  const { viewedGiftIds, viewedGiftIdsLoading } = useGetViewedGiftIds(customerId);

  useEffect(() => {
    let mounted = true;

    const loadDrawerItems = async () => {
      try {
        setLoading(true);

        const response = await axiosInstance.get(endpoints.gift.list, {
          params: { customerId, limit: 200, offset: 0 },
        });

        const gifts = (response.data?.gifts ?? []) as IGiftItem[];

        const filtered = gifts.filter(
          (gift) => isPublicGift(gift.openness) && isCategoryMatch(gift.category, categoryKey)
        );

        const withImages = await Promise.all(
          filtered.map(async (gift) => {
            let imageKeys: string[] = [];

            try {
              if (typeof gift.images === 'string') {
                const parsed = JSON.parse(gift.images);
                if (Array.isArray(parsed)) {
                  imageKeys = parsed.filter((value): value is string => typeof value === 'string');
                }
              } else if (Array.isArray(gift.images)) {
                imageKeys = (gift.images as unknown[]).filter(
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

            return {
              ...gift,
              imageUrls: signedUrls.filter(Boolean),
            };
          })
        );

        if (!mounted) return;
        setItems(withImages);
      } catch (error) {
        console.error('Failed to load universe drawer items:', error);
        if (mounted) {
          setItems([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDrawerItems();

    return () => {
      mounted = false;
    };
  }, [categoryKey, customerId]);

  // Notify owner when a visitor views this drawer category.
  useEffect(() => {
    if (loading) return;
    const categoryLabel = categoryLabelMap[categoryKey] || categoryKey;
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
      title: `<p><strong>${visitorName}</strong> viewed your <strong>${categoryLabel}</strong> drawer</p>`,
      content: `${visitorName} viewed your "${categoryLabel}" drawer`,
      sessionKey: `activity:drawer_view:${customerId}:${categoryKey}:${visitorId ?? 'anon'}`,
    }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const categoryLabel = categoryLabelMap[categoryKey] || categoryKey;
  const previewImageHeight = categoryKey === 'gift' ? 245 : 220;
  const [viewCountOverrides, setViewCountOverrides] = useState<Record<string, number>>({});
  const viewedGiftIdSet = useMemo(() => new Set(viewedGiftIds.map(String)), [viewedGiftIds]);
  const viewedCount = useMemo(
    () => items.filter((item) => viewedGiftIdSet.has(String(item.id))).length,
    [items, viewedGiftIdSet],
  );
  const unreadCount = Math.max(0, items.length - viewedCount);

  const slideItems = useMemo(
    () =>
      items.flatMap((gift) =>
        gift.imageUrls.map((url) => ({
          src: url,
          alt: gift.title || 'Drawer image',
          description: gift.description || undefined,
        }))
      ),
    [items]
  );

  const lightboxSlides: Slide[] = slideItems;
  const lightbox = useLightBox(lightboxSlides);

  const handleCardClick = (firstImg: string, slideIdx: number, itemId: string | number) => {
    if (firstImg && slideIdx >= 0) {
      lightbox.setSelected(slideIdx);
    }
    recordGiftView(itemId)
      .then((result) => {
        if (result && typeof result.totalViews === 'number' && result.totalViews > 0) {
          setViewCountOverrides((prev) => ({
            ...prev,
            [String(itemId)]: Math.max(prev[String(itemId)] ?? 0, result.totalViews!),
          }));
        }
      })
      .catch(() => {});
  };

  const customerViewHref = `${paths.universe.view(customerId)}#drawers-section`;

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
          <Typography color="text.secondary">Loading drawer items...</Typography>
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
            Back
          </Link>

          <Stack spacing={1}>
            <Typography variant="h2">{categoryLabel}</Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">
                {items.length} item{items.length === 1 ? '' : 's'} shared
              </Typography>

              {!authenticated ? (
                <Typography variant="caption" color="text.secondary">
                  Sign in to track viewed/unread.
                </Typography>
              ) : viewedGiftIdsLoading ? (
                <Typography variant="caption" color="text.secondary">
                  Loading viewed status...
                </Typography>
              ) : (
                <>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Iconify icon="eva:eye-fill" width={14} sx={{ color: 'success.main' }} />
                    <Typography variant="caption" color="text.secondary">
                      {viewedCount} viewed
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Iconify icon="eva:eye-off-fill" width={14} sx={{ color: 'warning.main' }} />
                    <Typography variant="caption" color="text.secondary">
                      {unreadCount} unread
                    </Typography>
                  </Stack>
                </>
              )}
            </Stack>
          </Stack>

          {items.length === 0 ? (
            <Typography color="text.secondary">No shared items found for this drawer category.</Typography>
          ) : (
            <Grid container spacing={2}>
              {items.map((item) => {
                const firstImage = item.imageUrls[0] || '';
                const isViewed = viewedGiftIdSet.has(String(item.id));
                const slideStartIndex = slideItems.findIndex(
                  (slide) => slide.src === firstImage && slide.alt === (item.title || 'Drawer image')
                );

                return (
                  <Grid item xs={12} sm={6} md={4} key={item.id}>
                    <Card
                      onClick={() => handleCardClick(firstImage, slideStartIndex, item.id)}
                      sx={{
                        height: 1,
                        cursor: firstImage ? 'pointer' : 'default',
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        '&:hover img': { transform: 'scale(1.04)' },
                      }}
                    >
                      <Box
                        component="img"
                        src={firstImage}
                        alt={item.title}
                        sx={{
                          width: 1,
                          height: previewImageHeight,
                          objectFit: 'cover',
                          bgcolor: 'background.neutral',
                          transition: (theme) =>
                            theme.transitions.create('transform', {
                              duration: theme.transitions.duration.shorter,
                            }),
                        }}
                      />
                      <CardContent
                        sx={{
                          bgcolor: 'background.neutral',
                          borderTop: '1px dashed',
                          borderColor: 'divider',
                        }}
                      >
                        <Stack spacing={0.75}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                            <Typography variant="h6" noWrap sx={{ minWidth: 0 }}>
                              {item.title}
                            </Typography>

                            {authenticated && !viewedGiftIdsLoading ? (
                              <Label
                                color={isViewed ? 'success' : 'warning'}
                                variant="soft"
                                title={isViewed ? 'Viewed' : 'Unread'}
                                sx={{
                                  minWidth: 26,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <Iconify icon={isViewed ? 'eva:eye-fill' : 'eva:eye-off-fill'} width={16} />
                              </Label>
                            ) : null}
                          </Stack>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {item.description || 'No description'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.sendTo ? `To ${item.sendTo} • ` : ''}
                            From {item.receivedFrom || 'Unknown'}
                            {item.eventAt ? ` • ${fDate(item.eventAt)}` : ''}
                          </Typography>

                          {categoryKey === 'gift' ? (
                            <GiftReactionInfo
                              giftId={item.id}
                              totalViews={viewCountOverrides[String(item.id)] ?? item.totalViews}
                              authenticated={authenticated}
                              viewerId={viewerId}
                            />
                          ) : null}

                          <Link
                            component={RouterLink}
                            href={paths.universe.gift(customerId, item.id)}
                            underline="none"
                            onClick={(event) => event.stopPropagation()}
                            sx={{ typography: 'body2', color: 'primary.main' }}
                          >
                            View gift
                          </Link>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Stack>
      </Container>

      <Lightbox
        slides={lightboxSlides}
        open={lightbox.open}
        close={lightbox.onClose}
        index={lightbox.selected}
      />
    </Box>
  );
}
