'use client';

import { useEffect, useState } from 'react';

import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';

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
};

export function CoffeeShopChatAvatar({
  photoKeyOrUrl,
  name,
  size = 32,
  showTooltip = false,
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
        border: '2px solid rgba(255,255,255,0.2)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
      }}
    >
      {!src ? initialsFromName(name) : undefined}
    </Avatar>
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
