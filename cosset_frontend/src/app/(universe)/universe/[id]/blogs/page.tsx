import { CONFIG } from 'src/config-global';

import { UniverseBlogListView } from 'src/sections/universe/universe/view/universe-blog-list-view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: `Shared Blogs | ${CONFIG.appName}` };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <UniverseBlogListView customerId={id} />;
}
