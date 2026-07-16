'use client';

import type { ICinemaFilmReservationWithScreening } from 'src/types/cinema-film-reservation';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import {
  cancelCinemaReservation,
  useGetCinemaReservations,
  updateCinemaReservationSeats,
} from 'src/actions/cinema-film-reservation';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';

import type { CinemaCategoryMeta } from './cinema-categories';
import {
  getScreeningShowStatus,
  formatScreeningSchedule,  
  getCinemaFilmShowStatusLabel,
} from './cinema-film-schedule';

import { CINEMA_CREAM } from './cinema-theater-theme';
import { formatCinemaSeatLabels } from './cinema-seat-map';
import { CinemaSeatMapDialog } from './cinema-seat-map-dialog';


// ----------------------------------------------------------------------

type Props = {
  category: CinemaCategoryMeta;
  customerId: string;
  ownerCustomerId?: string;
  compact?: boolean;
  variant?: 'default' | 'banner';
};

export function CinemaReservationsTable({
  category,
  customerId,
  ownerCustomerId,
  compact = false,
  variant = 'default',
}: Props) {
  const { reservations, reservationsLoading } = useGetCinemaReservations(customerId, {
    ownerCustomerId: ownerCustomerId ?? customerId,
    category: category.id,
    status: 'reserved',
  });
  const [actingId, setActingId] = useState<number | null>(null);
  const [editingReservation, setEditingReservation] =
    useState<ICinemaFilmReservationWithScreening | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  const isBanner = variant === 'banner';
  const accent = category.accent;

  const editingSession = {
    cinemaName: 'Cosset Cinema',
    sessionLabel: editingReservation
      ? formatScreeningSchedule(editingReservation) || 'Scheduled screening'
      : 'Scheduled screening',
    roomLabel: category.title,
  };

  const headerTitleSx = isBanner
    ? { fontWeight: 700, color: CINEMA_CREAM }
    : { fontWeight: 700 };

  const headerDescriptionSx = isBanner
    ? { color: 'rgba(245,230,200,0.68)' }
    : { color: 'text.secondary' };

  const tableSx = isBanner
    ? {
        borderRadius: 2,
        bgcolor: 'rgba(0,0,0,0.22)',
        border: '1px solid rgba(255,255,255,0.12)',
        overflow: 'hidden',
      }
    : undefined;

  const headRowSx = isBanner
    ? {
        bgcolor: 'rgba(12, 8, 5, 0.92)',
        '& .MuiTableCell-head': {
          color: 'rgba(255,248,231,0.92)',
          bgcolor: 'rgba(12, 8, 5, 0.92)',
          borderColor: 'rgba(255,255,255,0.12)',
          fontWeight: 700,
        },
      }
    : undefined;

  const cellSx = isBanner
    ? { color: 'rgba(245,230,200,0.88)', borderColor: 'rgba(255,255,255,0.08)' }
    : undefined;

  const getCinemaUrl = useCallback(
    (reservation: ICinemaFilmReservationWithScreening) => {
      const ownerId = reservation.ownerCustomerId || ownerCustomerId || customerId;
      const params = new URLSearchParams({
        ownerId,
        filmId: String(reservation.filmId),
      });

      return `${paths.dashboard.community.cinema.view(category.id)}?${params.toString()}`;
    },
    [category.id, customerId, ownerCustomerId],
  );

  const handleOpenSeatEditor = useCallback((reservation: ICinemaFilmReservationWithScreening) => {
    setEditingReservation(reservation);
    setSelectedSeatIds(reservation.seatIds?.length ? [reservation.seatIds[0]] : []);
  }, []);

  const handleCloseSeatEditor = useCallback(() => {
    if (confirming) return;
    setEditingReservation(null);
    setSelectedSeatIds([]);
  }, [confirming]);

  const handleToggleSeat = useCallback((seatId: string) => {
    setSelectedSeatIds((prev) => (prev.includes(seatId) ? [] : [seatId]));
  }, []);

  const handleConfirmSeat = useCallback(async () => {
    const seatId = selectedSeatIds[0];
    if (!editingReservation || !seatId) return;

    try {
      setConfirming(true);
      await updateCinemaReservationSeats(
        editingReservation.id,
        { customerId, seatIds: [seatId] },
        {
          ownerCustomerId: ownerCustomerId || customerId,
          category: category.id,
        },
      );
      toast.success(`Seat updated to ${seatId} for "${editingReservation.filmTitle}".`);
      setEditingReservation(null);
      setSelectedSeatIds([]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to update seat.';
      toast.error(message);
    } finally {
      setConfirming(false);
    }
  }, [category.id, customerId, editingReservation, ownerCustomerId, selectedSeatIds]);

  const handleCancel = useCallback(
    async (reservation: ICinemaFilmReservationWithScreening) => {
      const confirmed = window.confirm(`Cancel reservation for "${reservation.filmTitle}"?`);
      if (!confirmed) return;

      try {
        setActingId(reservation.id);
        await cancelCinemaReservation(reservation.id, customerId, {
          ownerCustomerId: ownerCustomerId || customerId,
          category: category.id,
        });
        toast.success('Reservation cancelled.');
      } catch (error) {
        console.error('Failed to cancel cinema reservation:', error);
        toast.error('Failed to cancel reservation.');
      } finally {
        setActingId(null);
      }
    },
    [category.id, customerId, ownerCustomerId],
  );

  return (
    <>
      <Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant={compact ? 'subtitle1' : 'h6'} sx={headerTitleSx}>
              Reserved screenings
            </Typography>
            <Typography variant="body2" sx={headerDescriptionSx}>
              Reserve a scheduled film below, then open the cinema when you are ready to watch.
            </Typography>
          </Box>
        </Stack>

        {reservationsLoading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: compact ? 4 : 6 }}>
            <CircularProgress size={28} sx={isBanner ? { color: accent } : undefined} />
          </Stack>
        ) : reservations.length ? (
          <TableContainer sx={{ overflowX: 'auto', ...tableSx }}>
            <Table size={compact ? 'small' : 'medium'}>
              <TableHead>
                <TableRow sx={headRowSx}>
                  <TableCell sx={cellSx}>Film</TableCell>
                  <TableCell sx={cellSx}>Show time</TableCell>
                  <TableCell sx={cellSx}>Seat</TableCell>
                  <TableCell sx={cellSx}>Status</TableCell>
                  <TableCell align="right" sx={cellSx}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {reservations.map((reservation) => {
                  const status = getScreeningShowStatus(reservation);
                  const statusLabel = getCinemaFilmShowStatusLabel(status);
                  const isActing = actingId === reservation.id;
                  const seatLabel = formatCinemaSeatLabels(reservation.seatIds);

                  return (
                    <TableRow
                      key={reservation.id}
                      hover
                      sx={
                        isBanner ? { '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } } : undefined
                      }
                    >
                      <TableCell sx={cellSx}>
                        <Typography
                          variant="subtitle2"
                          sx={isBanner ? { color: CINEMA_CREAM } : undefined}
                        >
                          {reservation.filmTitle}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={
                            isBanner
                              ? { color: 'rgba(245,230,200,0.62)' }
                              : { color: 'text.secondary' }
                          }
                        >
                          {[reservation.filmDirector, reservation.filmYear]
                            .filter(Boolean)
                            .join(' · ') || 'Feature film'}
                        </Typography>
                      </TableCell>

                      <TableCell sx={cellSx}>
                        {formatScreeningSchedule(reservation) || '—'}
                      </TableCell>

                      <TableCell sx={cellSx}>
                        <Button
                          size="small"
                          color="inherit"
                          onClick={() => handleOpenSeatEditor(reservation)}
                          sx={{
                            fontWeight: 700,
                            px: 0.5,
                            minWidth: 0,
                            ...(isBanner ? { color: accent } : {}),
                          }}
                        >
                          {seatLabel || 'No seat'}
                        </Button>
                      </TableCell>

                      <TableCell sx={cellSx}>
                        {statusLabel ? (
                          <Chip
                            size="small"
                            label={statusLabel}
                            color={
                              status === 'now'
                                ? 'success'
                                : status === 'upcoming'
                                  ? 'info'
                                  : 'default'
                            }
                            variant={status === 'past' ? 'outlined' : 'filled'}
                            sx={{ fontWeight: 700 }}
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>

                      <TableCell align="right" sx={cellSx}>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          justifyContent="flex-end"
                          alignItems="center"
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleOpenSeatEditor(reservation)}
                            disabled={isActing || confirming}
                            sx={isBanner ? { color: accent } : undefined}
                            aria-label={`Choose seat for ${reservation.filmTitle}`}
                            title="Choose seat"
                          >
                            <Iconify icon="solar:bookmark-bold" width={18} />
                          </IconButton>

                          <Button
                            component={RouterLink}
                            href={getCinemaUrl(reservation)}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                            variant="contained"
                            disabled={isActing}
                            startIcon={<Iconify icon="solar:play-bold" width={16} />}
                            sx={{
                              fontWeight: 700,
                              bgcolor: accent,
                              color: '#1A1208',
                              '&:hover': { bgcolor: accent, opacity: 0.92 },
                            }}
                          >
                            Show cinema
                          </Button>

                          <IconButton
                            size="small"
                            color="error"
                            disabled={isActing || confirming}
                            onClick={() => handleCancel(reservation)}
                            sx={isBanner ? { color: '#FF8A80' } : undefined}
                          >
                            {isActing ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                            )}
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <EmptyContent
            filled
            title="No reserved screenings"
            description="Reserve a scheduled film from the list below to watch it in the cinema room."
            sx={{
              py: compact ? 4 : 6,
              ...(isBanner
                ? {
                    bgcolor: 'rgba(0,0,0,0.18)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    '& .MuiTypography-root': { color: 'rgba(245,230,200,0.78)' },
                  }
                : {}),
            }}
          />
        )}
      </Box>

      <CinemaSeatMapDialog
        open={Boolean(editingReservation)}
        session={editingSession}
        selectedSeatIds={selectedSeatIds}
        onToggleSeat={handleToggleSeat}
        onClose={handleCloseSeatEditor}
        onConfirm={handleConfirmSeat}
        confirmLabel="Confirm seat"
        confirmIcon="solar:bookmark-bold"
        confirming={confirming}
        title={
          editingReservation
            ? `Choose seat · ${editingReservation.filmTitle}`
            : 'Choose seat'
        }
      />
    </>
  );
}
