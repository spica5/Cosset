'use client';

import type { IBrandProductOrder } from 'src/types/brand-store';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getS3SignedUrl } from 'src/utils/helper';

import { useGetCommunityUsers } from 'src/actions/user';
import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import {
  useGetMyBrandStore,
  useGetBrandProducts,
  createBrandClientOrder,
  updateBrandClientOrder,
  deleteBrandClientOrder,
  useGetMyBrandProductOrders,
  updateBrandProductOrderStatus,
} from 'src/actions/brand-store';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin, isUserBusiness } from 'src/auth/utils/role';

// ----------------------------------------------------------------------

type CommunityUserOption = {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
};

const formatDate = (value?: string | Date | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
};

const statusColor = (status: IBrandProductOrder['status']) => {
  if (status === 'fulfilled') return 'success';
  if (status === 'cancelled') return 'error';
  return 'warning';
};

function isDirectUrl(value: string) {
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('/')
  );
}

function firstImageKey(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const first = parsed.map((item) => String(item || '').trim()).find(Boolean);
        return first || '';
      }
    } catch {
      // Fall through
    }
  }

  return raw;
}

async function resolveImageUrl(value?: string | null) {
  const raw = firstImageKey(value);
  if (!raw) return '';

  if (isDirectUrl(raw)) {
    return raw;
  }

  return (await getS3SignedUrl(raw.replace(/^public:/, ''))) || '';
}

function ClientAvatar({
  name,
  photoURL,
}: {
  name: string;
  photoURL?: string | null;
}) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let mounted = true;

    resolveImageUrl(photoURL).then((url) => {
      if (mounted) setSrc(url);
    });

    return () => {
      mounted = false;
    };
  }, [photoURL]);

  return (
    <Avatar
      src={src || undefined}
      alt={name}
      sx={{ width: 44, height: 44, fontSize: 15, flexShrink: 0 }}
    >
      {name.charAt(0).toUpperCase() || 'C'}
    </Avatar>
  );
}

function ProductThumb({
  alt,
  imageKey,
}: {
  alt: string;
  imageKey?: string | null;
}) {
  const [src, setSrc] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    resolveImageUrl(imageKey).then((url) => {
      if (mounted) setSrc(url);
    });

    return () => {
      mounted = false;
    };
  }, [imageKey]);

  if (!src) {
    return (
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: 1,
          flexShrink: 0,
          bgcolor: 'background.neutral',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Iconify icon="solar:box-bold-duotone" width={22} sx={{ color: 'text.disabled' }} />
      </Box>
    );
  }

  return (
    <>
      <Box
        component="img"
        src={src}
        alt={alt}
        onClick={() => setPreviewOpen(true)}
        sx={{
          width: 52,
          height: 52,
          borderRadius: 1,
          flexShrink: 0,
          objectFit: 'contain',
          bgcolor: 'background.neutral',
          border: '1px solid',
          borderColor: 'divider',
          cursor: 'zoom-in',
        }}
      />

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth={false}
        PaperProps={{
          sx: {
            position: 'relative',
            bgcolor: 'common.black',
            m: 2,
            maxWidth: '92vw',
            maxHeight: '92vh',
          },
        }}
      >
        <IconButton
          onClick={() => setPreviewOpen(false)}
          aria-label="Close image"
          sx={{
            top: 8,
            right: 8,
            zIndex: 2,
            position: 'absolute',
            color: 'common.white',
            bgcolor: 'rgba(0,0,0,0.45)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
          }}
        >
          <Iconify icon="mingcute:close-line" width={18} />
        </IconButton>

        <DialogContent sx={{ p: 1.5, display: 'flex', justifyContent: 'center' }}>
          <Box
            component="img"
            src={src}
            alt={alt}
            onClick={() => setPreviewOpen(false)}
            sx={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              cursor: 'zoom-out',
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

const EMPTY_FORM = {
  customerId: '',
  customerName: '',
  customerEmail: '',
  productId: '',
  quantity: '1',
  price: '',
  currency: '',
  note: '',
  status: 'purchased' as IBrandProductOrder['status'],
};

export function BrandsClientsView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const canManage = isUserBusiness(user?.role) || isUserAdmin(user?.role);
  const { store, storeLoading } = useGetMyBrandStore(canManage);
  const { orders, ordersLoading, ordersEmpty } = useGetMyBrandProductOrders(canManage);
  const { products, productsLoading } = useGetBrandProducts(store?.id || '');
  const { users, usersLoading } = useGetCommunityUsers(200, 0, canManage && !!store);

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<IBrandProductOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<IBrandProductOrder | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedUser, setSelectedUser] = useState<CommunityUserOption | null>(null);

  const userOptions = useMemo<CommunityUserOption[]>(
    () =>
      users
        .filter((item) => {
          const role = String(item.role || '')
            .trim()
            .toLowerCase();
          return role !== 'business' && String(item.id) !== String(user?.id || '');
        })
        .map((item) => {
          const name =
            `${item.firstName || ''} ${item.lastName || ''}`.trim() ||
            item.email?.split('@')[0] ||
            'Customer';
          return {
            id: String(item.id),
            name,
            email: item.email || '',
            photoURL: item.photoURL || item.avatarUrl || '',
          };
        }),
    [users, user?.id],
  );

  const uniqueClientCount = useMemo(() => {
    const keys = new Set(
      orders.map((order) => order.customerId || order.customerEmail || order.customerName)
    );
    return keys.size;
  }, [orders]);

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === form.productId) || null,
    [products, form.productId],
  );

  const isEditMode = Boolean(editingOrder);

  const handleStatus = async (
    order: IBrandProductOrder,
    status: IBrandProductOrder['status'],
  ) => {
    try {
      setUpdatingId(order.id);
      await updateBrandProductOrderStatus(order.id, status);
      toast.success(`Marked as ${status}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update order');
    } finally {
      setUpdatingId(null);
    }
  };

  const openAddDialog = useCallback(() => {
    setEditingOrder(null);
    setForm(EMPTY_FORM);
    setSelectedUser(null);
    setFormOpen(true);
  }, []);

  const openEditDialog = useCallback(
    (order: IBrandProductOrder) => {
      setEditingOrder(order);
      setForm({
        customerId: order.customerId ? String(order.customerId) : '',
        customerName: order.customerName || '',
        customerEmail: order.customerEmail || '',
        productId: String(order.productId || ''),
        quantity: String(order.quantity || 1),
        price: order.price || '',
        currency: order.currency || 'USD',
        note: order.note || '',
        status: order.status || 'purchased',
      });

      const matchedUser = order.customerId
        ? userOptions.find((option) => option.id === String(order.customerId)) || null
        : null;
      setSelectedUser(
        matchedUser ||
          (order.customerId
            ? {
                id: String(order.customerId),
                name: order.customerName,
                email: order.customerEmail || '',
                photoURL: order.customerPhotoURL || '',
              }
            : null),
      );
      setFormOpen(true);
    },
    [userOptions],
  );

  const closeFormDialog = useCallback(() => {
    if (saving) return;
    setFormOpen(false);
    setEditingOrder(null);
    setForm(EMPTY_FORM);
    setSelectedUser(null);
  }, [saving]);

  const handleSaveClient = async () => {
    if (!form.productId) {
      toast.error('Select a product');
      return;
    }

    if (!selectedUser && !form.customerName.trim()) {
      toast.error('Select a customer or enter a client name');
      return;
    }

    const payload = {
      productId: form.productId,
      quantity: Number(form.quantity) || 1,
      note: form.note.trim() || undefined,
      customerId: selectedUser?.id || form.customerId || undefined,
      customerName: selectedUser?.name || form.customerName.trim(),
      customerEmail: selectedUser?.email || form.customerEmail.trim() || undefined,
      price: form.price.trim() || undefined,
      currency: form.currency.trim() || undefined,
    };

    try {
      setSaving(true);
      if (editingOrder) {
        await updateBrandClientOrder(editingOrder.id, {
          ...payload,
          status: form.status,
        });
        toast.success('Client purchase updated');
      } else {
        await createBrandClientOrder(payload);
        toast.success('Client purchase added');
      }
      setFormOpen(false);
      setEditingOrder(null);
      setForm(EMPTY_FORM);
      setSelectedUser(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isEditMode
            ? 'Failed to update client'
            : 'Failed to add client',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveClient = async () => {
    if (!confirmRemove) return;

    try {
      setRemovingId(confirmRemove.id);
      await deleteBrandClientOrder(confirmRemove.id);
      toast.success('Client purchase removed');
      setConfirmRemove(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove client');
    } finally {
      setRemovingId(null);
    }
  };

  if (!canManage) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title="Business account required"
          description="Only business accounts can view product clients."
          sx={{ py: 10 }}
          action={
            <Button
              variant="contained"
              onClick={() => router.push(paths.dashboard.settings.account)}
            >
              Go to account settings
            </Button>
          }
        />
      </DashboardContent>
    );
  }

  if (storeLoading || ordersLoading) {
    return (
      <DashboardContent>
        <Typography variant="body2" color="text.secondary">
          Loading clients...
        </Typography>
      </DashboardContent>
    );
  }

  if (!store) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title="Open your store first"
          description="Create your store on Brands Boulevard before tracking product clients."
          sx={{ py: 10 }}
          action={
            <Button
              variant="contained"
              onClick={() => router.push(paths.dashboard.community.brandsBoulevard.myStore)}
            >
              Open my store
            </Button>
          }
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Clients"
        links={[
          { name: 'Dashboard', href: paths.dashboard.community.brandsBoulevard.myStore },
          { name: 'Clients' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={openAddDialog}
            disabled={!products.length}
          >
            Add client
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2.5 }}>
        <Chip label={`${orders.length} purchases`} />
        <Chip label={`${uniqueClientCount} clients`} color="primary" variant="outlined" />
      </Stack>

      {!products.length && !productsLoading ? (
        <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
          Add products in My Store before recording client purchases.
        </Typography>
      ) : null}

      {ordersEmpty ? (
        <EmptyContent
          filled
          title="No purchases yet"
          description="Add a client with shopping info, or wait for storefront purchases."
          sx={{ py: 10 }}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={openAddDialog}
              disabled={!products.length}
            >
              Add client
            </Button>
          }
        />
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Client</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Purchased</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <ClientAvatar
                          name={order.customerName}
                          photoURL={order.customerPhotoURL}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" noWrap>
                            {order.customerName}
                          </Typography>
                          {order.customerEmail ? (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {order.customerEmail}
                            </Typography>
                          ) : null}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <ProductThumb alt={order.productName} imageKey={order.productImage} />
                        <Typography variant="body2" sx={{ minWidth: 0 }} noWrap>
                          {order.productName}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>
                      {order.price
                        ? `${order.currency || 'USD'} ${order.price}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          maxWidth: 160,
                        }}
                      >
                        {order.note || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={statusColor(order.status)}
                        label={order.status}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(order.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={updatingId === order.id || removingId === order.id}
                          onClick={() => openEditDialog(order)}
                        >
                          Edit
                        </Button>
                        {order.status !== 'fulfilled' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            disabled={updatingId === order.id || removingId === order.id}
                            onClick={() => handleStatus(order, 'fulfilled')}
                          >
                            Fulfill
                          </Button>
                        ) : null}
                        {order.status !== 'cancelled' ? (
                          <Button
                            size="small"
                            color="inherit"
                            disabled={updatingId === order.id || removingId === order.id}
                            onClick={() => handleStatus(order, 'cancelled')}
                          >
                            Cancel
                          </Button>
                        ) : null}
                        <Button
                          size="small"
                          color="error"
                          disabled={updatingId === order.id || removingId === order.id}
                          onClick={() => setConfirmRemove(order)}
                        >
                          Remove
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Dialog open={formOpen} onClose={closeFormDialog} fullWidth maxWidth="sm">
        <DialogTitle>{isEditMode ? 'Edit client purchase' : 'Add client purchase'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Autocomplete
              options={userOptions}
              loading={usersLoading}
              value={selectedUser}
              onChange={(_event, value) => {
                setSelectedUser(value);
                if (value) {
                  setForm((prev) => ({
                    ...prev,
                    customerId: value.id,
                    customerName: value.name,
                    customerEmail: value.email,
                  }));
                } else {
                  setForm((prev) => ({
                    ...prev,
                    customerId: '',
                  }));
                }
              }}
              getOptionLabel={(option) =>
                option.email ? `${option.name} (${option.email})` : option.name
              }
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <ClientAvatar name={option.name} photoURL={option.photoURL} />
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      {option.email ? (
                        <Typography variant="caption" color="text.secondary">
                          {option.email}
                        </Typography>
                      ) : null}
                    </Box>
                  </Stack>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Cosset customer"
                  placeholder="Search by name or email"
                  helperText="Optional — pick an existing user, or enter details below"
                />
              )}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Client name"
                value={form.customerName}
                disabled={!!selectedUser}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, customerName: event.target.value }))
                }
              />
              <TextField
                fullWidth
                label="Client email"
                value={form.customerEmail}
                disabled={!!selectedUser}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, customerEmail: event.target.value }))
                }
              />
            </Stack>

            <TextField
              select
              fullWidth
              label="Product"
              value={form.productId}
              onChange={(event) => {
                const nextId = event.target.value;
                const product = products.find((item) => String(item.id) === nextId);
                setForm((prev) => ({
                  ...prev,
                  productId: nextId,
                  price: product?.price || '',
                  currency: product?.currency || 'USD',
                }));
              }}
              disabled={productsLoading || !products.length}
            >
              {products.map((product) => (
                <MenuItem key={product.id} value={String(product.id)}>
                  {product.name}
                  {product.price ? ` — ${product.currency || 'USD'} ${product.price}` : ''}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={form.quantity}
                inputProps={{ min: 1, max: 99 }}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, quantity: event.target.value }))
                }
              />
              <TextField
                fullWidth
                label="Price"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                InputProps={{
                  startAdornment: form.currency ? (
                    <InputAdornment position="start">{form.currency}</InputAdornment>
                  ) : undefined,
                }}
                helperText={
                  selectedProduct?.price
                    ? `Product default: ${selectedProduct.currency || 'USD'} ${selectedProduct.price}`
                    : undefined
                }
              />
              <TextField
                fullWidth
                label="Currency"
                value={form.currency}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, currency: event.target.value }))
                }
              />
            </Stack>

            {isEditMode ? (
              <TextField
                select
                fullWidth
                label="Status"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as IBrandProductOrder['status'],
                  }))
                }
              >
                <MenuItem value="purchased">Purchased</MenuItem>
                <MenuItem value="fulfilled">Fulfilled</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </TextField>
            ) : null}

            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Shopping note"
              placeholder="Size, color, delivery notes, etc."
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFormDialog} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveClient} disabled={saving}>
            {saving ? 'Saving...' : isEditMode ? 'Save changes' : 'Add client'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(confirmRemove)}
        onClose={() => (removingId ? undefined : setConfirmRemove(null))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Remove client purchase</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Remove{' '}
            <strong>
              {confirmRemove?.quantity} × {confirmRemove?.productName}
            </strong>{' '}
            for <strong>{confirmRemove?.customerName}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemove(null)} disabled={!!removingId}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleRemoveClient}
            disabled={!!removingId}
          >
            {removingId ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
