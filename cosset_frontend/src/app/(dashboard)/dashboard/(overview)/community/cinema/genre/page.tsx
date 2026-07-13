import { CONFIG } from 'src/config-global';

import { CinemaCategoryView } from 'src/sections/dashboard/cinema/view';
import { getCinemaCategory } from 'src/sections/dashboard/cinema/cinema-categories';

export const metadata = { title: `Genre Films - Cinema - ${CONFIG.appName}` };

export default function Page() {
  const category = getCinemaCategory('genre');

  if (!category) {
    return null;
  }

  return <CinemaCategoryView category={category} />;
}
