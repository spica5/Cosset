'use client';

import type { Dayjs } from 'dayjs';
import type { ICinemaFilm } from 'src/types/cinema-film';
import type { ICinemaFilmScreening } from 'src/types/cinema-film-screening';
import type { PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import type { CinemaCategory } from 'src/sections/dashboard/cinema/cinema-categories';

import dayjs from 'dayjs';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import {
  createCinemaScreening,
  updateCinemaScreening,
} from 'src/actions/cinema-film-screening';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';

import { LocalizationProvider } from 'src/locales';

import {
  CINEMA_WEEKLY_UTC_DAYS,
  toIsoOrNull,
  toTimeLocalValue,
  getScreeningWeeklyDaySummary,
  getLocalTimeLabelFromUtcInput,
} from './cinema-film-schedule';

// ----------------------------------------------------------------------

type ScreeningMode = 'official' | 'flexible';

const OFFICIAL_SHOW_AT_UTC = '02:00'; // 09:00 VNT
const OFFICIAL_SHOW_AT2_UTC = '14:00'; // 21:00 VNT

type FormState = {
  filmId: string;
  showAt: string;
  showAt2: string;
  showFriday: boolean;
  showSaturday: boolean;
  showSunday: boolean;
  /** Friday (UTC) of the selected Fri–Sun weekend. UI-only anchor for the calendar week. */
  weekAnchorFriday: string;
  screeningMode: ScreeningMode;
  price: string;
  order: string;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

const isCinemaWeekendDay = (day: number) =>
  (CINEMA_WEEKLY_UTC_DAYS as readonly number[]).includes(day);

const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** Friday of the Fri–Sun block containing `date` (calendar local time). */
const getWeekendFriday = (date: Date) => {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = normalized.getDay();

  if (weekday === 5) return normalized;
  if (weekday === 6) return new Date(normalized.getFullYear(), normalized.getMonth(), normalized.getDate() - 1);
  if (weekday === 0) return new Date(normalized.getFullYear(), normalized.getMonth(), normalized.getDate() - 2);

  return normalized;
};

const getWeekendDates = (friday: Date) => ({
  friday: formatLocalDate(friday),
  saturday: formatLocalDate(new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() + 1)),
  sunday: formatLocalDate(new Date(friday.getFullYear(), friday.getMonth(), friday.getDate() + 2)),
});

const getUpcomingWeekendFriday = () => {
  const now = new Date();
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (isCinemaWeekendDay(candidate.getDay())) {
      return getWeekendFriday(candidate);
    }
  }
  return getWeekendFriday(now);
};

const getDayFieldFromWeekday = (weekday: number): 'showFriday' | 'showSaturday' | 'showSunday' | null => {
  if (weekday === 5) return 'showFriday';
  if (weekday === 6) return 'showSaturday';
  if (weekday === 0) return 'showSunday';
  return null;
};

const buildEmptyForm = (): FormState => {
  const friday = getUpcomingWeekendFriday();
  return {
    filmId: '',
    showAt: OFFICIAL_SHOW_AT_UTC,
    showAt2: OFFICIAL_SHOW_AT2_UTC,
    showFriday: true,
    showSaturday: true,
    showSunday: true,
    weekAnchorFriday: formatLocalDate(friday),
    screeningMode: 'official',
    price: '',
    order: '',
  };
};

const buildFormFromScreening = (screening: ICinemaFilmScreening): FormState => {
  const showFlexible = screening.showFlexible === true;
  const screeningMode: ScreeningMode = showFlexible ? 'flexible' : 'official';
  const weekStartRaw = String(screening.showWeekStart || '').trim();
  const friday = /^\d{4}-\d{2}-\d{2}$/.test(weekStartRaw)
    ? getWeekendFriday(dayjs(weekStartRaw).toDate())
    : getUpcomingWeekendFriday();

  return {
    filmId: String(screening.filmId),
    showAt: screeningMode === 'official' ? OFFICIAL_SHOW_AT_UTC : toTimeLocalValue(screening.showAt),
    showAt2: screeningMode === 'official' ? OFFICIAL_SHOW_AT2_UTC : toTimeLocalValue(screening.showAt2),
    showFriday: screening.showFriday !== false,
    showSaturday: screening.showSaturday !== false,
    showSunday: screening.showSunday !== false,
    weekAnchorFriday: formatLocalDate(friday),
    screeningMode,
    price: screening.price != null ? String(screening.price) : '',
    order: screening.order != null ? String(screening.order) : '',
  };
};

type ScreeningWeekDayProps = PickersDayProps<Dayjs> & {
  selectedDates?: Set<string>;
  onToggleDay?: (day: Dayjs) => void;
};

function ScreeningWeekDay({ day, selectedDates, onToggleDay, outsideCurrentMonth, ...other }: ScreeningWeekDayProps) {
  const key = day.format('YYYY-MM-DD');
  const isSelected = Boolean(selectedDates?.has(key));

  return (
    <PickersDay
      {...other}
      outsideCurrentMonth={outsideCurrentMonth}
      day={day}
      selected={isSelected}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggleDay?.(day);
      }}
    />
  );
}

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

const getScreeningSaveErrorMessage = (error: unknown) => {
  const pickMessage = (value: unknown) =>
    typeof value === 'string' && value.trim() ? value.trim() : null;

  if (typeof error === 'string') {
    return pickMessage(error) || 'Failed to save screening.';
  }

  if (error && typeof error === 'object') {
    const axiosMessage = pickMessage(
      (error as { response?: { data?: { message?: unknown } } }).response?.data?.message,
    );
    if (axiosMessage) {
      return axiosMessage.charAt(0).toUpperCase() + axiosMessage.slice(1);
    }

    const message = pickMessage((error as { message?: unknown }).message);
    if (message && message !== 'Request failed with status code 400') {
      return message.charAt(0).toUpperCase() + message.slice(1);
    }
  }

  return 'Failed to save screening.';
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
  const [form, setForm] = useState<FormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setForm(buildEmptyForm());
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!screening) {
      setForm({
        ...buildEmptyForm(),
        filmId: defaultFilmId != null ? String(defaultFilmId) : '',
      });
      return;
    }

    setForm(buildFormFromScreening(screening));
  }, [defaultFilmId, open, screening]);

  const handleFieldChange = useCallback(
    (field: 'filmId' | 'showAt' | 'showAt2' | 'price' | 'order') =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [field]: event.target.value }));
      },
    [],
  );

  const handleClearField = useCallback((field: 'showAt' | 'showAt2') => {
    setForm((prev) => ({ ...prev, [field]: '' }));
  }, []);

  const handleSetMode = useCallback((mode: ScreeningMode) => {
    setForm((prev) => {
      if (mode === prev.screeningMode) return prev;

      if (mode === 'official') {
        return {
          ...prev,
          screeningMode: 'official',
          showAt: OFFICIAL_SHOW_AT_UTC,
          showAt2: OFFICIAL_SHOW_AT2_UTC,
        };
      }

      return {
        ...prev,
        screeningMode: 'flexible',
        showAt: prev.showAt || '',
        showAt2: '',
      };
    });
  }, []);

  const selectedWeekDates = useMemo(() => {
    const friday = dayjs(form.weekAnchorFriday);
    const weekend = getWeekendDates(friday.toDate());
    const selected = new Set<string>();

    if (form.showFriday) selected.add(weekend.friday);
    if (form.showSaturday) selected.add(weekend.saturday);
    if (form.showSunday) selected.add(weekend.sunday);

    return selected;
  }, [form.showFriday, form.showSaturday, form.showSunday, form.weekAnchorFriday]);

  const calendarReferenceDate = useMemo(
    () => dayjs(form.weekAnchorFriday),
    [form.weekAnchorFriday],
  );

  const shouldDisableWeekDate = useCallback((date: Dayjs) => !isCinemaWeekendDay(date.day()), []);

  const handleToggleWeekDay = useCallback((day: Dayjs) => {
    const field = getDayFieldFromWeekday(day.day());
    if (!field) return;

    const clickedFriday = formatLocalDate(getWeekendFriday(day.toDate()));

    setForm((prev) => {
      const isDifferentWeek = prev.weekAnchorFriday !== clickedFriday;

      if (isDifferentWeek) {
        return {
          ...prev,
          weekAnchorFriday: clickedFriday,
          showFriday: true,
          showSaturday: true,
          showSunday: true,
        };
      }

      const nextValue = !prev[field];
      const nextFriday = field === 'showFriday' ? nextValue : prev.showFriday;
      const nextSaturday = field === 'showSaturday' ? nextValue : prev.showSaturday;
      const nextSunday = field === 'showSunday' ? nextValue : prev.showSunday;

      if (!nextFriday && !nextSaturday && !nextSunday) {
        toast.error('Select at least one day in this weekend.');
        return prev;
      }

      return {
        ...prev,
        [field]: nextValue,
      };
    });
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

    const showFlexible = form.screeningMode === 'flexible';

    if (showFlexible && !form.showAt.trim()) {
      toast.error('Please select a show start time.');
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
        showFlexible,
        showWeekStart: form.weekAnchorFriday,
        pricingType: price ? ('paid' as const) : ('free' as const),
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
      toast.error(getScreeningSaveErrorMessage(error));
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
          Optional - weekly UTC time (VNT is shown below)
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

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Screening weekend (Fri–Sun)
            </Typography>
            <LocalizationProvider>
              <Box
                sx={{
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.neutral',
                  display: 'inline-flex',
                  overflow: 'hidden',
                  '& .MuiDateCalendar-root': {
                    width: { xs: 292, sm: 320 },
                    maxHeight: 'none',
                    height: 'auto',
                  },
                  '& .MuiPickersSlideTransition-root': {
                    minHeight: 240,
                  },
                  '& .MuiPickersDay-root.Mui-selected': {
                    fontWeight: 700,
                  },
                }}
              >
                <DateCalendar
                  referenceDate={calendarReferenceDate}
                  value={null}
                  onChange={() => undefined}
                  shouldDisableDate={shouldDisableWeekDate}
                  slots={{ day: ScreeningWeekDay }}
                  slotProps={{
                    day: {
                      selectedDates: selectedWeekDates,
                      onToggleDay: handleToggleWeekDay,
                    } as ScreeningWeekDayProps,
                  }}
                />
              </Box>
            </LocalizationProvider>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Select Friday, Saturday, and/or Sunday in the same weekend. Monday–Thursday are disabled.
              Tapping a day in another weekend switches to that week.
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Screening mode
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={form.screeningMode}
              onChange={(_, next) => {
                if (!next) return;
                handleSetMode(next);
              }}
              sx={{ mb: 1 }}
            >
              <ToggleButton value="official">Official</ToggleButton>
              <ToggleButton value="flexible">Flexible</ToggleButton>
            </ToggleButtonGroup>

            {form.screeningMode === 'official' ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Official runs two shows automatically: 09:00 VNT (02:00 UTC) and 21:00 VNT (14:00 UTC).
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Flexible preview uses one show start time for admin playback testing.
              </Typography>
            )}
          </Box>

          {form.screeningMode === 'flexible' ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Show start (UTC)"
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
            </Stack>
          ) : null}

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Pricing
            </Typography>
            <TextField
              label="Extra fee"
              value={form.price}
              onChange={handleFieldChange('price')}
              fullWidth
              type="number"
              placeholder="Leave blank for no extra fee"
              inputProps={{ min: 0, step: '0.01' }}
              helperText={
                form.price.trim()
                  ? 'Charged from the viewer wallet in USD. Paid-plan viewers pay half.'
                  : 'Leave blank for no extra fee. Amount is USD, e.g. 1.99'
              }
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

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Selected days:{" "}
            {getScreeningWeeklyDaySummary({
              showAt: form.showAt,
              showAt2: form.showAt2,
              showFlexible: form.screeningMode === 'flexible',
              showWeekStart: form.weekAnchorFriday,
              showFriday: form.showFriday,
              showSaturday: form.showSaturday,
              showSunday: form.showSunday,
            })}
            {form.screeningMode === 'flexible' ? ' — Flexible preview.' : ''}
          </Typography>
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
