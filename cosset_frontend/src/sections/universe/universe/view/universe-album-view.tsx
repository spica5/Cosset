'use client';

import type { Slide } from 'yet-another-react-lightbox';
import type { IAlbumItem, IAlbumImage } from 'src/types/album';
import type { ReactionType } from 'src/actions/reaction';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getS3SignedUrl } from 'src/utils/helper';
import axiosInstance, { endpoints } from 'src/utils/axios';
import { recordAlbumView } from 'src/actions/album';
import {
  reactToAlbumForLoggedInCustomer,
  unreactToAlbumForLoggedInCustomer,
  useGetReactionSummary,
} from 'src/actions/reaction';
import { useAuthContext } from 'src/auth/hooks';

import { Iconify } from 'src/components/universe/iconify';
import { Lightbox, useLightBox } from 'src/components/dashboard/lightbox';

// ----------------------------------------------------------------------

type Props = {
  albumId: string;
};

type GalleryImageItem = {
  id: number | string;
  signedUrl: string;
  imageTitle?: string;
  description?: string;
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

const formatAlbumDate = (value: unknown) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
};

export function UniverseAlbumView({ albumId }: Props) {
  const { user, authenticated } = useAuthContext();
  const [album, setAlbum] = useState<IAlbumItem | null>(null);
  const [coverUrl, setCoverUrl] = useState('');
  const [images, setImages] = useState<Array<IAlbumImage & { signedUrl?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmittingReaction, setIsSubmittingReaction] = useState(false);

  const viewerId = user?.id ? String(user.id) : undefined;
  const { reactionSummary, reactionSummaryLoading, reactionSummaryValidating } = useGetReactionSummary(
    'album',
    albumId,
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

  const galleryItems = useMemo<GalleryImageItem[]>(() => {
    const imageItems = images
      .filter((image) => !!image.signedUrl)
      .map((image) => ({
        id: image.id,
        signedUrl: image.signedUrl!,
        imageTitle: image.imageTitle,
        description: image.description,
      }));

    if (!coverUrl) {
      return imageItems;
    }

    return [
      {
        id: `cover-${albumId}`,
        signedUrl: coverUrl,
        imageTitle: album?.title ? `${album.title} (Cover)` : 'Cover image',
        description: album?.description || undefined,
      },
      ...imageItems,
    ];
  }, [album?.description, album?.title, albumId, coverUrl, images]);

  const slides: Slide[] = useMemo(
    () =>
      galleryItems.map((image) => ({
          src: image.signedUrl!,
          alt: image.imageTitle || 'Album image',
          description:
            image.imageTitle && image.description
              ? `${image.imageTitle}: ${image.description}`
              : image.imageTitle || image.description || undefined,
        })),
    [galleryItems],
  );

  const lightbox = useLightBox(slides);

  const customerViewHref = album?.userId ? paths.universe.view(String(album.userId)) : paths.home;

  useEffect(() => {
    let mounted = true;

    const loadAlbumAndImages = async () => {
      try {
        setLoading(true);

        const [albumRes, imagesRes] = await Promise.all([
          axiosInstance.get(endpoints.album.details(albumId)),
          axiosInstance.get(endpoints.album.images.list(albumId)),
        ]);

        const fetchedAlbum = (albumRes.data?.album ?? null) as IAlbumItem | null;
        const fetchedImages = (imagesRes.data?.images ?? []) as IAlbumImage[];

        let signedCover = '';
        if (fetchedAlbum?.coverUrl) {
          if (fetchedAlbum.coverUrl.startsWith('http://') || fetchedAlbum.coverUrl.startsWith('https://')) {
            signedCover = fetchedAlbum.coverUrl;
          } else {
            signedCover = await getS3SignedUrl(fetchedAlbum.coverUrl);
          }
        }

        const imagesWithSignedUrls = await Promise.all(
          fetchedImages.map(async (image) => {
            const fileKey = image.fileUrl || '';
            if (!fileKey) return { ...image, signedUrl: '' };

            if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
              return { ...image, signedUrl: fileKey };
            }

            const signedUrl = await getS3SignedUrl(fileKey);
            return { ...image, signedUrl: signedUrl || '' };
          })
        );

        if (!mounted) return;

        setAlbum(fetchedAlbum);
        setCoverUrl(signedCover);
        setImages(imagesWithSignedUrls);
      } catch (error) {
        console.error('Failed to load universe album view data:', error);
        if (mounted) {
          setAlbum(null);
          setCoverUrl('');
          setImages([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadAlbumAndImages();

    return () => {
      mounted = false;
    };
  }, [albumId]);

  // Record a view once when the album is loaded (fire-and-forget).
  useEffect(() => {
    let active = true;

    const recordView = async () => {
      if (!album?.id) {
        return;
      }

      const result = await recordAlbumView(album.id);

      if (!active) {
        return;
      }

      const latestTotalViews =
        typeof result?.totalViews === 'number' && Number.isFinite(result.totalViews)
          ? Math.max(0, Math.trunc(result.totalViews))
          : null;

      if (latestTotalViews === null) {
        return;
      }

      setAlbum((prev) => (prev ? { ...prev, totalViews: latestTotalViews } : prev));
    };

    recordView();

    return () => {
      active = false;
    };
  }, [album?.id]);

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
        await unreactToAlbumForLoggedInCustomer(albumId);
      } else {
        await reactToAlbumForLoggedInCustomer(albumId, nextReaction);
      }
    } catch (error) {
      console.error('Failed to update album reaction', error);
      setOptimisticReaction(previousReaction);
      setOptimisticCounts(previousCounts);
    } finally {
      setIsSubmittingReaction(false);
    }
  };

  const totalImages = useMemo(() => images.length, [images.length]);

  if (loading) {
    return (
      <Container sx={{ py: 10 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
          <CircularProgress size={24} />
          <Typography color="text.secondary">Loading album...</Typography>
        </Stack>
      </Container>
    );
  }

  if (!album) {
    return (
      <Container sx={{ py: 10 }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Typography variant="h4">Album not found</Typography>
          <Typography color="text.secondary">This album is unavailable or has been removed.</Typography>
          <Link component={RouterLink} href={customerViewHref} underline="none" sx={{ color: 'primary.main' }}>
            Back to home
          </Link>
        </Stack>
      </Container>
    );
  }

  const totalReactionCount = REACTION_OPTIONS.reduce(
    (sum, option) => sum + (optimisticCounts[option.type] ?? 0),
    0,
  );
  const totalViews =
    typeof album.totalViews === 'number' && Number.isFinite(album.totalViews)
      ? Math.max(0, Math.trunc(album.totalViews))
      : 0;

  return (
    <Box component="section" sx={{ py: { xs: 6, md: 10 } }}>
      <Container>
        <Stack spacing={3} sx={{ maxWidth: 980, mx: 'auto' }}>
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

          <Card sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
              <Box sx={{ width: { xs: 1, md: '36%' }, flexShrink: 0 }}>
                {coverUrl ? (
                  <Box
                    component="img"
                    src={coverUrl}
                    alt={album.title}
                    onClick={() => {
                      if (galleryItems.length > 0) {
                        lightbox.setSelected(0);
                      }
                    }}
                    sx={{
                      width: 1,
                      height: { xs: 220, md: 280 },
                      objectFit: 'cover',
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: galleryItems.length > 0 ? 'pointer' : 'default',
                      transition: (theme) =>
                        theme.transitions.create('transform', {
                          duration: theme.transitions.duration.shorter,
                        }),
                      '&:hover': {
                        transform: galleryItems.length > 0 ? 'scale(1.02)' : 'none',
                      },
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 1,
                      height: { xs: 220, md: 280 },
                      borderRadius: 1.5,
                      border: '1px dashed',
                      borderColor: 'divider',
                      bgcolor: 'background.neutral',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Stack spacing={1} alignItems="center">
                      <Iconify icon="solar:album-linear" width={28} sx={{ color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        No cover image
                      </Typography>
                    </Stack>
                  </Box>
                )}
              </Box>

              <Stack spacing={1.25} sx={{ flexGrow: 1 }}>
                <Typography variant="h3">{album.title}</Typography>

                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Iconify icon="solar:gallery-wide-bold" width={18} sx={{ color: 'info.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    {album.category || 'Uncategorized'}
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Iconify icon="eva:image-fill" width={18} sx={{ color: 'success.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    {totalImages} image{totalImages === 1 ? '' : 's'}
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Iconify icon="eva:clock-outline" width={18} sx={{ color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Created: {formatAlbumDate(album.createdAt)}
                  </Typography>
                </Stack>

                <Divider sx={{ borderStyle: 'dashed', my: 0.75 }} />

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

                    <Stack direction="row" spacing={1.5} alignItems="center" useFlexGap flexWrap="wrap">
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'error.main' }}>
                        <Iconify icon="solar:heart-bold" width={24} />
                        <Typography variant="caption">{totalReactionCount} reactions</Typography>
                      </Stack>

                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'warning.main' }}>
                        <Iconify icon="solar:eye-bold" width={22} />
                        <Typography variant="caption">{totalViews} views</Typography>
                      </Stack>
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
              </Stack>
            </Stack>
          </Card>

          <Card sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
            <Stack spacing={1.5}>
              <Typography variant="h4">Description</Typography>
              <Divider sx={{ borderStyle: 'dashed' }} />
              <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                {album.description || 'No description'}
              </Typography>
            </Stack>
          </Card>

          <Card sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
            <Stack spacing={1.5}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Iconify icon="solar:gallery-bold" width={22} sx={{ color: 'primary.main' }} />
                  <Typography variant="h4">Photo Gallery</Typography>
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {galleryItems.length} viewable image{galleryItems.length === 1 ? '' : 's'}
                </Typography>
              </Stack>

              <Divider sx={{ borderStyle: 'dashed' }} />

              {galleryItems.length === 0 ? (
                <Typography color="text.secondary">No images in this album.</Typography>
              ) : (
                <Grid container spacing={2}>
                  {galleryItems.map((image, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={String(image.id)}>
                      <Card
                        onClick={() => lightbox.setSelected(index)}
                        sx={{
                          cursor: 'pointer',
                          overflow: 'hidden',
                          borderRadius: 1.5,
                          border: '1px dashed',
                          borderColor: 'divider',
                          position: 'relative',
                          '&:hover img': { transform: 'scale(1.04)' },
                          '&:hover .image-overlay': { opacity: 1 },
                        }}
                      >
                        <Box
                          component="img"
                          src={image.signedUrl}
                          alt={image.imageTitle || 'Album image'}
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
                          className="image-overlay"
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            bgcolor: 'rgba(0, 0, 0, 0.32)',
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              bgcolor: 'rgba(255,255,255,0.92)',
                              display: 'grid',
                              placeItems: 'center',
                            }}
                          >
                            <Iconify icon="solar:eye-bold" width={18} sx={{ color: 'text.primary' }} />
                          </Box>
                        </Box>

                        {(image.imageTitle || image.description) && (
                          <CardContent sx={{ py: 1.25 }}>
                            <Typography variant="subtitle2" noWrap>
                              {image.imageTitle || 'Untitled'}
                            </Typography>
                            {image.description && (
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {image.description}
                              </Typography>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Stack>
          </Card>
        </Stack>
      </Container>

      <Lightbox slides={slides} open={lightbox.open} close={lightbox.onClose} index={lightbox.selected} />
    </Box>
  );
}
