import type { SxProps, Theme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { _moodIcons } from 'src/_mock/assets';
import { getMoodDisplayIcon } from 'src/utils/mood-templates';

import { varAlpha, getThemeCommonVars } from 'src/theme/universe/styles';

// ----------------------------------------------------------------------

const getMoodIcon = (mood: string) => _moodIcons[mood] || getMoodDisplayIcon(mood);

const getScrollDuration = (text: string) => Math.max(28, text.length * 0.45);

type Props = {
  mood?: string | null;
  embedded?: boolean;
  sx?: SxProps<Theme>;
};

export function UniverseLandingMoodMarquee({ mood, embedded = false, sx }: Props) {
  const theme = useTheme();
  const commonVars = getThemeCommonVars(theme);
  const trimmed = (mood || '').trim();

  if (!trimmed) {
    return null;
  }

  const label = `${getMoodIcon(trimmed)}  ${trimmed}`;
  const duration = getScrollDuration(trimmed);

  return (
    <Box
      role="marquee"
      aria-label={trimmed}
      sx={{
        ...(embedded
          ? {
              flex: 1,
              minWidth: 0,
              pointerEvents: 'none',
            }
          : {
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              bottom: { xs: 76, md: 92 },
              zIndex: 10,
              width: 'min(92vw, 720px)',
              pointerEvents: 'none',
            }),
        ...sx,
      }}
    >
      <Box
        sx={{
          overflow: 'hidden',
          borderRadius: 99,
          py: 0.85,
          bgcolor: varAlpha(commonVars.blackChannel, 0.45),
          border: `1px solid ${varAlpha(commonVars.whiteChannel, 0.18)}`,
          backdropFilter: 'blur(4px)',
        }}
      >
        <Box
          sx={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            pl: '100%',
            animation: `universe-mood-scroll ${duration}s linear infinite`,
            '@keyframes universe-mood-scroll': {
              from: { transform: 'translateX(0)' },
              to: { transform: 'translateX(-100%)' },
            },
          }}
        >
          <Typography
            component="span"
            variant="body2"
            sx={{
              pr: 3,
              color: 'common.white',
              lineHeight: 1.6,
              letterSpacing: 0.2,
            }}
          >
            {label}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
