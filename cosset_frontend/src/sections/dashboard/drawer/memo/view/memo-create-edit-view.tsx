'use client';

import { useMemo, useCallback } from 'react';

import Stack from '@mui/material/Stack';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import type { IMemoItem } from 'src/types/memo';

import { useGetCollectionItem } from 'src/actions/collection-item';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { MemoForm } from '../memo-form';

// ----------------------------------------------------------------------

const MEMO_META: Record<1 | 2, { label: string; rootPath: string }> = {
  1: { label: 'Good Memories', rootPath: paths.dashboard.drawer.goodMemo.root },
  2: { label: 'Sad Memories', rootPath: paths.dashboard.drawer.sadMemo.root },
};

type Props = {
  collectionId: 1 | 2;
  itemId?: string | number;
};

export function MemoCreateEditView({ collectionId, itemId }: Props) {
  const router = useRouter();
  const isEdit = !!itemId;
  const { collectionItem } = useGetCollectionItem(isEdit ? itemId! : '');

  const meta = MEMO_META[collectionId];

  const currentMemo = useMemo<IMemoItem | undefined>(() => {
    if (!collectionItem) return undefined;
    return {
      id: collectionItem.id,
      customerId: String(collectionItem.customerId || ''),
      collectionId,
      title: collectionItem.title || '',
      description: collectionItem.description,
      date: collectionItem.date,
      isPublic: (collectionItem.isPublic === 1 ? 1 : 0) as 0 | 1,
      images: collectionItem.images,
      totalViews: collectionItem.totalViews,
      updatedAt: collectionItem.updatedAt,
    };
  }, [collectionId, collectionItem]);

  const handleSaved = useCallback(() => {
    router.push(meta.rootPath);
  }, [meta.rootPath, router]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={isEdit ? `Edit ${meta.label.slice(0, -3)}y` : `New ${meta.label.slice(0, -3)}y`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: meta.label, href: meta.rootPath },
          { name: isEdit ? 'Edit' : 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <MemoForm
          collectionId={collectionId}
          currentMemo={isEdit ? currentMemo : undefined}
          onSaved={handleSaved}
          onClose={handleClose}
        />
      </Stack>
    </DashboardContent>
  );
}
