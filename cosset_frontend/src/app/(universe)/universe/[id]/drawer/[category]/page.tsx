import { CONFIG } from 'src/config-global';

import { UniverseCollectionItemListView } from 'src/sections/universe/universe/view/universe-collection-item-list-view';
import { UniverseDrawerView } from 'src/sections/universe/universe/view/universe-drawer-view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string; category: string }>;
};

export const metadata = { title: `Drawer | ${CONFIG.appName}` };

const DRAWER_COLLECTION_MAP = {
  letter: { collectionId: 4, heading: 'Letters' },
  goodMemo: { collectionId: 1, heading: 'Good Memories' },
  sadMemo: { collectionId: 2, heading: 'Sad Memories' },
} as const;

export default async function Page({ params }: Props) {
  const { id, category } = await params;
  const categoryKey = decodeURIComponent(category);

  const mappedCollection = DRAWER_COLLECTION_MAP[categoryKey as keyof typeof DRAWER_COLLECTION_MAP];

  if (mappedCollection) {
    return (
      <UniverseCollectionItemListView
        customerId={id}
        collectionId={mappedCollection.collectionId}
        headingOverride={mappedCollection.heading}
        backSectionAnchor="drawers-section"
      />
    );
  }

  return <UniverseDrawerView customerId={id} categoryKey={categoryKey} />;
}
