import type { IAlbumItem } from 'src/types/album';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getS3SignedUrl } from 'src/utils/helper';
import { fDateTime } from 'src/utils/format-time';
import { useCallback, useState, useEffect } from 'react';

import { Image } from 'src/components/dashboard/image';
import { Iconify } from 'src/components/dashboard/iconify';
import { usePopover, CustomPopover } from 'src/components/dashboard/custom-popover';

// ----------------------------------------------------------------------

type Props = {
  album: IAlbumItem;
  onView: () => void;
};

export function AlbumItem({ album, onView }: Props) {
  const popover = usePopover();
  const [coverUrl, setCoverUrl] = useState<string>('');

  useEffect(() => {
    if (album.coverUrl) {
      getS3SignedUrl(album.coverUrl).then(setCoverUrl);
    }
  }, [album.coverUrl]);

  const renderImages = (
    <Link
      component={RouterLink}
      href={album.id ? paths.dashboard.album.details(String(album.id)) : '#'}
      color="inherit"
      underline="none"
    >
      <Box gap={0.5} display="flex" sx={{ p: 1 }}>
        <Box flexGrow={1} sx={{ position: 'relative' }}>
          <Image
            alt={album.title}
            src={coverUrl}
            sx={{ width: 1, height: 164, borderRadius: 1 }}
          />
        </Box>
      </Box>
    </Link>
  );

  const renderTexts = (
    <ListItemText
      sx={{ p: (theme) => theme.spacing(2.5, 2.5, 2, 2.5) }}
      primary={`Created date: ${fDateTime(album.createdAt)}`}
      secondary={
        <Link component={RouterLink} href={paths.dashboard.album.details(String(album.id))} color="inherit">
          {album.title}
        </Link>
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
  );

  const renderInfo = (
    <Stack
      spacing={1.5}
      sx={{ position: 'relative', p: (theme) => theme.spacing(0, 2.5, 2.5, 2.5) }}
    >
      <IconButton onClick={popover.onOpen} sx={{ position: 'absolute', bottom: 20, right: 8 }}>
        <Iconify icon="eva:more-vertical-fill" />
      </IconButton>

      {[
        {
          icon: <Iconify icon="eva:star-fill" sx={{ color: 'warning.main' }} />,
          label: album.priority,
        },
        {
          icon: <Iconify icon="solar:eye-bold" sx={{ color: 'info.main' }} />,
          label: album.totalViews,
        },
        {
          icon: <Iconify icon="solar:heart-unlock-bold" sx={{ color: 'primary.main' }} />,
          label: album.openness,
        },
      ].map((item, i) => (
        <Stack
          key={`info-${i}`}
          spacing={1}
          direction="row"
          alignItems="center"
          sx={{ typography: 'body2' }}
        >
          {item.icon}
          {item.label}
        </Stack>
      ))}
    </Stack>
  );

  return (
    <>
      <Card>
        {renderImages}

        {renderTexts}

        {renderInfo}
      </Card>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem
            onClick={() => {
              popover.onClose();
              onView();
            }}
          >
            <Iconify icon="solar:eye-bold" />
            View
          </MenuItem>
        </MenuList>
      </CustomPopover>
    </>
  );
}
