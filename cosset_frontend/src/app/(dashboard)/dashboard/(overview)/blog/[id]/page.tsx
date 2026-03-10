import { CONFIG } from 'src/config-global';

import { BlogDetailsView } from 'src/sections/dashboard/blog/view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: `Blog Details - ${CONFIG.appName}` };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <BlogDetailsView blogId={id} />;
}
