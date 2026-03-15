import { CONFIG } from 'src/config-global';
import { PreviewClientContent } from 'src/sections/dashboard/overview/home-space-preview/preview-client-content';

// ----------------------------------------------------------------------

export const metadata = { title: `Home Space Preview | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <PreviewClientContent />;
}
