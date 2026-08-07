import type { BoxProps } from '@mui/material/Box';
import type { Breakpoint } from '@mui/material/styles';

import Fade from 'embla-carousel-fade';
import Autoplay from 'embla-carousel-autoplay';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { varAlpha, textGradient } from 'src/theme/universe/styles';

import { Carousel, useCarousel, CarouselDotButtons } from 'src/components/universe/carousel';

// ----------------------------------------------------------------------

type SectionProps = BoxProps & {
  title: string;
  images: string[];
  layoutQuery: Breakpoint;
  mobileVisible?: boolean;
};

export function Section({
  title,
  images,
  layoutQuery,
  mobileVisible = false,
  sx,
  ...other
}: SectionProps) {
  const theme = useTheme();

  const carousel = useCarousel(
    {
      loop: true,
      duration: 80,
    },
    [Autoplay({ delay: 5000 }), Fade()]
  );

  return (
    <Box
      sx={{
        display: mobileVisible ? 'flex' : 'none',
        flex: '1 1 auto',
        position: 'relative',
        bgcolor: 'common.black',
        height: mobileVisible ? 280 : '100vh',
        minHeight: mobileVisible ? 280 : undefined,
        '&::before': {
          top: 0,
          left: 0,
          width: 1,
          height: 1,
          zIndex: 8,
          content: "''",
          position: 'absolute',
          backgroundImage: `linear-gradient(to bottom, ${varAlpha(theme.vars.palette.common.blackChannel, 0)} 50%, ${
            theme.vars.palette.common.black
          } 85%)`,
        },
        [theme.breakpoints.up(layoutQuery)]: {
          display: 'flex',
          height: '100vh',
          minHeight: undefined,
          '&::before': {
            backgroundImage: `linear-gradient(to bottom, ${varAlpha(theme.vars.palette.common.blackChannel, 0)} 0%, ${
              theme.vars.palette.common.black
            } 75%)`,
          },
        },
        ...sx,
      }}
      {...other}
    >
      <Carousel
        carousel={carousel}
        sx={{
          top: 0,
          left: 0,
          width: 1,
          height: 1,
          zIndex: 7,
          position: 'absolute',
        }}
      >
        {images.map((img) => (
          <Box
            key={img}
            component="img"
            alt={img}
            src={img}
            sx={{
              width: 1,
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center center',
            }}
          />
        ))}
      </Carousel>

      <Box
        gap={10}
        display="flex"
        alignItems="center"
        flexDirection="column"
        sx={{
          zIndex: 9,
          bottom: mobileVisible ? 20 : 80,
          left: '50%',
          position: 'absolute',
          transform: 'translateX(-50%)',
        }}
      >
        <Typography
          variant="h2"
          sx={{
            ...textGradient(
              `90deg, ${theme.vars.palette.primary.main} 20%, ${theme.vars.palette.secondary.main} 100%`
            ),
            whiteSpace: 'pre-line',
            fontSize: mobileVisible ? '1.85rem' : undefined,
          }}
        >
          {title}
        </Typography>

        <CarouselDotButtons
          variant="rounded"
          scrollSnaps={carousel.dots.scrollSnaps}
          selectedIndex={carousel.dots.selectedIndex}
          onClickDot={carousel.dots.onClickDot}
          sx={{ color: 'primary.main' }}
        />
      </Box>
    </Box>
  );
}
