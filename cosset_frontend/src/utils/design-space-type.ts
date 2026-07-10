// ----------------------------------------------------------------------

export type DesignSpaceType =
  | 'gentle-feminine-romantic'
  | 'serene-elegant'
  | 'warm-nostalgic'
  | 'strong-modern'
  | 'young-dynamic'
  | 'navy-blue';

export const DEFAULT_DESIGN_SPACE_TYPE: DesignSpaceType = 'gentle-feminine-romantic';

export type DesignSpaceTheme = {
  pageBg: string;
  sidebarBg: string;
  contentBg: string;
  cardBg: string;
  surfaceBg: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  border: string;
  sidebarBorder: string;
  sidebarDivider: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  sidebarTextPrimary: string;
  sidebarTextSecondary: string;
  categoryTitleColor: string;
  categorySubtitleColor: string;
  categoryTextShadow?: string;
  decorativeFont?: string;
  isDark: boolean;
};

export function hasDistinctSidebar(theme: DesignSpaceTheme): boolean {
  return theme.sidebarBg !== theme.contentBg;
}

const DESIGN_SPACE_THEMES: Record<DesignSpaceType, DesignSpaceTheme> = {
  'gentle-feminine-romantic': {
    pageBg: '#FDF9F2',
    sidebarBg: '#FDF9F2',
    contentBg: '#FDF9F2',
    cardBg: '#FFFFFF',
    surfaceBg: '#FFFFFF',
    accent: '#F8BBD0',
    accentHover: '#F48FB1',
    accentSoft: 'rgba(248, 187, 208, 0.22)',
    border: 'rgba(78, 52, 46, 0.12)',
    sidebarBorder: 'rgba(78, 52, 46, 0.14)',
    sidebarDivider: 'rgba(78, 52, 46, 0.12)',
    divider: 'rgba(78, 52, 46, 0.12)',
    textPrimary: '#4E342E',
    textSecondary: 'rgba(78, 52, 46, 0.68)',
    sidebarTextPrimary: '#4E342E',
    sidebarTextSecondary: 'rgba(78, 52, 46, 0.68)',
    categoryTitleColor: '#FFFFFF',
    categorySubtitleColor: 'rgba(255, 255, 255, 0.92)',
    isDark: false,
  },
  'serene-elegant': {
    pageBg: '#F4F6F8',
    sidebarBg: '#F4F6F8',
    contentBg: '#F4F6F8',
    cardBg: '#F8FAFB',
    surfaceBg: '#FFFFFF',
    accent: '#7B96A8',
    accentHover: '#6a8494',
    accentSoft: 'rgba(123, 150, 168, 0.12)',
    border: 'rgba(100, 120, 135, 0.18)',
    sidebarBorder: 'rgba(100, 120, 135, 0.24)',
    sidebarDivider: 'rgba(100, 120, 135, 0.22)',
    divider: 'rgba(100, 120, 135, 0.22)',
    textPrimary: '#2E3A42',
    textSecondary: 'rgba(46, 58, 66, 0.72)',
    sidebarTextPrimary: '#2E3A42',
    sidebarTextSecondary: 'rgba(46, 58, 66, 0.72)',
    categoryTitleColor: '#2E3A42',
    categorySubtitleColor: 'rgba(46, 58, 66, 0.72)',
    categoryTextShadow: '0 1px 3px rgba(255, 255, 255, 0.75)',
    isDark: false,
  },
  'warm-nostalgic': {
    pageBg: 'rgba(212, 195, 183, 1)', 
    sidebarBg: '#8C7A6B',
    contentBg: 'rgba(248, 237, 228, 1)',
    cardBg: '#FFFAF7',
    surfaceBg: '#FFFAF7',
    accent: '#A65D3F',
    accentHover: '#8F4F34',
    accentSoft: 'rgba(166, 93, 63, 0.14)',
    border: 'rgba(140, 100, 72, 0.16)',
    sidebarBorder: 'rgba(255, 255, 255, 0.12)',
    sidebarDivider: 'rgba(255, 255, 255, 0.16)',
    divider: 'rgba(166, 93, 63, 0.14)',
    textPrimary: '#3D2E24',
    textSecondary: 'rgba(93, 72, 55, 0.72)',
    sidebarTextPrimary: '#FFF8F0',
    sidebarTextSecondary: 'rgba(255, 248, 240, 0.84)',
    categoryTitleColor: '#FFFFFF',
    categorySubtitleColor: 'rgba(255, 248, 240, 0.9)',
    decorativeFont: '"Caveat Variable", "Caveat", cursive',
    isDark: false,
  },
  'strong-modern': {
    pageBg: '#181B21',
    sidebarBg: '#181B21',
    contentBg: '#0B0D11',
    cardBg: '#15181E',
    surfaceBg: '#1C2028',
    accent: '#6B9FFF',
    accentHover: '#5A8EEF',
    accentSoft: 'rgba(107, 159, 255, 0.16)',
    border: 'rgba(255, 255, 255, 0.12)',
    sidebarBorder: 'rgba(255, 255, 255, 0.14)',
    sidebarDivider: 'rgba(255, 255, 255, 0.14)',
    divider: 'rgba(255, 255, 255, 0.14)',
    textPrimary: '#F8FAFC',
    textSecondary: 'rgba(248, 250, 252, 0.82)',
    sidebarTextPrimary: '#F8FAFC',
    sidebarTextSecondary: 'rgba(248, 250, 252, 0.82)',
    categoryTitleColor: '#F8FAFC',
    categorySubtitleColor: 'rgba(248, 250, 252, 0.88)',
    isDark: true,
  },
  'young-dynamic': {
    pageBg: '#FFFFFF',
    sidebarBg: '#FFFFFF',
    contentBg: '#FFFFFF',
    cardBg: '#FFFFFF',
    surfaceBg: '#F8FAFC',
    accent: '#8B5CF6',
    accentHover: '#7C3AED',
    accentSoft: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(100, 116, 139, 0.14)',
    sidebarBorder: 'rgba(100, 116, 139, 0.16)',
    sidebarDivider: 'rgba(100, 116, 139, 0.14)',
    divider: 'rgba(100, 116, 139, 0.14)',
    textPrimary: '#1E293B',
    textSecondary: 'rgba(30, 41, 59, 0.68)',
    sidebarTextPrimary: '#1E293B',
    sidebarTextSecondary: 'rgba(30, 41, 59, 0.68)',
    categoryTitleColor: '#1E293B',
    categorySubtitleColor: 'rgba(30, 41, 59, 0.78)',
    decorativeFont: '"Pacifico", cursive',
    isDark: false,
  },
  'navy-blue': {
    pageBg: '#0B1220',
    sidebarBg: '#0B1220',
    contentBg: '#0F172A',
    cardBg: '#152238',
    surfaceBg: '#1A2744',
    accent: '#3B9EFF',
    accentHover: '#2563EB',
    accentSoft: 'rgba(59, 158, 255, 0.18)',
    border: 'rgba(255, 255, 255, 0.1)',
    sidebarBorder: 'rgba(255, 255, 255, 0.12)',
    sidebarDivider: 'rgba(255, 255, 255, 0.1)',
    divider: 'rgba(255, 255, 255, 0.1)',
    textPrimary: '#F8FAFC',
    textSecondary: 'rgba(147, 197, 253, 0.82)',
    sidebarTextPrimary: '#F8FAFC',
    sidebarTextSecondary: 'rgba(147, 197, 253, 0.82)',
    categoryTitleColor: '#FFFFFF',
    categorySubtitleColor: 'rgba(147, 197, 253, 0.9)',
    decorativeFont: '"Caveat Variable", "Caveat", cursive',
    isDark: true,
  },
};

export const DESIGN_SPACE_TYPE_OPTIONS: {
  value: DesignSpaceType;
  label: string;
  description: string;
}[] = [
  {
    value: 'gentle-feminine-romantic',
    label: 'Gentle, Feminine, Romantic',
    description: 'Cream and blush tones with soft pink accents and a warm, romantic mood',
  },
  {
    value: 'serene-elegant',
    label: 'Serene, Elegant',
    description: 'Calm blue-gray palette with refined, peaceful elegance',
  },
  {
    value: 'warm-nostalgic',
    label: 'Warm, Nostalgic',
    description: 'Cream and amber hues with a cozy, memory-filled mood',
  },
  {
    value: 'strong-modern',
    label: 'Strong Modern',
    description: 'Bold contrast with crisp lines and a contemporary feel',
  },
  {
    value: 'young-dynamic',
    label: 'Young Dynamic',
    description: 'Bright, playful pastels with rounded cards and energetic purple accents',
  },
  {
    value: 'navy-blue',
    label: 'Mysterious, Creative',
    description: 'Deep midnight navy with electric blue accents — a lo-fi space for night focus',
  },
];

const DESIGN_SPACE_TYPE_SET = new Set<string>(DESIGN_SPACE_TYPE_OPTIONS.map((option) => option.value));

const LEGACY_DESIGN_TYPE_MAP: Record<string, DesignSpaceType> = {
  normal: 'gentle-feminine-romantic',
  morning: 'warm-nostalgic',
  evening: 'serene-elegant',
  night: 'strong-modern',
  young_dynamic: 'young-dynamic',
  navy_blue: 'navy-blue',
};

export function normalizeDesignSpaceType(value: unknown): DesignSpaceType {
  const normalized = String(value || '').trim().toLowerCase();

  if (LEGACY_DESIGN_TYPE_MAP[normalized]) {
    return LEGACY_DESIGN_TYPE_MAP[normalized];
  }

  if (DESIGN_SPACE_TYPE_SET.has(normalized)) {
    return normalized as DesignSpaceType;
  }

  return DEFAULT_DESIGN_SPACE_TYPE;
}

export function getDesignSpaceTheme(designType: DesignSpaceType): DesignSpaceTheme {
  return DESIGN_SPACE_THEMES[normalizeDesignSpaceType(designType)];
}

export function getDesignSpaceTypeLabel(designType: DesignSpaceType): string {
  return (
    DESIGN_SPACE_TYPE_OPTIONS.find((option) => option.value === designType)?.label ||
    DESIGN_SPACE_TYPE_OPTIONS[0].label
  );
}

export function getDesignSpaceTypeDescription(designType: DesignSpaceType): string {
  return (
    DESIGN_SPACE_TYPE_OPTIONS.find((option) => option.value === designType)?.description ||
    DESIGN_SPACE_TYPE_OPTIONS[0].description
  );
}

export function getDesignSpaceBackgroundFilter(designType: DesignSpaceType): string | undefined {
  switch (normalizeDesignSpaceType(designType)) {
    case 'gentle-feminine-romantic':
      return 'brightness(1.03) saturate(1.05) contrast(1.01) sepia(0.04)';
    case 'serene-elegant':
      return 'brightness(1.02) saturate(0.92) contrast(1.03) hue-rotate(-8deg)';
    case 'warm-nostalgic':
      return 'brightness(1.04) saturate(1.08) contrast(1.03) sepia(0.1)';
    case 'strong-modern':
      return 'brightness(0.42) saturate(0.75) contrast(1.15)';
    case 'young-dynamic':
      return 'brightness(1.06) saturate(1.12) contrast(1.02)';
    case 'navy-blue':
      return 'brightness(0.38) saturate(0.92) contrast(1.12) hue-rotate(12deg)';
    default:
      return undefined;
  }
}

export function getDesignSpaceOverlaySx(designType: DesignSpaceType) {
  switch (normalizeDesignSpaceType(designType)) {
    case 'gentle-feminine-romantic':
      return {
        background:
          'linear-gradient(180deg, rgba(255, 204, 188, 0.16) 0%, rgba(253, 249, 242, 0.08) 100%)',
      };
    case 'serene-elegant':
      return {
        background:
          'linear-gradient(180deg, rgba(200, 215, 228, 0.22) 0%, rgba(255, 255, 255, 0.06) 100%)',
      };
    case 'warm-nostalgic':
      return {
        background:
          'linear-gradient(180deg, rgba(140, 122, 107, 0.12) 0%, rgba(249, 244, 240, 0.06) 100%)',
      };
    case 'strong-modern':
      return {
        background:
          'linear-gradient(180deg, rgba(12, 16, 24, 0.28) 0%, rgba(0, 0, 0, 0.45) 100%)',
      };
    case 'young-dynamic':
      return {
        background:
          'linear-gradient(180deg, rgba(196, 181, 253, 0.18) 0%, rgba(255, 255, 255, 0.04) 100%)',
      };
    case 'navy-blue':
      return {
        background:
          'linear-gradient(180deg, rgba(15, 40, 80, 0.38) 0%, rgba(11, 18, 32, 0.58) 100%)',
      };
    default:
      return undefined;
  }
}
