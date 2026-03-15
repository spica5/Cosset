import { CONFIG } from 'src/config-global';

import { PostCreateEditView } from 'src/sections/dashboard/post/view/post-create-edit-view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: `Edit Post - ${CONFIG.appName}` };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <PostCreateEditView postId={id} />;
}
