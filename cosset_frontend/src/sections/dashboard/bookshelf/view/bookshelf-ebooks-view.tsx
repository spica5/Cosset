'use client';

import type { IBookshelfEbook } from 'src/types/bookshelf-ebook';

import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';

import { useGetBookshelfEbooks, deleteBookshelfEbook } from 'src/actions/bookshelf-ebook';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin } from 'src/auth/utils/role';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { filterEbooks } from '../bookshelf-ebook-utils';
import { BookshelfEbookCard } from '../bookshelf-ebook-card';
import { BookshelfEbookViewDialog } from '../bookshelf-ebook-view-dialog';
import { BookshelfEbookFormDialog } from '../bookshelf-ebook-form-dialog';

// ----------------------------------------------------------------------

export function BookshelfEbooksView() {
  const { user } = useAuthContext();
  const canManage = isUserAdmin(user?.role);

  const { ebooks, ebooksLoading } = useGetBookshelfEbooks(user?.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingEbook, setEditingEbook] = useState<IBookshelfEbook | null>(null);
  const [viewingEbook, setViewingEbook] = useState<IBookshelfEbook | null>(null);

  const filteredEbooks = useMemo(() => filterEbooks(ebooks, searchQuery), [ebooks, searchQuery]);

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
  }, []);

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
              placeholder="Search by title, author, or type..."
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
            title={searchQuery ? 'No e-books match your search' : 'No e-books yet'}
            description={
              canManage
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
            {filteredEbooks.map((ebook) => (
              <BookshelfEbookCard
                key={ebook.id}
                ebook={ebook}
                canManage={canManage}
                onView={handleOpenView}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
              />
            ))}
          </Box>
        )}
      </Stack>

      <BookshelfEbookFormDialog open={formOpen} ebook={editingEbook} onClose={handleCloseForm} />

      <BookshelfEbookViewDialog open={viewOpen} ebook={viewingEbook} onClose={handleCloseView} />
    </DashboardContent>
  );
}
