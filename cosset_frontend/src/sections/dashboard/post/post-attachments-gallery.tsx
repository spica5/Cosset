'use client';

import type { Slide } from 'yet-another-react-lightbox';
import type { SxProps, Theme } from '@mui/material/styles';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { getS3SignedUrl } from 'src/utils/helper';

import { Iconify } from 'src/components/dashboard/iconify';
import { Lightbox } from 'src/components/dashboard/lightbox';

// ----------------------------------------------------------------------

type AttachmentType = 'image' | 'video' | 'pdf';
type ArrangeType = 'row' | 'grid';

type Props = {
  files?: string | null;
  heading?: string;
  stopPropagation?: boolean;
  arrangeType?: ArrangeType;
  itemSpacing?: number;
  minItemWidth?: number;
  imageWidth?: number;
  imageHeight?: number;
  videoWidth?: number;
  allowRemove?: boolean;
  onRemoveAttachment?: (key: string) => void;
  onPreview?: () => void;
};

type PostAttachmentVideoProps = {
  src: string;
  stopPropagation?: boolean;
  sx?: SxProps<Theme>;
};

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];
const videoExtensions = ['mp4', 'mov', 'webm'];

const normalizeForTypeCheck = (value: string) => value.toLowerCase().split('?')[0].split('#')[0];

const hasExtension = (value: string, extensions: string[]) =>
  extensions.some((ext) => value.endsWith(`.${ext}`));

const parseStorageKeys = (value?: string | null): string[] => {
  const raw = (value || '').trim();
  if (!raw) {
    return [];
  }

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || '').trim())
          .filter((item) => !!item);
      }
    } catch (error) {
      // Fallback to line/comma parsing.
    }
  }

  return raw
    .split(/[\r\n,]+/)
    .map((item) => item.trim())
    .filter((item) => !!item);
};

const getAttachmentTypeFromKey = (key: string): AttachmentType => {
  const normalized = normalizeForTypeCheck(key);

  if (normalized.includes('/images/') || hasExtension(normalized, imageExtensions)) {
    return 'image';
  }

  if (normalized.includes('/videos/') || hasExtension(normalized, videoExtensions)) {
    return 'video';
  }

  return 'pdf';
};

const getVideoMimeType = (value: string) => {
  const normalized = normalizeForTypeCheck(value);

  if (normalized.endsWith('.mov')) {
    return 'video/quicktime';
  }

  if (normalized.endsWith('.webm')) {
    return 'video/webm';
  }

  return 'video/mp4';
};

function PostAttachmentVideo({ src, stopPropagation = false, sx }: PostAttachmentVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) {
      return undefined;
    }

    const playWhenVisible = () => {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => undefined);
      }
    };

    const stopPlayback = () => {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // ignore seek errors before metadata is ready
      }
    };

    const isEnoughVisible = () => {
      const rect = container.getBoundingClientRect();
      const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
      return rect.height > 0 ? visibleHeight / rect.height >= 0.35 : false;
    };

    const onLoadedData = () => {
      if (isEnoughVisible()) {
        playWhenVisible();
      } else {
        stopPlayback();
      }
    };

    video.addEventListener('loadeddata', onLoadedData);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          playWhenVisible();
        } else {
          stopPlayback();
        }
      },
      { threshold: [0, 0.15, 0.35, 0.6, 1] },
    );

    observer.observe(container);

    return () => {
      video.removeEventListener('loadeddata', onLoadedData);
      observer.disconnect();
      stopPlayback();
    };
  }, [src]);

  return (
    <Box ref={containerRef} sx={{ width: 1 }}>
      <Box
        component="video"
        ref={videoRef}
        key={src}
        src={src}
        muted
        loop
        playsInline
        controls
        preload="metadata"
        onClick={(event) => {
          if (stopPropagation) {
            event.stopPropagation();
          }
        }}
        sx={sx}
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function PostAttachmentsGallery({
  files,
  heading = 'Attached files',
  stopPropagation = false,
  arrangeType = 'row',
  itemSpacing = 1,
  minItemWidth = 100,
  imageWidth = 200,
  imageHeight = 120,
  videoWidth = 280,
  allowRemove = false,
  onRemoveAttachment,
  onPreview,
}: Props) {
  const [signedUrlMap, setSignedUrlMap] = useState<Record<string, string>>({});
  const [lightboxSlides, setLightboxSlides] = useState<Slide[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const attachmentKeys = useMemo(() => parseStorageKeys(files), [files]);

  const imageKeys = useMemo(
    () => attachmentKeys.filter((key) => getAttachmentTypeFromKey(key) === 'image'),
    [attachmentKeys],
  );
  const videoKeys = useMemo(
    () => attachmentKeys.filter((key) => getAttachmentTypeFromKey(key) === 'video'),
    [attachmentKeys],
  );
  const pdfKeys = useMemo(
    () => attachmentKeys.filter((key) => getAttachmentTypeFromKey(key) === 'pdf'),
    [attachmentKeys],
  );

  useEffect(() => {
    let mounted = true;

    const unresolvedKeys = attachmentKeys.filter((key) => !!key && !signedUrlMap[key]);

    if (!unresolvedKeys.length) {
      return () => {
        mounted = false;
      };
    }

    const loadSignedUrls = async () => {
      const results = await Promise.all(
        unresolvedKeys.map(async (key) => {
          if (/^https?:\/\//i.test(key)) {
            return { key, url: key };
          }

          const url = await getS3SignedUrl(key);
          return { key, url };
        }),
      );

      if (!mounted) {
        return;
      }

      setSignedUrlMap((prev) => {
        const next = { ...prev };

        results.forEach(({ key, url }) => {
          if (url) {
            next[key] = url;
          }
        });

        return next;
      });
    };

    loadSignedUrls();

    return () => {
      mounted = false;
    };
  }, [attachmentKeys, signedUrlMap]);

  const buildLightboxSlides = useCallback(
    (previewImageKeys: string[], previewVideoKeys: string[]) => {
      const imageSlides: Slide[] = previewImageKeys
        .map((key) => signedUrlMap[key])
        .filter((url): url is string => !!url)
        .map((url) => ({ src: url }));

      const videoSlides: Slide[] = previewVideoKeys
        .map((key) => ({ key, url: signedUrlMap[key] }))
        .filter((item): item is { key: string; url: string } => !!item.url)
        .map(({ key, url }) => ({
          type: 'video',
          width: 1280,
          height: 720,
          poster: url,
          sources: [{ src: url, type: getVideoMimeType(key) }],
        }));

      return [...imageSlides, ...videoSlides];
    },
    [signedUrlMap],
  );

  const handleOpenLightbox = useCallback((slides: Slide[], index: number) => {
    if (!slides.length) {
      return;
    }

    setLightboxSlides(slides);
    setLightboxIndex(index);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxIndex(-1);
  }, []);

  const handleBlockClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (stopPropagation) {
        event.stopPropagation();
      }
    },
    [stopPropagation],
  );

  const handleBlockKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (stopPropagation) {
        event.stopPropagation();
      }
    },
    [stopPropagation],
  );

  const renderAttachmentPreview = useCallback(
    (keys: string[], type: AttachmentType) => {
      if (!keys.length) {
        return null;
      }

      const mediaSlides =
        type === 'image'
          ? buildLightboxSlides(keys, [])
          : type === 'video'
            ? buildLightboxSlides([], keys)
            : [];

      const items = keys.map((key, index) => {
        const url = signedUrlMap[key];
        const displayName = `${type.toUpperCase()} ${index + 1}`;

        if (!url) {
          return <Chip key={`${type}-${key}-${index}`} size="small" label={`${displayName} loading`} />;
        }

        const removeButton = allowRemove && onRemoveAttachment ? (
          <IconButton
            size="small"
            color="error"
            onClick={(event) => {
              if (stopPropagation) {
                event.stopPropagation();
              }
              onRemoveAttachment(key);
            }}
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              zIndex: 1,
              bgcolor: 'background.paper',
            }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" width={16} />
          </IconButton>
        ) : null;

        if (type === 'image') {
          return (
            <Stack
              key={`${type}-${key}-${index}`}
              spacing={0.5}
              sx={{
                width: arrangeType === 'grid' ? '100%' : 'auto',
                maxWidth: '100%',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {removeButton}
              <Box
                component="img"
                src={url}
                alt={displayName}
                onClick={(event) => {
                  if (stopPropagation) {
                    event.stopPropagation();
                  }
                  onPreview?.();
                  handleOpenLightbox(mediaSlides, index);
                }}
                sx={{
                  height: imageHeight,
                  width: arrangeType === 'grid' ? '100%' : 'auto',
                  maxWidth: '100%',
                  minWidth: arrangeType === 'grid' ? undefined : minItemWidth,
                  borderRadius: 1,
                  objectFit: 'contain',
                  objectPosition: 'center',
                  display: 'block',
                  bgcolor: 'grey.100',
                  cursor: mediaSlides.length ? 'pointer' : 'default',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
              <Button
                size="small"
                variant="text"
                disabled={!mediaSlides.length}
                onClick={(event) => {
                  if (stopPropagation) {
                    event.stopPropagation();
                  }
                  onPreview?.();
                  handleOpenLightbox(mediaSlides, index);
                }}
                sx={{ minWidth: 0, alignSelf: 'flex-start' }}
              >
                Preview
              </Button>
            </Stack>
          );
        }

        if (type === 'video') {
          return (
            <Stack
              key={`${type}-${key}-${index}`}
              spacing={0.5}
              sx={{
                width: arrangeType === 'grid' ? '100%' : { xs: '100%', sm: videoWidth },
                position: 'relative',
              }}
            >
              {removeButton}
              <PostAttachmentVideo
                src={url}
                stopPropagation={stopPropagation}
                sx={{
                  width: '100%',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
              <Button
                size="small"
                variant="text"
                disabled={!mediaSlides.length}
                onClick={(event) => {
                  if (stopPropagation) {
                    event.stopPropagation();
                  }
                  onPreview?.();
                  handleOpenLightbox(mediaSlides, index);
                }}
                sx={{ alignSelf: 'flex-start', minWidth: 0 }}
              >
                Preview Video
              </Button>
            </Stack>
          );
        }

        return (
          <Box key={`${type}-${key}-${index}`} sx={{ position: 'relative', justifySelf: 'start' }}>
            {removeButton}
            <Button
              component="a"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              variant="outlined"
              onClick={(event) => {
                if (stopPropagation) {
                  event.stopPropagation();
                }
                onPreview?.();
              }}
            >
              View PDF {index + 1}
            </Button>
          </Box>
        );
      });

      if (arrangeType === 'grid') {
        return (
          <Box
            sx={{
              display: 'grid',
              gap: itemSpacing,
              gridTemplateColumns: `repeat(auto-fill, minmax(${minItemWidth}px, 1fr))`,
              alignItems: 'start',
            }}
          >
            {items}
          </Box>
        );
      }

      return (
        <Stack
          direction="row"
          spacing={itemSpacing}
          useFlexGap
          flexWrap="wrap"
          alignItems="flex-start"
        >
          {items}
        </Stack>
      );
    },
    [
      allowRemove,
      arrangeType,
      buildLightboxSlides,
      handleOpenLightbox,
      imageHeight,
      itemSpacing,
      minItemWidth,
      onPreview,
      onRemoveAttachment,
      signedUrlMap,
      stopPropagation,
      videoWidth,
    ],
  );

  if (!attachmentKeys.length) {
    return null;
  }

  return (
    <>
      <Stack
        spacing={1}
        sx={{ mt: 1.25 }}
        onClick={handleBlockClick}
        onKeyDown={handleBlockKeyDown}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {heading}
        </Typography>

        {imageKeys.length > 0 ? renderAttachmentPreview(imageKeys, 'image') : null}
        {videoKeys.length > 0 ? renderAttachmentPreview(videoKeys, 'video') : null}
        {pdfKeys.length > 0 ? renderAttachmentPreview(pdfKeys, 'pdf') : null}
      </Stack>

      <Lightbox
        slides={lightboxSlides}
        open={lightboxIndex >= 0}
        close={handleCloseLightbox}
        index={lightboxIndex}
      />
    </>
  );
}
