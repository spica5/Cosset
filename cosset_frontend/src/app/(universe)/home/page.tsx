import { CONFIG } from 'src/config-global';

import { HomeLandingView } from 'src/sections/universe/_home/view/home-landing-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Home | ${CONFIG.appName}` };

export default function Page() {
  return <HomeLandingView/>;
}
