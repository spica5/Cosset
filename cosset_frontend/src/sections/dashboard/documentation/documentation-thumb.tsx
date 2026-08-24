'use client';

import type { IDocumentationDocument } from 'src/types/documentation';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';

import { getS3SignedUrl } from 'src/utils/helper';

import { Iconify } from 'src/components/dashboard/iconify';

import {
  isDocumentationImage,
  isDocumentationVideo,
} from './documentation-utils';

// ----------------------------------------------------------------------

type Props = {
  document: IDocumentationDocument;
  size?: number;
};

export function DocumentationThumb({ document, size = 56 }: Props) {
  const isImage = isDocumentationImage(document.fileType, document.originalFileName);
  const isVideo = isDocumentationVideo(document.fileType, document.originalFileName);
  const [previewUrl, setPreviewUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setPreviewUrl('');
    setFailed(false);

    if ((!isImage && !isVideo) || !document.fileUrl) {
      return undefined;
    }

    getS3SignedUrl(document.fileUrl)
      .then((url) => {
        if (!cancelled) {
          setPreviewUrl(url || '');
          if (!url) {
            setFailed(true);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [document.fileUrl, isImage, isVideo]);

  const showImage = isImage && previewUrl && !failed;
  const showVideo = isVideo && previewUrl && !failed;

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1.5,
        bgcolor: 'background.neutral',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {showImage ? (
        <Box
          component="img"
          src={previewUrl}
          alt={document.title || document.originalFileName || 'Document preview'}
          onError={() => setFailed(true)}
          sx={{
            width: 1,
            height: 1,
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : null}

      {showVideo ? (
        <>
          <Box
            component="video"
            src={`${previewUrl}#t=0.1`}
            muted
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
            sx={{
              width: 1,
              height: 1,
              objectFit: 'cover',
              display: 'block',
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.28)',
            }}
          >
            <Iconify icon="solar:play-bold" width={18} sx={{ color: 'common.white' }} />
          </Box>
        </>
      ) : null}

      {!showImage && !showVideo ? (
        <Iconify
          icon={
            isVideo
              ? 'solar:videocamera-record-bold'
              : isImage
                ? 'solar:gallery-bold'
                : 'solar:document-bold'
          }
          width={Math.round(size * 0.45)}
        />
      ) : null}
    </Box>
  );
}
