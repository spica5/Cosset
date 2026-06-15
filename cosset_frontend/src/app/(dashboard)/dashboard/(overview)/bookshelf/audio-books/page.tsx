import { CONFIG } from 'src/config-global';

import { BookshelfView } from 'src/sections/dashboard/bookshelf/view';

export const metadata = { title: `Audio-books - Bookshelf - ${CONFIG.appName}` };

export default function Page() {
  return <BookshelfView heading="Audio-books" />;
}
