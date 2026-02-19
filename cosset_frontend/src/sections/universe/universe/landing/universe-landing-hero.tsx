import type { BoxProps } from '@mui/material/Box';
import type { IUniverseProps } from 'src/types/universe';

import Box from '@mui/material/Box';
import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { varAlpha } from 'src/theme/universe/styles';

import { Iconify } from 'src/components/universe/iconify/iconify';

// ----------------------------------------------------------------------

type Props = BoxProps & {
  universe: IUniverseProps;
};

export function UniverseLandingHero({ universe, sx, ...other }: Props) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: 'common.black',
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
          <Typography variant="h1" sx={{ color: 'info.main' }}>
            {universe.name}
          </Typography>

          <Typography variant="h2" component="h1" sx={{ maxWidth: { xs: 480, md: 800 } }}>
            {universe.motif}
          </Typography>

          <Typography variant="h3" component="h1" sx={{ maxWidth: 480 }}>
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
              
        <Box
          component="img"
          alt={universe.name}
          src={universe.heroUrl}
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
    </Box>
  )
}