'use client';

import type { IGiftItem } from 'src/types/gift';
import type { ICollectionDrawerItem } from 'src/types/collection-item';

import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
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

import { toast } from 'src/components/dashboard/snackbar';
import { EmptyContent } from 'src/components/dashboard/empty-content';

import { useAuthContext } from 'src/auth/hooks';
import { useGetGifts, updateGift } from 'src/actions/gift';
import { useGetGuestArea, updateGuestArea } from 'src/actions/guestarea';
import { useGetCollectionItems, updateCollectionItem } from 'src/actions/collection-item';

// ---------------------------------------------------------------

type DrawerShareFormProps = {
  onSaveSuccess?: () => void;
};

type DrawerSettings = {
  gift?: boolean;
  letter?: boolean;
  goodMemo?: boolean;
  sadMemo?: boolean;
  collectionItems?: Record<string, boolean>;
  ebooks?: boolean;
  audiobooks?: boolean;
  [key: string]: unknown;
};

type CategoryKey = 'gift' | 'letter' | 'goodMemo' | 'sadMemo';
type ItemIdKey = string;
type Visibility = 0 | 1;

const DRAWER_COLLECTION_MAP: Record<Exclude<CategoryKey, 'gift'>, number> = {
  letter: 4,
  goodMemo: 1,
  sadMemo: 2,
};

const CATEGORY_CONFIG: Array<{
  key: CategoryKey;
  title: string;
  manageHref: string;
  universeHref: (customerId: string) => string;
}> = [
  {
    key: 'gift',
    title: 'Gifts and Souvenirs',
    manageHref: paths.dashboard.drawer.gift.root,
    universeHref: (customerId) => paths.universe.drawer.item(customerId, 'gift'),
  },
  {
    key: 'letter',
    title: 'Letters',
    manageHref: paths.dashboard.drawer.letter.root,
    universeHref: (customerId) => paths.universe.drawer.item(customerId, 'letter'),
  },
  {
    key: 'goodMemo',
    title: 'Good Memories',
    manageHref: paths.dashboard.drawer.goodMemo.root,
    universeHref: (customerId) => paths.universe.drawer.item(customerId, 'goodMemo'),
  },
  {
    key: 'sadMemo',
    title: 'Sad Memories',
    manageHref: paths.dashboard.drawer.sadMemo.root,
    universeHref: (customerId) => paths.universe.drawer.item(customerId, 'sadMemo'),
  },
];

const toItemIdKey = (id: string | number): ItemIdKey => String(id);

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

const isPublicGift = (openness: unknown): boolean => {
  if (typeof openness === 'number') {
    return openness === 1;
  }

  if (typeof openness === 'string') {
    const normalized = openness.trim().toLowerCase();
    return normalized === 'public' || normalized === '1' || normalized === 'true';
  }

  if (typeof openness === 'boolean') {
    return openness;
  }

  return false;
};

const isGiftCategory = (gift: IGiftItem) => {
  const value = String(gift.category || '').trim().toLowerCase();
  return value === '' || value === 'gift' || value === 'gifts';
};

const getItemTitle = (title?: string | null, fallbackId?: number) => {
  const trimmed = String(title || '').trim();
  return trimmed || (fallbackId ? `Item #${fallbackId}` : 'Untitled');
};

type DrawerItemsSectionProps<T extends { id: number; title?: string | null }> = {
  title: string;
  manageHref: string;
  universeHref?: string;
  showSection: boolean;
  onShowSectionChange: (checked: boolean) => void;
  items: T[];
  itemsLoading: boolean;
  itemUpdates: Record<ItemIdKey, Visibility>;
  getIsPublic: (item: T) => boolean;
  onBulkVisibility: (visibility: Visibility) => void;
  onVisibilityChange: (itemId: string | number, visibility: Visibility) => void;
  isSaving: boolean;
  getSubtitle?: (item: T) => string;
};

function DrawerItemsSection<T extends { id: number; title?: string | null }>({
  title,
  manageHref,
  universeHref,
  showSection,
  onShowSectionChange,
  items,
  itemsLoading,
  itemUpdates,
  getIsPublic,
  onBulkVisibility,
  onVisibilityChange,
  isSaving,
  getSubtitle,
}: DrawerItemsSectionProps<T>) {
  const notFound = !items.length && !itemsLoading;

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
          <Typography variant="h6">{title}</Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            <Switch
              checked={showSection}
              onChange={(event) => onShowSectionChange(event.target.checked)}
              disabled={isSaving}
            />
            <Typography variant="body2">Show on Home Space</Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
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
          <Button
            size="small"
            variant="outlined"
            component={RouterLink}
            href={manageHref}
          >
            Manage
          </Button>
        </Stack>
      </Stack>

      {itemsLoading ? (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : notFound ? (
        <EmptyContent filled sx={{ py: 6 }} />
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>ID</TableCell>
                <TableCell>Public</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {items.map((item) => {
                const itemIdKey = toItemIdKey(item.id);

                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.id}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Switch
                        checked={
                          itemUpdates[itemIdKey] !== undefined
                            ? itemUpdates[itemIdKey] === 1
                            : getIsPublic(item)
                        }
                        onChange={(event) =>
                          onVisibilityChange(item.id, event.target.checked ? 1 : 0)
                        }
                        disabled={isSaving}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {getItemTitle(item.title, item.id)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {getSubtitle?.(item) || '-'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {universeHref ? (
                        <Link href={universeHref} target="_blank" rel="noopener">
                          <Typography variant="body2" sx={{ color: 'primary.main', cursor: 'pointer' }}>
                            View
                          </Typography>
                        </Link>
                      ) : (
                        '-'
                      )}
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

export function DrawerShareForm({ onSaveSuccess }: DrawerShareFormProps) {
  const { user } = useAuthContext();
  const ownerCustomerId = user?.id ? String(user.id) : '';

  const { gifts, giftsLoading } = useGetGifts(user?.id);
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

  const giftItems = gifts.filter(isGiftCategory);

  const [showGift, setShowGift] = useState(false);
  const [showLetter, setShowLetter] = useState(false);
  const [showGoodMemo, setShowGoodMemo] = useState(false);
  const [showSadMemo, setShowSadMemo] = useState(false);

  const [giftUpdates, setGiftUpdates] = useState<Record<ItemIdKey, Visibility>>({});
  const [letterUpdates, setLetterUpdates] = useState<Record<ItemIdKey, Visibility>>({});
  const [goodMemoUpdates, setGoodMemoUpdates] = useState<Record<ItemIdKey, Visibility>>({});
  const [sadMemoUpdates, setSadMemoUpdates] = useState<Record<ItemIdKey, Visibility>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const drawerSettings = parseDrawerSettings(guestarea?.drawer);
    setShowGift(!!drawerSettings.gift);
    setShowLetter(!!drawerSettings.letter);
    setShowGoodMemo(!!drawerSettings.goodMemo);
    setShowSadMemo(!!drawerSettings.sadMemo);
  }, [guestarea?.drawer]);

  const currentDrawerSettings = parseDrawerSettings(guestarea?.drawer);

  const hasGuestAreaChanges =
    showGift !== !!currentDrawerSettings.gift ||
    showLetter !== !!currentDrawerSettings.letter ||
    showGoodMemo !== !!currentDrawerSettings.goodMemo ||
    showSadMemo !== !!currentDrawerSettings.sadMemo;

  const hasGiftChanges = Object.keys(giftUpdates).length > 0;
  const hasLetterChanges = Object.keys(letterUpdates).length > 0;
  const hasGoodMemoChanges = Object.keys(goodMemoUpdates).length > 0;
  const hasSadMemoChanges = Object.keys(sadMemoUpdates).length > 0;

  const hasChanges =
    hasGuestAreaChanges ||
    hasGiftChanges ||
    hasLetterChanges ||
    hasGoodMemoChanges ||
    hasSadMemoChanges;

  const createBulkHandler =
    <T extends { id: number }>(
      items: T[],
      setUpdates: Dispatch<SetStateAction<Record<ItemIdKey, Visibility>>>,
    ) =>
    (visibility: Visibility) => {
      const next: Record<ItemIdKey, Visibility> = {};
      items.forEach((item) => {
        next[toItemIdKey(item.id)] = visibility;
      });
      setUpdates(next);
    };

  const createVisibilityHandler =
    <T extends { id: number }>(
      items: T[],
      getIsPublic: (item: T) => boolean,
      setUpdates: Dispatch<SetStateAction<Record<ItemIdKey, Visibility>>>,
    ) =>
    (itemId: string | number, visibility: Visibility) => {
      const itemIdKey = toItemIdKey(itemId);
      const original = items.find((item) => toItemIdKey(item.id) === itemIdKey);
      const originalVisibility: Visibility = original && getIsPublic(original) ? 1 : 0;

      setUpdates((prev) => {
        if (visibility === originalVisibility) {
          const next = { ...prev };
          delete next[itemIdKey];
          return next;
        }

        return { ...prev, [itemIdKey]: visibility };
      });
    };

  const handleGiftBulkVisibility = createBulkHandler(giftItems, setGiftUpdates);
  const handleLetterBulkVisibility = createBulkHandler(letterCollectionItems, setLetterUpdates);
  const handleGoodMemoBulkVisibility = createBulkHandler(goodMemoCollectionItems, setGoodMemoUpdates);
  const handleSadMemoBulkVisibility = createBulkHandler(sadMemoCollectionItems, setSadMemoUpdates);

  const handleGiftVisibilityChange = createVisibilityHandler(giftItems, (gift) => isPublicGift(gift.openness), setGiftUpdates);
  const handleLetterVisibilityChange = createVisibilityHandler(
    letterCollectionItems,
    (item) => isPublicItem(item.isPublic),
    setLetterUpdates,
  );
  const handleGoodMemoVisibilityChange = createVisibilityHandler(
    goodMemoCollectionItems,
    (item) => isPublicItem(item.isPublic),
    setGoodMemoUpdates,
  );
  const handleSadMemoVisibilityChange = createVisibilityHandler(
    sadMemoCollectionItems,
    (item) => isPublicItem(item.isPublic),
    setSadMemoUpdates,
  );

  const handleSave = async () => {
    if (!hasChanges) {
      toast.warning('No changes to save');
      return;
    }

    if (!guestarea) {
      toast.error('Guest area not found');
      return;
    }

    setIsSaving(true);

    try {
      const enablingPublicGifts = Object.values(giftUpdates).some((value) => value === 1);
      const enablingPublicLetters = Object.values(letterUpdates).some((value) => value === 1);
      const enablingPublicGoodMemos = Object.values(goodMemoUpdates).some((value) => value === 1);
      const enablingPublicSadMemos = Object.values(sadMemoUpdates).some((value) => value === 1);

      const nextShowGift = showGift || enablingPublicGifts;
      const nextShowLetter = showLetter || enablingPublicLetters;
      const nextShowGoodMemo = showGoodMemo || enablingPublicGoodMemos;
      const nextShowSadMemo = showSadMemo || enablingPublicSadMemos;

      const existingDrawerSettings = parseDrawerSettings(guestarea.drawer);
      const { blog: _legacyBlog, ...drawerWithoutBlog } = existingDrawerSettings;

      const drawerSettings = JSON.stringify({
        ...drawerWithoutBlog,
        gift: nextShowGift,
        letter: nextShowLetter,
        goodMemo: nextShowGoodMemo,
        sadMemo: nextShowSadMemo,
      });

      await updateGuestArea({
        id: guestarea.id,
        customerId: guestarea.customerId ? String(guestarea.customerId) : ownerCustomerId || undefined,
        drawer: drawerSettings,
      });

      setShowGift(nextShowGift);
      setShowLetter(nextShowLetter);
      setShowGoodMemo(nextShowGoodMemo);
      setShowSadMemo(nextShowSadMemo);

      const giftVisibilityUpdates = Object.entries(giftUpdates);
      if (giftVisibilityUpdates.length > 0) {
        await Promise.all(
          giftVisibilityUpdates.map(([giftId, visibility]) => {
            const gift = giftItems.find((item) => toItemIdKey(item.id) === giftId);
            if (!gift) {
              return Promise.resolve();
            }

            return updateGift(giftId, {
              openness: visibility === 1 ? 'Public' : 'Private',
              userId: gift.userId || user?.id || '',
            });
          }),
        );
        setGiftUpdates({});
      }

      const saveCollectionUpdates = async (
        updates: Record<ItemIdKey, Visibility>,
        items: ICollectionDrawerItem[],
        setUpdates: Dispatch<SetStateAction<Record<ItemIdKey, Visibility>>>,
      ) => {
        const entries = Object.entries(updates);
        if (!entries.length) {
          return;
        }

        await Promise.all(
          entries.map(([itemId, isPublic]) => updateCollectionItem(itemId, { isPublic })),
        );
        setUpdates({});
      };

      await saveCollectionUpdates(letterUpdates, letterCollectionItems, setLetterUpdates);
      await saveCollectionUpdates(goodMemoUpdates, goodMemoCollectionItems, setGoodMemoUpdates);
      await saveCollectionUpdates(sadMemoUpdates, sadMemoCollectionItems, setSadMemoUpdates);

      toast.success('Drawer sharing settings updated successfully!');
      onSaveSuccess?.();
    } catch (error) {
      console.error('Failed to save drawer sharing settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save drawer sharing settings');
    } finally {
      setIsSaving(false);
    }
  };

  const showEmptyState = !guestAreaLoading && !guestarea;
  const isPageLoading =
    guestAreaLoading ||
    giftsLoading ||
    letterCollectionItemsLoading ||
    goodMemoCollectionItemsLoading ||
    sadMemoCollectionItemsLoading;

  return (
    <Card>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Drawers
        </Typography>

        {isPageLoading ? (
          <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : showEmptyState ? (
          <EmptyContent filled title="Guest area not found" />
        ) : (
          <>
            <DrawerItemsSection
              title={CATEGORY_CONFIG[0].title}
              manageHref={CATEGORY_CONFIG[0].manageHref}
              universeHref={ownerCustomerId ? CATEGORY_CONFIG[0].universeHref(ownerCustomerId) : undefined}
              showSection={showGift}
              onShowSectionChange={setShowGift}
              items={giftItems}
              itemsLoading={giftsLoading}
              itemUpdates={giftUpdates}
              getIsPublic={(gift) => isPublicGift(gift.openness)}
              onBulkVisibility={handleGiftBulkVisibility}
              onVisibilityChange={handleGiftVisibilityChange}
              isSaving={isSaving}
              getSubtitle={(gift) => gift.receivedFrom || gift.description || '-'}
            />

            <Divider sx={{ my: 3 }} />

            <DrawerItemsSection
              title={CATEGORY_CONFIG[1].title}
              manageHref={CATEGORY_CONFIG[1].manageHref}
              universeHref={ownerCustomerId ? CATEGORY_CONFIG[1].universeHref(ownerCustomerId) : undefined}
              showSection={showLetter}
              onShowSectionChange={setShowLetter}
              items={letterCollectionItems}
              itemsLoading={letterCollectionItemsLoading}
              itemUpdates={letterUpdates}
              getIsPublic={(item) => isPublicItem(item.isPublic)}
              onBulkVisibility={handleLetterBulkVisibility}
              onVisibilityChange={handleLetterVisibilityChange}
              isSaving={isSaving}
              getSubtitle={(item) => item.description || '-'}
            />

            <Divider sx={{ my: 3 }} />

            <DrawerItemsSection
              title={CATEGORY_CONFIG[2].title}
              manageHref={CATEGORY_CONFIG[2].manageHref}
              universeHref={ownerCustomerId ? CATEGORY_CONFIG[2].universeHref(ownerCustomerId) : undefined}
              showSection={showGoodMemo}
              onShowSectionChange={setShowGoodMemo}
              items={goodMemoCollectionItems}
              itemsLoading={goodMemoCollectionItemsLoading}
              itemUpdates={goodMemoUpdates}
              getIsPublic={(item) => isPublicItem(item.isPublic)}
              onBulkVisibility={handleGoodMemoBulkVisibility}
              onVisibilityChange={handleGoodMemoVisibilityChange}
              isSaving={isSaving}
              getSubtitle={(item) => item.description || '-'}
            />

            <Divider sx={{ my: 3 }} />

            <DrawerItemsSection
              title={CATEGORY_CONFIG[3].title}
              manageHref={CATEGORY_CONFIG[3].manageHref}
              universeHref={ownerCustomerId ? CATEGORY_CONFIG[3].universeHref(ownerCustomerId) : undefined}
              showSection={showSadMemo}
              onShowSectionChange={setShowSadMemo}
              items={sadMemoCollectionItems}
              itemsLoading={sadMemoCollectionItemsLoading}
              itemUpdates={sadMemoUpdates}
              getIsPublic={(item) => isPublicItem(item.isPublic)}
              onBulkVisibility={handleSadMemoBulkVisibility}
              onVisibilityChange={handleSadMemoVisibilityChange}
              isSaving={isSaving}
              getSubtitle={(item) => item.description || '-'}
            />
          </>
        )}
      </Box>

      {!showEmptyState && !isPageLoading ? (
        <Box sx={{ p: 3, pt: 0 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              startIcon={isSaving ? <CircularProgress size={20} /> : undefined}
              sx={{ width: { xs: 1, sm: 'auto' } }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            {hasChanges ? (
              <Typography variant="body2" sx={{ color: 'warning.main', alignSelf: 'center' }}>
                Settings modified
              </Typography>
            ) : null}
          </Stack>
        </Box>
      ) : null}
    </Card>
  );
}
