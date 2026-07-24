'use client';

import type { IDateValue } from 'src/types/common';
import type { IJourneyDiaryLocation } from 'src/types/journey-diary-location';

import { mutate } from 'swr';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { endpoints } from 'src/utils/axios';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';
import {
  deleteJourneyDiaryLocation,
  useGetJourneyDiaryLocations,
} from 'src/actions/journey-diary-location';

import { toast } from 'src/components/dashboard/snackbar';
import { Iconify } from 'src/components/dashboard/iconify';
import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { hasJourneyCoords } from '../journey-diary-coords';
import { JourneyCompanionAvatars } from '../journey-companion-picker';
import { JourneyDiaryLocationFormDialog } from '../journey-diary-location-form-dialog';
import { JourneyDiaryWorldMap, type JourneyDiaryMapMarker } from '../journey-diary-world-map';

// ----------------------------------------------------------------------

const formatDateTime = (value?: IDateValue | Date | null) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
};

const formatPlace = (entry: IJourneyDiaryLocation) => {
  const parts = [entry.city, entry.country].filter(Boolean);
  return parts.length ? parts.join(', ') : '-';
};

export function WhereHaveYouBeenView() {
  const { user } = useAuthContext();
  const userId = user?.id ? String(user.id) : undefined;

  const { locations, locationsLoading } = useGetJourneyDiaryLocations(userId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IJourneyDiaryLocation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IJourneyDiaryLocation | null>(null);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);

  useEffect(() => {
    mutate(endpoints.journeyDiary.location.list);
    if (userId) {
      mutate(`${endpoints.journeyDiary.location.list}?userId=${userId}`);
    }
  }, [userId]);

  const sortedLocations = useMemo(
    () =>
      [...locations].sort((a, b) => {
        const aTime = a.visitedAt ? new Date(a.visitedAt).getTime() : 0;
        const bTime = b.visitedAt ? new Date(b.visitedAt).getTime() : 0;
        return bTime - aTime;
      }),
    [locations],
  );

  const mapMarkers = useMemo<JourneyDiaryMapMarker[]>(
    () =>
      sortedLocations
        .filter(hasJourneyCoords)
        .map((entry) => ({
          id: String(entry.id),
          lat: entry.latitude as number,
          lng: entry.longitude as number,
          title: entry.journeyName || entry.location,
          subtitle: [entry.location, entry.city, entry.country].filter(Boolean).join(' · '),
        })),
    [sortedLocations],
  );

  const handleAdd = useCallback(() => {
    setEditingEntry(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((entry: IJourneyDiaryLocation) => {
    setEditingEntry(entry);
    setFormOpen(true);
    if (hasJourneyCoords(entry)) {
      setActiveMarkerId(String(entry.id));
    }
  }, []);

  const handleCloseForm = useCallback(() => {
    setFormOpen(false);
    setEditingEntry(null);
  }, []);

  const handleSaved = useCallback(() => {
    mutate(endpoints.journeyDiary.location.list);
    if (userId) {
      mutate(`${endpoints.journeyDiary.location.list}?userId=${userId}`);
    }
  }, [userId]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget?.id) {
      return;
    }

    try {
      await deleteJourneyDiaryLocation(deleteTarget.id, userId);
      toast.success('Location deleted successfully.');
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete location:', error);
      toast.error('Failed to delete location.');
    }
  }, [deleteTarget, userId]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Where have you been"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Journey Diary', href: paths.dashboard.journeyDiary.root },
          { name: 'Where have you been' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleAdd}
          >
            Add location
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="h6">Journey map</Typography>
            <Typography variant="body2" color="text.secondary">
              {mapMarkers.length
                ? `${mapMarkers.length} visited position${mapMarkers.length === 1 ? '' : 's'} recorded.`
                : 'Add a location to start marking where you have been.'}
            </Typography>
          </Box>

          <JourneyDiaryWorldMap
            markers={mapMarkers}
            activeMarkerId={activeMarkerId}
            onMarkerClick={setActiveMarkerId}
            height={450}
          />
        </Stack>
      </Card>

      <Card>
        {locationsLoading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
            <CircularProgress />
          </Stack>
        ) : sortedLocations.length === 0 ? (
          <EmptyContent
            filled
            title="No locations yet"
            description="Add your first place to start building your journey history."
            action={
              <Button variant="contained" onClick={handleAdd}>
                Add location
              </Button>
            }
            sx={{ py: 10 }}
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Journey name</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>City / Country</TableCell>
                  <TableCell>Visited from</TableCell>
                  <TableCell>Visited until</TableCell>
                  <TableCell>Accompanied by</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedLocations.map((entry) => (
                  <TableRow
                    key={entry.id}
                    hover
                    selected={activeMarkerId === String(entry.id)}
                    onClick={() => {
                      if (hasJourneyCoords(entry)) {
                        setActiveMarkerId(String(entry.id));
                      }
                    }}
                    sx={{ cursor: hasJourneyCoords(entry) ? 'pointer' : 'default' }}
                  >
                    <TableCell>
                      <Typography variant="subtitle2">{entry.journeyName || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">{entry.location}</Typography>
                    </TableCell>
                    <TableCell>{formatPlace(entry)}</TableCell>
                    <TableCell>{formatDateTime(entry.visitedAt)}</TableCell>
                    <TableCell>{formatDateTime(entry.endAt)}</TableCell>
                    <TableCell sx={{ minWidth: 160, maxWidth: 220 }}>
                      <JourneyCompanionAvatars companionIds={entry.companionUserIds} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {entry.notes || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                        <IconButton
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEdit(entry);
                          }}
                          aria-label="Edit location"
                        >
                          <Iconify icon="solar:pen-bold" />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(entry);
                          }}
                          aria-label="Delete location"
                        >
                          <Iconify icon="solar:trash-bin-trash-bold" />
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

      <JourneyDiaryLocationFormDialog
        open={formOpen}
        currentEntry={editingEntry}
        userId={userId}
        onClose={handleCloseForm}
        onSaved={handleSaved}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete location?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will permanently remove{' '}
            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {deleteTarget?.location}
            </Box>{' '}
            from your journey history.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
