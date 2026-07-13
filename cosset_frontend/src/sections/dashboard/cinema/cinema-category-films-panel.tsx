'use client';

import type { ICinemaFilm } from 'src/types/cinema-film';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useAuthContext } from 'src/auth/hooks';

import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';

import { deleteCinemaFilm, useGetCinemaFilms } from 'src/actions/cinema-film';

import { toast } from 'src/components/dashboard/snackbar';

import type { CinemaCategoryMeta } from './cinema-categories';

import { CinemaFilmCard } from './cinema-film-card';
import { CinemaFilmFormDialog } from './cinema-film-form-dialog';
import { CinemaScreeningsTable } from './cinema-screenings-table';

// ----------------------------------------------------------------------

type Props = {
  category: CinemaCategoryMeta;
  compact?: boolean;
  showScreenings?: boolean;
};

export function CinemaCategoryFilmsPanel({
  category,
  compact = false,
  showScreenings = true,
}: Props) {
  const { user } = useAuthContext();
  const customerId = String(user?.id || '');
  const canManage = Boolean(customerId);

  const { films, filmsLoading } = useGetCinemaFilms(customerId, category.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFilm, setEditingFilm] = useState<ICinemaFilm | null>(null);

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
          Screening playlist
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

      {filmsLoading ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: compact ? 4 : 6 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : films.length ? (
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
          {films.map((film) => (
            <CinemaFilmCard
              key={film.id}
              film={film}
              canManage={canManage}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          ))}
        </Box>
      ) : (
        <EmptyContent
          filled
          title="No films added yet"
          description="Add films to this screening room and preview them in your universe cinema."
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
    </>
  );
}
