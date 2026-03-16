import { CONFIG } from 'src/config-global';

import { CollectionItemCreateEditView } from 'src/sections/dashboard/collections/view';

type PageProps = {
  params: {
    collectionId: string;
  };
};

export const metadata = { title: `Create Collection Item - ${CONFIG.appName}` };

export default function Page({ params }: PageProps) {
  return <CollectionItemCreateEditView collectionId={params.collectionId} />;
}
