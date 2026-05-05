import { CONFIG } from 'src/config-global';

import { MemoCreateEditView } from 'src/sections/dashboard/drawer/memo/view';

// ----------------------------------------------------------------------

type PageProps = {
  params: {
    id: string;
  };
};

export const metadata = { title: `Edit Good Memory - ${CONFIG.appName}` };

export default function Page({ params }: PageProps) {
  return <MemoCreateEditView collectionId={1} itemId={params.id} />;
}
