import { CONFIG } from 'src/config-global';

import { BookshelfEbooksView } from 'src/sections/dashboard/bookshelf/view';

export const metadata = { title: `E-books - Bookshelf - ${CONFIG.appName}` };

export default function Page() {
  return <BookshelfEbooksView />;
}
