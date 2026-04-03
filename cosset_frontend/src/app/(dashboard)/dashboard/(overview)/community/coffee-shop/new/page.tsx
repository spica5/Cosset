import { CONFIG } from 'src/config-global';

import { CoffeeShopCreateEditView } from 'src/sections/dashboard/coffee-shop/view/coffee-shop-create-edit-view';

export const metadata = { title: `Create Coffee Shop - ${CONFIG.appName}` };

export default function Page() {
  return <CoffeeShopCreateEditView />;
}
