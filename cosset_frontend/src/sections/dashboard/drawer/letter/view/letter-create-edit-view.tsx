'use client';

import { useMemo, useCallback } from 'react';

import Stack from '@mui/material/Stack';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import type { ILetterItem } from 'src/types/letter';

import { useGetCollectionItem } from 'src/actions/collection-item';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { LetterForm } from '../letter-form';

// ----------------------------------------------------------------------

type Props = {
  itemId?: string | number;
};

export function LetterCreateEditView({ itemId }: Props) {
  const router = useRouter();
  const isEdit = !!itemId;
  const { collectionItem } = useGetCollectionItem(isEdit ? itemId! : '');

  const currentLetter = useMemo<ILetterItem | undefined>(() => {
    if (!collectionItem) return undefined;
    return {
      id: collectionItem.id,
      customerId: String(collectionItem.customerId || ''),
      collectionId: 4,
      title: collectionItem.title || '',
      description: collectionItem.description,
      date: collectionItem.date,
      isPublic: (collectionItem.isPublic === 1 ? 1 : 0) as 0 | 1,
      images: collectionItem.images,
      totalViews: collectionItem.totalViews,
      updatedAt: collectionItem.updatedAt,
    };
  }, [collectionItem]);

  const handleSaved = useCallback(() => {
    router.push(paths.dashboard.drawer.letter.root);
  }, [router]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={isEdit ? 'Edit Letter' : 'New Letter'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Drawer', href: paths.dashboard.drawer.root },
          { name: 'Letters', href: paths.dashboard.drawer.letter.root },
          { name: isEdit ? 'Edit' : 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <LetterForm
          currentLetter={isEdit ? currentLetter : undefined}
          onSaved={handleSaved}
          onClose={handleClose}
        />
      </Stack>
    </DashboardContent>
  );
}