import { CONFIG } from 'src/config-global';
import { _universes } from 'src/_mock/universe';

import { UniverseLandingView } from 'src/sections/universe/universe/view/universe-landing-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Universe View | ${CONFIG.appName}` };

type Props = {
  params: { id: string };
};

export default function Page({ params }: Props) {
  const { id } = params;

  const currentUniverse = _universes.find((universe) => universe.id === id);

  return <UniverseLandingView universe={currentUniverse} />;
}
