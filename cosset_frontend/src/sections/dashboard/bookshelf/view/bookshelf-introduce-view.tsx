'use client';

import type { IBookshelfIntroduce } from 'src/types/bookshelf-introduce';

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
  useGetBookshelfIntroduce,
  deleteBookshelfIntroduce,
} from 'src/actions/bookshelf-introduce';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin } from 'src/auth/utils/role';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { FREE_EBOOK_SOURCES } from '../bookshelf-free-ebook-sources';
import { BookshelfIntroduceFeatured } from '../bookshelf-introduce-featured';
import { BookshelfIntroduceFormDialog } from '../bookshelf-introduce-form-dialog';

// ----------------------------------------------------------------------

export function BookshelfIntroduceView() {
  const { user } = useAuthContext();
  const canManage = isUserAdmin(user?.role);

  const { books, booksLoading } = useGetBookshelfIntroduce();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<IBookshelfIntroduce | null>(null);

  const handleOpenCreate = useCallback(() => {
    setEditingBook(null);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((book: IBookshelfIntroduce) => {
    setEditingBook(book);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingBook(null);
  }, []);

  const handleDelete = useCallback(async (book: IBookshelfIntroduce) => {
    const confirmed = window.confirm(`Delete "${book.title}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteBookshelfIntroduce(book.id);
      toast.success('Book deleted successfully.');
    } catch (error) {
      console.error('Failed to delete book:', error);
      toast.error('Failed to delete book.');
    }
  }, []);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Introduction"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Bookshelf', href: paths.dashboard.bookshelf.root },
          { name: 'Introduction' },
        ]}
        sx={{ mb: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}
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

        <BookshelfIntroduceFeatured
          books={books}
          booksLoading={booksLoading}
          canManage={canManage}
          onAdd={handleOpenCreate}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
        />

        <Card sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack spacing={2.5}>
            <BoxSection
              title="Why start with free e-books?"
              description="Not everyone knows that thousands of books are legally available at no cost. Public-domain works and community-run libraries make it easy to explore literature, history, science, and more without buying a copy first."
            />

            <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" />}>
              These external sites are independent resources. Cosset links to them to help you discover
              free reading, but each site has its own catalog and terms of use.
            </Alert>
          </Stack>
        </Card>

        <Card sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack spacing={2.5}>
            <BoxSection
              title="Trusted free e-book sources"
              description="These are well-known places to find free books online. Open any source below to start browsing."
            />

            <Stack spacing={2} divider={<Divider flexItem />}>
              {FREE_EBOOK_SOURCES.map((source) => (
                <Stack
                  key={source.name}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ sm: 'center' }}
                  justifyContent="space-between"
                >
                  <BoxSection title={source.name} description={source.description} compact />

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
            <BoxSection
              title="Continue in Cosset"
              description="When you are ready, explore the Bookshelf sections inside your dashboard."
            />

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

      <BookshelfIntroduceFormDialog
        open={dialogOpen}
        book={editingBook}
        onClose={handleCloseDialog}
      />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

type BoxSectionProps = {
  title: string;
  description: string;
  compact?: boolean;
};

function BoxSection({ title, description, compact }: BoxSectionProps) {
  return (
    <Stack spacing={compact ? 0.5 : 1}>
      <Typography variant={compact ? 'subtitle1' : 'h5'}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Stack>
  );
}
