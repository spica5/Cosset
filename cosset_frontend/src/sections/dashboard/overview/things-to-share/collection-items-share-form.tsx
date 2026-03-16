'use client';

import type { ICollectionItem } from 'src/types/collection';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';

import { useGetCollections } from 'src/actions/collection';
import { useGetCollectionItems } from 'src/actions/collection-item';
import { useGetGuestArea, updateGuestArea } from 'src/actions/guestarea';

import { toast } from 'src/components/dashboard/snackbar';
import { EmptyContent } from 'src/components/dashboard/empty-content';

// ---------------------------------------------------------------

type DrawerSettings = {
  collectionItems?: Record<string, boolean>;
  [key: string]: unknown;
};

const toBooleanRecord = (value: unknown): Record<string, boolean> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, boolean>>(
    (acc, [key, itemValue]) => {
      acc[String(key)] = !!itemValue;
      return acc;
    },
    {},
  );
};

type CollectionItemsCardProps = {
  collection: ICollectionItem;
  customerId?: string | number;
  enabled: boolean;
  onToggle: (checked: boolean) => void;
};

function CollectionItemsCard({ collection, customerId, enabled, onToggle }: CollectionItemsCardProps) {
  const { collectionItems, collectionItemsLoading } = useGetCollectionItems(collection.id, customerId);

  const publicCount = collectionItems.filter((item) => item.isPublic === 1).length;
  const privateCount = collectionItems.filter((item) => item.isPublic !== 1).length;

  return (
    <Grid item xs={12} sm={6} md={3}>
      <Card sx={{ p: 2, height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: 'transparent', width: 32, height: 32, color: 'primary.main' }}>
              <CollectionsBookmarkIcon fontSize="medium" />
            </Avatar>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {collection.name || `Collection #${collection.id}`}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch
                size="medium"
                checked={enabled}
                onChange={(event) => onToggle(event.target.checked)}
            />
          </Box>
        </Box>

        {collectionItemsLoading ? (
          <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
            Loading items...
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
            {collectionItems.length} item{collectionItems.length === 1 ? '' : 's'}
          </Typography>
        )}

        {/* {!collectionItemsLoading && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Public {publicCount} | Private {privateCount}
          </Typography>
        )} */}

        <Button
          size="small"
          variant="outlined"
          fullWidth
          sx={{ mt: 1.5 }}
          component={RouterLink}
          href={paths.dashboard.collections.items(collection.id)}
        >
          View Items
        </Button>
      </Card>
    </Grid>
  );
}

export function CollectionItemsShareForm() {
  const { user } = useAuthContext();
  const { guestarea } = useGetGuestArea(user?.id || '');
  const { collections, collectionsLoading } = useGetCollections(user?.id);
  const [isSaving, setIsSaving] = useState(false);
  const [collectionSwitches, setCollectionSwitches] = useState<Record<string, boolean>>({});
  const [initialCollectionSwitches, setInitialCollectionSwitches] = useState<Record<string, boolean>>({});

  const orderedCollections = useMemo(
    () =>
      [...collections].sort((a, b) => {
        const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;

        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }

        return (a.name || '').localeCompare(b.name || '');
      }),
    [collections],
  );

  const notFound = !orderedCollections.length && !collectionsLoading;

  useEffect(() => {
    let savedCollectionSwitches: Record<string, boolean> = {};

    if (guestarea?.drawer) {
      try {
        const parsed = JSON.parse(guestarea.drawer) as DrawerSettings;
        savedCollectionSwitches = toBooleanRecord(parsed.collectionItems);
      } catch {
        savedCollectionSwitches = {};
      }
    }

    const nextCollectionSwitches = orderedCollections.reduce<Record<string, boolean>>((acc, collection) => {
      const key = String(collection.id);
      acc[key] = !!savedCollectionSwitches[key];
      return acc;
    }, {});

    setCollectionSwitches(nextCollectionSwitches);
    setInitialCollectionSwitches(nextCollectionSwitches);
  }, [guestarea?.drawer, orderedCollections]);

  const handleToggle = (collectionId: string | number, checked: boolean) => {
    const key = String(collectionId);
    setCollectionSwitches((prev) => ({ ...prev, [key]: checked }));
  };

  const hasChanges = orderedCollections.some((collection) => {
    const key = String(collection.id);
    return !!collectionSwitches[key] !== !!initialCollectionSwitches[key];
  });

  const handleSave = async () => {
    if (!guestarea) {
      toast.error('Guest area not found');
      return;
    }

    setIsSaving(true);

    try {
      let existingDrawerSettings: DrawerSettings = {};

      if (guestarea.drawer) {
        try {
          existingDrawerSettings = JSON.parse(guestarea.drawer) as DrawerSettings;
        } catch {
          existingDrawerSettings = {};
        }
      }

      const { blog: _legacyBlog, ...drawerWithoutBlog } = existingDrawerSettings;

      const drawerSettings = JSON.stringify({
        ...drawerWithoutBlog,
        collectionItems: collectionSwitches,
      });

      await updateGuestArea({ id: guestarea.id, drawer: drawerSettings });

      setInitialCollectionSwitches(collectionSwitches);
      toast.success('Collection sharing settings updated successfully!');
    } catch (error) {
      console.error('Failed to save collection sharing settings:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save collection sharing settings',
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
          sx={{ mb: 2 }}
        >
          <Typography variant="h6">Collection Items</Typography>

          <Button
            component={RouterLink}
            href={paths.dashboard.collections.manage}
            size="small"
            variant="outlined"
          >
            Manage Collections
          </Button>
        </Stack>

        {collectionsLoading ? (
          <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : notFound ? (
          <EmptyContent filled />
        ) : (
          <Grid container spacing={2}>
            {orderedCollections.map((collection) => (
              <CollectionItemsCard
                key={collection.id}
                collection={collection}
                customerId={user?.id}
                enabled={!!collectionSwitches[String(collection.id)]}
                onToggle={(checked) => handleToggle(collection.id, checked)}
              />
            ))}
          </Grid>
        )}
      </Box>

      <Box sx={{ p: 3, pt: 0 }}>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            startIcon={isSaving && <CircularProgress size={20} />}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          {hasChanges && (
            <Typography variant="body2" sx={{ color: 'warning.main', alignSelf: 'center' }}>
              Settings modified
            </Typography>
          )}
        </Stack>
      </Box>
    </Card>
  );
}
