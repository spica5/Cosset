import { CONFIG } from 'src/config-global';

import { CoffeeShopListView } from '../../../../../../sections/dashboard/coffee-shop/view/coffee-shop-list-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Coffee Shops - ${CONFIG.appName}` };

export default function Page() {
  return <CoffeeShopListView />;
}