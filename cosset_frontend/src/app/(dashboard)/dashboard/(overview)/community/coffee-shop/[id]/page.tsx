import { CONFIG } from 'src/config-global';

import { CoffeeShopCreateEditView } from 'src/sections/dashboard/coffee-shop/view/coffee-shop-create-edit-view';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: `Edit Coffee Shop - ${CONFIG.appName}` };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <CoffeeShopCreateEditView coffeeShopId={id} />;
}
