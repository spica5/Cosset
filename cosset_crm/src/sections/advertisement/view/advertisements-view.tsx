'use client';

import type { IAdvertisement } from 'src/types/advertisement';

import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { toast } from 'sonner';

import {
  deleteAdvertisement,
  useGetAdvertisements,
} from 'src/actions/advertisement';

import { useAuthContext } from 'src/auth/hooks';
import { isUserAdmin } from 'src/auth/utils/role';

import { AdvertisementFormDialog } from '../advertisement-form-dialog';

// ----------------------------------------------------------------------

function statusColor(status: string): 'default' | 'success' | 'warning' | 'info' | 'error' {
  switch (status) {
    case 'active':
      return 'success';
    case 'paused':
      return 'warning';
    case 'archived':
      return 'default';
    case 'draft':
    default:
      return 'info';
  }
}

function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

export function AdvertisementsView() {
  const { user, loading: authLoading } = useAuthContext();
  const isAdmin = isUserAdmin(user?.role);

  const {
    advertisements,
    advertisementsLoading,
    advertisementsError,
    refreshAdvertisements,
  } = useGetAdvertisements(isAdmin);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IAdvertisement | null>(null);
  const [deleting, setDeleting] = useState<IAdvertisement | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return advertisements.filter((ad) => {
      if (statusFilter !== 'all' && ad.status !== statusFilter) return false;
      if (!q) return true;
      return (
        ad.title.toLowerCase().includes(q) ||
        ad.companyName.toLowerCase().includes(q) ||
        String(ad.placement || '')
          .toLowerCase()
          .includes(q) ||
        String(ad.bodyText || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }, [advertisements, search, statusFilter]);

  const handleOpenCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((ad: IAdvertisement) => {
    setEditing(ad);
    setFormOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleting?.id) return;
    setDeleteLoading(true);
    try {
      await deleteAdvertisement(deleting.id);
      toast.success('Advertisement deleted');
      setDeleting(null);
      await refreshAdvertisements();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete advertisement';
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleting, refreshAdvertisements]);

  if (authLoading) {
    return (
      <DashboardContent maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardContent maxWidth="xl">
        <Alert severity="warning">Admin access is required to manage advertisements.</Alert>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography
            component={RouterLink}
            href={paths.dashboard.root}
            variant="body2"
            color="text.secondary"
            sx={{ textDecoration: 'none' }}
          >
            Dashboard
          </Typography>
          <Typography variant="h4">Advertisement</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage ads company content: video, image, text, and company info.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={handleOpenCreate}
        >
          New advertisement
        </Button>
      </Stack>

      <Card>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ p: 2.5, borderBottom: (theme) => `1px solid ${theme.vars.palette.divider}` }}
        >
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, company, placement…"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" width={20} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="paused">Paused</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </TextField>
        </Stack>

        {advertisementsError ? (
          <Alert severity="error" sx={{ m: 2 }}>
            Failed to load advertisements.
          </Alert>
        ) : null}

        {advertisementsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Media</TableCell>
                  <TableCell>Placement</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Schedule</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No advertisements found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((ad) => (
                    <TableRow key={ad.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">{ad.title}</Typography>
                        {ad.bodyText ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {ad.bodyText}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{ad.companyName}</Typography>
                        {ad.companyEmail ? (
                          <Typography variant="caption" color="text.secondary">
                            {ad.companyEmail}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={ad.mediaType} variant="soft" />
                      </TableCell>
                      <TableCell>{ad.placement || '—'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={ad.status} color={statusColor(ad.status)} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" display="block">
                          {formatDate(ad.startAt)} → {formatDate(ad.endAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton onClick={() => handleOpenEdit(ad)} aria-label="Edit">
                          <Iconify icon="solar:pen-bold" />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => setDeleting(ad)}
                          aria-label="Delete"
                        >
                          <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <AdvertisementFormDialog
        open={formOpen}
        advertisement={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          void refreshAdvertisements();
        }}
      />

      <Dialog
        open={Boolean(deleting)}
        onClose={() => {
          if (!deleteLoading) setDeleting(null);
        }}
      >
        <DialogTitle>Delete advertisement?</DialogTitle>
        <DialogContent>
          <Typography>
            {deleting
              ? `Delete “${deleting.title}” from ${deleting.companyName}? This cannot be undone.`
              : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            disabled={deleteLoading}
            onClick={() => setDeleting(null)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            loading={deleteLoading}
            onClick={() => void handleConfirmDelete()}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
