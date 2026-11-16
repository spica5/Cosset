'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

// ----------------------------------------------------------------------

interface UploadingOverlayProps {
  isOpen: boolean;
  progress?: number;
  message?: string;
}

export function UploadingOverlay({ isOpen, progress, message = 'Uploading files...' }: UploadingOverlayProps) {
  if (!isOpen) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1300,
        backdropFilter: 'blur(2px)',
      }}
    >
      <Stack
        spacing={2}
        sx={{
          alignItems: 'center',
          p: 4,
          borderRadius: 2,
          backgroundColor: 'background.paper',
          boxShadow: 3,
          minWidth: 280,
        }}
      >
        <CircularProgress
          variant={progress !== undefined ? 'determinate' : 'indeterminate'}
          value={progress}
          size={60}
        />

        <Typography variant="h6" align="center">
          {message}
        </Typography>

        {progress !== undefined && (
          <Typography variant="body2" color="text.secondary" align="center">
            {progress}% Complete
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
