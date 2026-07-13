import { CONFIG } from 'src/config-global';

import { CinemaCategoryView } from 'src/sections/dashboard/cinema/view';
import { getCinemaCategory } from 'src/sections/dashboard/cinema/cinema-categories';

export const metadata = { title: `Drama & Comedy - Cinema - ${CONFIG.appName}` };

export default function Page() {
  const category = getCinemaCategory('drama');

  if (!category) {
    return null;
  }

  return <CinemaCategoryView category={category} />;
}
