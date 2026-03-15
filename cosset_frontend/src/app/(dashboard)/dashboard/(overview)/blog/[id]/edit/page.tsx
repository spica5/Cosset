import { CONFIG } from 'src/config-global';

import { BlogCreateView } from 'src/sections/dashboard/blog/view';

// ----------------------------------------------------------------------

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: `Edit Blog - ${CONFIG.appName}` };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <BlogCreateView blogId={id} />;
}
