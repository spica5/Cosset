'use client';

import type { IconButtonProps } from '@mui/material/IconButton';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogContent from '@mui/material/DialogContent';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import { getS3SignedUrl } from 'src/utils/helper';

import { useGetCurrentUser } from 'src/actions/user';

import { varAlpha } from 'src/theme/dashboard/styles';

import { Label } from 'src/components/dashboard/label';
import { Iconify } from 'src/components/dashboard/iconify';
import { Scrollbar } from 'src/components/dashboard/scrollbar';
import { AnimateAvatar } from 'src/components/dashboard/animate';

import { useAuthContext } from 'src/auth/hooks';

import { UpgradeBlock } from './nav-upgrade';
import { AccountButton } from './account-button';
import { SignOutButton } from './sign-out-button';

// ----------------------------------------------------------------------

export type AccountDrawerProps = IconButtonProps & {
  data?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
    info?: React.ReactNode;
  }[];
};

export function AccountDrawer({ data = [], sx, ...other }: AccountDrawerProps) {
  const theme = useTheme();

  const router = useRouter();

  const pathname = usePathname();

  const { user: authUser } = useAuthContext();
  const { user: currentUser } = useGetCurrentUser();
  const user = currentUser || authUser;
  const [signedPhotoURL, setSignedPhotoURL] = useState('');
  const [openAvatarPreview, setOpenAvatarPreview] = useState(false);

  const displayName =
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    'User';

  const [open, setOpen] = useState(false);
  const accountPlan = (user?.plan || 'FREE').toUpperCase();
  const accountPlanColor =
    accountPlan === 'EXTRA-PAID' ? 'warning' : accountPlan === 'PAID' ? 'error' : 'primary';

  useEffect(() => {
    let mounted = true;

    const resolvePhotoUrl = async () => {
      const photoKey = user?.photoURL;

      if (!photoKey) {
        if (mounted) setSignedPhotoURL('');
        return;
      }

      if (photoKey.startsWith('http://') || photoKey.startsWith('https://')) {
        if (mounted) setSignedPhotoURL(photoKey);
        return;
      }

      const signedUrl = await getS3SignedUrl(photoKey);
      if (mounted) {
        setSignedPhotoURL(signedUrl || '');
      }
    };

    resolvePhotoUrl();

    return () => {
      mounted = false;
    };
  }, [user?.photoURL]);

  const handleOpenDrawer = useCallback(() => {
    setOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setOpen(false);
  }, []);

  const handleClickItem = useCallback(
    (path: string) => {
      handleCloseDrawer();
      router.push(path);
    },
    [handleCloseDrawer, router]
  );

  const renderAvatar = (
    <Box
      onClick={() => {
        if (signedPhotoURL) {
          setOpenAvatarPreview(true);
        }
      }}
      sx={{ position: 'relative', cursor: signedPhotoURL ? 'zoom-in' : 'default' }}
    >
      <AnimateAvatar
        width={96}
        slotProps={{
          avatar: { src: signedPhotoURL || undefined, alt: displayName },
          overlay: {
            border: 2,
            spacing: 3,
            color: `linear-gradient(135deg, ${varAlpha(theme.vars.palette.primary.mainChannel, 0)} 25%, ${theme.vars.palette.primary.main} 100%)`,
          },
        }}
      >
        {user?.displayName?.charAt(0).toUpperCase()}
      </AnimateAvatar>

      <Label
        color={accountPlanColor}
        variant="filled"
        sx={{
          right: -8,
          bottom: -8,
          px: 0.75,
          height: 20,
          position: 'absolute',
          borderTopLeftRadius: 2,
        }}
      >
        {accountPlan}
      </Label>
    </Box>
  );

  return (
    <>
      <AccountButton
        onClick={handleOpenDrawer}
        photoURL={signedPhotoURL}
        displayName={displayName}
        sx={sx}
        {...other}
      />

      <Drawer
        open={open}
        onClose={handleCloseDrawer}
        anchor="right"
        slotProps={{ backdrop: { invisible: true } }}
        PaperProps={{ sx: { width: 320 } }}
      >
        <IconButton
          onClick={handleCloseDrawer}
          sx={{ top: 12, left: 12, zIndex: 9, position: 'absolute' }}
        >
          <Iconify icon="mingcute:close-line" />
        </IconButton>

        <Scrollbar>
          <Stack alignItems="center" sx={{ pt: 8 }}>
            {renderAvatar}

            <Typography variant="subtitle1" noWrap sx={{ mt: 2 }}>
              {displayName}
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }} noWrap>
              {user?.email}
            </Typography>
          </Stack>

          {/* <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" sx={{ p: 3 }}>
            {[...Array(3)].map((_, index) => (
              <Tooltip
                key={_mock.fullName(index + 1)}
                title={`Switch to: ${_mock.fullName(index + 1)}`}
              >
                <Avatar
                  alt={_mock.fullName(index + 1)}
                  src={_mock.image.avatar(index + 1)}
                  onClick={() => {}}
                />
              </Tooltip>
            ))}

            <Tooltip title="Add account">
              <IconButton
                sx={{
                  bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
                  border: `dashed 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.32)}`,
                }}
              >
                <Iconify icon="mingcute:add-line" />
              </IconButton>
            </Tooltip>
          </Stack> */}

          <Stack
            sx={{
              py: 3,
              px: 2.5,
              borderTop: `dashed 1px ${theme.vars.palette.divider}`,
              borderBottom: `dashed 1px ${theme.vars.palette.divider}`,
            }}
          >
            {data.map((option) => {
              const rootLabel = pathname.includes('/dashboard') ? 'Home' : 'Dashboard';

              const rootHref = pathname.includes('/dashboard') ? '/' : paths.dashboard.root;

              return (
                <MenuItem
                  key={option.label}
                  onClick={() => handleClickItem(option.label === 'Home' ? rootHref : option.href)}
                  sx={{
                    py: 1,
                    color: 'text.secondary',
                    '& svg': { width: 24, height: 24 },
                    '&:hover': { color: 'text.primary' },
                  }}
                >
                  {option.icon}

                  <Box component="span" sx={{ ml: 2 }}>
                    {option.label === 'Home' ? rootLabel : option.label}
                  </Box>

                  {option.info && (
                    <Label color="error" sx={{ ml: 1 }}>
                      {option.info}
                    </Label>
                  )}
                </MenuItem>
              );
            })}
          </Stack>

          <Box sx={{ px: 2.5, py: 3 }}>
            <UpgradeBlock />
          </Box>
        </Scrollbar>

        <Box sx={{ p: 2.5 }}>
          <SignOutButton onClose={handleCloseDrawer} />
        </Box>
      </Drawer>

      <Dialog
        open={openAvatarPreview}
        onClose={() => setOpenAvatarPreview(false)}
        maxWidth={false}
        PaperProps={{
          sx: {
            position: 'relative',
            bgcolor: 'common.black',
            overflow: 'hidden',
            m: 1,
          },
        }}
      >
        <IconButton
          onClick={() => setOpenAvatarPreview(false)}
          sx={{
            top: 8,
            right: 8,
            zIndex: 2,
            position: 'absolute',
            color: 'common.white',
            bgcolor: 'rgba(0,0,0,0.45)',
          }}
        >
          <Iconify icon="mingcute:close-line" />
        </IconButton>

        <DialogContent sx={{ p: 0, overflow: 'hidden', '&:last-child': { pb: 0 } }}>
          <Box
            component="img"
            src={signedPhotoURL}
            alt={`${displayName} profile photo`}
            sx={{
              width: 'auto',
              height: 'auto',
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100vh - 32px)',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
