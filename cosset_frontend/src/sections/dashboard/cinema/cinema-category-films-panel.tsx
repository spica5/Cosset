'use client';

import type { ICinemaFilm } from 'src/types/cinema-film';
import type { ICinemaFilmReservationWithScreening } from 'src/types/cinema-film-reservation';

import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useAuthContext } from 'src/auth/hooks';

import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';

import { deleteCinemaFilm, useGetCinemaFilms } from 'src/actions/cinema-film';
import { useGetCinemaScreenings } from 'src/actions/cinema-film-screening';
import {
  createCinemaReservation,
  useGetCinemaReservations,
} from 'src/actions/cinema-film-reservation';

import { toast } from 'src/components/dashboard/snackbar';

import type { CinemaCategoryMeta } from './cinema-categories';

import { CinemaFilmCard } from './cinema-film-card';
import { CinemaFilmFormDialog } from './cinema-film-form-dialog';
import { CinemaScreeningsTable } from './cinema-screenings-table';
import { formatScreeningSchedule, getNextFilmScreening } from './cinema-film-schedule';
import { CinemaSeatMapDialog } from './cinema-seat-map-dialog';

// ----------------------------------------------------------------------

type Props = {
  category: CinemaCategoryMeta;
  compact?: boolean;
  showScreenings?: boolean;
  canManage?: boolean;
  /** When true, only films with at least one screening are listed. */
  scheduledOnly?: boolean;
};

export function CinemaCategoryFilmsPanel({
  category,
  compact = false,
  showScreenings = true,
  canManage: canManageProp,
  scheduledOnly = false,
}: Props) {
  const { user } = useAuthContext();
  const customerId = String(user?.id || '');
  const canManage = canManageProp ?? Boolean(customerId);

  const { films, filmsLoading } = useGetCinemaFilms(customerId, category.id);
  const { screenings, screeningsLoading } = useGetCinemaScreenings(
    scheduledOnly || showScreenings ? customerId : null,
    scheduledOnly || showScreenings ? category.id : null,
  );
  const { reservations } = useGetCinemaReservations(scheduledOnly ? customerId : null, {
    ownerCustomerId: customerId,
    category: category.id,
    status: 'reserved',
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFilm, setEditingFilm] = useState<ICinemaFilm | null>(null);
  const [seatMapOpen, setSeatMapOpen] = useState(false);
  const [seatMapMode, setSeatMapMode] = useState<'select' | 'view'>('select');
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [reservingFilm, setReservingFilm] = useState<ICinemaFilm | null>(null);
  const [viewingReservation, setViewingReservation] =
    useState<ICinemaFilmReservationWithScreening | null>(null);
  const [confirming, setConfirming] = useState(false);

  const reservationsByScreeningId = useMemo(() => {
    const map = new Map<number, ICinemaFilmReservationWithScreening>();
    reservations.forEach((reservation) => {
      map.set(reservation.screeningId, reservation);
    });
    return map;
  }, [reservations]);

  const reservedScreeningIds = useMemo(
    () => new Set(reservationsByScreeningId.keys()),
    [reservationsByScreeningId],
  );

  const visibleFilms = useMemo(() => {
    if (!scheduledOnly) {
      return films;
    }

    const screeningsByFilmId = screenings.reduce<Record<number, typeof screenings>>((acc, screening) => {
      const list = acc[screening.filmId] || [];
      list.push(screening);
      acc[screening.filmId] = list;
      return acc;
    }, {});

    return films.flatMap((film) => {
      const fromApi = screeningsByFilmId[film.id] || [];
      const nested = Array.isArray(film.screenings) ? film.screenings : [];
      const merged = fromApi.length ? fromApi : nested;

      return merged.length ? [{ ...film, screenings: merged }] : [];
    });
  }, [films, scheduledOnly, screenings]);

  const loading = filmsLoading || ((scheduledOnly || showScreenings) && screeningsLoading);

  const reservingScreening = reservingFilm ? getNextFilmScreening(reservingFilm) : null;

  const seatSession = useMemo(() => {
    if (seatMapMode === 'view' && viewingReservation) {
      return {
        cinemaName: 'Cosset Cinema',
        sessionLabel:
          formatScreeningSchedule(viewingReservation) || 'Scheduled screening',
        roomLabel: category.title,
      };
    }

    return {
      cinemaName: 'Cosset Cinema',
      sessionLabel: reservingScreening
        ? formatScreeningSchedule(reservingScreening) || 'Scheduled screening'
        : 'Scheduled screening',
      roomLabel: category.title,
    };
  }, [category.title, reservingScreening, seatMapMode, viewingReservation]);

  const handleOpenCreate = useCallback(() => {
    setEditingFilm(null);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((film: ICinemaFilm) => {
    setEditingFilm(film);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingFilm(null);
  }, []);

  const handleDelete = useCallback(
    async (film: ICinemaFilm) => {
      const confirmed = window.confirm(`Delete "${film.title}"?`);
      if (!confirmed) {
        return;
      }

      try {
        await deleteCinemaFilm(film.id, { customerId, category: category.id });
        toast.success('Film deleted successfully.');
      } catch (error) {
        console.error('Failed to delete film:', error);
        toast.error('Failed to delete film.');
      }
    },
    [category.id, customerId],
  );

  const handleOpenSeatMap = useCallback(
    (film: ICinemaFilm) => {
      const screening = getNextFilmScreening(film);
      const existing = screening ? reservationsByScreeningId.get(screening.id) : null;

      if (existing) {
        setSeatMapMode('view');
        setViewingReservation(existing);
        setReservingFilm(null);
        setSelectedSeatIds(existing.seatIds || []);
        setSeatMapOpen(true);
        return;
      }

      if (!screening?.id) {
        toast.error('No screening is available to reserve for this film.');
        return;
      }

      setSeatMapMode('select');
      setViewingReservation(null);
      setReservingFilm(film);
      setSelectedSeatIds([]);
      setSeatMapOpen(true);
    },
    [reservationsByScreeningId],
  );

  const handleCloseSeatMap = useCallback(() => {
    if (confirming) return;
    setSeatMapOpen(false);
    setReservingFilm(null);
    setViewingReservation(null);
    setSelectedSeatIds([]);
    setSeatMapMode('select');
  }, [confirming]);

  const handleToggleSeat = useCallback((seatId: string) => {
    setSelectedSeatIds((prev) => (prev.includes(seatId) ? [] : [seatId]));
  }, []);

  const handleConfirmReserve = useCallback(async () => {
    const screening = reservingFilm ? getNextFilmScreening(reservingFilm) : null;
    const seatId = selectedSeatIds[0];

    if (!reservingFilm || !screening?.id || !seatId) {
      return;
    }

    try {
      setConfirming(true);
      await createCinemaReservation(
        { screeningId: screening.id, customerId, seatIds: [seatId] },
        { ownerCustomerId: customerId, category: category.id },
      );
      toast.success(`Reserved "${reservingFilm.title}" · seat ${seatId}.`);
      setSeatMapOpen(false);
      setReservingFilm(null);
      setViewingReservation(null);
      setSelectedSeatIds([]);
      setSeatMapMode('select');
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to reserve screening.';
      toast.error(message);
    } finally {
      setConfirming(false);
    }
  }, [category.id, customerId, reservingFilm, selectedSeatIds]);

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Typography variant={compact ? 'subtitle1' : 'h6'} sx={{ fontWeight: 700 }}>
          {scheduledOnly ? 'Scheduled films' : 'Screening playlist'}
        </Typography>

        {canManage ? (
          <Button
            onClick={handleOpenCreate}
            size={compact ? 'small' : 'medium'}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            sx={{ fontWeight: 700 }}
          >
            Add film
          </Button>
        ) : null}
      </Stack>

      {loading ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: compact ? 4 : 6 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : visibleFilms.length ? (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: compact ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
            },
          }}
        >
          {visibleFilms.map((film) => {
            const screening = scheduledOnly ? getNextFilmScreening(film) : null;
            const isReserved = screening ? reservedScreeningIds.has(screening.id) : false;

            return (
              <CinemaFilmCard
                key={film.id}
                film={film}
                canManage={canManage}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                onReserve={scheduledOnly ? handleOpenSeatMap : undefined}
                isReserved={isReserved}
                isReserving={
                  seatMapMode === 'select' &&
                  reservingFilm?.id === film.id &&
                  (seatMapOpen || confirming)
                }
              />
            );
          })}
        </Box>
      ) : (
        <EmptyContent
          filled
          title={scheduledOnly ? 'No scheduled films' : 'No films added yet'}
          description={
            scheduledOnly
              ? 'Admins can schedule showtimes in Admin → Media → Cinema.'
              : 'Add films to this screening room and preview them in your universe cinema.'
          }
          sx={{ py: compact ? 4 : 6 }}
        />
      )}

      {showScreenings ? (
        <Box sx={{ mt: compact ? 3 : 4 }}>
          <CinemaScreeningsTable
            category={category}
            customerId={customerId}
            films={films}
            filmsLoading={filmsLoading}
            compact={compact}
            canManage={canManage}
          />
        </Box>
      ) : null}

      {canManage ? (
        <CinemaFilmFormDialog
          open={dialogOpen}
          category={category.id}
          customerId={customerId}
          film={editingFilm}
          onClose={handleCloseDialog}
        />
      ) : null}

      {scheduledOnly ? (
        <CinemaSeatMapDialog
          open={seatMapOpen}
          session={seatSession}
          selectedSeatIds={selectedSeatIds}
          onToggleSeat={seatMapMode === 'select' ? handleToggleSeat : undefined}
          onClose={handleCloseSeatMap}
          onConfirm={seatMapMode === 'select' ? handleConfirmReserve : undefined}
          confirmLabel="Confirm reservation"
          confirmIcon="solar:bookmark-bold"
          confirming={confirming}
          readOnly={seatMapMode === 'view'}
          title={
            seatMapMode === 'view'
              ? viewingReservation
                ? `Reserved · ${viewingReservation.filmTitle}`
                : 'Your reservation'
              : undefined
          }
        />
      ) : null}
    </>
  );
}
