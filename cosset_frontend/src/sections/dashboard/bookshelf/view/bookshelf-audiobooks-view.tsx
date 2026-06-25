'use client';

import type { IBookshelfAudiobook } from 'src/types/bookshelf-audiobook';

import { useMemo, useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useSearchParams } from 'src/routes/hooks';

import {
  useGetBookshelfAudiobooks,
  deleteBookshelfAudiobook,
  setBookshelfAudiobookCategory,
  setBookshelfAudiobookFavorite,
} from 'src/actions/bookshelf-audiobook';
import {
  borrowToAudiobook,
  respondBookshelfBorrow,
  useGetBookshelfBorrows,
} from 'src/actions/bookshelf-borrow';

import { useAuthContext } from 'src/auth/hooks';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { filterAudiobooks } from '../bookshelf-audiobook-utils';
import {
  filterBookshelfByGenre,
  filterBookshelfByShelfTab,
  isBookFavorite,
  normalizeBookCategory,
  type BookshelfShelfTab,
} from '../bookshelf-book-categories';
import { BookshelfShelfFilters } from '../bookshelf-shelf-filters';
import { sortBookshelfItems, type BookshelfSortValue } from '../bookshelf-sort';
import { BookshelfAudiobookCard } from '../bookshelf-audiobook-card';
import { BookshelfAudiobookViewDialog } from '../bookshelf-audiobook-view-dialog';
import { BookshelfAudiobookFormDialog } from '../bookshelf-audiobook-form-dialog';

// ----------------------------------------------------------------------

export function BookshelfAudiobooksView() {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const canManage = !!user?.id;

  const { audiobooks, audiobooksLoading } = useGetBookshelfAudiobooks(user?.id);
  const { borrows: approvedBorrowedAudiobooks } = useGetBookshelfBorrows(
    user?.id,
    'borrower',
    'approved',
  );

  const [returningBorrowId, setReturningBorrowId] = useState<number | null>(null);

  const allAudiobooks = useMemo(() => {
    const ownedIds = new Set(audiobooks.map((item) => item.id));
    const borrowed = approvedBorrowedAudiobooks
      .filter((borrow) => borrow.bookKind === 'audiobook')
      .map(borrowToAudiobook)
      .filter((item) => !ownedIds.has(item.id));

    return [...audiobooks, ...borrowed];
  }, [approvedBorrowedAudiobooks, audiobooks]);

  const [searchQuery, setSearchQuery] = useState('');
  const [shelfTab, setShelfTab] = useState<BookshelfShelfTab>('all');
  const [genreFilter, setGenreFilter] = useState('');
  const [sortBy, setSortBy] = useState<BookshelfSortValue>('latest');
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingAudiobook, setEditingAudiobook] = useState<IBookshelfAudiobook | null>(null);
  const [listeningAudiobook, setListeningAudiobook] = useState<IBookshelfAudiobook | null>(null);
  const [savingCategoryId, setSavingCategoryId] = useState<number | null>(null);
  const [savingFavoriteId, setSavingFavoriteId] = useState<number | null>(null);

  const borrowedCount = useMemo(
    () => allAudiobooks.filter((audiobook) => audiobook.isBorrowed).length,
    [allAudiobooks],
  );

  const favoriteCount = useMemo(
    () =>
      allAudiobooks.filter(
        (audiobook) => !audiobook.isBorrowed && isBookFavorite(audiobook.isFavorite),
      ).length,
    [allAudiobooks],
  );

  const filteredAudiobooks = useMemo(() => {
    const searched = filterAudiobooks(allAudiobooks, searchQuery);
    const byTab = filterBookshelfByShelfTab(searched, shelfTab);
    const byGenre = filterBookshelfByGenre(byTab, genreFilter);
    return sortBookshelfItems(byGenre, sortBy);
  }, [allAudiobooks, genreFilter, searchQuery, shelfTab, sortBy]);

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

  useEffect(() => {
    if (audiobooksLoading || !allAudiobooks.length) {
      return;
    }

    const borrowId = Number(searchParams.get('borrowId'));
    const bookId = Number(searchParams.get('bookId'));

    if (Number.isFinite(borrowId)) {
      const borrowedBook = allAudiobooks.find(
        (audiobook) => audiobook.borrow?.borrowId === borrowId,
      );
      if (borrowedBook) {
        handleOpenListen(borrowedBook);
      }
      return;
    }

    if (Number.isFinite(bookId)) {
      const ownedBook = allAudiobooks.find(
        (audiobook) => audiobook.id === bookId && !audiobook.isBorrowed,
      );
      if (ownedBook) {
        handleOpenListen(ownedBook);
      }
    }
  }, [allAudiobooks, audiobooksLoading, handleOpenListen, searchParams]);

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
      await deleteBookshelfAudiobook(audiobook.id, user?.id);
      toast.success('Audio-book deleted successfully.');
    } catch (error) {
      console.error('Failed to delete audio-book:', error);
      toast.error('Failed to delete audio-book.');
    }
  }, [user?.id]);

  const handleSetCategory = useCallback(
    async (audiobook: IBookshelfAudiobook, category: string) => {
      const nextCategory = normalizeBookCategory(category);
      if ((audiobook.category || null) === nextCategory) {
        return;
      }

      try {
        setSavingCategoryId(audiobook.id);
        await setBookshelfAudiobookCategory(audiobook.id, nextCategory);
        toast.success('Category updated.');
      } catch (error) {
        console.error('Failed to update audio-book category:', error);
        toast.error('Failed to update category.');
      } finally {
        setSavingCategoryId(null);
      }
    },
    [],
  );

  const handleToggleFavorite = useCallback(
    async (audiobook: IBookshelfAudiobook, isFavorite: boolean) => {
      if (isBookFavorite(audiobook.isFavorite) === isFavorite) {
        return;
      }

      try {
        setSavingFavoriteId(audiobook.id);
        await setBookshelfAudiobookFavorite(audiobook.id, isFavorite);
        toast.success(isFavorite ? 'Added to favorites.' : 'Removed from favorites.');
      } catch (error) {
        console.error('Failed to update audio-book favorite:', error);
        toast.error('Failed to update favorite.');
      } finally {
        setSavingFavoriteId(null);
      }
    },
    [],
  );

  const handleReturnBorrow = useCallback(
    async (audiobook: IBookshelfAudiobook) => {
      const borrowId = audiobook.borrow?.borrowId;
      if (!borrowId || !user?.id) {
        return;
      }

      const confirmed = window.confirm(`Return "${audiobook.title}" to its owner?`);
      if (!confirmed) {
        return;
      }

      try {
        setReturningBorrowId(borrowId);
        await respondBookshelfBorrow(borrowId, user.id, 'returned');
        toast.success('Audiobook returned.');
      } catch (error) {
        console.error('Failed to return borrowed audiobook:', error);
        toast.error('Failed to return audiobook.');
      } finally {
        setReturningBorrowId(null);
      }
    },
    [user?.id],
  );

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
              placeholder="Search by title, author, format, or category..."
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

          <BookshelfShelfFilters
            tab={shelfTab}
            genre={genreFilter}
            sortBy={sortBy}
            borrowedCount={borrowedCount}
            favoriteCount={favoriteCount}
            onTabChange={setShelfTab}
            onGenreChange={setGenreFilter}
            onSortChange={setSortBy}
          />
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
            title={
              searchQuery
                ? 'No audio-books match your search'
                : genreFilter
                  ? 'No audio-books in this category'
                  : shelfTab === 'borrowed'
                    ? 'No borrowed audiobooks'
                    : shelfTab === 'favorite'
                      ? 'No favorite audio-books'
                      : 'No audio-books yet'
            }
            description={
              genreFilter
                ? 'Try another category or clear the category filter.'
                : shelfTab === 'borrowed'
                  ? 'Audiobooks you borrow from neighbors will appear here after the owner approves your request.'
                  : shelfTab === 'favorite'
                    ? 'Tap the heart icon on a book to add it to your favorites.'
                    : canManage
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
                key={
                  audiobook.isBorrowed
                    ? `borrow-${audiobook.borrow?.borrowId}`
                    : `owned-${audiobook.id}`
                }
                audiobook={audiobook}
                canManage={canManage}
                onListen={handleOpenListen}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                onCategoryChange={handleSetCategory}
                categorySaving={savingCategoryId === audiobook.id}
                onFavoriteToggle={!audiobook.isBorrowed ? handleToggleFavorite : undefined}
                favoriteSaving={savingFavoriteId === audiobook.id}
                onReturnBorrow={audiobook.isBorrowed ? handleReturnBorrow : undefined}
                returningBorrow={returningBorrowId === audiobook.borrow?.borrowId}
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
