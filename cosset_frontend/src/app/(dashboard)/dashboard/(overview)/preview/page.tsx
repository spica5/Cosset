import { CONFIG } from 'src/config-global';
import { PreviewClientContent } from './preview-client-content';

// ----------------------------------------------------------------------

export const metadata = { title: `Home Space Preview | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <PreviewClientContent />;
}
