'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

export const COFFEE_SHOP_PAGE_BACKGROUND = `${CONFIG.dashboard.assetsDir}/assets/images/coffee-shop/background1.png`;

const INTRO_PARAGRAPHS = [
  'In a world that never seems to slow down, everyone deserves a peaceful corner to relax, recharge, and connect. The Cosset Coffee Boulevard is a virtual gathering place designed for coffee lovers, dreamers, travelers, and friends from around the world.',
  'Here, each coffee shop is more than just a destination—it is a unique atmosphere, a story, and a community waiting to be discovered. Whether you are seeking a quiet moment alone, meaningful conversations, or a cozy place to meet friends online when distance keeps you apart, you will always find a welcoming seat here.',
  'Stroll down our charming boulevard, explore beautiful cafés, and step into spaces created for relaxation, friendship, creativity, and inspiration.',
  'Because sometimes the perfect coffee meeting happens not in the real world, but in a place where imagination, comfort, and connection come together.',
];

// ----------------------------------------------------------------------

function CoffeeDivider() {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: 1, maxWidth: 280, mx: 'auto' }}>
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(62, 39, 35, 0.35)' }} />
      <Iconify icon="solar:cup-bold" width={22} sx={{ color: 'rgba(62, 39, 35, 0.75)' }} />
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(62, 39, 35, 0.35)' }} />
    </Stack>
  );
}

export function CoffeeShopIntro() {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2,
        mb: { xs: 3, md: 4 },
        minHeight: { xs: 420, md: 520 },
      }}
    >
      
      {/* <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(255, 248, 240, 0.15) 0%, rgba(255, 248, 240, 0.72) 28%, rgba(255, 248, 240, 0.82) 55%, rgba(255, 248, 240, 0.72) 78%, rgba(255, 248, 240, 0.2) 100%)',
        }}
      /> */}

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(100deg, rgba(255, 248, 240, 0.15) 0%, rgba(255, 248, 240, 0.52) 28%, rgba(255, 248, 240, 0.72) 55%, rgba(255, 248, 240, 0.62) 78%, rgba(255, 248, 240, 0.2) 100%)',
        }}
      />

      <Stack
        spacing={{ xs: 2, md: 2.5 }}
        sx={{
          position: 'relative',
          zIndex: 1,
          px: { xs: 2.5, sm: 4, md: 6 },
          py: { xs: 4, md: 5 },
          maxWidth: 920,
          mx: 'auto',
          textAlign: 'center',
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Georgia", "Times New Roman", serif',
            fontWeight: 500,
            fontSize: { xs: '1.65rem', sm: '2rem', md: '2.35rem' },
            color: '#2C1810',
            lineHeight: 1.25,
          }}
        >
          Welcome to The Cosset Coffee Boulevard.
        </Typography>

      <CoffeeDivider />

      <Stack spacing={1.75}>
        {INTRO_PARAGRAPHS.map((paragraph) => (
          <Typography
            key={paragraph}
            variant="body1"
            sx={{
              color: 'rgba(44, 24, 16, 0.88)',
              fontSize: { xs: '0.95rem', md: '1rem' },
              lineHeight: 1.75,
            }}
          >
            {paragraph}
          </Typography>
        ))}
      </Stack>

      <Typography
        variant="h6"
        sx={{
          fontFamily: '"Georgia", "Times New Roman", serif',
          fontWeight: 500,
          fontStyle: 'italic',
          color: '#2C1810',
          fontSize: { xs: '1.05rem', md: '1.15rem' },
          pt: 0.5,
        }}
      >
        Take a walk. Choose a café. Make yourself at home.
      </Typography>

        <CoffeeDivider />
      </Stack>
    </Box>
  );
}
