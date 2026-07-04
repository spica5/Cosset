'use client';

import { useEffect, useState } from 'react';

import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { getS3SignedUrl } from 'src/utils/helper';
import { parseCoffeeShopBackgroundImages } from 'src/utils/coffee-shop-background';

import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

export type CoffeeShopItemCardProps = {
  id: number;
  name: string;
  title?: string | null;
  description?: string | null;
  background?: string | null;
  coverImage?: string | null;
  files?: string | null;
  previewHref?: string;
  commentCount?: number;
  fileCount?: number;
  memberNames?: string[];
  createdAt?: string | Date | null;
  canManage?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onEnter?: () => void;
};

const getPreviewBackground = (background: string | null | undefined) => {
  const normalized = (background || '').trim();

  if (!normalized) {
    return { backgroundColor: 'background.neutral' };
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return {
      background: `url(${normalized}) center / cover no-repeat`,
    };
  }

  if (normalized.includes('gradient(')) {
    return { background: normalized };
  }

  return { backgroundColor: 'background.neutral' };
};

const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
};

const getInitial = (name: string) => (name.trim().charAt(0) || '?').toUpperCase();

export function CoffeeShopItem({
  id,
  name,
  title,
  description,
  background,
  coverImage,
  files,
  previewHref,
  commentCount = 0,
  fileCount = 0,
  memberNames = [],
  createdAt,
  canManage = false,
  isFavorite = false,
  onToggleFavorite,
  onEdit,
  onDelete,
  onEnter,
}: CoffeeShopItemCardProps) {
  const [resolvedBackground, setResolvedBackground] = useState<string>(background || '');
  const [resolvedCoverImage, setResolvedCoverImage] = useState<string>(coverImage || '');

  const openBackgroundPreviewWindow = () => {
    if (!previewHref) {
      return;
    }

    window.open(previewHref, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    let mounted = true;

    const resolveBackground = async () => {
      const normalized = (background || '').trim();

      if (!normalized) {
        if (mounted) {
          setResolvedBackground('');
        }
        return;
      }

      if (
        normalized.startsWith('http://') ||
        normalized.startsWith('https://') ||
        normalized.includes('gradient(')
      ) {
        if (mounted) {
          setResolvedBackground(normalized);
        }
        return;
      }

      const keys = parseCoffeeShopBackgroundImages(normalized);
      const firstKey = keys[0];
      if (!firstKey) {
        if (mounted) {
          setResolvedBackground('');
        }
        return;
      }

      if (firstKey.startsWith('http://') || firstKey.startsWith('https://')) {
        if (mounted) {
          setResolvedBackground(firstKey);
        }
        return;
      }

      const signedUrl = await getS3SignedUrl(firstKey);

      if (mounted) {
        setResolvedBackground(signedUrl || firstKey);
      }
    };

    resolveBackground();

    return () => {
      mounted = false;
    };
  }, [background]);

  useEffect(() => {
    let mounted = true;

    const resolve = async () => {
      const raw = (coverImage || '').trim();

      if (!raw) {
        if (mounted) setResolvedCoverImage('');
        return;
      }

      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        if (mounted) setResolvedCoverImage(raw);
        return;
      }

      const signedUrl = await getS3SignedUrl(raw);
      if (mounted) setResolvedCoverImage(signedUrl || raw);
    };

    resolve();

    return () => {
      mounted = false;
    };
  }, [coverImage]);

  const previewBackground = getPreviewBackground(resolvedBackground);

  const displayImage = resolvedCoverImage || resolvedBackground;
  const hasImage =
    !!displayImage &&
    (displayImage.includes('gradient(') || displayImage.startsWith('http'));

  return (
    <Card sx={{ p: 1.25, border: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={1}>
        <Box
          onClick={openBackgroundPreviewWindow}
          sx={{
            position: 'relative',
            width: '100%',
            pt: { xs: '56%', sm: '52%', md: '50%' },
            borderRadius: 1.25,
            overflow: 'hidden',
            cursor: 'zoom-in',
          }}
        >
          {resolvedCoverImage ? (
            <Box
              component="img"
              src={resolvedCoverImage}
              alt={title || name}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                ...previewBackground,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {!hasImage ? (
                <Iconify icon="solar:gallery-bold" width={20} sx={{ color: 'text.disabled' }} />
              ) : null}
            </Box>
          )}

          {onToggleFavorite ? (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(id);
              }}
              sx={{
                position: 'absolute',
                top: 6,
                right: 6,
                bgcolor: 'rgba(0,0,0,0.4)',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
              }}
            >
              <Iconify
                icon={isFavorite ? 'solar:heart-bold' : 'solar:heart-linear'}
                width={18}
                sx={{ color: isFavorite ? '#ff4d6a' : '#fff' }}
              />
            </IconButton>
          ) : null}
        </Box>

        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography variant="subtitle2" noWrap sx={{ minWidth: 0, flex: 1 }}>
            {title || name}
          </Typography>

          <Stack direction="row" spacing={0.25} alignItems="center">
            {canManage ? (
              <>
                <IconButton size="small" onClick={() => onEdit?.(id)} title="Edit coffee shop">
                  <Iconify icon="solar:pen-bold" width={15} />
                </IconButton>

                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete?.(id)}
                  title="Delete coffee shop"
                >
                  <Iconify icon="solar:trash-bin-trash-bold" width={15} />
                </IconButton>
              </>
            ) : null}

            {onEnter ? (
              <IconButton size="small" onClick={onEnter} title="Enter coffee shop">
                <Iconify icon="ic:round-open-in-new" width={16} />
              </IconButton>
            ) : null}
          </Stack>
        </Stack>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: { xs: 'auto', sm: 32 },
          }}
        >
          {description || 'No description'}
        </Typography>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Iconify icon="solar:chat-round-dots-bold" width={14} sx={{ color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {commentCount}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.5} alignItems="center">
              <Iconify icon="solar:paperclip-2-bold" width={14} sx={{ color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {fileCount || (files ? 1 : 0)}
              </Typography>
            </Stack>
          </Stack>

          {memberNames.length > 0 ? (
            <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 11 } }}>
              {memberNames.map((member) => (
                <Avatar key={member}>{getInitial(member)}</Avatar>
              ))}
            </AvatarGroup>
          ) : null}
        </Stack>

        <Typography variant="caption" color="text.disabled" noWrap>
          {formatDateTime(createdAt)}
        </Typography>
      </Stack>
    </Card>
  );
}
