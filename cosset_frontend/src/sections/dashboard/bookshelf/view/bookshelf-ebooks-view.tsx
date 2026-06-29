'use client';

import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';

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

import { useGetBookshelfEbooks, deleteBookshelfEbook, setBookshelfEbookCategory, setBookshelfEbookFavorite } from 'src/actions/bookshelf-ebook';
import {
  borrowToEbook,
  respondBookshelfBorrow,
  useGetBookshelfBorrows,
} from 'src/actions/bookshelf-borrow';

import { useAuthContext } from 'src/auth/hooks';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';
import { useGetBookshelfEbookReadingCounts, normalizeReadingCountBookId } from 'src/actions/bookshelf-ebook-reading';

import {
  filterBookshelfByGenre,
  filterBookshelfByShelfTab,
  isBookFavorite,
  normalizeBookCategory,
  type BookshelfShelfTab,
} from '../bookshelf-book-categories';
import { filterEbooks } from '../bookshelf-ebook-utils';
import { BookshelfEbookCard } from '../bookshelf-ebook-card';
import { BookshelfShelfFilters } from '../bookshelf-shelf-filters';
import { BookshelfEbookViewDialog } from '../bookshelf-ebook-view-dialog';
import { BookshelfEbookFormDialog } from '../bookshelf-ebook-form-dialog';
import { sortBookshelfItems, type BookshelfSortValue } from '../bookshelf-sort';


// ----------------------------------------------------------------------

export function BookshelfEbooksView() {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const canManage = !!user?.id;

  const { ebooks, ebooksLoading } = useGetBookshelfEbooks(user?.id);
  const { borrows: approvedBorrowedEbooks } = useGetBookshelfBorrows(user?.id, 'borrower', 'approved');

  const [returningBorrowId, setReturningBorrowId] = useState<number | null>(null);

  const allEbooks = useMemo(() => {
    const ownedIds = new Set(ebooks.map((item) => item.id));
    const borrowed = approvedBorrowedEbooks
      .filter((borrow) => borrow.bookKind === 'ebook')
      .map(borrowToEbook)
      .filter((item) => !ownedIds.has(item.id));

    return [...ebooks, ...borrowed];
  }, [approvedBorrowedEbooks, ebooks]);

  const [searchQuery, setSearchQuery] = useState('');
  const [shelfTab, setShelfTab] = useState<BookshelfShelfTab>('all');
  const [genreFilter, setGenreFilter] = useState('');
  const [sortBy, setSortBy] = useState<BookshelfSortValue>('latest');
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingEbook, setEditingEbook] = useState<IBookshelfEbook | null>(null);
  const [viewingEbook, setViewingEbook] = useState<IBookshelfEbook | null>(null);
  const [savingCategoryId, setSavingCategoryId] = useState<number | null>(null);
  const [savingFavoriteId, setSavingFavoriteId] = useState<number | null>(null);

  const borrowedCount = useMemo(
    () => allEbooks.filter((ebook) => ebook.isBorrowed).length,
    [allEbooks],
  );

  const favoriteCount = useMemo(
    () => allEbooks.filter((ebook) => !ebook.isBorrowed && isBookFavorite(ebook.isFavorite)).length,
    [allEbooks],
  );

  const filteredEbooks = useMemo(() => {
    const searched = filterEbooks(allEbooks, searchQuery);
    const byTab = filterBookshelfByShelfTab(searched, shelfTab);
    const byGenre = filterBookshelfByGenre(byTab, genreFilter);
    return sortBookshelfItems(byGenre, sortBy);
  }, [allEbooks, genreFilter, searchQuery, shelfTab, sortBy]);

  const ebookIds = useMemo(() => filteredEbooks.map((ebook) => ebook.id), [filteredEbooks]);
  const { countsByBookId } = useGetBookshelfEbookReadingCounts(ebookIds, user?.id);

  const handleOpenCreate = useCallback(() => {
    setEditingEbook(null);
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((ebook: IBookshelfEbook) => {
    setEditingEbook(ebook);
    setFormOpen(true);
  }, []);

  const handleOpenView = useCallback((ebook: IBookshelfEbook) => {
    setViewingEbook(ebook);
    setViewOpen(true);
  }, []);

  useEffect(() => {
    if (ebooksLoading || !allEbooks.length) {
      return;
    }

    const borrowId = Number(searchParams.get('borrowId'));
    const bookId = Number(searchParams.get('bookId'));

    if (Number.isFinite(borrowId)) {
      const borrowedBook = allEbooks.find((ebook) => ebook.borrow?.borrowId === borrowId);
      if (borrowedBook) {
        handleOpenView(borrowedBook);
      }
      return;
    }

    if (Number.isFinite(bookId)) {
      const ownedBook = allEbooks.find((ebook) => ebook.id === bookId && !ebook.isBorrowed);
      if (ownedBook) {
        handleOpenView(ownedBook);
      }
    }
  }, [allEbooks, ebooksLoading, handleOpenView, searchParams]);

  const handleCloseForm = useCallback(() => {
    setFormOpen(false);
    setEditingEbook(null);
  }, []);

  const handleCloseView = useCallback(() => {
    setViewOpen(false);
    setViewingEbook(null);
  }, []);

  const handleDelete = useCallback(async (ebook: IBookshelfEbook) => {
    const confirmed = window.confirm(`Delete "${ebook.title}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteBookshelfEbook(ebook.id, user?.id);
      toast.success('E-book deleted successfully.');
    } catch (error) {
      console.error('Failed to delete e-book:', error);
      toast.error('Failed to delete e-book.');
    }
  }, [user?.id]);

  const handleSetCategory = useCallback(
    async (ebook: IBookshelfEbook, category: string) => {
      const nextCategory = normalizeBookCategory(category);
      if ((ebook.category || null) === nextCategory) {
        return;
      }

      try {
        setSavingCategoryId(ebook.id);
        await setBookshelfEbookCategory(ebook.id, nextCategory);
        toast.success('Category updated.');
      } catch (error) {
        console.error('Failed to update e-book category:', error);
        toast.error('Failed to update category.');
      } finally {
        setSavingCategoryId(null);
      }
    },
    [],
  );

  const handleToggleFavorite = useCallback(
    async (ebook: IBookshelfEbook, isFavorite: boolean) => {
      if (isBookFavorite(ebook.isFavorite) === isFavorite) {
        return;
      }

      try {
        setSavingFavoriteId(ebook.id);
        await setBookshelfEbookFavorite(ebook.id, isFavorite);
        toast.success(isFavorite ? 'Added to favorites.' : 'Removed from favorites.');
      } catch (error) {
        console.error('Failed to update e-book favorite:', error);
        toast.error('Failed to update favorite.');
      } finally {
        setSavingFavoriteId(null);
      }
    },
    [],
  );

  const handleReturnBorrow = useCallback(
    async (ebook: IBookshelfEbook) => {
      const borrowId = ebook.borrow?.borrowId;
      if (!borrowId || !user?.id) {
        return;
      }

      const confirmed = window.confirm(`Return "${ebook.title}" to its owner?`);
      if (!confirmed) {
        return;
      }

      try {
        setReturningBorrowId(borrowId);
        await respondBookshelfBorrow(borrowId, user.id, 'returned');
        toast.success('Book returned.');
      } catch (error) {
        console.error('Failed to return borrowed e-book:', error);
        toast.error('Failed to return book.');
      } finally {
        setReturningBorrowId(null);
      }
    },
    [user?.id],
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="E-books"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Bookshelf', href: paths.dashboard.bookshelf.root },
          { name: 'E-books' },
        ]}
        action={
          canManage ? (
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={handleOpenCreate}
            >
              Add e-book
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
                Your E-book Library
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Read PDF and TXT books stored in your bookshelf.
              </Typography>
            </Box>

            <TextField
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title, author, type, or category..."
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

        {ebooksLoading ? (
          <Card sx={{ p: 6 }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <Iconify icon="solar:refresh-outline" width={18} />
              <Typography variant="body2" color="text.secondary">
                Loading e-books...
              </Typography>
            </Stack>
          </Card>
        ) : filteredEbooks.length === 0 ? (
          <EmptyContent
            title={
              searchQuery
                ? 'No e-books match your search'
                : genreFilter
                  ? 'No e-books in this category'
                  : shelfTab === 'borrowed'
                    ? 'No borrowed e-books'
                    : shelfTab === 'favorite'
                      ? 'No favorite e-books'
                      : 'No e-books yet'
            }
            description={
              genreFilter
                ? 'Try another category or clear the category filter.'
                : shelfTab === 'borrowed'
                  ? 'Books you borrow from neighbors will appear here after the owner approves your request.'
                  : shelfTab === 'favorite'
                    ? 'Tap the heart icon on a book to add it to your favorites.'
                    : canManage
                  ? 'Upload a PDF or TXT file to add your first e-book.'
                  : 'Check back soon for e-books in your bookshelf.'
            }
            filled
            sx={{ py: 10 }}
            action={
              canManage && !searchQuery ? (
                <Button variant="contained" onClick={handleOpenCreate} sx={{ mt: 2 }}>
                  Add e-book
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
            {filteredEbooks.map((ebook) => {
              const bookId = normalizeReadingCountBookId(ebook.id);
              const readingCounts = bookId !== null ? countsByBookId.get(bookId) : undefined;

              return (
              <BookshelfEbookCard
                key={ebook.isBorrowed ? `borrow-${ebook.borrow?.borrowId}` : `owned-${ebook.id}`}
                ebook={ebook}
                canManage={canManage}
                onView={handleOpenView}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                onCategoryChange={handleSetCategory}
                categorySaving={savingCategoryId === ebook.id}
                onFavoriteToggle={!ebook.isBorrowed ? handleToggleFavorite : undefined}
                favoriteSaving={savingFavoriteId === ebook.id}
                onReturnBorrow={ebook.isBorrowed ? handleReturnBorrow : undefined}
                returningBorrow={returningBorrowId === ebook.borrow?.borrowId}
                bookmarkCount={readingCounts?.bookmarkCount ?? 0}
                commentCount={readingCounts?.commentCount ?? 0}
              />
            );
            })}
          </Box>
        )}
      </Stack>

      <BookshelfEbookFormDialog open={formOpen} ebook={editingEbook} onClose={handleCloseForm} />

      <BookshelfEbookViewDialog
        open={viewOpen}
        ebook={viewingEbook}
        customerId={user?.id}
        onClose={handleCloseView}
      />
    </DashboardContent>
  );
}
