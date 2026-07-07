'use client';

import type { Theme, SxProps } from '@mui/material/styles';

import { useCallback, useMemo, useState } from 'react';
import {
  APIProvider,
  Map as ReactGoogleMap,
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
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

const WORLD_CENTER: Position = { lat: 20, lng: 0 };

function PinIcon({ color }: { color: string }) {
  return (
    <SvgIcon sx={{ color, fontSize: 32 }}>
      <path
        d="M20.2,15.7L20.2,15.7c1.1-1.6,1.8-3.6,1.8-5.7c0-5.6-4.5-10-10-10S2,4.5,2,10c0,2,0.6,3.9,1.6,5.4c0,0.1,0.1,0.2,0.2,0.3
c0,0,0.1,0.1,0.1,0.2c0.2,0.3,0.4,0.6,0.7,0.9c2.6,3.1,7.4,7.6,7.4,7.6s4.8-4.5,7.4-7.5c0.2-0.3,0.5-0.6,0.7-0.9
C20.1,15.8,20.2,15.8,20.2,15.7z"
      />
    </SvgIcon>
  );
}

type JourneyMarkerProps = {
  marker: JourneyDiaryMapMarker;
  open: boolean;
  onClose: () => void;
  onClick: () => void;
};

function JourneyMarker({ marker, open, onClose, onClick }: JourneyMarkerProps) {
  const [markerRef, advancedMarker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker ref={markerRef} position={{ lat: marker.lat, lng: marker.lng }} onClick={onClick}>
        <PinIcon color="error.main" />
      </AdvancedMarker>

      {open && (
        <InfoWindow maxWidth={240} anchor={advancedMarker} minWidth={200} onCloseClick={onClose}>
          <Stack spacing={0.5} sx={{ p: 1.5, pr: 3 }}>
            <Typography variant="subtitle2">{marker.title}</Typography>
            {marker.subtitle ? (
              <Typography variant="caption" color="text.secondary">
                {marker.subtitle}
              </Typography>
            ) : null}
          </Stack>
        </InfoWindow>
      )}
    </>
  );
}

export function JourneyDiaryWorldMap({
  markers = [],
  selectedPosition,
  activeMarkerId,
  pickerMode = false,
  onPositionChange,
  onMarkerClick,
  sx,
  height = 420,
}: Props) {
  const [internalActiveId, setInternalActiveId] = useState<string | null>(null);

  const resolvedActiveId = activeMarkerId ?? internalActiveId;

  const defaultCenter = useMemo(() => {
    if (selectedPosition) {
      return selectedPosition;
    }

    if (markers.length) {
      return { lat: markers[0].lat, lng: markers[0].lng };
    }

    return WORLD_CENTER;
  }, [markers, selectedPosition]);

  const defaultZoom = useMemo(() => {
    if (selectedPosition || markers.length === 1) {
      return 5;
    }

    if (markers.length > 1) {
      return 2;
    }

    return 1.5;
  }, [markers.length, selectedPosition]);

  const handleMapClick = useCallback(
    (event: unknown) => {
      if (!pickerMode || !onPositionChange) {
        return;
      }

      const mapEvent = event as {
        latLng?: { lat: () => number; lng: () => number } | null;
        detail?: { latLng?: { lat: number; lng: number } | null };
      };

      let lat: number | undefined;
      let lng: number | undefined;

      if (mapEvent.latLng) {
        lat = mapEvent.latLng.lat();
        lng = mapEvent.latLng.lng();
      } else if (mapEvent.detail?.latLng) {
        lat = mapEvent.detail.latLng.lat;
        lng = mapEvent.detail.latLng.lng;
      }

      if (lat === undefined || lng === undefined) {
        return;
      }

      onPositionChange({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
      });
    },
    [onPositionChange, pickerMode],
  );

  const handleMarkerClick = useCallback(
    (markerId: string) => {
      if (onMarkerClick) {
        onMarkerClick(markerId);
      } else {
        setInternalActiveId((prev) => (prev === markerId ? null : markerId));
      }
    },
    [onMarkerClick],
  );

  if (!CONFIG.googleMapApiKey) {
    return (
      <Box
        sx={{
          height,
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.neutral',
          ...sx,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ px: 3, textAlign: 'center' }}>
          Set `NEXT_PUBLIC_MAP_API` to enable the world map.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height,
        overflow: 'hidden',
        borderRadius: 2,
        '& .gm-style iframe + div': {
          border: 'none !important',
        },
        '& .gm-style .gm-style-iw-c': {
          borderRadius: 1.5,
          padding: '0px !important',
          boxShadow: (theme) => theme.customShadows.z8,
        },
        '& .gm-style .gm-style-iw-d': {
          overflow: 'unset !important',
          maxHeight: 'unset !important',
        },
        '& .gm-style-iw-chr': {
          top: 4,
          right: 4,
          position: 'absolute',
          '& button': {
            width: '20px !important',
            height: '20px !important',
            borderRadius: '50%',
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex !important',
            padding: '4px !important',
            bgcolor: 'black !important',
          },
          '& .gm-ui-hover-effect>span': {
            bgcolor: 'white',
            margin: '0 !important',
            width: '100% !important',
            height: '100% !important',
          },
        },
        ...sx,
      }}
    >
      <APIProvider apiKey={CONFIG.googleMapApiKey}>
        <ReactGoogleMap
          mapId="49ae42fed52588c3"
          defaultCenter={defaultCenter}
          defaultZoom={defaultZoom}
          minZoom={1}
          gestureHandling="greedy"
          disableDefaultUI
          onClick={handleMapClick}
          style={{ width: '100%', height: '100%' }}
        >
          {markers.map((marker) => (
            <JourneyMarker
              key={marker.id}
              marker={marker}
              open={resolvedActiveId === marker.id}
              onClose={() => setInternalActiveId(null)}
              onClick={() => handleMarkerClick(marker.id)}
            />
          ))}

          {pickerMode && selectedPosition ? (
            <AdvancedMarker position={selectedPosition}>
              <PinIcon color="primary.main" />
            </AdvancedMarker>
          ) : null}
        </ReactGoogleMap>
      </APIProvider>
    </Box>
  );
}
