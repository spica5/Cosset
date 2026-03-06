'use client';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useTheme } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { varAlpha } from 'src/theme/universe/styles';

// ----------------------------------------------------------------------

type Props = {
  currentPath: string;
};

export function HomeSpacePreviewHeaderBar({ currentPath }: Props) {
  const theme = useTheme();
  const [roomInfoVisible, setRoomInfoVisible] = useState(true);

  useEffect(() => {
    const handleRoomInfoState = (event: Event) => {
      const customEvent = event as CustomEvent<{ visible?: boolean }>;
      if (typeof customEvent.detail?.visible === 'boolean') {
        setRoomInfoVisible(customEvent.detail.visible);
      }
    };

    window.addEventListener('room-info-state', handleRoomInfoState as EventListener);

    return () => {
      window.removeEventListener('room-info-state', handleRoomInfoState as EventListener);
    };
  }, []);

  const menuLinkSx = {
    px: 2,
    py: 0.75,
    borderRadius: 1,
    border: 1,
    borderColor: 'text.secondary',
    bgcolor: (currentTheme: typeof theme) =>
      varAlpha(currentTheme.vars.palette.common.blackChannel, 0.45),
    color: 'info.main',
    typography: 'subtitle2',
    textDecoration: 'none',
    transition: (currentTheme: typeof theme) =>
      currentTheme.transitions.create(['background-color', 'border-color', 'color'], {
        duration: currentTheme.transitions.duration.shorter,
      }),
    '&:hover': {
      borderColor: 'text.secondary',
      bgcolor: (currentTheme: typeof theme) =>
        varAlpha(currentTheme.vars.palette.common.blackChannel, 0.65),
      color: 'info.lighter',
    },
  } as const;

  return (
    <Box
      component="section"
      sx={{
        top: { xs: 12, md: 20 },
        left: { xs: 12, md: 20 },
        right: { xs: 12, md: 20 },
        zIndex: 12,
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        px: { xs: 1, md: 2 },
        py: 1.25,
        mb: 0,
        borderRadius: 1.5,
        bgcolor: (currentTheme) => varAlpha(currentTheme.vars.palette.common.blackChannel, 0.0),
        border: (currentTheme) =>
          `1px solid ${varAlpha(currentTheme.vars.palette.common.whiteChannel, 0.2)}`,
        backdropFilter: 'blur(1px)',
      }}
    >
      <Box gap={{ xs: 1, md: 1.5 }} display="flex" alignItems="center" flexWrap="wrap">
        {/* <Typography variant="subtitle1" sx={{ color: 'common.white', mr: { xs: 0, md: 1 } }}>
          Home Space Preview : 
        </Typography> */}

        <Link
          component={RouterLink}
          href={`${currentPath}#albums-section`}
          color="inherit"
          underline="none"
          sx={menuLinkSx}
        >
          Albums
        </Link>

        <Link
          component={RouterLink}
          href={`${currentPath}#drawer-section`}
          color="inherit"
          underline="none"
          sx={menuLinkSx}
        >
          Drawer
        </Link>
      </Box>

      <IconButton
        aria-label={roomInfoVisible ? 'hide room info' : 'show room info'}
        onClick={() => {
          window.dispatchEvent(new Event('toggle-room-info'));
        }}
        sx={{
          border: 1,
          borderColor: 'text.secondary',
          color: 'info.main',
          bgcolor: (currentTheme) => varAlpha(currentTheme.vars.palette.common.blackChannel, 0.45),
          '&:hover': {
            borderColor: 'text.secondary',
            bgcolor: (currentTheme) => varAlpha(currentTheme.vars.palette.common.blackChannel, 0.65),
            color: 'info.lighter',
          },
        }}
      >
        {roomInfoVisible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
      </IconButton>
    </Box>
  );
}
