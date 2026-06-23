'use client';

import { useParams } from 'next/navigation';

import { UniverseDesignSpacePageShell } from 'src/sections/universe/universe/view/universe-design-space-page-shell';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  const params = useParams();
  const customerId = typeof params?.id === 'string' ? params.id : '';

  return <UniverseDesignSpacePageShell customerId={customerId}>{children}</UniverseDesignSpacePageShell>;
}
