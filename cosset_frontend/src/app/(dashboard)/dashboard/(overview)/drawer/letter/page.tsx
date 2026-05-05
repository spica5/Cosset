import { CONFIG } from 'src/config-global';

import { CollectionItemsView } from 'src/sections/dashboard/collections/view';
import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

export const metadata = { title: `Letters - ${CONFIG.appName}` };

export default function Page() {
  return (
    <CollectionItemsView
      collectionId={4}
      heading="Letters"
      breadcrumbLinks={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: 'Drawer', href: paths.dashboard.drawer.root },
        { name: 'Letters' },
      ]}
      backHref={paths.dashboard.drawer.root}
      backLabel="Back to Drawer"
      newItemHref={paths.dashboard.drawer.letter.new}
      newItemLabel="New Letter"
      editItemBaseHref={paths.dashboard.drawer.letter.root}
      showBackButton={false}
      showReorderControls={false}
    />
  );
}
