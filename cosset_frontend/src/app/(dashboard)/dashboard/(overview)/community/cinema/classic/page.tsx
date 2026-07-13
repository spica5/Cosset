import { CONFIG } from 'src/config-global';

import { CinemaCategoryView } from 'src/sections/dashboard/cinema/view';
import { getCinemaCategory } from 'src/sections/dashboard/cinema/cinema-categories';

export const metadata = { title: `Classic Films - Cinema - ${CONFIG.appName}` };

export default function Page() {
  const category = getCinemaCategory('classic');

  if (!category) {
    return null;
  }

  return <CinemaCategoryView category={category} />;
}
