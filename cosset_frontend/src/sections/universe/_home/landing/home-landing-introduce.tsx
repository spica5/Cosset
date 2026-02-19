import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/universe/iconify';
import { SvgColor } from 'src/components/universe/svg-color';

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
          Your personal sanctuary for memories, connections, and creativity. Store your precious moments, connect with friends and neighbors, and explore a world of shared experiences.
        </Typography>
      </Stack>
    </Container>
  );

  const renderCard = (
    <Card
      sx={(theme) => ({
        p: 5,
        top: 24,
        left: 24,
        zIndex: 9,
        right: 24,
        bottom: 24,
        display: 'flex',
        textAlign: 'center',
        position: 'absolute',
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
        [theme.breakpoints.up('sm')]: {
          right: 'auto',
          bottom: 'auto',
          textAlign: 'unset',
          alignItems: 'unset',
          justifyContent: 'unset',
        },
        [theme.breakpoints.up('md')]: { top: 40, left: 40, maxWidth: 360 },
        [theme.breakpoints.up('lg')]: { top: 64, left: 64 },
      })}
    >
      <Typography variant="overline" sx={{ color: 'text.disabled' }}>
        Device
      </Typography>

      <Typography component="h6" variant="h4" sx={{ my: 3 }}>
        The more important the work
      </Typography>

      <Box
        gap={1}
        display="flex"
        alignItems="center"
        sx={{
          cursor: 'pointer',
          color: 'primary.main',
          typography: 'subtitle1',
          '&:hover': { opacity: 0.72 },
        }}
      >
        <Iconify width={22} icon="solar:play-outline" /> Watch video
      </Box>
    </Card>
  );

  const renderImage = (
    <Container
      sx={(theme) => ({
        px: 0,
        my: { xs: 5, md: 10 },
        position: 'relative',
        [theme.breakpoints.up('sm')]: { px: 0 },
        [theme.breakpoints.up('md')]: { my: 10 },
        [theme.breakpoints.up('lg')]: { px: 3 },
      })}
    >
      {renderCard}

      <Box
        component="img"
        loading="lazy"
        alt="Universe cover"
        src={`${CONFIG.universe.assetsDir}/assets/images/universe/universe-large-1.webp`}
        sx={(theme) => ({
          minHeight: 320,
          objectFit: 'cover',
          [theme.breakpoints.up('lg')]: {
            maxWidth: 'unset',
            width: `calc(100vw - ${containerOffset})`,
          },
        })}
      />
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
