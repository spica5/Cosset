import type { Theme, SxProps } from '@mui/material/styles';

import { stylesMode } from 'src/theme/dashboard/styles';

// ----------------------------------------------------------------------

export type MailPaperStyleId =
  | 'classic-lined'
  | 'plain-cream'
  | 'parchment'
  | 'notebook'
  | 'vintage'
  | 'blush'
  | 'sky'
  | 'mint'
  | 'lavender'
  | 'kraft'
  | 'elegant'
  | 'dotted'
  | 'graph'
  | 'charcoal'
  | 'watercolor';

export const DEFAULT_MAIL_PAPER_STYLE: MailPaperStyleId = 'classic-lined';

export type MailPaperSurfaceVariant = 'editor' | 'message';

export type MailPaperStyleOption = {
  id: MailPaperStyleId;
  label: string;
};

export const MAIL_PAPER_STYLE_OPTIONS: MailPaperStyleOption[] = [
  { id: 'classic-lined', label: 'Classic lined' },
  { id: 'plain-cream', label: 'Plain cream' },
  { id: 'parchment', label: 'Parchment' },
  { id: 'notebook', label: 'Notebook' },
  { id: 'vintage', label: 'Vintage sepia' },
  { id: 'blush', label: 'Blush rose' },
  { id: 'sky', label: 'Sky note' },
  { id: 'mint', label: 'Mint stationery' },
  { id: 'lavender', label: 'Lavender' },
  { id: 'kraft', label: 'Kraft' },
  { id: 'elegant', label: 'Elegant white' },
  { id: 'dotted', label: 'Dot grid' },
  { id: 'graph', label: 'Graph paper' },
  { id: 'charcoal', label: 'Charcoal pad' },
  { id: 'watercolor', label: 'Watercolor' },
];

type PaperPalette = {
  bgcolor: string;
  border: string;
  boxShadow: string;
  backgroundImage: string;
  backgroundSize: string;
};

const PAPER_PALETTES: Record<MailPaperStyleId, { light: PaperPalette; dark: PaperPalette }> = {
  'classic-lined': {
    light: {
      bgcolor: '#faf6ef',
      border: '1px solid rgba(139, 119, 101, 0.22)',
      boxShadow: 'inset 0 0 48px rgba(139, 119, 101, 0.07), 0 2px 8px rgba(0, 0, 0, 0.06)',
      backgroundImage: [
        'linear-gradient(rgba(139, 119, 101, 0.09) 1px, transparent 1px)',
        'radial-gradient(ellipse at 15% 0%, rgba(255, 255, 255, 0.75) 0%, transparent 55%)',
        'radial-gradient(ellipse at 85% 100%, rgba(139, 119, 101, 0.08) 0%, transparent 50%)',
      ].join(', '),
      backgroundSize: '100% 28px, auto, auto',
    },
    dark: {
      bgcolor: '#2c2824',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: 'inset 0 0 48px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.35)',
      backgroundImage: [
        'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
        'radial-gradient(ellipse at 15% 0%, rgba(255, 255, 255, 0.04) 0%, transparent 55%)',
      ].join(', '),
      backgroundSize: '100% 28px, auto',
    },
  },
  'plain-cream': {
    light: {
      bgcolor: '#faf6ef',
      border: '1px solid rgba(139, 119, 101, 0.18)',
      boxShadow: 'inset 0 0 40px rgba(139, 119, 101, 0.05), 0 1px 4px rgba(0,0,0,0.05)',
      backgroundImage:
        'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.9) 0%, transparent 70%)',
      backgroundSize: 'auto',
    },
    dark: {
      bgcolor: '#2a2722',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.2)',
      backgroundImage:
        'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 70%)',
      backgroundSize: 'auto',
    },
  },
  parchment: {
    light: {
      bgcolor: '#f3e9d2',
      border: '1px solid rgba(160, 120, 70, 0.28)',
      boxShadow: 'inset 0 0 60px rgba(139, 100, 50, 0.12), 0 2px 6px rgba(80,50,20,0.08)',
      backgroundImage: [
        'radial-gradient(circle at 20% 30%, rgba(180,140,80,0.15) 0%, transparent 40%)',
        'radial-gradient(circle at 80% 70%, rgba(160,120,60,0.12) 0%, transparent 45%)',
        'linear-gradient(rgba(160,120,70,0.06) 1px, transparent 1px)',
      ].join(', '),
      backgroundSize: 'auto, auto, 100% 30px',
    },
    dark: {
      bgcolor: '#3a3228',
      border: '1px solid rgba(200,160,100,0.15)',
      boxShadow: 'inset 0 0 50px rgba(0,0,0,0.3)',
      backgroundImage:
        'radial-gradient(circle at 30% 40%, rgba(200,160,100,0.08) 0%, transparent 50%)',
      backgroundSize: 'auto',
    },
  },
  notebook: {
    light: {
      bgcolor: '#f8fafc',
      border: '1px solid rgba(100, 130, 180, 0.2)',
      boxShadow: 'inset 0 0 30px rgba(100,130,180,0.06), 0 1px 4px rgba(0,0,0,0.05)',
      backgroundImage: [
        'linear-gradient(90deg, transparent 47px, rgba(96,165,250,0.45) 47px, rgba(96,165,250,0.45) 49px, transparent 49px)',
        'linear-gradient(rgba(148,163,184,0.2) 1px, transparent 1px)',
      ].join(', '),
      backgroundSize: 'auto, 100% 28px',
    },
    dark: {
      bgcolor: '#1e293b',
      border: '1px solid rgba(148,163,184,0.2)',
      boxShadow: 'inset 0 0 30px rgba(0,0,0,0.25)',
      backgroundImage: [
        'linear-gradient(90deg, transparent 47px, rgba(96,165,250,0.35) 47px, rgba(96,165,250,0.35) 49px, transparent 49px)',
        'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px)',
      ].join(', '),
      backgroundSize: 'auto, 100% 28px',
    },
  },
  vintage: {
    light: {
      bgcolor: '#f5ecd7',
      border: '1px solid rgba(120, 90, 50, 0.25)',
      boxShadow: 'inset 0 0 50px rgba(120,90,50,0.1)',
      backgroundImage:
        'linear-gradient(rgba(120,90,50,0.07) 1px, transparent 1px)',
      backgroundSize: '100% 26px',
    },
    dark: {
      bgcolor: '#352e24',
      border: '1px solid rgba(180,140,90,0.15)',
      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)',
      backgroundImage: 'linear-gradient(rgba(180,140,90,0.06) 1px, transparent 1px)',
      backgroundSize: '100% 26px',
    },
  },
  blush: {
    light: {
      bgcolor: '#fdf2f4',
      border: '1px solid rgba(244, 114, 182, 0.22)',
      boxShadow: 'inset 0 0 40px rgba(244,114,182,0.06), 0 1px 4px rgba(0,0,0,0.04)',
      backgroundImage:
        'radial-gradient(ellipse at 80% 20%, rgba(251,207,232,0.5) 0%, transparent 55%)',
      backgroundSize: 'auto',
    },
    dark: {
      bgcolor: '#3a2430',
      border: '1px solid rgba(244,114,182,0.15)',
      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.25)',
      backgroundImage:
        'radial-gradient(ellipse at 80% 20%, rgba(244,114,182,0.1) 0%, transparent 55%)',
      backgroundSize: 'auto',
    },
  },
  sky: {
    light: {
      bgcolor: '#eff6ff',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      boxShadow: 'inset 0 0 40px rgba(59,130,246,0.05)',
      backgroundImage:
        'linear-gradient(rgba(59,130,246,0.08) 1px, transparent 1px)',
      backgroundSize: '100% 28px',
    },
    dark: {
      bgcolor: '#1e2a3f',
      border: '1px solid rgba(96,165,250,0.2)',
      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.25)',
      backgroundImage: 'linear-gradient(rgba(96,165,250,0.08) 1px, transparent 1px)',
      backgroundSize: '100% 28px',
    },
  },
  mint: {
    light: {
      bgcolor: '#f0fdf4',
      border: '1px solid rgba(34, 197, 94, 0.2)',
      boxShadow: 'inset 0 0 40px rgba(34,197,94,0.05)',
      backgroundImage: 'linear-gradient(rgba(34,197,94,0.07) 1px, transparent 1px)',
      backgroundSize: '100% 28px',
    },
    dark: {
      bgcolor: '#1a2e22',
      border: '1px solid rgba(74,222,128,0.15)',
      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.25)',
      backgroundImage: 'linear-gradient(rgba(74,222,128,0.07) 1px, transparent 1px)',
      backgroundSize: '100% 28px',
    },
  },
  lavender: {
    light: {
      bgcolor: '#f5f3ff',
      border: '1px solid rgba(139, 92, 246, 0.2)',
      boxShadow: 'inset 0 0 40px rgba(139,92,246,0.05)',
      backgroundImage:
        'radial-gradient(ellipse at 10% 90%, rgba(167,139,250,0.2) 0%, transparent 50%)',
      backgroundSize: 'auto',
    },
    dark: {
      bgcolor: '#2a2438',
      border: '1px solid rgba(167,139,250,0.15)',
      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.25)',
      backgroundImage:
        'radial-gradient(ellipse at 10% 90%, rgba(167,139,250,0.1) 0%, transparent 50%)',
      backgroundSize: 'auto',
    },
  },
  kraft: {
    light: {
      bgcolor: '#e8d5b5',
      border: '1px solid rgba(120, 83, 40, 0.28)',
      boxShadow: 'inset 0 0 50px rgba(120,83,40,0.1), 0 2px 6px rgba(80,50,20,0.08)',
      backgroundImage:
        'linear-gradient(rgba(120,83,40,0.06) 1px, transparent 1px)',
      backgroundSize: '100% 30px',
    },
    dark: {
      bgcolor: '#3d3428',
      border: '1px solid rgba(180,140,90,0.18)',
      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)',
      backgroundImage: 'linear-gradient(rgba(180,140,90,0.06) 1px, transparent 1px)',
      backgroundSize: '100% 30px',
    },
  },
  elegant: {
    light: {
      bgcolor: '#fffffe',
      border: '1px solid rgba(180, 150, 90, 0.35)',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.8), 0 2px 12px rgba(0,0,0,0.06)',
      backgroundImage:
        'radial-gradient(ellipse at 50% 100%, rgba(180,150,90,0.06) 0%, transparent 60%)',
      backgroundSize: 'auto',
    },
    dark: {
      bgcolor: '#2a2a2a',
      border: '1px solid rgba(212,175,55,0.25)',
      boxShadow: 'inset 0 0 30px rgba(212,175,55,0.04), 0 2px 8px rgba(0,0,0,0.3)',
      backgroundImage:
        'radial-gradient(ellipse at 50% 100%, rgba(212,175,55,0.06) 0%, transparent 60%)',
      backgroundSize: 'auto',
    },
  },
  dotted: {
    light: {
      bgcolor: '#fafafa',
      border: '1px solid rgba(0,0,0,0.1)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      backgroundImage:
        'radial-gradient(circle, rgba(0,0,0,0.14) 1px, transparent 1px)',
      backgroundSize: '16px 16px',
    },
    dark: {
      bgcolor: '#2a2a2a',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: 'inset 0 0 30px rgba(0,0,0,0.2)',
      backgroundImage:
        'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
      backgroundSize: '16px 16px',
    },
  },
  graph: {
    light: {
      bgcolor: '#fafafa',
      border: '1px solid rgba(0,0,0,0.1)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      backgroundImage: [
        'linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)',
        'linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)',
      ].join(', '),
      backgroundSize: '20px 20px',
    },
    dark: {
      bgcolor: '#2a2a2a',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: 'inset 0 0 30px rgba(0,0,0,0.2)',
      backgroundImage: [
        'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
        'linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
      ].join(', '),
      backgroundSize: '20px 20px',
    },
  },
  charcoal: {
    light: {
      bgcolor: '#3f3f46',
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.15)',
      backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
      backgroundSize: '100% 28px',
    },
    dark: {
      bgcolor: '#27272a',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.35)',
      backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
      backgroundSize: '100% 28px',
    },
  },
  watercolor: {
    light: {
      bgcolor: '#fffbf5',
      border: '1px solid rgba(180, 140, 120, 0.2)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      backgroundImage: [
        'radial-gradient(ellipse at 15% 20%, rgba(251,191,36,0.18) 0%, transparent 45%)',
        'radial-gradient(ellipse at 85% 25%, rgba(96,165,250,0.15) 0%, transparent 40%)',
        'radial-gradient(ellipse at 50% 85%, rgba(244,114,182,0.12) 0%, transparent 45%)',
      ].join(', '),
      backgroundSize: 'auto',
    },
    dark: {
      bgcolor: '#2c2a30',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.25)',
      backgroundImage: [
        'radial-gradient(ellipse at 15% 20%, rgba(251,191,36,0.08) 0%, transparent 45%)',
        'radial-gradient(ellipse at 85% 25%, rgba(96,165,250,0.08) 0%, transparent 40%)',
        'radial-gradient(ellipse at 50% 85%, rgba(244,114,182,0.07) 0%, transparent 45%)',
      ].join(', '),
      backgroundSize: 'auto',
    },
  },
};

export function isMailPaperStyleId(value: string): value is MailPaperStyleId {
  return MAIL_PAPER_STYLE_OPTIONS.some((option) => option.id === value);
}

function buildMailPaperSurface(
  theme: Theme,
  styleId: MailPaperStyleId,
  isDark: boolean,
  variant: MailPaperSurfaceVariant = 'editor',
) {
  const palette = PAPER_PALETTES[styleId][isDark ? 'dark' : 'light'];
  const isCharcoal = styleId === 'charcoal';
  const isMessage = variant === 'message';

  return {
    position: 'relative' as const,
    borderRadius: 1.5,
    px: 15,
    py: 8,
    minHeight: isMessage ? '100%' : 240,
    ...(isMessage && {
      boxSizing: 'border-box' as const,
      flex: '1 1 auto',
    }),
    color: isCharcoal && !isDark ? '#f4f4f5' : theme.vars.palette.text.primary,
    bgcolor: palette.bgcolor,
    border: palette.border,
    boxShadow: palette.boxShadow,
    backgroundImage: palette.backgroundImage,
    backgroundSize: palette.backgroundSize,
  };
}

export function getMailPaperSurfaceStyles(
  theme: Theme,
  styleId: MailPaperStyleId = DEFAULT_MAIL_PAPER_STYLE,
  backgroundImageUrl?: string | null,
  variant: MailPaperSurfaceVariant = 'editor',
) {
  const isDark = theme.palette.mode === 'dark';
  const base = buildMailPaperSurface(theme, styleId, isDark, variant);

  if (!backgroundImageUrl) {
    return base;
  }

  const overlay = isDark
    ? 'linear-gradient(rgba(30, 30, 30, 0.28), rgba(30, 30, 30, 0.28))'
    : 'linear-gradient(rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0.32))';

  return {
    ...base,
    backgroundImage: `${overlay}, url("${backgroundImageUrl}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
  };
}

/** Emotion/styled-component safe paper surface (no MUI sx-only props). */
export function getMailPaperSurfaceCss(
  theme: Theme,
  styleId: MailPaperStyleId = DEFAULT_MAIL_PAPER_STYLE,
  backgroundImageUrl?: string | null,
  variant: MailPaperSurfaceVariant = 'editor',
) {
  const surface = getMailPaperSurfaceStyles(theme, styleId, backgroundImageUrl, variant);
  const borderRadius =
    typeof surface.borderRadius === 'number'
      ? Number(theme.shape.borderRadius) * surface.borderRadius
      : surface.borderRadius;

  const css: Record<string, unknown> = {
    position: surface.position,
    borderRadius,
    padding: theme.spacing(2.5),
    minHeight: surface.minHeight,
    color: surface.color,
    backgroundColor: surface.bgcolor,
    border: surface.border,
    boxShadow: surface.boxShadow,
    backgroundImage: surface.backgroundImage,
    backgroundSize: surface.backgroundSize,
  };

  if ('boxSizing' in surface && surface.boxSizing) {
    css.boxSizing = surface.boxSizing;
  }

  if ('flex' in surface && surface.flex) {
    css.flex = surface.flex;
  }

  if (backgroundImageUrl) {
    css.backgroundPosition = 'center center';
    css.backgroundRepeat = 'no-repeat';
  }

  return css;
}

export function getMailPaperPreviewStyles(styleId: MailPaperStyleId) {
  const palette = PAPER_PALETTES[styleId].light;

  return {
    bgcolor: palette.bgcolor,
    border: palette.border,
    boxShadow: palette.boxShadow,
    backgroundImage: palette.backgroundImage,
    backgroundSize: palette.backgroundSize,
  };
}

export const mailPaperSurfaceSx = (
  styleId: MailPaperStyleId = DEFAULT_MAIL_PAPER_STYLE,
): SxProps<Theme> => (theme) => ({
  ...buildMailPaperSurface(theme, styleId, theme.palette.mode === 'dark'),
  [stylesMode.dark]: buildMailPaperSurface(theme, styleId, true),
});
