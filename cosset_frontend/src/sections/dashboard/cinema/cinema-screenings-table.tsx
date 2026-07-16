'use client';

import type { ICinemaFilm } from 'src/types/cinema-film';
import type { ICinemaFilmScreeningWithFilm } from 'src/types/cinema-film-screening';

import { useCallback, useState } from 'react';

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

import { useGetCinemaFilms } from 'src/actions/cinema-film';
import { deleteCinemaScreening, useGetCinemaScreenings } from 'src/actions/cinema-film-screening';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';

import { CinemaScreeningFormDialog } from './cinema-screening-form-dialog';
import type { CinemaCategoryMeta } from './cinema-categories';
import {
  getScreeningShowStatus,
  formatScreeningSchedule,
  getCinemaFilmShowStatusLabel,
} from './cinema-film-schedule';

// ----------------------------------------------------------------------

type Props = {
  category: CinemaCategoryMeta;
  customerId: string;
  films?: ICinemaFilm[];
  filmsLoading?: boolean;
  compact?: boolean;
  variant?: 'default' | 'banner';
  canManage?: boolean;
};

export function CinemaScreeningsTable({
  category,
  customerId,
  films: filmsProp,
  filmsLoading: filmsLoadingProp,
  compact = false,
  variant = 'default',
  canManage: canManageProp,
}: Props) {
  const { films: fetchedFilms, filmsLoading: fetchedFilmsLoading } = useGetCinemaFilms(
    customerId,
    category.id,
  );
  const films = filmsProp ?? fetchedFilms;
  const filmsLoading = filmsLoadingProp ?? fetchedFilmsLoading;
  const { screenings, screeningsLoading } = useGetCinemaScreenings(customerId, category.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScreening, setEditingScreening] = useState<ICinemaFilmScreeningWithFilm | null>(null);
  const [defaultFilmId, setDefaultFilmId] = useState<number | null>(null);

  const canManage = canManageProp ?? Boolean(customerId);
  const loading = filmsLoading || screeningsLoading;
  const isBanner = variant === 'banner';

  const headerTitleSx = isBanner
    ? { fontWeight: 700, color: 'common.white' }
    : { fontWeight: 700 };

  const headerDescriptionSx = isBanner
    ? { color: 'rgba(255,255,255,0.72)' }
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

  const headCellSx = isBanner
    ? {
        color: 'rgba(255,248,231,0.92)',
        bgcolor: 'rgba(12, 8, 5, 0.92)',
        borderColor: 'rgba(255,255,255,0.12)',
        fontWeight: 700,
      }
    : undefined;

  const bodyCellSx = isBanner ? { borderColor: 'rgba(255,255,255,0.08)' } : undefined;

  const filmTitleSx = isBanner ? { fontWeight: 600, color: 'common.white' } : { fontWeight: 600 };

  const filmMetaSx = isBanner ? { color: 'rgba(255,255,255,0.62)' } : { color: 'text.secondary' };

  const showTimeSx = isBanner ? { color: 'rgba(255,255,255,0.82)' } : undefined;

  const handleOpenCreate = useCallback((filmId?: number | null) => {
    setEditingScreening(null);
    setDefaultFilmId(filmId ?? null);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((screening: ICinemaFilmScreeningWithFilm) => {
    setEditingScreening(screening);
    setDefaultFilmId(screening.filmId);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingScreening(null);
    setDefaultFilmId(null);
  }, []);

  const handleDelete = useCallback(
    async (screening: ICinemaFilmScreeningWithFilm) => {
      const confirmed = window.confirm(`Delete screening for "${screening.filmTitle}"?`);
      if (!confirmed) {
        return;
      }

      try {
        await deleteCinemaScreening(screening.id, { customerId, category: category.id });
        toast.success('Screening deleted successfully.');
      } catch (error) {
        console.error('Failed to delete screening:', error);
        toast.error('Failed to delete screening.');
      }
    },
    [category.id, customerId],
  );

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant={compact ? 'subtitle1' : 'h6'} sx={headerTitleSx}>
            Screening schedule
          </Typography>
          <Typography variant="body2" sx={headerDescriptionSx}>
            Plan when each film is shown in this cinema room.
          </Typography>
        </Box>

        {canManage ? (
          <Button
            onClick={() => handleOpenCreate()}
            size={compact ? 'small' : 'medium'}
            variant={isBanner ? 'outlined' : 'outlined'}
            disabled={!films.length}
            startIcon={<Iconify icon="mingcute:add-line" />}
            sx={{
              fontWeight: 700,
              ...(isBanner
                ? {
                    color: 'common.white',
                    borderColor: 'rgba(255,255,255,0.32)',
                    '&:hover': {
                      borderColor: 'common.white',
                      bgcolor: 'rgba(255,255,255,0.08)',
                    },
                  }
                : {}),
            }}
          >
            Add screening
          </Button>
        ) : null}
      </Stack>

      {loading ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: compact ? 4 : 6 }}>
          <CircularProgress size={28} sx={isBanner ? { color: category.accent } : undefined} />
        </Stack>
      ) : screenings.length ? (
        <TableContainer sx={{ overflowX: 'auto', ...tableSx }}>
          <Table size={compact ? 'small' : 'medium'}>
            <TableHead>
              <TableRow sx={headRowSx}>
                <TableCell sx={headCellSx}>Film</TableCell>
                <TableCell sx={headCellSx}>Show time</TableCell>
                <TableCell sx={headCellSx}>Status</TableCell>
                {canManage ? (
                  <TableCell align="right" sx={headCellSx}>
                    Actions
                  </TableCell>
                ) : null}
              </TableRow>
            </TableHead>

            <TableBody>
              {screenings.map((screening) => {
                const status = getScreeningShowStatus(screening);
                const statusLabel = getCinemaFilmShowStatusLabel(status);

                return (
                  <TableRow
                    key={screening.id}
                    hover
                    sx={isBanner ? { '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } } : undefined}
                  >
                    <TableCell sx={bodyCellSx}>
                      <Typography variant="subtitle2" sx={filmTitleSx}>
                        {screening.filmTitle}
                      </Typography>
                      {screening.filmDirector || screening.filmYear ? (
                        <Typography variant="caption" sx={filmMetaSx}>
                          {[screening.filmDirector, screening.filmYear].filter(Boolean).join(' · ')}
                        </Typography>
                      ) : null}
                    </TableCell>

                    <TableCell sx={bodyCellSx}>
                      <Typography variant="body2" sx={showTimeSx}>
                        {formatScreeningSchedule(screening) || '—'}
                      </Typography>
                    </TableCell>

                    <TableCell sx={bodyCellSx}>
                      {statusLabel ? (
                        <Chip
                          size="small"
                          label={statusLabel}
                          color={isBanner ? 'default' : status === 'now' ? 'success' : status === 'upcoming' ? 'info' : 'default'}
                          variant={status === 'past' ? 'outlined' : 'filled'}
                          sx={{
                            fontWeight: 700,
                            ...(isBanner
                              ? {
                                  color: 'common.white',
                                  bgcolor:
                                    status === 'now'
                                      ? 'rgba(76, 175, 80, 0.24)'
                                      : status === 'upcoming'
                                        ? 'rgba(33, 150, 243, 0.24)'
                                        : 'rgba(255,255,255,0.08)',
                                  borderColor: 'rgba(255,255,255,0.2)',
                                }
                              : {}),
                          }}
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>

                    {canManage ? (
                      <TableCell align="right" sx={bodyCellSx}>
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(screening)}
                            sx={isBanner ? { color: 'common.white' } : undefined}
                          >
                            <Iconify icon="solar:pen-bold" width={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(screening)}
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyContent
          filled
          title="No screenings scheduled"
          description={
            films.length
              ? 'Add a screening time for one of your films.'
              : 'Add a film first, then schedule when it will be shown.'
          }
          sx={{
            py: compact ? 4 : 6,
            ...(isBanner
              ? {
                  color: 'common.white',
                  '& .MuiTypography-root': { color: 'inherit' },
                  bgcolor: 'rgba(0,0,0,0.18)',
                  borderRadius: 2,
                  border: '1px dashed rgba(255,255,255,0.18)',
                }
              : {}),
          }}
        />
      )}

      {canManage ? (
        <CinemaScreeningFormDialog
          open={dialogOpen}
          category={category.id}
          customerId={customerId}
          films={films}
          screening={editingScreening}
          defaultFilmId={defaultFilmId}
          onClose={handleCloseDialog}
        />
      ) : null}
    </>
  );
}
