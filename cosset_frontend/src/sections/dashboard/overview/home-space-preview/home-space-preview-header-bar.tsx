'use client';

import { useEffect, useState } from 'react';

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
        right: { xs: 12, md: 300 },
        zIndex: 12,
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        px: { xs: 1, md: 2 },
        py: 1.25,
        mb: 0,
      }}
    >
      <Box
        gap={{ xs: 1, md: 4 }}
        display="flex"
        alignItems="center"
        flexWrap="nowrap"
        sx={{
          display: { xs: 'none', md: 'flex' },
          overflowX: 'auto',
          pr: 0.5,
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Logo
          disableLink
          isSingle
          sx={{
            ml: { xs: 0, md: 10 },
            mr: { xs: 1, md: 12 },
            width: { xs: 70, md: 80 },
            height: { xs: 42, md: 50 },
            flexShrink: 0,
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

      <Box display="flex" alignItems="center" gap={1}>
        <MenuButton
          aria-label="open section menu"
          onClick={handleOpenMobileMenu}
          sx={{ display: { xs: 'inline-flex', md: 'none' } }}
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
