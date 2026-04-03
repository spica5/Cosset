import { CONFIG } from 'src/config-global';

import { CoffeeShopCreateEditView } from 'src/sections/dashboard/coffee-shop/view/coffee-shop-create-edit-view';

type Props = {
  params: {
    id: string;
  };
};

export const metadata = { title: `Edit Coffee Shop - ${CONFIG.appName}` };

export default function Page({ params }: Props) {
  return <CoffeeShopCreateEditView coffeeShopId={params.id} />;
}
