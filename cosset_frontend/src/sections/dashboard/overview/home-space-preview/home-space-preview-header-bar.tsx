'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

import { RouterLink } from 'src/routes/components';
import { Logo } from 'src/components/universe/logo';
import { MenuButton } from 'src/layouts/universe/components/menu-button';

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
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState<HTMLElement | null>(null);
  const mobileMenuOpen = Boolean(mobileMenuAnchorEl);

  const handleOpenMobileMenu = (event: { currentTarget: HTMLElement }) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };

  const handleCloseMobileMenu = () => {
    setMobileMenuAnchorEl(null);
  };

  const menuLinkSx = {
    px: 2,
    py: 0.75,
    borderRadius: 0.5,
    border: 1,
    borderColor: 'info.main',
    bgcolor: (currentTheme: typeof theme) =>
      varAlpha(currentTheme.vars.palette.background.defaultChannel, 0.5),
    color: 'info.main',
    typography: 'subtitle2',
    textDecoration: 'none',
    transition: (currentTheme: typeof theme) =>
      currentTheme.transitions.create(['background-color', 'border-color', 'color'], {
        duration: currentTheme.transitions.duration.shorter,
      }),
    '&:hover': {
      borderColor: 'info.main',
      bgcolor: (currentTheme: typeof theme) =>
        varAlpha(currentTheme.vars.palette.background.defaultChannel, 0.8),
      color: 'info.dark',
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
        top: { xs: 10, md: 10 },
        left: { xs: 12, md: 20 },
        right: { xs: 12, md: 20 },
        zIndex: 12,
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        px: { xs: 1, md: 10 },
        py: 1.25,
        mr: 20,
        mb: 0,
      }}
    >
      <Logo
        disableLink
        isSingle
        sx={{
          width: { xs: 60, sm: 72, md: 84 },
          height: { xs: 34, sm: 40, md: 48 },
          flexShrink: 0,
        }}
      />

      <Box display="flex" alignItems="center" gap={100}>
        <Box
          display="flex"
          alignItems="center"
          sx={{
            display: { xs: 'none', md: 'flex' },
            overflowX: 'auto',
            flexWrap: 'nowrap',
            maxWidth: '100%',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            pr: 3,
          }}
        >
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
            href={`${currentPath}#drawers-section`}
            color="inherit"
            underline="none"
            sx={menuLinkSx}
          >
            Drawers
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

        <MenuButton
          aria-label="open section menu"
          onClick={handleOpenMobileMenu}
          sx={{
            ml: 0.5,
            display: { xs: 'inline-flex', md: 'none' },
          }}
        />

        <Menu
          anchorEl={mobileMenuAnchorEl}
          open={mobileMenuOpen}
          onClose={handleCloseMobileMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              sx: {
                minWidth: 180,
                border: 1,
                borderColor: 'divider',
              },
            },
          }}
        >
          <MenuItem
            component={RouterLink}
            href={`${currentPath}#blogs-section`}
            onClick={handleCloseMobileMenu}
          >
            Blogs
          </MenuItem>
          <MenuItem
            component={RouterLink}
            href={`${currentPath}#albums-section`}
            onClick={handleCloseMobileMenu}
          >
            Albums
          </MenuItem>
          <MenuItem
            component={RouterLink}
            href={`${currentPath}#drawers-section`}
            onClick={handleCloseMobileMenu}
          >
            Drawers
          </MenuItem>
          <MenuItem
            component={RouterLink}
            href={`${currentPath}#collection-items-section`}
            onClick={handleCloseMobileMenu}
          >
            Collections
          </MenuItem>
        </Menu>

        <Tooltip title={isFullScreen ? 'Exit full screen' : 'Enter full screen'}>
          <IconButton
            aria-label={isFullScreen ? 'exit full screen preview' : 'enter full screen preview'}
            onClick={onToggleFullScreen}
            sx={{ ...actionButtonSx, display: { xs: 'none', md: 'none' } }}
          >
            {isFullScreen ? (
              <FullscreenExitIcon fontSize="small" />
            ) : (
              <FullscreenIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
