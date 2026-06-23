// ----------------------------------------------------------------------

export type DesignSpaceType = 'normal' | 'morning' | 'evening' | 'night';

export const DEFAULT_DESIGN_SPACE_TYPE: DesignSpaceType = 'normal';

export type DesignSpaceTheme = {
  pageBg: string;
  cardBg: string;
  surfaceBg: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  border: string;
  sidebarBorder: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
};

const DESIGN_SPACE_THEMES: Record<DesignSpaceType, DesignSpaceTheme> = {
  normal: {
    pageBg: '#F9F7F2',
    cardBg: '#FAF6F0',
    surfaceBg: '#FFFFFF',
    accent: '#E8A0A8',
    accentHover: '#d88e96',
    accentSoft: 'rgba(232, 160, 168, 0.08)',
    border: 'rgba(139, 119, 101, 0.16)',
    sidebarBorder: 'rgba(139, 119, 101, 0.22)',
    divider: 'rgba(139, 119, 101, 0.22)',
    textPrimary: '#3C2D1E',
    textSecondary: 'rgba(60, 45, 30, 0.72)',
    isDark: false,
  },
  morning: {
    pageBg: '#FFF6E8',
    cardBg: '#FFFBF3',
    surfaceBg: '#FFFFFF',
    accent: '#E8A878',
    accentHover: '#d49362',
    accentSoft: 'rgba(232, 168, 120, 0.1)',
    border: 'rgba(180, 140, 90, 0.18)',
    sidebarBorder: 'rgba(180, 140, 90, 0.24)',
    divider: 'rgba(180, 140, 90, 0.24)',
    textPrimary: '#4A3828',
    textSecondary: 'rgba(74, 56, 40, 0.72)',
    isDark: false,
  },
  evening: {
    pageBg: '#F0E4D4',
    cardBg: '#F7EDE2',
    surfaceBg: '#FFFAF4',
    accent: '#D4847A',
    accentHover: '#c07369',
    accentSoft: 'rgba(212, 132, 122, 0.1)',
    border: 'rgba(120, 90, 70, 0.2)',
    sidebarBorder: 'rgba(120, 90, 70, 0.28)',
    divider: 'rgba(120, 90, 70, 0.28)',
    textPrimary: '#3D3028',
    textSecondary: 'rgba(61, 48, 40, 0.75)',
    isDark: false,
  },
  night: {
    pageBg: '#151B26',
    cardBg: '#1E2635',
    surfaceBg: '#252E40',
    accent: '#C9A0A8',
    accentHover: '#b88e96',
    accentSoft: 'rgba(201, 160, 168, 0.12)',
    border: 'rgba(255, 255, 255, 0.1)',
    sidebarBorder: 'rgba(255, 255, 255, 0.12)',
    divider: 'rgba(255, 255, 255, 0.12)',
    textPrimary: '#F0EBE3',
    textSecondary: 'rgba(240, 235, 227, 0.72)',
    isDark: true,
  },
};

export const DESIGN_SPACE_TYPE_OPTIONS: {
  value: DesignSpaceType;
  label: string;
  description: string;
}[] = [
  {
    value: 'normal',
    label: 'Normal',
    description: 'Original colors with no atmosphere overlay',
  },
  {
    value: 'morning',
    label: 'Morning',
    description: 'Bright, warm daylight tones',
  },
  {
    value: 'evening',
    label: 'Evening',
    description: 'Soft golden-hour mood',
  },
  {
    value: 'night',
    label: 'Night',
    description: 'Dark, calm nighttime atmosphere',
  },
];

const DESIGN_SPACE_TYPE_SET = new Set<string>(DESIGN_SPACE_TYPE_OPTIONS.map((option) => option.value));

export function normalizeDesignSpaceType(value: unknown): DesignSpaceType {
  const normalized = String(value || '').trim().toLowerCase();

  if (DESIGN_SPACE_TYPE_SET.has(normalized)) {
    return normalized as DesignSpaceType;
  }

  return DEFAULT_DESIGN_SPACE_TYPE;
}

export function getDesignSpaceTheme(designType: DesignSpaceType): DesignSpaceTheme {
  return DESIGN_SPACE_THEMES[normalizeDesignSpaceType(designType)];
}

export function getDesignSpaceTypeDescription(designType: DesignSpaceType): string {
  return (
    DESIGN_SPACE_TYPE_OPTIONS.find((option) => option.value === designType)?.description ||
    DESIGN_SPACE_TYPE_OPTIONS[0].description
  );
}

export function getDesignSpaceBackgroundFilter(designType: DesignSpaceType): string | undefined {
  switch (designType) {
    case 'morning':
      return 'brightness(1.08) saturate(1.12) contrast(1.02) sepia(0.08)';
    case 'evening':
      return 'brightness(0.58) saturate(0.82) contrast(1.04) sepia(0.18)';
    case 'night':
      return 'brightness(0.35) saturate(0.6) contrast(1.2)';
    default:
      return undefined;
  }
}

export function getDesignSpaceOverlaySx(designType: DesignSpaceType) {
  switch (designType) {
    case 'morning':
      return {
        background:
          'linear-gradient(180deg, rgba(255, 236, 179, 0.18) 0%, rgba(255, 255, 255, 0.04) 100%)',
      };
    case 'evening':
      return {
        background:
          'linear-gradient(180deg, rgba(255, 153, 51, 0.16) 0%, rgba(20, 12, 8, 0.28) 100%)',
      };
    case 'night':
      return {
        background:
          'linear-gradient(180deg, rgba(8, 16, 36, 0.2) 0%, rgba(0, 0, 0, 0.42) 100%)',
      };
    default:
      return undefined;
  }
}
