'use client';

import type { ICinemaFilm } from 'src/types/cinema-film';
import type { ICinemaFilmScreening } from 'src/types/cinema-film-screening';
import type { CinemaCategory } from 'src/sections/dashboard/cinema/cinema-categories';

import { useState, useEffect, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import {
  createCinemaScreening,
  updateCinemaScreening,
} from 'src/actions/cinema-film-screening';

import { toast } from 'src/components/dashboard/snackbar';

import { toIsoOrNull, toDatetimeLocalValue } from './cinema-film-schedule';

// ----------------------------------------------------------------------

type FormState = {
  filmId: string;
  showAt: string;
  showEndAt: string;
  order: string;
};

const emptyForm: FormState = {
  filmId: '',
  showAt: '',
  showEndAt: '',
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
      showAt: toDatetimeLocalValue(screening.showAt),
      showEndAt: toDatetimeLocalValue(screening.showEndAt),
      order: screening.order != null ? String(screening.order) : '',
    });
  }, [defaultFilmId, open, screening]);

  const handleFieldChange = useCallback(
    (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    const filmId = Number.parseInt(form.filmId, 10);

    if (Number.isNaN(filmId)) {
      toast.error('Please select a film.');
      return;
    }

    if (!form.showAt.trim()) {
      toast.error('Show start time is required.');
      return;
    }

    const showAt = toIsoOrNull(form.showAt);

    if (!showAt) {
      toast.error('Show start time is invalid.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        filmId,
        showAt,
        showEndAt: toIsoOrNull(form.showEndAt),
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
              label="Show starts"
              type="datetime-local"
              value={form.showAt}
              onChange={handleFieldChange('showAt')}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Show ends"
              type="datetime-local"
              value={form.showEndAt}
              onChange={handleFieldChange('showEndAt')}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

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
