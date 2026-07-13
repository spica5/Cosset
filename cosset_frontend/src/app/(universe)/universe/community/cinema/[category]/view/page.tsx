import { notFound } from 'next/navigation';

import { CONFIG } from 'src/config-global';

import { isCinemaCategory } from 'src/sections/dashboard/cinema/cinema-categories';
import { UniverseCinemaView } from 'src/sections/universe/community/universe-cinema-view';

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ ownerId?: string }>;
};

export const metadata = { title: `Cinema - ${CONFIG.appName}` };

export default async function Page({ params, searchParams }: Props) {
  const { category } = await params;
  const { ownerId } = await searchParams;

  if (!isCinemaCategory(category)) {
    notFound();
  }

  return <UniverseCinemaView categoryId={category} ownerId={ownerId} />;
}
