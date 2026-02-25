'use client';

import { useCallback } from 'react';

import { Stack } from '@mui/material';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useGetGift } from 'src/actions/gift';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

import { GiftForm } from '../gift-form';

// ——————————————————————————————————————————————————————————————————————————————

type GiftCreateEditViewProps = {
  giftId?: string | number;
};

export function GiftCreateEditView({ giftId }: GiftCreateEditViewProps) {
  const { gift } = useGetGift(giftId || '');
  const router = useRouter();

  const isEdit = !!giftId;

  const handleClose = useCallback(() => {
    router.back();
  }, [giftId, router]);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={isEdit ? 'Edit Gift' : 'Create Gift'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Gift', href: paths.dashboard.drawer.gift.root },
          { name: isEdit ? 'Edit' : 'Create' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={3}>
        <GiftForm currentGift={gift} onClose={handleClose} />
      </Stack>
    </DashboardContent>
  );
}
