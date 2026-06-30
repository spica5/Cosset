import type { BoxProps } from '@mui/material/Box';
import type { IUniverseProps } from 'src/types/universe';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { Typography } from '@mui/material';
import CardMedia from '@mui/material/CardMedia';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import DialogContent from '@mui/material/DialogContent';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

import {
  type DesignSpaceType,
  DEFAULT_DESIGN_SPACE_TYPE,
} from 'src/utils/design-space-type';
import { getGuestAreaMotifIcon, isGuestAreaHomeSpaceOnlyMotif } from 'src/utils/guest-area-status';

import { varAlpha, getThemeCommonVars } from 'src/theme/universe/styles';

import { Iconify } from 'src/components/universe/iconify/iconify';

import { UniverseLandingMoodMarquee } from './universe-landing-mood-marquee';

// ----------------------------------------------------------------------

const BACKGROUND_ROTATE_MS = 5 * 60 * 1000;
const BACKGROUND_FADE_MS = 900;

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
  designType?: DesignSpaceType;
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
  designType = DEFAULT_DESIGN_SPACE_TYPE,
  isFullScreen = false,
  onToggleFullScreen,
  sx,
  ...other
}: Props) {
  const theme = useTheme();
  const commonVars = useMemo(() => getThemeCommonVars(theme), [theme]);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showTopMenu, setShowTopMenu] = useState(true);
  const [openGallery, setOpenGallery] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState('');
  const [openAvatarPreview, setOpenAvatarPreview] = useState(false);
  const [showMood, setShowMood] = useState(true);
  const [fadeLayers, setFadeLayers] = useState({
    a: '',
    b: '',
    active: 'a' as 'a' | 'b',
  });

  const galleryImages = useMemo(() => {
    const gallery = (universe?.gallery || []).filter(Boolean);
    return Array.from(new Set(gallery));
  }, [universe?.gallery]);

  const backgroundImages = useMemo(() => {
    const images = [...galleryImages];
    const heroUrl = universe?.heroUrl?.trim();

    if (heroUrl && !images.includes(heroUrl)) {
      images.unshift(heroUrl);
    }

    return images;
  }, [galleryImages, universe?.heroUrl]);

  useEffect(() => {
    setSelectedBackground((prev) => {
      if (!backgroundImages.length) {
        return '';
      }

      if (prev && backgroundImages.includes(prev)) {
        return prev;
      }

      return backgroundImages[0];
    });
  }, [backgroundImages]);

  useEffect(() => {
    if (!selectedBackground) {
      return;
    }

    setFadeLayers((prev) => {
      const activeUrl = prev.active === 'a' ? prev.a : prev.b;

      if (!activeUrl) {
        return { a: selectedBackground, b: selectedBackground, active: 'a' };
      }

      if (activeUrl === selectedBackground) {
        return prev;
      }

      if (prev.active === 'a') {
        return { a: prev.a, b: selectedBackground, active: 'b' };
      }

      return { a: selectedBackground, b: prev.b, active: 'a' };
    });
  }, [selectedBackground]);

  useEffect(() => {
    if (backgroundImages.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setSelectedBackground((prev) => {
        const currentIndex = backgroundImages.indexOf(prev);
        const nextIndex =
          currentIndex >= 0 ? (currentIndex + 1) % backgroundImages.length : 0;

        return backgroundImages[nextIndex];
      });
    }, BACKGROUND_ROTATE_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [backgroundImages]);

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

  const handleShowCustomerSpace = () => {
    const target = document.getElementById('myspace-section');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const customerSpaceLabel = customer?.name
    ? `${customer.name}'s Space`
    : "Customer's Space";

  const handleBackgroundStep = useCallback(
    (direction: -1 | 1) => {
      if (backgroundImages.length <= 1) {
        return;
      }

      setSelectedBackground((prev) => {
        const currentIndex = backgroundImages.indexOf(prev);
        const baseIndex = currentIndex >= 0 ? currentIndex : 0;
        const nextIndex =
          (baseIndex + direction + backgroundImages.length) % backgroundImages.length;

        return backgroundImages[nextIndex];
      });
    },
    [backgroundImages],
  );

  const backgroundSliderButtonSx = {
    flexShrink: 0,
    width: 36,
    height: 36,
    p: 0.75,
    color: 'common.white',
    bgcolor: varAlpha(commonVars.blackChannel, 0.52),
    border: `1px solid ${varAlpha(commonVars.whiteChannel, 0.28)}`,
    backdropFilter: 'blur(4px)',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.22)',
    transition: theme.transitions.create(['background-color', 'border-color', 'color', 'box-shadow'], {
      duration: 200,
    }),
    '&:hover': {
      bgcolor: varAlpha(commonVars.blackChannel, 0.72),
      borderColor: varAlpha(commonVars.whiteChannel, 0.45),
      color: 'common.white',
      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
    },
  };

  const showMoodBar = Boolean(showMood && universe.mood?.trim());
  const showBackgroundControls = backgroundImages.length > 1;
  const showBottomMoodRow = showMoodBar || showBackgroundControls;

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
            pointerEvents: 'none',
            backgroundImage: `linear-gradient(to bottom, ${varAlpha(commonVars.blackChannel, 0)} 0%, ${varAlpha(
              commonVars.blackChannel,
              0
            )} 72%, ${varAlpha(commonVars.blackChannel, 0.28)} 100%)`,
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
        {fadeLayers.a || fadeLayers.b ? (
          <Box
            sx={{
              top: 0,
              left: 0,
              width: 1,
              height: 1,
              zIndex: 7,
              position: 'absolute',
              bgcolor: 'common.black',
            }}
          >
            {(['a', 'b'] as const).map((layer) => {
              const src = layer === 'a' ? fadeLayers.a : fadeLayers.b;

              if (!src) {
                return null;
              }

              const isActive = fadeLayers.active === layer;

              return (
                <Box
                  key={layer}
                  component="img"
                  alt={universe.name}
                  src={src}
                  sx={{
                    top: 0,
                    left: 0,
                    width: 1,
                    height: 1,
                    objectFit: 'cover',
                    position: 'absolute',
                    opacity: isActive ? 1 : 0,
                    transition: `opacity ${BACKGROUND_FADE_MS}ms ease-in-out`,
                  }}
                />
              );
            })}
          </Box>
        ) : null}

        <Card
          sx={{
            top: {
              xs: showTopMenu ? 12 : 12,
              md: showTopMenu ? 25 : 25,
            },
            left: { xs: 15, md: 30 },
            zIndex: 10,
            px: 1.5,
            py: 1.25,
            minWidth: { xs: 180, sm: 220 },
            maxWidth: { xs: 'calc(100vw - 24px)', sm: 260 },
            position: 'absolute',
            bgcolor: varAlpha(commonVars.blackChannel, 0.5),
            border: `1px solid ${varAlpha(commonVars.whiteChannel, 0.2)}`,
            color: 'common.white',
            backdropFilter: 'blur(4px)',
          }}
        >
          {onToggleFullScreen ? (
            <IconButton
              size="small"
              aria-label={isFullScreen ? 'exit full screen preview' : 'enter full screen preview'}
              onClick={onToggleFullScreen}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 1,
                border: 1,
                borderColor: 'text.secondary',
                color: 'info.main',
                bgcolor: varAlpha(commonVars.blackChannel, 0.35),
                '&:hover': {
                  borderColor: 'text.secondary',
                  bgcolor: varAlpha(commonVars.blackChannel, 0.55),
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

          <Stack spacing={1.25}>
            {universe.name ? (
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'info.main',
                  lineHeight: 1.45,
                  textAlign: 'center',
                  wordBreak: 'break-word',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  px: onToggleFullScreen ? 3.5 : 0,
                  pt: 0.25,
                }}
              >
                {universe.name}
              </Typography>
            ) : null}

            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar
                    src={customer?.avatarUrl || undefined}
                    alt={customer?.name || 'Customer'}
                    onClick={() => { if (customer?.avatarUrl) setOpenAvatarPreview(true); }}
                    sx={{
                      width: 100,
                      height: 120,
                      bgcolor: 'grey.700',
                      cursor: customer?.avatarUrl ? 'pointer' : 'default',
                      transition: 'opacity 0.2s',
                      '&:hover': customer?.avatarUrl ? { opacity: 0.8 } : {},
                      borderRadius: 2,
                    }}
                  />
                  {friendshipState === 'friend' ? (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: varAlpha(commonVars.blackChannel, 0.55),
                        border: `1px solid ${varAlpha(commonVars.whiteChannel, 0.22)}`,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.28)',
                      }}
                    >
                      <Iconify icon="solar:heart-bold" width={14} sx={{ color: '#FF8A8A' }} />
                    </Box>
                  ) : null}
                </Box>
                <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1, pt: 0.25 }}>
                  <Typography variant="body1" noWrap>
                    {customer?.name || 'Customer'}
                  </Typography>

                  {universe.motif ? (
                    <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ minWidth: 0 }}>
                      <Typography component="span" sx={{ fontSize: 14, lineHeight: 1.45, flexShrink: 0 }}>
                        {getGuestAreaMotifIcon(universe.motif)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: isGuestAreaHomeSpaceOnlyMotif(universe.motif)
                            ? 'error.main'
                            : 'text.secondary',
                          lineHeight: 1.45,
                          wordBreak: 'break-word',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {universe.motif}
                      </Typography>
                    </Stack>
                  ) : null}

                  {universe.mood ? (
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ alignSelf: 'flex-start' }}>
                      <IconButton
                        size="small"
                        aria-label={showMood ? 'Hide mood' : 'Show mood'}
                        onClick={() => setShowMood((prev) => !prev)}
                        sx={{
                          width: 28,
                          height: 28,
                          border: 1,
                          borderColor: 'text.secondary',
                          color: showMood ? 'info.main' : 'text.secondary',
                          bgcolor: varAlpha(commonVars.blackChannel, 0.35),
                          '&:hover': {
                            borderColor: 'text.secondary',
                            bgcolor: varAlpha(commonVars.blackChannel, 0.55),
                            color: showMood ? 'info.lighter' : 'common.white',
                          },
                        }}
                      >
                        <Iconify
                          icon={showMood ? 'eva:eye-fill' : 'eva:eye-off-fill'}
                          width={16}
                        />
                      </IconButton>
                      <Typography
                        variant="caption"
                        sx={{
                          color: showMood ? 'info.main' : 'text.secondary',
                          lineHeight: 1,
                          userSelect: 'none',
                        }}
                      >
                        Mood
                      </Typography>
                    </Stack>
                  ) : null}

                  {friendshipState === 'you' ? (
                    <Chip size="small" label="You" color="primary" sx={{ alignSelf: 'flex-start' }} />
                  ) : friendshipState === 'requested' ? (
                    <Chip size="small" label="Requested" color="warning" sx={{ alignSelf: 'flex-start' }} />
                  ) : friendshipState !== 'friend' ? (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!canRequestFriend || requestingFriend}
                      onClick={() => onRequestFriend?.()}
                      sx={{
                        alignSelf: 'flex-start',
                        borderColor: 'text.secondary',
                        color: 'info.main',
                        bgcolor: varAlpha(commonVars.blackChannel, 0.35),
                        '&:hover': {
                          borderColor: 'text.secondary',
                          bgcolor: varAlpha(commonVars.blackChannel, 0.55),
                          color: 'info.lighter',
                        },
                      }}
                    >
                      {requestingFriend ? 'Requesting...' : 'Request friend'}
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </Stack>
          </Stack>
        </Card>

        {showBottomMoodRow ? (
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: { xs: 76, md: 92 },
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.25, sm: 0.75 },
              width: 'min(92vw, 720px)',
            }}
          >
            {showBackgroundControls ? (
              <IconButton
                aria-label="Previous background image"
                onClick={() => handleBackgroundStep(-1)}
                sx={backgroundSliderButtonSx}
              >
                <Iconify icon="eva:arrow-ios-back-fill" width={22} />
              </IconButton>
            ) : null}

            {showMoodBar ? (
              <UniverseLandingMoodMarquee mood={universe.mood} embedded />
            ) : (
              <Box sx={{ flex: 1, minWidth: 0 }} />
            )}

            {showBackgroundControls ? (
              <IconButton
                aria-label="Next background image"
                onClick={() => handleBackgroundStep(1)}
                sx={backgroundSliderButtonSx}
              >
                <Iconify icon="eva:arrow-ios-forward-fill" width={22} />
              </IconButton>
            ) : null}
          </Box>
        ) : null}

        <Button
          variant="outlined"
          onClick={handleShowCustomerSpace}
          endIcon={<Iconify icon="eva:arrow-ios-downward-fill" width={18} />}
          sx={{
            position: 'absolute',
            bottom: { xs: 20, md: 28 },
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            px: 2.5,
            py: 1,
            borderRadius: 99,
            whiteSpace: 'nowrap',
            borderColor: varAlpha(commonVars.whiteChannel, 0.4),
            color: 'common.white',
            bgcolor: varAlpha(commonVars.blackChannel, 0.5),
            backdropFilter: 'blur(4px)',
            '&:hover': {
              borderColor: 'common.white',
              bgcolor: varAlpha(commonVars.blackChannel, 0.7),
            },
          }}
        >
          {customerSpaceLabel}
        </Button>

        <IconButton
          aria-label="view design space gallery"
          onClick={() => setOpenGallery(true)}
          sx={{
            right: 16,
            bottom: 16,
            zIndex: 10,
            position: 'absolute',
            color: 'common.white',
            bgcolor: varAlpha(commonVars.blackChannel, 0.5),
            '&:hover': {
              bgcolor: varAlpha(commonVars.blackChannel, 0.7),
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
              bgcolor: varAlpha(commonVars.blackChannel, 0.55),
              '&:hover': {
                bgcolor: varAlpha(commonVars.blackChannel, 0.75),
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
