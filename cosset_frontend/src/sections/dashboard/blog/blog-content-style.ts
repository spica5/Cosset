import type { SxProps, Theme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export type BlogContentFontPreset =
  | 'clean-sans'
  | 'typewriter'
  | 'journal'
  | 'elegant-serif'
  | 'soft-handwritten'
  | 'modern-book'
  | 'minimal-readable'
  | 'romantic-script'
  | 'classic-letter'
  | 'classic-serif';

export type BlogContentBackgroundPreset =
  | 'cream-paper'
  | 'linen-paper'
  | 'rose-paper'
  | 'blue-stationery'
  | 'vintage-paper'
  | 'lavender-paper'
  | 'mint-paper'
  | 'plain'
  | 'letter-paper';

export type BlogContentAppearance = {
  fontPreset: BlogContentFontPreset;
  backgroundPreset: BlogContentBackgroundPreset;
};

export const DEFAULT_BLOG_CONTENT_APPEARANCE: BlogContentAppearance = {
  fontPreset: 'classic-serif',
  backgroundPreset: 'letter-paper',
};

export const BLOG_CONTENT_FONT_OPTIONS: Array<{ label: string; value: BlogContentFontPreset }> = [
  { label: 'Classic Serif', value: 'classic-serif' },
  { label: 'Classic Letter', value: 'classic-letter' },
  { label: 'Elegant Serif', value: 'elegant-serif' },
  { label: 'Modern Book', value: 'modern-book' },
  { label: 'Clean Sans', value: 'clean-sans' },
  { label: 'Minimal Readable', value: 'minimal-readable' },
  { label: 'Typewriter', value: 'typewriter' },
  { label: 'Soft Handwritten', value: 'soft-handwritten' },
  { label: 'Romantic Script', value: 'romantic-script' },
  { label: 'Journal', value: 'journal' },
];

export const BLOG_CONTENT_BACKGROUND_OPTIONS: Array<{
  label: string;
  value: BlogContentBackgroundPreset;
}> = [
  { label: 'Letter Paper', value: 'letter-paper' },
  { label: 'Cream Paper', value: 'cream-paper' },
  { label: 'Linen Paper', value: 'linen-paper' },
  { label: 'Rose Paper', value: 'rose-paper' },
  { label: 'Blue Stationery', value: 'blue-stationery' },
  { label: 'Vintage Paper', value: 'vintage-paper' },
  { label: 'Lavender Paper', value: 'lavender-paper' },
  { label: 'Mint Paper', value: 'mint-paper' },
  { label: 'Plain', value: 'plain' },
];

const FONT_SET = new Set<BlogContentFontPreset>(BLOG_CONTENT_FONT_OPTIONS.map((item) => item.value));
const BACKGROUND_SET = new Set<BlogContentBackgroundPreset>(
  BLOG_CONTENT_BACKGROUND_OPTIONS.map((item) => item.value)
);

const EMOJI_FONT_FALLBACK = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Symbol"';

const withEmojiFontFallback = (fontFamily: string) => `${fontFamily}, ${EMOJI_FONT_FALLBACK}`;

export const isBlogContentFontPreset = (value: unknown): value is BlogContentFontPreset =>
  typeof value === 'string' && FONT_SET.has(value as BlogContentFontPreset);

export const isBlogContentBackgroundPreset = (
  value: unknown
): value is BlogContentBackgroundPreset =>
  typeof value === 'string' && BACKGROUND_SET.has(value as BlogContentBackgroundPreset);

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const parseFontPreset = (value: unknown): BlogContentFontPreset => {
  if (isBlogContentFontPreset(value)) {
    return value as BlogContentFontPreset;
  }

  return DEFAULT_BLOG_CONTENT_APPEARANCE.fontPreset;
};

const parseBackgroundPreset = (value: unknown): BlogContentBackgroundPreset => {
  if (isBlogContentBackgroundPreset(value)) {
    return value as BlogContentBackgroundPreset;
  }

  return DEFAULT_BLOG_CONTENT_APPEARANCE.backgroundPreset;
};

export function getBlogContentAppearance(comments: unknown): BlogContentAppearance {
  if (typeof comments !== 'string' || comments.trim() === '') {
    return DEFAULT_BLOG_CONTENT_APPEARANCE;
  }

  try {
    const parsed = JSON.parse(comments) as unknown;
    const root = asRecord(parsed);

    if (!root) {
      return DEFAULT_BLOG_CONTENT_APPEARANCE;
    }

    const appearanceRecord = asRecord(root.appearance) || root;

    return {
      fontPreset: parseFontPreset(appearanceRecord.fontPreset ?? appearanceRecord.font),
      backgroundPreset: parseBackgroundPreset(
        appearanceRecord.backgroundPreset ?? appearanceRecord.background
      ),
    };
  } catch {
    return DEFAULT_BLOG_CONTENT_APPEARANCE;
  }
}

export function buildBlogCommentsWithAppearance(
  existingComments: unknown,
  appearance: BlogContentAppearance
): string {
  const fallbackText =
    typeof existingComments === 'string' && existingComments.trim() !== '' ? existingComments : undefined;

  if (typeof existingComments === 'string' && existingComments.trim() !== '') {
    try {
      const parsed = JSON.parse(existingComments) as unknown;
      const root = asRecord(parsed);

      if (root) {
        const existingAppearance = asRecord(root.appearance) || {};

        return JSON.stringify({
          ...root,
          appearance: {
            ...existingAppearance,
            fontPreset: appearance.fontPreset,
            backgroundPreset: appearance.backgroundPreset,
          },
        });
      }
    } catch {
      // Keep plain text in the payload if existing comments are not JSON.
    }
  }

  const payload: Record<string, unknown> = {
    appearance: {
      fontPreset: appearance.fontPreset,
      backgroundPreset: appearance.backgroundPreset,
    },
  };

  if (fallbackText) {
    payload.text = fallbackText;
  }

  return JSON.stringify(payload);
}

export function getBlogContentFontSx(fontPreset: BlogContentFontPreset): SxProps<Theme> {
  switch (fontPreset) {
    case 'clean-sans':
      return {
        fontFamily: withEmojiFontFallback('"Trebuchet MS", "Segoe UI", sans-serif'),
        fontSize: 14,
        lineHeight: 1.85,
        letterSpacing: '0.01em',
      };
    case 'typewriter':
      return {
        fontFamily: withEmojiFontFallback('"Courier New", Courier, monospace'),
        fontSize: 13,
        lineHeight: 1.9,
        letterSpacing: '0.02em',
      };
    case 'journal':
      return {
        fontFamily: withEmojiFontFallback('"Palatino Linotype", Palatino, serif'),
        fontSize: 15,
        lineHeight: 1.95,
        letterSpacing: '0.005em',
      };
      case 'elegant-serif':
      return {
        fontFamily: withEmojiFontFallback('"Garamond", "Times New Roman", serif'),
        fontSize: 15,
        lineHeight: 1.95,
        letterSpacing: '0.01em',
      };
    case 'soft-handwritten':
      return {
        fontFamily: withEmojiFontFallback('"Comic Sans MS", "Trebuchet MS", cursive, sans-serif'),
        fontSize: 15,
        lineHeight: 1.9,
        letterSpacing: '0.01em',
      };
    case 'modern-book':
      return {
        fontFamily: withEmojiFontFallback('"Book Antiqua", Palatino, serif'),
        fontSize: 14,
        lineHeight: 2,
        letterSpacing: '0.008em',
      };
    case 'minimal-readable':
      return {
        fontFamily: withEmojiFontFallback('Arial, "Helvetica Neue", sans-serif'),
        fontSize: 14,
        lineHeight: 1.85,
        letterSpacing: '0.005em',
      };
    case 'romantic-script':
      return {
        fontFamily: withEmojiFontFallback('"Brush Script MT", "Comic Sans MS", cursive'),
        fontSize: 16,
        lineHeight: 1.9,
        letterSpacing: '0.02em',
      };
    case 'classic-letter':
      return {
        fontFamily: withEmojiFontFallback('"Baskerville", "Times New Roman", serif'),
        fontSize: 15,
        lineHeight: 2,
        letterSpacing: '0.012em',
      };
    case 'classic-serif':
    default:
      return {
        fontFamily: withEmojiFontFallback('Georgia, "Times New Roman", serif'),
        fontSize: 14,
        lineHeight: 2,
        letterSpacing: '0.01em',
      };
  }
}

export function getBlogContentBackgroundSx(
  backgroundPreset: BlogContentBackgroundPreset
): SxProps<Theme> {
  switch (backgroundPreset) {
    case 'cream-paper':
      return {
        borderColor: 'rgba(125, 90, 57, 0.24)',
        bgcolor: '#f8efe1',
        backgroundImage:
          "linear-gradient(to bottom, rgba(255,255,255,0.78), rgba(255,255,255,0.78)), url('/universe/assets/background/texture-1.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow:
          'inset 0 0 0 1px rgba(120, 83, 46, 0.08), 0 6px 14px rgba(62, 42, 24, 0.08)',
      };
    case 'linen-paper':
      return {
        borderColor: 'rgba(96, 97, 109, 0.22)',
        bgcolor: '#f5f6f4',
        backgroundImage:
          "linear-gradient(to bottom, rgba(255,255,255,0.84), rgba(255,255,255,0.84)), url('/universe/assets/background/texture-3.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow:
          'inset 0 0 0 1px rgba(90, 95, 108, 0.08), 0 6px 14px rgba(34, 38, 48, 0.07)',
      };
    case 'rose-paper':
      return {
        borderColor: 'rgba(170, 110, 130, 0.24)',
        bgcolor: '#fff3f6',
        backgroundImage:
          "linear-gradient(to bottom, rgba(255,255,255,0.82), rgba(255,255,255,0.82)), url('/universe/assets/background/texture-2.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow:
          'inset 0 0 0 1px rgba(170, 110, 130, 0.08), 0 6px 14px rgba(120, 70, 90, 0.08)',
      };
    case 'blue-stationery':
      return {
        borderColor: 'rgba(88, 118, 160, 0.24)',
        bgcolor: '#eef5ff',
        backgroundImage:
          "linear-gradient(to bottom, rgba(255,255,255,0.84), rgba(255,255,255,0.84)), repeating-linear-gradient(to bottom, rgba(110, 145, 190, 0.14) 0, rgba(110, 145, 190, 0.14) 1px, transparent 1px, transparent 30px)",
        backgroundSize: 'auto, 100% 30px',
        backgroundPosition: '0 0, 0 14px',
        boxShadow:
          'inset 0 0 0 1px rgba(88, 118, 160, 0.08), 0 6px 14px rgba(66, 92, 130, 0.08)',
      };
    case 'vintage-paper':
      return {
        borderColor: 'rgba(128, 100, 60, 0.28)',
        bgcolor: '#f6ead7',
        backgroundImage:
          "linear-gradient(to bottom, rgba(255,255,255,0.72), rgba(255,255,255,0.72)), url('/universe/assets/background/texture-1.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow:
          'inset 0 0 0 1px rgba(120, 83, 46, 0.1), 0 8px 18px rgba(62, 42, 24, 0.1)',
      };
    case 'lavender-paper':
      return {
        borderColor: 'rgba(130, 112, 170, 0.24)',
        bgcolor: '#f5f0ff',
        backgroundImage:
          "linear-gradient(to bottom, rgba(255,255,255,0.82), rgba(255,255,255,0.82)), url('/universe/assets/background/texture-3.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow:
          'inset 0 0 0 1px rgba(130, 112, 170, 0.08), 0 6px 14px rgba(90, 76, 120, 0.08)',
      };
    case 'mint-paper':
      return {
        borderColor: 'rgba(90, 145, 120, 0.24)',
        bgcolor: '#eefaf4',
        backgroundImage:
          "linear-gradient(to bottom, rgba(255,255,255,0.84), rgba(255,255,255,0.84)), url('/universe/assets/background/texture-2.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow:
          'inset 0 0 0 1px rgba(90, 145, 120, 0.08), 0 6px 14px rgba(52, 95, 76, 0.08)',
      };
    case 'plain':
      return {
        borderColor: 'divider',
        bgcolor: 'background.neutral',
        backgroundImage: 'none',
        boxShadow: 'none',
      };
    case 'letter-paper':
    default:
      return {
        borderColor: 'rgba(125, 90, 57, 0.28)',
        bgcolor: '#fdf4e6',
        backgroundImage:
          "linear-gradient(to bottom, rgba(255,255,255,0.82), rgba(255,255,255,0.82)), repeating-linear-gradient(to bottom, rgba(141, 99, 63, 0.16) 0, rgba(141, 99, 63, 0.16) 1px, transparent 1px, transparent 30px), url('/universe/assets/background/texture-1.webp')",
        backgroundSize: 'auto, 100% 30px, cover',
        backgroundPosition: '0 0, 0 14px, center',
        boxShadow:
          'inset 0 0 0 1px rgba(120, 83, 46, 0.08), 0 6px 14px rgba(62, 42, 24, 0.08)',
      };
  }
}

