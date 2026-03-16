import { CONFIG } from 'src/config-global';

import { CollectionItemsView } from 'src/sections/dashboard/collections/view';

type PageProps = {
  params: {
    collectionId: string;
  };
};

export const metadata = { title: `Collection Items - ${CONFIG.appName}` };

export default function Page({ params }: PageProps) {
  return <CollectionItemsView collectionId={params.collectionId} />;
}
