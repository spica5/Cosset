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

// ----------------------------------------------------------------------

const JOURNEY_REPRESENTATIVE_ASSETS_BASE = `${CONFIG.universe.assetsDir}/assets/images/journey`;

const DEFAULT_JOURNEY_REPRESENTATIVE_FILE = 'warm_nostalgic_represent.png';

const JOURNEY_REPRESENTATIVE_IMAGE_FILE: Record<DesignSpaceType, string> = {
  'gentle-feminine-romantic': 'romantic_represent.png',
  'serene-elegant': 'elegant_serene_represent.png',
  'warm-nostalgic': 'warm_nostalgic_represent.png',
  'strong-modern': 'strong_mordern_represent.png',
  'young-dynamic': 'young_dynamic_represent.png',
  'navy-blue': 'mysterious_creative_represnet.png',
};

export function getJourneyDiaryRepresentativeImageUrl(designType: DesignSpaceType): string {
  const normalized = normalizeDesignSpaceType(designType);
  const file =
    JOURNEY_REPRESENTATIVE_IMAGE_FILE[normalized] ?? DEFAULT_JOURNEY_REPRESENTATIVE_FILE;

  return `${JOURNEY_REPRESENTATIVE_ASSETS_BASE}/${file}`;
}

export function getJourneyDiaryRepresentativeImageFallbackUrl(): string {
  return `${JOURNEY_REPRESENTATIVE_ASSETS_BASE}/${DEFAULT_JOURNEY_REPRESENTATIVE_FILE}`;
}
