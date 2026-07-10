import {
  type DesignSpaceType,
  normalizeDesignSpaceType,
} from 'src/utils/design-space-type';

import { CONFIG } from 'src/config-global';

import {
  getDesignTypeAssetFolder,
  getMyspaceSectionImageUrl,
  type MyspaceSectionImageKey,
} from './myspace-section-images';

// ----------------------------------------------------------------------

export type JourneyDiarySectionImageKey = 'all' | 'journey' | 'notes' | 'memorial';

const JOURNEY_DIARY_ASSETS_BASE = `${CONFIG.universe.assetsDir}/assets/images/journey-diary`;

const SECTION_IMAGE_FILE: Record<JourneyDiarySectionImageKey, string> = {
  all: 'AllEntries.png',
  journey: 'MyJourney.png',
  notes: 'MyNotes.png',
  memorial: 'MemorialThings.png',
};

const MYSPACE_SECTION_FALLBACK: Record<JourneyDiarySectionImageKey, MyspaceSectionImageKey> = {
  all: 'albums-section',
  journey: 'albums-section',
  notes: 'blogs-section',
  memorial: 'collection-items-section',
};

export function getJourneyDiarySectionImageUrl(
  designType: DesignSpaceType,
  sectionId: JourneyDiarySectionImageKey,
): string {
  const folder = getDesignTypeAssetFolder(normalizeDesignSpaceType(designType));
  const file = SECTION_IMAGE_FILE[sectionId];

  return `${JOURNEY_DIARY_ASSETS_BASE}/${folder}/${file}`;
}

export function getJourneyDiarySectionImageFallbackUrl(
  designType: DesignSpaceType,
  sectionId: JourneyDiarySectionImageKey,
): string {
  return getMyspaceSectionImageUrl(designType, MYSPACE_SECTION_FALLBACK[sectionId]);
}
