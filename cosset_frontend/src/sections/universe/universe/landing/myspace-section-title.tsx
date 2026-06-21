import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/universe/iconify';

// ----------------------------------------------------------------------

export const MYSPACE_SECTION_SERIF = '"Georgia", "Times New Roman", "Palatino Linotype", serif';

export const MYSPACE_ACCENT_PINK = '#E8A0A8';

type CountBadgeProps = {
  count: number;
  size?: 'sm' | 'md';
};

export function MySpaceCountBadge({ count, size = 'md' }: CountBadgeProps) {
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
        bgcolor: MYSPACE_ACCENT_PINK,
        color: 'common.white',
        display: 'inline-grid',
        placeItems: 'center',
        fontSize,
        fontWeight: 700,
        lineHeight: 1,
        boxShadow: '0 2px 6px rgba(232, 160, 168, 0.45)',
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
};

export function MySpaceSectionTitle({ title, subtitle, itemCount }: Props) {
  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography
          variant="h3"
          sx={{
            fontFamily: MYSPACE_SECTION_SERIF,
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}
        >
          {title}
        </Typography>
        <Iconify icon="solar:flower-bold-duotone" width={22} sx={{ color: MYSPACE_ACCENT_PINK }} />
      </Stack>

      <Box sx={{ position: 'relative', display: 'inline-block', maxWidth: 1, pr: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:heart-bold" width={14} sx={{ color: MYSPACE_ACCENT_PINK }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            {subtitle}
          </Typography>
          <Iconify icon="solar:heart-bold" width={14} sx={{ color: MYSPACE_ACCENT_PINK }} />
        </Stack>

        <Box
          sx={{
            position: 'absolute',
            top: -6,
            right: 0,
          }}
        >
          <MySpaceCountBadge count={itemCount} />
        </Box>
      </Box>
    </Stack>
  );
}
