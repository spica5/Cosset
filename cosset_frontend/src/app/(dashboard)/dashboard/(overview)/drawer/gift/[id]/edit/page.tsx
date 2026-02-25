import { CONFIG } from 'src/config-global';

import { GiftCreateEditView } from 'src/sections/dashboard/drawer/gift/view/gift-create-edit-view';

// ——————————————————————————————————————————————————————————————————————————————

type PageProps = {
  params: {
    id: string;
  };
};

export const metadata = { title: `Edit Gift - ${CONFIG.appName}` };

export default function Page({ params }: PageProps) {
  return <GiftCreateEditView giftId={params.id} />;
}
