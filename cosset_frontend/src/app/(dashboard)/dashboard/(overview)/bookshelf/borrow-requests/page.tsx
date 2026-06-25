import { CONFIG } from 'src/config-global';

import { BookshelfBorrowRequestsView } from 'src/sections/dashboard/bookshelf/view';

export const metadata = { title: `Borrow requests - Bookshelf - ${CONFIG.appName}` };

export default function Page() {
  return <BookshelfBorrowRequestsView />;
}
