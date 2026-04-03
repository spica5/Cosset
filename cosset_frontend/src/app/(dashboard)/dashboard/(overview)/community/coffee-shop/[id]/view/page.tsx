import { CONFIG } from 'src/config-global';

import { CoffeeShopPreviewView } from 'src/sections/dashboard/coffee-shop/view/coffee-shop-preview-view';

type Props = {
  params: {
    id: string;
  };
};

export const metadata = { title: `Coffee Shop View - ${CONFIG.appName}` };

export default function Page({ params }: Props) {
  return <CoffeeShopPreviewView coffeeShopId={params.id} />;
}
