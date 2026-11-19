'use client';

import Box from '@mui/material/Box';

import { usePageVisit } from 'src/hooks/use-page-visit';
import { PAGE_VISIT_KEYS } from 'src/actions/page-visit';

import { HOME_HERO_SLIDES } from '../landing/home-images';
import { HomeLandingHero } from '../landing/home-landing-hero';
import { HomeLandingIntroduce } from '../landing/home-landing-introduce';

// ----------------------------------------------------------------------

export function HomeLandingView() {
  usePageVisit(PAGE_VISIT_KEYS.home, 'Homepage');

  return (
    <>
      <Box component="section" sx={{ position: 'relative' }}>
        <HomeLandingHero slides={HOME_HERO_SLIDES} />
      </Box>

      <HomeLandingIntroduce />
    </>
  );
}
