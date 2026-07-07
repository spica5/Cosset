'use client';

import type { IDateValue } from 'src/types/common';
import type { IJourneyDiaryLocation, IJourneyDiaryLocationForm } from 'src/types/journey-diary-location';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LoadingButton from '@mui/lab/LoadingButton';

import {
  createJourneyDiaryLocation,
  updateJourneyDiaryLocation,
} from 'src/actions/journey-diary-location';

import { toast } from 'src/components/dashboard/snackbar';

import { JourneyDiaryWorldMap } from './journey-diary-world-map';
import {
  formatCoordInput,
  parseCoordInput,
} from './journey-diary-coords';

// ----------------------------------------------------------------------

const EMPTY_FORM: IJourneyDiaryLocationForm = {
  journeyName: '',
  location: '',
  city: '',
  country: '',
  latitude: '',
  longitude: '',
  visitedAt: '',
  endAt: '',
  notes: '',
};

const toDatetimeLocalValue = (value?: IDateValue | Date) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const pad = (part: number) => String(part).padStart(2, '0');

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

const toIsoOrNull = (value: string) => {
  if (!value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

type Props = {
  open: boolean;
  currentEntry?: IJourneyDiaryLocation | null;
  userId?: string;
  onClose: () => void;
  onSaved: () => void;
};

export function JourneyDiaryLocationFormDialog({
  open,
  currentEntry,
  userId,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!currentEntry?.id;
  const [form, setForm] = useState<IJourneyDiaryLocationForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (currentEntry) {
      setForm({
        journeyName: currentEntry.journeyName || '',
        location: currentEntry.location || '',
        city: currentEntry.city || '',
        country: currentEntry.country || '',
        latitude: formatCoordInput(currentEntry.latitude),
        longitude: formatCoordInput(currentEntry.longitude),
        visitedAt: toDatetimeLocalValue(currentEntry.visitedAt),
        endAt: toDatetimeLocalValue(currentEntry.endAt),
        notes: currentEntry.notes || '',
      });
      return;
    }

    setForm(EMPTY_FORM);
  }, [currentEntry, open]);

  const selectedPosition = useMemo(() => {
    const lat = parseCoordInput(form.latitude);
    const lng = parseCoordInput(form.longitude);

    if (lat === null || lng === null) {
      return null;
    }

    return { lat, lng };
  }, [form.latitude, form.longitude]);

  const handleChange = useCallback((field: keyof IJourneyDiaryLocationForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handlePositionChange = useCallback((position: { lat: number; lng: number }) => {
    setForm((prev) => ({
      ...prev,
      latitude: String(position.lat),
      longitude: String(position.lng),
    }));
  }, []);

  const handleClearPosition = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      latitude: '',
      longitude: '',
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.location.trim()) {
      toast.error('Location is required.');
      return;
    }

    const latitude = parseCoordInput(form.latitude);
    const longitude = parseCoordInput(form.longitude);

    if ((latitude === null) !== (longitude === null)) {
      toast.error('Please set both latitude and longitude, or clear the map position.');
      return;
    }

    const payload = {
      journeyName: form.journeyName.trim() || null,
      location: form.location.trim(),
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      latitude,
      longitude,
      visitedAt: toIsoOrNull(form.visitedAt),
      endAt: toIsoOrNull(form.endAt),
      notes: form.notes.trim() || null,
    };

    try {
      setSubmitting(true);

      if (isEdit && currentEntry?.id) {
        await updateJourneyDiaryLocation(currentEntry.id, payload, userId);
        toast.success('Location updated successfully.');
      } else {
        await createJourneyDiaryLocation({
          ...payload,
          userId: userId || null,
        });
        toast.success('Location added successfully.');
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to save location:', error);
      toast.error('Failed to save location.');
    } finally {
      setSubmitting(false);
    }
  }, [currentEntry?.id, form, isEdit, onClose, onSaved, userId]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{isEdit ? 'Edit location' : 'Add location'}</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            label="Journey name"
            value={form.journeyName}
            onChange={(event) => handleChange('journeyName', event.target.value)}
            fullWidth
          />

          <TextField
            label="Location"
            value={form.location}
            onChange={(event) => handleChange('location', event.target.value)}
            required
            fullWidth
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="City"
              value={form.city}
              onChange={(event) => handleChange('city', event.target.value)}
              fullWidth
            />
            <TextField
              label="Country"
              value={form.country}
              onChange={(event) => handleChange('country', event.target.value)}
              fullWidth
            />
          </Stack>

          <Box>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={1}
              sx={{ mb: 1.5 }}
            >
              <Box>
                <Typography variant="subtitle2">Visited position</Typography>
                <Typography variant="caption" color="text.secondary">
                  Click the map to place the visited location.
                </Typography>
              </Box>
              {form.latitude || form.longitude ? (
                <Button size="small" color="inherit" onClick={handleClearPosition}>
                  Clear position
                </Button>
              ) : null}
            </Stack>

            <JourneyDiaryWorldMap
              pickerMode
              selectedPosition={selectedPosition}
              onPositionChange={handlePositionChange}
              height={280}
            />
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Latitude"
              value={form.latitude}
              onChange={(event) => handleChange('latitude', event.target.value)}
              fullWidth
            />
            <TextField
              label="Longitude"
              value={form.longitude}
              onChange={(event) => handleChange('longitude', event.target.value)}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Visited from"
              type="datetime-local"
              value={form.visitedAt}
              onChange={(event) => handleChange('visitedAt', event.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Visited until"
              type="datetime-local"
              value={form.endAt}
              onChange={(event) => handleChange('endAt', event.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

          <TextField
            label="Notes"
            value={form.notes}
            onChange={(event) => handleChange('notes', event.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <LoadingButton variant="contained" loading={submitting} onClick={handleSubmit}>
          {isEdit ? 'Save changes' : 'Add location'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
