'use client';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import UmbrellaIcon from '@mui/icons-material/Umbrella';

import { toast } from 'src/components/dashboard/snackbar';
import { EmptyContent } from 'src/components/dashboard/empty-content';

import { useGetGuestArea, updateGuestArea } from 'src/actions/guestarea';
import { useGetCollectionItems } from 'src/actions/collection-item';
import { useGiftCount } from 'src/actions/gift';

import { useAuthContext } from 'src/auth/hooks';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

// ---------------------------------------------------------------

type DrawerShareFormProps = {
  onSaveSuccess?: () => void;
};

const CATEGORY_OPTIONS = [
  { label: 'Gifts and Souvenirs', key: 'gift' },
  { label: 'Letters', key: 'letter' },
  { label: 'Good Memories', key: 'goodMemo' },
  { label: 'Sad Memories', key: 'sadMemo' },
] as const;

// derive type for keys
type CategoryKey = typeof CATEGORY_OPTIONS[number]['key'];

const DRAWER_COLLECTION_MAP = {
  letter: 4,
  goodMemo: 1,
  sadMemo: 2,
} as const;

const DRAWER_VIEW_HREF_MAP: Record<CategoryKey, string> = {
  gift: paths.dashboard.drawer.gift.root,
  letter: paths.dashboard.drawer.letter,
  goodMemo: paths.dashboard.drawer.goodMemo,
  sadMemo: paths.dashboard.drawer.sadMemo,
};

export function DrawerShareForm({ onSaveSuccess }: DrawerShareFormProps) {
  const { user } = useAuthContext();
  const router = useRouter();
  const ownerCustomerId = user?.id ? String(user.id) : '';

  const giftCountData = useGiftCount(user?.id, '1');
  const {
    collectionItems: letterCollectionItems,
    collectionItemsLoading: letterCollectionItemsLoading,
  } = useGetCollectionItems(
    ownerCustomerId ? DRAWER_COLLECTION_MAP.letter : '',
    ownerCustomerId,
  );
  const {
    collectionItems: goodMemoCollectionItems,
    collectionItemsLoading: goodMemoCollectionItemsLoading,
  } = useGetCollectionItems(
    ownerCustomerId ? DRAWER_COLLECTION_MAP.goodMemo : '',
    ownerCustomerId,
  );
  const {
    collectionItems: sadMemoCollectionItems,
    collectionItemsLoading: sadMemoCollectionItemsLoading,
  } = useGetCollectionItems(
    ownerCustomerId ? DRAWER_COLLECTION_MAP.sadMemo : '',
    ownerCustomerId,
  );

  const { guestarea, guestAreaLoading } = useGetGuestArea(user?.id || '');

  const [categorySwitches, setCategorySwitches] = useState<Record<CategoryKey, boolean>>({
    gift: false,
    letter: false,
    goodMemo: false,
    sadMemo: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Initialize switches based on guest area drawer settings
    if (guestarea?.drawer) {
      try {
        const drawerSettings = JSON.parse(guestarea.drawer);
        setCategorySwitches({
          gift: drawerSettings.gift || false,
          letter: drawerSettings.letter || false,
          goodMemo: drawerSettings.goodMemo || false,
          sadMemo: drawerSettings.sadMemo || false,
        });
      } catch (error) {
        console.error('Failed to parse drawer settings:', error);
      }
    }
  }, [guestarea]);

  const handleCategoryChange = (category: CategoryKey, checked: boolean) => {
    setCategorySwitches((prev) => ({ ...prev, [category]: checked }));
  };

  const handleSave = async () => {
    if (!guestarea) {
      toast.error('Guest area not found');
      return;
    }
    setIsSaving(true);
    try {
      let existingDrawerSettings: Record<string, boolean> = {};

      if (guestarea.drawer) {
        try {
          existingDrawerSettings = JSON.parse(guestarea.drawer) as Record<string, boolean>;
        } catch {
          existingDrawerSettings = {};
        }
      }

      const { blog: _legacyBlog, ...drawerWithoutBlog } = existingDrawerSettings;

      const drawerSettings = JSON.stringify({
        ...drawerWithoutBlog,
        ...categorySwitches,
      });

      await updateGuestArea({ id: guestarea.id, drawer: drawerSettings });
      toast.success('Drawer sharing settings updated successfully!');
      onSaveSuccess?.();
    } catch (error) {
      console.error('Failed to save drawer sharing settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save drawer sharing settings');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = (() => {
    if (!guestarea?.drawer) return true; // If no drawer settings, consider it changed
    try {
      const currentSettings = JSON.parse(guestarea.drawer);
      return CATEGORY_OPTIONS.some(({ key }) => currentSettings[key] !== categorySwitches[key]);
    } catch {
      return true;
    }
  })();

  const totalCount =
    giftCountData.count +
    letterCollectionItems.length +
    goodMemoCollectionItems.length +
    sadMemoCollectionItems.length;

  const anyCountLoading =
    giftCountData.loading ||
    letterCollectionItemsLoading ||
    goodMemoCollectionItemsLoading ||
    sadMemoCollectionItemsLoading;

  const notFound = totalCount === 0 && !anyCountLoading && !guestarea && !guestAreaLoading;

  return (
    <Card>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Drawers
        </Typography>
        {notFound ? (
          <EmptyContent filled />
        ) : (
          <Grid container spacing={2}>
            {CATEGORY_OPTIONS.map(({ label, key }) => {
              const countsMap: Record<CategoryKey, number> = {
                gift: giftCountData.count,
                letter: letterCollectionItems.length,
                goodMemo: goodMemoCollectionItems.length,
                sadMemo: sadMemoCollectionItems.length,
              };
              const count = countsMap[key];
              return (
                <Grid item xs={12} sm={6} md={3} key={key}>
                  <Card sx={{ p: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: 'transparent', width: 32, height: 32, color: 'primary.main' }}>
                          {key === 'gift' && <CardGiftcardIcon fontSize="medium" />}
                          {key === 'letter' && <MailOutlineIcon fontSize="medium" />}
                          {key === 'goodMemo' && <WbSunnyIcon fontSize="medium" />}
                          {key === 'sadMemo' && < UmbrellaIcon fontSize="medium" />}
                        </Avatar>
                        <Typography variant="subtitle1">{label}</Typography>
                      </Box>
                      <Switch
                        checked={categorySwitches[key]}
                        onChange={(e) => handleCategoryChange(key as CategoryKey, e.target.checked)}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
                      {count} item{count === 1 ? '' : 's'}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      fullWidth
                      onClick={() => router.push(DRAWER_VIEW_HREF_MAP[key])}
                    >
                      View
                    </Button>
                  </Card>
                </Grid>
              );
            })}
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
