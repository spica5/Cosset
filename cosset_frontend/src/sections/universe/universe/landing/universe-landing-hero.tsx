import type { BoxProps } from '@mui/material/Box';
import type { IUniverseProps } from 'src/types/universe';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { Typography } from '@mui/material';
import Collapse from '@mui/material/Collapse';
import CardMedia from '@mui/material/CardMedia';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import DialogContent from '@mui/material/DialogContent';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

import { varAlpha } from 'src/theme/universe/styles';

import { Iconify } from 'src/components/universe/iconify/iconify';
import { isGuestAreaHomeSpaceOnlyMotif } from 'src/utils/guest-area-status';

// ----------------------------------------------------------------------

type Props = BoxProps & {
  universe: IUniverseProps;
  customer?: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  friendshipState?: 'you' | 'friend' | 'none' | 'requested';
  requestingFriend?: boolean;
  canRequestFriend?: boolean;
  onRequestFriend?: () => void | Promise<void>;
  visitors?: {
    id: string;
    name: string;
    avatarUrl: string;
  }[];
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
};

export function UniverseLandingHero({
  universe,
  customer,
  friendshipState = 'none',
  requestingFriend = false,
  canRequestFriend = false,
  onRequestFriend,
  visitors = [],
  isFullScreen = false,
  onToggleFullScreen,
  sx,
  ...other
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showRoomInfo, setShowRoomInfo] = useState(true);
  const [showTopMenu, setShowTopMenu] = useState(true);
  const [openGallery, setOpenGallery] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState('');
  const [showControlsPanel, setShowControlsPanel] = useState(false);
  const [openAvatarPreview, setOpenAvatarPreview] = useState(false);

  const galleryImages = useMemo(() => {
    const gallery = (universe?.gallery || []).filter(Boolean);
    return Array.from(new Set(gallery));
  }, [universe?.gallery]);

  useEffect(() => {
    if (!galleryImages.length) {
      // setSelectedBackground(universe?.heroUrl || '');
      return;
    }

    setSelectedBackground((prev) => {
      if (prev && galleryImages.includes(prev)) {
        return prev;
      }

      // if (universe?.heroUrl && galleryImages.includes(universe.heroUrl)) {
      //   return universe.heroUrl;
      // }

      return galleryImages[0];
    });
  }, [galleryImages]);

  useEffect(() => {
    const handleShowRoomInfo = () => {
      setShowRoomInfo(true);

      window.requestAnimationFrame(() => {
        const roomInfo = document.getElementById('room_info');
        roomInfo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    };

    const handleToggleRoomInfo = () => {
      setShowRoomInfo((prev) => {
        const next = !prev;

        if (next) {
          window.requestAnimationFrame(() => {
            const roomInfo = document.getElementById('room_info');
            roomInfo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
        }

        return next;
      });
    };

    window.addEventListener('show-room-info', handleShowRoomInfo);
    window.addEventListener('toggle-room-info', handleToggleRoomInfo);

    return () => {
      window.removeEventListener('show-room-info', handleShowRoomInfo);
      window.removeEventListener('toggle-room-info', handleToggleRoomInfo);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('room-info-state', {
        detail: { visible: showRoomInfo },
      })
    );
  }, [showRoomInfo]);

  useEffect(() => {
    const handleTopMenuState = (event: Event) => {
      const customEvent = event as CustomEvent<{ visible?: boolean }>;
      if (typeof customEvent.detail?.visible === 'boolean') {
        setShowTopMenu(customEvent.detail.visible);
      }
    };

    window.addEventListener('top-menu-state', handleTopMenuState as EventListener);

    return () => {
      window.removeEventListener('top-menu-state', handleTopMenuState as EventListener);
    };
  }, []);

  if (!universe) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: 'common.black',
        overflow: 'hidden',
        ...sx,
      }}
      {...other}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
        sx={{
          position: 'relative',
          '&::before': {
            top: 0,
            left: 0,
            width: 1,
            height: 1,
            zIndex: 8,
            content: "''",
            position: 'absolute',
            backgroundImage: `linear-gradient(to bottom, ${varAlpha(theme.vars.palette.common.blackChannel, 0)} 0%, ${
              theme.vars.palette.common.black
            } 125%)`,
          },
          minHeight: { xs: 520, sm: 620 },
          [theme.breakpoints.up('md')]: {
            minHeight: 760,
            height: '100vh',
            maxHeight: 1440,
          },
          ...sx,
        }}
        {...other}
      >
        <Box
          id="room_info"
          gap={5}
          display={showRoomInfo ? 'flex' : 'none'}
          alignItems="center"
          flexDirection="column"
          sx={{
            px: { xs: 2, md: 4 },
            py: { xs: 10, md: 12 },
            zIndex: 9,
            textAlign: 'center',
            position: 'relative',
            color: 'common.white',
            borderRadius: 2,
            border: `1px solid ${varAlpha(theme.vars.palette.common.whiteChannel, 0.24)}`,
            bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.55),
            backdropFilter: 'blur(4px)',
            maxWidth: { xs: '92%', md: 960 },
            mt: { xs: 4, md: 6 },
          }}
        >
          <IconButton
            aria-label="close room info"
            onClick={() => setShowRoomInfo(false)}
            sx={{
              top: 8,
              right: 8,
              position: 'absolute',
              color: 'common.white',
              bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.45),
              '&:hover': {
                bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.65),
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          <Typography variant="h1" sx={{ color: 'info.main', fontSize: { xs: '1.6rem', sm: '2rem', md: '2.5rem' } }}>
            {universe.name}
          </Typography>

          <Typography variant="h2" component="h1" sx={{ maxWidth: { xs: '100%', md: 800 }, fontSize: { xs: '1.15rem', sm: '1.5rem', md: '1.875rem' }, wordBreak: 'break-word', color: isGuestAreaHomeSpaceOnlyMotif(universe.motif) ? 'error.main' : 'inherit' }}>
            {universe.motif}
          </Typography>

          <Typography variant="h3" component="h1" sx={{ maxWidth: { xs: '100%', md: 480 }, fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }, wordBreak: 'break-word' }}>
            {universe.mood}
          </Typography>

          <Box
            display="flex"
            flexWrap="wrap"
            alignItems="center"
            justifyContent="center"
            gap={{ xs: 2.5, md: 5 }}
          >
            <Box gap={1} display="flex" alignItems="center" sx={{ typography: 'subtitle2' }}>
              <Iconify width={24} icon="eva:star-fill" sx={{ color: 'primary.main' }} />
              {`${universe.ratingNumber} reviews`}
            </Box>
            <Box gap={1} display="flex" alignItems="center" sx={{ typography: 'subtitle2' }}>
              <Iconify width={24} icon="carbon:friendship" sx={{ color: 'primary.main' }} />
              {`${universe.connections} friends`}
            </Box>
          </Box>
        </Box>
              
        {selectedBackground ? (
            <Box
              component="img"
              alt={universe.name}
              src={selectedBackground}
              sx={{
                top: 0,
                left: 0,
                width: 1,
                height: 1,
                zIndex: 7,
                objectFit: 'cover',
                position: 'absolute',
              }}
            />
          ) : null}

        <Card
          sx={{
            top: {
              xs: showTopMenu ? 70 : 12,
              md: showTopMenu ? 80 : 20,
            },
            right: { xs: 15, md: 30 },
            zIndex: 10,
            px: 1.5,
            py: 1.25,
            minWidth: { xs: 180, sm: 220 },
            maxWidth: { xs: 'calc(100vw - 24px)', sm: 260 },
            position: 'fixed',
            bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.5),
            border: `1px solid ${varAlpha(theme.vars.palette.common.whiteChannel, 0.2)}`,
            color: 'common.white',
            backdropFilter: 'blur(4px)',
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            sx={{
              mb: 1.25,
              pb: 1.25,
              borderBottom: `1px solid ${varAlpha(theme.vars.palette.common.whiteChannel, 0.2)}`,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
              <Avatar
                src={customer?.avatarUrl || undefined}
                alt={customer?.name || 'Customer'}
                onClick={() => { if (customer?.avatarUrl) setOpenAvatarPreview(true); }}
                sx={{
                  width: 45,
                  height: 45,
                  bgcolor: 'grey.700',
                  cursor: customer?.avatarUrl ? 'pointer' : 'default',
                  transition: 'opacity 0.2s',
                  '&:hover': customer?.avatarUrl ? { opacity: 0.8 } : {},
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body1" noWrap>
                  {customer?.name || 'Customer'}
                </Typography>
              </Box>
            </Stack>

            {onToggleFullScreen ? (
              <IconButton
                size="small"
                aria-label={isFullScreen ? 'exit full screen preview' : 'enter full screen preview'}
                onClick={onToggleFullScreen}
                sx={{
                  border: 1,
                  borderColor: 'text.secondary',
                  color: 'info.main',
                  bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.35),
                  '&:hover': {
                    borderColor: 'text.secondary',
                    bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.55),
                    color: 'info.lighter',
                  },
                }}
              >
                {isFullScreen ? (
                  <FullscreenExitIcon fontSize="small" />
                ) : (
                  <FullscreenIcon fontSize="small" />
                )}
              </IconButton>
            ) : null}
          </Stack>


          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Friend</Typography>

            {friendshipState === 'you' ? (
              <Chip size="small" label="You" color="primary" />
            ) : friendshipState === 'friend' ? (
              <Chip size="small" label="Friend" color="success" />
            ) : friendshipState === 'requested' ? (
              <Chip size="small" label="Requested" color="warning" />
            ) : (
              <Button
                size="small"
                variant="outlined"
                disabled={!canRequestFriend || requestingFriend}
                onClick={() => onRequestFriend?.()}
                sx={{
                  borderColor: 'text.secondary',
                  color: 'info.main',
                  bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.35),
                  '&:hover': {
                    borderColor: 'text.secondary',
                    bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.55),
                    color: 'info.lighter',
                  },
                }}
              >
                {requestingFriend ? 'Requesting...' : 'Request'}
              </Button>
            )}
          </Stack>

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Controls</Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={showControlsPanel ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              onClick={() => setShowControlsPanel((prev) => !prev)}
              sx={{
                borderColor: 'text.secondary',
                color: 'info.main',
                bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.35),
                '&:hover': {
                  borderColor: 'text.secondary',
                  bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.55),
                  color: 'info.lighter',
                },
              }}
            >
              {showControlsPanel ? 'Collapse' : 'Expand'}
            </Button>
          </Stack>

          <Collapse in={showControlsPanel} timeout="auto" unmountOnExit>
            <Stack spacing={1} sx={{ mb: 1 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2">Room Info</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={showRoomInfo ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  onClick={() => {
                    window.dispatchEvent(new Event('toggle-room-info'));
                  }}
                  sx={{
                    borderColor: 'text.secondary',
                    color: 'info.main',
                    bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.35),
                    '&:hover': {
                      borderColor: 'text.secondary',
                      bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.55),
                      color: 'info.lighter',
                    },
                  }}
                >
                  {showRoomInfo ? 'Hide' : 'View'}
                </Button>
              </Stack>

              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2">Top Menu</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={showTopMenu ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  onClick={() => {
                    window.dispatchEvent(new Event('toggle-top-menu'));
                  }}
                  sx={{
                    borderColor: 'text.secondary',
                    color: 'info.main',
                    bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.35),
                    '&:hover': {
                      borderColor: 'text.secondary',
                      bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.55),
                      color: 'info.lighter',
                    },
                  }}
                >
                  {showTopMenu ? 'Hide' : 'View'}
                </Button>
              </Stack>
            </Stack>
          </Collapse>
        </Card>

        <IconButton
          aria-label="view design space gallery"
          onClick={() => setOpenGallery(true)}
          sx={{
            right: 16,
            bottom: 16,
            zIndex: 10,
            position: 'absolute',
            color: 'common.white',
            bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.5),
            '&:hover': {
              bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.7),
            },
          }}
        >
          <Iconify icon="solar:gallery-wide-bold" width={22} />
        </IconButton>
      </Box>

      <Dialog
        open={openGallery}
        onClose={() => setOpenGallery(false)}
        fullScreen={isMobile}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 4 },
            borderRadius: { xs: 0, sm: 1 },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
          }}
        >
          Design Space Gallery
          <IconButton size="small" onClick={() => setOpenGallery(false)} aria-label="close gallery">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1.5, sm: 3 }, pb: { xs: 2, sm: 3 }, overflowX: 'hidden' }}>
          <Grid
            container
            rowSpacing={{ xs: 1.5, sm: 2 }}
            columnSpacing={{ xs: 1.5, sm: 2 }}
            sx={{ pt: 0.5, mx: 0, width: '100%' }}
          >
            {galleryImages.map((image) => (
              <Grid item xs={12} sm={6} md={4} key={image}>
                <Card variant="outlined">
                  <CardMedia component="img" image={image} alt="Design space" sx={{ height: { xs: 160, sm: 180 } }} />
                  <Box sx={{ p: 1.5 }}>
                    <Button
                      fullWidth
                      variant={selectedBackground === image ? 'contained' : 'outlined'}
                      onClick={() => {
                        setSelectedBackground(image);
                        setOpenGallery(false);
                      }}
                    >
                      Select
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openAvatarPreview}
        onClose={() => setOpenAvatarPreview(false)}
        maxWidth={false}
        PaperProps={{
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
            m: 2,
            overflow: 'visible',
          },
        }}
      >
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <IconButton
            size="small"
            onClick={() => setOpenAvatarPreview(false)}
            sx={{
              position: 'absolute',
              top: -16,
              right: -16,
              zIndex: 1,
              color: 'common.white',
              bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.55),
              '&:hover': {
                bgcolor: varAlpha(theme.vars.palette.common.blackChannel, 0.75),
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          <Box
            component="img"
            src={customer?.avatarUrl || undefined}
            alt={customer?.name || 'Avatar'}
            sx={{
              display: 'block',
              maxWidth: '90vw',
              maxHeight: '90vh',
              width: 'auto',
              height: 'auto',
              borderRadius: 2,
            }}
          />
        </Box>
      </Dialog>
    </Box>
  )
}
