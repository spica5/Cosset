'use client';

import type { Slide } from 'yet-another-react-lightbox';
import type { ReactionType } from 'src/actions/reaction';
import type { ICollectionDrawerItem } from 'src/types/collection-item';

import { useInView } from 'framer-motion';
import { useRef, useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { getS3SignedUrl } from 'src/utils/helper';

import { useGetCollection } from 'src/actions/collection';
import { recordActivityNotification } from 'src/actions/notification';
import {
  reactToCollectionItem,
  useGetReactionSummary,
  unreactToCollectionItem,
} from 'src/actions/reaction';
import {
  useGetCollectionItems,
  useGetViewedCollectionItemIds,
  recordCollectionItemView,
  useGetCollectionItemComments,
} from 'src/actions/collection-item';

import { Label } from 'src/components/universe/label';
import { Iconify } from 'src/components/universe/iconify';
import { Lightbox, useLightBox } from 'src/components/dashboard/lightbox';
import { CommentsSection } from 'src/components/universe/comment-section';
import { useAuthContext } from 'src/auth/hooks';
import { useUniverseHomeSpaceAccess } from 'src/sections/universe/universe/view/use-universe-home-space-access';

// ----------------------------------------------------------------------

type Props = {
  customerId: string;
  collectionId: string | number;
  headingOverride?: string;
  backSectionAnchor?: string;
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

type MediaKind = 'image' | 'video';

type ResolvedMediaItem = {
  key: string;
  url: string;
  kind: MediaKind;
};

type CollectionItemMediaGalleryProps = {
  imageKeys: string[];
  videoKeys: string[];
};

const formatDate = (value: unknown) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString();
};

const normalizeCounterValue = (value: unknown) => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.max(0, Math.trunc(parsed));
  }

  return 0;
};

const getCollectionItemLabel = (item: Pick<ICollectionDrawerItem, 'id' | 'title'>) => {
  const title = typeof item.title === 'string' ? item.title.trim() : '';

  return title || `Item #${item.id}`;
};

const parseSerializedItems = (value?: string | null): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item || '').trim())
        .filter(Boolean);
    }

    if (typeof parsed === 'string' && parsed.trim()) {
      return [parsed.trim()];
    }
  } catch {
    const normalized = value.trim();
    if (!normalized) {
      return [];
    }

    return normalized
      .split(/[\r\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

const getVideoMimeType = (key: string) => {
  const normalized = key.toLowerCase();

  if (normalized.endsWith('.mov')) {
    return 'video/quicktime';
  }

  if (normalized.endsWith('.webm')) {
    return 'video/webm';
  }

  return 'video/mp4';
};

function CollectionItemMediaGallery({ imageKeys, videoKeys }: CollectionItemMediaGalleryProps) {
  const [mediaItems, setMediaItems] = useState<ResolvedMediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadMedia = async () => {
      const rawItems: Array<{ key: string; kind: MediaKind }> = [
        ...imageKeys.map((key) => ({ key, kind: 'image' as const })),
        ...videoKeys.map((key) => ({ key, kind: 'video' as const })),
      ];

      if (rawItems.length === 0) {
        if (mounted) {
          setMediaItems([]);
        }
        return;
      }

      try {
        setLoading(true);

        const resolved = await Promise.all(
          rawItems.map(async (item) => {
            if (item.key.startsWith('http://') || item.key.startsWith('https://')) {
              return { ...item, url: item.key };
            }

            const signedUrl = await getS3SignedUrl(item.key);
            return { ...item, url: signedUrl || '' };
          }),
        );

        if (!mounted) return;

        setMediaItems(resolved.filter((item) => !!item.url));
      } catch (error) {
        console.error('Failed to load collection item media:', error);
        if (mounted) {
          setMediaItems([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadMedia();

    return () => {
      mounted = false;
    };
  }, [imageKeys, videoKeys]);

  const slides: Slide[] = useMemo(
    () =>
      mediaItems.map((item) => {
        if (item.kind === 'video') {
          return {
            type: 'video',
            width: 1280,
            height: 720,
            poster: item.url,
            sources: [{ src: item.url, type: getVideoMimeType(item.key) }],
          } as Slide;
        }

        return {
          src: item.url,
          alt: 'Collection image',
        } as Slide;
      }),
    [mediaItems],
  );

  const lightbox = useLightBox(slides);

  if (loading) {
    return (
      <Typography variant="caption" color="text.secondary">
        Loading media gallery...
      </Typography>
    );
  }

  if (mediaItems.length === 0) {
    return null;
  }

  return (
    <>
      <Stack spacing={0.8}>
        <Stack direction="row" spacing={0.6} alignItems="center">
          <Iconify icon="solar:gallery-bold" width={14} sx={{ color: 'primary.main' }} />
          <Typography variant="caption" color="text.secondary">
            Media gallery ({mediaItems.length})
          </Typography>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: 1,
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(4, minmax(0, 1fr))',
            },
          }}
        >
          {mediaItems.map((item, index) => (
            <Card
              key={`${item.kind}-${item.key}-${index}`}
              onClick={() => lightbox.setSelected(index)}
              sx={{
                cursor: 'pointer',
                overflow: 'hidden',
                borderRadius: 1,
                border: '1px dashed',
                borderColor: 'divider',
                position: 'relative',
                '&:hover .media-preview': { transform: 'scale(1.04)' },
                '&:hover .media-overlay': { opacity: 1 },
              }}
            >
              {item.kind === 'image' ? (
                <Box
                  component="img"
                  src={item.url}
                  alt="Collection item image"
                  className="media-preview"
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
              ) : (
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="video"
                    src={item.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="media-preview"
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

                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: 'rgba(0,0,0,0.55)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Iconify icon="solar:play-bold" width={14} sx={{ color: 'common.white' }} />
                  </Box>
                </Box>
              )}

              <Box
                className="media-overlay"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'rgba(0, 0, 0, 0.28)',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.92)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Iconify icon="solar:eye-bold" width={16} sx={{ color: 'text.primary' }} />
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      </Stack>

      <Lightbox
        slides={slides}
        open={lightbox.open}
        close={lightbox.onClose}
        index={lightbox.selected}
      />
    </>
  );
}

type CollectionItemCardProps = {
  item: ICollectionDrawerItem;
  authenticated: boolean;
  viewerId?: string;
  visitorId: string | null;
  visitorName: string;
  visitorAvatar: string | null;
  ownerCustomerId: string;
  isInitiallyViewed: boolean;
  viewedFlagLoading: boolean;
};

function CollectionItemCard({
  item,
  authenticated,
  viewerId,
  visitorId,
  visitorName,
  visitorAvatar,
  ownerCustomerId,
  isInitiallyViewed,
  viewedFlagLoading,
}: CollectionItemCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const hasRecordedViewRef = useRef(false);
  const isInView = useInView(cardRef, { once: true, amount: 0.35 });
  const [isSubmittingReaction, setIsSubmittingReaction] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(true);
  const [totalViews, setTotalViews] = useState(() => normalizeCounterValue(item.totalViews));
  const [isViewed, setIsViewed] = useState(isInitiallyViewed);

  const itemLabel = getCollectionItemLabel(item);
  const ownerId = item.customerId ? String(item.customerId) : ownerCustomerId;
  const isOwner = viewerId === ownerId;

  const imageKeys = useMemo(() => parseSerializedItems(item.images), [item.images]);
  const videoKeys = useMemo(() => parseSerializedItems(item.videos), [item.videos]);
  const fileKeys = useMemo(() => parseSerializedItems(item.files), [item.files]);

  const imageCount = imageKeys.length;
  const videoCount = videoKeys.length;
  const fileCount = fileKeys.length;

  const { reactionSummary, reactionSummaryLoading, reactionSummaryValidating } = useGetReactionSummary(
    'collection-item',
    item.id,
    authenticated ? viewerId : undefined,
  );

  const [optimisticReaction, setOptimisticReaction] = useState<ReactionType | null>(
    reactionSummary?.myReaction ?? null,
  );
  const [optimisticCounts, setOptimisticCounts] = useState<Record<ReactionType, number>>(
    toReactionCounts(reactionSummary?.counts),
  );
  const { comments, commentsLoading, commentsValidating } = useGetCollectionItemComments(item.id);

  // Transform comments to match CommentsSection expected type
  const transformedComments = comments.map((comment) => ({
    id: comment.id,
    comment: comment.comment,
    createdAt: comment.createdAt ? formatDate(comment.createdAt) : '',
    customerId: comment.customerId ?? undefined,
    customerDisplayName: comment.customerDisplayName ?? undefined,
    customerFirstName: comment.customerFirstName ?? undefined,
    customerLastName: comment.customerLastName ?? undefined,
    customerEmail: comment.customerEmail ?? undefined,
  }));

  useEffect(() => {
    setOptimisticReaction(reactionSummary?.myReaction ?? null);
    setOptimisticCounts(toReactionCounts(reactionSummary?.counts));
  }, [reactionSummary]);

  useEffect(() => {
    setTotalViews(normalizeCounterValue(item.totalViews));
  }, [item.totalViews]);

  useEffect(() => {
    setIsViewed(isInitiallyViewed);
  }, [isInitiallyViewed, item.id]);

  useEffect(() => {
    let active = true;

    if (!isInView || hasRecordedViewRef.current) {
      return () => {
        active = false;
      };
    }

    hasRecordedViewRef.current = true;

    const recordView = async () => {
      const result = await recordCollectionItemView(item.id);

      if (!active) {
        return;
      }

      if (result) {
        setTotalViews(normalizeCounterValue(result.totalViews));
      }

      if (authenticated) {
        setIsViewed(true);
      }

      recordActivityNotification({
        ownerId,
        visitor: { id: visitorId, name: visitorName, avatarUrl: visitorAvatar },
        title: `<p><strong>${visitorName}</strong> viewed your collection item <strong>${itemLabel}</strong></p>`,
        content: `${visitorName} viewed your collection item "${itemLabel}"`,
        sessionKey: `activity:collection_item_view:${item.id}:${visitorId ?? 'anon'}`,
      }).catch(console.error);
    };

    recordView();

    return () => {
      active = false;
    };
  }, [authenticated, isInView, item.id, itemLabel, ownerId, visitorAvatar, visitorId, visitorName]);

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
        await unreactToCollectionItem(item.id);
      } else {
        await reactToCollectionItem(item.id, nextReaction);

        recordActivityNotification({
          ownerId,
          visitor: { id: visitorId, name: visitorName, avatarUrl: visitorAvatar },
          title: `<p><strong>${visitorName}</strong> reacted <strong>${nextReaction}</strong> to your collection item <strong>${itemLabel}</strong></p>`,
          content: `${visitorName} reacted "${nextReaction}" to your collection item "${itemLabel}"`,
          sessionKey: `activity:react:collection-item:${item.id}:${nextReaction}:${visitorId ?? 'anon'}`,
        }).catch(console.error);
      }
    } catch (error) {
      console.error('Failed to update collection item reaction', error);
      setOptimisticReaction(previousReaction);
      setOptimisticCounts(previousCounts);
    } finally {
      setIsSubmittingReaction(false);
    }
  };

  const totalReactionCount = REACTION_OPTIONS.reduce(
    (sum, option) => sum + (optimisticCounts[option.type] ?? 0),
    0,
  );

  return (
    <Card ref={cardRef} sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Stack direction="row" spacing={0.9} alignItems="center" sx={{ minWidth: 0 }}>
              <Iconify
                icon="solar:bookmark-square-minimalistic-bold"
                width={16}
                sx={{ color: 'primary.main' }}
              />
              <Typography variant="h6" noWrap>
                {itemLabel}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
              {authenticated && !viewedFlagLoading ? (
                <Label
                  color={isViewed ? 'success' : 'warning'}
                  variant="soft"
                  title={isViewed ? 'Viewed' : 'Unread'}
                  sx={{
                    minWidth: 28,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Iconify icon={isViewed ? 'eva:eye-fill' : 'eva:eye-off-fill'} width={18} />
                </Label>
              ) : null}

              <Stack direction="row" spacing={0.4} alignItems="center" sx={{ color: 'info.dark' }}>
                {/* <Iconify icon="eva:eye-fill" width={14} /> */}
                <Typography variant="caption" color="text.secondary">
                  total {totalViews} viewed
                </Typography>
              </Stack>
            </Stack>
          </Stack>

          {item.description ? (
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              {item.description}
            </Typography>
          ) : null}

          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center">
            <Stack direction="row" spacing={0.6} alignItems="center">
              <Iconify icon="eva:calendar-outline" width={14} sx={{ color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {formatDate(item.date || item.updatedAt)}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.6} alignItems="center">
              <Iconify icon="eva:image-fill" width={14} sx={{ color: 'info.main' }} />
              <Typography variant="caption" color="text.secondary">
                {imageCount} image{imageCount === 1 ? '' : 's'}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.6} alignItems="center">
              <Iconify
                icon="solar:video-frame-play-horizontal-bold"
                width={14}
                sx={{ color: 'warning.main' }}
              />
              <Typography variant="caption" color="text.secondary">
                {videoCount} video{videoCount === 1 ? '' : 's'}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.6} alignItems="center">
              <Iconify icon="solar:file-text-bold" width={14} sx={{ color: 'success.main' }} />
              <Typography variant="caption" color="text.secondary">
                {fileCount} file{fileCount === 1 ? '' : 's'}
              </Typography>
            </Stack>
          </Stack>

          <Divider />

          <Stack spacing={1.25}>
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

              <Stack direction="row" spacing={1.5} alignItems="center">
                <Chip
                  size="small"
                  icon={<Iconify icon="eva:heart-fill" width={14} />}
                  label={`${totalReactionCount} reaction${totalReactionCount === 1 ? '' : 's'}`}
                  variant="outlined"
                  color="default"
                />
              </Stack>
            </Stack>

            {authenticated && optimisticReaction ? (
              <Typography variant="caption" color="text.secondary">
                You reacted with <strong>{optimisticReaction}</strong>. Click the same reaction again to remove it.
              </Typography>
            ) : null}

            {reactionSummaryLoading || reactionSummaryValidating ? (
              <Typography variant="caption" color="text.secondary">
                Refreshing reactions...
              </Typography>
            ) : null}
          </Stack>

          <CollectionItemMediaGallery imageKeys={imageKeys} videoKeys={videoKeys} />

          {isOwner ? (
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
          ) : null}

          {commentsVisible ? (
            <CommentsSection
              targetType="collection-item"
              targetId={String(item.id)}
              comments={transformedComments}
              commentsLoading={commentsLoading}
              commentsValidating={commentsValidating}
              authenticated={authenticated}
              viewerId={viewerId}
              isOwner={isOwner}
              formatDate={formatDate}
            />
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function UniverseCollectionItemListView({
  customerId,
  collectionId,
  headingOverride,
  backSectionAnchor = 'collection-items-section',
}: Props) {
  const router = useRouter();
  const { isAccessLoading, isVisitorHomeSpaceOnly } = useUniverseHomeSpaceAccess(customerId);
  const { collection, collectionLoading } = useGetCollection(collectionId);
  const { collectionItems, collectionItemsLoading } = useGetCollectionItems(collectionId, customerId);
  const { viewedCollectionItemIds, viewedCollectionItemIdsLoading } =
    useGetViewedCollectionItemIds(customerId, collectionId);
  const { user, authenticated } = useAuthContext();
  const viewerId = authenticated && user?.id ? String(user.id) : undefined;
  const visitorId = user?.id ? String(user.id) : null;
  const visitorName =
    user?.displayName ||
    `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
    user?.email ||
    'A visitor';
  const visitorAvatar = user?.photoURL || null;

  const viewedItemIdSet = useMemo(
    () => new Set(viewedCollectionItemIds.map(String)),
    [viewedCollectionItemIds],
  );

  const publicItems = useMemo(
    () =>
      [...collectionItems]
        .filter((item) => item.isPublic === 1)
        .sort((a, b) => {
          const aTime = new Date(a.date || a.updatedAt || 0).getTime();
          const bTime = new Date(b.date || b.updatedAt || 0).getTime();

          const aValue = Number.isNaN(aTime) ? 0 : aTime;
          const bValue = Number.isNaN(bTime) ? 0 : bTime;

          return bValue - aValue;
        }),
    [collectionItems],
  );

  const isLoading = collectionLoading || collectionItemsLoading;
  const heading = headingOverride || collection?.name || `Collection #${collectionId}`;

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

  return (
    <Box component="section" sx={{ py: { xs: 6, md: 10 } }}>
      <Container>
        <Stack spacing={3} sx={{ maxWidth: 980, mx: 'auto' }}>
          <Link
            component={RouterLink}
            href={`${paths.universe.view(customerId)}#${backSectionAnchor}`}
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
            <Typography variant="h2">{heading}</Typography>
            <Typography variant="body2" color="text.secondary">
              {publicItems.length} shared item{publicItems.length === 1 ? '' : 's'}
            </Typography>
          </Stack>

          {!authenticated ? (
            <Typography variant="body2" color="text.secondary">
              Sign in to add reactions to collection items.{' '}
              <Link component={RouterLink} href={paths.auth.signIn} underline="hover">
                Sign in
              </Link>
            </Typography>
          ) : null}

          {isLoading ? (
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ py: 8 }}>
              <CircularProgress size={24} />
              <Typography color="text.secondary">Loading collection items...</Typography>
            </Stack>
          ) : publicItems.length === 0 ? (
            <Typography color="text.secondary">No shared items found for this collection.</Typography>
          ) : (
            <Stack spacing={2}>
              {publicItems.map((item) => (
                <CollectionItemCard
                  key={item.id}
                  item={item}
                  authenticated={authenticated}
                  viewerId={viewerId}
                  visitorId={visitorId}
                  visitorName={visitorName}
                  visitorAvatar={visitorAvatar}
                  ownerCustomerId={customerId}
                  isInitiallyViewed={viewedItemIdSet.has(String(item.id))}
                  viewedFlagLoading={viewedCollectionItemIdsLoading}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
