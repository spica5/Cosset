import type { IAlbumItem } from 'src/types/album';

import { useState, useEffect } from 'react';

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

import { Iconify } from 'src/components/dashboard/iconify';
import { usePopover, CustomPopover } from 'src/components/dashboard/custom-popover';

// ----------------------------------------------------------------------

const COVER_HEIGHT = 164;

type Props = {
  album: IAlbumItem;
  onView: () => void;
  onDelete: () => void;
};

export function AlbumItem({ album, onView, onDelete }: Props) {
  const popover = usePopover();
  const [coverUrl, setCoverUrl] = useState<string>('');

  useEffect(() => {
    if (album.coverUrl) {
      getS3SignedUrl(album.coverUrl).then(setCoverUrl);
    } else {
      setCoverUrl('');
    }
  }, [album.coverUrl]);

  const renderImages = (
    <Link
      component={RouterLink}
      href={album.id ? paths.dashboard.album.details(String(album.id)) : '#'}
      color="inherit"
      underline="none"
    >
      <Box
        sx={{
          p: 1,
          minHeight: COVER_HEIGHT + 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
        }}
      >
        {coverUrl ? (
          <Box
            component="img"
            alt={album.title}
            src={coverUrl}
            sx={{
              height: COVER_HEIGHT,
              width: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
              objectPosition: 'center',
              borderRadius: 1,
              display: 'block',
            }}
          />
        ) : (
          <Box
            sx={{
              height: COVER_HEIGHT,
              width: 1,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.disabled',
            }}
          >
            <Iconify icon="solar:gallery-wide-bold" width={40} />
          </Box>
        )}
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

          <MenuItem
            onClick={() => {
              popover.onClose();
              onDelete();
            }}
            sx={{ color: 'error.main' }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" />
            Delete
          </MenuItem>
        </MenuList>
      </CustomPopover>
    </>
  );
}
