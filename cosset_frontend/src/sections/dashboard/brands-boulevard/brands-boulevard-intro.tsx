'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

export const BRANDS_BOULEVARD_PAGE_BACKGROUND = `${CONFIG.dashboard.assetsDir}/assets/images/brands-boulevard/background.png`;

const INTRO_PARAGRAPHS = [
  'Welcome to Brands Boulevard — a shopping street for makers, boutiques, and business storytellers. Like Coffee Boulevard, it is a place to stroll, discover, and step inside unique spaces.',
  'When you open a business account with Cosset, we help you launch your own online storefront. Your store lives as its own address on the boulevard, showing only your brand, your categories, and your products.',
  'Create categories with our tools and designs, add products that reflect your craft, and invite the community to walk through your doors.',
];

function BrandDivider() {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: 1, maxWidth: 280, mx: 'auto' }}>
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255, 244, 229, 0.45)' }} />
      <Iconify icon="solar:shop-2-bold" width={22} sx={{ color: 'rgba(255, 244, 229, 0.85)' }} />
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255, 244, 229, 0.45)' }} />
    </Stack>
  );
}

export function BrandsBoulevardIntro() {
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
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(100deg, rgba(26, 21, 32, 0.2) 0%, rgba(26, 21, 32, 0.45) 28%, rgba(26, 21, 32, 0.55) 55%, rgba(26, 21, 32, 0.4) 78%, rgba(26, 21, 32, 0.15) 100%)',
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
            color: '#FFF4E5',
            lineHeight: 1.25,
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.45)',
          }}
        >
          Welcome to Brands Boulevard.
        </Typography>

        <BrandDivider />

        <Stack spacing={1.75}>
          {INTRO_PARAGRAPHS.map((paragraph) => (
            <Typography
              key={paragraph}
              variant="body1"
              sx={{
                color: 'rgba(255, 244, 229, 0.95)',
                fontSize: { xs: '0.95rem', md: '1rem' },
                lineHeight: 1.75,
                textShadow: '0 1px 6px rgba(0, 0, 0, 0.4)',
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
            color: '#FFF4E5',
            fontSize: { xs: '1.05rem', md: '1.15rem' },
            pt: 0.5,
            textShadow: '0 1px 6px rgba(0, 0, 0, 0.4)',
          }}
        >
          Take a walk. Choose a store. Make yourself at home.
        </Typography>

        <BrandDivider />
      </Stack>
    </Box>
  );
}
