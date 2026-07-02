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
  | 'collection-items-section';

const MYSPACE_ASSETS_BASE = `${CONFIG.universe.assetsDir}/assets/images/myspace`;
const BOOKSHELF_ASSETS_BASE = `${CONFIG.universe.assetsDir}/assets/images/bookshelf`;
const DESIGN_CATEGORY_ASSETS_BASE = `${MYSPACE_ASSETS_BASE}/design_category`;

const DESIGN_TYPE_ASSET_FOLDER: Record<DesignSpaceType, string> = {
  'gentle-feminine-romantic': 'gentle_feminine_romantic',
  'serene-elegant': 'serene_elegant',
  'warm-nostalgic': 'warm_nostalgic',
  'strong-modern': 'strong_modern',
  'young-dynamic': 'young_dynamic',
  'navy-blue': 'navy_blue',
};

const SECTION_IMAGE_FILE: Record<MyspaceSectionImageKey, string> = {
  'blogs-section': 'Blogs.png',
  'albums-section': 'Albums.png',
  'drawers-section': 'Drawers.png',
  'collection-items-section': 'Collections.png',
};

const DEFAULT_SECTION_IMAGE_FILE: Record<MyspaceSectionImageKey, string> = {
  'blogs-section': 'Blogs.png',
  'albums-section': 'Albums.png',
  'drawers-section': 'Drawers.png',
  'collection-items-section': 'Collections.png',
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

export function getDesignCategoryImageUrl(designType: DesignSpaceType): string {
  const normalized = normalizeDesignSpaceType(designType);
  const folder = getDesignTypeAssetFolder(normalized);
  const file = normalized === 'navy-blue' ? 'navy blue.png' : `${folder}.png`;

  return `${DESIGN_CATEGORY_ASSETS_BASE}/${file}`;
}

export function getMyspaceBookshelfDecorImageUrl(designType: DesignSpaceType): string {
  const folder = getDesignTypeAssetFolder(designType);

  return `${BOOKSHELF_ASSETS_BASE}/${folder}.png`;
}

export function getMyspaceBookshelfDecorImageFallbackUrl(): string {
  return `${BOOKSHELF_ASSETS_BASE}/serene_elegant.png`;
}
