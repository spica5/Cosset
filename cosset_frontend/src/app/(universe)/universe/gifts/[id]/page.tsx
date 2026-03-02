import { CONFIG } from 'src/config-global';

import { UniverseGiftView } from 'src/sections/universe/universe/view/universe-gift-view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: `Gift | ${CONFIG.appName}` };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <UniverseGiftView customerId="" giftId={id} />;
}
