'use client';

import Box from '@mui/material/Box';

import { HOME_HERO_SLIDES } from '../landing/home-images';
import { HomeLandingHero } from '../landing/home-landing-hero';
import { HomeLandingIntroduce } from '../landing/home-landing-introduce';

// ----------------------------------------------------------------------

export function HomeLandingView() {
  return (
    <>
      <Box component="section" sx={{ position: 'relative' }}>
        <HomeLandingHero slides={HOME_HERO_SLIDES} />
      </Box>

      <HomeLandingIntroduce />
    </>
  );
}
