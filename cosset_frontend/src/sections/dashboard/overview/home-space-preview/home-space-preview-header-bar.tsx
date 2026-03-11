'use client';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

import { RouterLink } from 'src/routes/components';
import { Logo } from 'src/components/universe/logo';

import { varAlpha } from 'src/theme/universe/styles';

// ----------------------------------------------------------------------

type Props = {
  currentPath: string;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
};

export function HomeSpacePreviewHeaderBar({
  currentPath,
  isFullScreen,
  onToggleFullScreen,
}: Props) {
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

  const actionButtonSx = {
    border: 1,
    borderColor: 'text.secondary',
    color: 'info.main',
    bgcolor: (currentTheme: typeof theme) =>
      varAlpha(currentTheme.vars.palette.common.blackChannel, 0.45),
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
        right: { xs: 250, md: 300 },
        zIndex: 12,
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        px: { xs: 1, md: 2 },
        py: 1.25,
        mb: 0,
        // borderRadius: 1.5,
        // bgcolor: (currentTheme) => varAlpha(currentTheme.vars.palette.common.blackChannel, 0.0),
        // border: (currentTheme) =>
        //   `1px solid ${varAlpha(currentTheme.vars.palette.common.whiteChannel, 0.2)}`,
        // backdropFilter: 'blur(1px)',
      }}
    >
      <Box gap={{ xs: 2, md: 4 }} display="flex" alignItems="center" flexWrap="wrap">
        <Logo
          disableLink
          sx={{
            ml: { xs: 5, md: 10 },
            mr: { xs: 8, md: 12 },
            width: { xs: 70, md: 80 },
            height: { xs: 42, md: 50 },
          }}
        />

        <Link
          component={RouterLink}
          href={`${currentPath}#blogs-section`}
          color="inherit"
          underline="none"
          sx={menuLinkSx}
        >
          Blogs
        </Link>

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

        <Link
          component={RouterLink}
          href={`${currentPath}#collection-items-section`}
          color="inherit"
          underline="none"
          sx={menuLinkSx}
        >
          Collections
        </Link>
      </Box>

      <Box display="flex" alignItems="center" gap={2}>
        <Tooltip title={isFullScreen ? 'Exit full screen' : 'Enter full screen'}>
          <IconButton
            aria-label={isFullScreen ? 'exit full screen preview' : 'enter full screen preview'}
            onClick={onToggleFullScreen}
            sx={actionButtonSx}
          >
            {isFullScreen ? (
              <FullscreenExitIcon fontSize="small" />
            ) : (
              <FullscreenIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>

        <IconButton
          aria-label={roomInfoVisible ? 'hide room info' : 'show room info'}
          onClick={() => {
            window.dispatchEvent(new Event('toggle-room-info'));
          }}
          sx={actionButtonSx}
        >
          {roomInfoVisible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
        </IconButton>
      </Box>
    </Box>
  );
}
