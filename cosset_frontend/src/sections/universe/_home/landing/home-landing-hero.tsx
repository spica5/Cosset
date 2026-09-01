import type { BoxProps } from '@mui/material/Box';

import Fade from 'embla-carousel-fade';
import Autoplay from 'embla-carousel-autoplay';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { bgBlur, varAlpha } from 'src/theme/universe/styles';

import { Iconify } from 'src/components/universe/iconify';
import { InstallCossetAppButton } from 'src/components/install-cosset-app';
import {
  Carousel,
  useCarousel,
  CarouselThumbs,
  CarouselDotButtons,
} from 'src/components/universe/carousel';

import type { HomeHeroSlide } from './home-images';

// ----------------------------------------------------------------------

type Props = BoxProps & {
  slides: HomeHeroSlide[];
};

export function HomeLandingHero({ slides, sx, ...other }: Props) {
  const carousel = useCarousel(
    {
      loop: true,
      duration: 40,
      thumbs: {
        loop: true,
        axis: 'y',
        slideSpacing: '0px',
        slidesToShow: 'auto',
      },
    },
    [Autoplay({ playOnInit: true, delay: 5000 }), Fade()]
  );

  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: 'common.black',
        ...sx,
      }}
      {...other}
    >
      <Carousel carousel={carousel}>
        {slides.map((slide) => (
          <CarouselItem key={slide.id} slide={slide} />
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
          bottom: 64,
          position: 'absolute',
          color: 'primary.main',
          justifyContent: 'center',
          display: { xs: 'inline-flex', md: 'none' },
        }}
      />

      <CarouselThumbs
        ref={carousel.thumbs.thumbsRef}
        options={carousel.options?.thumbs}
        slotProps={{ disableMask: true }}
        sx={{
          p: 0,
          zIndex: 9,
          top: '50%',
          height: 76 * 3,
          position: 'absolute',
          transform: 'translateY(-50%)',
          display: { xs: 'none', md: 'flex' },
          right: { xs: 20, lg: '6%', xl: '10%' },
        }}
      >
        {slides.map((slide, index) => (
          <ThumbnailItem
            key={slide.id}
            slide={slide}
            selected={index === carousel.thumbs.selectedIndex}
            onClick={() => carousel.thumbs.onClickThumb(index)}
          />
        ))}
      </CarouselThumbs>
    </Box>
  );
}

// ----------------------------------------------------------------------

type CarouselItemProps = BoxProps & {
  slide: HomeHeroSlide;
};

function CarouselItem({ slide, sx, ...other }: CarouselItemProps) {
  const theme = useTheme();

  return (
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
          } 75%)`,
        },
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
        gap={5}
        display="flex"
        alignItems="center"
        flexDirection="column"
        sx={{
          px: 2,
          py: 16,
          zIndex: 9,
          textAlign: 'center',
          position: 'relative',
          color: 'common.white',
        }}
      >
        <Typography variant="overline" sx={{ color: 'info.main' }}>
          {slide.overline}
        </Typography>

        <Typography variant="h2" component="h1" sx={{ maxWidth: 480 }}>
          {slide.title}
        </Typography>

        <Typography variant="subtitle1" sx={{ opacity: 0.8, maxWidth: 420 }}>
          {slide.caption}
        </Typography>

        <Box
          gap={1.5}
          display="flex"
          flexWrap="wrap"
          alignItems="center"
          justifyContent="center"
        >
          <Button variant="contained" size="large" color="primary">
            Visit now
          </Button>
          <InstallCossetAppButton
            variant="hero"
            size="large"
            color="inherit"
            buttonVariant="outlined"
            label="Install Cosset app"
            sx={{
              borderColor: 'common.white',
              color: 'common.white',
              '&:hover': {
                borderColor: 'common.white',
                bgcolor: 'rgba(255,255,255,0.12)',
              },
            }}
          />
        </Box>
      </Box>

      <Box
        component="img"
        alt={slide.title}
        src={slide.imageUrl}
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
    </Box>
  );
}

// ----------------------------------------------------------------------

type ThumbnailItemProps = BoxProps & {
  slide: HomeHeroSlide;
  selected?: boolean;
};

function ThumbnailItem({ slide, selected, sx, ...other }: ThumbnailItemProps) {
  const theme = useTheme();

  return (
    <Box
      gap={2.5}
      display="flex"
      alignItems="center"
      sx={{
        px: 2,
        py: 1.5,
        width: 300,
        borderRadius: 2,
        cursor: 'pointer',
        color: 'common.white',
        ...(selected && {
          ...bgBlur({
            color: varAlpha(theme.vars.palette.common.whiteChannel, 0.08),
          }),
        }),
        ...sx,
      }}
      {...other}
    >
      <Box
        component="img"
        alt={slide.title}
        src={slide.imageUrl}
        sx={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
      />

      <Box gap={0.5} display="flex" flex="1 1 auto" flexDirection="column" sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" component="span" noWrap>
          {slide.overline}
        </Typography>

        <Box component="span" gap={0.75} display="flex" alignItems="center">
          <Iconify width={18} icon="carbon:location" sx={{ color: 'primary.main' }} />
          <Typography variant="caption" noWrap sx={{ opacity: 0.48 }}>
            {slide.caption}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
