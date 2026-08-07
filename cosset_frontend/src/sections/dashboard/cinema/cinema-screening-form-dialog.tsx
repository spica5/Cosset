'use client';

import type { ICinemaFilm } from 'src/types/cinema-film';
import type { ICinemaFilmScreening } from 'src/types/cinema-film-screening';
import type { CinemaCategory } from 'src/sections/dashboard/cinema/cinema-categories';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';

import {
  createCinemaScreening,
  updateCinemaScreening,
} from 'src/actions/cinema-film-screening';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';

import {
  toIsoOrNull,
  toTimeLocalValue,
  getScreeningWeeklyDaySummary,
  getLocalTimeLabelFromUtcInput,
} from './cinema-film-schedule';

// ----------------------------------------------------------------------

type FormState = {
  filmId: string;
  showAt: string;
  showAt2: string;
  showFriday: boolean;
  showSaturday: boolean;
  showSunday: boolean;
  price: string;
  order: string;
};

const emptyForm: FormState = {
  filmId: '',
  showAt: '',
  showAt2: '',
  showFriday: true,
  showSaturday: true,
  showSunday: true,
  price: '',
  order: '',
};

type Props = {
  open: boolean;
  category: CinemaCategory;
  customerId: string;
  films: ICinemaFilm[];
  screening?: ICinemaFilmScreening | null;
  defaultFilmId?: number | null;
  onClose: () => void;
  onSaved?: () => void;
};

const parseNullableInteger = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export function CinemaScreeningFormDialog({
  open,
  category,
  customerId,
  films,
  screening,
  defaultFilmId,
  onClose,
  onSaved,
}: Props) {
  const isEditMode = !!screening;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setForm(emptyForm);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!screening) {
      setForm({
        ...emptyForm,
        filmId: defaultFilmId != null ? String(defaultFilmId) : '',
      });
      return;
    }

    setForm({
      filmId: String(screening.filmId),
      showAt: toTimeLocalValue(screening.showAt),
      showAt2: toTimeLocalValue(screening.showAt2),
      showFriday: screening.showFriday !== false,
      showSaturday: screening.showSaturday !== false,
      showSunday: screening.showSunday !== false,
      price: screening.price != null ? String(screening.price) : '',
      order: screening.order != null ? String(screening.order) : '',
    });
  }, [defaultFilmId, open, screening]);

  const handleFieldChange = useCallback(
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    },
    [],
  );

  const handleClearField = useCallback((field: 'showAt' | 'showAt2') => {
    setForm((prev) => ({ ...prev, [field]: '' }));
  }, []);

  const handleToggleDay = useCallback((field: 'showFriday' | 'showSaturday' | 'showSunday') => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const filmId = Number.parseInt(form.filmId, 10);

    if (Number.isNaN(filmId)) {
      toast.error('Please select a film.');
      return;
    }

    const showAt = toIsoOrNull(form.showAt);
    const showAt2 = toIsoOrNull(form.showAt2);

    if (form.showAt.trim() && !showAt) {
      toast.error('Show start time is invalid.');
      return;
    }

    if (form.showAt2.trim() && !showAt2) {
      toast.error('Second show start time is invalid.');
      return;
    }

    if (!form.showFriday && !form.showSaturday && !form.showSunday) {
      toast.error('Please select at least one screening day.');
      return;
    }

    const price = form.price.trim();

    if (price) {
      const parsedPrice = Number.parseFloat(price);

      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        toast.error('Please enter a valid extra fee greater than 0.');
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        filmId,
        showAt,
        showAt2,
        showFriday: form.showFriday,
        showSaturday: form.showSaturday,
        showSunday: form.showSunday,
        price: price || null,
        order: parseNullableInteger(form.order),
        isPublic: 1,
      };

      if (isEditMode && screening) {
        await updateCinemaScreening(screening.id, payload, { customerId, category });
        toast.success('Screening updated successfully.');
      } else {
        await createCinemaScreening(
          {
            customerId,
            ...payload,
          },
          { customerId, category },
        );
        toast.success('Screening added successfully.');
      }

      onSaved?.();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to save screening:', error);
      toast.error('Failed to save screening.');
    } finally {
      setSubmitting(false);
    }
  }, [category, customerId, form, isEditMode, onClose, onSaved, resetForm, screening]);

  const handleClose = useCallback(() => {
    if (submitting) {
      return;
    }

    onClose();
    resetForm();
  }, [onClose, resetForm, submitting]);

  const clearAdornment = (field: 'showAt' | 'showAt2', value: string) =>
    value ? (
      <InputAdornment position="end">
        <IconButton
          size="small"
          aria-label={`Clear ${field === 'showAt' ? 'first' : 'second'} show time`}
          onClick={() => handleClearField(field)}
          edge="end"
        >
          <Iconify icon="mingcute:close-line" width={16} />
        </IconButton>
      </InputAdornment>
    ) : null;

  const showTimeHelperText = (utcValue: string) => {
    const localLabel = getLocalTimeLabelFromUtcInput(utcValue);

    return (
      <Box component="span" sx={{ display: 'block' }}>
        <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Optional - weekly UTC time
        </Typography>
        {localLabel ? (
          <Typography
            component="span"
            variant="caption"
            sx={{ display: 'block', fontWeight: 600, color: 'info.main' }}
          >
            Local time: {localLabel}
          </Typography>
        ) : null}
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditMode ? 'Edit Screening' : 'Add Screening'}</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            select
            label="Film"
            value={form.filmId}
            onChange={handleFieldChange('filmId')}
            required
            fullWidth
            disabled={isEditMode}
          >
            {films.map((film) => (
              <MenuItem key={film.id} value={String(film.id)}>
                {film.title}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Show starts (UTC)"
              type="time"
              value={form.showAt}
              onChange={handleFieldChange('showAt')}
              fullWidth
              helperText={showTimeHelperText(form.showAt)}
              InputLabelProps={{ shrink: true }}
              FormHelperTextProps={{ component: 'div' }}
              inputProps={{ step: 60 }}
              InputProps={{ endAdornment: clearAdornment('showAt', form.showAt) }}
            />

            <TextField
              label="Show starts 2 (UTC)"
              type="time"
              value={form.showAt2}
              onChange={handleFieldChange('showAt2')}
              fullWidth
              helperText={showTimeHelperText(form.showAt2)}
              InputLabelProps={{ shrink: true }}
              FormHelperTextProps={{ component: 'div' }}
              inputProps={{ step: 60 }}
              InputProps={{ endAdornment: clearAdornment('showAt2', form.showAt2) }}
            />
          </Stack>

          <Box>
            <FormLabel component="legend" sx={{ display: 'block', mb: 1 }}>
              Screen days
            </FormLabel>
            <FormGroup row sx={{ gap: 1, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.showFriday}
                    onChange={() => handleToggleDay('showFriday')}
                  />
                }
                label="Friday"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.showSaturday}
                    onChange={() => handleToggleDay('showSaturday')}
                  />
                }
                label="Saturday"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.showSunday}
                    onChange={() => handleToggleDay('showSunday')}
                  />
                }
                label="Sunday"
              />
            </FormGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Selected days: {getScreeningWeeklyDaySummary(form)}
            </Typography>
          </Box>

          <Box>
            <FormLabel component="legend" sx={{ display: 'block', mb: 1 }}>
              Pricing
            </FormLabel>
            <TextField
              label="Extra fee"
              value={form.price}
              onChange={handleFieldChange('price')}
              fullWidth
              type="number"
              placeholder="Leave blank for no extra fee"
              inputProps={{ min: 0, step: '0.01' }}
              helperText={form.price.trim() ? 'This screening has an extra fee.' : 'Leave blank for no extra fee.'}
            />
          </Box>

          <TextField
            label="Display order"
            value={form.order}
            onChange={handleFieldChange('order')}
            fullWidth
            type="number"
            placeholder="Optional"
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button color="inherit" onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>

        <LoadingButton variant="contained" loading={submitting} onClick={handleSubmit}>
          {isEditMode ? 'Save changes' : 'Add screening'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
