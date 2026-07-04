import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/universe/iconify';

import { useDesignSpaceTheme } from './design-space-theme-context';

// ----------------------------------------------------------------------

export const MYSPACE_SECTION_SERIF = '"Georgia", "Times New Roman", "Palatino Linotype", serif';

/** Item titles with Vietnamese text — avoid Georgia, which breaks composed diacritics at bold weights. */
export const MYSPACE_ITEM_TITLE_FONT =
  '"Public Sans Variable", "Segoe UI", "Noto Sans", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

export const MYSPACE_ACCENT_PINK = '#F8BBD0';

type CountBadgeProps = {
  count: number;
  size?: 'sm' | 'md';
};

export function MySpaceCountBadge({ count, size = 'md' }: CountBadgeProps) {
  const { theme: spaceTheme } = useDesignSpaceTheme();
  const dimension = size === 'sm' ? 24 : 28;
  const fontSize = size === 'sm' ? 11 : count > 99 ? 10 : 12;

  return (
    <Box
      component="span"
      sx={{
        minWidth: dimension,
        height: dimension,
        px: count > 99 ? 0.5 : 0,
        borderRadius: '50%',
        bgcolor: spaceTheme.accent,
        color: 'common.white',
        display: 'inline-grid',
        placeItems: 'center',
        fontSize,
        fontWeight: 700,
        lineHeight: 1,
        boxShadow: `0 2px 6px ${spaceTheme.accentSoft}`,
        flexShrink: 0,
      }}
    >
      {count > 99 ? '99+' : count}
    </Box>
  );
}

type Props = {
  title: string;
  subtitle: string;
  itemCount: number;
  centered?: boolean;
};

export function MySpaceSectionTitle({ title, subtitle, itemCount, centered = false }: Props) {
  const { theme: spaceTheme } = useDesignSpaceTheme();

  return (
    <Stack
      spacing={1}
      alignItems={centered ? 'center' : 'flex-start'}
      sx={{ width: centered ? 1 : undefined, textAlign: centered ? 'center' : 'left' }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        justifyContent={centered ? 'center' : 'flex-start'}
      >
        <Typography
          variant="h3"
          sx={{
            fontFamily: spaceTheme.decorativeFont || MYSPACE_SECTION_SERIF,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: spaceTheme.textPrimary,
          }}
        >
          {title}
        </Typography>
        <Iconify icon="solar:flower-bold-duotone" width={22} sx={{ color: spaceTheme.accent }} />
        {!centered ? null : <MySpaceCountBadge count={itemCount} />}
      </Stack>

      <Box
        sx={{
          position: 'relative',
          display: 'inline-block',
          maxWidth: 1,
          pr: centered ? 0 : 4,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          justifyContent={centered ? 'center' : 'flex-start'}
        >
          <Iconify icon="solar:heart-bold" width={14} sx={{ color: spaceTheme.accent }} />
          <Typography
            variant="body2"
            sx={{
              fontStyle: 'italic',
              color: spaceTheme.textSecondary,
              ...(spaceTheme.decorativeFont
                ? {
                    fontFamily: spaceTheme.decorativeFont,
                    fontSize: '1rem',
                    fontWeight: 500,
                  }
                : {}),
            }}
          >
            {subtitle}
          </Typography>
          <Iconify icon="solar:heart-bold" width={14} sx={{ color: spaceTheme.accent }} />
        </Stack>

        {centered ? null : (
          <Box
            sx={{
              position: 'absolute',
              top: -6,
              right: 0,
            }}
          >
            <MySpaceCountBadge count={itemCount} />
          </Box>
        )}
      </Box>
    </Stack>
  );
}
