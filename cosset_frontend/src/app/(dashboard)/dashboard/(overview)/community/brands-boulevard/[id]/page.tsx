import { CONFIG } from 'src/config-global';

import { BrandsStorefrontView } from 'src/sections/dashboard/brands-boulevard/view/brands-storefront-view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: `Brand Store - ${CONFIG.appName}` };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <BrandsStorefrontView storeId={id} />;
}
