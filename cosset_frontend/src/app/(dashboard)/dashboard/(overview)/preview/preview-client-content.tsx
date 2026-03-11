'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { useAuthContext } from 'src/auth/hooks';

import { UniverseLandingView } from 'src/sections/universe/universe/view/universe-landing-view';
import { HomeSpacePreviewHeaderBar } from 'src/sections/dashboard/overview/home-space-preview/home-space-preview-header-bar';

export function PreviewClientContent() {
  const { user, loading } = useAuthContext();
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const customerId = user?.id ? String(user.id) : '';

  const handleToggleFullScreen = useCallback(() => {
    const previewElement = previewRef.current;

    if (!previewElement) {
      return;
    }

    if (document.fullscreenElement === previewElement) {
      if (document.exitFullscreen) {
        void document.exitFullscreen();
      }

      return;
    }

    void previewElement.requestFullscreen();
  }, []);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(document.fullscreenElement === previewRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

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
    <Box
      ref={previewRef}
      sx={{
        position: 'relative',
        '&:fullscreen': {
          width: '100vw',
          height: '100vh',
          overflow: 'auto',
          bgcolor: 'background.default',
        },
      }}
    >
      <HomeSpacePreviewHeaderBar
        currentPath={paths.dashboard.preview}
        isFullScreen={isFullScreen}
        onToggleFullScreen={handleToggleFullScreen}
      />
      <UniverseLandingView customerId={customerId} />
    </Box>
  );
}
