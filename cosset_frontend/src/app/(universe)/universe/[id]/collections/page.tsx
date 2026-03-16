import { CONFIG } from 'src/config-global';

import { UniverseCollectionListView } from 'src/sections/universe/universe/view/universe-collection-list-view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: `Shared Collections | ${CONFIG.appName}` };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <UniverseCollectionListView customerId={id} />;
}
