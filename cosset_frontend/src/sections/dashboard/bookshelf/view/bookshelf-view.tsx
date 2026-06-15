'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard/dashboard';

import { EmptyContent } from 'src/components/dashboard/empty-content';
import { CustomBreadcrumbs } from 'src/components/universe/custom-breadcrumbs/custom-breadcrumbs';

// ----------------------------------------------------------------------

type Props = {
  heading: string;
};

export function BookshelfView({ heading }: Props) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={heading}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Bookshelf', href: paths.dashboard.bookshelf.root },
          { name: heading },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <EmptyContent title={`${heading} coming soon`} filled sx={{ py: 10 }} />
    </DashboardContent>
  );
}
