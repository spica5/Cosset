import { CONFIG } from 'src/config-global';

import { UniverseLandingView } from 'src/sections/universe/universe/view/universe-landing-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Universe View | ${CONFIG.appName}` };

type Props = {
  params: { id: string };
};

export default function Page({ params }: Props) {
  const { id } = params;

  return <UniverseLandingView customerId={id} />;
}
