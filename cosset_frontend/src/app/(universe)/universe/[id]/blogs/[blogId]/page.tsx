import { CONFIG } from 'src/config-global';

import { UniverseBlogItemView } from '../../../../../../sections/universe/universe/view/universe-blog-item-view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string; blogId: string }>;
};

export const metadata = { title: `Blog | ${CONFIG.appName}` };

export default async function Page({ params }: Props) {
  const { id, blogId } = await params;

  return <UniverseBlogItemView customerId={id} blogId={blogId} />;
}
