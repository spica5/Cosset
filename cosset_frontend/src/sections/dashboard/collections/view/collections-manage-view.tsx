'use client';

import type { ICollectionItem } from 'src/types/collection';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useSearchParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useSetState } from 'src/hooks/use-set-state';

import { useAuthContext } from 'src/auth/hooks';

import {
  useGetCollections,
  createCollection,
  updateCollection,
  deleteCollection,
} from 'src/actions/collection';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { toast } from 'src/components/dashboard/snackbar';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { orderBy } from 'src/utils/helper';

type CollectionFormState = {
  customerId: string;
  name: string;
  description: string;
  category: string;
  reference: string;
  order: string;
};

const emptyForm: CollectionFormState = {
  customerId: '',
  name: '',
  description: '',
  category: '',
  reference: '',
  order: '',
};

const COLLECTION_SORT_OPTIONS = [
  { label: 'Order', value: 'order' },
  { label: 'Latest', value: 'latest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Name (A-Z)', value: 'name' },
];

const parseNullableInteger = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const formatDate = (value: unknown) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString();
};

export function CollectionsManageView() {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const selectedCollectionId = searchParams.get('collectionId');
  const [sortBy, setSortBy] = useState('order');
  const [form, setForm] = useState<CollectionFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { collections, collectionsLoading } = useGetCollections(user?.id);

  const search = useSetState<{
    query: string;
    results: ICollectionItem[];
  }>({ query: '', results: [] });

  const hasSearchQuery = Boolean(search.state.query.trim());

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      customerId: prev.customerId || (user?.id ? String(user.id) : ''),
    }));
  }, [user?.id]);

  const dataFiltered = useMemo(
    () =>
      applyFilter({
        inputData: hasSearchQuery ? search.state.results : collections,
        sortBy,
      }),
    [collections, hasSearchQuery, search.state.results, sortBy],
  );

  
  const handleFieldChange = useCallback(
    (field: keyof CollectionFormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { value } = event.target;
        setForm((prev) => ({ ...prev, [field]: value }));
      },
    [],
  );

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      customerId: user?.id ? String(user.id) : '',
    });
  }, [user?.id]);

  const handleEdit = useCallback((item: ICollectionItem) => {
    setEditingId(item.id);
    setForm({
      customerId: item.customerId ? String(item.customerId) : '',
      name: item.name || '',
      description: item.description || '',
      category: item.category != null ? String(item.category) : '',
      reference: item.reference || '',
      order: item.order != null ? String(item.order) : '',
    });
  }, []);

  useEffect(() => {
    if (!selectedCollectionId) {
      return;
    }

    const parsedId = Number.parseInt(selectedCollectionId, 10);
    if (Number.isNaN(parsedId)) {
      return;
    }

    const target = collections.find((item) => item.id === parsedId);
    if (!target || editingId === target.id) {
      return;
    }

    handleEdit(target);
  }, [collections, editingId, handleEdit, selectedCollectionId]);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }

    const payload = {
      customerId: form.customerId.trim() || null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: parseNullableInteger(form.category),
      reference: form.reference.trim() || null,
      order: parseNullableInteger(form.order),
    };

    try {
      setSubmitting(true);

      if (editingId) {
        await updateCollection(editingId, payload);
        toast.success('Collection updated successfully.');
      } else {
        await createCollection(payload);
        toast.success('Collection created successfully.');
      }

      resetForm();
    } catch (error) {
      console.error('Failed to save collection:', error);
      toast.error('Failed to save collection.');
    } finally {
      setSubmitting(false);
    }
  }, [editingId, form, resetForm]);

  const handleDelete = useCallback(
    async (item: ICollectionItem) => {
      const confirmed = window.confirm(`Delete collection "${item.name}"?`);
      if (!confirmed) {
        return;
      }

      try {
        await deleteCollection(item.id, item.customerId || user?.id);
        toast.success('Collection deleted successfully.');

        if (editingId === item.id) {
          resetForm();
        }
      } catch (error) {
        console.error('Failed to delete collection:', error);
        toast.error('Failed to delete collection.');
      }
    },
    [editingId, resetForm, user?.id],
  );

  const emptyListTitle = collections.length === 0
    ? 'No collections yet'
    : hasSearchQuery
      ? `No results for "${search.state.query.trim()}"`
      : 'No collections yet';

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Manage Collections"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Collections', href: paths.dashboard.collections.root },
          { name: 'Manage' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <Card sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">{editingId ? 'Edit Collection' : 'Create Collection'}</Typography>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              }}
            >
              <TextField
                label="Name"
                value={form.name}
                onChange={handleFieldChange('name')}
                required
                fullWidth
              />

              <TextField
                label="Category"
                value={form.category}
                onChange={handleFieldChange('category')}
                type="number"
                fullWidth
              />
              
            </Box>

            <TextField
              label="Description"
              value={form.description}
              onChange={handleFieldChange('description')}
              multiline
              minRows={2}
              fullWidth
            />

            <TextField
                label="Order"
                value={form.order}
                onChange={handleFieldChange('order')}
                type="number"
                fullWidth
              />

            {/* <TextField
              label="Reference"
              value={form.reference}
              onChange={handleFieldChange('reference')}
              multiline
              minRows={2}
              fullWidth
            /> */}

            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
                {editingId ? 'Update' : 'Create'}
              </Button>
              <Button variant="outlined" onClick={resetForm} disabled={submitting}>
                Clear
              </Button>
            </Stack>
          </Stack>
        </Card>

        <Stack
          spacing={3}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-end', sm: 'center' }}
          direction={{ xs: 'column', sm: 'row' }}
        />

        <Card sx={{ p: 0 }}>
          {collectionsLoading ? (
            <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : dataFiltered.length === 0 ? (
            <EmptyContent title={emptyListTitle} filled sx={{ py: 8 }} />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Order</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell>Updated At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dataFiltered.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant="subtitle2">{item.name}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {item.customerId || '-'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{item.category ?? '-'}</TableCell>
                      <TableCell>{item.order ?? '-'}</TableCell>
                      <TableCell sx={{ maxWidth: 260, wordBreak: 'break-word' }}>
                        {item.reference || '-'}
                      </TableCell>
                      <TableCell>{formatDate(item.updatedAt || item.createdAt)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="text"
                            component={RouterLink}
                            href={paths.dashboard.collections.items(item.id)}
                          >
                            Items
                          </Button>
                          <Button size="small" variant="text" onClick={() => handleEdit(item)}>
                            Edit
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            color="error"
                            onClick={() => handleDelete(item)}
                          >
                            Delete
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>

        <Alert severity="info">
          <strong>Collection items will be added to the Collections menu on the left bar by order number</strong>.
        </Alert>
      </Stack>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  sortBy: string;
  inputData: ICollectionItem[];
};

const applyFilter = ({ inputData, sortBy }: ApplyFilterProps) => {
  if (sortBy === 'latest') {
    return orderBy(inputData, ['createdAt'], ['desc']);
  }

  if (sortBy === 'oldest') {
    return orderBy(inputData, ['createdAt'], ['asc']);
  }

  if (sortBy === 'name') {
    return orderBy(inputData, ['name'], ['asc']);
  }

  return [...inputData].sort((a, b) => {
    const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return (a.name || '').localeCompare(b.name || '');
  });
};
