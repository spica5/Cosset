'use client';

import type { Slide } from 'yet-another-react-lightbox';

import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getS3SignedUrl } from 'src/utils/helper';

import { useGetCollection } from 'src/actions/collection';
import { useGetCollectionItems } from 'src/actions/collection-item';

import { Iconify } from 'src/components/universe/iconify';
import { Lightbox, useLightBox } from 'src/components/dashboard/lightbox';

// ----------------------------------------------------------------------

type Props = {
  customerId: string;
  collectionId: string;
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

export function UniverseCollectionItemListView({ customerId, collectionId }: Props) {
  const { collection, collectionLoading } = useGetCollection(collectionId);
  const { collectionItems, collectionItemsLoading } = useGetCollectionItems(collectionId, customerId);

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
  const heading = collection?.name || `Collection #${collectionId}`;

  return (
    <Box component="section" sx={{ py: { xs: 6, md: 10 } }}>
      <Container>
        <Stack spacing={3} sx={{ maxWidth: 980, mx: 'auto' }}>
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
            <Iconify icon="solar:alt-arrow-left-outline" />
            Back
          </Link>

          <Stack spacing={1}>
            <Typography variant="h2">{heading}</Typography>
            <Typography variant="body2" color="text.secondary">
              {publicItems.length} shared item{publicItems.length === 1 ? '' : 's'}
            </Typography>
          </Stack>

          {isLoading ? (
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ py: 8 }}>
              <CircularProgress size={24} />
              <Typography color="text.secondary">Loading collection items...</Typography>
            </Stack>
          ) : publicItems.length === 0 ? (
            <Typography color="text.secondary">No shared items found for this collection.</Typography>
          ) : (
            <Stack spacing={2}>
              {publicItems.map((item) => {
                const imageKeys = parseSerializedItems(item.images);
                const videoKeys = parseSerializedItems(item.videos);
                const fileKeys = parseSerializedItems(item.files);

                const imageCount = imageKeys.length;
                const videoCount = videoKeys.length;
                const fileCount = fileKeys.length;

                return (
                  <Card key={item.id} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                      <Stack spacing={1.2}>
                        <Stack direction="row" spacing={0.9} alignItems="center">
                          <Iconify
                            icon="solar:bookmark-square-minimalistic-bold"
                            width={16}
                            sx={{ color: 'primary.main' }}
                          />
                          <Typography variant="h6" noWrap>
                            {(item.title || '').trim() || `Item #${item.id}`}
                          </Typography>
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
                            <Iconify icon="solar:video-frame-play-horizontal-bold" width={14} sx={{ color: 'warning.main' }} />
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

                        <CollectionItemMediaGallery imageKeys={imageKeys} videoKeys={videoKeys} />
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
