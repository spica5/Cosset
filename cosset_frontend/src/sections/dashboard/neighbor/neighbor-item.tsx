import type { INeighborItem } from 'src/types/neighbor';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import ListItemText from '@mui/material/ListItemText';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/config-global';

import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import { getS3SignedUrl } from 'src/utils/helper';

import { _moodIcons } from 'src/_mock/assets';
import { getMoodDisplayIcon } from 'src/utils/mood-templates';

import { Image } from 'src/components/dashboard/image';
import { Iconify } from 'src/components/dashboard/iconify';

// ----------------------------------------------------------------------

type Props = {
  neighbor: INeighborItem;
  onView: () => void;
};

const _motifAvatars: Record<string, string> = {
  'Welcome guests': '👋',
  'Be Away': '🚪',
  'Be back soon.': '⏳',
};

const getMotifAvatar = (motif?: string) => _motifAvatars[motif || ''] || '✨';
const getMoodAvatar = (mood?: string) => _moodIcons[mood || ''] || getMoodDisplayIcon(mood);

// ----------------------------------------------------------------------

export function NeighborItem({ neighbor, onView }: Props) {
  const universeHref = paths.universe.view(neighbor.id);

  const defaultCoverImage = `${CONFIG.dashboard.assetsDir}/assets/images/guest-area/cosset_default.png`;
  const coverKey = (neighbor.images?.[0] || '').trim();
  const image1Key = (neighbor.images?.[1] || '').trim();
  const image2Key = (neighbor.images?.[2] || '').trim();

  const [signedCoverUrl, setSignedCoverUrl] = useState('');
  const [signedImage1, setSignedImage1] = useState('');
  const [signedImage2, setSignedImage2] = useState('');
  const [signedAvatarUrl, setSignedAvatarUrl] = useState('');

  useEffect(() => {
    let mounted = true;

    const resolveImage = async (
      key: string,
      setter: (url: string) => void,
      emptyFallback = ''
    ) => {
      const imageKey = (key || '').trim();

      // Default image only when the source slot is empty.
      if (!imageKey) {
        if (mounted) setter(emptyFallback);
        return;
      }

      if (
        imageKey.startsWith('http://') ||
        imageKey.startsWith('https://') ||
        imageKey.startsWith('/')
      ) {
        if (mounted) setter(imageKey);
        return;
      }

      const signed = await getS3SignedUrl(imageKey);
      // Keep the real image; never replace a non-empty source with the default.
      if (mounted) setter(signed || '');
    };

    resolveImage(coverKey, setSignedCoverUrl, defaultCoverImage);
    resolveImage(image1Key, setSignedImage1, defaultCoverImage);
    resolveImage(image2Key, setSignedImage2, defaultCoverImage);
    resolveImage(neighbor.avatarUrl || '', setSignedAvatarUrl);

    return () => {
      mounted = false;
    };
  }, [coverKey, image1Key, image2Key, neighbor.avatarUrl, defaultCoverImage]);

  const coverSrc = coverKey ? signedCoverUrl : defaultCoverImage;
  const image1Src = image1Key ? signedImage1 : defaultCoverImage;
  const image2Src = image2Key ? signedImage2 : defaultCoverImage;

  const renderRating = (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        top: 8,
        right: 8,
        zIndex: 9,
        borderRadius: 1,
        position: 'absolute',
        p: '2px 6px 2px 4px',
        typography: 'subtitle2',
        bgcolor: neighbor.isFriend ? 'success.lighter' : 'warning.lighter',
        color: 'grey.900',
      }}
    >
      <Iconify
        icon={
          neighbor.isCurrentUser
            ? 'solar:user-bold'
            : neighbor.isFriend
              ? 'solar:verified-check-bold'
              : 'eva:star-fill'
        }
        sx={{
          color: neighbor.isCurrentUser ? 'primary.dark' : neighbor.isFriend ? 'success.dark' : 'warning.dark',
          mr: 0.25,
        }}
      />
      {neighbor.isCurrentUser ? 'You' : neighbor.isFriend ? 'Friend' : neighbor.ratingNumber}
    </Stack>
  );

  const renderName = (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        top: 8,
        left: 8,
        zIndex: 9,
        borderRadius: 1,
        bgcolor: 'grey.800',
        position: 'absolute',
        p: '2px 6px 2px 4px',
        color: 'common.white',
        typography: 'subtitle2',
      }}
    >
      {neighbor.universeName}
    </Stack>
  );

  const renderImages = (
    <Box gap={0.5} display="flex" sx={{ p: 1 }}>
      <Box flexGrow={1} sx={{ position: 'relative' }}>
        {renderName}
        {(neighbor.isCurrentUser || neighbor.isFriend) ? renderRating : null}
        <Image
          alt={neighbor.universeName}
          src={coverSrc}
          sx={{ width: 1, height: 164, borderRadius: 1 }}
        />
      </Box>

      <Box gap={0.5} display="flex" flexDirection="column">
        <Image
          alt={neighbor.universeName}
          src={image1Src}
          ratio="1/1"
          sx={{ borderRadius: 1, width: 80, height: 80 }}
        />
        <Image
          alt={neighbor.universeName}
          src={image2Src}
          ratio="1/1"
          sx={{ borderRadius: 1, width: 80, height: 80 }}
        />
      </Box>
    </Box>
  );

  const renderTexts = (
    <Box
      sx={{
        p: (theme) => theme.spacing(1, 2.5, 1, 2.5),
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <ListItemText
        sx={{ minWidth: 0, flexGrow: 1 }}
        primary={neighbor.email}
        secondary={
          <Stack direction="row" alignItems="center" spacing={1} component="span">
            <Link
              component={RouterLink}
              href={universeHref}
              color="inherit"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              {neighbor.name}
            </Link>
            {neighbor.isCurrentUser ? <Chip label="You" size="small" color="primary" /> : null}
          </Stack>
        }
        primaryTypographyProps={{ typography: 'caption', color: 'text.disabled' }}
        secondaryTypographyProps={{
          mt: 1,
          noWrap: true,
          component: 'span',
          color: 'text.primary',
          typography: 'subtitle1',
        }}
      />

      <Avatar
        alt={neighbor.name}
        src={signedAvatarUrl || undefined}
        onClick={(event) => event.stopPropagation()}
        sx={{
          width: 56,
          height: 56,
          flexShrink: 0,
          border: '2px solid',
          borderColor: neighbor.isCurrentUser
            ? 'primary.main'
            : neighbor.isFriend
              ? 'success.main'
              : 'transparent',
        }}
      />
    </Box>
  );

  const renderInfo = (
    <Stack
      spacing={1.5}
      sx={{ position: 'relative', p: (theme) => theme.spacing(0, 2.5, 2.5, 2.5) }}
    >
      <Stack spacing={1} direction="row" alignItems="center">
        <Avatar sx={{ width: 20, height: 20, fontSize: 12 }}>{getMotifAvatar(neighbor.motif)}</Avatar>
        <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
          {neighbor.motif}
        </Typography>
      </Stack>

      <Stack spacing={1} direction="row" alignItems="center">
        <Avatar sx={{ width: 20, height: 20, fontSize: 12 }}>{getMoodAvatar(neighbor.mood)}</Avatar>
        <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
          {neighbor.mood}
        </Typography>
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ gap: 2 }}>
        <Stack spacing={1} direction="row" alignItems="center" sx={{ minWidth: 0 }}>
          <Iconify icon="solar:users-group-rounded-bold" sx={{ color: 'warning.main', width: 20, height: 20 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
            {neighbor.friends.length} Friends
          </Typography>
        </Stack>

        <Stack spacing={1} direction="row" alignItems="center" sx={{ minWidth: 0 }}>
          <Iconify icon="solar:heart-unlock-bold" sx={{ color: 'primary.main', width: 20, height: 20 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
            {neighbor.openness}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  );

  return (
    <>
      <Card
        onClick={() => window.open(universeHref, '_blank', 'noopener,noreferrer')}
        sx={{ cursor: 'pointer' }}
      >
        {renderImages}

        {renderTexts}

        {renderInfo}
      </Card>
    </>
  );
}
