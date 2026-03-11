'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { useAuthContext } from 'src/auth/hooks';

import { UniverseLandingView } from 'src/sections/universe/universe/view/universe-landing-view';
import { HomeSpacePreviewHeaderBar } from 'src/sections/dashboard/overview/home-space-preview/home-space-preview-header-bar';

export function PreviewClientContent() {
  const { user, loading } = useAuthContext();

  const customerId = user?.id ? String(user.id) : '';

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!customerId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Sign in to preview your own Home Space content.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <HomeSpacePreviewHeaderBar currentPath={paths.dashboard.preview} />
      <UniverseLandingView customerId={customerId} />
    </Box>
  );
}
