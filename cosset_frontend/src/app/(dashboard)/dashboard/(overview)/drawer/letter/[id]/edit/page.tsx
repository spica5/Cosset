import { CONFIG } from 'src/config-global';

import { LetterCreateEditView } from 'src/sections/dashboard/drawer/letter/view';

// ----------------------------------------------------------------------

type PageProps = {
  params: {
    id: string;
  };
};

export const metadata = { title: `Edit Letter - ${CONFIG.appName}` };

export default function Page({ params }: PageProps) {
  return <LetterCreateEditView itemId={params.id} />;
}