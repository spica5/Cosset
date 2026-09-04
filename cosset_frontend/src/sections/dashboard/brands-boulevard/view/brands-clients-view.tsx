'use client';

import type {
  IBrandStoreWishlistClientItem,
  IBrandWishlistClientStatus,
} from 'src/types/brand-store';

import { useMemo, useState, useEffect, Fragment } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import Collapse from '@mui/material/Collapse';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { getS3SignedUrl } from 'src/utils/helper';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import {
  useGetMyBrandStore,
  useGetMyBrandStoreWishlists,
  updateBrandStoreWishlistNote,
} from 'src/actions/brand-store';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/dashboard/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin, isUserBusiness } from 'src/auth/utils/role';

import {
  getBrandProductImages,
  normalizeBrandWishlistClientStatus,
  getBrandWishlistClientStatusLabel,
  getBrandWishlistClientStatusColor,
} from 'src/types/brand-store';

import { BrandProductImageGallery } from '../brand-image-field';

// ----------------------------------------------------------------------

type ClientWishlistGroup = {
  key: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhotoURL?: string | null;
  items: IBrandStoreWishlistClientItem[];
  purchasedCount: number;
  latestAt: number;
};

const CLIENT_STATUS_OPTIONS: IBrandWishlistClientStatus[] = ['wish', 'purchased', 'canceled'];

const formatDate = (value?: string | Date | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
};

const toDateTimeLocalValue = (value?: string | Date | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
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

function customerDisplayName(item: IBrandStoreWishlistClientItem) {
  return (
    `${item.customerFirstName || ''} ${item.customerLastName || ''}`.trim() ||
    item.customerEmail?.split('@')[0] ||
    'Customer'
  );
}

function productImageKeys(item: IBrandStoreWishlistClientItem) {
  return getBrandProductImages({
    imageUrl: item.productImage || undefined,
    images: [],
  });
}

export function BrandsClientsView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const canManage = isUserBusiness(user?.role) || isUserAdmin(user?.role);
  const { store, storeLoading } = useGetMyBrandStore(canManage);
  const { items, clientCount, wishlistsLoading, wishlistsEmpty } =
    useGetMyBrandStoreWishlists(canManage);

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<IBrandStoreWishlistClientItem | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [purchasedAtDraft, setPurchasedAtDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<IBrandWishlistClientStatus>('wish');
  const [savingNote, setSavingNote] = useState(false);

  const groups = useMemo<ClientWishlistGroup[]>(() => {
    const map = new Map<string, ClientWishlistGroup>();

    items.forEach((item) => {
      const key = String(item.userId || item.customerEmail || item.id);
      const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
      const status = normalizeBrandWishlistClientStatus(item.status);
      const existing = map.get(key);

      if (existing) {
        existing.items.push(item);
        existing.latestAt = Math.max(existing.latestAt, Number.isFinite(createdAt) ? createdAt : 0);
        if (status === 'purchased') {
          existing.purchasedCount += 1;
        }
        return;
      }

      map.set(key, {
        key,
        customerId: String(item.userId || ''),
        customerName: customerDisplayName(item),
        customerEmail: item.customerEmail || '',
        customerPhotoURL: item.customerPhotoURL,
        items: [item],
        purchasedCount: status === 'purchased' ? 1 : 0,
        latestAt: Number.isFinite(createdAt) ? createdAt : 0,
      });
    });

    return Array.from(map.values()).sort((a, b) => b.latestAt - a.latestAt);
  }, [items]);

  const wishCount = items.filter(
    (item) => normalizeBrandWishlistClientStatus(item.status) === 'wish',
  ).length;
  const purchasedCount = items.filter(
    (item) => normalizeBrandWishlistClientStatus(item.status) === 'purchased',
  ).length;

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const openEditNote = (item: IBrandStoreWishlistClientItem) => {
    setEditingItem(item);
    setNoteDraft(item.note || '');
    setPurchasedAtDraft(toDateTimeLocalValue(item.createdAt));
    setStatusDraft(normalizeBrandWishlistClientStatus(item.status));
  };

  const closeEditNote = () => {
    if (savingNote) return;
    setEditingItem(null);
    setNoteDraft('');
    setPurchasedAtDraft('');
    setStatusDraft('wish');
  };

  const handleSaveNote = async () => {
    if (!editingItem) return;

    if (statusDraft === 'purchased' && !purchasedAtDraft) {
      toast.error('Purchased date is required for purchased items');
      return;
    }

    let purchasedAtIso: string | undefined;
    if (purchasedAtDraft) {
      const purchasedAt = new Date(purchasedAtDraft);
      if (Number.isNaN(purchasedAt.getTime())) {
        toast.error('Invalid purchased date');
        return;
      }
      purchasedAtIso = purchasedAt.toISOString();
    }

    try {
      setSavingNote(true);
      await updateBrandStoreWishlistNote(
        editingItem.id,
        noteDraft,
        purchasedAtIso,
        statusDraft,
      );
      toast.success('Client details updated');
      setEditingItem(null);
      setNoteDraft('');
      setPurchasedAtDraft('');
      setStatusDraft('wish');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update client details');
    } finally {
      setSavingNote(false);
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
            <Button variant="contained" onClick={() => router.push(paths.dashboard.root)}>
              Back to dashboard
            </Button>
          }
        />
      </DashboardContent>
    );
  }

  if (storeLoading || wishlistsLoading) {
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
          description="Create your store on Brands Boulevard before tracking wishlist clients."
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
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Clients' },
        ]}
        action={
          <Button
            variant="outlined"
            onClick={() => router.push(paths.dashboard.community.brandsBoulevard.store(store.id))}
            startIcon={<Iconify icon="solar:shop-2-bold" />}
          >
            View storefront
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip label={`${wishCount} wishes`} color="info" />
        <Chip label={`${purchasedCount} purchased`} color="success" />
        <Chip label={`${clientCount || groups.length} clients`} color="primary" variant="outlined" />
      </Stack>

      {wishlistsEmpty ? (
        <EmptyContent
          filled
          title="No wishlist clients yet"
          description="When customers tap Add Wishlist on your products, they will appear here grouped by customer."
          sx={{ py: 8 }}
        />
      ) : (
        <Card>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell width={56} />
                  <TableCell>Client</TableCell>
                  <TableCell>Products</TableCell>
                  <TableCell>Purchased</TableCell>
                  <TableCell>Latest activity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groups.map((group) => {
                  const open = expandedKeys.has(group.key);

                  return (
                    <Fragment key={group.key}>
                      <TableRow hover selected={open}>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => toggleExpanded(group.key)}
                            aria-label={open ? 'Collapse products' : 'Expand products'}
                          >
                            <Iconify
                              icon={
                                open
                                  ? 'eva:arrow-ios-upward-fill'
                                  : 'eva:arrow-ios-downward-fill'
                              }
                            />
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <ClientAvatar
                              name={group.customerName}
                              photoURL={group.customerPhotoURL}
                            />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" noWrap>
                                {group.customerName}
                              </Typography>
                              {group.customerEmail ? (
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {group.customerEmail}
                                </Typography>
                              ) : null}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {group.items.length} product{group.items.length === 1 ? '' : 's'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={group.purchasedCount > 0 ? 'success' : 'default'}
                            label={`${group.purchasedCount} purchased`}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(
                              [...group.items].sort((a, b) => {
                                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                                return bTime - aTime;
                              })[0]?.createdAt,
                            )}
                          </Typography>
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell colSpan={5} sx={{ py: 0, border: open ? undefined : 'none' }}>
                          <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ py: 1.5, px: { xs: 0.5, sm: 1 } }}>
                              <Table size="small" sx={{ minWidth: 820 }}>
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Product</TableCell>
                                    <TableCell width={120}>State</TableCell>
                                    <TableCell width={180}>Purchased date</TableCell>
                                    <TableCell>Notes</TableCell>
                                    <TableCell width={88} align="right">
                                      Edit
                                    </TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {group.items.map((item) => {
                                    const itemStatus = normalizeBrandWishlistClientStatus(
                                      item.status,
                                    );

                                    return (
                                      <TableRow key={item.id}>
                                        <TableCell sx={{ verticalAlign: 'top' }}>
                                          <Stack
                                            direction={{ xs: 'column', sm: 'row' }}
                                            spacing={1.5}
                                            alignItems={{ sm: 'flex-start' }}
                                          >
                                            <Box
                                              sx={{
                                                width: { xs: 1, sm: 140 },
                                                flexShrink: 0,
                                                borderRadius: 1,
                                                overflow: 'hidden',
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                bgcolor: 'background.neutral',
                                              }}
                                            >
                                              <BrandProductImageGallery
                                                imageKeys={productImageKeys(item)}
                                                alt={item.productName}
                                                height={120}
                                              />
                                            </Box>
                                            <Box sx={{ minWidth: 0, pt: 0.5 }}>
                                              <Typography variant="subtitle2">
                                                {item.productName}
                                              </Typography>
                                              <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                display="block"
                                              >
                                                {[item.categoryName, item.productCode]
                                                  .filter(Boolean)
                                                  .join(' · ') || 'Client product'}
                                              </Typography>
                                              <Typography
                                                variant="subtitle2"
                                                sx={{ fontWeight: 700, mt: 0.75 }}
                                              >
                                                {item.productPrice
                                                  ? `${item.productCurrency || 'USD'} ${item.productPrice}`
                                                  : '—'}
                                              </Typography>
                                            </Box>
                                          </Stack>
                                        </TableCell>
                                        <TableCell sx={{ verticalAlign: 'top' }}>
                                          <Chip
                                            size="small"
                                            color={getBrandWishlistClientStatusColor(itemStatus)}
                                            label={getBrandWishlistClientStatusLabel(itemStatus)}
                                            sx={{ fontWeight: 700 }}
                                          />
                                        </TableCell>
                                        <TableCell sx={{ verticalAlign: 'top' }}>
                                          <Typography variant="body2" color="text.secondary">
                                            {formatDate(item.createdAt)}
                                          </Typography>
                                        </TableCell>
                                        <TableCell sx={{ verticalAlign: 'top', maxWidth: 280 }}>
                                          <Typography
                                            variant="body2"
                                            color={item.note ? 'text.primary' : 'text.disabled'}
                                            sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                          >
                                            {item.note?.trim() || '—'}
                                          </Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ verticalAlign: 'top' }}>
                                          <IconButton
                                            size="small"
                                            onClick={() => openEditNote(item)}
                                            aria-label="Edit client product"
                                          >
                                            <Iconify icon="solar:pen-bold" width={18} />
                                          </IconButton>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Dialog open={Boolean(editingItem)} onClose={closeEditNote} fullWidth maxWidth="sm">
        <DialogTitle>Edit client details</DialogTitle>
        <DialogContent>
          {editingItem ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="subtitle2">{editingItem.productName}</Typography>
              <TextField
                select
                label="State"
                value={statusDraft}
                onChange={(event) =>
                  setStatusDraft(normalizeBrandWishlistClientStatus(event.target.value))
                }
                fullWidth
              >
                {CLIENT_STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {getBrandWishlistClientStatusLabel(option)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Purchased date"
                type="datetime-local"
                value={purchasedAtDraft}
                onChange={(event) => setPurchasedAtDraft(event.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                helperText={
                  statusDraft === 'purchased'
                    ? 'Required when state is Purchased'
                    : 'Optional for Wish / Canceled'
                }
              />
              <TextField
                label="Notes"
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                fullWidth
                multiline
                minRows={3}
                inputProps={{ maxLength: 2000 }}
                helperText={`${noteDraft.length}/2000`}
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditNote} disabled={savingNote}>
            Cancel
          </Button>
          <LoadingButton variant="contained" loading={savingNote} onClick={handleSaveNote}>
            Save
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
