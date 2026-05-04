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
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import useTheme from '@mui/material/styles/useTheme';
import useMediaQuery from '@mui/material/useMediaQuery';
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
import { Iconify } from 'src/components/dashboard/iconify';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const searchParams = useSearchParams();
  const selectedCollectionId = searchParams.get('collectionId');
  const [sortBy, setSortBy] = useState('order');
  const [form, setForm] = useState<CollectionFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [movingCollectionId, setMovingCollectionId] = useState<number | null>(null);

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

  const reorderEntries = useMemo(() => {
    const orderedCollections = applyFilter({ inputData: collections, sortBy: 'order' });

    let cursor = 0;

    return orderedCollections.map((item) => {
      const rawOrder =
        typeof item.order === 'number' && Number.isFinite(item.order)
          ? Math.trunc(item.order)
          : null;

      const resolvedOrder = rawOrder !== null && rawOrder > cursor ? rawOrder : cursor + 1;
      cursor = resolvedOrder;

      return {
        item,
        resolvedOrder,
      };
    });
  }, [collections]);

  const reorderIndexById = useMemo(() => {
    const indexMap = new Map<string, number>();

    reorderEntries.forEach((entry, index) => {
      indexMap.set(String(entry.item.id), index);
    });

    return indexMap;
  }, [reorderEntries]);

  
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

  const handleMoveOrder = useCallback(
    async (item: ICollectionItem, direction: 'up' | 'down') => {
      const currentIndex = reorderIndexById.get(String(item.id));

      if (currentIndex === undefined) {
        return;
      }

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= reorderEntries.length) {
        return;
      }

      const currentEntry = reorderEntries[currentIndex];
      const targetEntry = reorderEntries[targetIndex];

      try {
        setMovingCollectionId(item.id);

        await Promise.all([
          updateCollection(currentEntry.item.id, { order: targetEntry.resolvedOrder }),
          updateCollection(targetEntry.item.id, { order: currentEntry.resolvedOrder }),
        ]);

        toast.success(`Moved "${item.name || `Collection #${item.id}`}" ${direction}.`);
      } catch (error) {
        console.error('Failed to update collection order:', error);
        toast.error('Failed to change collection order.');
      } finally {
        setMovingCollectionId(null);
      }
    },
    [reorderEntries, reorderIndexById],
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
        <Card sx={{ p: { xs: 2, md: 3 } }}>
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

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ width: { xs: 1, sm: 'auto' } }}
            >
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting}
                fullWidth={isMobile}
              >
                {editingId ? 'Update' : 'Create'}
              </Button>
              <Button variant="outlined" onClick={resetForm} disabled={submitting} fullWidth={isMobile}>
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
          ) : isMobile ? (
            <Stack spacing={1.5} sx={{ p: 1.5 }}>
              {dataFiltered.map((item) => (
                <Card key={item.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle1">{item.name || '-'}</Typography>

                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Customer: {item.customerId || '-'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Category: {item.category ?? '-'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Order: {item.order ?? '-'}
                      </Typography>
                    </Stack>

                    <Typography variant="body2" sx={{ color: 'text.secondary', wordBreak: 'break-word' }}>
                      Reference: {item.reference || '-'}
                    </Typography>

                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Updated: {formatDate(item.updatedAt || item.createdAt)}
                    </Typography>

                    <Stack direction="row" spacing={1} justifyContent="flex-end" useFlexGap flexWrap="wrap">
                      <IconButton
                        size="small"
                        onClick={() => handleMoveOrder(item, 'up')}
                        disabled={
                          movingCollectionId !== null
                          || reorderIndexById.get(String(item.id)) === undefined
                          || reorderIndexById.get(String(item.id)) === 0
                        }
                        aria-label={`Move collection ${item.name || item.id} up`}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: 'primary.lighter',
                          color: 'primary.main',
                          '&.Mui-disabled': {
                            bgcolor: 'action.disabledBackground',
                            color: 'text.disabled',
                            borderColor: 'action.disabledBackground',
                          },
                        }}
                      >
                        <Iconify icon="eva:arrow-upward-fill" width={18} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleMoveOrder(item, 'down')}
                        disabled={
                          movingCollectionId !== null
                          || reorderIndexById.get(String(item.id)) === undefined
                          || reorderIndexById.get(String(item.id)) === reorderEntries.length - 1
                        }
                        aria-label={`Move collection ${item.name || item.id} down`}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: 'primary.lighter',
                          color: 'primary.main',
                          '&.Mui-disabled': {
                            bgcolor: 'action.disabledBackground',
                            color: 'text.disabled',
                            borderColor: 'action.disabledBackground',
                          },
                        }}
                      >
                        <Iconify icon="eva:arrow-downward-fill" width={18} />
                      </IconButton>
                      <Button
                        size="small"
                        variant="text"
                        component={RouterLink}
                        href={paths.dashboard.collections.items(item.id)}
                      >
                        Go Page
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(item)}
                        aria-label={`Edit collection ${item.name || item.id}`}
                      >
                        <Iconify icon="solar:pen-2-outline" width={18} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(item)}
                        aria-label={`Delete collection ${item.name || item.id}`}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </Stack>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 820 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Order</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell>Updated At</TableCell>
                    <TableCell>View Order</TableCell>
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
                          <IconButton
                            size="small"
                            onClick={() => handleMoveOrder(item, 'up')}
                            disabled={
                              movingCollectionId !== null
                              || reorderIndexById.get(String(item.id)) === undefined
                              || reorderIndexById.get(String(item.id)) === 0
                            }
                            aria-label={`Move collection ${item.name || item.id} up`}
                            sx={{
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 1,
                              bgcolor: 'primary.lighter',
                              color: 'primary.main',
                              '&.Mui-disabled': {
                                bgcolor: 'action.disabledBackground',
                                color: 'text.disabled',
                                borderColor: 'action.disabledBackground',
                              },
                            }}
                          >
                            <Iconify icon="eva:arrow-upward-fill" width={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleMoveOrder(item, 'down')}
                            disabled={
                              movingCollectionId !== null
                              || reorderIndexById.get(String(item.id)) === undefined
                              || reorderIndexById.get(String(item.id)) === reorderEntries.length - 1
                            }
                            aria-label={`Move collection ${item.name || item.id} down`}
                            sx={{
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 1,
                              bgcolor: 'primary.lighter',
                              color: 'primary.main',
                              '&.Mui-disabled': {
                                bgcolor: 'action.disabledBackground',
                                color: 'text.disabled',
                                borderColor: 'action.disabledBackground',
                              },
                            }}
                          >
                            <Iconify icon="eva:arrow-downward-fill" width={18} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="text"
                            component={RouterLink}
                            href={paths.dashboard.collections.items(item.id)}
                          >
                            Go Page
                          </Button>
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(item)}
                            aria-label={`Edit collection ${item.name || item.id}`}
                          >
                            <Iconify icon="solar:pen-2-outline" width={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(item)}
                            aria-label={`Delete collection ${item.name || item.id}`}
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                          </IconButton>
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
