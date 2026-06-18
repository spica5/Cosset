'use client';

import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';

import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';

import {
  useGetBookshelfAudiobooks,
  deleteBookshelfAudiobook,
} from 'src/actions/bookshelf-audiobook';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin } from 'src/auth/utils/role';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { filterAudiobooks } from '../bookshelf-audiobook-utils';
import { BookshelfAudiobookCard } from '../bookshelf-audiobook-card';
import { BookshelfAudiobookViewDialog } from '../bookshelf-audiobook-view-dialog';
import { BookshelfAudiobookFormDialog } from '../bookshelf-audiobook-form-dialog';

// ----------------------------------------------------------------------

export function BookshelfAudiobooksView() {
  const { user } = useAuthContext();
  const canManage = isUserAdmin(user?.role);

  const { audiobooks, audiobooksLoading } = useGetBookshelfAudiobooks();

  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingAudiobook, setEditingAudiobook] = useState<IBookshelfAudiobook | null>(null);
  const [listeningAudiobook, setListeningAudiobook] = useState<IBookshelfAudiobook | null>(null);

  const filteredAudiobooks = useMemo(
    () => filterAudiobooks(audiobooks, searchQuery),
    [audiobooks, searchQuery],
  );

  const handleOpenCreate = useCallback(() => {
    setEditingAudiobook(null);
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((audiobook: IBookshelfAudiobook) => {
    setEditingAudiobook(audiobook);
    setFormOpen(true);
  }, []);

  const handleOpenListen = useCallback((audiobook: IBookshelfAudiobook) => {
    setListeningAudiobook(audiobook);
    setViewOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setFormOpen(false);
    setEditingAudiobook(null);
  }, []);

  const handleCloseView = useCallback(() => {
    setViewOpen(false);
    setListeningAudiobook(null);
  }, []);

  const handleDelete = useCallback(async (audiobook: IBookshelfAudiobook) => {
    const confirmed = window.confirm(`Delete "${audiobook.title}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteBookshelfAudiobook(audiobook.id);
      toast.success('Audio-book deleted successfully.');
    } catch (error) {
      console.error('Failed to delete audio-book:', error);
      toast.error('Failed to delete audio-book.');
    }
  }, []);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Audio-books"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Bookshelf', href: paths.dashboard.bookshelf.root },
          { name: 'Audio-books' },
        ]}
        action={
          canManage ? (
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={handleOpenCreate}
            >
              Add audio-book
            </Button>
          ) : undefined
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h5" sx={{ mb: 0.5 }}>
                Your Audio-book Library
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Listen to MP3, M4A, WAV, and other audio files in your bookshelf.
              </Typography>
            </Box>

            <TextField
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title, author, or format..."
              size="small"
              sx={{ minWidth: { sm: 280 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" width={20} />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </Card>

        {audiobooksLoading ? (
          <Card sx={{ p: 6 }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <Iconify icon="solar:refresh-outline" width={18} />
              <Typography variant="body2" color="text.secondary">
                Loading audio-books...
              </Typography>
            </Stack>
          </Card>
        ) : filteredAudiobooks.length === 0 ? (
          <EmptyContent
            title={searchQuery ? 'No audio-books match your search' : 'No audio-books yet'}
            description={
              canManage
                ? 'Upload an audio file to add your first audio-book.'
                : 'Check back soon for audio-books in your bookshelf.'
            }
            filled
            sx={{ py: 10 }}
            action={
              canManage && !searchQuery ? (
                <Button variant="contained" onClick={handleOpenCreate} sx={{ mt: 2 }}>
                  Add audio-book
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            {filteredAudiobooks.map((audiobook) => (
              <BookshelfAudiobookCard
                key={audiobook.id}
                audiobook={audiobook}
                canManage={canManage}
                onListen={handleOpenListen}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
              />
            ))}
          </Box>
        )}
      </Stack>

      <BookshelfAudiobookFormDialog
        open={formOpen}
        audiobook={editingAudiobook}
        onClose={handleCloseForm}
      />

      <BookshelfAudiobookViewDialog
        open={viewOpen}
        audiobook={listeningAudiobook}
        onClose={handleCloseView}
      />
    </DashboardContent>
  );
}
