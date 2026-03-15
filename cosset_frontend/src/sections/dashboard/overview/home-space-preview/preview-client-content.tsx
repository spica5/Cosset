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
  const [showTopMenu, setShowTopMenu] = useState(true);

  const customerId = user?.id ? String(user.id) : '';

  const handleToggleFullScreen = useCallback(() => {
    const previewElement = previewRef.current;

    if (!previewElement) {
      return;
    }

    if (document.fullscreenElement === previewElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }

      return;
    }

    previewElement.requestFullscreen();
  }, []);

  const handleToggleTopMenu = useCallback(() => {
    setShowTopMenu((prev) => !prev);
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

  useEffect(() => {
    const handleSetTopMenuState = (event: Event) => {
      const customEvent = event as CustomEvent<{ visible?: boolean }>;

      if (typeof customEvent.detail?.visible === 'boolean') {
        setShowTopMenu(customEvent.detail.visible);
      }
    };

    window.addEventListener('toggle-top-menu', handleToggleTopMenu);
    window.addEventListener('set-top-menu-state', handleSetTopMenuState as EventListener);

    return () => {
      window.removeEventListener('toggle-top-menu', handleToggleTopMenu);
      window.removeEventListener('set-top-menu-state', handleSetTopMenuState as EventListener);
    };
  }, [handleToggleTopMenu]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('top-menu-state', {
        detail: { visible: showTopMenu },
      })
    );
  }, [showTopMenu]);

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
      {showTopMenu ? (
        <HomeSpacePreviewHeaderBar
          currentPath={paths.dashboard.preview}
          isFullScreen={isFullScreen}
          onToggleFullScreen={handleToggleFullScreen}
        />
      ) : null}
      <UniverseLandingView
        customerId={customerId}
        isFullScreen={isFullScreen}
        onToggleFullScreen={handleToggleFullScreen}
      />
    </Box>
  );
}
