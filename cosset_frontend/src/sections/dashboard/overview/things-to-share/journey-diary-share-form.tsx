'use client';

import type { IJourneyDiaryNote } from 'src/types/journey-diary-note';
import type { IJourneyMemorialThing } from 'src/types/journey-diary-memorial-thing';
import type { IJourneyRepresentativePicture } from 'src/types/journey-diary-representative-picture';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';
import { useGetGuestArea, updateGuestArea } from 'src/actions/guestarea';
import { useGetJourneyDiaryNotes, updateJourneyDiaryNote } from 'src/actions/journey-diary-note';
import {
  useGetJourneyRepresentativePictures,
  updateJourneyRepresentativePicture,
} from 'src/actions/journey-diary-representative-picture';
import {
  useGetJourneyMemorialThings,
  updateJourneyMemorialThing,
} from 'src/actions/journey-diary-memorial-thing';

import { toast } from 'src/components/dashboard/snackbar';
import { EmptyContent } from 'src/components/dashboard/empty-content';

import { getMemorialThingCategoryLabel } from 'src/sections/dashboard/journey-diary/memorial-things-categories';

// ---------------------------------------------------------------

type DrawerSettings = {
  myJourney?: boolean;
  myNotes?: boolean;
  memorialThings?: boolean;
  [key: string]: unknown;
};

type Visibility = 0 | 1;
type ItemIdKey = string;

const toItemIdKey = (id: string | number): ItemIdKey => String(id);

const isPublicItem = (isPublic: unknown): boolean => {
  if (typeof isPublic === 'number') {
    return isPublic === 1;
  }

  if (typeof isPublic === 'string') {
    const normalized = isPublic.trim().toLowerCase();
    return normalized === '1' || normalized === 'public' || normalized === 'true';
  }

  if (typeof isPublic === 'boolean') {
    return isPublic;
  }

  return false;
};

const parseDrawerSettings = (drawer?: string | null): DrawerSettings => {
  if (!drawer) {
    return {};
  }

  try {
    return JSON.parse(drawer) as DrawerSettings;
  } catch {
    return {};
  }
};

const formatDate = (value: unknown) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString();
};

const formatJourneyLabel = (item: {
  journeyCountry?: string | null;
  journeyYear?: number;
}) => {
  const country = item.journeyCountry || 'Journey';
  return item.journeyYear ? `${country} · ${item.journeyYear}` : country;
};

type ShareableJourneyItem = {
  id: number;
  isPublic?: number | null;
  journeyCountry?: string | null;
  journeyYear?: number;
};

type ShareSectionProps<T extends ShareableJourneyItem> = {
  title: string;
  manageHref: string;
  showSection: boolean;
  onShowSectionChange: (checked: boolean) => void;
  items: T[];
  itemsLoading: boolean;
  itemUpdates: Record<ItemIdKey, Visibility>;
  onBulkVisibility: (visibility: Visibility) => void;
  onVisibilityChange: (itemId: string | number, visibility: Visibility) => void;
  getLabel: (item: T) => string;
  getMeta?: (item: T) => string;
  isSaving: boolean;
};

function ShareSection<T extends ShareableJourneyItem>({
  title,
  manageHref,
  showSection,
  onShowSectionChange,
  items,
  itemsLoading,
  itemUpdates,
  onBulkVisibility,
  onVisibilityChange,
  getLabel,
  getMeta,
  isSaving,
}: ShareSectionProps<T>) {
  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Typography variant="subtitle1">{title}</Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Switch checked={showSection} onChange={(event) => onShowSectionChange(event.target.checked)} />
            <Typography variant="body2">Show on Home Space</Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            color="success"
            onClick={() => onBulkVisibility(1)}
            disabled={isSaving || !items.length}
          >
            Enable All
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => onBulkVisibility(0)}
            disabled={isSaving || !items.length}
          >
            Disable All
          </Button>
          <Button component={RouterLink} href={manageHref} size="small" variant="outlined">
            Manage
          </Button>
        </Stack>
      </Stack>

      {itemsLoading ? (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : !items.length ? (
        <EmptyContent filled title={`No ${title.toLowerCase()} yet`} />
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>Public</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Journey</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => {
                const itemIdKey = toItemIdKey(item.id);
                const pendingVisibility = itemUpdates[itemIdKey];
                const isPublic = pendingVisibility !== undefined
                  ? pendingVisibility === 1
                  : isPublicItem(item.isPublic);

                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Switch
                        checked={isPublic}
                        onChange={(event) =>
                          onVisibilityChange(item.id, event.target.checked ? 1 : 0)
                        }
                        disabled={isSaving}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">{getLabel(item)}</Typography>
                    </TableCell>
                    <TableCell>{formatJourneyLabel(item)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {getMeta?.(item) || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

function useVisibilityUpdates<T extends ShareableJourneyItem>(
  items: T[],
  setUpdates: Dispatch<SetStateAction<Record<ItemIdKey, Visibility>>>,
) {
  return {
    handleBulkVisibility: (nextVisibility: Visibility) => {
      const next: Record<ItemIdKey, Visibility> = {};
      items.forEach((item) => {
        next[toItemIdKey(item.id)] = nextVisibility;
      });
      setUpdates(next);
    },
    handleVisibilityChange: (itemId: string | number, nextVisibility: Visibility) => {
      const itemIdKey = toItemIdKey(itemId);
      const original = items.find((item) => toItemIdKey(item.id) === itemIdKey);
      const originalVisibility: Visibility = isPublicItem(original?.isPublic) ? 1 : 0;

      setUpdates((prev) => {
        if (nextVisibility === originalVisibility) {
          const next = { ...prev };
          delete next[itemIdKey];
          return next;
        }

        return { ...prev, [itemIdKey]: nextVisibility };
      });
    },
  };
}

export function JourneyDiaryShareForm() {
  const { user } = useAuthContext();
  const userId = user?.id ? String(user.id) : undefined;

  const { guestarea } = useGetGuestArea(userId || '');
  const { pictures, picturesLoading } = useGetJourneyRepresentativePictures(userId);
  const { notes, notesLoading } = useGetJourneyDiaryNotes(userId);
  const { memorialThings, memorialThingsLoading } = useGetJourneyMemorialThings(userId);

  const drawerSettings = useMemo(() => parseDrawerSettings(guestarea?.drawer), [guestarea?.drawer]);

  const [showMyJourney, setShowMyJourney] = useState(false);
  const [showMyNotes, setShowMyNotes] = useState(false);
  const [showMemorialThings, setShowMemorialThings] = useState(false);
  const [pictureUpdates, setPictureUpdates] = useState<Record<ItemIdKey, Visibility>>({});
  const [noteUpdates, setNoteUpdates] = useState<Record<ItemIdKey, Visibility>>({});
  const [memorialUpdates, setMemorialUpdates] = useState<Record<ItemIdKey, Visibility>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setShowMyJourney(Boolean(drawerSettings.myJourney));
    setShowMyNotes(Boolean(drawerSettings.myNotes));
    setShowMemorialThings(Boolean(drawerSettings.memorialThings));
  }, [drawerSettings.memorialThings, drawerSettings.myJourney, drawerSettings.myNotes]);

  const pictureHandlers = useVisibilityUpdates(pictures, setPictureUpdates);
  const noteHandlers = useVisibilityUpdates(notes, setNoteUpdates);
  const memorialHandlers = useVisibilityUpdates(memorialThings, setMemorialUpdates);

  const hasDrawerChanges =
    showMyJourney !== Boolean(drawerSettings.myJourney) ||
    showMyNotes !== Boolean(drawerSettings.myNotes) ||
    showMemorialThings !== Boolean(drawerSettings.memorialThings);

  const hasItemChanges =
    Object.keys(pictureUpdates).length > 0 ||
    Object.keys(noteUpdates).length > 0 ||
    Object.keys(memorialUpdates).length > 0;

  const hasChanges = hasDrawerChanges || hasItemChanges;

  const handleSave = async () => {
    if (!hasChanges) {
      toast.warning('No changes to save');
      return;
    }

    if (hasDrawerChanges && !guestarea) {
      toast.error('Guest area not found');
      return;
    }

    setIsSaving(true);

    try {
      if (hasDrawerChanges && guestarea) {
        const currentDrawer = parseDrawerSettings(guestarea.drawer);
        await updateGuestArea({
          id: guestarea.id,
          drawer: JSON.stringify({
            ...currentDrawer,
            myJourney: showMyJourney,
            myNotes: showMyNotes,
            memorialThings: showMemorialThings,
          }),
        });
      }

      await Promise.all([
        ...Object.entries(pictureUpdates).map(([id, isPublic]) =>
          updateJourneyRepresentativePicture(id, { isPublic }, userId),
        ),
        ...Object.entries(noteUpdates).map(([id, isPublic]) =>
          updateJourneyDiaryNote(id, { isPublic }, userId),
        ),
        ...Object.entries(memorialUpdates).map(([id, isPublic]) =>
          updateJourneyMemorialThing(id, { isPublic }, userId),
        ),
      ]);

      setPictureUpdates({});
      setNoteUpdates({});
      setMemorialUpdates({});

      toast.success('Journey diary sharing settings updated successfully!');
    } catch (error) {
      console.error('Failed to save journey diary sharing settings:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save journey diary sharing settings',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <Box sx={{ p: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h6">Journey Diary</Typography>
            <Typography variant="body2" color="text.secondary">
              Share My Journey photos, My Notes, and Memorial Things on your Home Space.
            </Typography>
          </Box>

          <Button variant="contained" onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Stack>

        <Stack spacing={3} divider={<Divider flexItem />}>
          <ShareSection<IJourneyRepresentativePicture>
            title="My Journey"
            manageHref={paths.dashboard.journeyDiary.myJourney}
            showSection={showMyJourney}
            onShowSectionChange={setShowMyJourney}
            items={pictures}
            itemsLoading={picturesLoading}
            itemUpdates={pictureUpdates}
            onBulkVisibility={pictureHandlers.handleBulkVisibility}
            onVisibilityChange={pictureHandlers.handleVisibilityChange}
            getLabel={(item) => item.caption?.trim() || `Photo #${item.id}`}
            getMeta={(item) => formatDate(item.createdAt)}
            isSaving={isSaving}
          />

          <ShareSection<IJourneyDiaryNote>
            title="My Notes"
            manageHref={paths.dashboard.journeyDiary.myNotes}
            showSection={showMyNotes}
            onShowSectionChange={setShowMyNotes}
            items={notes}
            itemsLoading={notesLoading}
            itemUpdates={noteUpdates}
            onBulkVisibility={noteHandlers.handleBulkVisibility}
            onVisibilityChange={noteHandlers.handleVisibilityChange}
            getLabel={(item) => item.title?.trim() || `Note #${item.id}`}
            getMeta={(item) => formatDate(item.noteDate || item.createdAt)}
            isSaving={isSaving}
          />

          <ShareSection<IJourneyMemorialThing>
            title="Memorial Things"
            manageHref={paths.dashboard.journeyDiary.memorialThings}
            showSection={showMemorialThings}
            onShowSectionChange={setShowMemorialThings}
            items={memorialThings}
            itemsLoading={memorialThingsLoading}
            itemUpdates={memorialUpdates}
            onBulkVisibility={memorialHandlers.handleBulkVisibility}
            onVisibilityChange={memorialHandlers.handleVisibilityChange}
            getLabel={(item) => item.title?.trim() || `Item #${item.id}`}
            getMeta={(item) => getMemorialThingCategoryLabel(item.category)}
            isSaving={isSaving}
          />
        </Stack>
      </Box>
    </Card>
  );
}
