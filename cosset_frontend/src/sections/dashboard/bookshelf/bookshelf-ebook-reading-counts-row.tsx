import type { Theme, SxProps } from '@mui/material/styles';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify as UniverseIconify } from 'src/components/universe/iconify';
import { Iconify as DashboardIconify } from 'src/components/dashboard/iconify';

// ----------------------------------------------------------------------

type Props = {
  bookmarkCount?: number;
  commentCount?: number;
  iconSize?: number;
  variant?: 'dashboard' | 'universe';
  accentColor?: string;
  sx?: SxProps<Theme>;
};

export function BookshelfEbookReadingCountsRow({
  bookmarkCount = 0,
  commentCount = 0,
  iconSize = 14,
  variant = 'dashboard',
  accentColor,
  sx,
}: Props) {
  const Iconify = variant === 'universe' ? UniverseIconify : DashboardIconify;

  const bookmarkIconSx =
    variant === 'universe'
      ? { color: accentColor || 'text.disabled' }
      : { color: 'warning.main' };

  const commentIconSx =
    variant === 'universe'
      ? { color: accentColor || 'text.disabled' }
      : { color: 'info.main' };

  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={sx}>
      <Stack direction="row" spacing={0.35} alignItems="center">
        <Iconify icon="solar:bookmark-bold" width={iconSize} sx={bookmarkIconSx} />
        <Typography
          variant="caption"
          sx={{ color: variant === 'dashboard' ? 'warning.dark' : 'text.secondary' }}
        >
          {bookmarkCount}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={0.35} alignItems="center">
        <Iconify icon="solar:chat-round-dots-bold" width={iconSize} sx={commentIconSx} />
        <Typography
          variant="caption"
          sx={{ color: variant === 'dashboard' ? 'info.dark' : 'text.secondary' }}
        >
          {commentCount}
        </Typography>
      </Stack>
    </Stack>
  );
}
