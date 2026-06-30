import { CONFIG } from 'src/config-global';

import {
  type DesignSpaceType,
  normalizeDesignSpaceType,
} from 'src/utils/design-space-type';

// ----------------------------------------------------------------------

export type MyspaceSectionImageKey =
  | 'blogs-section'
  | 'albums-section'
  | 'drawers-section'
  | 'collection-items-section'
  | 'bookshelf-section';

const MYSPACE_ASSETS_BASE = `${CONFIG.universe.assetsDir}/assets/images/myspace`;

const DESIGN_TYPE_ASSET_FOLDER: Record<DesignSpaceType, string> = {
  'gentle-feminine-romantic': 'gentle_feminine_romantic',
  'serene-elegant': 'serene_elegant',
  'warm-nostalgic': 'warm_nostalgic',
  'strong-modern': 'strong_modern',
};

const SECTION_IMAGE_FILE: Record<MyspaceSectionImageKey, string> = {
  'blogs-section': 'Blogs.png',
  'albums-section': 'Albums.png',
  'drawers-section': 'Drawers.png',
  'collection-items-section': 'Collections.png',
  'bookshelf-section': 'Bookshelf.png',
};

const DEFAULT_SECTION_IMAGE_FILE: Record<MyspaceSectionImageKey, string> = {
  'blogs-section': 'Blogs.png',
  'albums-section': 'Albums.png',
  'drawers-section': 'Drawers.png',
  'collection-items-section': 'Collections.png',
  'bookshelf-section': 'bookshelf.png',
};

export function getDesignTypeAssetFolder(designType: DesignSpaceType): string {
  return DESIGN_TYPE_ASSET_FOLDER[normalizeDesignSpaceType(designType)];
}

export function getMyspaceSectionImageUrl(
  designType: DesignSpaceType,
  sectionId: MyspaceSectionImageKey,
): string {
  const folder = getDesignTypeAssetFolder(designType);
  const file = SECTION_IMAGE_FILE[sectionId];

  return `${MYSPACE_ASSETS_BASE}/${folder}/${file}`;
}

export function getMyspaceSectionImageFallbackUrl(sectionId: MyspaceSectionImageKey): string {
  return `${MYSPACE_ASSETS_BASE}/${DEFAULT_SECTION_IMAGE_FILE[sectionId]}`;
}
