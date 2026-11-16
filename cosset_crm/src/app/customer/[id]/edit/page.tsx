import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { CustomerEditView } from 'src/sections/customer/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Edit customer - ${CONFIG.appName}` };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <CustomerEditView customerId={id} />;
}
