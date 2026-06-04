'use client';

import { useEffect, useState } from 'react';

import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import { Iconify } from 'src/components/universe/iconify';

import { getS3SignedUrl } from 'src/utils/helper';

// ----------------------------------------------------------------------

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase().slice(0, 2);
  }
  return (parts[0]?.[0] || '?').toUpperCase();
}

type Props = {
  photoKeyOrUrl?: string | null;
  name: string;
  size?: number;
  showTooltip?: boolean;
  status?: 'online' | 'left' | undefined;
  isFriend?: boolean;
  isCurrentUser?: boolean;
};

export function CoffeeShopChatAvatar({
  photoKeyOrUrl,
  name,
  size = 32,
  showTooltip = false,
  status,
  isFriend = false,
  isCurrentUser = false,
}: Props) {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const raw = String(photoKeyOrUrl || '').trim();

    if (!raw) {
      setSrc(undefined);
      return undefined;
    }

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      setSrc(raw);
      return undefined;
    }

    (async () => {
      const url = await getS3SignedUrl(raw);
      if (!cancelled) {
        setSrc(url || undefined);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [photoKeyOrUrl]);

  const avatar = (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      <Avatar
      src={src}
      alt={name}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        flexShrink: 0,
        bgcolor: 'rgba(255,255,255,0.12)',
        color: 'common.white',
        border: isCurrentUser ? '3px solid orangered' : '2px solid rgba(255,255,255,0.2)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
      }}
    >
      {!src ? initialsFromName(name) : undefined}
    </Avatar>

      {status ? (
        <Tooltip title={status === 'online' ? 'Online' : 'Offline'} placement="top">
          <Box
            sx={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: Math.max(10, Math.round(size * 0.25)),
              height: Math.max(10, Math.round(size * 0.25)),
              borderRadius: '50%',
              border: '2px solid rgba(0,0,0,0.8)',
              bgcolor: status === 'online' ? '#2ecc71' : '#f1c40f',
              boxShadow: '0 0 4px rgba(0,0,0,0.5)',
            }}
          />
        </Tooltip>
      ) : null}

      {isFriend ? (
        <Box
          sx={{
            position: 'absolute',
            left: -4,
            top: -4,
            width: Math.max(20, Math.round(size * 0.28)),
            height: Math.max(20, Math.round(size * 0.28)),            
            bgcolor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'common.white',
          }}
        >
          <Iconify
            icon="mdi:heart"
            width={Math.max(10, Math.round(size * 0.18))}
            color="orangered"
          />
        </Box>
      ) : null}
    </Box>
  );

  if (showTooltip) {
    return (
      <Tooltip title={name} placement="left" arrow>
        <span>{avatar}</span>
      </Tooltip>
    );
  }

  return avatar;
}
