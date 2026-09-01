'use client';

import type { BoxProps } from '@mui/material/Box';

import Fade from 'embla-carousel-fade';
import Autoplay from 'embla-carousel-autoplay';
import { useEffect, useRef } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { CONFIG } from 'src/config-global';
import { useGetIntroVideo } from 'src/actions/intro-video';

import { SvgColor } from 'src/components/universe/svg-color';
import { Carousel, useCarousel, CarouselDotButtons } from 'src/components/universe/carousel';

import { HOME_INTRODUCE_SLIDES } from './home-images';

// ----------------------------------------------------------------------

const iconPath = (name: string) => `${CONFIG.universe.assetsDir}/assets/icons/solid-64/${name}`;

const INTRODUCTIONS = [
  {
    title: 'Photo Albums',
    description: 'Organize and cherish your memories in beautiful albums',
    icon: iconPath('ic-popularity.svg'),
  },
  {
    title: 'Community',
    description: 'Connect with friends and neighbors in your area',
    icon: iconPath('ic-cooperate.svg'),
  },
  {
    title: 'Coffee Shops',
    description: 'Discover and share your favorite local spots',
    icon: iconPath('ic-satisfaction.svg'),
  },
  {
    title: 'Drawers',
    description: 'Keep everything organized in your personal space',
    icon: iconPath('ic-creativity.svg'),
  },
];

function IntroVideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return undefined;

    const playFromStart = () => {
      try {
        video.currentTime = 0;
      } catch {
        // ignore seek errors before metadata is ready
      }
      video.muted = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => undefined);
      }
    };

    const stopPlayback = () => {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // ignore seek errors before metadata is ready
      }
    };

    const onLoadedData = () => {
      // Only auto-start if the player is already on screen.
      const rect = container.getBoundingClientRect();
      const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
      const ratio = rect.height > 0 ? visibleHeight / rect.height : 0;
      if (ratio >= 0.35) {
        playFromStart();
      } else {
        stopPlayback();
      }
    };

    video.addEventListener('loadeddata', onLoadedData);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          playFromStart();
        } else {
          stopPlayback();
        }
      },
      { threshold: [0, 0.15, 0.35, 0.6, 1] },
    );

    observer.observe(container);

    return () => {
      video.removeEventListener('loadeddata', onLoadedData);
      observer.disconnect();
      stopPlayback();
    };
  }, [src]);

  return (
    <Box ref={containerRef} sx={{ width: 1, height: 1 }}>
      <Box
        component="video"
        ref={videoRef}
        key={src}
        src={src}
        muted
        loop
        playsInline
        controls
        preload="auto"
        sx={{
          width: 1,
          height: 1,
          display: 'block',
          objectFit: 'cover',
          bgcolor: 'common.black',
        }}
      />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function HomeLandingIntroduce({ sx, ...other }: BoxProps) {
  const containerOffset = 'calc((100vw - 1200px) / 2)';
  const { introVideo, introVideoLoading } = useGetIntroVideo(true);

  const carousel = useCarousel(
    {
      loop: true,
      duration: 60,
    },
    [Autoplay({ playOnInit: true, delay: 4500 }), Fade()]
  );

  const renderList = (
    <Container sx={{ textAlign: 'center' }}>
      <Box
        display="grid"
        gap={{ xs: 5, md: 3 }}
        gridTemplateColumns={{
          xs: 'repeat(1, 1fr)',
          md: 'repeat(4, 1fr)',
        }}
      >
        {INTRODUCTIONS.map((value) => (
          <div key={value.title}>
            <SvgColor
              src={value.icon}
              width={64}
              sx={{
                background: (theme) =>
                  `linear-gradient(to bottom, ${theme.vars.palette.primary.light}, ${theme.vars.palette.primary.main})`,
              }}
            />

            <Typography component="h6" variant="h5" sx={{ mt: 3, mb: 1 }}>
              {value.title}
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {value.description}
            </Typography>
          </div>
        ))}
      </Box>
    </Container>
  );

  const renderTexts = (
    <Container>
      <Stack
        spacing={3}
        sx={{
          maxWidth: 480,
          mx: { xs: 'auto', md: 'unset' },
          textAlign: { xs: 'center', md: 'unset' },
        }}
      >
        <Typography variant="h2">Welcome to Cosset</Typography>

        <Typography sx={{ color: 'text.secondary' }}>
          A Place for Retreat -
          Your personal sanctuary for memories, connections, and creativity. Store your precious
          moments, connect with friends and neighbors, and explore a world of shared experiences.
        </Typography>
      </Stack>
    </Container>
  );

  const renderIntroVideo = (
    <Box
      sx={{
        top: { xs: 16, sm: 24, md: 32, lg: 40 },
        left: { xs: 16, sm: 24, md: 32, lg: 40 },
        zIndex: 9,
        position: 'absolute',
        width: { xs: 'calc(100% - 32px)', sm: '48%', md: '40%' },
        maxWidth: { xs: 1, md: 'none' },
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'common.black',
        boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
        aspectRatio: '16 / 9',
      }}
    >
      {introVideoLoading ? (
        <Box
          sx={{
            width: 1,
            height: 1,
            minHeight: { xs: 140, sm: 160 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={28} sx={{ color: 'common.white' }} />
        </Box>
      ) : introVideo?.playbackUrl ? (
        <IntroVideoPlayer src={introVideo.playbackUrl} />
      ) : (
        <Box
          sx={{
            width: 1,
            height: 1,
            minHeight: { xs: 140, sm: 160 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 2,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
            Introduction video coming soon
          </Typography>
        </Box>
      )}
    </Box>
  );

  const renderImage = (
    <Container
      sx={(theme) => ({
        px: 0,
        my: { xs: 4, md: 7 },
        position: 'relative',
        [theme.breakpoints.up('sm')]: { px: 0 },
        [theme.breakpoints.up('lg')]: { px: 3 },
      })}
    >
      {renderIntroVideo}

      <Box
        sx={(theme) => ({
          position: 'relative',
          overflow: 'hidden',
          height: { xs: 480, sm: 560, md: 640 },
          [theme.breakpoints.up('lg')]: {
            maxWidth: 'unset',
            width: `calc(100vw - ${containerOffset})`,
          },
        })}
      >
        <Carousel carousel={carousel} sx={{ width: 1, height: 1 }}>
          {HOME_INTRODUCE_SLIDES.map((slide) => (
            <Box
              key={slide.id}
              component="img"
              loading="lazy"
              alt={slide.alt}
              src={slide.imageUrl}
              sx={{ width: 1, height: 1, objectFit: 'cover' }}
            />
          ))}
        </Carousel>

        <CarouselDotButtons
          variant="rounded"
          scrollSnaps={carousel.dots.scrollSnaps}
          selectedIndex={carousel.dots.selectedIndex}
          onClickDot={carousel.dots.onClickDot}
          sx={{
            left: 0,
            right: 0,
            bottom: 16,
            position: 'absolute',
            color: 'primary.main',
            justifyContent: 'center',
          }}
        />
      </Box>
    </Container>
  );

  return (
    <Box
      component="section"
      sx={{
        overflow: 'hidden',
        pt: { xs: 10, md: 15 },
        pb: { xs: 5, md: 10 },
        ...sx,
      }}
      {...other}
    >
      {renderTexts}
      {renderImage}
      {renderList}
    </Box>
  );
}
