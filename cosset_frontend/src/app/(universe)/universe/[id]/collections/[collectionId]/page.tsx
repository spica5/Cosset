import { CONFIG } from 'src/config-global';

import { UniverseCollectionItemListView } from 'src/sections/universe/universe/view/universe-collection-item-list-view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string; collectionId: string }>;
};

export const metadata = { title: `Collection Items | ${CONFIG.appName}` };

export default async function Page({ params }: Props) {
  const { id, collectionId } = await params;

  return <UniverseCollectionItemListView customerId={id} collectionId={collectionId} />;
}
