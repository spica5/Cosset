'use client';

import type { AvatarProps } from '@mui/material/Avatar';

import { useState, useEffect } from 'react';

import Avatar from '@mui/material/Avatar';

import { getS3SignedUrl } from 'src/utils/helper';

// ----------------------------------------------------------------------

async function resolveAvatarSrc(raw: string): Promise<string> {
  const value = String(raw || '').trim();
  if (!value) return '';

  if (value.startsWith('public:')) {
    return value.replace(/^public:/, '');
  }

  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return value;
  }

  return (await getS3SignedUrl(value)) || '';
}

type Props = AvatarProps & {
  src?: string | null;
  fallback?: string;
};

export function ChatAvatar({ src, alt, fallback, children, ...other }: Props) {
  const [resolvedSrc, setResolvedSrc] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const url = await resolveAvatarSrc(String(src || ''));
        if (!cancelled) {
          setResolvedSrc(url);
        }
      } catch {
        if (!cancelled) {
          setResolvedSrc('');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  const initial =
    fallback ||
    (typeof alt === 'string' && alt.trim() ? alt.trim().charAt(0).toUpperCase() : undefined);

  return (
    <Avatar alt={alt} src={resolvedSrc || undefined} {...other}>
      {children ?? initial}
    </Avatar>
  );
}
