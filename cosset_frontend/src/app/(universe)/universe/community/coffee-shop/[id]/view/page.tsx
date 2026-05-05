import { CONFIG } from 'src/config-global';

import { UniverseCoffeeShopView } from 'src/sections/universe/community/universe-coffee-shop-view';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: `Coffee Shop View - ${CONFIG.appName}` };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <UniverseCoffeeShopView coffeeShopId={id} />;
}
