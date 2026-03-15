import { CONFIG } from 'src/config-global';

import { PostListView } from 'src/sections/dashboard/post/view/post-list-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Community Posts - ${CONFIG.appName}` };

export default function Page() {
  return <PostListView />;
}
