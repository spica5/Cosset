import { CONFIG } from 'src/config-global';

import { BlogCreateView } from 'src/sections/dashboard/blog/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Create Blog - ${CONFIG.appName}` };

export default function Page() {
  return <BlogCreateView />;
}
