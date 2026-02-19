'use client';

import type { Theme, SxProps } from '@mui/material/styles';
import type { ButtonBaseProps } from '@mui/material/ButtonBase';

import { useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import IconButton from '@mui/material/IconButton';
import ButtonBase, { buttonBaseClasses } from '@mui/material/ButtonBase';

import { RouterLink } from 'src/routes/components';
import { useRouter, usePathname, useActiveLink } from 'src/routes/hooks';

import { usePopover } from 'src/hooks/use-popover';

import { Iconify } from 'src/components/universe/iconify';

import { useAuthContext } from 'src/auth/hooks';
import { signOut } from 'src/auth/context/jwt/action';

import { navAccountData, navAccountDataGuest } from './config-nav-account';

// ----------------------------------------------------------------------

export type NavItemsProps = {
  sx?: SxProps<Theme>;
};

// ----------------------------------------------------------------------

export function NavAccountPopover({ sx }: NavItemsProps) {
  const router = useRouter();

  const openMenu = usePopover();

  const pathname = usePathname();

  const { user, authenticated, checkUserSession } = useAuthContext();

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      await checkUserSession?.();

      openMenu.onClose();
      router.refresh();
    } catch (error) {
      console.error(error);
    }
  }, [checkUserSession, openMenu, router])

  useEffect(() => {
    if (openMenu.open) {
      openMenu.onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const navbar = authenticated ? (
    <>
      <Box component="nav">
        <Box component="ul" gap={0.5} display="flex" flexDirection="column">
          {navAccountData
          .filter(item => item.roles.includes(user?.role)).map((item) => (
            <Box component="li" key={item.title} sx={{ display: 'flex' }}>
              <NavItem title={item.title} path={item.path} icon={item.icon} />
            </Box>
          ))}
        </Box>
      </Box>
      <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} />
      <NavItem
        title="Logout"
        icon={<Iconify icon="carbon:logout" />}
        onClick={handleLogout}
      />
    </>
  ) : (
    <Box component="nav">
      <Box component="ul" gap={0.5} display="flex" flexDirection="column">
        {navAccountDataGuest.map((item) => (
          <Box component="li" key={item.title} sx={{ display: 'flex' }}>
            <NavItem title={item.title} path={item.path} icon={item.icon} />
          </Box>
        ))}
      </Box>
    </Box>
  );

  return (
    <>
      <IconButton
        color="inherit"
        onClick={openMenu.onOpen}
      >
        <Iconify width={22} icon="solar:user-rounded-outline" />
      </IconButton>

      <Popover
        open={openMenu.open}
        anchorEl={openMenu.anchorEl}
        onClose={openMenu.onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 220,
              [`& .${buttonBaseClasses.root}`]: {
                px: 1.5,
                py: 0.75,
                height: 'auto',
              },
              ...sx,
            },
          },
        }}
      >
        {navbar}
      </Popover>
    </>
  );
}

// ----------------------------------------------------------------------

type NavItemProps = ButtonBaseProps & {
  path?: string;
  title: string;
  icon: React.ReactNode;
};

export function NavItem({ title, path, icon, sx, ...other }: NavItemProps) {
  const active = useActiveLink(path ?? '');

  const buttonProps = path
    ? {
        href: path,
        component: RouterLink,
      }
    : {};

  return (
    <ButtonBase
      disableRipple
      key={title}
      {...buttonProps}
      sx={{
        gap: 2,
        width: 1,
        height: 44,
        borderRadius: 1,
        typography: 'body2',
        justifyContent: 'flex-start',
        ...(active &&
          path && {
            color: 'primary.main',
            typography: 'subtitle2',
          }),
        ...sx,
      }}
      {...other}
    >
      {icon}
      {title}
    </ButtonBase>
  );
}
