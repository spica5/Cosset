'use client';

import type { MouseEvent, ChangeEvent } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import {
  isPublicJourneyItem,
  toJourneyVisibility,
  type JourneyVisibility,
} from './journey-diary-public-utils';

// ----------------------------------------------------------------------

type BaseProps = {
  isPublic?: number | null;
  disabled?: boolean;
  saving?: boolean;
  onChange: (visibility: JourneyVisibility) => void | Promise<void>;
  stopPropagation?: boolean;
};

type ToggleProps = BaseProps & {
  showLabel?: boolean;
};

const stopEvent = (event: MouseEvent) => {
  event.stopPropagation();
};

export function JourneyDiaryPublicBadge({ isPublic }: { isPublic?: number | null }) {
  const publicItem = isPublicJourneyItem(isPublic);

  return (
    <Chip
      size="small"
      label={publicItem ? 'Public' : 'Private'}
      color={publicItem ? 'success' : 'default'}
      variant={publicItem ? 'filled' : 'outlined'}
      sx={{ fontWeight: 600, height: 24 }}
    />
  );
}

export function JourneyDiaryPublicControl({
  isPublic,
  disabled = false,
  saving = false,
  onChange,
  stopPropagation = false,
  align = 'center',
}: BaseProps & { align?: 'flex-start' | 'center' | 'flex-end' }) {
  const checked = isPublicJourneyItem(isPublic);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (stopPropagation) {
      event.stopPropagation();
    }

    onChange(event.target.checked ? 1 : 0);
  };

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent={align}
      spacing={0.75}
      onClick={stopPropagation ? stopEvent : undefined}
      onMouseDown={stopPropagation ? stopEvent : undefined}
      sx={{ flexShrink: 0 }}
    >
      {saving ? <CircularProgress size={16} /> : null}
      <Switch
        size="small"
        checked={checked}
        disabled={disabled || saving}
        onChange={handleChange}
        onClick={stopPropagation ? stopEvent : undefined}
        inputProps={{ 'aria-label': checked ? 'Set private' : 'Set public' }}
      />
      <JourneyDiaryPublicBadge isPublic={isPublic} />
    </Stack>
  );
}

export function JourneyDiaryPublicToggle({
  isPublic,
  disabled = false,
  saving = false,
  onChange,
  showLabel = true,
  stopPropagation = false,
}: ToggleProps) {
  const checked = isPublicJourneyItem(isPublic);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (stopPropagation) {
      event.stopPropagation();
    }

    onChange(event.target.checked ? 1 : 0);
  };

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.25}
      onClick={stopPropagation ? stopEvent : undefined}
      onMouseDown={stopPropagation ? stopEvent : undefined}
      sx={{ flexShrink: 0 }}
    >
      {saving ? <CircularProgress size={16} sx={{ mr: 0.5 }} /> : null}
      <Switch
        size="small"
        checked={checked}
        disabled={disabled || saving}
        onChange={handleChange}
        onClick={stopPropagation ? stopEvent : undefined}
        inputProps={{ 'aria-label': checked ? 'Set private' : 'Set public' }}
      />
      {showLabel ? (
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', pr: 0.5 }}>
          {checked ? 'Public' : 'Private'}
        </Typography>
      ) : null}
    </Stack>
  );
}

export function JourneyDiaryPublicToggleInline({
  isPublic,
  disabled,
  saving,
  onChange,
  stopPropagation,
}: BaseProps) {
  return (
    <Box sx={{ display: 'inline-flex' }}>
      <JourneyDiaryPublicToggle
        isPublic={isPublic}
        disabled={disabled}
        saving={saving}
        onChange={onChange}
        stopPropagation={stopPropagation}
      />
    </Box>
  );
}

export { toJourneyVisibility, isPublicJourneyItem };
