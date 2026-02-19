import { CONFIG } from 'src/config-global';
import { _neighbors } from 'src/_mock/dashboard';

import { NeighborDetailsView } from 'src/sections/dashboard/neighbor/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Neighbor details | Dashboard - ${CONFIG.appName}` };

type Props = {
  params: { id: string };
};

export default function Page({ params }: Props) {
  const { id } = params;

  const currentNeighbor = _neighbors.find((neighbor) => neighbor.id === id);

  return <NeighborDetailsView neighbor={currentNeighbor} />;
}

