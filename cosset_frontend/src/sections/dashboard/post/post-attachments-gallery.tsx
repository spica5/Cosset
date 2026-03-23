'use client';

import type { Slide } from 'yet-another-react-lightbox';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/dashboard/iconify';
import { Lightbox } from 'src/components/dashboard/lightbox';
import { getS3SignedUrl } from 'src/utils/helper';

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

// ----------------------------------------------------------------------

export function PostAttachmentsGallery({
  files,
  heading = 'Attached files',
  stopPropagation = false,
  arrangeType = 'row',
  itemSpacing = 1,
  minItemWidth = 120,
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
              sx={{ width: arrangeType === 'grid' ? '100%' : imageWidth, position: 'relative' }}
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
                  width: '100%',
                  height: imageHeight,
                  borderRadius: 1,
                  objectFit: 'cover',
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
                sx={{ minWidth: 0 }}
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
              <Box
                component="video"
                src={url}
                controls
                onClick={(event) => {
                  if (stopPropagation) {
                    event.stopPropagation();
                  }
                }}
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
        <Stack direction="row" spacing={itemSpacing} useFlexGap flexWrap="wrap">
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
      imageWidth,
      itemSpacing,
      minItemWidth,
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
