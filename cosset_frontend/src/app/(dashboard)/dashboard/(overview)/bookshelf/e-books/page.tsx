import { CONFIG } from 'src/config-global';

import { BookshelfView } from 'src/sections/dashboard/bookshelf/view';

export const metadata = { title: `E-books - Bookshelf - ${CONFIG.appName}` };

export default function Page() {
  return <BookshelfView heading="E-books" />;
}
