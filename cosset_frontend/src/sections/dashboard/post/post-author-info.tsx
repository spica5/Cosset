'use client';

import { useEffect, useState } from 'react';

import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { getS3SignedUrl } from 'src/utils/helper';

import { Iconify } from 'src/components/dashboard/iconify';

// ----------------------------------------------------------------------

type PostAuthorInfoProps = {
  name?: string | null;
  email?: string | null;
  photoURL?: string | null;
  caption?: string;
  size?: number;
  href?: string;
  shopHref?: string | null;
};

export function PostAuthorInfo({
  name,
  email,
  photoURL,
  caption,
  size = 42,
  href,
  shopHref,
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

  const avatar = (
    <Avatar
      alt={displayName}
      src={signedPhotoUrl || undefined}
      sx={{
        width: size,
        height: size,
        border: '2px solid',
        borderColor: 'primary.main',
        ...(href
          ? {
              cursor: 'pointer',
              transition: (theme) =>
                theme.transitions.create(['box-shadow', 'transform'], {
                  duration: theme.transitions.duration.shorter,
                }),
              '&:hover': {
                boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}33`,
                transform: 'scale(1.03)',
              },
            }
          : null),
      }}
    >
      {initials}
    </Avatar>
  );

  return (
    <Stack spacing={0.75}>
      {caption ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {caption}
        </Typography>
      ) : null}

      <Stack direction="row" spacing={1} alignItems="center">
        {href ? (
          <Link
            component={RouterLink}
            href={href}
            color="inherit"
            underline="none"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            aria-label={`Open ${displayName}'s home space`}
          >
            {avatar}
          </Link>
        ) : (
          avatar
        )}

        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          {href ? (
            <Link
              component={RouterLink}
              href={href}
              color="inherit"
              underline="hover"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              sx={{ minWidth: 0 }}
            >
              <Typography variant="subtitle2" noWrap sx={{ color: 'primary.main' }}>
                {displayName}
              </Typography>
            </Link>
          ) : (
            <Typography variant="subtitle2" noWrap sx={{ color: 'primary.main' }}>
              {displayName}
            </Typography>
          )}

          {email ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
              {email}
            </Typography>
          ) : null}

          {shopHref ? (
            <Button
              component={RouterLink}
              href={shopHref}
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<Iconify icon="solar:shop-2-bold" width={16} />}
              onClick={(event) => event.stopPropagation()}
              sx={{
                alignSelf: 'flex-start',
                textTransform: 'none',
                fontWeight: 600,
                mt: 0.25,
              }}
            >
              Visit shop
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Stack>
  );
}
