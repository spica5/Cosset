'use client';

import Box from '@mui/material/Box';

import { _universes } from 'src/_mock/universe';

import { HomeLandingHero } from '../landing/home-landing-hero';
import { HomeLandingIntroduce } from '../landing/home-landing-introduce';

// ----------------------------------------------------------------------

const heroUniverses = _universes.slice(0, 5);

export function HomeLandingView() {
  return (
    <>
      <Box component="section" sx={{ position: 'relative' }}>
        <HomeLandingHero universes={heroUniverses} />
      </Box>

      <HomeLandingIntroduce />
    </>
  );
}
