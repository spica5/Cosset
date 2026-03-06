import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';

import Box from '@mui/material/Box';

import { UniverseLandingView } from 'src/sections/universe/universe/view/universe-landing-view';
import { HomeSpacePreviewHeaderBar } from 'src/sections/dashboard/overview/home-space-preview/home-space-preview-header-bar';

// ----------------------------------------------------------------------

export const metadata = { title: `Home Space Preview | Dashboard - ${CONFIG.appName}` };

const PREVIEW_CUSTOMER_ID = '439f7d32-c183-4968-abd4-5c382eb2c36f';

export default function Page() {
  return (
    <Box sx={{ position: 'relative' }}>
      <HomeSpacePreviewHeaderBar currentPath={paths.dashboard.preview} />
      <UniverseLandingView customerId={PREVIEW_CUSTOMER_ID} />
    </Box>
  );
}
