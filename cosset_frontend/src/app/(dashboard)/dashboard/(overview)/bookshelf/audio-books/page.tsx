import { CONFIG } from 'src/config-global';

import { BookshelfAudiobooksView } from 'src/sections/dashboard/bookshelf/view';

export const metadata = { title: `Audio-books - Bookshelf - ${CONFIG.appName}` };

export default function Page() {
  return <BookshelfAudiobooksView />;
}
