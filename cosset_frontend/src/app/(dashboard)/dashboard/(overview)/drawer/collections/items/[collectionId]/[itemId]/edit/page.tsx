import { CONFIG } from 'src/config-global';

import { CollectionItemCreateEditView } from 'src/sections/dashboard/drawer/collections/view';

type PageProps = {
  params: {
    collectionId: string;
    itemId: string;
  };
};

export const metadata = { title: `Edit Collection Item - ${CONFIG.appName}` };

export default function Page({ params }: PageProps) {
  return <CollectionItemCreateEditView collectionId={params.collectionId} itemId={params.itemId} />;
}
