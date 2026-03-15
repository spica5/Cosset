'use client';

import { useEffect, useState } from 'react';

import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { getS3SignedUrl } from 'src/utils/helper';

// ----------------------------------------------------------------------

type PostAuthorInfoProps = {
  name?: string | null;
  email?: string | null;
  photoURL?: string | null;
  caption?: string;
  size?: number;
};

export function PostAuthorInfo({
  name,
  email,
  photoURL,
  caption,
  size = 42,
}: PostAuthorInfoProps) {
  const [signedPhotoUrl, setSignedPhotoUrl] = useState('');

  useEffect(() => {
    let mounted = true;

    const resolvePhotoUrl = async () => {
      const photoKey = String(photoURL || '').trim();

      if (!photoKey) {
        if (mounted) {
          setSignedPhotoUrl('');
        }
        return;
      }

      if (
        photoKey.startsWith('http://') ||
        photoKey.startsWith('https://') ||
        photoKey.startsWith('/')
      ) {
        if (mounted) {
          setSignedPhotoUrl(photoKey);
        }
        return;
      }

      const signedUrl = await getS3SignedUrl(photoKey);

      if (mounted) {
        setSignedPhotoUrl(signedUrl || '');
      }
    };

    resolvePhotoUrl();

    return () => {
      mounted = false;
    };
  }, [photoURL]);

  const displayName = String(name || email || 'Customer').trim() || 'Customer';
  const initials = displayName.charAt(0).toUpperCase() || 'C';

  return (
    <Stack spacing={0.75}>
      {caption ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {caption}
        </Typography>
      ) : null}

      <Stack direction="row" spacing={1} alignItems="center">
        <Avatar
          alt={displayName}
          src={signedPhotoUrl || undefined}
          sx={{
            width: size,
            height: size,
            border: '2px solid',
            borderColor: 'primary.main',
          }}
        >
          {initials}
        </Avatar>

        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ color: 'primary.main' }}>
            {displayName}
          </Typography>

          {email ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
              {email}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </Stack>
  );
}