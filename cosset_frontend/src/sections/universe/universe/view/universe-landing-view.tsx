'use client';

import type { IUniverseProps } from 'src/types/universe';

import { _albums } from 'src/_mock/universe';

import { UniverseLandingHero } from '../landing/universe-landing-hero';
import { UniverseLandingAlbums } from '../landing/universe-landing-albums';


// ----------------------------------------------------------------------

type Props = {
  universe?: IUniverseProps;
};

const albums = _albums.slice(0, 6);

export function UniverseLandingView({ universe }: Props) {
  return (
    <>
      <UniverseLandingHero universe={universe!} />

      <UniverseLandingAlbums albums={albums} />
    </>
  );
}
