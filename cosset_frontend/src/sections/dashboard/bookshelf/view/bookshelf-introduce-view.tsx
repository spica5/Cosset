'use client';

import type { IBookshelfIntroduceBook } from 'src/types/bookshelf-introduce-book';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import {
  useGetBookshelfIntroduceBooks,
  deleteBookshelfIntroduceBook,
} from 'src/actions/bookshelf-introduce-book';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin } from 'src/auth/utils/role';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { FREE_EBOOK_SOURCES } from '../bookshelf-free-ebook-sources';
import { BookshelfIntroduceBookCard } from '../bookshelf-introduce-book-card';
import { BookshelfIntroduceBookFormDialog } from '../bookshelf-introduce-book-form-dialog';

// ----------------------------------------------------------------------

export function BookshelfIntroduceView() {
  const { user } = useAuthContext();
  const canManage = isUserAdmin(user?.role);

  const { books, booksLoading } = useGetBookshelfIntroduceBooks();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<IBookshelfIntroduceBook | null>(null);

  const handleOpenCreate = useCallback(() => {
    setEditingBook(null);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((book: IBookshelfIntroduceBook) => {
    setEditingBook(book);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingBook(null);
  }, []);

  const handleDelete = useCallback(async (book: IBookshelfIntroduceBook) => {
    const confirmed = window.confirm(`Delete "${book.title}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteBookshelfIntroduceBook(book.id);
      toast.success('Book deleted successfully.');
    } catch (error) {
      console.error('Failed to delete book:', error);
      toast.error('Failed to delete book.');
    }
  }, []);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Introduce"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Bookshelf', href: paths.dashboard.bookshelf.root },
          { name: 'Introduce' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <Card sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1.5,
                  bgcolor: 'primary.lighter',
                  color: 'primary.main',
                }}
              >
                <Iconify icon="solar:book-2-bold" width={28} />
              </Box>

              <Box>
                <Typography variant="h4">Welcome to Bookshelf</Typography>
                <Typography variant="body2" color="text.secondary">
                  A place to discover books, learn where to find free reading, and explore more in Cosset.
                </Typography>
              </Box>
            </Stack>

            <Typography variant="body1" color="text.secondary">
              Bookshelf helps you find great reading without assuming you already know where to look.
              Many classic and public-domain titles are available online for free, and this page is here
              to introduce those options and point you to trusted sources.
            </Typography>

            <Typography variant="body1" color="text.secondary">
              Whether you prefer reading on screen, downloading an e-book, or listening to an audiobook,
              you can start here and then continue to the E-books and Audio-books sections inside Cosset.
            </Typography>
          </Stack>
        </Card>

        <Card sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ sm: 'center' }}
              justifyContent="space-between"
              spacing={1.5}
            >
              <Box>
                <Typography variant="h5" sx={{ mb: 1 }}>
                  Featured books
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Browse recommended books with cover images and direct links to read them online.
                </Typography>
              </Box>

              {canManage ? (
                <Button
                  variant="contained"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={handleOpenCreate}
                  sx={{ flexShrink: 0 }}
                >
                  Add book
                </Button>
              ) : null}
            </Stack>

            {booksLoading ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                <Iconify icon="solar:refresh-outline" width={16} />
                <Typography variant="body2" color="text.secondary">
                  Loading books...
                </Typography>
              </Stack>
            ) : books.length === 0 ? (
              <EmptyContent
                title="No featured books yet"
                description={
                  canManage
                    ? 'Add a book with a cover image and file URL to help users discover free reading.'
                    : 'Check back soon for featured book recommendations.'
                }
                filled
                sx={{ py: 8 }}
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
                {books.map((book) => (
                  <BookshelfIntroduceBookCard
                    key={book.id}
                    book={book}
                    canManage={canManage}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </Box>
            )}
          </Stack>
        </Card>

        <Card sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h5" sx={{ mb: 1 }}>
                Why start with free e-books?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Not everyone knows that thousands of books are legally available at no cost. Public-domain
                works and community-run libraries make it easy to explore literature, history, science, and
                more without buying a copy first.
              </Typography>
            </Box>

            <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" />}>
              These external sites are independent resources. Cosset links to them to help you discover free
              reading, but each site has its own catalog and terms of use.
            </Alert>
          </Stack>
        </Card>

        <Card sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h5" sx={{ mb: 1 }}>
                Trusted free e-book sources
              </Typography>
              <Typography variant="body2" color="text.secondary">
                These are well-known places to find free books online. Open any source below to start browsing.
              </Typography>
            </Box>

            <Stack spacing={2} divider={<Divider flexItem />}>
              {FREE_EBOOK_SOURCES.map((source) => (
                <Stack
                  key={source.name}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1">{source.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {source.description}
                    </Typography>
                  </Box>

                  <Button
                    component={Link}
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    endIcon={<Iconify icon="eva:external-link-fill" />}
                    sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'center' } }}
                  >
                    Visit site
                  </Button>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Card>

        <Card sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5" sx={{ mb: 1 }}>
                Continue in Cosset
              </Typography>
              <Typography variant="body2" color="text.secondary">
                When you are ready, explore the Bookshelf sections inside your dashboard.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                component={RouterLink}
                href={paths.dashboard.bookshelf.ebooks}
                variant="contained"
                startIcon={<Iconify icon="solar:book-bookmark-bold" />}
              >
                Browse E-books
              </Button>

              <Button
                component={RouterLink}
                href={paths.dashboard.bookshelf.audioBooks}
                variant="outlined"
                startIcon={<Iconify icon="solar:headphones-round-bold" />}
              >
                Browse Audio-books
              </Button>
            </Stack>
          </Stack>
        </Card>
      </Stack>

      <BookshelfIntroduceBookFormDialog
        open={dialogOpen}
        book={editingBook}
        onClose={handleCloseDialog}
      />
    </DashboardContent>
  );
}
