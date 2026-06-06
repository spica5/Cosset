'use client';

import { useState, useEffect } from 'react';

import Avatar, { type AvatarProps } from '@mui/material/Avatar';

import { getS3SignedUrl } from 'src/utils/helper';

// ----------------------------------------------------------------------

type Props = AvatarProps & {
  name: string;
  photoKeyOrUrl?: string | null;
};

export function MailAvatar({ name, photoKeyOrUrl, ...other }: Props) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const raw = String(photoKeyOrUrl || '').trim();
      if (!raw) {
        if (!cancelled) {
          setSrc('');
        }
        return;
      }

      if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) {
        if (!cancelled) {
          setSrc(raw);
        }
        return;
      }

      const signed = await getS3SignedUrl(raw);
      if (!cancelled) {
        setSrc(signed);
      }
    };

    resolve();

    return () => {
      cancelled = true;
    };
  }, [photoKeyOrUrl]);

  return (
    <Avatar alt={name} src={src || undefined} {...other}>
      {name.charAt(0).toUpperCase()}
    </Avatar>
  );
}
