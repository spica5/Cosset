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
import { useTheme, keyframes } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import DialogContent from '@mui/material/DialogContent';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import {
  type DesignSpaceType,
  DEFAULT_DESIGN_SPACE_TYPE,
} from 'src/utils/design-space-type';
import { getGuestAreaMotifIcon, isGuestAreaHomeSpaceOnlyMotif } from 'src/utils/guest-area-status';

import { MAIL_WRITING_FONTS_STYLESHEET } from 'src/constants/mail-writing-fonts';

import { varAlpha, getThemeCommonVars } from 'src/theme/universe/styles';

import { Iconify } from 'src/components/universe/iconify/iconify';

import { UniverseLandingMoodMarquee } from './universe-landing-mood-marquee';

// ----------------------------------------------------------------------

const BACKGROUND_ROTATE_MS = 5 * 60 * 1000;
const BACKGROUND_FADE_MS = 900;

const SETUP_COMMENT_HANDWRITING_FONT =
  '"Caveat", "Caveat Variable", "Segoe Print", "Segoe Script", "Patrick Hand", cursive';

const SETUP_COMMENT_FONTS_LINK_ID = 'home-space-setup-comment-fonts';

const SETUP_COMMENT_TEXT = 'Customize your Home space with easy tools at My Universe';

const setupCommentSwing = keyframes`
  0% {
    transform: rotate(-2.6deg) translate3d(0, 0, 0);
  }
  20% {
    transform: rotate(2.4deg) translate3d(3px, -4px, 0);
  }
  45% {
    transform: rotate(-1.8deg) translate3d(-2px, 2px, 0);
  }
  70% {
    transform: rotate(2.2deg) translate3d(2px, -3px, 0);
  }
  100% {
    transform: rotate(-2.6deg) translate3d(0, 0, 0);
  }
`;

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
  isOwner?: boolean;
  /** Guest area + design space data finished loading (avoid setup-tip flash). */
  contentReady?: boolean;
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
  isOwner = false,
  contentReady = false,
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
  const [loadedBackgroundUrls, setLoadedBackgroundUrls] = useState<string[]>([]);
  const [failedBackgroundUrls, setFailedBackgroundUrls] = useState<string[]>([]);
  const [fadeLayers, setFadeLayers] = useState({
    a: '',
    b: '',
    active: 'a' as 'a' | 'b',
  });
  const [pageFullyLoaded, setPageFullyLoaded] = useState(false);

  const galleryImages = useMemo(() => {
    const gallery = (universe?.gallery || []).filter(Boolean);
    return Array.from(new Set(gallery));
  }, [universe?.gallery]);

  const backgroundImages = useMemo(() => {
    const images = [...galleryImages];
    const heroUrl = universe?.heroUrl?.trim();

    // Guest-area cover is only a fallback when there is no design-space gallery.
    if (!images.length && heroUrl) {
      images.push(heroUrl);
    }

    return images.filter((url) => url && !failedBackgroundUrls.includes(url));
  }, [failedBackgroundUrls, galleryImages, universe?.heroUrl]);

  useEffect(() => {
    setFailedBackgroundUrls([]);
    setLoadedBackgroundUrls([]);
  }, [universe?.heroUrl, universe?.gallery]);

  useEffect(() => {
    const pendingUrls = backgroundImages.filter(
      (url) =>
        url &&
        !loadedBackgroundUrls.includes(url) &&
        !failedBackgroundUrls.includes(url),
    );

    if (!pendingUrls.length) {
      return undefined;
    }

    let cancelled = false;

    pendingUrls.forEach((url) => {
      const image = new window.Image();
      image.onload = () => {
        if (!cancelled) {
          setLoadedBackgroundUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
        }
      };
      image.onerror = () => {
        if (!cancelled) {
          setFailedBackgroundUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
        }
      };
      image.src = url;
    });

    return () => {
      cancelled = true;
    };
  }, [backgroundImages, failedBackgroundUrls, loadedBackgroundUrls]);

  const hasVisibleBackground = backgroundImages.some((url) => loadedBackgroundUrls.includes(url));

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
    if (!selectedBackground || !loadedBackgroundUrls.includes(selectedBackground)) {
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
  }, [loadedBackgroundUrls, selectedBackground]);

  const preloadBackground = useCallback(
    (url: string) =>
      new Promise<boolean>((resolve) => {
        if (!url) {
          resolve(false);
          return;
        }

        if (loadedBackgroundUrls.includes(url)) {
          resolve(true);
          return;
        }

        const image = new window.Image();
        image.onload = () => {
          setLoadedBackgroundUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
          resolve(true);
        };
        image.onerror = () => {
          setFailedBackgroundUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
          resolve(false);
        };
        image.src = url;
      }),
    [loadedBackgroundUrls],
  );

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

  const handleSelectBackground = useCallback(
    async (image: string) => {
      const loaded = await preloadBackground(image);
      if (loaded) {
        setSelectedBackground(image);
      }
    },
    [preloadBackground],
  );

  const handleBackgroundImageError = useCallback((url: string) => {
    setFailedBackgroundUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
  }, []);

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

  const showMoodBar = Boolean(universe.mood?.trim());
  const showBackgroundControls = backgroundImages.length > 1;
  const showBottomMoodRow = showMoodBar || showBackgroundControls;

  const backgroundsSettled =
    backgroundImages.length === 0 ||
    hasVisibleBackground ||
    backgroundImages.every(
      (url) => loadedBackgroundUrls.includes(url) || failedBackgroundUrls.includes(url),
    );

  const needsHomeSpaceSetup =
    !universe.motif?.trim() || !universe.mood?.trim() || !hasVisibleBackground;

  const showOwnerSetupComments =
    isOwner &&
    contentReady &&
    pageFullyLoaded &&
    backgroundsSettled &&
    needsHomeSpaceSetup;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let cancelled = false;
    let timeoutId = 0;

    const markPageFullyLoaded = () => {
      if (cancelled) return;
      // Wait a beat after load so hero layout/paint can settle.
      timeoutId = window.setTimeout(() => {
        if (!cancelled) {
          setPageFullyLoaded(true);
        }
      }, 300);
    };

    if (document.readyState === 'complete') {
      markPageFullyLoaded();
    } else {
      window.addEventListener('load', markPageFullyLoaded);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener('load', markPageFullyLoaded);
    };
  }, []);

  useEffect(() => {
    if (!showOwnerSetupComments || typeof document === 'undefined') {
      return undefined;
    }

    if (document.getElementById(SETUP_COMMENT_FONTS_LINK_ID)) {
      return undefined;
    }

    const link = document.createElement('link');
    link.id = SETUP_COMMENT_FONTS_LINK_ID;
    link.rel = 'stylesheet';
    link.href = MAIL_WRITING_FONTS_STYLESHEET;
    document.head.appendChild(link);

    return undefined;
  }, [showOwnerSetupComments]);

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
        }}
      >
        {hasVisibleBackground && (fadeLayers.a || fadeLayers.b) ? (
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
              const isLoaded = loadedBackgroundUrls.includes(src);

              return (
                <Box
                  key={layer}
                  component="img"
                  alt=""
                  src={src}
                  onError={() => handleBackgroundImageError(src)}
                  sx={{
                    top: 0,
                    left: 0,
                    width: 1,
                    height: 1,
                    objectFit: 'cover',
                    position: 'absolute',
                    opacity: isActive && isLoaded ? 1 : 0,
                    transition: `opacity ${BACKGROUND_FADE_MS}ms ease-in-out`,
                  }}
                />
              );
            })}
          </Box>
        ) : null}

        <Stack
          direction="row"
          spacing={{ xs: 1, md: 1.5 }}
          alignItems="stretch"
          sx={{
            position: 'absolute',
            top: {
              xs: showTopMenu ? 12 : 12,
              md: showTopMenu ? 25 : 25,
            },
            left: { xs: 12, md: 30 },
            right: { xs: 12, md: 'auto' },
            zIndex: 10,
            maxWidth: { xs: 'calc(100% - 24px)', md: 'min(720px, calc(100% - 60px))' },
          }}
        >
        <Card
          sx={{
            px: { xs: 0.5, md: 1.5 },
            py: { xs: 0.5, md: 1.25 },
            width: { xs: 'auto', md: 'auto' },
            minWidth: { xs: 0, md: 220 },
            maxWidth: { xs: showOwnerSetupComments ? 180 : 'none', md: 260 },
            flexShrink: 0,
            position: 'relative',
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
                display: { xs: 'none', md: 'inline-flex' },
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

          <Stack spacing={{ xs: 0, md: 1.25 }}>
            {universe.name ? (
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'info.main',
                  lineHeight: 1.45,
                  textAlign: 'center',
                  wordBreak: 'break-word',
                  display: { xs: 'none', md: '-webkit-box' },
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

            <Stack
              direction="row"
              spacing={1}
              alignItems="flex-start"
              sx={{ minWidth: 0, flex: 1, width: 1 }}
            >
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar
                    src={customer?.avatarUrl || undefined}
                    alt={customer?.name || 'Customer'}
                    onClick={() => { if (customer?.avatarUrl) setOpenAvatarPreview(true); }}
                    sx={{
                      width: { xs: 48, md: 100 },
                      height: { xs: 58, md: 120 },
                      bgcolor: 'grey.700',
                      cursor: customer?.avatarUrl ? 'pointer' : 'default',
                      transition: 'opacity 0.2s',
                      '&:hover': customer?.avatarUrl ? { opacity: 0.8 } : {},
                      borderRadius: { xs: 1.25, md: 2 },
                    }}
                  />
                  {friendshipState === 'friend' ? (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: { xs: 3, md: 6 },
                        left: { xs: 3, md: 6 },
                        width: { xs: 18, md: 26 },
                        height: { xs: 18, md: 26 },
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: varAlpha(commonVars.blackChannel, 0.55),
                        border: `1px solid ${varAlpha(commonVars.whiteChannel, 0.22)}`,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.28)',
                      }}
                    >
                      <Iconify icon="solar:heart-bold" width={14} sx={{ color: '#FF8A8A', width: { xs: 10, md: 14 } }} />
                    </Box>
                  ) : null}
                </Box>
                <Stack
                  spacing={0.75}
                  sx={{
                    display: { xs: 'none', md: 'flex' },
                    minWidth: 0,
                    flex: 1,
                    pt: 0.25,
                    width: 1,
                  }}
                >
                  <Typography
                    variant="body1"
                    noWrap
                    sx={{ width: 1 }}
                  >
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
                            ? 'error.light'
                            : varAlpha(commonVars.whiteChannel, 0.82),
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
        </Card>

        {showOwnerSetupComments ? (
          <Box
            sx={{
              flex: '0 1 auto',
              minWidth: 0,
              width: 1,
              maxWidth: 360,
              position: 'relative',
              ml: '18px',
              transformOrigin: 'top center',
              animation: `${setupCommentSwing} 4.8s ease-in-out infinite`,
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
              },
            }}
          >
            <Box
              aria-hidden
              component="svg"
              viewBox="0 0 360 200"
              preserveAspectRatio="none"
              sx={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: -20,
                width: 'calc(100% + 20px)',
                height: 1,
                pointerEvents: 'none',
                filter: 'drop-shadow(0 10px 22px rgba(0, 0, 0, 0.2))',
              }}
            >
              <path
                d="M 68 8
                   H 336
                   Q 356 8 356 28
                   V 172
                   Q 356 192 336 192
                   H 68
                   Q 48 192 48 172
                   V 78
                   L 8 54
                   L 48 30
                   V 28
                   Q 48 8 68 8
                   Z"
                fill="rgba(10, 10, 10, 0.34)"
                stroke="rgba(255, 248, 240, 0.75)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </Box>

            <Stack
              spacing={1.25}
              justifyContent="center"
              sx={{
                position: 'relative',
                zIndex: 1,
                width: 1,
                minWidth: 0,
                // Keep content inside the rectangle body (clear of the left tip)
                pl: { xs: 5.5, md: 6 },
                pr: { xs: 1.95, md: 2.5 },
                py: { xs: 2.75, md: 3.2 },
              }}
            >
              <Typography
                sx={{
                  fontFamily: SETUP_COMMENT_HANDWRITING_FONT,
                  fontSize: { xs: '1.12rem', md: '1.28rem' },
                  fontWeight: 500,
                  color: 'rgba(255, 248, 240, 0.92)',
                  lineHeight: 1.35,
                  letterSpacing: 0.2,
                  textShadow: '0 1px 8px rgba(0, 0, 0, 0.25)',
                }}
              >
                {SETUP_COMMENT_TEXT}
              </Typography>

              <Button
                component={RouterLink}
                href={paths.dashboard.homeSpace.guestArea}
                size="small"
                variant="contained"
                sx={{ alignSelf: 'flex-end', borderRadius: 99 }}
              >
                Go to My Universe
              </Button>
            </Stack>
          </Box>
        ) : null}
        </Stack>

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
                        handleSelectBackground(image);
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
  );
}
