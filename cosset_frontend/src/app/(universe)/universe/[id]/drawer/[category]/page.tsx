import { CONFIG } from 'src/config-global';

import { UniverseDrawerView } from 'src/sections/universe/universe/view/universe-drawer-view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string; category: string }>;
};

export const metadata = { title: `Drawer | ${CONFIG.appName}` };

export default async function Page({ params }: Props) {
  const { id, category } = await params;

  return <UniverseDrawerView customerId={id} categoryKey={decodeURIComponent(category)} />;
}
