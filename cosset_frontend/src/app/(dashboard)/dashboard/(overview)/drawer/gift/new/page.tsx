import { CONFIG } from 'src/config-global';

import { GiftCreateEditView } from 'src/sections/dashboard/drawer/gift/view/gift-create-edit-view';

// ——————————————————————————————————————————————————————————————————————————————

export const metadata = { title: `Create Gift - ${CONFIG.appName}` };

export default function Page() {
  return <GiftCreateEditView />;
}
