import { CONFIG } from 'src/config-global';

import { BlogListView } from 'src/sections/dashboard/blog/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Blogs - ${CONFIG.appName}` };

export default function Page() {
  return <BlogListView />;
}
