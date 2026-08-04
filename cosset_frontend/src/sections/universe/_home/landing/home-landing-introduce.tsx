'use client';

import type { BoxProps } from '@mui/material/Box';

import Fade from 'embla-carousel-fade';
import Autoplay from 'embla-carousel-autoplay';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/universe/iconify';
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

// ----------------------------------------------------------------------

export function HomeLandingIntroduce({ sx, ...other }: BoxProps) {
  const containerOffset = 'calc((100vw - 1200px) / 2)';

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

  const renderCard = (
    <Card
      sx={(theme) => ({
        p: { xs: 2, sm: 3, md: 5 },
        top: { xs: 16, sm: 24, md: 32, lg: 40 },
        left: { xs: 16, sm: 24, md: 32, lg: 40 },
        zIndex: 9,
        right: 'auto',
        bottom: 'auto',
        maxWidth: { xs: 200, sm: 260, md: 320 },
        width: { xs: '58%', sm: 'auto' },
        display: 'flex',
        textAlign: { xs: 'center', sm: 'unset' },
        position: 'absolute',
        alignItems: { xs: 'center', sm: 'unset' },
        flexDirection: 'column',
        justifyContent: 'center',
      })}
    >
      <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: { xs: 10, sm: undefined } }}>
        Device
      </Typography>

      <Typography
        component="h6"
        variant="h4"
        sx={{ my: { xs: 1.25, sm: 2, md: 3 }, typography: { xs: 'subtitle1', sm: 'h6', md: 'h4' } }}
      >
        The more important the work
      </Typography>

      <Box
        gap={1}
        display="flex"
        alignItems="center"
        sx={{
          cursor: 'pointer',
          color: 'primary.main',
          typography: { xs: 'body2', sm: 'subtitle1' },
          '&:hover': { opacity: 0.72 },
        }}
      >
        <Iconify width={20} icon="solar:play-outline" /> Watch video
      </Box>
    </Card>
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
      {renderCard}

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
