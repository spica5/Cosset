import { CONFIG } from 'src/config-global';

import { BookshelfIntroduceView } from 'src/sections/dashboard/bookshelf/view';

export const metadata = { title: `Introduce - Bookshelf - ${CONFIG.appName}` };

export default function Page() {
  return <BookshelfIntroduceView />;
}
