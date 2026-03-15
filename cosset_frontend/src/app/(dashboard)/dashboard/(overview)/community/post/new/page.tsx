import { CONFIG } from 'src/config-global';

import { PostCreateEditView } from 'src/sections/dashboard/post/view/post-create-edit-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Create Post - ${CONFIG.appName}` };

export default function Page() {
  return <PostCreateEditView />;
}
