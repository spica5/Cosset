import { CONFIG } from 'src/config-global';

import { UniverseLandingView } from 'src/sections/universe/universe/view/universe-landing-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Home Space Preview | Dashboard - ${CONFIG.appName}` };

const PREVIEW_CUSTOMER_ID = '439f7d32-c183-4968-abd4-5c382eb2c36f';

export default function Page() {
  return <UniverseLandingView customerId={PREVIEW_CUSTOMER_ID} />;
}
