'use client';

import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';

// ----------------------------------------------------------------------

export type JourneyDiaryMapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
};

type Position = {
  lat: number;
  lng: number;
};

/* Map props stay on the public API so callers keep working while Google Map is temporarily hidden. */
/* eslint-disable react/no-unused-prop-types */
type Props = {
  markers?: JourneyDiaryMapMarker[];
  selectedPosition?: Position | null;
  activeMarkerId?: string | null;
  pickerMode?: boolean;
  onPositionChange?: (position: Position) => void;
  onMarkerClick?: (markerId: string) => void;
  sx?: SxProps<Theme>;
  height?: number;
};
/* eslint-enable react/no-unused-prop-types */

/** Temporary static banner while Google Map is hidden. */
const JOURNEY_DIARY_MAP_PLACEHOLDER = `${CONFIG.dashboard.assetsDir}/assets/images/journey-diary/journy_banner.png`;

export function JourneyDiaryWorldMap({ pickerMode = false, sx, height = 450 }: Props) {
  return (
    <Box
      sx={{
        height,
        overflow: 'hidden',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.neutral',
        position: 'relative',
        ...sx,
      }}
    >
      <Box
        component="img"
        src={JOURNEY_DIARY_MAP_PLACEHOLDER}
        alt="Journey diary map"
        sx={{
          width: 1,
          height: 1,
          objectFit: 'cover',
          display: 'block',
        }}
      />

      {pickerMode ? (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            px: 1.25,
            py: 0.5,
            borderRadius: 1,
            bgcolor: 'rgba(0, 0, 0, 0.55)',
            color: 'common.white',
          }}
        >
          Map picker is temporarily unavailable. Enter latitude and longitude below.
        </Typography>
      ) : null}
    </Box>
  );
}
